import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { Region, TeamSlim, Tier } from "../api/types";
import { ChevronDown } from "../components/Icons";
import { TeamLogo } from "../components/TeamLogo";
import { useBoot } from "../context";
import { num, pct0, shortDate } from "../lib/format";
import { useTitle } from "../lib/hooks";
import { LEAGUE_LABEL } from "../lib/league";

type SortKey = "rank" | "rating" | "rd" | "form" | "name" | "region" | "tier" | "last_played";
type League = Tier | "all";

const LEAGUES: { key: League; label: string }[] = [
  { key: "vct", label: "VCT" },
  { key: "challengers", label: "Challengers" },
  { key: "all", label: "Both" },
];

const COLS: { key: SortKey; label: string; num?: boolean }[] = [
  { key: "name", label: "Team" },
  { key: "region", label: "Region" },
  { key: "tier", label: "League" },
  { key: "rating", label: "Rating", num: true },
  { key: "rd", label: "RD", num: true },
  { key: "form", label: "Form", num: true },
  { key: "last_played", label: "Last played" },
];

export function sortTeams(teams: TeamSlim[], key: SortKey, dir: 1 | -1): TeamSlim[] {
  const val = (t: TeamSlim): string | number => t[key] ?? "";
  return [...teams].sort((a, b) => {
    const x = val(a);
    const y = val(b);
    const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return c * dir || a.rank - b.rank;
  });
}

function asLeague(v: string | null): League {
  return v === "challengers" || v === "all" ? v : "vct";
}

export default function Teams() {
  useTitle("Team rankings");
  const { boot, leagueRank } = useBoot();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const league = asLeague(params.get("league"));
  const [region, setRegion] = useState<Region | "All">("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "rank", dir: 1 });

  const rows = useMemo(() => {
    if (!boot) return [];
    const needle = q.trim().toLowerCase();
    const filtered = boot.teams.filter(
      (t) => (league === "all" || t.tier === league) && (region === "All" || t.region === region) && (!needle || t.name.toLowerCase().includes(needle)),
    );
    return sortTeams(filtered, sort.key, sort.dir);
  }, [boot, league, region, q, sort]);

  if (!boot) return <p className="muted">Loading teams...</p>;

  const toggle = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "name" || key === "region" || key === "tier" || key === "rank" ? 1 : -1 },
    );
  const setLeague = (l: League) => {
    const next = new URLSearchParams(params);
    if (l === "vct") next.delete("league");
    else next.set("league", l);
    setParams(next, { replace: true });
  };
  const sortHead = (key: SortKey, label: string, numeric?: boolean) => (
    <th key={key} scope="col" className={numeric ? "r" : undefined} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" className="th-btn" onClick={() => toggle(key)}>
        {label}
        {sort.key === key ? <span className={sort.dir === 1 ? "sort-ind asc" : "sort-ind"}><ChevronDown /></span> : null}
      </button>
    </th>
  );

  return (
    <div className="page">
      <h1>Team rankings</h1>
      <p className="lede">
        VCT is the top flight: teams that played a VCT league stage, Kickoff, Masters or Champions in the last 400 days. Everyone else on the
        path to VCT is under Challengers. The two rarely play each other, so each league is ranked on its own. Rating is on the Glicko scale,
        where new teams start at 1500.
      </p>
      <div className="toolbar">
        <div role="tablist" aria-label="League" className="chips">
          {LEAGUES.map((l) => (
            <button key={l.key} role="tab" type="button" className="chip" aria-selected={league === l.key} aria-pressed={league === l.key} onClick={() => setLeague(l.key)}>
              {l.label}
            </button>
          ))}
        </div>
        <div role="tablist" aria-label="Region" className="chips">
          {(["All", ...boot.regions] as (Region | "All")[]).map((r) => (
            <button key={r} role="tab" type="button" className="chip" aria-selected={region === r} aria-pressed={region === r} onClick={() => setRegion(r)}>
              {r}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="team-search" className="sr-only">
            Search teams
          </label>
          <input id="team-search" className="input" placeholder="Search teams" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {league === "all" ? (
        <p className="notice" role="note">
          Both leagues in one list. The number in the first column is each team's place in its own league; ratings from different leagues
          were rarely tested against each other.
        </p>
      ) : null}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {sortHead("rank", "#", true)}
              {COLS.map((c) => sortHead(c.key, c.label, c.num))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="row-link" onClick={() => nav(`/teams/${t.id}`)}>
                <td className="num muted">{leagueRank.get(t.id) ?? t.rank}</td>
                <td>
                  <Link to={`/teams/${t.id}`} className="team-cell" onClick={(e) => e.stopPropagation()}>
                    <TeamLogo name={t.name} src={t.logo} size={24} />
                    {t.name}
                  </Link>
                </td>
                <td>{t.region}</td>
                <td>{LEAGUE_LABEL[t.tier]}</td>
                <td className="r num">{num(t.rating)}</td>
                <td className="r num">{num(t.rd)}</td>
                <td className="r num">{pct0(t.form)}</td>
                <td className="num">{shortDate(t.last_played)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLS.length + 1} className="muted">
                  {q.trim() && league !== "all" ? "No teams match in this league. Try Both." : "No teams match."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
