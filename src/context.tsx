import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { errorMessage, getBootstrap, resetBootstrapCache } from "./api/client";
import type { AgentMeta, Bootstrap, MapMeta, TeamSlim } from "./api/types";
import { leagueRanks } from "./lib/league";

interface Ctx {
  boot: Bootstrap | null;
  error: string | null;
  retry: () => void;
  teamsById: Map<number, TeamSlim>;
  /** rank inside the team's own league (VCT or Challengers) */
  leagueRank: Map<number, number>;
  agentsByKey: Map<string, AgentMeta>;
  mapsByName: Map<string, MapMeta>;
}

const BootCtx = createContext<Ctx | null>(null);

export function BootstrapProvider({ children }: { children: ReactNode }) {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setError(null);
    getBootstrap().then(
      (b) => live && setBoot(b),
      (e) => live && setError(errorMessage(e)),
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  const value = useMemo<Ctx>(
    () => ({
      boot,
      error,
      retry: () => {
        resetBootstrapCache();
        setAttempt((n) => n + 1);
      },
      teamsById: new Map((boot?.teams ?? []).map((t) => [t.id, t])),
      leagueRank: leagueRanks(boot?.teams ?? []),
      agentsByKey: new Map((boot?.agents ?? []).map((a) => [a.key, a])),
      mapsByName: new Map((boot?.maps ?? []).map((m) => [m.name, m])),
    }),
    [boot, error],
  );
  return <BootCtx.Provider value={value}>{children}</BootCtx.Provider>;
}

export function useBoot(): Ctx {
  const c = useContext(BootCtx);
  if (!c) throw new Error("useBoot must be used inside BootstrapProvider");
  return c;
}
