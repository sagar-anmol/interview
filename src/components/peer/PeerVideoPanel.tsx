"use client";

import * as React from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

/**
 * Picture-in-picture style video strip for peer sessions. Both the local
 * (mirrored) and remote camera feeds are rendered side by side, with optional
 * mic/camera toggles. Renders nothing when neither stream is available, so
 * audio-only sessions keep their original layout.
 */
export function PeerVideoPanel({
  own,
  remote,
  ownLabel,
  remoteLabel,
  micOn = true,
  camOn = true,
  onToggleMic,
  onToggleCam,
}: {
  own?: MediaStream | null;
  remote?: MediaStream | null;
  ownLabel: string;
  remoteLabel: string;
  micOn?: boolean;
  camOn?: boolean;
  onToggleMic?: () => void;
  onToggleCam?: () => void;
}) {
  const remoteEl = React.useRef<HTMLVideoElement | null>(null);
  const ownEl = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    if (remoteEl.current && remoteEl.current.srcObject !== remote) {
      remoteEl.current.srcObject = remote ?? null;
    }
  }, [remote]);

  React.useEffect(() => {
    if (ownEl.current && ownEl.current.srcObject !== own) {
      ownEl.current.srcObject = own ?? null;
    }
  }, [own]);

  if (!own && !remote) return null;

  const ownHasVideo = Boolean(own && own.getVideoTracks().length > 0);
  const remoteHasVideo = Boolean(remote && remote.getVideoTracks().length > 0);

  const tile =
    "h-[104px] w-[184px] overflow-hidden rounded border border-white/10 bg-black object-cover";

  return (
    <div className="absolute right-3 top-3 z-40 flex flex-col gap-1.5 rounded-lg border border-white/10 bg-black/70 p-1.5 shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        {remote && remoteHasVideo ? (
          <div className="flex flex-col items-center gap-1">
            <video ref={remoteEl} autoPlay playsInline className={tile} />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/60">
              {remoteLabel}
            </span>
          </div>
        ) : null}
        {own && ownHasVideo ? (
          <div className="flex flex-col items-center gap-1">
            <video
              ref={ownEl}
              autoPlay
              muted
              playsInline
              className={tile}
              style={{ transform: "scaleX(-1)" }}
            />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/60">
              {ownLabel}
            </span>
          </div>
        ) : null}
      </div>

      {onToggleMic || onToggleCam ? (
        <div className="flex items-center gap-1.5">
          {onToggleMic ? (
            <button
              type="button"
              onClick={onToggleMic}
              className="flex flex-1 items-center justify-center gap-1.5 rounded border border-white/10 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/60 transition-colors hover:bg-white/10 hover:text-white/90"
            >
              {micOn ? (
                <Mic className="h-3 w-3" />
              ) : (
                <MicOff className="h-3 w-3 text-red-400" />
              )}
              {micOn ? "Mic on" : "Muted"}
            </button>
          ) : null}
          {onToggleCam ? (
            <button
              type="button"
              onClick={onToggleCam}
              className="flex flex-1 items-center justify-center gap-1.5 rounded border border-white/10 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/60 transition-colors hover:bg-white/10 hover:text-white/90"
            >
              {camOn ? (
                <Video className="h-3 w-3" />
              ) : (
                <VideoOff className="h-3 w-3 text-red-400" />
              )}
              {camOn ? "Cam on" : "Cam off"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
