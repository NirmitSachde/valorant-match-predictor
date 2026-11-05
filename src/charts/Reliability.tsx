import type { ReliabilityBin } from "../api/types";

interface Props {
  bins: ReliabilityBin[];
}

/** Reliability chart: predicted win chance (x) against what actually happened (y). */
export function Reliability({ bins }: Props) {
  const S = 340;
  const pad = 36;
  const inner = S - pad - 12;
  const x = (v: number) => pad + v * inner;
  const y = (v: number) => S - pad - v * inner;
  const maxN = Math.max(1, ...bins.map((b) => b.n));
  const pts = bins.filter((b) => b.n > 0);
  const line = pts.map((b, i) => `${i === 0 ? "M" : "L"}${x(b.mean_pred).toFixed(1)} ${y(b.observed).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <figure className="reliability">
      <svg
        viewBox={`0 0 ${S} ${S}`}
        role="img"
        aria-label="Reliability chart. Dots close to the diagonal line mean predicted chances match real results."
        className="rel-svg"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={y(0)} y2={y(1)} className="chart-grid" />
            <line x1={x(0)} x2={x(1)} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={x(t)} y={S - pad + 16} textAnchor="middle" className="chart-text">
              {Math.round(t * 100)}
            </text>
            <text x={pad - 8} y={y(t) + 4} textAnchor="end" className="chart-text">
              {Math.round(t * 100)}
            </text>
          </g>
        ))}
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} className="rel-diag" />
        <path d={line} className="rel-line" />
        {pts.map((b) => (
          <circle key={b.bin_lo} cx={x(b.mean_pred)} cy={y(b.observed)} r={3 + 5 * Math.sqrt(b.n / maxN)} className="rel-dot">
            <title>{`Predicted ${(b.mean_pred * 100).toFixed(0)}%, actual ${(b.observed * 100).toFixed(0)}%, ${b.n} maps`}</title>
          </circle>
        ))}
        <text x={x(0.5)} y={S - 4} textAnchor="middle" className="chart-text">
          Predicted win chance (%)
        </text>
        <text x={10} y={y(0.5)} textAnchor="middle" className="chart-text" transform={`rotate(-90 10 ${y(0.5)})`}>
          Actual win rate (%)
        </text>
      </svg>
      <figcaption className="hint">Dot size shows how many maps fell in that bin. The dashed line is a perfect match.</figcaption>
    </figure>
  );
}
