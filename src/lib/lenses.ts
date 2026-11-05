import { FACTOR_KEYS, type FactorKey, type FactorResult, type Weights } from "../api/types";

export const DEFAULT_WEIGHTS: Weights = {
  team_strength: 50,
  map_strength: 15,
  recent_form: 10,
  roster_form: 10,
  head_to_head: 5,
  composition: 10,
};

export const FACTOR_INFO: Record<FactorKey, { label: string; help: string }> = {
  team_strength: {
    label: "Team strength",
    help: "Overall rating of each team before the map is considered.",
  },
  map_strength: {
    label: "Map strength",
    help: "How much better or worse each team is on the chosen map.",
  },
  recent_form: {
    label: "Recent form",
    help: "Recent win share and round margin, newest results count most.",
  },
  roster_form: {
    label: "Roster form",
    help: "Player ratings for the five players you picked.",
  },
  head_to_head: {
    label: "Head to head",
    help: "Past meetings between these two teams, recent ones count more.",
  },
  composition: {
    label: "Composition",
    help: "Win rate of each agent mix on the chosen map. Needs agent picks.",
  },
};

export type PresetId = "model" | "balanced" | "form" | "map" | "custom";

export const PRESETS: { id: Exclude<PresetId, "custom">; label: string; weights: Weights }[] = [
  {
    id: "model",
    label: "Model only",
    weights: { team_strength: 100, map_strength: 0, recent_form: 0, roster_form: 0, head_to_head: 0, composition: 0 },
  },
  { id: "balanced", label: "Balanced", weights: { ...DEFAULT_WEIGHTS } },
  {
    id: "form",
    label: "Form heavy",
    weights: { team_strength: 25, map_strength: 10, recent_form: 35, roster_form: 25, head_to_head: 5, composition: 0 },
  },
  {
    id: "map",
    label: "Map specialist",
    weights: { team_strength: 25, map_strength: 40, recent_form: 10, roster_form: 5, head_to_head: 5, composition: 15 },
  },
];

export type Enabled = Record<FactorKey, boolean>;

export function allEnabled(): Enabled {
  return Object.fromEntries(FACTOR_KEYS.map((k) => [k, true])) as Enabled;
}

/** Weights actually used: toggled-off factors count as zero. */
export function effectiveWeights(w: Weights, on: Enabled): Weights {
  return Object.fromEntries(FACTOR_KEYS.map((k) => [k, on[k] ? Math.max(0, w[k]) : 0])) as Weights;
}

export function normalise(w: Weights): Weights {
  const sum = FACTOR_KEYS.reduce((s, k) => s + w[k], 0);
  if (sum <= 0) return Object.fromEntries(FACTOR_KEYS.map((k) => [k, 0])) as Weights;
  return Object.fromEntries(FACTOR_KEYS.map((k) => [k, w[k] / sum])) as Weights;
}

/** Blend = sum(w_i * score_i) / sum(w_i). Returns null when every weight is zero. */
export function blendProb(
  factors: Record<FactorKey, Pick<FactorResult, "score">>,
  weights: Weights,
): number | null {
  let num = 0;
  let den = 0;
  for (const k of FACTOR_KEYS) {
    const w = Math.max(0, weights[k]);
    num += w * factors[k].score;
    den += w;
  }
  return den > 0 ? num / den : null;
}

export function detectPreset(w: Weights, on: Enabled): PresetId {
  const eff = effectiveWeights(w, on);
  for (const p of PRESETS) {
    if (FACTOR_KEYS.every((k) => Math.abs(p.weights[k] - eff[k]) < 1e-9)) return p.id;
  }
  return "custom";
}
