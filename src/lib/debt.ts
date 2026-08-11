/**
 * Balance computation + debt simplification.
 *
 * Works in integer MINOR units (see split.ts) so results are exact.
 *
 * Balance convention (per member):
 *   positive  => the group owes them   (they are a creditor)
 *   negative  => they owe the group     (they are a debtor)
 * Balances across a group always sum to zero.
 */

export interface MemberBalance {
  memberId: string;
  balanceMinor: number;
}

export interface Transfer {
  from: string; // debtor (pays)
  to: string; // creditor (receives)
  amountMinor: number;
}

export interface BalanceInput {
  memberIds: string[];
  expenses: { paidBy: string; amountMinor: number }[];
  splits: { memberId: string; amountOwedMinor: number }[];
  settlements: { fromMember: string; toMember: string; amountMinor: number }[];
}

/**
 * Net balance per member from expenses, their splits, and recorded settlements.
 *   balance = paid - owed + settlementsPaid - settlementsReceived
 */
export function computeBalances(input: BalanceInput): MemberBalance[] {
  const bal = new Map<string, number>();
  for (const id of input.memberIds) bal.set(id, 0);

  const add = (id: string, delta: number) => {
    bal.set(id, (bal.get(id) ?? 0) + delta);
  };

  for (const e of input.expenses) add(e.paidBy, e.amountMinor);
  for (const s of input.splits) add(s.memberId, -s.amountOwedMinor);
  for (const st of input.settlements) {
    add(st.fromMember, st.amountMinor); // paying off what they owed
    add(st.toMember, -st.amountMinor); // receiving what they were owed
  }

  return input.memberIds.map((memberId) => ({
    memberId,
    balanceMinor: bal.get(memberId) ?? 0,
  }));
}

/**
 * Greedy minimum-cash-flow simplification: repeatedly settle the largest
 * creditor against the largest debtor. Produces at most n-1 transfers — the
 * same practical approach Splitwise uses. (Exact minimization is NP-hard;
 * this is the standard heuristic and is optimal for most real cases.)
 */
export function simplifyDebts(balances: MemberBalance[]): Transfer[] {
  const creditors = balances
    .filter((b) => b.balanceMinor > 0)
    .map((b) => ({ id: b.memberId, amt: b.balanceMinor }));
  const debtors = balances
    .filter((b) => b.balanceMinor < 0)
    .map((b) => ({ id: b.memberId, amt: -b.balanceMinor })); // store owed as positive

  const transfers: Transfer[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    const ci = maxIndex(creditors);
    const di = maxIndex(debtors);
    const amount = Math.min(creditors[ci].amt, debtors[di].amt);

    transfers.push({ from: debtors[di].id, to: creditors[ci].id, amountMinor: amount });

    creditors[ci].amt -= amount;
    debtors[di].amt -= amount;
    if (creditors[ci].amt === 0) creditors.splice(ci, 1);
    if (debtors[di].amt === 0) debtors.splice(di, 1);
  }

  return transfers;
}

export interface PairwiseInput {
  expenses: { paidBy: string; splits: { memberId: string; amountOwedMinor: number }[] }[];
  settlements: { fromMember: string; toMember: string; amountMinor: number }[];
}

/**
 * Direct (unsimplified) debts: who owes whom based on the actual expenses,
 * netted per pair only — never routed through a third person. This is the
 * "Simplify debts OFF" view. Contrast with `simplifyDebts`, which nets across
 * the whole group to minimise the number of transfers.
 */
export function pairwiseDebts(input: PairwiseInput): Transfer[] {
  const owe = new Map<string, number>(); // key `${from}|${to}` => amount `from` owes `to`
  const add = (from: string, to: string, amt: number) => {
    if (from === to || amt === 0) return;
    const k = `${from}|${to}`;
    owe.set(k, (owe.get(k) ?? 0) + amt);
  };

  for (const e of input.expenses) {
    for (const s of e.splits) add(s.memberId, e.paidBy, s.amountOwedMinor);
  }
  // Paying someone reduces what you owe them (or makes them owe you).
  for (const st of input.settlements) add(st.fromMember, st.toMember, -st.amountMinor);

  const transfers: Transfer[] = [];
  const seen = new Set<string>();
  for (const key of owe.keys()) {
    const [a, b] = key.split('|');
    const pairId = [a, b].sort().join('|');
    if (seen.has(pairId)) continue;
    seen.add(pairId);
    const net = (owe.get(`${a}|${b}`) ?? 0) - (owe.get(`${b}|${a}`) ?? 0);
    if (net > 0) transfers.push({ from: a, to: b, amountMinor: net });
    else if (net < 0) transfers.push({ from: b, to: a, amountMinor: -net });
  }
  return transfers;
}

function maxIndex(arr: { amt: number }[]): number {
  let idx = 0;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].amt > arr[idx].amt) idx = i;
  }
  return idx;
}
