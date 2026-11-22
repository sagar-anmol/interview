/**
 * Streaming text -> sentence chunks for low-latency TTS.
 * Splits on sentence terminators and also force-splits long clauses so the
 * first audio chunk can be dispatched before the LLM finishes.
 */

const TERMINATORS = new Set([".", "!", "?"]);
const MAX_CLAUSE = 120;

export class SentenceChunker {
  private buffer = "";
  private emittedAny = false;

  push(delta: string): string[] {
    this.buffer += delta;
    const out: string[] = [];

    for (;;) {
      const cut = this.findBoundary(this.buffer);
      if (cut <= 0) break;
      const sentence = this.buffer.slice(0, cut).trim();
      this.buffer = this.buffer.slice(cut);
      const cleaned = cleanForSpeech(sentence);
      if (cleaned) {
        out.push(cleaned);
        this.emittedAny = true;
      }
    }
    return out;
  }

  flush(): string[] {
    const rest = cleanForSpeech(this.buffer.trim());
    this.buffer = "";
    if (!rest) return [];
    return [rest];
  }

  get hasEmitted() {
    return this.emittedAny;
  }

  private findBoundary(text: string): number {
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (!TERMINATORS.has(ch)) continue;
      const next = text[i + 1];
      // Terminator must be followed by whitespace/end and not be a decimal/abbreviation.
      if (next === undefined) {
        // wait for more unless buffer is long
        if (text.length > i + 1) return i + 1;
        continue;
      }
      if (!/\s/.test(next)) continue;
      if (ch === "." && i > 0 && /\d/.test(text[i - 1]) && /\d/.test(next)) {
        continue;
      }
      return i + 1;
    }

    if (text.length >= MAX_CLAUSE) {
      // Force a clause break at the last comma/space before the limit.
      const window = text.slice(0, MAX_CLAUSE);
      const comma = window.lastIndexOf(", ");
      if (comma > 40) return comma + 1;
      const space = window.lastIndexOf(" ");
      if (space > 40) return space + 1;
      return MAX_CLAUSE;
    }

    return -1;
  }
}

export function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_#`>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
