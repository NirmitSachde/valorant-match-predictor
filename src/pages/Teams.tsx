import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Region, TeamSlim } from "../api/types";
import { ChevronDown } from "../components/Icons";
import { TeamLogo } from "../components/TeamLogo";
import { useBoot } from "../context";
import { num, pct0, shortDate } from "../lib/format";
import { useTitle } from "../lib/hooks";

type SortKey = "rating" | "rd" | "form" | "name" | "region" | "tier" | "last_played";

const COLS: { key: SortKey; label: string; num?: boolean }[] = [
  { key: "name", label: "Team" },
  { key: "region", label: "Region" },
  { key: "tier", label: "Tier" },
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
    return c * dir || b.rating - a.rating;
  });
}

export default function Teams() {
  useTitle("Team rankings");
  const { boot } = useBoot();
  const nav = useNavigate();
  const [region, setRegion] = useState<Region | "All">("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "rating", dir: -1 });

  const rows = useMemo(() => {
    if (!boot) return [];
    const needle = q.trim().toLowerCase();
    const filtered = boot.teams.filter((t) => (region === "All" || t.region === region) && (!needle || t.name.toLowerCase().includes(needle)));
    return sortTeams(filtered, sort.key, sort.dir);
  }, [boot, region, q, sort]);

  if (!boot) return <p className="muted">Loading teams...</p>;

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "name" || key === "region" || key === "tier" ? 1 : -1 }));

  return (
    <div className="page">
      <h1>Team rankings</h1>
      <p className="lede">Active teams only: anyone who played a match in the last 400 days. Rating is on the Glicko scale, where 1500 is average.</p>
      <div className="toolbar">
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
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th scope="col">#</th>
              {COLS.map((c) => (
                <th key={c.key} scope="col" className={c.num ? "r" : undefined} aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                  <button type="button" className="th-btn" onClick={() => toggle(c.key)}>
                    {c.label}
                    {sort.key === c.key ? <span className={sort.dir === 1 ? "sort-ind asc" : "sort-ind"}><ChevronDown /></span> : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="row-link" onClick={() => nav(`/teams/${t.id}`)}>
                <td className="num muted">{t.rank}</td>
                <td>
                  <Link to={`/teams/${t.id}`} className="team-cell" onClick={(e) => e.stopPropagation()}>
                    <TeamLogo name={t.name} src={t.logo} size={24} />
                    {t.name}
                  </Link>
                </td>
                <td>{t.region}</td>
                <td>{t.tier === "vct" ? "VCT" : "Challengers"}</td>
                <td className="r num">{num(t.rating)}</td>
                <td className="r num">{num(t.rd)}</td>
                <td className="r num">{pct0(t.form)}</td>
                <td className="num">{shortDate(t.last_played)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLS.length + 1} className="muted">
                  No teams match.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
