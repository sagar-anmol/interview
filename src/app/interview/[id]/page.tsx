"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mic, ShieldCheck, Timer } from "lucide-react";
import { ArchitectureCanvas } from "@/components/canvas/ArchitectureCanvas";
import { TopControlBar } from "@/components/TopControlBar";
import { LeftProgressPanel } from "@/components/LeftProgressPanel";
import { InterviewerPanel } from "@/components/interviewer/InterviewerPanel";
import { PeerInterview } from "@/components/peer/PeerInterview";
import { IntegrationCheckScreen } from "@/components/ui/IntegrationCheckScreen";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { loadSession, saveSession } from "@/lib/db";
import { InterviewEngine } from "@/lib/interview/engine";
import { getScenario } from "@/lib/interview/scenarios";
import { elapsedSeconds, toPersisted, useInterviewStore } from "@/store/useInterviewStore";
import { useLocationId } from "@/lib/hooks/useLocationId";

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


export default function InterviewPage() {
  const router = useRouter();

  // Session id from the URL; updated after hydration via useLocationId.
  const id = useLocationId();

  const config = useInterviewStore((s) => s.config);
  const status = useInterviewStore((s) => s.status);
  const phase = useInterviewStore((s) => s.phase);
  const milestones = useInterviewStore((s) => s.milestones);
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

  // Load or hydrate the session.
  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const state = useInterviewStore.getState();
      if (state.config?.id === id) {
        // Session already in the store for this exact id — nothing to do.
        setLoading(false);
        return;
      }
      try {
        const saved = await loadSession(id);
        if (!cancelled && saved) {
          useInterviewStore.getState().hydrate(saved);
        }
      } catch (error) {
        console.error("[interview] load failed", error);
      }
      if (!cancelled) {
        const current = useInterviewStore.getState();
        if (current.config?.id === id) {
          setLoading(false);
        } else if (!current.config) {
          // No config anywhere (session truly missing).
          setMissing(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Persist to IndexedDB (debounced).
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

  // Clock + automatic end.
  const handleEnd = React.useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    const engine = engineRef.current;
    if (engine) {
      await engine.end();
    }
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
      if (
        begun &&
        state.status === "live" &&
        left <= 0 &&
        !autoEndedRef.current
      ) {
        autoEndedRef.current = true;
        void handleEnd();
      }
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [config, begun, handleEnd]);

  // Clear tentative captions when an authoritative turn lands.
  React.useEffect(() => {
    const clear = () => setTimeout(() => setTentative(""), 0);
    clear();
  }, [turns.length]);

  // Browser speech recognition for live captions while listening.
  const recognitionEnabled =
    begun &&
    config?.format === "voice" &&
    speechState === "listening" &&
    !muted;

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
          if (!event.results[i].isFinal) {
            interim += event.results[i][0].transcript;
          }
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
      recognition.onerror = () => {
        setTentative("");
      };
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

  // Keyboard: Space for PPT, Escape to interrupt.
  React.useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      return (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.isContentEditable
      );
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        engineRef.current?.interrupt();
        return;
      }
      if (
        event.code === "Space" &&
        vadMode === "ptt" &&
        !isTyping(event.target) &&
        !event.repeat
      ) {
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

  const begin = () => {
    if (!config || begun) return;
    setShowCheck(true);
    setBegun(true);
    useInterviewStore.getState().setStatus("live");
    const engine = new InterviewEngine({
      onError: (title, description) =>
        toast({ variant: "error", title, description }),
    });
    engineRef.current = engine;
    void engine.start();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    engineRef.current?.setMicEnabled(!next);
  };

  const changeVadMode = (mode: "auto" | "ptt") => {
    engineRef.current?.setVadMode(mode);
  };

  const pause = () => {
    useInterviewStore.getState().pause();
    setMuted(true);
    engineRef.current?.setMicEnabled(false);
  };

  const resume = () => {
    useInterviewStore.getState().resume();
    setMuted(false);
    engineRef.current?.setMicEnabled(true);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading session…
        </span>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="font-mono text-[11px] text-zinc-500">
          Loading session…
        </span>
      </div>
    );
  }

  if (missing || !config) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-[13px] text-zinc-400">
          This session was not found on this device.
        </p>
        <Link href="/" className="text-[12px] text-zinc-500 underline">
          Back to start
        </Link>
      </div>
    );
  }

  if (config.mode === "peer") {
    return <PeerInterview sessionId={id} />;
  }

  const scenario = getScenario(config.scenarioId);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopControlBar
        remainingSec={remaining || config.durationSec}
        phase={phase}
        status={status}
        ttfaMs={ttfaMs}
        roleLine={`${scenario.company} · ${scenario.role}`}
        onPause={pause}
        onResume={resume}
        onEnd={() => void handleEnd()}
      />

      <div className="flex min-h-0 flex-1">
        <LeftProgressPanel
          scenario={scenario}
          milestones={milestones}
          phase={phase}
          vadMode={vadMode}
          strictMode={strictMode}
          onVadModeChange={changeVadMode}
          format={config.format}
        />

        <div className="relative min-w-0 flex-1">
          <ArchitectureCanvas />
        </div>

        <InterviewerPanel
          turns={turns}
          tentative={tentative}
          speechState={speechState}
          micLevel={micLevel}
          vadMode={vadMode}
          muted={muted}
          format={config.format}
          disabled={status !== "live"}
          onToggleMute={toggleMute}
          onInterrupt={() => engineRef.current?.interrupt()}
          onPTTBegin={() => engineRef.current?.beginPTT()}
          onPTTEnd={() => void engineRef.current?.endPTT()}
          onSendText={(text) => engineRef.current?.submitCandidateText(text)}
        />
      </div>

      {!begun ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md animate-fade-in rounded-lg border border-line-strong bg-panel-2 p-5 shadow-2xl shadow-black/70">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Pre-flight
            </p>
            <h2 className="mt-2 text-[19px] font-medium tracking-tight text-zinc-100">
              {scenario.title}
            </h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500">
              {scenario.prompt}
            </p>

            <ul className="mt-4 space-y-2 border-t border-line pt-3">
              <li className="flex items-center gap-2 text-[11.5px] text-zinc-400">
                <Timer className="h-3.5 w-3.5 text-zinc-600" />
                {Math.round(config.durationSec / 60)} minute timed session
              </li>
              <li className="flex items-center gap-2 text-[11.5px] text-zinc-400">
                <Mic className="h-3.5 w-3.5 text-zinc-600" />
                {config.format === "voice"
                  ? "Microphone required — headphones recommended"
                  : "Text-only — no microphone used"}
              </li>
              <li className="flex items-center gap-2 text-[11.5px] text-zinc-400">
                <ShieldCheck className="h-3.5 w-3.5 text-zinc-600" />
                Strict mode — no hints, no coaching
              </li>
            </ul>

            <Button
              size="lg"
              className="mt-5 w-full"
              onClick={begin}
            >
              {config.format === "voice" ? "Enable mic & begin" : "Begin interview"}
            </Button>
            <p className="mt-2 text-center font-mono text-[9.5px] text-zinc-600">
              The clock starts when you begin.
            </p>
          </div>
        </div>
      ) : null}

      {showCheck ? (
        <IntegrationCheckScreen onDone={() => setShowCheck(false)} />
      ) : null}
    </div>
  );
}
