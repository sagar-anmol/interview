import type { Metadata } from "next";
import { TtsPlayground } from "@/components/dev/TtsPlayground";

export const metadata: Metadata = {
  title: "TTS Playground · System Design Interview",
};

export default function DevTtsPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <main className="flex h-screen items-center justify-center bg-background p-8">
        <p className="font-mono text-[11.5px] text-zinc-600">
          The TTS playground is only available in development.
        </p>
      </main>
    );
  }
  return <TtsPlayground />;
}