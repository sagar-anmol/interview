import { encodeWav } from "@/lib/audio/wavEncoder";

/**
 * Records microphone audio into PCM frames and turns speech segments into
 * transcribed text via the STT API. Used by the candidate (guest) and the
 * interviewer (host) inside a peer session.
 */
export class VoiceCapture {
  stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private frames: Float32Array[] = [];

  async start(withVideo = false): Promise<void> {
    if (this.stream) return;
    const audio: MediaStreamConstraints["audio"] = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    };
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio,
        video: withVideo
          ? {
              width: { ideal: 640 },
              height: { ideal: 360 },
            }
          : undefined,
      });
    } catch (error) {
      // No camera (or camera permission denied) must not cost us the mic.
      if (!withVideo) throw error;
      console.warn("[peer] camera unavailable, falling back to audio only", error);
      stream = await navigator.mediaDevices.getUserMedia({ audio });
    }
    this.stream = stream;
    this.ctx = new AudioContext();
    this.source = this.ctx.createMediaStreamSource(this.stream);
    const processor = this.ctx.createScriptProcessor(2048, 1, 1);
    processor.onaudioprocess = (event) => {
      const data = event.inputBuffer.getChannelData(0);
      this.frames.push(new Float32Array(data));
    };
    this.source.connect(processor);
    processor.connect(this.ctx.destination);
    this.processor = processor;
    await this.ctx.resume().catch(() => {});
  }

  reset() {
    this.frames = [];
  }

  async transcribe(): Promise<string> {
    if (!this.frames.length) return "";
    const frames = this.frames;
    this.frames = [];
    const wav = encodeWav(frames, this.ctx?.sampleRate ?? 16000);
    if (wav.size < 600) return "";
    const form = new FormData();
    form.append("audio", wav, "utterance.wav");
    const res = await fetch("/api/stt", { method: "POST", body: form });
    if (!res.ok) return "";
    const data = (await res.json()) as { text?: string };
    return (data.text ?? "").trim();
  }

  async stop() {
    try {
      this.processor?.disconnect();
      this.source?.disconnect();
    } catch {
      /* ignore */
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.frames = [];
    await this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.processor = null;
    this.source = null;
  }
}
