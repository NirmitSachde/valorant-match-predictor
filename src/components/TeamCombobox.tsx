import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Region, Side, TeamSlim } from "../api/types";
import { filterTeams } from "../lib/teamFilter";
import { SearchIcon } from "./Icons";
import { TeamLogo } from "./TeamLogo";

interface Props {
  side: Side;
  label: string;
  teams: TeamSlim[];
  regions: Region[];
  value: number | null;
  excludeId?: number | null;
  onChange: (id: number) => void;
}

export function TeamCombobox({ side, label, teams, regions, value, excludeId, onChange }: Props) {
  const uid = useId();
  const listId = `${uid}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<Region | "All">("All");
  const [active, setActive] = useState(0);

  const selected = teams.find((t) => t.id === value) ?? null;
  const results = useMemo(() => filterTeams(teams, query, region, excludeId), [teams, query, region, excludeId]);

  const choose = (t: TeamSlim) => {
    onChange(t.id);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      if (open && results[active]) {
        e.preventDefault();
        choose(results[active]!);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  const optionId = (i: number) => `${uid}-opt-${i}`;

  return (
    <div className={`picker side-${side}`}>
      <label className="field-label" htmlFor={`${uid}-input`}>
        <span className={`side-chip side-chip-${side}`}>{side.toUpperCase()}</span> {label}
      </label>
      <div className="chips" role="group" aria-label={`${label} region filter`}>
        {(["All", ...regions] as (Region | "All")[]).map((r) => (
          <button
            key={r}
            type="button"
            className="chip"
            aria-pressed={region === r}
            onClick={() => {
              setRegion(r);
              setActive(0);
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="combo">
        <span className="combo-lead">{selected && !open ? <TeamLogo name={selected.name} src={selected.logo} size={24} /> : <SearchIcon />}</span>
        <input
          ref={inputRef}
          id={`${uid}-input`}
          className="input combo-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={selected ? selected.name : "Search teams"}
          value={open ? query : (selected?.name ?? "")}
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onBlur={() => {
            setOpen(false);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKey}
        />
        {open ? (
          <ul id={listId} role="listbox" aria-label={`${label} results`} className="listbox">
            {results.length === 0 ? (
              <li className="listbox-empty" role="presentation">
                No active teams match.
              </li>
            ) : (
              results.map((t, i) => (
                <li
                  key={t.id}
                  id={optionId(i)}
                  role="option"
                  aria-selected={t.id === value}
                  className={`option${i === active ? " is-active" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(t);
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  <TeamLogo name={t.name} src={t.logo} size={24} />
                  <span className="option-name">{t.name}</span>
                  <span className="badge">{t.region}</span>
                  <span className="badge">{t.tier === "vct" ? "VCT" : "Challengers"}</span>
                  <span className="num muted">{Math.round(t.rating)}</span>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
