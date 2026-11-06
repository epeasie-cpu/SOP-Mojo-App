export const BUILDER_PRO_VIDEO = {
  src: "/video/builder-pro-walkthrough-720p.mp4",
  poster: "/video/builder-pro-walkthrough-poster.jpg",
  captions: "/video/builder-pro-walkthrough.en.vtt",
};

/** 90-second SOP Builder Pro walkthrough. Click-to-play, never autoplays with sound. */
export function BuilderProWalkthrough({ className = "" }: { className?: string }) {
  return (
    <figure className={`overflow-hidden rounded-md border border-zinc-800 bg-black ${className}`}>
      <video
        controls
        playsInline
        preload="none"
        poster={BUILDER_PRO_VIDEO.poster}
        className="aspect-video w-full"
        aria-label="SOP Builder Pro 90-second walkthrough"
      >
        <source src={BUILDER_PRO_VIDEO.src} type="video/mp4" />
        <track kind="captions" src={BUILDER_PRO_VIDEO.captions} srcLang="en" label="English" default />
      </video>
      <figcaption className="px-3 py-2 text-xs text-zinc-400">See Builder Pro in 90 seconds: build, publish, and print an SOP.</figcaption>
    </figure>
  );
}
