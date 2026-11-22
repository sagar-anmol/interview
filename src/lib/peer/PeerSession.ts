import {
  DataConnection,
  MediaConnection,
  Peer,
} from "peerjs";
import type { Edge } from "@xyflow/react";
import type { SystemNode } from "@/store/useInterviewStore";
import {
  graphFromReactFlow,
  serializeCanvasForLLM,
} from "@/lib/canvas/serializeCanvas";
import { saveSession } from "@/lib/db";
import {
  elapsedSeconds,
  toPersisted,
  useInterviewStore,
} from "@/store/useInterviewStore";
import { VoiceCapture } from "./VoiceCapture";

export type PeerRole = "host" | "guest";

export type PeerMsg =
  | {
      type: "session";
      scenarioId: string;
      durationSec: number;
      startedAt: number;
      canvas?: unknown;
      canvasSummary?: string;
      guide?: Record<string, unknown>;
    }
  | { type: "canvas"; nodes: unknown[]; edges: unknown[] }
  | { type: "timer"; elapsedSec: number; durationSec: number }
  | { type: "turn"; turn: unknown }
  | { type: "interrupt" }
  | { type: "sessionEnded"; elapsedSec: number }
  | { type: "guestJoined"; peerId: string };

export interface PeerSessionOptions {
  onMsg: (msg: PeerMsg) => void;
  onTurn: (turn: Record<string, unknown>) => void;
  onError: (title: string, description?: string) => void;
}

export function peerIdForRoom(roomCode: string) {
  return `sdih-${roomCode}-host`;
}

interface PeerJsBrokerOptions {
  host: string;
  port: number;
  path: string;
  key: string;
  secure: boolean;
}

function getBrokerOptions(): PeerJsBrokerOptions {
  // Default: the free hosted PeerJS cloud (https://peerjs.com/client/getting-started)
  // — the peerjs client's built-in defaults: host "0.peerjs.com", port 443, path "/".
  if (!process.env.NEXT_PUBLIC_PEERJS_HOST) {
    return {
      host: "0.peerjs.com",
      port: 443,
      path: "/",
      key: "peerjs",
      secure: true,
    };
  }

  // Self-hosted fallback (e.g. `npm run peer-server`): peerjs-server on :9000.
  return {
    host: process.env.NEXT_PUBLIC_PEERJS_HOST,
    port: Number(process.env.NEXT_PUBLIC_PEERJS_PORT ?? "9000"),
    path: process.env.NEXT_PUBLIC_PEERJS_PATH ?? "/peerjs",
    key: process.env.NEXT_PUBLIC_PEERJS_KEY ?? "peerjs",
    secure: false,
  };
}

export function speakerForRole(role: PeerRole) {
  return role === "host" ? ("interviewer" as const) : ("candidate" as const);
}

/**
 * Peer interview runtime. One instance per browser.
 *
 * - Roles: "host" (interviewer, submits host questions over STT, debriefs at
 *   the end) and "guest" (candidate, speaks, draws, reads shared canvas).
 * - Transport: PeerJS WebRTC audio via `peer.call` + JSON data channels.
 * - Sync: canvas, turns (merged by id), timer.
 */
export class PeerSession {
  readonly peer: Peer;
  connection: DataConnection | null = null;
  role: PeerRole;
  hostPeerId: string | null = null;
  guestPeerId: string | null = null;

  private voice = new VoiceCapture();
  private storeUnsub: (() => void) | null = null;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private seenTurnIds = new Set<string>();
  private destroyed = false;
  private options: PeerSessionOptions;

  constructor(role: PeerRole, options: PeerSessionOptions) {
    this.role = role;
    this.options = options;
    const broker = getBrokerOptions();
    if (role === "host") {
      const roomCode = useInterviewStore.getState().config?.roomCode ?? "";
      this.peer = new Peer(peerIdForRoom(roomCode), broker);
    } else {
      const roomCode = useInterviewStore.getState().config?.roomCode ?? "";
      this.peer = new Peer(`sdih-${roomCode}-guest`, broker);
    }
  }

  async connect() {
    try {
    this.peer.on("open", () => {
      void this.startVoice();
      this.peer.on("call", (call) => {
        void this.handleCall(call);
      });
      if (this.role === "host") {
        this.hostPeerId = this.peer.id ?? null;
        this.peer.on("connection", (conn) => {
          this.attachHostConnection(conn);
        });
        this.options.onMsg({
          type: "session",
          scenarioId: useInterviewStore.getState().config?.scenarioId ?? "netflix",
          durationSec: useInterviewStore.getState().config?.durationSec ?? 0,
          startedAt: useInterviewStore.getState().startedAt ?? Date.now(),
        });
      } else {
        const store = useInterviewStore.getState();
        const hostId = peerIdForRoom(store.config?.roomCode ?? "");
        this.hostPeerId = hostId;
        const conn = this.peer.connect(hostId, { serialization: "json" });
        conn.on("open", () => {
          this.connection = conn;
          conn.send({
            type: "session",
            scenarioId: "",
            durationSec: 0,
            startedAt: store.startedAt ?? Date.now(),
          });
          const guestStream = this.voice.stream;
          if (guestStream) {
            const call = this.peer.call(hostId, guestStream);
            this.bindCall(call);
          } else {
            void this.callPeer(hostId);
          }
        });
        conn.on("data", (data) => {
          this.handlePeerMsg(data as PeerMsg);
        });
        conn.on("close", () => {
          this.options.onError("Peer disconnected");
        });
      }
      this.startSyncing();
    });

    this.peer.on("error", (error) => {
      console.error("[peer] error", error);
      this.options.onError(
        "Peer connection error",
        error.message ??
          "Could not reach the other person. Ensure they are online and connected.",
      );
    });
    } catch (error) {
      console.error("[peer] connect failed", error);
      this.options.onError("Peer connection failed");
    }
  }

  private async startVoice() {
    try {
      await this.voice.start(true);
    } catch (error) {
      console.error("[peer] voice start failed", error);
      this.options.onError(
        "Media unavailable",
        "Could not access camera/microphone. The peer session will continue without video.",
      );
    }
  }

  private suppressCanvasSync = false;
  private mediaConnected = false;

  private attachHostConnection(conn: DataConnection) {
    this.connection = conn;
    this.guestPeerId = conn.peer;
    conn.on("open", () => {
      this.options.onMsg({ type: "guestJoined", peerId: conn.peer });
      const graph = useInterviewStore.getState();
      this.send({
        type: "canvas",
        nodes: graph.nodes as unknown[],
        edges: graph.edges as unknown[],
      });
      // The guest initiates the media call. As a fallback (guest has no
      // camera/mic permission, or the call was dropped) the host dials back
      // once the grace period has elapsed.
      const guestId = conn.peer;
      setTimeout(() => {
        if (this.mediaConnected) return;
        void this.callPeer(guestId);
      }, 6000);
    });
    conn.on("data", (data) => this.handlePeerMsg(data as PeerMsg));
    conn.on("close", () => {
      this.connection = null;
      this.options.onError(
        "Peer disconnected",
        "The candidate closed the tab or lost connection.",
      );
    });
    this.startSyncing();
  }

  private videoListeners = new Set<(peerId: string, stream: MediaStream) => void>();

  onPeerVideo(listener: (peerId: string, stream: MediaStream) => void) {
    this.videoListeners.add(listener);
    return () => {
      this.videoListeners.delete(listener);
    };
  }

  private async waitForLocalStream(timeoutMs = 5000): Promise<MediaStream | null> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (this.voice.stream) return this.voice.stream;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    return null;
  }

  /** Places a media call carrying both camera and microphone. */
  private async callPeer(peerId: string) {
    if (this.mediaConnected || !peerId) return;
    const stream = await this.waitForLocalStream();
    if (!stream) {
      console.warn("[peer] no local stream, skipping media call");
      return;
    }
    try {
      const call = this.peer.call(peerId, stream);
      this.bindCall(call);
    } catch (error) {
      console.error("[peer] call failed", error);
    }
  }

  private bindCall(call: MediaConnection) {
    const publish = (stream?: MediaStream | null) => {
      if (!stream) return;
      this.mediaConnected = true;
      this.videoListeners.forEach((l) => l(call.peer, stream));
    };
    publish(call.remoteStream);
    call.on("stream", publish);
    call.on("close", () => {
      this.mediaConnected = false;
    });
    call.on("error", (error) => {
      console.error("[peer] media call error", error);
      this.mediaConnected = false;
    });
  }

  private async handleCall(call: MediaConnection) {
    // Mark media as negotiated immediately so the host does not dial back
    // while we are still waiting for camera permissions.
    this.mediaConnected = true;
    const stream = await this.waitForLocalStream();
    try {
      // Answering with the local stream makes the call bidirectional: the
      // caller sees us, we see the caller.
      await call.answer(stream ?? undefined);
    } catch (error) {
      console.error("[peer] call.answer failed", error);
    }
    this.bindCall(call);
  }

  getVideoStream(): MediaStream | null {
    return this.voice.stream;
  }

  setMicEnabled(enabled: boolean) {
    this.voice.stream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  setCameraEnabled(enabled: boolean) {
    this.voice.stream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  private startSyncing() {
    if (this.storeUnsub) return;
    this.storeUnsub = useInterviewStore.subscribe((state, prev) => {
      if (state.turns.length !== prev.turns.length) {
        const newest = state.turns[state.turns.length - 1];
        if (newest && !this.seenTurnIds.has(newest.id)) {
          this.seenTurnIds.add(newest.id);
          this.send({ type: "turn", turn: newest as unknown });
        }
      }
      if (state.nodes !== prev.nodes || state.edges !== prev.edges) {
        this.queueCanvasSync();
      }
      if (this.role === "host") this.startTimer();
    });

    if (this.role === "host") this.startTimer();
    this.queueCanvasSync();
  }

  private timerTimer: ReturnType<typeof setInterval> | null = null;
  private startTimer() {
    if (this.timerTimer || this.role !== "host") return;
    this.timerTimer = setInterval(() => {
      this.send({
        type: "timer",
        elapsedSec: Math.round(
          elapsedSeconds(useInterviewStore.getState()),
        ),
        durationSec: useInterviewStore.getState().config?.durationSec ?? 0,
      });
    }, 1000);
  }

  private queueCanvasSync() {
    if (this.syncTimer) return;
    if (this.suppressCanvasSync) return;
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      if (this.suppressCanvasSync) return;
      const store = useInterviewStore.getState();
      if (!store.config) return;
      const graph = graphFromReactFlow(
        store.nodes as unknown[],
        store.edges as unknown[],
      );
      this.send({
        type: "canvas",
        nodes: store.nodes as unknown[],
        edges: store.edges as unknown[],
      });
      void serializeCanvasForLLM(graph, store.prevGraph);
      store.setPrevGraph(graph);
    }, 250);
  }

  private send(msg: PeerMsg) {
    if (!this.connection) {
      return;
    }
    this.connection.send(msg);
  }

  handlePeerMsg(msg: PeerMsg) {
    switch (msg.type) {
      case "canvas": {
        // Don't echo back what we just received from the peer.
        this.suppressCanvasSync = true;
        useInterviewStore.getState().setGraph(
          msg.nodes as SystemNode[],
          msg.edges as Edge[],
        );
        this.suppressCanvasSync = false;
        break;
      }
      case "timer":
        this.options.onMsg(msg);
        break;
      case "turn": {
        const t = msg.turn as {
          id: string;
          speaker: "interviewer" | "candidate";
          text: string;
          ts: number;
        };
        if (!t.id || this.seenTurnIds.has(t.id)) break;
        this.seenTurnIds.add(t.id);
        useInterviewStore.getState().addTurn(t);
        const persisted = toPersisted(useInterviewStore.getState());
        if (persisted) void saveSession(persisted);
        this.options.onTurn(t as unknown as Record<string, unknown>);
        break;
      }
      case "guestJoined":
        this.options.onMsg(msg);
        break;
      default:
        this.options.onMsg(msg);
    }
  }

  /** Submit a spoken or typed turn for the local speaker. */
  submitTurn(text: string) {
    if (!text) return;
    const turn = {
      id: crypto.randomUUID(),
      speaker: speakerForRole(this.role),
      text,
      ts: Date.now(),
    };
    useInterviewStore.getState().addTurn(turn);
    this.seenTurnIds.add(turn.id);
    this.send({ type: "turn", turn });
    const persisted = toPersisted(useInterviewStore.getState());
    if (persisted) void saveSession(persisted);
    this.options.onTurn(turn as unknown as Record<string, unknown>);
  }

  sendInterrupt() {
    this.send({ type: "interrupt" });
  }

  /** Guest: speak + STT + submit as candidate turn. Host: same for interviewers. */
  async transcribeAndSubmit() {
    const text = await this.voice.transcribe();
    this.voice.reset();
    this.submitTurn(text);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.syncTimer) clearTimeout(this.syncTimer);
    if (this.timerTimer) clearInterval(this.timerTimer);
    this.storeUnsub?.();
    this.storeUnsub = null;
    this.connection?.close();
    this.connection = null;
    void this.voice.stop();
    this.peer.destroy();
  }
}
