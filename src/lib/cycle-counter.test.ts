import { describe, expect, it } from 'vitest';
import { hasQuota, recordCycle, remainingCycles, type StorageLike } from './cycle-counter.js';
import { CYCLE_LIMIT, CYCLE_WINDOW_MS, STORAGE_KEY, STORAGE_VERSION } from './contracts.js';

function memoryStorage(initial?: string): StorageLike & { read: () => string | null } {
  let value: string | null = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
    read: () => value,
  };
}

function throwingStorage(): StorageLike {
  return {
    getItem: () => {
      throw new Error('storage disabled');
    },
    setItem: () => {
      throw new Error('storage disabled');
    },
  };
}

const NOW = 1_800_000_000_000;
const clock = () => NOW;

function stored(timestamps: number[], version: number = STORAGE_VERSION): string {
  return JSON.stringify({ v: version, ts: timestamps });
}

describe('cycle-counter — N11', () => {
  it('starts with the full allowance on a first visit', () => {
    expect(remainingCycles(memoryStorage(), clock)).toBe(CYCLE_LIMIT);
    expect(hasQuota(memoryStorage(), clock)).toBe(true);
  });

  it('counts down as cycles are recorded, and refuses past the limit', () => {
    const storage = memoryStorage();

    for (let n = 1; n <= CYCLE_LIMIT; n += 1) {
      expect(hasQuota(storage, clock)).toBe(true);
      recordCycle(storage, clock);
    }

    expect(hasQuota(storage, clock)).toBe(false);
    expect(remainingCycles(storage, clock)).toBe(0);
  });

  it('expires entries outside the rolling window', () => {
    const old = NOW - CYCLE_WINDOW_MS - 1;
    const storage = memoryStorage(stored(Array.from({ length: CYCLE_LIMIT }, () => old)));

    expect(remainingCycles(storage, clock)).toBe(CYCLE_LIMIT);
  });

  it('keeps an entry exactly inside the window', () => {
    const justInside = NOW - CYCLE_WINDOW_MS + 1;
    const storage = memoryStorage(stored([justInside]));

    expect(remainingCycles(storage, clock)).toBe(CYCLE_LIMIT - 1);
  });

  it('writes back the pruned list, so expired entries do not accumulate', () => {
    const old = NOW - CYCLE_WINDOW_MS - 1;
    const storage = memoryStorage(stored([old, old, NOW - 1000]));

    remainingCycles(storage, clock);

    expect(storage.read()).toBe(stored([NOW - 1000]));
  });
});

describe('cycle-counter — the stored value is untrusted input', () => {
  const corrupt: Array<[string, string]> = [
    ['not valid JSON', 'definitely not json'],
    ['a JSON array rather than the object', '[1,2,3]'],
    ['a JSON primitive', '"ten"'],
    ['null', 'null'],
    ['the expected object without ts', JSON.stringify({ v: STORAGE_VERSION })],
    ['ts as a string', JSON.stringify({ v: STORAGE_VERSION, ts: 'lots' })],
    ['ts as an object', JSON.stringify({ v: STORAGE_VERSION, ts: { a: 1 } })],
    ['an unrecognised version', stored([NOW], STORAGE_VERSION + 1)],
  ];

  for (const [name, value] of corrupt) {
    it(`fails open on ${name}`, () => {
      expect(remainingCycles(memoryStorage(value), clock)).toBe(CYCLE_LIMIT);
    });
  }

  it('drops non-numeric entries and keeps the rest', () => {
    const storage = memoryStorage(
      JSON.stringify({ v: STORAGE_VERSION, ts: [NOW - 1000, 'x', null, NOW - 2000, {}] }),
    );

    expect(remainingCycles(storage, clock)).toBe(CYCLE_LIMIT - 2);
  });

  // NaN and Infinity cannot round-trip through JSON — JSON.stringify turns both
  // into null — so a stored non-finite value arrives as null and is dropped as a
  // non-number. The finiteness guard in readTimestamps covers the case where a
  // value reaches it by any other route.
  it('drops entries that serialise to null, which is how a stored NaN arrives', () => {
    const storage = memoryStorage(`{"v":${String(STORAGE_VERSION)},"ts":[null,null,${String(NOW - 5)}]}`);

    expect(remainingCycles(storage, clock)).toBe(CYCLE_LIMIT - 1);
  });

  it('drops a timestamp in the future, which would otherwise pin the window open', () => {
    const storage = memoryStorage(stored([NOW + CYCLE_WINDOW_MS * 10, NOW - 1000]));

    expect(remainingCycles(storage, clock)).toBe(CYCLE_LIMIT - 1);
  });

  it('truncates a hand-written array rather than letting it grow without bound', () => {
    const many = Array.from({ length: 5_000 }, () => NOW - 1);
    const storage = memoryStorage(stored(many));

    expect(remainingCycles(storage, clock)).toBe(0);
    const written = storage.read();
    if (written === null) throw new Error('expected a written value');
    const parsed = JSON.parse(written) as { ts: number[] };
    expect(parsed.ts.length).toBeLessThanOrEqual(1_000);
  });

  it('allows the cycle when storage throws — a storage failure never blocks the product', () => {
    expect(remainingCycles(throwingStorage(), clock)).toBe(CYCLE_LIMIT);
    expect(hasQuota(throwingStorage(), clock)).toBe(true);
    expect(() => recordCycle(throwingStorage(), clock)).not.toThrow();
  });

  it('stores under the versioned key, so a future shape change discards old data', () => {
    const storage = memoryStorage();

    let capturedKey = '';
    const spy: StorageLike = {
      getItem: storage.getItem.bind(storage),
      setItem: (key, value) => {
        capturedKey = key;
        storage.setItem(key, value);
      },
    };

    recordCycle(spy, clock);

    expect(capturedKey).toBe(STORAGE_KEY);
    expect(STORAGE_KEY).toContain('v1');
  });
});
