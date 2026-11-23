import type { Metadata } from "next";
import { HomeExperience } from "@/components/home/HomeExperience";

export const metadata: Metadata = {
  title: "CareerLoop · Interview Practice",
  description:
    "Voice-first interview practice for system design, DSA, SQL, behavioral and more — with AI or a peer.",
};

export default function Home() {
  return <HomeExperience />;
}
