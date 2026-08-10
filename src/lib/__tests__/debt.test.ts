import { describe, expect, it } from '@jest/globals';

import { computeBalances, simplifyDebts, type MemberBalance } from '@/lib/debt';

describe('computeBalances', () => {
  it('nets paid vs owed for a simple equal split', () => {
    // A pays 100.00, split equally between A and B (50.00 each).
    const balances = computeBalances({
      memberIds: ['A', 'B'],
      expenses: [{ paidBy: 'A', amountMinor: 10000 }],
      splits: [
        { memberId: 'A', amountOwedMinor: 5000 },
        { memberId: 'B', amountOwedMinor: 5000 },
      ],
      settlements: [],
    });
    expect(balances).toEqual([
      { memberId: 'A', balanceMinor: 5000 },
      { memberId: 'B', balanceMinor: -5000 },
    ]);
  });

  it('applies settlements toward zero', () => {
    const balances = computeBalances({
      memberIds: ['A', 'B'],
      expenses: [{ paidBy: 'A', amountMinor: 10000 }],
      splits: [
        { memberId: 'A', amountOwedMinor: 5000 },
        { memberId: 'B', amountOwedMinor: 5000 },
      ],
      settlements: [{ fromMember: 'B', toMember: 'A', amountMinor: 5000 }],
    });
    expect(balances).toEqual([
      { memberId: 'A', balanceMinor: 0 },
      { memberId: 'B', balanceMinor: 0 },
    ]);
  });

  it('balances always sum to zero', () => {
    const balances = computeBalances({
      memberIds: ['A', 'B', 'C'],
      expenses: [
        { paidBy: 'A', amountMinor: 6000 },
        { paidBy: 'B', amountMinor: 3000 },
      ],
      splits: [
        { memberId: 'A', amountOwedMinor: 3000 },
        { memberId: 'B', amountOwedMinor: 3000 },
        { memberId: 'C', amountOwedMinor: 3000 },
      ],
      settlements: [],
    });
    expect(balances.reduce((s, b) => s + b.balanceMinor, 0)).toBe(0);
  });
});

describe('simplifyDebts', () => {
  it('settles a two-person debt with one transfer', () => {
    const transfers = simplifyDebts([
      { memberId: 'A', balanceMinor: 5000 },
      { memberId: 'B', balanceMinor: -5000 },
    ]);
    expect(transfers).toEqual([{ from: 'B', to: 'A', amountMinor: 5000 }]);
  });

  it('matches largest creditor with largest debtor', () => {
    const transfers = simplifyDebts([
      { memberId: 'A', balanceMinor: 5000 },
      { memberId: 'B', balanceMinor: -3000 },
      { memberId: 'C', balanceMinor: -2000 },
    ]);
    // Everyone owes A; total flowing to A is 5000.
    expect(transfers.every((t) => t.to === 'A')).toBe(true);
    expect(transfers.reduce((s, t) => s + t.amountMinor, 0)).toBe(5000);
    expect(transfers.length).toBe(2);
  });

  it('produces at most n-1 transfers and clears all balances', () => {
    const balances: MemberBalance[] = [
      { memberId: 'A', balanceMinor: 4000 },
      { memberId: 'B', balanceMinor: 1000 },
      { memberId: 'C', balanceMinor: -2500 },
      { memberId: 'D', balanceMinor: -2500 },
    ];
    const transfers = simplifyDebts(balances);
    expect(transfers.length).toBeLessThanOrEqual(balances.length - 1);

    // Applying the transfers should zero everyone out.
    const net = new Map(balances.map((b) => [b.memberId, b.balanceMinor]));
    for (const t of transfers) {
      net.set(t.from, (net.get(t.from) ?? 0) + t.amountMinor);
      net.set(t.to, (net.get(t.to) ?? 0) - t.amountMinor);
    }
    for (const v of net.values()) expect(v).toBe(0);
  });

  it('returns nothing when everyone is settled', () => {
    expect(simplifyDebts([{ memberId: 'A', balanceMinor: 0 }])).toEqual([]);
  });
});
