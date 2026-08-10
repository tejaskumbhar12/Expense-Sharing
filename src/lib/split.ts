/**
 * Expense split calculators.
 *
 * All math is done in integer MINOR units (e.g. cents/paise) so that the parts
 * always sum EXACTLY to the total — no lost or phantom pennies from float
 * rounding. Use `toMinor` / `fromMinor` at the UI/DB boundary.
 */
import type { SplitType } from '@/types/models';

export function toMinor(amount: number, decimals = 2): number {
  return Math.round(amount * 10 ** decimals);
}

export function fromMinor(minor: number, decimals = 2): number {
  return minor / 10 ** decimals;
}

export interface SplitPart {
  memberId: string;
  amountMinor: number;
}

interface Weight {
  memberId: string;
  weight: number;
}

/**
 * Distribute `totalMinor` across weighted members using the largest-remainder
 * method. Guarantees the returned parts sum to exactly `totalMinor` and that
 * order matches the input.
 */
export function distributeByWeights(totalMinor: number, weights: Weight[]): SplitPart[] {
  const n = weights.length;
  if (n === 0) throw new Error('No members to split between');
  const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
  if (totalWeight <= 0) throw new Error('Total weight must be positive');

  const raw = weights.map((w) => (totalMinor * w.weight) / totalWeight);
  const parts: SplitPart[] = weights.map((w, i) => ({
    memberId: w.memberId,
    amountMinor: Math.floor(raw[i]),
  }));

  let remainder = totalMinor - parts.reduce((s, p) => s + p.amountMinor, 0);

  // Hand the leftover minor units to the largest fractional remainders first
  // (ties broken by original order for determinism).
  const order = weights
    .map((_, i) => ({ i, frac: raw[i] - Math.floor(raw[i]) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  for (let k = 0; k < order.length && remainder > 0; k++) {
    parts[order[k].i].amountMinor += 1;
    remainder -= 1;
  }
  return parts;
}

/** Equal split — everyone owes the same, remainder spread deterministically. */
export function splitEqual(totalMinor: number, memberIds: string[]): SplitPart[] {
  return distributeByWeights(
    totalMinor,
    memberIds.map((memberId) => ({ memberId, weight: 1 }))
  );
}

/** Split by shares (weights can be any positive numbers). */
export function splitByShares(
  totalMinor: number,
  shares: { memberId: string; shares: number }[]
): SplitPart[] {
  return distributeByWeights(
    totalMinor,
    shares.map((s) => ({ memberId: s.memberId, weight: s.shares }))
  );
}

/** Split by percentage. Percentages must sum to 100. */
export function splitByPercent(
  totalMinor: number,
  percents: { memberId: string; percent: number }[]
): SplitPart[] {
  const sum = percents.reduce((s, p) => s + p.percent, 0);
  if (Math.abs(sum - 100) > 1e-6) {
    throw new Error(`Percentages must add up to 100 (got ${sum})`);
  }
  return distributeByWeights(
    totalMinor,
    percents.map((p) => ({ memberId: p.memberId, weight: p.percent }))
  );
}

/**
 * Exact amounts entered per member. Validates they sum to the total.
 * Amounts are in minor units.
 */
export function splitExact(
  totalMinor: number,
  exact: { memberId: string; amountMinor: number }[]
): SplitPart[] {
  const sum = exact.reduce((s, e) => s + e.amountMinor, 0);
  if (sum !== totalMinor) {
    throw new Error(`Exact amounts must add up to the total (${sum} vs ${totalMinor})`);
  }
  return exact.map((e) => ({ memberId: e.memberId, amountMinor: e.amountMinor }));
}

export type SplitInput =
  | { type: 'equal'; totalMinor: number; memberIds: string[] }
  | { type: 'shares'; totalMinor: number; shares: { memberId: string; shares: number }[] }
  | { type: 'percent'; totalMinor: number; percents: { memberId: string; percent: number }[] }
  | { type: 'exact'; totalMinor: number; exact: { memberId: string; amountMinor: number }[] };

/** Dispatch to the right calculator based on split type. */
export function computeSplits(input: SplitInput): SplitPart[] {
  switch (input.type) {
    case 'equal':
      return splitEqual(input.totalMinor, input.memberIds);
    case 'shares':
      return splitByShares(input.totalMinor, input.shares);
    case 'percent':
      return splitByPercent(input.totalMinor, input.percents);
    case 'exact':
      return splitExact(input.totalMinor, input.exact);
  }
}

export const SPLIT_TYPES: { value: SplitType; label: string }[] = [
  { value: 'equal', label: 'Equally' },
  { value: 'exact', label: 'Exact amounts' },
  { value: 'percent', label: 'Percentages' },
  { value: 'shares', label: 'Shares' },
];
