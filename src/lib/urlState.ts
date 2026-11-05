import { FACTOR_KEYS, type BestOf, type FactorKey, type Side, type Weights } from "../api/types";
import { DEFAULT_WEIGHTS, allEnabled, type Enabled } from "./lenses";

/** A roster slot is a known player id, or "name:<text>" for a player the bundle does not know. */
export type RosterId = number | string;

export interface PredictState {
  a: number | null;
  b: number | null;
  rosterA: RosterId[] | null; // null means "use the team's current roster"; otherwise 1 to 5 entries
  rosterB: RosterId[] | null;
  bestOf: BestOf;
  map: string | null; // null means "let the veto decide"
  pickedBy: Side | null;
  agentsA: string[]; // five entries, "" means not chosen
  agentsB: string[];
  weights: Weights;
  enabled: Enabled;
}

export const EMPTY_AGENTS = ["", "", "", "", ""];

export function defaultState(): PredictState {
  return {
    a: null,
    b: null,
    rosterA: null,
    rosterB: null,
    bestOf: 3,
    map: null,
    pickedBy: null,
    agentsA: [...EMPTY_AGENTS],
    agentsB: [...EMPTY_AGENTS],
    weights: { ...DEFAULT_WEIGHTS },
    enabled: allEnabled(),
  };
}

function parseInt10(s: string | null): number | null {
  if (s == null || !/^\d+$/.test(s)) return null;
  return Number(s);
}

function parseRoster(s: string | null): RosterId[] | null {
  if (!s) return null;
  const items = s.split(",").map((x) => (/^\d+$/.test(x) ? Number(x) : x));
  // 1 to 5 entries: a lineup may be incomplete when the team's known roster has fewer than 5 players
  if (items.length < 1 || items.length > 5 || items.some((x) => x === "") || new Set(items).size !== items.length) return null;
  return items;
}

function parseAgents(s: string | null): string[] {
  if (!s) return [...EMPTY_AGENTS];
  const items = s.split(",").map((x) => x.replace(/[^a-z0-9]/g, ""));
  while (items.length < 5) items.push("");
  return items.slice(0, 5);
}

export function parseState(search: string | URLSearchParams): PredictState {
  const p = typeof search === "string" ? new URLSearchParams(search) : search;
  const s = defaultState();
  s.a = parseInt10(p.get("a"));
  s.b = parseInt10(p.get("b"));
  s.rosterA = parseRoster(p.get("ra"));
  s.rosterB = parseRoster(p.get("rb"));
  const bo = Number(p.get("bo"));
  if (bo === 1 || bo === 3 || bo === 5) s.bestOf = bo;
  const map = p.get("map");
  if (map) {
    s.map = map.slice(0, 40);
    const pb = p.get("pb");
    if (pb === "a" || pb === "b") s.pickedBy = pb;
  }
  s.agentsA = parseAgents(p.get("ga"));
  s.agentsB = parseAgents(p.get("gb"));
  const w = p.get("w");
  if (w) {
    const parts = w.split(",").map(Number);
    if (parts.length === FACTOR_KEYS.length && parts.every((x) => Number.isFinite(x) && x >= 0)) {
      FACTOR_KEYS.forEach((k, i) => (s.weights[k] = Math.min(100, parts[i]!)));
    }
  }
  const off = p.get("off");
  if (off) {
    for (const part of off.split(",")) {
      const i = Number(part);
      const k = FACTOR_KEYS[i];
      if (Number.isInteger(i) && k) s.enabled[k] = false;
    }
  }
  return s;
}

function sameWeights(a: Weights, b: Weights): boolean {
  return FACTOR_KEYS.every((k) => a[k] === b[k]);
}

export function serializeState(s: PredictState): string {
  const p = new URLSearchParams();
  if (s.a != null) p.set("a", String(s.a));
  if (s.b != null) p.set("b", String(s.b));
  if (s.rosterA) p.set("ra", s.rosterA.join(","));
  if (s.rosterB) p.set("rb", s.rosterB.join(","));
  if (s.bestOf !== 3) p.set("bo", String(s.bestOf));
  if (s.map) {
    p.set("map", s.map);
    if (s.pickedBy) p.set("pb", s.pickedBy);
  }
  if (s.agentsA.some(Boolean)) p.set("ga", s.agentsA.join(","));
  if (s.agentsB.some(Boolean)) p.set("gb", s.agentsB.join(","));
  if (!sameWeights(s.weights, DEFAULT_WEIGHTS)) p.set("w", FACTOR_KEYS.map((k) => s.weights[k]).join(","));
  const off = FACTOR_KEYS.map((k, i) => (s.enabled[k as FactorKey] ? -1 : i)).filter((i) => i >= 0);
  if (off.length) p.set("off", off.join(","));
  return p.toString();
}
