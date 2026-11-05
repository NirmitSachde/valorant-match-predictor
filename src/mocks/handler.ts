import type {
  FactorKey,
  FactorResult,
  H2HResponse,
  PlayerSearchResponse,
  PredictRequest,
  PredictResponse,
  RecentEvents,
  RosterCheckSide,
  TeamFull,
  Weights,
} from "../api/types";
import { FACTOR_KEYS } from "../api/types";
import { seriesFromMap } from "../lib/format";
import { DEFAULT_WEIGHTS, blendProb, normalise } from "../lib/lenses";
import {
  AGENT_ROLES,
  AS_OF,
  MOCK_BOOTSTRAP,
  MOCK_MAPS,
  MOCK_MODEL,
  MOCK_PLAYERS,
  MOCK_POOL,
  fullPlayer,
  playerById,
  slim,
  teamById,
} from "./data";

export class MockError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const logit = (p: number) => Math.log(p / (1 - p));
const clip = (p: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, p));

function glicko(ra: number, rb: number): number {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

function rosterRating(team: TeamFull, roster: (number | string)[] | undefined): { r: number; changes: number; known: number } {
  // [] or undefined: the team's default roster, which may list fewer than 5 known players
  const ids = roster && roster.length ? roster : team.roster;
  let sum = 0;
  let changes = 0;
  for (const id of ids) {
    if (typeof id === "number") {
      const p = playerById(id);
      if (!p) throw new MockError(422, "unknown_player", `Unknown player id ${id}`);
      sum += p.r;
    } else {
      sum += 0.95;
    }
  }
  for (const id of team.roster) if (!ids.includes(id)) changes++;
  sum += 0.95 * (5 - ids.length); // missing slots count as new players with the prior rating
  return { r: sum / 5, changes, known: ids.length };
}

function compScore(agents: string[]): number {
  const roles = new Set(agents.map((a) => AGENT_ROLES[a]));
  return roles.size / 4;
}

export function mockPredict(req: PredictRequest): PredictResponse {
  const ta = teamById(req.team_a);
  const tb = teamById(req.team_b);
  if (!ta || !tb) throw new MockError(404, "team_not_found", "Unknown team");
  if (ta.id === tb.id) throw new MockError(422, "same_team", "Pick two different teams");
  for (const r of [req.roster_a, req.roster_b]) {
    if (r && (r.length > 5 || new Set(r).size !== r.length)) {
      throw new MockError(422, "bad_roster", "A roster has at most 5 different players");
    }
  }
  if (req.map && !MOCK_MAPS.some((m) => m.name === req.map)) {
    throw new MockError(422, "unknown_map", `Unknown map ${req.map}`);
  }
  if (req.picked_by && !req.map) throw new MockError(422, "pick_without_map", "picked_by needs a map");

  const ra = rosterRating(ta, req.roster_a);
  const rb = rosterRating(tb, req.roster_b);
  const pre = glicko(ta.rating, tb.rating);
  const mapDiff = (m: string) => ((ta.map_adv[m] ?? 0) - (tb.map_adv[m] ?? 0)) / 400;
  const mapProb = (m: string) => clip(pre + mapDiff(m) * 0.9, 0.05, 0.95);
  const pickShift = req.picked_by === "a" ? 0.03 : req.picked_by === "b" ? -0.03 : 0;

  const perMap: Record<string, number> = {};
  for (const m of MOCK_POOL) perMap[m] = clip(mapProb(m), 0.03, 0.97);
  const chosen = req.map ?? null;

  const sortedByEdge = [...MOCK_POOL].sort((x, y) => Math.abs(perMap[x]! - 0.5) - Math.abs(perMap[y]! - 0.5));
  const likely = req.best_of === 1 ? sortedByEdge.slice(0, 1) : sortedByEdge.slice(0, req.best_of === 3 ? 3 : 5);

  const playersOk = ra.known > 0 && rb.known > 0;
  const dsc = playersOk ? ra.r - rb.r : 0;
  const factors = {} as Record<FactorKey, FactorResult>;
  factors.team_strength = { score: pre, weight: 0, detail: { rating_a: ta.rating, rating_b: tb.rating } };
  factors.map_strength = {
    score: chosen ? clip(0.5 + (mapProb(chosen) - pre), 0.05, 0.95) : 0.5,
    weight: 0,
    detail: { map: chosen },
  };
  factors.recent_form = {
    score: sigmoid(3 * (ta.form - tb.form) + 0.15 * (ta.margin - tb.margin)),
    weight: 0,
    detail: { form_a: ta.form, form_b: tb.form },
  };
  factors.roster_form = playersOk
    ? {
        score: sigmoid(4 * dsc - 0.15 * (ra.changes - rb.changes)),
        weight: 0,
        detail: { rating_a: ra.r, rating_b: rb.r, known_a: ra.known, known_b: rb.known },
      }
    : { score: 0.5, weight: 0, detail: { used: false, reason: "no known players for one team", known_a: ra.known, known_b: rb.known } };
  factors.head_to_head = { score: 0.5, weight: 0, detail: { games: 0 } };
  const haveComp = (req.agents_a?.filter(Boolean).length ?? 0) === 5 && (req.agents_b?.filter(Boolean).length ?? 0) === 5;
  factors.composition = {
    score: haveComp && chosen ? clip(0.5 + (compScore(req.agents_a!) - compScore(req.agents_b!)) / 2, 0.05, 0.95) : 0.5,
    weight: 0,
    detail: { used: haveComp && !!chosen },
  };

  const given: Weights = { ...DEFAULT_WEIGHTS, ...(req.weights ?? {}) } as Weights;
  const w = normalise(given);
  const sumGiven = FACTOR_KEYS.reduce((s, k) => s + given[k], 0);
  const used = sumGiven > 0 ? w : normalise(DEFAULT_WEIGHTS);
  FACTOR_KEYS.forEach((k) => (factors[k].weight = used[k]));
  const blendMap = blendProb(factors, used) ?? 0.5;

  // Model probability: blend of strength terms in log-odds space, so swapping sides mirrors it.
  const modelLogit =
    logit(pre) * 0.8 + (chosen ? logit(mapProb(chosen)) - logit(pre) : 0) * 0.9 + 0.5 * (ta.form - tb.form) + 1.2 * dsc;
  const modelMap = clip(chosen ? sigmoid(modelLogit) + pickShift : sigmoid(modelLogit), 0.02, 0.98);
  const combinedRd = Math.sqrt(ta.rd * ta.rd + tb.rd * tb.rd);
  const bandSpan = (combinedRd / 400) * 0.35;
  const modelSeries = req.best_of === 1 ? modelMap : seriesFromMap(modelMap, req.best_of);
  const blendSeries = req.best_of === 1 ? blendMap : seriesFromMap(blendMap, req.best_of);

  const check = (t: TeamFull, rs: { changes: number; known: number }): RosterCheckSide =>
    rs.known === 0
      ? {
          changes_vs_last: 0,
          retained_core: null,
          residency_ok: null,
          imports: 0,
          notes: ["No players recorded for this team on vlr.gg; prediction uses team results only."],
        }
      : {
    changes_vs_last: rs.changes,
    retained_core: rs.changes <= 2,
    residency_ok: t.region === "China" || rs.known < 5 ? null : true,
    imports: t.region === "China" ? 0 : 1,
    notes: [
      ...(rs.known < 5 ? [`Lineup incomplete: ${rs.known} of 5 players known, the rest count as new players.`] : []),
      ...(rs.changes > 2 ? ["Fewer than 3 of 5 players retained: earned progress could be at risk."] : []),
    ],
 };

  return {
    team_a: slim(ta),
    team_b: slim(tb),
    map: chosen,
    best_of: req.best_of,
    data_as_of: AS_OF,
    model: {
      map_prob: modelMap,
      series_prob: modelSeries,
      per_map: perMap,
      likely_bo3_maps: likely,
      veto_simulated: req.best_of > 1 && !chosen,
      band: [clip(modelMap - bandSpan, 0.01, 0.99), clip(modelMap + bandSpan, 0.01, 0.99)],
    },
    factors,
    blend: { prob: blendMap, series_prob: blendSeries, weights_used: used },
    explanation: [
      { feature: "d_mu", value: (ta.rating - tb.rating) / 100, contribution: ((ta.rating - tb.rating) / 400) * 0.62 },
      { feature: "d_player_rating", value: dsc, contribution: dsc * 0.9 },
      { feature: "d_form", value: ta.form - tb.form, contribution: (ta.form - tb.form) * 0.5 },
      { feature: "d_map", value: chosen ? mapDiff(chosen) : 0, contribution: chosen ? mapDiff(chosen) * 0.4 : 0 },
      { feature: "d_rust", value: ta.rust_days - tb.rust_days, contribution: (tb.rust_days - ta.rust_days) * 0.01 },
      { feature: "pick", value: req.picked_by === "a" ? 1 : req.picked_by === "b" ? -1 : 0, contribution: pickShift * 2 },
    ].sort((x, y) => Math.abs(y.contribution) - Math.abs(x.contribution)),
    ratings: { a: { rating: ta.rating, rd: ta.rd }, b: { rating: tb.rating, rd: tb.rd } },
    roster_check: { a: check(ta, ra), b: check(tb, rb) },
  };
}

export function mockHandle(method: string, path: string, body?: unknown): unknown {
  const url = new URL(path, "http://mock.local");
  const p = url.pathname;
  if (method === "POST" && p === "/v1/predict") return mockPredict(body as PredictRequest);
  if (method !== "GET") throw new MockError(405, "method_not_allowed", "Not allowed");
  if (p === "/v1/health") return { status: "ok", as_of: AS_OF, teams: MOCK_BOOTSTRAP.teams.length, uptime_s: 1 };
  if (p === "/v1/bootstrap") return MOCK_BOOTSTRAP;
  if (p === "/v1/model") return MOCK_MODEL;
  let m = /^\/v1\/teams\/(\d+)$/.exec(p);
  if (m) {
    const t = teamById(Number(m[1]));
    if (!t) throw new MockError(404, "team_not_found", "Team not found");
    return t;
  }
  m = /^\/v1\/teams\/(\d+)\/history$/.exec(p);
  if (m) {
    const t = teamById(Number(m[1]));
    if (!t) throw new MockError(404, "team_not_found", "Team not found");
    return { rating_history: t.rating_history, recent: t.recent };
  }
  m = /^\/v1\/players\/(\d+)$/.exec(p);
  if (m) {
    const pl = fullPlayer(Number(m[1]));
    if (!pl) throw new MockError(404, "player_not_found", "Player not found");
    return pl;
  }
  if (p === "/v1/players") {
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const starts = MOCK_PLAYERS.filter((x) => x.name.toLowerCase().startsWith(q));
    const contains = MOCK_PLAYERS.filter((x) => !x.name.toLowerCase().startsWith(q) && x.name.toLowerCase().includes(q));
    const out: PlayerSearchResponse = {
      q,
      players: q
        ? [...starts, ...contains].slice(0, limit).map((x) => ({
            ...x,
            team_name: x.team_id != null ? (teamById(x.team_id)?.name ?? null) : null,
          }))
        : [],
    };
    return out;
  }
  m = /^\/v1\/h2h\/(\d+)\/(\d+)$/.exec(p);
  if (m) {
    const ta = teamById(Number(m[1]));
    const tb = teamById(Number(m[2]));
    if (!ta || !tb) throw new MockError(404, "team_not_found", "Team not found");
    const rec = ta.h2h_top.find((h) => h.opponent_id === tb.id);
    const out: H2HResponse = {
      team_a: slim(ta),
      team_b: slim(tb),
      games: rec?.games ?? 0,
      a_wins: rec?.a_wins ?? 0,
      b_wins: rec?.b_wins ?? 0,
      decayed_share: rec?.decayed_share ?? 0.5,
      n_decayed: rec?.n_decayed ?? 0,
      last_ts: rec?.last_ts ?? null,
      maps: rec?.maps ?? {},
      last_meetings: ta.recent.filter((r) => r.opponent_id === tb.id).slice(0, 10),
    };
    return out;
  }
  if (p === "/v1/events/recent") {
    const out: RecentEvents = { as_of: AS_OF, days: Number(url.searchParams.get("days") ?? 14), matches: [] };
    return out;
  }
  throw new MockError(404, "not_found", `No mock route for ${p}`);
}
