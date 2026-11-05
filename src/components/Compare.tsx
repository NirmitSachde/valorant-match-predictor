import type { PredictResponse, Weights } from "../api/types";
import { pct } from "../lib/format";
import type { Enabled } from "../lib/lenses";
import { liveBlend } from "./ResultCard";

export interface Scenario {
  label: string;
  res: PredictResponse;
  weights: Weights;
  enabled: Enabled;
}

export function scenarioLabel(res: PredictResponse): string {
  return `${res.team_a.name} vs ${res.team_b.name}, ${res.map ?? "veto"}, Bo${res.best_of}`;
}

function Col({ title, s }: { title: string; s: Scenario }) {
  const b = liveBlend(s.res, s.weights, s.enabled);
  const m = s.res.model;
  return (
    <div className="cmp-col">
      <h3>{title}</h3>
      <p className="strong">{s.label}</p>
      <dl className="kv">
        <dt>Model, per map</dt>
        <dd className="num">{pct(m.map_prob)}</dd>
        <dt>Your blend, per map</dt>
        <dd className="num">{pct(b.map)}</dd>
        {s.res.best_of > 1 ? (
          <>
            <dt>Model, series</dt>
            <dd className="num">{pct(m.series_prob)}</dd>
            <dt>Your blend, series</dt>
            <dd className="num">{pct(b.series)}</dd>
          </>
        ) : null}
      </dl>
      <p className="hint">Percentages are for {s.res.team_a.name}.</p>
    </div>
  );
}

export function Compare({ a, b, onClear }: { a: Scenario; b: Scenario; onClear: () => void }) {
  const dModel = b.res.model.map_prob - a.res.model.map_prob;
  const sameTeams = a.res.team_a.id === b.res.team_a.id && a.res.team_b.id === b.res.team_b.id;
  return (
    <section className="card" aria-labelledby="cmp-h">
      <div className="card-head">
        <h2 id="cmp-h">Compare scenarios</h2>
        <button type="button" className="btn small ghost" onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="cmp">
        <Col title="Scenario A (pinned)" s={a} />
        <Col title="Scenario B (current)" s={b} />
      </div>
      {sameTeams ? (
        <p className="summary">
          Model change from A to B: <strong className="num">{dModel >= 0 ? "+" : "-"}{(Math.abs(dModel) * 100).toFixed(1)} points</strong> for{" "}
          {a.res.team_a.name}.
        </p>
      ) : (
        <p className="hint">The two scenarios use different teams or sides, so they are shown without a difference.</p>
      )}
    </section>
  );
}
