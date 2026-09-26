"use client";

export function KeepMapBanner({
  onSignIn,
  onDismiss,
}: {
  onSignIn: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2"
      role="region"
      aria-label="Sign in to keep this map"
    >
      <p className="text-sm text-zinc-300">
        <span className="font-semibold text-lime">Sign in to keep this map.</span> This browser is
        the only copy until you sign in. You can keep editing either way.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSignIn}
          className="rounded-sm bg-lime px-3 py-1.5 text-sm font-semibold text-lime-ink"
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-sm border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
