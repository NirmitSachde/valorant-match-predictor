// Fixtures for mock mode (VITE_MOCK=1). All teams and players are invented.
// Shapes follow docs/PLAN.md sections 5 and 6.
import type {
  AgentMeta,
  Bootstrap,
  MapMeta,
  ModelResponse,
  PlayerFull,
  PlayerSlim,
  Region,
  TeamFull,
  TeamSlim,
} from "../api/types";

function tile(letter: string, fill: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${fill}"/><text x="32" y="42" font-size="30" text-anchor="middle" fill="#ffffff" font-family="sans-serif">${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const AS_OF = "2026-11-01";

const ROLE_ICON = tile("R", "#444b5a");

export const MOCK_AGENTS: AgentMeta[] = [
  ["jett", "Jett", "duelist"],
  ["reyna", "Reyna", "duelist"],
  ["hush", "Hush", "duelist"],
  ["sova", "Sova", "initiator"],
  ["fade", "Fade", "initiator"],
  ["kayo", "KAY/O", "initiator"],
  ["omen", "Omen", "controller"],
  ["viper", "Viper", "controller"],
  ["miks", "Miks", "controller"],
  ["killjoy", "Killjoy", "sentinel"],
  ["cypher", "Cypher", "sentinel"],
  ["veto", "Veto", "sentinel"],
].map(([key, name, role]) => ({
  key: key!,
  name: name!,
  role: role!,
  icon: tile(name![0]!, "#2f3645"),
  role_icon: ROLE_ICON,
  portrait: null,
}));

export const AGENT_ROLES: Record<string, string> = Object.fromEntries(MOCK_AGENTS.map((a) => [a.key, a.role]));

const MAP_NAMES = ["Abyss", "Ascent", "Bind", "Haven", "Lotus", "Split", "Summit", "Sunset"];
export const MOCK_POOL = ["Abyss", "Ascent", "Haven", "Lotus", "Split", "Summit", "Sunset"];

export const MOCK_MAPS: MapMeta[] = MAP_NAMES.map((name, i) => ({
  name,
  in_pool: MOCK_POOL.includes(name),
  played_120d: MOCK_POOL.includes(name) ? 60 - i * 4 : 3,
  list_icon: tile(name[0]!, "#3a4256"),
  minimap: tile(name[0]!, "#3a4256"),
  splash: null,
}));

const TEAM_DEFS: { name: string; region: Region; tier: "vct" | "challengers"; rating: number; rd: number }[] = [
  { name: "Northwind", region: "Americas", tier: "vct", rating: 1688, rd: 58 },
  { name: "Redwood Esports", region: "Americas", tier: "vct", rating: 1604, rd: 66 },
  { name: "Solstice", region: "Americas", tier: "challengers", rating: 1512, rd: 92 },
  { name: "Aurora Five", region: "EMEA", tier: "vct", rating: 1671, rd: 60 },
  { name: "Basalt", region: "EMEA", tier: "vct", rating: 1590, rd: 70 },
  { name: "Cobalt Crown", region: "EMEA", tier: "challengers", rating: 1480, rd: 104 },
  { name: "Typhoon Club", region: "Pacific", tier: "vct", rating: 1702, rd: 55 },
  { name: "Kestrel", region: "Pacific", tier: "vct", rating: 1640, rd: 63 },
  { name: "Lotus Guild", region: "Pacific", tier: "challengers", rating: 1528, rd: 88 },
  { name: "Jade Dragons", region: "China", tier: "vct", rating: 1610, rd: 72 },
  { name: "Ember Peak", region: "China", tier: "vct", rating: 1566, rd: 79 },
  { name: "Silver Tide", region: "China", tier: "challengers", rating: 1460, rd: 110 },
];

const HANDLES_A = ["vex", "kro", "nim", "tal", "zed", "ori", "dax", "lum", "pyr", "quo", "rin", "sol"];
const HANDLES_B = ["ra", "on", "ik", "el", "us", "ay", "ek", "or", "ix", "an"];
const COUNTRIES: Record<Region, string[]> = {
  Americas: ["United States", "Brazil", "Chile", "Canada", "Argentina"],
  EMEA: ["Turkey", "Spain", "Sweden", "Poland", "Russia"],
  Pacific: ["South Korea", "Singapore", "Japan", "Thailand", "Indonesia"],
  China: ["China", "China", "China", "China", "China"],
};

function rnd(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}


/** A team whose source pages only ever listed 3 known players: exercises the incomplete-lineup path. */
export const PARTIAL_TEAM = "Silver Tide";

function buildPlayers(): PlayerSlim[] {
  const out: PlayerSlim[] = [];
  TEAM_DEFS.forEach((t, ti) => {
    const slots = t.name === PARTIAL_TEAM ? 3 : 5;
    for (let s = 0; s < slots; s++) {
      const i = ti * 5 + s;
      const name = `${HANDLES_A[(i * 7) % HANDLES_A.length]}${HANDLES_B[(i * 3) % HANDLES_B.length]}${i % 4 === 0 ? "" : i}`;
      out.push({
        id: 1000 + i,
        name,
        country: COUNTRIES[t.region][s]!,
        team_id: 100 + ti,
        tag: t.name.slice(0, 3).toUpperCase(),
        team_name: t.name,
        r: Number((0.9 + rnd(i + 3) * 0.35).toFixed(2)),
        acs: Math.round(170 + rnd(i + 9) * 80),
        n: 40 + Math.round(rnd(i + 5) * 200),
        form10: {
          rating: Number((0.9 + rnd(i + 11) * 0.35).toFixed(2)),
          win_rate: Number((0.35 + rnd(i + 13) * 0.4).toFixed(2)),
          consistency: Number((0.4 + rnd(i + 17) * 0.5).toFixed(2)),
        },
      });
    }
  });
  // Free agents that are not on any active roster, handy for the roster editor search.
  ["wraith", "marlo", "tessen", "quill", "baro", "kestrel_fa"].forEach((n, i) =>
    out.push({
      id: 2000 + i,
      name: n,
      country: ["United States", "Germany", "Japan", "Brazil", "Turkey", "India"][i]!,
      team_id: null,
      tag: null,
      team_name: null,
      r: Number((0.95 + i * 0.03).toFixed(2)),
      acs: 190,
      n: 25 + i * 5,
      form10: null,
    }),
  );
  return out;
}

export const MOCK_PLAYERS: PlayerSlim[] = buildPlayers();

export function playerById(id: number): PlayerSlim | undefined {
  return MOCK_PLAYERS.find((p) => p.id === id);
}

function buildTeamsFull(): TeamFull[] {
  return TEAM_DEFS.map((t, ti) => {
    const id = 100 + ti;
    const roster = MOCK_PLAYERS.filter((p) => p.team_id === id);
    const form = Number((0.35 + rnd(ti + 1) * 0.5).toFixed(2));
    const maps: TeamFull["map_stats"] = {};
    const mapAdv: Record<string, number> = {};
    MOCK_POOL.forEach((m, mi) => {
      const games = 6 + Math.round(rnd(ti * 11 + mi) * 24);
      const wr = 0.3 + rnd(ti * 13 + mi + 2) * 0.45;
      maps[m] = {
        games,
        wins: Math.round(games * wr),
        rounds_for: games * 11,
        rounds_against: games * 10,
        atk_wr: Number((0.4 + rnd(mi + ti) * 0.2).toFixed(2)),
        def_wr: Number((0.4 + rnd(mi + ti + 7) * 0.2).toFixed(2)),
      };
      mapAdv[m] = Number(((wr - 0.52) * 120).toFixed(1));
    });
    const history: [string, number][] = Array.from({ length: 52 }, (_, w) => {
      const d = new Date(Date.UTC(2025, 10, 3 + w * 7));
      const drift = (w - 51) * 0.9 + Math.sin(w / 4 + ti) * 14;
      return [d.toISOString().slice(0, 10), Number((t.rating + drift).toFixed(1))];
    });
    const opp = TEAM_DEFS.filter((_, j) => j !== ti);
    const recent = Array.from({ length: 12 }, (_, k) => {
      const o = opp[(k * 3 + ti) % opp.length]!;
      const won = rnd(ti * 17 + k) > 0.45;
      const m1 = MOCK_POOL[(k + ti) % MOCK_POOL.length]!;
      const m2 = MOCK_POOL[(k + ti + 2) % MOCK_POOL.length]!;
      return {
        match_id: 500000 + ti * 100 + k,
        ts: new Date(Date.UTC(2026, 9, 28 - k * 3)).toISOString(),
        opponent_id: 100 + TEAM_DEFS.indexOf(o),
        opponent: o.name,
        score: (won ? [2, k % 3 === 0 ? 1 : 0] : [k % 3 === 0 ? 1 : 0, 2]) as [number, number],
        event: k < 4 ? "VCT 2026: Mock Stage 2" : "VCT 2026: Mock Stage 1",
        won,
        maps: [`${m1} 13-${8 + (k % 4)}`, `${m2} ${won ? "13" : "9"}-${won ? "10" : "13"}`],
      };
    });
    return {
      id,
      name: t.name,
      region: t.region,
      tier: t.tier,
      logo: null,
      rating: t.rating,
      rd: t.rd,
      mu: (t.rating - 1500) / 173.7178,
      phi: t.rd / 173.7178,
      rank: 0,
      games: 60 + ti * 4,
      wins: 30 + ti,
      losses: 28 + ti,
      first_seen: "2024-01-14",
      last_played: new Date(Date.UTC(2026, 9, 28 - (ti % 5))).toISOString().slice(0, 10),
      roster: roster.map((p) => p.id),
      roster_tags: Object.fromEntries(roster.map((p) => [String(p.id), p.tag ?? ""])),
      form,
      margin: Number(((form - 0.5) * 4).toFixed(2)),
      rust_days: 3 + (ti % 6),
      map_adv: mapAdv,
      map_stats: maps,
      recent,
      rating_history: history,
      players: roster,
      h2h_top: opp.slice(0, 4).map((o, k) => ({
        opponent_id: 100 + TEAM_DEFS.indexOf(o),
        opponent: o.name,
        games: 4 + k * 2,
        a_wins: 2 + k,
        b_wins: 2 + k,
        decayed_share: Number((0.4 + rnd(ti + k) * 0.2).toFixed(2)),
        n_decayed: Number((2 + k * 1.3).toFixed(2)),
        last_ts: "2026-08-15T18:00:00Z",
        maps: { [MOCK_POOL[k % MOCK_POOL.length]!]: [1, 2] as [number, number] },
      })),
    };
  });
}

export const MOCK_TEAMS: TeamFull[] = (() => {
  const teams = buildTeamsFull();
  [...teams]
    .sort((a, b) => b.rating - a.rating)
    .forEach((t, i) => {
      t.rank = i + 1;
    });
  return teams;
})();

export function teamById(id: number): TeamFull | undefined {
  return MOCK_TEAMS.find((t) => t.id === id);
}

export function slim(t: TeamFull): TeamSlim {
  return {
    id: t.id,
    name: t.name,
    region: t.region,
    tier: t.tier,
    logo: t.logo,
    rating: t.rating,
    rd: t.rd,
    rank: t.rank,
    roster: t.roster,
    roster_names: t.players.map((p) => p.name),
    form: t.form,
    last_played: t.last_played,
  };
}

export const MOCK_BOOTSTRAP: Bootstrap = {
  as_of: AS_OF,
  map_pool: MOCK_POOL,
  maps: MOCK_MAPS,
  agents: MOCK_AGENTS,
  regions: ["Americas", "EMEA", "Pacific", "China"],
  teams: MOCK_TEAMS.map(slim),
};

export function fullPlayer(id: number): PlayerFull | undefined {
  const p = playerById(id);
  if (!p) return undefined;
  const team = p.team_id != null ? teamById(p.team_id) : undefined;
  const teammates = team ? team.roster.filter((x) => x !== id) : [];
  const agents: PlayerFull["agents"] = {};
  ["jett", "sova", "omen", "killjoy", "fade"].slice(0, 3 + (id % 3)).forEach((k, i) => {
    agents[k] = { games: 60 - i * 14, wins: 30 - i * 6, rating: Number((p.r + 0.05 - i * 0.04).toFixed(2)) };
  });
  const maps: PlayerFull["maps"] = {};
  MOCK_POOL.forEach((m, i) => {
    maps[m] = { games: 8 + ((id + i) % 14), wins: 4 + ((id + i) % 7), rating: Number((p.r + ((i % 3) - 1) * 0.04).toFixed(2)) };
  });
  return {
    ...p,
    last_ts: "2026-10-30T20:00:00Z",
    agents,
    roles: { duelist: { games: 40, wins: 20 }, initiator: { games: 22, wins: 11 } },
    maps,
    form10: p.form10 ?? { rating: p.r, win_rate: 0.5, consistency: 0.6 },
    pairs: Object.fromEntries(teammates.map((t, i) => [String(t), [50 - i * 5, 26 - i * 2] as [number, number]])),
    team: team ? slim(team) : null,
  };
}

const MOCK_FEATURES = [
  "d_mu", "d_map", "d_form", "d_margin", "d_player_rating", "d_player_acs", "d_player_exp", "h2h",
  "pick", "d_roster_change", "phi_a", "phi_b", "d_region_offset", "d_rust", "intl_x_dmu",
];
const MOCK_COEF = [0.62, 0.31, 0.12, 0.08, 0.15, 0.04, 0.03, 0.09, 0.07, -0.06, -0.02, 0.02, 0.1, -0.03, 0.05];

const mx = (n: number, accuracy: number, log_loss: number, brier: number) => ({ n, accuracy, log_loss, brier });

// Same shape as the normalised GET /v1/model view (backend api/routes/meta.py). Mock numbers.
export const MOCK_MODEL: ModelResponse = {
  as_of: AS_OF,
  generated_at: "2026-11-01T06:00:00Z",
  data_version: "4.0",
  counts: { matches: 8400, maps: 19800, teams_active: 12, players_active: 66 },
  map_pool: MOCK_POOL,
  regions: { Americas: 0.05, EMEA: 0.1, Pacific: 0, China: -0.15 },
  sources: "vlr.gg match pages (VCT 2023-2026, Challengers 2025-2026); valorant-api.com",
  model: {
    features: MOCK_FEATURES,
    coefficients: MOCK_FEATURES.map((feature, i) => ({ feature, coef: MOCK_COEF[i] ?? 0 })),
    calibration_layer: { used: false, reason: "no walk-forward log loss gain on 2025" },
  },
  backtest: {
    generated_at: "2026-11-01T06:00:00Z",
    data: { maps: 19800, matches: 8400, first: "2023-02-13 12:10:00+00:00", last: "2026-11-01 04:00:00+00:00" },
    monthly_2026: { model: mx(1800, 0.62, 0.648, 0.228), glicko_only: mx(1800, 0.6, 0.659, 0.233) },
    international_2026: { model: mx(160, 0.6, 0.66, 0.232), glicko_only: mx(160, 0.57, 0.672, 0.238) },
    events: [
      {
        name: "Mock Masters One",
        train_maps: 900,
        map: { model: mx(64, 0.64, 0.64, 0.224), glicko_only: mx(64, 0.61, 0.655, 0.231), coin_flip: mx(64, 0.5, 0.6931, 0.25) },
        series: {
          pre_veto: mx(30, 0.67, 0.62, 0.215),
          glicko_only: mx(30, 0.63, 0.64, 0.224),
          veto_sim: { ...mx(30, 0.66, 0.622, 0.216), n_veto_simulated: 28 },
        },
      },
    ],
    reliability: Array.from({ length: 10 }, (_, i) => {
      const lo = i / 10;
      const mid = lo + 0.05;
      return {
        bin_lo: lo,
        bin_hi: lo + 0.1,
        n: 60 + Math.round(rnd(i) * 160),
        mean_pred: mid,
        observed: Math.min(0.97, Math.max(0.03, mid + (rnd(i + 40) - 0.5) * 0.06)),
      };
    }),
    quality_gate: {
      passed: true,
      checks: [
        { name: "2026 walk-forward log loss", value: 0.648, threshold: 0.693, op: "<=", passed: true },
        { name: "2026 walk-forward accuracy", value: 0.62, threshold: 0.55, op: ">=", passed: true },
        { name: "log loss change vs the deployed model", value: 0.002, threshold: 0.01, op: "<=", passed: true },
      ],
    },
    params: { half_life_days: 60, map_k: 0.35 },
    notes: ["Hyperparameters and calibration were chosen on 2025 only; 2026 events were never used for tuning."],
  },
};
