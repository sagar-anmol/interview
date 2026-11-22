# System Design Interview Simulator

A voice-first system design interview simulator. Dark, technical UI. Groq Whisper STT, Gemini Flash interviewer, Piper TTS, Silero VAD with barge-in, and peer mock mode over PeerJS.

## Quick start

```bash
cp .env.example .env.local
# Fill in GROQ_API_KEY, GEMINI_API_KEY, and run a Piper TTS service
# (e.g. voice-suite/Piper-Voice) with POST /api/tts {text} -> audio.

npm install
npm run copy-vad-assets   # serves Silero VAD + ORT wasm under /vad
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Setup summary

- **AI interview**: `/new?mode=ai` — Netflix scenario, 45 minutes.
- **Peer mock**: `/new?mode=peer` — AI picks the scenario, host holds the
  interviewer guide; the candidate joins via `/join/<roomCode>`.

## Environment

See `.env.example`. `PIPER_TTS_URL` may be unset to fall back to browser
speech synthesis.
