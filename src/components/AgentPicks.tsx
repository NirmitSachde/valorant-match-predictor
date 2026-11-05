import { useState } from "react";
import type { AgentMeta, Side } from "../api/types";
import { ChevronDown, ChevronRight } from "./Icons";

interface Props {
  side: Side;
  teamName: string;
  playerNames: string[];
  agents: AgentMeta[];
  value: string[];
  onChange: (v: string[]) => void;
}

function AgentIcon({ a }: { a: AgentMeta | undefined }) {
  if (!a?.icon) return <span className="agent-blank" aria-hidden="true" />;
  return <img className="agent-icon" src={a.icon} alt="" width="28" height="28" loading="lazy" decoding="async" />;
}

export function AgentPicks({ side, teamName, playerNames, agents, value, onChange }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const byKey = new Map(agents.map((a) => [a.key, a]));
  const set = (i: number, key: string) => {
    const next = [...value];
    next[i] = key;
    onChange(next);
    setOpen(null);
  };
  return (
    <div className={`agent-team side-${side}`}>
      <h4>
        <span className={`side-chip side-chip-${side}`}>{side.toUpperCase()}</span> {teamName}
      </h4>
      <ul className="agent-rows">
        {playerNames.map((n, i) => {
          const a = byKey.get(value[i] ?? "");
          return (
            <li key={i}>
              <div className="agent-row">
                <span className="strong">{n}</span>
                <button
                  type="button"
                  className="btn small"
                  aria-expanded={open === i}
                  aria-label={`Agent for ${n}: ${a ? a.name : "not chosen"}`}
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  <AgentIcon a={a} />
                  {a ? a.name : "Not chosen"}
                  <ChevronDown />
                </button>
              </div>
              {open === i ? (
                <div className="agent-grid" role="group" aria-label={`Choose agent for ${n}`}>
                  <button type="button" className="agent-opt" aria-pressed={!a} onClick={() => set(i, "")}>
                    <span className="agent-blank" aria-hidden="true" />
                    <span>None</span>
                  </button>
                  {agents.map((ag) => (
                    <button key={ag.key} type="button" className="agent-opt" aria-pressed={value[i] === ag.key} onClick={() => set(i, ag.key)}>
                      <AgentIcon a={ag} />
                      <span>{ag.name}</span>
                      {ag.role_icon ? <img className="role-icon" src={ag.role_icon} alt={ag.role} width="14" height="14" loading="lazy" /> : <span className="small-text muted">{ag.role}</span>}
                    </button>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AgentSection({ children, count }: { children: React.ReactNode; count: number }) {
  const [open, setOpen] = useState(count > 0);
  return (
    <section className="card" aria-labelledby="agents-h">
      <h2 id="agents-h">
        <button type="button" className="disclosure" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <ChevronDown /> : <ChevronRight />} Agent picks (optional)
        </button>
      </h2>
      {open ? (
        <>
          <p className="hint">Choose all five agents for both teams and a specific map to turn on the Composition factor.</p>
          <div className="agent-cols">{children}</div>
        </>
      ) : null}
    </section>
  );
}
