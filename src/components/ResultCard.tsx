import { FACTOR_KEYS, type FactorKey, type PredictResponse, type Weights } from "../api/types";
import { num, pct, seriesFromMap } from "../lib/format";
import { whyRows } from "../lib/explain";
import { FACTOR_INFO, blendProb, detectPreset, effectiveWeights, normalise, type Enabled } from "../lib/lenses";
import { useBoot } from "../context";
import { LEAGUE_LABEL, crossLeague } from "../lib/league";
import { PinIcon } from "./Icons";
import { TeamLogo } from "./TeamLogo";

interface Props {
  res: PredictResponse;
  weights: Weights;
  enabled: Enabled;
  stale: boolean;
  onPin: () => void;
  pinned: boolean;
}

/** The blend as shown to the user: recomputed live from the factor scores and the current lenses. */
export function liveBlend(res: PredictResponse, weights: Weights, enabled: Enabled): { map: number; series: number; weightsUsed: Weights } {
  const eff = effectiveWeights(weights, enabled);
  const p = blendProb(res.factors, eff);
  if (p == null) {
    return { map: res.blend.prob, series: res.blend.series_prob, weightsUsed: res.blend.weights_used };
  }
  const used = normalise(eff);
  const same = FACTOR_KEYS.every((k) => Math.abs(used[k] - res.blend.weights_used[k]) < 1e-6);
  return {
    map: same ? res.blend.prob : p,
    series: same ? res.blend.series_prob : seriesFromMap(p, res.best_of),
    weightsUsed: used,
  };
}

function favours(p: number, a: string, b: string): string {
  if (Math.abs(p - 0.5) < 0.005) return "Too close to call";
  return p > 0.5 ? `${a} favoured` : `${b} favoured`;
}

function ProbBlock({ title, p, a, b, sub, tone }: { title: string; p: number; a: string; b: string; sub: string; tone: string }) {
  const aLeads = p >= 0.5;
  const lead = aLeads ? p : 1 - p;
  return (
    <div className={`prob-block ${tone}`}>
      <h3>{title}</h3>
      <p className={`big num ${aLeads ? "lead-a" : "lead-b"}`} aria-label={`${title}: ${a} ${pct(p)}, ${b} ${pct(1 - p)}`}>
        {pct(lead)}
      </p>
      <p className="strong">{Math.abs(p - 0.5) < 0.0005 ? "Even" : `${aLeads ? a : b} favoured`}</p>
      <p className="small-text num">
        {a} {pct(p)} · {b} {pct(1 - p)}
      </p>
      <p className="small-text muted">{sub}</p>
    </div>
  );
}

function SplitBar({ p, a, b }: { p: number; a: string; b: string }) {
  return (
    <div className="split" role="img" aria-label={`${a} ${pct(p, 0)}, ${b} ${pct(1 - p, 0)}`}>
      <span className="split-a" style={{ width: `${p * 100}%` }} />
      <span className="split-b" style={{ width: `${(1 - p) * 100}%` }} />
    </div>
  );
}

export function ResultCard({ res, weights, enabled, stale, onPin, pinned }: Props) {
  const { mapsByName } = useBoot();
  const nameA = res.team_a.name;
  const nameB = res.team_b.name;
  const m = res.model;
  const blend = liveBlend(res, weights, enabled);
  const mapSorted = Object.entries(m.per_map).sort((x, y) => y[1] - x[1]);
  const why = whyRows(res.explanation, nameA, nameB);
  const maxWhy = Math.max(0.0001, ...why.map((w) => w.magnitude));
  const bo = res.best_of;

  return (
    <section className="card result" aria-labelledby="result-h" aria-live="polite">
      <div className="card-head">
        <h2 id="result-h">Result</h2>
        <button type="button" className="btn small" onClick={onPin} aria-pressed={pinned}>
          <PinIcon /> {pinned ? "Pinned as Scenario A" : "Pin as Scenario A"}
        </button>
      </div>
      {stale ? (
        <p className="notice warn" role="status">
          Inputs changed since this result. Run the prediction again to update it.
        </p>
      ) : null}
      {crossLeague(res.team_a, res.team_b) ? (
        <p className="notice warn" role="note" data-testid="cross-league-note">
          {nameA} plays in {LEAGUE_LABEL[res.team_a.tier]} and {nameB} in {LEAGUE_LABEL[res.team_b.tier]}. The two leagues rarely meet, so
          their ratings were hardly tested against each other: treat this one as a rough guess.
        </p>
      ) : null}
      <div className="matchup">
        <div className="mu-team side-a">
          <TeamLogo name={nameA} src={res.team_a.logo} size={36} />
          <div>
            <p className="strong">{nameA}</p>
            <p className="small-text muted">Team A</p>
          </div>
        </div>
        <span className="vs">vs</span>
        <div className="mu-team side-b">
          <TeamLogo name={nameB} src={res.team_b.logo} size={36} />
          <div>
            <p className="strong">{nameB}</p>
            <p className="small-text muted">Team B</p>
          </div>
        </div>
      </div>
      <p className="summary">
        {res.map ? `On ${res.map}` : bo === 1 ? "Across the map pool" : "Across the likely maps"}:{" "}
        <strong>{favours(m.map_prob, nameA, nameB)}</strong> by the model
        {Math.abs(blend.map - 0.5) >= 0.005 && blend.map > 0.5 !== m.map_prob > 0.5 ? `. Your blend disagrees and favours ${blend.map > 0.5 ? nameA : nameB}.` : "."}
      </p>

      <div className="prob-pair">
        <ProbBlock
          title="Model"
          p={m.map_prob}
          a={nameA}
          b={nameB}
          tone="model"
          sub={`Likely range ${pct(m.band[0])} to ${pct(m.band[1])} for ${nameA}`}
        />
        <ProbBlock title="Your blend" p={blend.map} a={nameA} b={nameB} tone="blend" sub="Weighted by your lenses" />
      </div>
      {detectPreset(weights, enabled) === "model" ? (
        <p className="small-text muted" data-testid="model-only-note">
          Model only: your blend equals the model number.
        </p>
      ) : null}
      <SplitBar p={m.map_prob} a={nameA} b={nameB} />

      {bo > 1 ? (
        <div className="series">
          <h3>Series odds, best of {bo}</h3>
          <div className="prob-pair slim">
            <p>
              Model: <strong className="num">{pct(m.series_prob)}</strong> {nameA}, <span className="num">{pct(1 - m.series_prob)}</span> {nameB}
            </p>
            <p>
              Your blend: <strong className="num">{pct(blend.series)}</strong> {nameA}, <span className="num">{pct(1 - blend.series)}</span> {nameB}
            </p>
          </div>
        </div>
      ) : null}

      <div className="block">
        <h3>Per-map win chance for {nameA}</h3>
        <ul className="bars">
          {mapSorted.map(([name, p]) => (
            <li key={name} className={res.map === name ? "bar-row is-chosen" : "bar-row"}>
              <span className="bar-label">
                {mapsByName.get(name)?.list_icon ? <img src={mapsByName.get(name)!.list_icon!} alt="" width="28" height="18" loading="lazy" /> : null}
                {name}
              </span>
              <SplitBar p={p} a={nameA} b={nameB} />
              <span className="num bar-val">
                {pct(p, 0)} / {pct(1 - p, 0)}
              </span>
            </li>
          ))}
        </ul>
        <p className="hint">Left of each bar is {nameA} (blue), right is {nameB} (amber).</p>
      </div>

      {bo > 1 && m.likely_bo3_maps.length ? (
        <div className="block">
          <h3>Likely maps</h3>
          <ol className="likely-maps">
            {m.likely_bo3_maps.map((x, i) => (
              <li key={x} className="map-pill">
                <span className="likely-n num" aria-hidden="true">
                  Map {i + 1}
                </span>{" "}
                {x}
              </li>
            ))}
          </ol>
          <p className="hint">
            {m.veto_simulated
              ? "From a simulated ban and pick phase on the current pool. Real vetoes can differ."
              : "You chose the map, so no veto was simulated."}
          </p>
        </div>
      ) : null}

      <div className="block">
        <h3>What the six factors say</h3>
        <ul className="bars">
          {FACTOR_KEYS.map((k: FactorKey) => {
            const f = res.factors[k];
            const used = blend.weightsUsed[k];
            const lean = f.score - 0.5;
            const w = Math.min(50, Math.abs(lean) * 100);
            return (
              <li key={k} className="bar-row factor-row">
                <span className="bar-label">{FACTOR_INFO[k].label}</span>
                <div
                  className="diverge"
                  role="img"
                  aria-label={`${FACTOR_INFO[k].label}: ${lean === 0 ? "neutral" : lean > 0 ? nameA : nameB} ${pct(lean > 0 ? f.score : 1 - f.score, 0)}, weight ${pct(used, 0)}`}
                >
                  <span className="diverge-mid" />
                  <span className={lean >= 0 ? "diverge-fill a" : "diverge-fill b"} style={lean >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }} />
                </div>
                <span className="num bar-val">
                  {Math.abs(lean) < 0.005 ? "even" : `${lean > 0 ? "A" : "B"} ${pct(lean > 0 ? f.score : 1 - f.score, 0)}`}
                  <span className="muted"> · weight {pct(used, 0)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="block">
        <h3>Why the model leans this way</h3>
        <ul className="why">
          {why.map((w) => (
            <li key={w.feature}>
              <span className={`why-dot ${w.toward}`} aria-hidden="true" />
              <span>{w.text}</span>
              <span className="why-bar" aria-hidden="true">
                <span className={`why-fill ${w.toward}`} style={{ width: `${Math.max(4, (w.magnitude / maxWhy) * 100)}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="block ratings">
        <h3>Ratings</h3>
        <p>
          <span className="side-chip side-chip-a">A</span> {nameA}: <strong className="num">{num(res.ratings.a.rating)}</strong>{" "}
          <span className="muted num">± {num(res.ratings.a.rd)} RD</span>
        </p>
        <p>
          <span className="side-chip side-chip-b">B</span> {nameB}: <strong className="num">{num(res.ratings.b.rating)}</strong>{" "}
          <span className="muted num">± {num(res.ratings.b.rd)} RD</span>
        </p>
        <p className="hint">RD is rating deviation. A bigger number means the model is less sure about that team.</p>
      </div>

      <p className="fresh">Data through {res.data_as_of}.</p>
    </section>
  );
}
