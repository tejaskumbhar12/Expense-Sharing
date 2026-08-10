import { describe, expect, it } from '@jest/globals';

import {
  computeSplits,
  distributeByWeights,
  splitByPercent,
  splitByShares,
  splitEqual,
  splitExact,
  toMinor,
} from '@/lib/split';

const sum = (parts: { amountMinor: number }[]) => parts.reduce((s, p) => s + p.amountMinor, 0);

describe('splitEqual', () => {
  it('splits evenly when divisible', () => {
    const parts = splitEqual(9000, ['a', 'b', 'c']);
    expect(parts.map((p) => p.amountMinor)).toEqual([3000, 3000, 3000]);
  });

  it('spreads the remainder deterministically (no lost pennies)', () => {
    const parts = splitEqual(10000, ['a', 'b', 'c']); // 100.00 / 3
    expect(parts.map((p) => p.amountMinor)).toEqual([3334, 3333, 3333]);
    expect(sum(parts)).toBe(10000);
  });

  it('always sums to the total for awkward amounts', () => {
    for (const total of [1, 7, 9999, 10001, 12345]) {
      for (const n of [2, 3, 4, 7]) {
        const ids = Array.from({ length: n }, (_, i) => `m${i}`);
        expect(sum(splitEqual(total, ids))).toBe(total);
      }
    }
  });
});

describe('splitByPercent', () => {
  it('splits by percentage', () => {
    const parts = splitByPercent(10000, [
      { memberId: 'a', percent: 50 },
      { memberId: 'b', percent: 50 },
    ]);
    expect(parts.map((p) => p.amountMinor)).toEqual([5000, 5000]);
  });

  it('rejects percentages that do not sum to 100', () => {
    expect(() =>
      splitByPercent(10000, [
        { memberId: 'a', percent: 40 },
        { memberId: 'b', percent: 40 },
      ])
    ).toThrow();
  });

  it('keeps the total exact with rounding', () => {
    const parts = splitByPercent(10000, [
      { memberId: 'a', percent: 33.33 },
      { memberId: 'b', percent: 33.33 },
      { memberId: 'c', percent: 33.34 },
    ]);
    expect(sum(parts)).toBe(10000);
  });
});

describe('splitByShares', () => {
  it('weights by shares', () => {
    const parts = splitByShares(10000, [
      { memberId: 'a', shares: 1 },
      { memberId: 'b', shares: 1 },
      { memberId: 'c', shares: 2 },
    ]);
    expect(parts.map((p) => p.amountMinor)).toEqual([2500, 2500, 5000]);
    expect(sum(parts)).toBe(10000);
  });
});

describe('splitExact', () => {
  it('accepts amounts that sum to the total', () => {
    const parts = splitExact(10000, [
      { memberId: 'a', amountMinor: 6000 },
      { memberId: 'b', amountMinor: 4000 },
    ]);
    expect(sum(parts)).toBe(10000);
  });

  it('rejects amounts that do not sum to the total', () => {
    expect(() =>
      splitExact(10000, [
        { memberId: 'a', amountMinor: 6000 },
        { memberId: 'b', amountMinor: 3000 },
      ])
    ).toThrow();
  });
});

describe('distributeByWeights', () => {
  it('throws with no members', () => {
    expect(() => distributeByWeights(1000, [])).toThrow();
  });
});

describe('computeSplits dispatch + toMinor', () => {
  it('routes to equal', () => {
    const parts = computeSplits({ type: 'equal', totalMinor: toMinor(30), memberIds: ['a', 'b', 'c'] });
    expect(sum(parts)).toBe(3000);
  });
});
