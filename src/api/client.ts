import type {
  Bootstrap,
  ModelResponse,
  PlayerFull,
  PlayerSearchResponse,
  PredictRequest,
  PredictResponse,
  TeamFull,
} from "./types";

export const DEFAULT_API_BASE = "https://vct-predictor-api-264900299491.us-central1.run.app";
export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) || DEFAULT_API_BASE;
export const IS_MOCK: boolean = import.meta.env.VITE_MOCK === "1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface Opts {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
}

async function mockRequest<T>(path: string, opts: Opts): Promise<T> {
  const { mockHandle, MockError } = await import("../mocks/handler");
  if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  try {
    return structuredClone(mockHandle(opts.method ?? "GET", path, opts.body)) as T;
  } catch (e) {
    if (e instanceof MockError) throw new ApiError(e.status, e.code, e.message);
    throw e;
  }
}

async function once<T>(path: string, opts: Opts): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method: opts.method ?? "GET",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });
  if (!res.ok) {
    let code = "http_error";
    let message = `Request failed (${res.status})`;
    try {
      const j = (await res.json()) as { error?: { code?: string; message?: string } };
      if (j.error?.code) code = j.error.code;
      if (j.error?.message) message = j.error.message;
    } catch {
      /* body was not JSON */
    }
    throw new ApiError(res.status, code, message);
  }
  return (await res.json()) as T;
}

/** Fetch JSON with abort support. Retries once on network errors and 5xx. */
export async function request<T>(path: string, opts: Opts = {}): Promise<T> {
  if (IS_MOCK) return mockRequest<T>(path, opts);
  try {
    return await once<T>(path, opts);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    const retryable = !(e instanceof ApiError) || e.status >= 500;
    if (!retryable) throw e;
    await new Promise((r) => setTimeout(r, 400));
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      return await once<T>(path, opts);
    } catch (e2) {
      if (e2 instanceof ApiError || (e2 instanceof DOMException && e2.name === "AbortError")) throw e2;
      throw new ApiError(0, "network", "Could not reach the prediction service. Check your connection and try again.");
    }
  }
}

export function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

// ---- Bootstrap: in-memory plus sessionStorage for one hour ----
const BOOT_KEY = "vct.bootstrap.v2";
const BOOT_TTL_MS = 60 * 60 * 1000;
let bootPromise: Promise<Bootstrap> | null = null;

function readBootCache(): Bootstrap | null {
  try {
    const raw = sessionStorage.getItem(BOOT_KEY);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw) as { t: number; v: Bootstrap };
    return Date.now() - t < BOOT_TTL_MS ? v : null;
  } catch {
    return null;
  }
}

export function getBootstrap(signal?: AbortSignal): Promise<Bootstrap> {
  if (bootPromise) return bootPromise;
  const cached = IS_MOCK ? null : readBootCache();
  if (cached) {
    bootPromise = Promise.resolve(cached);
    return bootPromise;
  }
  bootPromise = request<Bootstrap>("/v1/bootstrap", { signal })
    .then((b) => {
      if (!IS_MOCK) {
        try {
          sessionStorage.setItem(BOOT_KEY, JSON.stringify({ t: Date.now(), v: b }));
        } catch {
          /* storage unavailable */
        }
      }
      return b;
    })
    .catch((e) => {
      bootPromise = null;
      throw e;
    });
  return bootPromise;
}

export function resetBootstrapCache(): void {
  bootPromise = null;
  try {
    sessionStorage.removeItem(BOOT_KEY);
  } catch {
    /* ignore */
  }
}

export const api = {
  team: (id: number, signal?: AbortSignal) => request<TeamFull>(`/v1/teams/${id}`, { signal }),
  player: (id: number, signal?: AbortSignal) => request<PlayerFull>(`/v1/players/${id}`, { signal }),
  searchPlayers: (q: string, signal?: AbortSignal) =>
    request<PlayerSearchResponse>(`/v1/players?q=${encodeURIComponent(q)}&limit=20`, { signal }),
  model: (signal?: AbortSignal) => request<ModelResponse>("/v1/model", { signal }),
  predict: (body: PredictRequest, signal?: AbortSignal) =>
    request<PredictResponse>("/v1/predict", { method: "POST", body, signal }),
};
