/**
 * N11: a per-browser rate limit in localStorage.
 *
 * The stored value is untrusted input. It is user-writable by construction —
 * devtools are one keystroke away — so it is parsed as hostile data rather than
 * as our own serialisation.
 *
 * Every corrupt case fails OPEN, deliberately. N11 already states the counter is
 * trivially bypassed by clearing storage or opening a private window, so a
 * hostile user has a cheaper route than corrupting the value. Failing closed
 * would stop nobody and would brick an honest user whose storage was mangled by
 * an unrelated extension. The control protects against accident, and an accident
 * is best served by a counter that resets rather than one that locks.
 *
 * Storage and clock are arguments, so tests need no globals.
 */
import {
  CYCLE_LIMIT,
  CYCLE_WINDOW_MS,
  MAX_STORED_TIMESTAMPS,
  STORAGE_KEY,
  STORAGE_VERSION,
} from './contracts.js';

/** The subset of the Storage API this module uses. */
export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type Clock = () => number;

function readTimestamps(storage: StorageLike, now: number): number[] {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return []; // private mode, storage disabled, quota — never block on this
  }
  if (raw === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return []; // not JSON
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return [];

  const record = parsed as Record<string, unknown>;
  if (record['v'] !== STORAGE_VERSION) return []; // unrecognised version

  const stamps = record['ts'];
  if (!Array.isArray(stamps)) return [];

  const clean = stamps.filter(
    (entry): entry is number =>
      typeof entry === 'number' && Number.isFinite(entry) && entry <= now,
    // A timestamp in the future is dropped: clock skew and hand-editing are
    // indistinguishable, and it would otherwise pin the window open.
  );

  // A hand-written array must not grow without bound.
  return clean.length > MAX_STORED_TIMESTAMPS ? clean.slice(-MAX_STORED_TIMESTAMPS) : clean;
}

function withinWindow(timestamps: number[], now: number): number[] {
  const cutoff = now - CYCLE_WINDOW_MS;
  return timestamps.filter((entry) => entry > cutoff);
}

function write(storage: StorageLike, timestamps: number[]): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ v: STORAGE_VERSION, ts: timestamps }));
  } catch {
    // Storage failure must never block the product. The limit is advisory.
  }
}

/** How many cycles remain in the rolling window. Prunes expired entries as it reads. */
export function remainingCycles(storage: StorageLike, clock: Clock): number {
  const now = clock();
  const live = withinWindow(readTimestamps(storage, now), now);
  write(storage, live);
  return Math.max(0, CYCLE_LIMIT - live.length);
}

export function hasQuota(storage: StorageLike, clock: Clock): boolean {
  return remainingCycles(storage, clock) > 0;
}

/** Records a completed cycle. Returns the remaining count after recording. */
export function recordCycle(storage: StorageLike, clock: Clock): number {
  const now = clock();
  const live = withinWindow(readTimestamps(storage, now), now);
  const next = [...live, now];
  write(storage, next);
  return Math.max(0, CYCLE_LIMIT - next.length);
}
