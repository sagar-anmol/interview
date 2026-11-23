/**
 * Curated Piper voices for the interviewer.
 *
 * The full catalog lives in `@mintplex-labs/piper-tts-web` (124 voices, most
 * loaded from Hugging Face at runtime). We only surface the handful that read
 * like a calm technical interviewer, with their real on-disk sizes so the
 * warm-up screen can show an honest download total.
 */
export interface PiperVoiceMeta {
  id: string;
  label: string;
  /** Approximate onnx weight size in bytes. */
  bytes: number;
}

/** espeak-ng data + phonemizer wasm, needed by every voice. */
export const PHONEMIZER_BYTES = 6_965_800 + 174_668;

export const VOICES: PiperVoiceMeta[] = [
  { id: "en_US-lessac-medium", label: "Lessac (male, neutral)", bytes: 63_218_984 },
  { id: "en_US-ryan-medium", label: "Ryan (male, deeper)", bytes: 60_972_096 },
  { id: "en_US-hfc_female-medium", label: "HFC female", bytes: 63_258_736 },
  { id: "en_US-hfc_male-medium", label: "HFC male", bytes: 60_972_096 },
  { id: "en_US-joe-medium", label: "Joe (male, relaxed)", bytes: 63_258_736 },
];

export const DEFAULT_VOICE_ID =
  process.env.NEXT_PUBLIC_PIPER_VOICE ?? "en_US-lessac-medium";

export function voiceBytes(id: string): number {
  return VOICES.find((v) => v.id === id)?.bytes ?? 60_000_000;
}