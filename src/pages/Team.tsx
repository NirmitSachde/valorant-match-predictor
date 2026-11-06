import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Bar } from "../components/Bar";
import { TeamLogo } from "../components/TeamLogo";
import { Sparkline } from "../charts/Sparkline";
import { num, pct0, shortDate } from "../lib/format";
import { useAsync, useTitle } from "../lib/hooks";
import { useBoot } from "../context";
import { LEAGUE_LABEL } from "../lib/league";

export default function Team() {
  const { id } = useParams();
  const tid = Number(id);
  const { data: t, error, loading } = useAsync((s) => api.team(tid, s), String(tid));
  const { leagueRank } = useBoot();
  useTitle(t?.name ?? "Team");

  if (loading) return <p className="muted" role="status">Loading team...</p>;
  if (error || !t) {
    return (
      <div className="notice bad" role="alert">
        <p>{error ?? "Team not found."}</p>
        <Link to="/teams">Back to rankings</Link>
      </div>
    );
  }
  const maps = Object.entries(t.map_stats).sort((a, b) => b[1].games - a[1].games);
  return (
    <div className="page">
      <p>
        <Link to="/teams">Rankings</Link>
      </p>
      <header className="team-head">
        <TeamLogo name={t.name} src={t.logo} size={64} />
        <div>
          <h1>{t.name}</h1>
          <p className="muted">
            {t.region}, {LEAGUE_LABEL[t.tier]}, last played {shortDate(t.last_played)}
          </p>
        </div>
        <dl className="stat-row">
          <div>
            <dt>Rank in {LEAGUE_LABEL[t.tier]}</dt>
            <dd className="num">#{leagueRank.get(t.id) ?? t.rank}</dd>
          </div>
          <div>
            <dt>Rating</dt>
            <dd className="num">{num(t.rating)}</dd>
          </div>
          <div>
            <dt>RD</dt>
            <dd className="num">{num(t.rd)}</dd>
          </div>
          <div>
            <dt>Record</dt>
            <dd className="num">
              {t.wins}-{t.losses}
            </dd>
          </div>
        </dl>
      </header>

      <div className="two-col">
        <section className="card" aria-labelledby="hist-h">
          <h2 id="hist-h">Rating, last 52 weeks</h2>
          <Sparkline points={t.rating_history} label={`${t.name} rating over the last 52 weeks`} />
        </section>
        <section className="card" aria-labelledby="maps-h">
          <h2 id="maps-h">Map strengths</h2>
          <ul className="bars">
            {maps.map(([name, s]) => {
              const wr = s.games ? s.wins / s.games : 0;
              return (
                <li key={name} className="bar-row">
                  <span className="bar-label">{name}</span>
                  <Bar value={wr} label={`${name} win rate ${pct0(wr)} over ${s.games} maps`} />
                  <span className="num bar-val">
                    {pct0(wr)} <span className="muted">· {s.games} maps</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="card" aria-labelledby="roster-h">
        <h2 id="roster-h">Roster</h2>
        <ul className="roster-list">
          {t.players.map((p) => (
            <li key={p.id}>
              <Link to={`/players/${p.id}`} className="strong">
                {p.name}
              </Link>
              <span className="muted">{p.country ?? "Unknown country"}</span>
              <span className="num">rating {(p.form10?.rating ?? p.r).toFixed(2)}</span>
              {p.form10 ? <span className="num muted">win rate {pct0(p.form10.win_rate)} over the last 10</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <div className="two-col">
        <section className="card" aria-labelledby="recent-h">
          <h2 id="recent-h">Recent results</h2>
          <ul className="results">
            {t.recent.slice(0, 10).map((m) => (
              <li key={m.match_id}>
                <span className={m.won ? "res-tag win" : "res-tag loss"}>{m.won ? "Win" : "Loss"}</span>
                <span className="num">
                  {m.score[0]}-{m.score[1]}
                </span>
                <span>
                  <Link to={`/teams/${m.opponent_id}`}>{m.opponent}</Link>
                  <span className="muted small-text"> {shortDate(m.ts)} · {m.event}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card" aria-labelledby="h2h-h">
          <h2 id="h2h-h">Head to head</h2>
          <p className="hint">Maps won and lost by {t.name}, then the share of maps won with recent meetings weighted more.</p>
          {t.h2h_top.length === 0 ? (
            <p className="muted">No recent meetings on record.</p>
          ) : (
            <ul className="results">
              {t.h2h_top.map((h) => (
                <li key={h.opponent_id}>
                  <span className={h.a_wins > h.b_wins ? "res-tag win" : h.a_wins < h.b_wins ? "res-tag loss" : "res-tag"} aria-label={`${t.name} record ${h.a_wins} wins, ${h.b_wins} losses`}>
                    {h.a_wins}-{h.b_wins}
                  </span>
                  <span className="num" title="Share of maps won, with recent meetings counting more">
                    {pct0(h.decayed_share)}
                  </span>
                  <span>
                    <Link to={`/teams/${h.opponent_id}`}>{h.opponent}</Link>
                    <span className="muted small-text">
                      {" "}
                      {h.games} maps · last met {shortDate(h.last_ts)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <p>
        <Link className="btn" to={`/?a=${t.id}`}>
          Predict a match for {t.name}
        </Link>
      </p>
    </div>
  );
}
