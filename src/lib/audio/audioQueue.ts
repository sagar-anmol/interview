"use client";

/**
 * Sequential Web Audio playback with barge-in support.
 * Accepts decoded audio buffers (Piper WAV chunks) or Web Speech utterances.
 * Tracks exactly how much of each sentence was actually spoken so the
 * transcript can be truncated on interruption.
 */

type QueueItem =
  | { kind: "buffer"; id: string; text: string; buffer: AudioBuffer }
  | { kind: "speech"; id: string; text: string };

interface CurrentPlayback {
  item: QueueItem;
  startedAt: number;
  duration: number;
  source?: AudioBufferSourceNode;
  utterance?: SpeechSynthesisUtterance;
  spokenChars: number;
}

const SPEECH_RATE = 1.0;

export class AudioQueue {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private items: QueueItem[] = [];
  private current: CurrentPlayback | null = null;
  private completed: { id: string; text: string }[] = [];
  private stopped = false;

  onSentenceStart?: (id: string, text: string) => void;
  onSentenceEnd?: (id: string, text: string) => void;
  onIdle?: () => void;

  get length() {
    return this.items.length + (this.current ? 1 : 0);
  }

  get isPlaying() {
    return this.current !== null;
  }

  ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 1;
      this.gain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  async resume() {
    const ctx = this.ensureContext();
    if (ctx.state !== "running") {
      try {
        await ctx.resume();
      } catch {
        /* user gesture still required */
      }
    }
  }

  async enqueueAudio(id: string, text: string, data: ArrayBuffer) {
    const ctx = this.ensureContext();
    try {
      const buffer = await ctx.decodeAudioData(data.slice(0));
      this.items.push({ kind: "buffer", id, text, buffer });
      this.pump();
    } catch (error) {
      console.error("[audio-queue] decode failed", error);
    }
  }

  enqueueSpeech(id: string, text: string) {
    this.ensureContext();
    this.items.push({ kind: "speech", id, text });
    this.pump();
  }

  /** Barge-in: stop everything immediately and clear the queue. */
  flush() {
    this.stopped = true;
    if (this.current?.source) {
      try {
        this.current.source.onended = null;
        this.current.source.stop();
      } catch {
        /* already stopped */
      }
    }
    if (this.current?.utterance) {
      this.current.utterance.onend = null;
      this.current.utterance.onerror = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.items = [];
    this.current = null;
    this.stopped = false;
  }

  /** Text that was actually heard: completed sentences + partial current. */
  getSpokenText(): string {
    const parts = this.completed.map((c) => c.text);
    const cur = this.current;
    if (cur) {
      const partial = this.partialText(cur);
      if (partial) parts.push(partial);
    }
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  private partialText(cur: CurrentPlayback): string {
    const words = cur.item.text.split(/\s+/).filter(Boolean);
    if (!words.length) return "";

    let fraction = 0;
    if (cur.item.kind === "buffer" && this.ctx) {
      const elapsed = Math.max(0, this.ctx.currentTime - cur.startedAt);
      fraction = cur.duration > 0 ? elapsed / cur.duration : 0;
    } else if (cur.item.kind === "speech") {
      const chars = cur.item.text.length;
      fraction = chars > 0 ? cur.spokenChars / chars : 0;
    }
    fraction = Math.max(0, Math.min(1, fraction));
    if (fraction <= 0.02) return "";
    const take = Math.min(words.length, Math.ceil(words.length * fraction));
    return words.slice(0, take).join(" ");
  }

  private pump() {
    if (this.current || this.items.length === 0) return;
    const item = this.items.shift()!;
    if (item.kind === "buffer") this.playBuffer(item);
    else this.playSpeech(item);
  }

  private playBuffer(item: Extract<QueueItem, { kind: "buffer" }>) {
    const ctx = this.ensureContext();
    const source = ctx.createBufferSource();
    source.buffer = item.buffer;
    source.connect(this.gain!);

    const duration =
      item.buffer.duration / Math.max(0.5, source.playbackRate.value);
    const playback: CurrentPlayback = {
      item,
      startedAt: ctx.currentTime,
      duration,
      source,
      spokenChars: item.text.length,
    };
    this.current = playback;
    this.onSentenceStart?.(item.id, item.text);

    source.onended = () => {
      if (this.current !== playback) return;
      this.completed.push({ id: item.id, text: item.text });
      this.onSentenceEnd?.(item.id, item.text);
      this.current = null;
      this.pump();
      if (!this.current && this.items.length === 0) this.onIdle?.();
    };

    try {
      source.start();
    } catch (error) {
      console.error("[audio-queue] start failed", error);
      this.current = null;
      this.completed.push({ id: item.id, text: item.text });
      this.pump();
    }
  }

  private playSpeech(item: Extract<QueueItem, { kind: "speech" }>) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      this.completed.push({ id: item.id, text: item.text });
      this.pump();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.rate = SPEECH_RATE;
    utterance.pitch = 1;
    utterance.volume = 1;
    const preferred = window.speechSynthesis
      .getVoices()
      .find((v) => /Google US English|Daniel|Alex/i.test(v.name));
    if (preferred) utterance.voice = preferred;

    const playback: CurrentPlayback = {
      item,
      startedAt: performance.now() / 1000,
      duration: 0,
      utterance,
      spokenChars: 0,
    };
    this.current = playback;
    this.onSentenceStart?.(item.id, item.text);

    utterance.onboundary = (event) => {
      if (this.current === playback) {
        playback.spokenChars = Math.max(
          playback.spokenChars,
          event.charIndex ?? 0,
        );
      }
    };
    utterance.onend = () => {
      if (this.current !== playback) return;
      this.completed.push({ id: item.id, text: item.text });
      this.onSentenceEnd?.(item.id, item.text);
      this.current = null;
      this.pump();
      if (!this.current && this.items.length === 0) this.onIdle?.();
    };
    utterance.onerror = () => {
      if (this.current !== playback) return;
      this.current = null;
      this.completed.push({ id: item.id, text: item.text });
      this.pump();
    };

    window.speechSynthesis.speak(utterance);
  }

  destroy() {
    this.flush();
    this.completed = [];
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.gain = null;
    }
  }
}
