import type { Metadata } from "next";
import { HomeExperience } from "@/components/home/HomeExperience";

export const metadata: Metadata = {
  title: "CareerLoop · Interview Simulator",
  description:
    "A voice-first system design interview simulator for senior engineering candidates.",
};

export default function Home() {
  return <HomeExperience />;
}
