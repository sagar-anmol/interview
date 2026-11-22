"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mic, PhoneOff } from "lucide-react";import { ArchitectureCanvas } from "@/components/canvas/ArchitectureCanvas";
import { TopControlBar } from "@/components/TopControlBar";
import { TranscriptFeed } from "@/components/interviewer/TranscriptFeed";
import { PeerVideoPanel } from "@/components/peer/PeerVideoPanel";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { PeerSession, type PeerMsg } from "@/lib/peer/PeerSession";
import { generateReportFromSession } from "@/lib/interview/report";import { getScenario } from "@/lib/interview/scenarios";
import {
  elapsedSeconds,
  toPersisted,
  useInterviewStore,
} from "@/store/useInterviewStore";

export function PeerInterview({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const id = sessionId;

  const config = useInterviewStore((s) => s.config);
  const turns = useInterviewStore((s) => s.turns);
  const status = useInterviewStore((s) => s.status);

  const [scenarioTitle, setScenarioTitle] = React.useState("");
  const [hostPeerId, setHostPeerId] = React.useState("");
  const [guestPeerId, setGuestPeerId] = React.useState("");
  const [roomCopied, setRoomCopied] = React.useState(false);
  const [textInput, setTextInput] = React.useState("");
  const [ending, setEnding] = React.useState(false);
  const [ended, setEnded] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [remoteVideo, setRemoteVideo] = React.useState<MediaStream | null>(null);
  const [ownVideo, setOwnVideo] = React.useState<MediaStream | null>(null);
  const [micOn, setMicOn] = React.useState(true);
  const [camOn, setCamOn] = React.useState(true);

  const sessionRef = React.useRef<PeerSession | null>(null);
  const endingRef = React.useRef(false);
  const autoEndRef = React.useRef(false);

  const handleMsg = React.useCallback((msg: PeerMsg) => {
    if (msg.type === "session") {
      setScenarioTitle(getScenario(msg.scenarioId).title);
      const store = useInterviewStore.getState();
      if (store.startedAt !== msg.startedAt && store.config) {
        useInterviewStore.getState().init(store.config, msg.startedAt);
      }
    }
    if (msg.type === "timer") setElapsed(msg.elapsedSec);
    if (msg.type === "guestJoined") setGuestPeerId(msg.peerId);
  }, []);

  React.useEffect(() => {
    if (!config || config.mode !== "peer") return;
    const peer = new PeerSession("host", {
      onMsg: handleMsg,
      onTurn: () => {},
      onError: (title, description) =>
        toast({ variant: "error", title, description }),
    });
    sessionRef.current = peer;
    peer.connect();
    setTimeout(() => setHostPeerId(peer.peer.id ?? ""), 50);

    // Local camera + remote camera, set up with the session itself.
    const syncOwn = () => {
      const stream = peer.getVideoStream();
      if (stream) setOwnVideo((prev) => (prev === stream ? prev : stream));
    };
    syncOwn();
    const ownTimer = setInterval(syncOwn, 400);
    const unsubVideo = peer.onPeerVideo((_id, stream) =>
      setRemoteVideo((prev) => (prev === stream ? prev : stream)),
    );

    return () => {
      clearInterval(ownTimer);
      unsubVideo();
      peer.destroy();
    };
  }, [config, handleMsg]);

  const handleEnd = React.useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    setEnding(true);
    useInterviewStore.getState().setStatus("completed");
    const report = await generateReportFromSession(id);
    if (!report) {
      toast({
        variant: "error",
        title: "Could not generate the report",
        description: "Try End again once the guest connects.",
      });
    }
    setEnding(false);
    setEnded(true);
    const persisted = toPersisted(useInterviewStore.getState());
    if (persisted)
      await import("@/lib/db").then((m) => m.saveSession(persisted));
    router.push(`/report/${id}`);
  }, [id, router]);

  React.useEffect(() => {
    if (!config) return;
    const timer = setInterval(() => {
      const store = useInterviewStore.getState();
      const left = Math.max(0, config.durationSec - elapsedSeconds(store));
      setElapsed(Math.round(elapsedSeconds(store)));
      if (store.status === "live" && left <= 0 && !autoEndRef.current) {
        autoEndRef.current = true;
        void handleEnd();
      }
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleSubmitText = () => {
    const text = textInput.trim();
    if (!text) return;
    setTextInput("");
    sessionRef.current?.submitTurn(text);
  };

  const handleMic = () => {
    void sessionRef.current?.transcribeAndSubmit();
  };

  const handleInterrupt = () => sessionRef.current?.sendInterrupt();

  if (!config) {
    return (
      <div className="flex h-full items-center justify-center">
        <Link href="/">Back to start</Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopControlBar
        remainingSec={Math.max(0, config.durationSec - elapsed)}
        phase={"REQUIREMENTS"}
        status={status}
        ttfaMs={null}
        roleLine="Peer mock — interviewer"
        onPause={() => useInterviewStore.getState().pause()}
        onResume={() => useInterviewStore.getState().resume()}
        onEnd={() => void handleEnd()}
      />

      <div className="flex min-h-0 flex-1">
        <PeerHostPanel
          scenarioTitle={scenarioTitle || getScenario(config.scenarioId).title}
          roomCode={config.roomCode ?? ""}
          hostPeerId={hostPeerId}
          guestPeerId={guestPeerId}
          guestJoined={guestPeerId !== ""}
          roomCopied={roomCopied}
          onCopy={() => {
            if (config.roomCode) {
              void navigator.clipboard.writeText(
                `${window.location.origin}/join/${config.roomCode}`,
              );
              setRoomCopied(true);
              setTimeout(() => setRoomCopied(false), 1600);
            }
          }}
          turns={turns}
          textInput={textInput}
          onTextInput={setTextInput}
          onSubmitText={handleSubmitText}
          onMic={handleMic}
          onInterrupt={handleInterrupt}
          ended={ended}
          ending={ending}
        />

        <div className="relative min-w-0 flex-1">
          <ArchitectureCanvas readOnly />
          <PeerVideoPanel
            own={ownVideo}
            remote={remoteVideo}
            ownLabel="You"
            remoteLabel="Candidate"
            micOn={micOn}
            camOn={camOn}
            onToggleMic={() => {
              const next = !micOn;
              setMicOn(next);
              sessionRef.current?.setMicEnabled(next);
            }}
            onToggleCam={() => {
              const next = !camOn;
              setCamOn(next);
              sessionRef.current?.setCameraEnabled(next);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function PeerHostPanel(props: {
  scenarioTitle: string;
  roomCode: string;
  hostPeerId: string;
  guestPeerId: string;
  guestJoined: boolean;
  roomCopied: boolean;
  onCopy: () => void;
  turns: ReturnType<typeof useInterviewStore.getState>["turns"];
  textInput: string;
  onTextInput: (value: string) => void;
  onSubmitText: () => void;
  onMic: () => void;
  onInterrupt: () => void;
  ended: boolean;
  ending: boolean;
}) {
  const guide = useInterviewStore((s) => s.interviewerGuide);

  return (
    <aside className="flex h-full w-[400px] shrink-0 flex-col border-r border-line bg-panel">
      <div className="border-b border-line p-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          Interviewer · host
        </p>
        <h1 className="mt-1 text-[14.5px] font-medium text-zinc-100">
          {props.scenarioTitle}
        </h1>
        <div className="mt-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-zinc-500">Room code</span>
            <button
              onClick={props.onCopy}
              className="flex items-center gap-1 rounded border border-line-strong px-2 py-0.5 font-mono text-[10px] text-zinc-400 hover:bg-zinc-800"
            >
              {props.roomCode || "----"}
              {props.roomCopied ? " copied" : ""}
            </button>
          </div>
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-zinc-500">Peer id</span>
            <span className="font-mono text-[10px] text-zinc-600">
              {props.hostPeerId || "…"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-zinc-500">Candidate</span>
            <span className="font-mono text-[10px] text-zinc-600">
              {props.guestJoined
                ? props.guestPeerId || "joined"
                : `awaiting /join/${props.roomCode || "…"}`}
            </span>
          </div>
        </div>
      </div>

      {guide ? (
        <div className="border-b border-line p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Interviewer guide (AI-generated)
          </p>
          <ul className="mt-2 space-y-1.5">
            {guide.focusAreas.map((area, i) => (
              <li key={i} className="text-[11.5px] text-zinc-300">
                {area}
              </li>
            ))}
            {guide.probeQuestions.slice(0, 5).map((q, i) => (
              <li key={i} className="text-[11.5px] text-zinc-400">
                {q}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <TranscriptFeed turns={props.turns} />

      <div className="border-t border-line bg-panel p-3">
        <div className="flex gap-2">
          <Button
            onClick={props.onSubmitText}
            disabled={props.ended || !props.textInput.trim()}
          >
            <Mic className="h-3.5 w-3.5" />
            Submit question
          </Button>
          <Button onClick={props.onMic} variant="subtle" disabled={props.ended}>
            <PhoneOff className="h-3.5 w-3.5" />
            Mic
          </Button>
          <Button
            variant="subtle"
            onClick={props.onInterrupt}
            disabled={props.ended}
          >
            Interrupt
          </Button>
        </div>
        <div className="mt-2.5 flex gap-2">
          <input
            value={props.textInput}
            onChange={(e) => props.onTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                props.onSubmitText();
              }
            }}
            placeholder="Type question…"
            className="h-9 flex-1 rounded border border-line bg-[#0a0a0d] px-2.5 font-mono text-[12px] text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
          />
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-zinc-600">
          Speak through your mic or type the question. The candidate draws and
          answers — they can hear you but not your text.
        </p>
      </div>

      {props.ending ? (
        <div className="flex items-center justify-center gap-1.5 border-t border-line px-3 py-2.5 text-[11px] text-zinc-500">
          Generating the debrief…
        </div>
      ) : props.ended ? (
        <div className="border-t border-line px-3 py-2.5 text-[11px] text-zinc-500">
          Report ready — the peer will reconnect to view it.
        </div>
      ) : null}
    </aside>
  );
}
