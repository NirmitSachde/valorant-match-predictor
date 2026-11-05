import type { Region, TeamSlim } from "../api/types";

/** Prefix matches first, then substring matches; empty query sorts by rating. */
export function filterTeams(teams: TeamSlim[], query: string, region: Region | "All", excludeId?: number | null): TeamSlim[] {
  const q = query.trim().toLowerCase();
  const pool = teams.filter((t) => (region === "All" || t.region === region) && t.id !== excludeId);
  if (!q) return [...pool].sort((a, b) => b.rating - a.rating);
  const starts: TeamSlim[] = [];
  const contains: TeamSlim[] = [];
  for (const t of pool) {
    const n = t.name.toLowerCase();
    if (n.startsWith(q)) starts.push(t);
    else if (n.includes(q)) contains.push(t);
  }
  const byRating = (a: TeamSlim, b: TeamSlim) => b.rating - a.rating;
  return [...starts.sort(byRating), ...contains.sort(byRating)];
}
