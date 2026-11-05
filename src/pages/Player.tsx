import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Bar } from "../components/Bar";
import { useBoot } from "../context";
import { pct0, shortDate } from "../lib/format";
import { useAsync, useTitle } from "../lib/hooks";

export default function Player() {
  const { id } = useParams();
  const pid = Number(id);
  const { agentsByKey } = useBoot();
  const { data: p, error, loading } = useAsync((s) => api.player(pid, s), String(pid));
  const [mates, setMates] = useState<Record<string, string>>({});
  useTitle(p?.name ?? "Player");

  useEffect(() => {
    if (!p) return;
    const ctl = new AbortController();
    const top = Object.entries(p.pairs)
      .sort((a, b) => b[1][0] - a[1][0])
      .slice(0, 6);
    Promise.all(top.map(([tid]) => api.player(Number(tid), ctl.signal).then((x) => [tid, x.name] as const).catch(() => null))).then((list) => {
      if (!ctl.signal.aborted) setMates(Object.fromEntries(list.filter((x): x is readonly [string, string] => x != null)));
    });
    return () => ctl.abort();
  }, [p]);

  if (loading) return <p className="muted" role="status">Loading player...</p>;
  if (error || !p) {
    return (
      <div className="notice bad" role="alert">
        <p>{error ?? "Player not found."}</p>
        <Link to="/teams">Back to rankings</Link>
      </div>
    );
  }
  const agents = Object.entries(p.agents).sort((a, b) => b[1].games - a[1].games);
  const maps = Object.entries(p.maps).sort((a, b) => b[1].games - a[1].games);
  const mateRows = Object.entries(p.pairs)
    .sort((a, b) => b[1][0] - a[1][0])
    .slice(0, 6);
  return (
    <div className="page">
      <p>{p.team ? <Link to={`/teams/${p.team.id}`}>{p.team.name}</Link> : <Link to="/teams">Rankings</Link>}</p>
      <header className="team-head">
        <div>
          <h1>{p.name}</h1>
          <p className="muted">
            {p.country ?? "Unknown country"}
            {p.team ? `, plays for ${p.team.name}` : ", no current team"}. Last seen {shortDate(p.last_ts)}.
          </p>
        </div>
        <dl className="stat-row">
          <div>
            <dt>Rating 2.0</dt>
            <dd className="num">{p.r.toFixed(2)}</dd>
          </div>
          <div>
            <dt>ACS</dt>
            <dd className="num">{Math.round(p.acs ?? 0)}</dd>
          </div>
          <div>
            <dt>Maps</dt>
            <dd className="num">{p.n}</dd>
          </div>
        </dl>
      </header>

      <section className="card" aria-labelledby="form-h">
        <h2 id="form-h">Form, last 10 maps</h2>
        <dl className="stat-row">
          <div>
            <dt>Rating</dt>
            <dd className="num">{p.form10.rating.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Win rate</dt>
            <dd className="num">{pct0(p.form10.win_rate)}</dd>
          </div>
          <div>
            <dt>Consistency</dt>
            <dd className="num">{pct0(p.form10.consistency)}</dd>
          </div>
        </dl>
      </section>

      <div className="two-col">
        <section className="card" aria-labelledby="ag-h">
          <h2 id="ag-h">Agent pool</h2>
          <ul className="agent-list">
            {agents.map(([key, s]) => {
              const a = agentsByKey.get(key);
              return (
                <li key={key}>
                  {a?.icon ? <img className="agent-icon" src={a.icon} alt="" width="28" height="28" loading="lazy" /> : <span className="agent-blank" aria-hidden="true" />}
                  <span className="strong">{a?.name ?? key}</span>
                  {a?.role_icon ? <img className="role-icon" src={a.role_icon} alt={a.role} width="14" height="14" loading="lazy" /> : null}
                  <span className="num muted">
                    {s.games} maps, {s.games ? pct0(s.wins / s.games) : "0%"} won, rating {s.rating.toFixed(2)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="card" aria-labelledby="pm-h">
          <h2 id="pm-h">Map stats</h2>
          <ul className="bars">
            {maps.map(([name, s]) => {
              const wr = s.games ? s.wins / s.games : 0;
              return (
                <li key={name} className="bar-row">
                  <span className="bar-label">{name}</span>
                  <Bar value={wr} label={`${name} win rate ${pct0(wr)}`} />
                  <span className="num bar-val">
                    {pct0(wr)} <span className="muted">· {s.games} maps · {s.rating.toFixed(2)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="card" aria-labelledby="mates-h">
        <h2 id="mates-h">Frequent teammates</h2>
        {mateRows.length === 0 ? (
          <p className="muted">No teammate data.</p>
        ) : (
          <ul className="results">
            {mateRows.map(([tid, [games, wins]]) => (
              <li key={tid}>
                <span className="num">{games} maps</span>
                <span>
                  <Link to={`/players/${tid}`}>{mates[tid] ?? `Player ${tid}`}</Link>
                  <span className="muted small-text"> {games ? pct0(wins / games) : "0%"} won together</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
