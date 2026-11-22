"use client";

import type { MicVAD } from "@ricky0123/vad-web";
import { AudioQueue } from "@/lib/audio/audioQueue";
import { SentenceChunker } from "@/lib/audio/sentenceChunker";
import { encodeWav } from "@/lib/audio/wavEncoder";
import { graphFromReactFlow, serializeCanvasForLLM } from "@/lib/canvas/serializeCanvas";
import {
  buildInterviewStateBlock,
  phaseForElapsed,
} from "@/lib/interview/fsm";
import { getScenario } from "@/lib/interview/scenarios";
import type { Report, Turn } from "@/lib/interview/types";
import {
  elapsedSeconds,
  useInterviewStore,
} from "@/store/useInterviewStore";

type SseEvent =
  | { type: "start"; ttftMs?: number }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface EngineCallbacks {
  onError: (title: string, description?: string) => void;
  onAutoEnd?: () => void;
}

const BASE_REDEMPTION_MS = 800;
const EXTENDED_REDEMPTION_MS = 1300;
const CANVAS_EDIT_WINDOW_MS = 3000;

export class InterviewEngine {
  private vad: MicVAD | null = null;
  private micStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private levelTimer: ReturnType<typeof setInterval> | null = null;

  private queue = new AudioQueue();
  private chunker = new SentenceChunker();
  private turnAbort: AbortController | null = null;
  private ttsAborts = new Set<AbortController>();
  private ttsChain: Promise<void> = Promise.resolve();
  private assistantTurnId: string | null = null;
  private sentenceSeq = 0;
  private speechEndedAt = 0;
  private turnStartedAt = 0;
  private ttfaReported = false;
  private queuedAnyAudio = false;

  private pttProcessor: ScriptProcessorNode | null = null;
  private pttSource: MediaStreamAudioSourceNode | null = null;
  private pttFrames: Float32Array[] = [];
  private pttActive = false;

  private unsubscribe: (() => void) | null = null;
  private redemptionTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private started = false;

  constructor(private callbacks: EngineCallbacks) {}

  get voicReady() {
    return this.micStream !== null;
  }

  async start() {
    if (this.started) return;
    this.started = true;
    const state = useInterviewStore.getState();
    if (!state.config) return;

    await this.queue.resume();
    this.bindQueue();

    if (state.config.format === "voice") {
      await this.setupAudio();
    }

    this.watchCanvasEdits();

    if (state.turns.filter((t) => t.text.trim()).length === 0) {
      void this.openingTurn();
    } else {
      useInterviewStore.getState().setSpeechState(this.idleSpeechState());
    }
  }

  private bindQueue() {
    this.queue.onSentenceStart = () => {
      useInterviewStore.getState().setSpeechState("speaking");
      if (!this.ttfaReported && this.queuedAnyAudio) {
        this.ttfaReported = true;
        const origin =
          this.speechEndedAt > 0 ? this.speechEndedAt : this.turnStartedAt;
        if (origin > 0) {
          useInterviewStore.getState().setTtfa(Date.now() - origin);
        }
      }
    };
    this.queue.onIdle = () => {
      const st = useInterviewStore.getState();
      if (st.speechState === "speaking") {
        st.setSpeechState(this.idleSpeechState());
      }
    };
  }

  private idleSpeechState() {
    const st = useInterviewStore.getState();
    return st.config?.format === "voice" && st.vadMode === "auto"
      ? "listening"
      : "idle";
  }

  private async setupAudio() {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch (error) {
      console.error("[engine] mic permission failed", error);
      this.callbacks.onError(
        "Microphone unavailable",
        "The interview will continue in text mode. Allow mic access and reload to use voice.",
      );
      useInterviewStore.getState().setSpeechState("idle");
      return;
    }

    const ctx = new AudioContext();
    this.audioCtx = ctx;
    const source = ctx.createMediaStreamSource(this.micStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    this.analyser = analyser;

    const data = new Float32Array(analyser.fftSize);
    this.levelTimer = setInterval(() => {
      if (!this.analyser) return;
      this.analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      const level = Math.min(1, rms * 9);
      useInterviewStore.getState().setMicLevel(level);
    }, 90);

    try {
      const { MicVAD } = await import("@ricky0123/vad-web");
      this.vad = await MicVAD.new({
        model: "v5",
        baseAssetPath: "/vad/",
        onnxWASMBasePath: "/vad/",
        audioContext: ctx,
        getStream: async () => this.micStream!,
        pauseStream: async () => {},
        resumeStream: async () => this.micStream!,
        positiveSpeechThreshold: 0.55,
        negativeSpeechThreshold: 0.35,
        redemptionMs: BASE_REDEMPTION_MS,
        preSpeechPadMs: 300,
        minSpeechMs: 320,
        onSpeechStart: () => this.handleSpeechStart(),
        onSpeechEnd: (audio: Float32Array) => {
          void this.handleSpeechEnd(audio);
        },
        onVADMisfire: () => {},
      });

      if (useInterviewStore.getState().vadMode === "auto") {
        await this.vad.start();
      }
      useInterviewStore.getState().setSpeechState(this.idleSpeechState());
    } catch (error) {
      console.error("[engine] VAD init failed", error);
      this.callbacks.onError(
        "Voice activity detection failed",
        "Check that /vad assets are served. You can still type answers.",
      );
    }
  }

  private watchCanvasEdits() {
    let last = useInterviewStore.getState().lastCanvasEditAt;
    this.unsubscribe = useInterviewStore.subscribe((state) => {
      if (state.lastCanvasEditAt !== last) {
        last = state.lastCanvasEditAt;
        if (this.vad) {
          this.vad.setOptions({ redemptionMs: EXTENDED_REDEMPTION_MS });
          if (this.redemptionTimer) clearTimeout(this.redemptionTimer);
          this.redemptionTimer = setTimeout(() => {
            if (this.vad) this.vad.setOptions({ redemptionMs: BASE_REDEMPTION_MS });
          }, CANVAS_EDIT_WINDOW_MS);
        }
      }
    });
  }

  private handleSpeechStart() {
    const st = useInterviewStore.getState();
    if (st.status !== "live") return;
    if (
      st.speechState === "speaking" ||
      st.speechState === "thinking" ||
      this.queue.isPlaying ||
      this.turnAbort
    ) {
      this.interrupt();
    }
    if (st.speechState !== "speaking") {
      useInterviewStore.getState().setSpeechState("listening");
    }
  }

  private async handleSpeechEnd(audio: Float32Array) {
    if (this.destroyed) return;
    if (useInterviewStore.getState().status !== "live") return;
    this.speechEndedAt = Date.now();
    this.ttfaReported = false;
    this.queuedAnyAudio = false;
    useInterviewStore.getState().setSpeechState("transcribing");

    try {
      const wav = encodeWav([audio], 16000);
      if (wav.size < 2000) {
        useInterviewStore.getState().setSpeechState(this.idleSpeechState());
        return;
      }
      const form = new FormData();
      form.append("audio", wav, "utterance.wav");
      const res = await fetch("/api/stt", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Transcription failed");
      }
      const data = (await res.json()) as { text?: string };
      const text = (data.text ?? "").trim();
      if (!text || text.length < 2) {
        useInterviewStore.getState().setSpeechState(this.idleSpeechState());
        return;
      }
      this.submitCandidateText(text);
    } catch (error) {
      console.error("[engine] stt failed", error);
      this.callbacks.onError(
        "Transcription failed",
        error instanceof Error ? error.message : undefined,
      );
      useInterviewStore.getState().setSpeechState(this.idleSpeechState());
    }
  }

  submitCandidateText(text: string) {
    const st = useInterviewStore.getState();
    if (!st.config || st.status !== "live") return;
    const clean = text.trim();
    if (!clean) return;

    const turn: Turn = {
      id: crypto.randomUUID(),
      speaker: "candidate",
      text: clean,
      ts: Date.now(),
    };
    st.addTurn(turn);
    void this.runInterviewerTurn(clean);
  }

  private async openingTurn() {
    await this.runInterviewerTurn(undefined);
  }

  private async runInterviewerTurn(userMessage?: string) {
    if (this.destroyed) return;
    const snapshot = useInterviewStore.getState();
    if (!snapshot.config || snapshot.status !== "live") return;

    if (this.turnAbort) this.turnAbort.abort();
    const abort = new AbortController();
    this.turnAbort = abort;
    this.chunker = new SentenceChunker();
    this.sentenceSeq = 0;
    this.turnStartedAt = Date.now();
    this.ttfaReported = false;
    this.queuedAnyAudio = false;

    const scenario = getScenario(snapshot.config.scenarioId);

    const usable = snapshot.turns.filter((t) => !t.pending);
    // When userMessage is provided the candidate turn was just appended; keep it
    // out of recentMessages so the server injection is not duplicated.
    const trimmed = (userMessage ? usable.slice(0, -1) : usable).slice(-8);

    const recentMessages = trimmed
      .filter((t) => t.text.trim())
      .map((t) => ({
        role: (t.speaker === "interviewer" ? "interviewer" : "candidate") as
          | "interviewer"
          | "candidate",
        text: t.interrupted
          ? `${t.spokenText ?? t.text} [interrupted]`.trim()
          : t.text,
      }));

    const graph = graphFromReactFlow(
      snapshot.nodes as unknown[],
      snapshot.edges as unknown[],
    );
    const canvasSummary = serializeCanvasForLLM(graph, snapshot.prevGraph);

    const elapsed = elapsedSeconds(snapshot);
    const fsmState = {
      phase: snapshot.phase,
      elapsedSec: elapsed,
      durationSec: snapshot.config.durationSec,
      milestones: snapshot.milestones,
    };

    // Server builds the state block; send directive for injection.
    const assistantId = crypto.randomUUID();
    this.assistantTurnId = assistantId;
    useInterviewStore.getState().addTurn({
      id: assistantId,
      speaker: "interviewer",
      text: "",
      ts: Date.now(),
      pending: true,
    });
    useInterviewStore.getState().setSpeechState("thinking");

    try {
      const response = await fetch("/api/interview/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({
          scenarioId: scenario.id,
          recentMessages,
          runningDecisionLog: snapshot.decisionLog,
          fsmState,
          canvasSummary,
          directive: snapshot.directive,
          userMessage,
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Interviewer request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!raw.startsWith("data:")) continue;
          let event: SseEvent;
          try {
            event = JSON.parse(raw.replace(/^data:\s*/, "")) as SseEvent;
          } catch {
            continue;
          }
          if (event.type === "delta") {
            fullText += event.text;
            useInterviewStore.getState().updateTurn(assistantId, {
              text: fullText,
            });
            for (const sentence of this.chunker.push(event.text)) {
              this.enqueueSentence(sentence);
            }
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }

      if (!abort.signal.aborted) {
        for (const sentence of this.chunker.flush()) {
          this.enqueueSentence(sentence);
        }
        useInterviewStore.getState().updateTurn(assistantId, {
          text: fullText.trim(),
          pending: false,
        });
        this.assistantTurnId = null;
        this.turnAbort = null;
        useInterviewStore.getState().setPrevGraph(graph);

        if (
          useInterviewStore.getState().config?.format === "voice" &&
          !this.queue.isPlaying
        ) {
          useInterviewStore.getState().setSpeechState(this.idleSpeechState());
        }
        if (
          useInterviewStore.getState().config?.format === "text"
        ) {
          useInterviewStore.getState().setSpeechState("idle");
        }

        void this.runEvaluation();
      }
    } catch (error) {
      if (abort.signal.aborted) return;
      console.error("[engine] turn failed", error);
      const message =
        error instanceof Error ? error.message : "Interviewer unavailable";
      this.callbacks.onError("Interviewer request failed", message);
      useInterviewStore.getState().updateTurn(assistantId, {
        text: "",
        pending: false,
      });
      this.assistantTurnId = null;
      this.turnAbort = null;
      useInterviewStore.getState().setSpeechState(this.idleSpeechState());
    }
  }

  private enqueueSentence(text: string) {
    const id = `${this.assistantTurnId ?? "turn"}-${this.sentenceSeq++}`;
    this.ttsChain = this.ttsChain.then(() => this.fetchAndQueue(id, text));
  }

  private async fetchAndQueue(id: string, text: string) {
    if (this.destroyed) return;
    const abort = new AbortController();
    this.ttsAborts.add(abort);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: abort.signal,
      });

      if (res.status === 503) {
        this.queue.enqueueSpeech(id, text);
        return;
      }
      if (!res.ok) {
        this.queue.enqueueSpeech(id, text);
        return;
      }
      const data = await res.arrayBuffer();
      if (data.byteLength < 1000) {
        this.queue.enqueueSpeech(id, text);
        return;
      }
      this.queuedAnyAudio = true;
      await this.queue.enqueueAudio(id, text, data);
    } catch (error) {
      if (abort.signal.aborted) return;
      console.warn("[engine] tts failed, using web speech", error);
      this.queue.enqueueSpeech(id, text);
    } finally {
      this.ttsAborts.delete(abort);
    }
  }

  interrupt() {
    if (!this.queue.isPlaying && !this.turnAbort && !this.assistantTurnId) {
      return;
    }
    const spoken = this.queue.getSpokenText();
    this.queue.flush();
    this.turnAbort?.abort();
    this.turnAbort = null;
    for (const abort of this.ttsAborts) abort.abort();
    this.ttsAborts.clear();
    this.ttsChain = Promise.resolve();

    if (this.assistantTurnId) {
      useInterviewStore
        .getState()
        .truncateLastInterviewer(spoken, true);
      this.assistantTurnId = null;
    }
    useInterviewStore.getState().setSpeechState(this.idleSpeechState());
  }

  private async runEvaluation() {
    if (this.destroyed) return;
    const st = useInterviewStore.getState();
    if (!st.config) return;

    const graph = graphFromReactFlow(
      st.nodes as unknown[],
      st.edges as unknown[],
    );
    const canvasSummary = serializeCanvasForLLM(graph, st.prevGraph);
    const recentMessages = st.turns
      .filter((t) => !t.pending && t.text.trim())
      .slice(-10)
      .map((t) => ({
        role: (t.speaker === "interviewer" ? "interviewer" : "candidate") as
          | "interviewer"
          | "candidate",
        text: t.interrupted ? `${t.spokenText ?? t.text} [interrupted]` : t.text,
      }));

    try {
      const res = await fetch("/api/interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: st.config.scenarioId,
          recentMessages,
          runningDecisionLog: st.decisionLog,
          fsmState: {
            phase: st.phase,
            elapsedSec: elapsedSeconds(st),
            durationSec: st.config.durationSec,
            milestones: st.milestones,
          },
          canvasSummary,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const next = useInterviewStore.getState();
      const phaseOrder = [
        "REQUIREMENTS",
        "HIGH_LEVEL_DESIGN",
        "DEEP_DIVE",
        "WRAP_UP",
      ];
      const proposed = data.nextPhase as string | undefined;
      const nextPhase =
        proposed && phaseOrder.indexOf(proposed) > phaseOrder.indexOf(next.phase)
          ? proposed
          : next.phase;
      next.applyEvaluation({
        milestones: data.milestones ?? [],
        nextPhase: nextPhase as typeof next.phase,
        updatedDecisionLog: data.updatedDecisionLog,
        nextDirective: data.nextDirective,
      });
    } catch (error) {
      console.warn("[engine] evaluation failed", error);
    }
  }

  setVadMode(mode: "auto" | "ptt") {
    useInterviewStore.getState().setVadMode(mode);
    if (!this.vad) return;
    if (mode === "auto") {
      if (!this.vad.listening) void this.vad.start();
    } else if (this.vad.listening) {
      void this.vad.pause();
      if (useInterviewStore.getState().speechState === "listening") {
        useInterviewStore.getState().setSpeechState("idle");
      }
    }
  }

  setMicEnabled(enabled: boolean) {
    if (!this.vad) return;
    if (enabled) {
      if (!this.vad.listening) void this.vad.start();
      useInterviewStore.getState().setSpeechState(this.idleSpeechState());
    } else {
      if (this.vad.listening) void this.vad.pause();
      useInterviewStore.getState().setSpeechState("idle");
    }
  }

  beginPTT() {
    if (this.pttActive || !this.micStream || !this.audioCtx) return;
    if (this.queue.isPlaying || this.assistantTurnId) this.interrupt();

    this.pttActive = true;
    this.pttFrames = [];
    this.speechEndedAt = 0;
    this.ttfaReported = false;
    this.queuedAnyAudio = false;

    const ctx = this.audioCtx;
    const source = ctx.createMediaStreamSource(this.micStream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    const silent = ctx.createGain();
    silent.gain.value = 0;

    processor.onaudioprocess = (event) => {
      const channel = event.inputBuffer.getChannelData(0);
      this.pttFrames.push(new Float32Array(channel));
    };

    source.connect(processor);
    processor.connect(silent);
    silent.connect(ctx.destination);

    this.pttSource = source;
    this.pttProcessor = processor;
    useInterviewStore.getState().setSpeechState("listening");
  }

  async endPTT() {
    if (!this.pttActive) return;
    this.pttActive = false;

    this.pttProcessor?.disconnect();
    this.pttSource?.disconnect();
    this.pttProcessor = null;
    this.pttSource = null;

    const frames = this.pttFrames;
    this.pttFrames = [];
    if (!frames.length || !this.audioCtx) {
      useInterviewStore.getState().setSpeechState(this.idleSpeechState());
      return;
    }

    this.speechEndedAt = Date.now();
    useInterviewStore.getState().setSpeechState("transcribing");
    try {
      const wav = encodeWav(frames, this.audioCtx.sampleRate);
      if (wav.size < 2000) {
        useInterviewStore.getState().setSpeechState(this.idleSpeechState());
        return;
      }
      const form = new FormData();
      form.append("audio", wav, "utterance.wav");
      const res = await fetch("/api/stt", { method: "POST", body: form });
      if (!res.ok) throw new Error("Transcription failed");
      const data = (await res.json()) as { text?: string };
      const text = (data.text ?? "").trim();
      if (!text) {
        useInterviewStore.getState().setSpeechState(this.idleSpeechState());
        return;
      }
      this.submitCandidateText(text);
    } catch (error) {
      console.error("[engine] ptt stt failed", error);
      this.callbacks.onError("Transcription failed");
      useInterviewStore.getState().setSpeechState(this.idleSpeechState());
    }
  }

  async end(): Promise<Report | null> {
    this.disposeAudio();
    const st = useInterviewStore.getState();
    st.setStatus("completed");
    if (!st.config) return null;

    const turns = st.turns
      .filter((t) => t.text.trim() || t.interrupted)
      .map((t) => ({
        speaker: t.speaker,
        text:
          t.speaker === "interviewer" && t.interrupted
            ? (t.spokenText ?? t.text)
            : t.text,
        interrupted: t.interrupted,
      }));

    const graph = graphFromReactFlow(
      st.nodes as unknown[],
      st.edges as unknown[],
    );
    const canvasSummary = serializeCanvasForLLM(graph, null);

    try {
      const res = await fetch("/api/interview/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: st.config.scenarioId,
          turns,
          canvasSummary,
          decisionLog: st.decisionLog,
          elapsedSec: elapsedSeconds(st),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Report generation failed");
      }
      const data = (await res.json()) as { report: Report };
      useInterviewStore.getState().setReport(data.report);
      return data.report;
    } catch (error) {
      console.error("[engine] report failed", error);
      this.callbacks.onError(
        "Could not generate the report",
        error instanceof Error ? error.message : undefined,
      );
      return null;
    }
  }

  private disposeAudio() {
    if (this.levelTimer) clearInterval(this.levelTimer);
    this.levelTimer = null;
    if (this.redemptionTimer) clearTimeout(this.redemptionTimer);
    this.redemptionTimer = null;
    this.unsubscribe?.();
    this.unsubscribe = null;

    if (this.vad) {
      this.vad.destroy().catch(() => {});
      this.vad = null;
    }
    this.micStream?.getTracks().forEach((track) => track.stop());
    this.micStream = null;
    this.queue.destroy();
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    useInterviewStore.getState().setMicLevel(0);
    this.destroyed = true;
  }

  destroy() {
    this.disposeAudio();
  }
}

export function phaseAt(state: ReturnType<typeof useInterviewStore.getState>) {
  if (!state.config) return "REQUIREMENTS" as const;
  return phaseForElapsed(elapsedSeconds(state), state.config.durationSec);
}

export function buildStateBlockForDebug(
  state: ReturnType<typeof useInterviewStore.getState>,
) {
  if (!state.config) return "";
  return buildInterviewStateBlock(
    {
      phase: state.phase,
      elapsedSec: elapsedSeconds(state),
      durationSec: state.config.durationSec,
      milestones: state.milestones,
    },
    getScenario(state.config.scenarioId),
    state.directive,
  );
}
