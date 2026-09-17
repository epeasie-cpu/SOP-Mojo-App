export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="inline-flex items-stretch overflow-hidden rounded-sm text-sm font-extrabold tracking-tight">
        <span className="bg-lime px-1.5 py-0.5 text-lime-ink">SOP</span>
        <span className="bg-black px-1.5 py-0.5 text-lime">MOJO</span>
      </span>
      {compact ? null : (
        <span className="font-display text-lg font-semibold tracking-tight text-white">
          AI SOP Writer
        </span>
      )}
    </span>
  );
}
