"use client";

import { PeerGuestPanel } from "@/components/peer/PeerGuestPanel";

export default function JoinPage() {
  // Always render the same shell so SSR and hydration match; the room code
  // becomes available after hydration via useLocationId inside PeerGuestPanel.
  return <PeerGuestPanel />;
}
