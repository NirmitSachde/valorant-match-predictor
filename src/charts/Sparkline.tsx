interface Props {
  points: [string, number][];
  label: string;
}

/** Minimal rating sparkline. Pure SVG, scales to its container width. */
export function Sparkline({ points, label }: Props) {
  if (points.length < 2) return <p className="hint">Not enough history for a chart yet.</p>;
  const W = 320;
  const H = 90;
  const padX = 6;
  const padY = 10;
  const vals = points.map((p) => p[1]);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const x = (i: number) => padX + (i / (points.length - 1)) * (W - 2 * padX);
  const y = (v: number) => H - padY - ((v - lo) / span) * (H - 2 * padY);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p[1]).toFixed(1)}`).join(" ");
  const last = points[points.length - 1]!;
  return (
    <figure className="spark">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="none" className="spark-svg">
        <line x1={padX} x2={W - padX} y1={y(lo)} y2={y(lo)} className="chart-grid" />
        <line x1={padX} x2={W - padX} y1={y(hi)} y2={y(hi)} className="chart-grid" />
        <path d={d} className="spark-line" vectorEffect="non-scaling-stroke" />
        <circle cx={x(points.length - 1)} cy={y(last[1])} r="3.5" className="spark-dot" />
      </svg>
      <figcaption className="spark-cap num">
        <span>{points[0]![0]}</span>
        <span>
          low {Math.round(lo)}, high {Math.round(hi)}
        </span>
        <span>{last[0]}</span>
      </figcaption>
    </figure>
  );
}
