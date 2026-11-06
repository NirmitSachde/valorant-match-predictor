import type { TeamSlim, Tier } from "../api/types";

export const LEAGUE_LABEL: Record<Tier, string> = { vct: "VCT", challengers: "Challengers" };

/**
 * Position of every team inside its own league, following the API's overall order (rating minus two RD).
 * VCT and Challengers rarely play each other, so a single ladder across both would compare numbers that
 * were never tested against each other.
 */
export function leagueRanks(teams: TeamSlim[]): Map<number, number> {
  const next: Partial<Record<Tier, number>> = {};
  const out = new Map<number, number>();
  for (const t of [...teams].sort((a, b) => a.rank - b.rank)) {
    const n = (next[t.tier] ?? 0) + 1;
    next[t.tier] = n;
    out.set(t.id, n);
  }
  return out;
}

/** True when the two teams play in different leagues, so their ratings were rarely tested against each other. */
export function crossLeague(a: Pick<TeamSlim, "tier"> | undefined, b: Pick<TeamSlim, "tier"> | undefined): boolean {
  return !!a && !!b && a.tier !== b.tier;
}
