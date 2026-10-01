"use client";

import { PlayIcon } from "lucide-react";
import { useState } from "react";

/** Loads the YouTube/Vimeo player only after a click (no third-party cookies before then). */
export function VideoFacade({
  src,
  provider,
  title,
}: {
  src: string;
  provider: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
      {playing ? (
        <iframe
          src={src}
          title={`${title} — video`}
          className="absolute inset-0 size-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 flex flex-col items-center justify-center gap-3 text-white"
        >
          <span className="bg-success flex size-16 items-center justify-center rounded-full shadow-lg transition-transform group-hover:scale-110">
            <PlayIcon className="size-7 fill-current" aria-hidden />
          </span>
          <span className="font-medium">Play video</span>
          <span className="text-xs text-white/70">
            Loads the {provider} player
          </span>
        </button>
      )}
    </div>
  );
}
