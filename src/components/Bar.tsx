export function Bar({ value, label, tone = "a" }: { value: number; label: string; tone?: "a" | "b" | "neutral" }) {
  const w = Math.max(0, Math.min(1, value)) * 100;
  return (
    <span className="bar" role="img" aria-label={label}>
      <span className={`bar-fill ${tone}`} style={{ width: `${w}%` }} />
    </span>
  );
}
