import { useEffect, useId, useState } from "react";
import { api, errorMessage, isAbort } from "../api/client";
import type { PlayerSearchHit, PlayerSlim, RosterCheckSide, Side, TeamSlim } from "../api/types";
import { useDebounced } from "../lib/hooks";
import type { RosterId } from "../lib/urlState";
import { CloseIcon, ResetIcon } from "./Icons";

export type PlayerInfo = Map<number, PlayerSlim>;

interface Props {
  side: Side;
  team: TeamSlim;
  roster: RosterId[];
  players: PlayerInfo;
  onChange: (roster: RosterId[] | null) => void;
  onLearn: (p: PlayerSlim[]) => void;
  check: RosterCheckSide | null;
}

export function sameRoster(a: RosterId[], b: RosterId[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

export function cleanName(s: string): string {
  return s.replace(/[,|]/g, " ").replace(/\s+/g, " ").trim().slice(0, 30);
}

function PlayerSearch({
  excluded,
  onPick,
  onClose,
  onLearn,
}: {
  excluded: Set<RosterId>;
  onPick: (id: RosterId) => void;
  onClose: () => void;
  onLearn: (p: PlayerSlim[]) => void;
}) {
  const uid = useId();
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim(), 200);
  const [hits, setHits] = useState<PlayerSearchHit[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (dq.length < 1) {
      setHits([]);
      return;
    }
    const ctl = new AbortController();
    api.searchPlayers(dq, ctl.signal).then(
      (r) => {
        setHits(r.players);
        setErr(null);
        onLearn(r.players);
      },
      (e) => {
        if (!isAbort(e)) setErr(errorMessage(e));
      },
    );
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  return (
    <div className="search-panel" role="dialog" aria-label="Find a player">
      <div className="search-row">
        <label htmlFor={`${uid}-q`} className="sr-only">
          Search players by name
        </label>
        <input
          id={`${uid}-q`}
          className="input"
          autoFocus
          placeholder="Search players by name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
        />
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close player search">
          <CloseIcon />
        </button>
      </div>
      {err ? <p className="hint bad-text">{err}</p> : null}
      <ul className="result-list" aria-label="Player results">
        {hits.map((h) => {
          const taken = excluded.has(h.id);
          return (
            <li key={h.id}>
              <button type="button" className="result-btn" disabled={taken} onClick={() => onPick(h.id)}>
                <span className="strong">{h.name}</span>
                <span className="muted">
                  {h.team_name ?? "No current team"}
                  {h.country ? `, ${h.country}` : ""}
                </span>
                {taken ? <span className="badge">in roster</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {dq.length >= 2 && cleanName(dq) ? (
        <button type="button" className="btn small" onClick={() => onPick(`name:${cleanName(dq)}`)}>
          Use "{cleanName(dq)}" as a new player with no history
        </button>
      ) : null}
      {dq.length >= 1 && hits.length === 0 && !err ? <p className="hint">No matches yet.</p> : null}
    </div>
  );
}

export function RosterCheck({ side, local, check }: { side: Side; local: number; check: RosterCheckSide | null }) {
  const label = side.toUpperCase();
  if (!check) {
    return (
      <p className="hint">
        Roster check (informational): {local === 0 ? "no changes from the current roster." : `${local} change${local === 1 ? "" : "s"} from the current roster.`}{" "}
        Residency is checked when you run the prediction.
      </p>
    );
  }
  if (check.retained_core == null && check.residency_ok == null && check.notes.length > 0) {
    return (
      <div className="hint" aria-label={`Team ${label} roster check`}>
        {check.notes.map((n) => (
          <p key={n}>{n}</p>
        ))}
      </div>
    );
  }
  const res =
    check.residency_ok === null
      ? "residency could not be checked (some countries unknown)"
      : check.residency_ok
        ? "at least 3 of 5 players live in the team's region"
        : "fewer than 3 of 5 players live in the team's region";
  return (
    <div className="hint" aria-label={`Team ${label} roster check`}>
      <p>
        Roster check (informational): {check.changes_vs_last} change{check.changes_vs_last === 1 ? "" : "s"} vs last match,{" "}
        {check.retained_core ? "3 or more of 5 players retained" : "fewer than 3 of 5 players retained"}; {res}; {check.imports} import
        {check.imports === 1 ? "" : "s"}.
      </p>
      {check.notes.map((n) => (
        <p key={n}>{n}</p>
      ))}
    </div>
  );
}

export const ROSTER_SIZE = 5;

/** Plain-English note for a lineup with fewer than 5 players, or null when it is complete. */
export function lineupNote(known: number): string | null {
  if (known >= ROSTER_SIZE) return null;
  return `Lineup incomplete: ${known} of ${ROSTER_SIZE} players known. Empty slots count as new players.`;
}

export function RosterEditor({ side, team, roster, players, onChange, onLearn, check }: Props) {
  const [editing, setEditing] = useState<number | null>(null);
  const changes = roster.filter((id) => !team.roster.includes(id as number)).length;
  const isDefault = sameRoster(roster, team.roster);
  const note = lineupNote(roster.length);

  // Slot i < roster.length replaces that player; an empty slot appends one.
  const setSlot = (i: number, id: RosterId) => {
    const next = [...roster];
    if (i < next.length) next[i] = id;
    else next.push(id);
    onChange(sameRoster(next, team.roster) ? null : next);
    setEditing(null);
  };

  const slots: (RosterId | null)[] = Array.from({ length: ROSTER_SIZE }, (_, i) => roster[i] ?? null);

  return (
    <section className={`roster side-${side}`} aria-label={`Team ${side.toUpperCase()} roster`}>
      <div className="roster-head">
        <h3>{team.name} roster</h3>
        <button type="button" className="btn small ghost" onClick={() => onChange(null)} disabled={isDefault}>
          <ResetIcon /> Reset roster
        </button>
      </div>
      {note ? (
        <p className="hint" role="note">
          {note}
        </p>
      ) : null}
      <ul className="slots">
        {slots.map((id, i) => {
          if (id === null) {
            // only the first empty slot is addable, so the lineup fills in order
            const addable = i === roster.length;
            return (
              <li key={`empty-${i}`} className="slot slot-empty">
                <div className="slot-main">
                  <span className="muted">Empty slot</span>
                  <span className="muted small-text">Counts as a new player with no history</span>
                </div>
                {addable ? (
                  <button
                    type="button"
                    className="btn small"
                    aria-label={`Add player ${i + 1}`}
                    aria-expanded={editing === i}
                    onClick={() => setEditing(editing === i ? null : i)}
                  >
                    Add player
                  </button>
                ) : null}
                {editing === i ? (
                  <PlayerSearch excluded={new Set(roster)} onPick={(pid) => setSlot(i, pid)} onClose={() => setEditing(null)} onLearn={onLearn} />
                ) : null}
              </li>
            );
          }
          const info = typeof id === "number" ? players.get(id) : undefined;
          const name = typeof id === "number" ? (info?.name ?? team.roster_names[team.roster.indexOf(id)] ?? `Player ${id}`) : id.slice(5);
          const rating = info ? (info.form10?.rating ?? info.r) : null;
          return (
            <li key={`${i}-${id}`} className="slot">
              <div className="slot-main">
                <span className="strong">{name}</span>
                <span className="muted small-text">
                  {typeof id !== "number" ? "New player, no history" : [info?.country, rating != null ? `rating ${rating.toFixed(2)}` : null].filter(Boolean).join(", ")}
                </span>
              </div>
              <button
                type="button"
                className="btn small"
                aria-label={`Change player ${i + 1}, currently ${name}`}
                aria-expanded={editing === i}
                onClick={() => setEditing(editing === i ? null : i)}
              >
                Change
              </button>
              {editing === i ? (
                <PlayerSearch excluded={new Set(roster)} onPick={(pid) => setSlot(i, pid)} onClose={() => setEditing(null)} onLearn={onLearn} />
              ) : null}
            </li>
          );
        })}
      </ul>
      <RosterCheck side={side} local={changes} check={check} />
    </section>
  );
}
