export function clamp01(p: number): number {
  if (!Number.isFinite(p)) return 0.5;
  return Math.min(1, Math.max(0, p));
}

/** 0.6123 -> "61.2%". Never shows 0.0% or 100.0% for a non-certain value. */
export function pct(p: number, digits = 1): string {
  const v = clamp01(p) * 100;
  const factor = 10 ** digits;
  let r = Math.round(v * factor) / factor;
  if (r <= 0 && p > 0) r = 1 / factor;
  if (r >= 100 && p < 1) r = 100 - 1 / factor;
  return `${r.toFixed(digits)}%`;
}

export function pct0(p: number): string {
  return pct(p, 0);
}

export function signed(n: number, digits = 2): string {
  const s = n.toFixed(digits);
  return n > 0 ? `+${s}` : s;
}

export function num(n: number, digits = 0): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "unknown";
  return iso.slice(0, 10);
}

export function initials(name: string): string {
  const parts = name.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/** Bo3: p^2 (3 - 2p). Bo5: p^3 (10 - 15p + 6p^2). Bo1: p. */
export function seriesFromMap(p: number, bestOf: 1 | 3 | 5): number {
  if (bestOf === 1) return p;
  if (bestOf === 3) return p * p * (3 - 2 * p);
  return p * p * p * (10 - 15 * p + 6 * p * p);
}

export function cap(s: string): string {
  return s.length ? s[0]!.toUpperCase() + s.slice(1) : s;
}
