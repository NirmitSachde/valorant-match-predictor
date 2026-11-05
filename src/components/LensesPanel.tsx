import { FACTOR_KEYS, type FactorKey, type FactorResult, type Weights } from "../api/types";
import { pct } from "../lib/format";
import {
  DEFAULT_WEIGHTS,
  FACTOR_INFO,
  PRESETS,
  allEnabled,
  blendProb,
  detectPreset,
  effectiveWeights,
  type Enabled,
} from "../lib/lenses";
import { ResetIcon } from "./Icons";

interface Props {
  weights: Weights;
  enabled: Enabled;
  factors: Record<FactorKey, FactorResult> | null;
  modelProb: number | null;
  nameA: string;
  onChange: (w: Weights, on: Enabled) => void;
}

export function LensesPanel({ weights, enabled, factors, modelProb, nameA, onChange }: Props) {
  const preset = detectPreset(weights, enabled);
  const eff = effectiveWeights(weights, enabled);
  const total = FACTOR_KEYS.reduce((s, k) => s + eff[k], 0);
  const preview = factors ? blendProb(factors, eff) : null;

  return (
    <section className="card" aria-labelledby="lens-h">
      <div className="card-head">
        <h2 id="lens-h">Lenses</h2>
        <button type="button" className="btn small ghost" onClick={() => onChange({ ...DEFAULT_WEIGHTS }, allEnabled())}>
          <ResetIcon /> Reset
        </button>
      </div>
      <p className="hint">
        The model number never changes. Lenses only change your blend, a weighted average of six simple views of the match.
      </p>
      <div className="chips" role="group" aria-label="Presets">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" className="chip" aria-pressed={preset === p.id} onClick={() => onChange({ ...p.weights }, allEnabled())}>
            {p.label}
          </button>
        ))}
        <span className={preset === "custom" ? "chip static is-on" : "chip static"} aria-current={preset === "custom" ? "true" : undefined}>
          Custom
        </span>
      </div>
      <ul className="lens-list">
        {FACTOR_KEYS.map((k) => {
          const info = FACTOR_INFO[k];
          const share = total > 0 ? eff[k] / total : 0;
          return (
            <li key={k} className={`lens${enabled[k] ? "" : " is-off"}`}>
              <div className="lens-top">
                <label className="check">
                  <input type="checkbox" checked={enabled[k]} onChange={(e) => onChange(weights, { ...enabled, [k]: e.target.checked })} />
                  <span className="strong">{info.label}</span>
                </label>
                <span className="num muted small-text" aria-label={`${info.label} share of blend`}>
                  {pct(share, 0)} of blend
                </span>
              </div>
              <div className="lens-ctl">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={weights[k]}
                  disabled={!enabled[k]}
                  aria-label={`Weight for ${info.label}`}
                  onChange={(e) => onChange({ ...weights, [k]: Number(e.target.value) }, enabled)}
                />
                <input
                  type="number"
                  className="input num-input"
                  min={0}
                  max={100}
                  value={weights[k]}
                  disabled={!enabled[k]}
                  aria-label={`Weight number for ${info.label}`}
                  onChange={(e) => {
                    const v = Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0)));
                    onChange({ ...weights, [k]: v }, enabled);
                  }}
                />
              </div>
              <p className="hint">{info.help}</p>
            </li>
          );
        })}
      </ul>
      <div className="preview" aria-live="polite">
        {total <= 0 ? (
          <p>Turn on at least one factor with a weight above zero to get a blend.</p>
        ) : preview == null || !factors ? (
          <p className="muted">Run a prediction to see the blend update live as you move the sliders.</p>
        ) : (
          <p>
            Blend preview: <strong className="num">{pct(preview)}</strong> for {nameA}
            {modelProb != null ? (
              <>
                {" "}
                (model <span className="num">{pct(modelProb)}</span>)
              </>
            ) : null}
          </p>
        )}
      </div>
    </section>
  );
}
