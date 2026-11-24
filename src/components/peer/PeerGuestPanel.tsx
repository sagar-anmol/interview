"use client";

import * as React from "react";
import Link from "next/link";
import { ArchitectureCanvas } from "@/components/canvas/ArchitectureCanvas";
import { TranscriptFeed } from "@/components/interviewer/TranscriptFeed";
import { VoiceInputDock } from "@/components/interviewer/VoiceInputDock";
import { PeerVideoPanel } from "@/components/peer/PeerVideoPanel";
import { toast } from "@/components/ui/toast";
import {
  PeerSession,
  peerIdForRoom,
  type PeerMsg,
} from "@/lib/peer/PeerSession";
import { saveSession } from "@/lib/db";
import { toPersisted, useInterviewStore } from "@/store/useInterviewStore";
import { formatClock } from "@/lib/utils";
import { useLocationId } from "@/lib/hooks/useLocationId";

export function PeerGuestPanel() {
  const code = useLocationId();
  const [scenarioTitle, setScenarioTitle] = React.useState("");
  const [hostId, setHostId] = React.useState("");
  const [connected, setConnected] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [endedByHost, setEndedByHost] = React.useState(false);
  const [remoteVideo, setRemoteVideo] = React.useState<MediaStream | null>(
    null,
  );
  const [ownVideo, setOwnVideo] = React.useState<MediaStream | null>(null);
  const [micOn, setMicOn] = React.useState(true);
  const [camOn, setCamOn] = React.useState(true);

  const turns = useInterviewStore((s) => s.turns);
  const sessionRef = React.useRef<PeerSession | null>(null);

  React.useEffect(() => {
    if (!code) return;
    const store = useInterviewStore.getState();
    if (!store.config) {
      useInterviewStore.getState().init({
        id: crypto.randomUUID(),
        mode: "peer",
        scenarioId: "netflix",
        durationSec: 0,
        format: "voice",
        roomCode: code,
        createdAt: Date.now(),
      });
    }
    const peer = new PeerSession("guest", {
      onMsg: (msg: PeerMsg) => {
        if (msg.type === "session") {
          setScenarioTitle(
            msg.scenarioId && msg.scenarioId !== "netflix"
              ? titleFor(msg.scenarioId)
              : "System Design Interview",
          );
          const st = useInterviewStore.getState();
          if (st.startedAt !== msg.startedAt && st.config) {
            st.init(st.config, msg.startedAt);
          }
        }
        if (msg.type === "timer") setElapsed(msg.elapsedSec);
        if (msg.type === "sessionEnded") {
          setEndedByHost(true);
          useInterviewStore.getState().setStatus("completed");
        }
      },
      onTurn: () => {
        void saveSession(toPersisted(useInterviewStore.getState()));
      },
      onError: (title, description) =>
        toast({ variant: "error", title, description }),
    });
    sessionRef.current = peer;
    peer.connect();

    // Local camera + remote camera. Started here (not in a separate effect)
    // so it is guaranteed to run after `code` is available and the peer
    // session exists.
    const syncOwn = () => {
      const stream = peer.getVideoStream();
      if (stream) setOwnVideo((prev) => (prev === stream ? prev : stream));
    };
    syncOwn();
    const ownTimer = setInterval(syncOwn, 400);
    const unsubVideo = peer.onPeerVideo((_id, stream) =>
      setRemoteVideo((prev) => (prev === stream ? prev : stream)),
    );

    const host = peerIdForRoom(code);
    setTimeout(() => {
      setHostId(host);
      setConnected(true);
    }, 300);
    return () => {
      clearInterval(ownTimer);
      unsubVideo();
      peer.destroy();
    };
  }, [code]);

  const handleSubmitText = (text: string) => {
    if (!text) return;
    sessionRef.current?.submitTurn(text);
  };

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    sessionRef.current?.setMicEnabled(next);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex h-12 items-center justify-between border-b border-line bg-panel px-3">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 animate-live rounded-full bg-red-600" />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-900">
            Peer interview · candidate
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-500">
            {connected ? formatClock(elapsed) : "joining…"}
          </span>
          <Link
            href="/"
            className="inline-flex items-center px-1 py-2 text-[11px] text-slate-500 underline"
          >
            New session
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex h-[40vh] w-full shrink-0 flex-col overflow-y-auto border-b border-line bg-panel md:h-auto md:w-[360px] md:border-b-0 md:border-r">
          <div className="border-b border-line p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Candidate · You draw
            </p>
            <h1 className="mt-1 text-[15px] font-medium text-slate-900">
              {scenarioTitle || "System Design Interview"}
            </h1>
            <div className="mt-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Room</span>
                <span className="font-mono text-[10.5px] text-slate-600">
                  {code}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Host</span>
                <span className="font-mono text-[10.5px] text-slate-500">
                  {connected ? hostId || "connecting…" : "connecting…"}
                </span>
              </div>
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-slate-500">
              Draw with handles. The interviewer shares the canvas and answers
              live.
            </p>
          </div>

          <TranscriptFeed turns={turns} />

          <VoiceInputDock
            speechState="idle"
            micLevel={0}
            vadMode="auto"
            muted={!micOn}
            disabled={endedByHost}
            onToggleMute={toggleMic}
            onInterrupt={() => sessionRef.current?.sendInterrupt()}
            onPTTBegin={() => sessionRef.current?.beginPTT()}
            onPTTEnd={() => void sessionRef.current?.endPTT()}
            onSendText={handleSubmitText}
          />
          <div className="px-3 pb-3">
            <p className="text-[10.5px] leading-relaxed text-slate-400">
              Double-click to rename nodes and edges. Your edits sync live.
            </p>
          </div>
        </aside>

        <div className="relative min-h-[50vh] min-w-0 flex-1">
          <ArchitectureCanvas />
          <PeerVideoPanel
            own={ownVideo}
            remote={remoteVideo}
            ownLabel="You"
            remoteLabel="Interviewer"
            micOn={micOn}
            camOn={camOn}
            onToggleMic={toggleMic}
            onToggleCam={() => {
              const next = !camOn;
              setCamOn(next);
              sessionRef.current?.setCameraEnabled(next);
            }}
          />
        </div>
      </div>

      {endedByHost ? (
        <div className="border-t border-line bg-panel px-4 py-3 text-center font-mono text-[11px] text-slate-500">
          Interview ended by the interviewer. The debrief is available on the
          host&apos;s tab.
        </div>
      ) : null}
    </div>
  );
}

function titleFor(id: string) {
  const pool: Record<string, string> = {
    netflix: "Design Netflix",
    chat: "Design a Realtime Chat System",
    ride: "Design a Ride-Hailing Platform",
  };
  return pool[id] ?? "System Design Interview";
}
