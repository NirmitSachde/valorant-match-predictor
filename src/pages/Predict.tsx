import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, errorMessage, isAbort } from "../api/client";
import type { PlayerSlim, PredictRequest, PredictResponse, Side, TeamFull } from "../api/types";
import { AgentPicks, AgentSection } from "../components/AgentPicks";
import { Compare, scenarioLabel, type Scenario } from "../components/Compare";
import { CheckIcon, CopyIcon, SwapIcon } from "../components/Icons";
import { LensesPanel } from "../components/LensesPanel";
import { MatchSetup } from "../components/MatchSetup";
import { ResultCard } from "../components/ResultCard";
import { RosterEditor, type PlayerInfo } from "../components/RosterEditor";
import { TeamCombobox } from "../components/TeamCombobox";
import { useBoot } from "../context";
import { useTitle } from "../lib/hooks";
import { effectiveWeights } from "../lib/lenses";
import { EMPTY_AGENTS, parseState, serializeState, type PredictState, type RosterId } from "../lib/urlState";
import { FACTOR_KEYS } from "../api/types";

export function buildRequest(s: PredictState): PredictRequest | null {
  if (s.a == null || s.b == null || s.a === s.b) return null;
  const req: PredictRequest = { team_a: s.a, team_b: s.b, best_of: s.bestOf };
  if (s.rosterA) req.roster_a = s.rosterA;
  if (s.rosterB) req.roster_b = s.rosterB;
  if (s.map) {
    req.map = s.map;
    if (s.pickedBy) req.picked_by = s.pickedBy;
  }
  if (s.agentsA.some(Boolean)) req.agents_a = s.agentsA;
  if (s.agentsB.some(Boolean)) req.agents_b = s.agentsB;
  const eff = effectiveWeights(s.weights, s.enabled);
  if (FACTOR_KEYS.some((k) => eff[k] > 0)) req.weights = eff;
  return req;
}

/** Everything in the request except the lens weights, which are applied live in the browser. */
function inputSignature(s: PredictState): string {
  const r = buildRequest(s);
  if (!r) return "";
  const { weights: _w, ...rest } = r;
  void _w;
  return JSON.stringify(rest);
}

/** Five display names for the agent picker; empty slots of an incomplete lineup get a placeholder. */
function names(team: TeamFull | undefined, roster: RosterId[], players: PlayerInfo, fallback: string[]): string[] {
  return Array.from({ length: 5 }, (_, i) => {
    const id = roster[i];
    if (id === undefined) return `Empty slot ${i + 1}`;
    if (typeof id !== "number") return id.slice(5);
    return players.get(id)?.name ?? team?.players.find((p) => p.id === id)?.name ?? fallback[i] ?? `Player ${id}`;
  });
}

export default function Predict() {
  useTitle("");
  const { boot, teamsById } = useBoot();
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState<PredictState>(() => parseState(params));
  const [teamFull, setTeamFull] = useState<Record<Side, TeamFull | undefined>>({ a: undefined, b: undefined });
  const [players, setPlayers] = useState<PlayerInfo>(() => new Map());
  const [result, setResult] = useState<{ res: PredictResponse; sig: string } | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinned, setPinned] = useState<Scenario | null>(null);
  const [copied, setCopied] = useState(false);
  const runCtl = useRef<AbortController | null>(null);
  const autoRan = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const patch = useCallback((p: Partial<PredictState>) => setState((s) => ({ ...s, ...p })), []);

  // Keep the URL in sync with the state (replace, so Back does not step through every click).
  useEffect(() => {
    const next = serializeState(state);
    if (next !== params.toString()) setParams(new URLSearchParams(next), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const learn = useCallback((list: PlayerSlim[]) => {
    setPlayers((prev) => {
      const next = new Map(prev);
      for (const p of list) next.set(p.id, { ...next.get(p.id), ...p });
      return next;
    });
  }, []);

  // Load the full team (with player details) whenever a side changes.
  useEffect(() => {
    for (const side of ["a", "b"] as const) {
      const id = state[side];
      if (id == null) {
        setTeamFull((t) => (t[side] ? { ...t, [side]: undefined } : t));
        continue;
      }
      if (teamFull[side]?.id === id) continue;
      const ctl = new AbortController();
      api.team(id, ctl.signal).then(
        (t) => {
          setTeamFull((cur) => ({ ...cur, [side]: t }));
          learn(t.players);
        },
        (e) => {
          if (!isAbort(e)) setError(errorMessage(e));
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.a, state.b]);

  // Roster ids that came from a shared link and are not yet known: fetch them.
  useEffect(() => {
    const ids = [...(state.rosterA ?? []), ...(state.rosterB ?? [])].filter((x): x is number => typeof x === "number" && !players.has(x));
    if (ids.length === 0) return;
    const ctl = new AbortController();
    Promise.all(ids.map((id) => api.player(id, ctl.signal).catch(() => null))).then((list) => {
      learn(list.filter((p): p is NonNullable<typeof p> => p != null).map((p) => ({ ...p, team_name: p.team?.name ?? null })));
    });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.rosterA, state.rosterB]);

  const teamA = state.a != null ? teamsById.get(state.a) : undefined;
  const teamB = state.b != null ? teamsById.get(state.b) : undefined;
  const rosterA: RosterId[] = state.rosterA ?? teamA?.roster ?? [];
  const rosterB: RosterId[] = state.rosterB ?? teamB?.roster ?? [];
  const sig = inputSignature(state);
  const req = buildRequest(state);
  const canRun = !!req && !!teamA && !!teamB;

  const run = useCallback(async () => {
    const r = buildRequest(state);
    if (!r) return;
    runCtl.current?.abort();
    const ctl = new AbortController();
    runCtl.current = ctl;
    setRunning(true);
    setError(null);
    try {
      const res = await api.predict(r, ctl.signal);
      if (ctl.signal.aborted) return;
      setResult({ res, sig: inputSignature(state) });
      if (window.innerWidth < 1000) resultRef.current?.scrollIntoView?.({ block: "start" });
    } catch (e) {
      if (!isAbort(e)) setError(errorMessage(e));
    } finally {
      if (runCtl.current === ctl) setRunning(false);
    }
  }, [state]);

  // A shared link with both teams chosen shows its result straight away.
  useEffect(() => {
    if (boot && !autoRan.current && state.a != null && state.b != null && state.a !== state.b && teamsById.has(state.a) && teamsById.has(state.b)) {
      autoRan.current = true;
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boot]);

  useEffect(() => () => runCtl.current?.abort(), []);

  if (!boot) {
    return (
      <div className="page">
        <h1>Predict a match</h1>
        <p className="muted" role="status">
          Loading teams...
        </p>
      </div>
    );
  }

  const setTeam = (side: Side, id: number) => {
    if (side === "a") patch({ a: id, rosterA: null, agentsA: [...EMPTY_AGENTS] });
    else patch({ b: id, rosterB: null, agentsB: [...EMPTY_AGENTS] });
  };

  const swap = () =>
    setState((s) => ({
      ...s,
      a: s.b,
      b: s.a,
      rosterA: s.rosterB,
      rosterB: s.rosterA,
      agentsA: s.agentsB,
      agentsB: s.agentsA,
      pickedBy: s.pickedBy === "a" ? "b" : s.pickedBy === "b" ? "a" : null,
    }));

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?${serializeState(state)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  const pool = boot.map_pool.map((n) => boot.maps.find((m) => m.name === n)).filter((m): m is NonNullable<typeof m> => !!m);
  const stale = !!result && result.sig !== sig;
  const current: Scenario | null = result ? { label: scenarioLabel(result.res), res: result.res, weights: state.weights, enabled: state.enabled } : null;
  const agentCount = state.agentsA.filter(Boolean).length + state.agentsB.filter(Boolean).length;
  const namesA = names(teamFull.a, rosterA, players, teamA?.roster_names ?? []);
  const namesB = names(teamFull.b, rosterB, players, teamB?.roster_names ?? []);

  return (
    <div className="page">
      <h1>Predict a match</h1>
      <p className="lede">
        Pick two teams, adjust rosters and the map if you like, then see the model's win chance next to a blend you control.
      </p>
      <div className="predict-grid">
        <div className="col">
          <section className="card" aria-labelledby="teams-h">
            <h2 id="teams-h">Teams</h2>
            <div className="pickers">
              <TeamCombobox side="a" label="Team A" teams={boot.teams} regions={boot.regions} value={state.a} excludeId={state.b} onChange={(id) => setTeam("a", id)} />
              <button type="button" className="icon-btn swap" onClick={swap} aria-label="Swap sides" disabled={state.a == null && state.b == null}>
                <SwapIcon />
              </button>
              <TeamCombobox side="b" label="Team B" teams={boot.teams} regions={boot.regions} value={state.b} excludeId={state.a} onChange={(id) => setTeam("b", id)} />
            </div>
            {teamA ? (
              <RosterEditor
                side="a"
                team={teamA}
                roster={rosterA}
                players={players}
                onChange={(r) => patch({ rosterA: r as RosterId[] | null })}
                onLearn={learn}
                check={result && !stale ? result.res.roster_check.a : null}
              />
            ) : null}
            {teamB ? (
              <RosterEditor
                side="b"
                team={teamB}
                roster={rosterB}
                players={players}
                onChange={(r) => patch({ rosterB: r as RosterId[] | null })}
                onLearn={learn}
                check={result && !stale ? result.res.roster_check.b : null}
              />
            ) : null}
            {teamA || teamB ? (
              <p className="hint">
                VCT 2027 rules in short: a team keeps earned progress if at least 3 of 5 players are retained, and most regions want at least 3
                of 5 players living in the team's region (two import slots). Exact definitions differ by region. This check is informational
                and does not change the prediction rules.
              </p>
            ) : null}
          </section>

          <MatchSetup
            bestOf={state.bestOf}
            map={state.map}
            pickedBy={state.pickedBy}
            pool={pool}
            nameA={teamA?.name ?? "Team A"}
            nameB={teamB?.name ?? "Team B"}
            onBestOf={(bestOf) => patch({ bestOf })}
            onMap={(map) => patch({ map })}
            onPickedBy={(pickedBy) => patch({ pickedBy })}
          />

          {teamA && teamB ? (
            <AgentSection count={agentCount}>
              <AgentPicks side="a" teamName={teamA.name} playerNames={namesA} agents={boot.agents} value={state.agentsA} onChange={(v) => patch({ agentsA: v })} />
              <AgentPicks side="b" teamName={teamB.name} playerNames={namesB} agents={boot.agents} value={state.agentsB} onChange={(v) => patch({ agentsB: v })} />
            </AgentSection>
          ) : null}

          <div className="actions">
            <button type="button" className="btn primary" onClick={() => void run()} disabled={!canRun || running}>
              {running ? "Predicting..." : "Predict"}
            </button>
            <button type="button" className="btn" onClick={() => void copyLink()} disabled={state.a == null && state.b == null}>
              {copied ? <CheckIcon /> : <CopyIcon />} {copied ? "Link copied" : "Copy link"}
            </button>
            {!canRun ? <span className="hint">{state.a != null && state.a === state.b ? "Pick two different teams." : "Pick two teams to begin."}</span> : null}
          </div>
        </div>

        <div className="col" ref={resultRef}>
          {error ? (
            <div className="notice bad" role="alert">
              {error}
            </div>
          ) : null}
          {result ? (
            <ResultCard
              res={result.res}
              weights={state.weights}
              enabled={state.enabled}
              stale={stale}
              pinned={!!pinned && pinned.res === result.res}
              onPin={() => current && setPinned(current)}
            />
          ) : (
            <section className="card empty">
              <h2>Result</h2>
              <p className="muted">Pick two teams and press Predict. You will see the model number and your blend side by side.</p>
            </section>
          )}
          {pinned && current && pinned.res !== current.res ? <Compare a={pinned} b={current} onClear={() => setPinned(null)} /> : null}
          <LensesPanel
            weights={state.weights}
            enabled={state.enabled}
            factors={result?.res.factors ?? null}
            modelProb={result?.res.model.map_prob ?? null}
            nameA={result?.res.team_a.name ?? "Team A"}
            onChange={(weights, enabled) => patch({ weights, enabled })}
          />
        </div>
      </div>
    </div>
  );
}
