export function ScoreGauge({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const arc = 0.75;
  const track = circumference * arc;
  const filled = track * (Math.max(0, Math.min(100, score)) / 100);
  return (
    <svg viewBox="0 0 140 118" className="mx-auto h-36 w-40" role="img" aria-label={`Score ${score} out of 100`}>
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${track} ${circumference - track}`}
        transform="rotate(135 70 70)"
      />
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke="#3dcc4a"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        transform="rotate(135 70 70)"
      />
      <text x="70" y="78" textAnchor="middle" fontSize="42" fontWeight="800" fill="#18181b">
        {score}
      </text>
    </svg>
  );
}

export function DimensionBar({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  const width = Math.max(0, Math.min(100, score));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold text-zinc-950">{label}</p>
        <p className="text-lg font-semibold text-mojo-ink">{score}</p>
      </div>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-200"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <div className="h-full rounded-full bg-mojo" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
