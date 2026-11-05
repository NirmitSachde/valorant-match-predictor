import { api } from "../api/client";
import type { Backtest, Metrics, ModelResponse } from "../api/types";
import { Reliability } from "../charts/Reliability";
import { featureLabel } from "../lib/explain";
import { num, pct } from "../lib/format";
import { useAsync, useTitle } from "../lib/hooks";

interface Line {
  name: string;
  m: Metrics | null;
  model?: boolean;
}

const fixed = (v: number | undefined | null, d = 3) => (typeof v === "number" && Number.isFinite(v) ? v.toFixed(d) : "n/a");
const pctOr = (v: number | undefined | null) => (typeof v === "number" && Number.isFinite(v) ? pct(v) : "n/a");

function MetricsTable({ title, sub, lines }: { title: string; sub?: string; lines: Line[] }) {
  const rows = lines.filter((l) => l.m);
  if (!rows.length) return null;
  return (
    <div className="bt">
      <h3>
        {title} {sub ? <span className="muted small-text">({sub})</span> : null}
      </h3>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th scope="col">Method</th>
              <th scope="col" className="r">Accuracy</th>
              <th scope="col" className="r">Log loss</th>
              <th scope="col" className="r">Brier</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.name} className={l.model ? "is-model" : undefined}>
                <th scope="row">{l.name}</th>
                <td className="r num">{pctOr(l.m?.accuracy)}</td>
                <td className="r num">{fixed(l.m?.log_loss)}</td>
                <td className="r num">{fixed(l.m?.brier)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const count = (m: Metrics | null | undefined, unit: string) => (m && typeof m.n === "number" ? `${num(m.n)} ${unit}` : undefined);

function BacktestTables({ bt }: { bt: Backtest }) {
  const mo = bt.monthly_2026;
  const intl = bt.international_2026;
  return (
    <>
      <MetricsTable
        title="2026 monthly walk-forward"
        sub={count(mo.model, "maps, every tier")}
        lines={[
          { name: "Model", m: mo.model, model: true },
          { name: "Glicko only", m: mo.glicko_only },
        ]}
      />
      <MetricsTable
        title="2026 international events, pooled"
        sub={count(intl.model, "maps")}
        lines={[
          { name: "Model", m: intl.model, model: true },
          { name: "Glicko only", m: intl.glicko_only },
        ]}
      />
      {bt.events.map((e) => (
        <div key={e.name}>
          <MetricsTable
            title={`${e.name}, map level`}
            sub={[count(e.map.model, "maps"), e.train_maps != null ? `trained on ${num(e.train_maps)} earlier maps` : undefined].filter(Boolean).join(", ")}
            lines={[
              { name: "Model", m: e.map.model, model: true },
              { name: "Glicko only", m: e.map.glicko_only },
              { name: "Coin flip", m: e.map.coin_flip },
            ]}
          />
          <MetricsTable
            title={`${e.name}, series level`}
            sub={count(e.series.pre_veto ?? e.series.veto_sim, "series")}
            lines={[
              { name: "Model, before the veto", m: e.series.pre_veto, model: true },
              { name: "Model, simulated veto", m: e.series.veto_sim, model: true },
              { name: "Glicko only", m: e.series.glicko_only },
            ]}
          />
        </div>
      ))}
    </>
  );
}

function Coefs({ model }: { model: ModelResponse["model"] }) {
  const items = model.coefficients.map(({ feature: f, coef: c }) => ({ f, c })).sort((a, b) => Math.abs(b.c) - Math.abs(a.c));
  const max = Math.max(0.0001, ...items.map((i) => Math.abs(i.c)));
  if (!items.length) return <p className="muted">No model weights are available.</p>;
  return (
    <ul className="bars">
      {items.map(({ f, c }) => (
        <li key={f} className="bar-row factor-row">
          <span className="bar-label">{featureLabel(f)}</span>
          <div className="diverge" role="img" aria-label={`${featureLabel(f)} weight ${c.toFixed(2)}`}>
            <span className="diverge-mid" />
            <span
              className={c >= 0 ? "diverge-fill a" : "diverge-fill b"}
              style={c >= 0 ? { left: "50%", width: `${(Math.abs(c) / max) * 50}%` } : { right: "50%", width: `${(Math.abs(c) / max) * 50}%` }}
            />
          </div>
          <span className="num bar-val">{c.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Model() {
  useTitle("Model");
  const { data, error, loading } = useAsync((s) => api.model(s), "model");
  const bt = data?.backtest ?? null;
  return (
    <div className="page">
      <h1>The model</h1>
      <p className="lede">What it does, how it has done on matches it had not seen, and where it can be wrong. Every number below comes from the live service.</p>

      <section className="card" aria-labelledby="what-h">
        <h2 id="what-h">What the model is</h2>
        <ul className="plain">
          <li>Each team has a rating and an uncertainty (RD). Both update after every map, in date order.</li>
          <li>Teams with few games, or long breaks, have a larger RD, so the model says "I am less sure".</li>
          <li>Each team also has a separate offset for each map, shrunk toward zero until it has played that map enough.</li>
          <li>Recent results count more than old ones. Old head to head records fade out.</li>
          <li>Player ratings follow players when they change teams, so a new roster is not judged by the old one.</li>
          <li>Roster changes lower a team's rating a little and raise its uncertainty.</li>
          <li>Regions get an offset learned only from international matches, so regional ladders can be compared.</li>
          <li>A simple logistic layer turns these signals into a map win chance, the same for either side order.</li>
          <li>Series odds come from a simulated ban and pick phase on the current map pool.</li>
          <li>Your lenses never change the model number. They only build the blend shown next to it.</li>
        </ul>
      </section>

      {loading ? <p className="muted" role="status">Loading model details...</p> : null}
      {error ? <div className="notice bad" role="alert">{error}</div> : null}

      {data ? (
        <>
          <section className="card" aria-labelledby="bt-h">
            <h2 id="bt-h">Backtest</h2>
            {bt ? (
              <>
                <p className="hint">
                  Every prediction here was made using only data from before that match. Lower log loss and Brier are better. A coin flip scores 0.693 and
                  0.250.
                </p>
                <BacktestTables bt={bt} />
                {bt.notes.map((n) => (
                  <p key={n} className="hint">
                    {n}
                  </p>
                ))}
              </>
            ) : (
              <p className="muted">No backtest report is available yet.</p>
            )}
          </section>

          {bt && bt.reliability.length ? (
            <section className="card" aria-labelledby="rel-h">
              <h2 id="rel-h">Reliability</h2>
              <p className="hint">If the model says 70%, the team should win about 70% of those maps. Dots on the dashed line mean it does.</p>
              <div className="two-col">
                <Reliability bins={bt.reliability} />
                <div className="table-wrap">
                  <table className="data">
                    <caption className="sr-only">Reliability bins</caption>
                    <thead>
                      <tr>
                        <th scope="col">Predicted</th>
                        <th scope="col" className="r">Actual</th>
                        <th scope="col" className="r">Maps</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bt.reliability.map((b) => (
                        <tr key={b.bin_lo}>
                          <th scope="row">
                            {pct(b.mean_pred, 0)} <span className="muted small-text">({Math.round(b.bin_lo * 100)} to {Math.round(b.bin_hi * 100)})</span>
                          </th>
                          <td className="r num">{pct(b.observed, 0)}</td>
                          <td className="r num">{num(b.n)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : null}

          <section className="card" aria-labelledby="coef-h">
            <h2 id="coef-h">What the model weighs</h2>
            <p className="hint">Learned weights on the map model. Blue pushes toward team A, amber toward team B when the value is negative.</p>
            <Coefs model={data.model} />
          </section>

          {bt?.quality_gate ? (
            <section className="card" aria-labelledby="qg-h">
              <h2 id="qg-h">Quality gate</h2>
              <p>
                A new model only goes live if it passes these checks. Latest run: <strong>{bt.quality_gate.passed ? "passed" : "failed"}</strong>.
              </p>
              {bt.quality_gate.note ? <p className="muted">{bt.quality_gate.note}</p> : null}
              <ul className="plain">
                {bt.quality_gate.checks.map((c) => (
                  <li key={c.name}>
                    {c.name}: <span className="num">{c.value}</span> (limit {c.op === ">=" ? "at least" : "at most"} <span className="num">{c.threshold}</span>,{" "}
                    {c.passed ? "passed" : "failed"})
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="card" aria-labelledby="fresh-h">
            <h2 id="fresh-h">Data freshness</h2>
            <dl className="kv">
              <dt>Data through</dt>
              <dd className="num">{data.as_of}</dd>
              <dt>Model built</dt>
              <dd className="num">{data.generated_at ? `${data.generated_at.slice(0, 16).replace("T", " ")} UTC` : "unknown"}</dd>
              <dt>Matches</dt>
              <dd className="num">{num(data.counts.matches)}</dd>
              <dt>Maps</dt>
              <dd className="num">{num(data.counts.maps)}</dd>
              <dt>Active teams</dt>
              <dd className="num">{num(data.counts.teams_active)}</dd>
              <dt>Active players</dt>
              <dd className="num">{num(data.counts.players_active)}</dd>
            </dl>
          </section>
        </>
      ) : null}

      <section className="card" aria-labelledby="lim-h">
        <h2 id="lim-h">What it cannot know</h2>
        <ul className="plain">
          <li>Stand-ins, illness, travel and visa trouble that were not public before the match.</li>
          <li>Patch and agent balance changes that just landed, before any games show their effect.</li>
          <li>LAN versus online differences and stage nerves at big events.</li>
          <li>New teams with no games. They start near average with a large uncertainty.</li>
          <li>What happens inside a map: economy, ultimates, a single hot player.</li>
          <li>Real vetoes. The simulated veto is a best guess about what each side would ban and pick.</li>
        </ul>
      </section>
    </div>
  );
}
