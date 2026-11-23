"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { loadSession, saveSession } from "@/lib/db";
import { InterviewEngine } from "@/lib/interview/engine";
import { elapsedSeconds, toPersisted, useInterviewStore } from "@/store/useInterviewStore";

interface SRResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SREvent {
  resultIndex: number;
  results: { length: number; [index: number]: SRResult };
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Shared lifecycle for an AI interview session: hydration, persistence,
 * countdown, voice engine, captions and keyboard shortcuts.
 */
export function useInterviewSession(id: string) {
  const router = useRouter();

  const config = useInterviewStore((s) => s.config);
  const status = useInterviewStore((s) => s.status);
  const phase = useInterviewStore((s) => s.phase);
  const milestones = useInterviewStore((s) => s.milestones);
  const decisionLog = useInterviewStore((s) => s.decisionLog);
  const turns = useInterviewStore((s) => s.turns);
  const speechState = useInterviewStore((s) => s.speechState);
  const micLevel = useInterviewStore((s) => s.micLevel);
  const vadMode = useInterviewStore((s) => s.vadMode);
  const strictMode = useInterviewStore((s) => s.strictMode);
  const ttfaMs = useInterviewStore((s) => s.ttfaMs);

  const [loading, setLoading] = React.useState(true);
  const [missing, setMissing] = React.useState(false);
  const [begun, setBegun] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [tentative, setTentative] = React.useState("");
  const [remaining, setRemaining] = React.useState(0);
  const [showCheck, setShowCheck] = React.useState(false);

  const engineRef = React.useRef<InterviewEngine | null>(null);
  const endingRef = React.useRef(false);
  const autoEndedRef = React.useRef(false);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const state = useInterviewStore.getState();
      if (state.config?.id === id) {
        setLoading(false);
        return;
      }
      try {
        const saved = await loadSession(id);
        if (!cancelled && saved) useInterviewStore.getState().hydrate(saved);
      } catch (error) {
        console.error("[interview] load failed", error);
      }
      if (!cancelled) {
        const current = useInterviewStore.getState();
        if (current.config?.id === id) setLoading(false);
        else if (!current.config) {
          setMissing(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useInterviewStore.subscribe((state, prev) => {
      if (!state.config || state.config.id !== id) return;
      const changed =
        state.turns !== prev.turns ||
        state.nodes !== prev.nodes ||
        state.edges !== prev.edges ||
        state.milestones !== prev.milestones ||
        state.status !== prev.status ||
        state.phase !== prev.phase ||
        state.decisionLog !== prev.decisionLog ||
        state.report !== prev.report ||
        state.startedAt !== prev.startedAt;
      if (!changed) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const persisted = toPersisted(useInterviewStore.getState());
        if (persisted) void saveSession(persisted);
      }, 400);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  const handleEnd = React.useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    if (engineRef.current) await engineRef.current.end();
    const persisted = toPersisted(useInterviewStore.getState());
    if (persisted) await saveSession(persisted);
    router.push(`/report/${id}`);
  }, [id, router]);

  React.useEffect(() => {
    if (!config) return;
    const tick = () => {
      const state = useInterviewStore.getState();
      const duration = state.config?.durationSec ?? 0;
      const left = Math.max(0, duration - elapsedSeconds(state));
      setRemaining(left);
      if (begun && state.status === "live" && left <= 0 && !autoEndedRef.current) {
        autoEndedRef.current = true;
        void handleEnd();
      }
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [config, begun, handleEnd]);

  React.useEffect(() => {
    const clear = () => setTimeout(() => setTentative(""), 0);
    clear();
  }, [turns.length]);

  const recognitionEnabled =
    begun && config?.format === "voice" && speechState === "listening" && !muted;

  React.useEffect(() => {
    if (!recognitionEnabled) return;
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;
    let stopped = false;
    let recognition: SpeechRecognitionLike | null = null;
    try {
      recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (!event.results[i].isFinal) interim += event.results[i][0].transcript;
        }
        setTentative(interim.trim());
      };
      recognition.onend = () => {
        setTentative("");
        if (!stopped) {
          try {
            recognition?.start();
          } catch {
            /* ignore */
          }
        }
      };
      recognition.onerror = () => setTentative("");
      recognition.start();
    } catch {
      /* recognition unavailable */
    }
    return () => {
      stopped = true;
      try {
        recognition?.stop();
      } catch {
        /* ignore */
      }
      setTentative("");
    };
  }, [recognitionEnabled]);

  React.useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        engineRef.current?.interrupt();
        return;
      }
      if (event.code === "Space" && vadMode === "ptt" && !isTyping(event.target) && !event.repeat) {
        event.preventDefault();
        engineRef.current?.beginPTT();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space" && vadMode === "ptt" && !isTyping(event.target)) {
        engineRef.current?.endPTT();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [vadMode]);

  React.useEffect(() => {
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  const begin = React.useCallback(() => {
    if (!config || begun) return;
    setShowCheck(true);
    setBegun(true);
    useInterviewStore.getState().setStatus("live");
    const engine = new InterviewEngine({
      onError: (title, description) =>
        console.error("[interview]", title, description),
    });
    engineRef.current = engine;
    void engine.start();
  }, [config, begun]);

  const toggleMute = React.useCallback(() => {
    setMuted((next) => {
      engineRef.current?.setMicEnabled(!next);
      return !next;
    });
  }, []);

  const changeVadMode = React.useCallback((mode: "auto" | "ptt") => {
    engineRef.current?.setVadMode(mode);
  }, []);

  const pause = React.useCallback(() => {
    useInterviewStore.getState().pause();
    setMuted(true);
    engineRef.current?.setMicEnabled(false);
  }, []);

  const resume = React.useCallback(() => {
    useInterviewStore.getState().resume();
    setMuted(false);
    engineRef.current?.setMicEnabled(true);
  }, []);

  return {
    // state
    config,
    status,
    phase,
    milestones,
    decisionLog,
    turns,
    speechState,
    micLevel,
    vadMode,
    strictMode,
    ttfaMs,
    loading,
    missing,
    begun,
    muted,
    tentative,
    remaining,
    showCheck,
    // actions
    engineRef,
    begin,
    toggleMute,
    changeVadMode,
    pause,
    resume,
    handleEnd,
    setBegun,
    setShowCheck,
  };
}
