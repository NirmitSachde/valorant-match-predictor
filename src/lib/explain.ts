const LABELS: Record<string, string> = {
  d_mu: "Overall team rating",
  d_map: "Strength on this map",
  d_form: "Recent results",
  d_margin: "Round margins in recent games",
  d_player_rating: "Player ratings",
  d_player_acs: "Player damage output (ACS)",
  d_player_exp: "Player experience",
  h2h: "Head to head history",
  pick: "Map pick advantage",
  d_roster_change: "Roster changes",
  phi_a: "How uncertain team A's rating is",
  phi_b: "How uncertain team B's rating is",
  d_region_offset: "Regional strength gap",
  d_rust: "Time since last match",
  intl_x_d_mu: "Rating gap at international events",
};

export function featureLabel(feature: string): string {
  return LABELS[feature] ?? feature.replace(/_/g, " ");
}

export interface WhyRow {
  feature: string;
  label: string;
  toward: "a" | "b" | "neutral";
  text: string;
  magnitude: number;
}

/** Turns the top feature contributions into plain sentences. Positive contribution favours team A. */
export function whyRows(
  explanation: { feature: string; value: number; contribution: number }[],
  nameA: string,
  nameB: string,
  limit = 6,
): WhyRow[] {
  const rows = explanation.slice(0, limit);
  return rows.map((e) => {
    const label = featureLabel(e.feature);
    const mag = Math.abs(e.contribution);
    const toward = mag < 0.005 ? "neutral" : e.contribution > 0 ? "a" : "b";
    const strength = mag >= 0.3 ? "strongly" : mag >= 0.1 ? "clearly" : "slightly";
    const text =
      toward === "neutral"
        ? `${label}: no real difference.`
        : `${label}: ${strength} favours ${toward === "a" ? nameA : nameB}.`;
    return { feature: e.feature, label, toward, text, magnitude: mag };
  });
}
