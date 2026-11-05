// API types. Audited against the live API (backend api/routes/*.py) on 2026-11-05. Keep in sync with the backend.

export type Region = "Americas" | "EMEA" | "Pacific" | "China";
export type Tier = "vct" | "challengers";
export type Side = "a" | "b";
export type BestOf = 1 | 3 | 5;

export const FACTOR_KEYS = [
  "team_strength",
  "map_strength",
  "recent_form",
  "roster_form",
  "head_to_head",
  "composition",
] as const;
export type FactorKey = (typeof FACTOR_KEYS)[number];
export type Weights = Record<FactorKey, number>;

export interface MapMeta {
  name: string;
  in_pool: boolean;
  played_120d: number;
  list_icon: string | null;
  minimap: string | null;
  splash: string | null;
}

export interface AgentMeta {
  key: string;
  name: string;
  role: string;
  icon: string | null;
  role_icon: string | null;
  portrait: string | null;
}

export interface TeamSlim {
  id: number;
  name: string;
  region: Region;
  tier: Tier;
  logo: string | null;
  rating: number;
  rd: number;
  rank: number;
  /** Best-known lineup, 0 to 5 ids (fewer than 5 when the source pages miss players). */
  roster: number[];
  roster_names: string[];
  form: number;
  last_played: string | null;
}

export interface Bootstrap {
  as_of: string;
  map_pool: string[];
  maps: MapMeta[];
  agents: AgentMeta[];
  regions: Region[];
  teams: TeamSlim[];
}

/** Slim player as returned in GET /v1/teams/{id} `players` and GET /v1/players?q= `players`. */
export interface PlayerSlim {
  id: number;
  name: string;
  country: string | null;
  team_id: number | null;
  tag: string | null;
  team_name: string | null;
  r: number;
  acs: number;
  n: number;
  form10: Form10 | null;
}

export interface Form10 {
  rating: number;
  win_rate: number;
  consistency: number;
}

export interface MapStat {
  games: number;
  wins: number;
  rounds_for: number;
  rounds_against: number;
  atk_wr: number;
  def_wr: number;
}

export interface RecentMatch {
  match_id: number;
  ts: string;
  opponent_id: number;
  opponent: string;
  score: [number, number];
  event: string;
  won: boolean;
  maps: string[];
}

/** One entry of GET /v1/teams/{id} `h2h_top`, oriented to the page team (a = that team, b = the opponent). */
export interface H2HSummary {
  opponent_id: number;
  opponent: string;
  games: number;
  a_wins: number;
  b_wins: number;
  decayed_share: number;
  n_decayed: number;
  last_ts: string | null;
  maps: Record<string, [number, number]>;
}

/** GET /v1/teams/{id}: the bundle team record plus `players` and `h2h_top`. No roster_names (use players). */
export interface TeamFull extends Omit<TeamSlim, "roster_names"> {
  mu: number;
  phi: number;
  games: number;
  wins: number;
  losses: number;
  first_seen?: string | null;
  roster_tags: Record<string, string>;
  margin: number;
  rust_days: number;
  map_adv: Record<string, number>;
  map_stats: Record<string, MapStat>;
  recent: RecentMatch[];
  rating_history: [string, number][];
  players: PlayerSlim[];
  h2h_top: H2HSummary[];
}

/** GET /v1/teams/{id}/history */
export interface TeamHistory {
  id: number;
  name: string;
  rating_history: [string, number][];
  recent: RecentMatch[];
}

/** GET /v1/players/{id}: the bundle player record plus `team`. No team_name (use team.name). */
export interface PlayerFull extends Omit<PlayerSlim, "team_name" | "form10"> {
  last_ts: string | null;
  agents: Record<string, { games: number; wins: number; rating: number }>;
  roles: Record<string, { games: number; wins: number }>;
  maps: Record<string, { games: number; wins: number; rating: number }>;
  form10: Form10;
  pairs: Record<string, [number, number]>;
  team: TeamSlim | null;
}

/** Search hits are slim players. */
export type PlayerSearchHit = PlayerSlim;

export interface PlayerSearchResponse {
  q: string;
  players: PlayerSearchHit[];
}

export interface FactorResult {
  score: number;
  weight: number;
  detail: Record<string, unknown>;
}

export interface PredictRequest {
  team_a: number;
  team_b: number;
  /** 1 to 5 unique entries (ids or "name:<text>"); missing slots count as new players. Omit (or []) for the team's default roster. */
  roster_a?: (number | string)[];
  roster_b?: (number | string)[];
  map?: string;
  picked_by?: Side | null;
  best_of: BestOf;
  agents_a?: string[];
  agents_b?: string[];
  weights?: Partial<Weights>;
}

export interface RosterCheckSide {
  changes_vs_last: number;
  retained_core: boolean | null;
  residency_ok: boolean | null;
  imports: number;
  notes: string[];
}

export interface PredictResponse {
  team_a: TeamSlim;
  team_b: TeamSlim;
  map: string | null;
  best_of: BestOf;
  data_as_of: string;
  model: {
    map_prob: number;
    series_prob: number;
    per_map: Record<string, number>;
    likely_bo3_maps: string[];
    veto_simulated: boolean;
    band: [number, number];
  };
  factors: Record<FactorKey, FactorResult>;
  blend: {
    prob: number;
    series_prob: number;
    weights_used: Record<FactorKey, number>;
  };
  explanation: { feature: string; value: number; contribution: number }[];
  ratings: { a: { rating: number; rd: number }; b: { rating: number; rd: number } };
  roster_check: { a: RosterCheckSide; b: RosterCheckSide };
}

/** GET /v1/h2h/{a}/{b}, oriented to a. last_ts is null and maps empty when they never met. */
export interface H2HResponse {
  team_a: TeamSlim;
  team_b: TeamSlim;
  games: number;
  a_wins: number;
  b_wins: number;
  decayed_share: number;
  n_decayed: number;
  last_ts: string | null;
  maps: Record<string, [number, number]>;
  last_meetings: RecentMatch[];
}

/** Raw pipeline metrics object. Some slots carry extra keys (for example n_veto_simulated). */
export interface Metrics {
  n: number;
  accuracy: number;
  log_loss: number;
  brier: number;
  [extra: string]: number;
}

export interface ModelVsBaseline {
  model: Metrics | null;
  glicko_only: Metrics | null;
}

export interface BacktestEvent {
  name: string;
  train_maps: number | null;
  map: { model: Metrics | null; glicko_only: Metrics | null; coin_flip: Metrics | null };
  series: { pre_veto: Metrics | null; glicko_only: Metrics | null; veto_sim: Metrics | null };
}

export interface ReliabilityBin {
  bin_lo: number;
  bin_hi: number;
  n: number;
  mean_pred: number;
  observed: number;
}

export interface QualityCheck {
  name: string;
  value: number;
  threshold: number;
  op: "<=" | ">=" | null;
  passed: boolean;
}

export interface QualityGate {
  passed: boolean;
  checks: QualityCheck[];
  note?: string | null;
}

/** GET /v1/model `backtest`: the API normalises reports/backtest.json into this view (api/routes/meta.py). */
export interface Backtest {
  generated_at: string | null;
  data: { maps: number; matches: number; first: string; last: string } | null;
  monthly_2026: ModelVsBaseline;
  international_2026: ModelVsBaseline;
  events: BacktestEvent[];
  reliability: ReliabilityBin[];
  quality_gate: QualityGate | null;
  params: Record<string, number> | null;
  notes: string[];
}

export interface ModelResponse {
  as_of: string;
  generated_at: string;
  data_version: string;
  counts: { matches: number; maps: number; teams_active: number; players_active: number };
  map_pool: string[];
  regions: Record<string, number>;
  sources?: string | null;
  model: {
    features: string[];
    coefficients: { feature: string; coef: number }[];
    calibration_layer: Record<string, unknown> | null;
  };
  backtest: Backtest | null;
}

export interface RecentEventTeam {
  id: number;
  name: string;
  logo: string | null;
}

/** GET /v1/events/recent?days= */
export interface RecentEvents {
  as_of: string;
  days: number;
  matches: {
    match_id: number;
    ts: string;
    event: string;
    team_a: RecentEventTeam;
    team_b: RecentEventTeam;
    score: [number, number];
    winner_id: number | null;
    maps: string[];
  }[];
}
