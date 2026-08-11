import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { formatMoney } from '@/lib/format';
import type { MemberBalanceView, TransferView } from '@/lib/queries/balances';
import type { ExpenseWithPayer } from '@/lib/queries/expenses';
import type { SettlementView } from '@/lib/queries/settlements';
import { toMinor } from '@/lib/split';

function esc(v: string | null | undefined): string {
  return (v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Build a printable HTML summary of a group (balances + expenses + payments). */
export function buildGroupHtml(args: {
  groupName: string;
  currency: string;
  balances: MemberBalanceView[];
  transfers: TransferView[];
  simplified: boolean;
  expenses: ExpenseWithPayer[];
  settlements: SettlementView[];
}): string {
  const { currency } = args;
  const today = new Date().toISOString().slice(0, 10);

  const balanceRows = args.balances
    .map((b) => {
      const cls = b.balanceMinor > 0 ? 'pos' : b.balanceMinor < 0 ? 'neg' : 'muted';
      const label =
        b.balanceMinor === 0
          ? 'settled'
          : `${b.balanceMinor > 0 ? 'gets ' : 'owes '}${formatMoney(Math.abs(b.balanceMinor), currency)}`;
      return `<tr><td>${esc(b.member.display_name)}</td><td class="amt ${cls}">${label}</td></tr>`;
    })
    .join('');

  const transferRows = args.transfers
    .map(
      (t) =>
        `<tr><td>${esc(t.from.display_name)} → ${esc(t.to.display_name)}</td><td class="amt">${formatMoney(
          t.amountMinor,
          currency
        )}</td></tr>`
    )
    .join('');

  const expenseRows = args.expenses
    .map(
      (e) =>
        `<tr><td>${esc(e.spent_at)}</td><td>${esc(e.description)}</td><td>${esc(
          e.payer?.display_name
        )}</td><td class="amt">${formatMoney(toMinor(Number(e.amount)), e.currency)}</td></tr>`
    )
    .join('');

  const paymentRows = args.settlements
    .map(
      (s) =>
        `<tr><td>${esc(s.settled_at)}</td><td>${esc(s.from?.display_name)} → ${esc(
          s.to?.display_name
        )}</td><td class="amt">${formatMoney(toMinor(Number(s.amount)), currency)}</td></tr>`
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #14181f; padding: 28px; font-size: 13px; }
  h1 { font-size: 22px; margin: 0 0 2px; }
  h2 { font-size: 15px; margin: 26px 0 8px; }
  .muted { color: #667085; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #eef0f3; font-size: 12px; vertical-align: top; }
  th { color: #667085; font-weight: 600; border-bottom: 1px solid #dfe3e8; }
  td.amt, th.amt { text-align: right; white-space: nowrap; }
  .pos { color: #137a4b; font-weight: 600; }
  .neg { color: #c0392b; font-weight: 600; }
  tr { page-break-inside: avoid; }
</style></head><body>
  <h1>${esc(args.groupName)}</h1>
  <div class="muted">Expense summary · ${today} · ${esc(currency)}</div>

  <h2>Balances</h2>
  <table><tbody>${balanceRows || '<tr><td class="muted">No members.</td></tr>'}</tbody></table>

  <h2>Suggested settlements${args.simplified ? ' (simplified)' : ''}</h2>
  <table>
    <thead><tr><th>Who pays whom</th><th class="amt">Amount</th></tr></thead>
    <tbody>${transferRows || '<tr><td class="muted" colspan="2">Everyone is settled up.</td></tr>'}</tbody>
  </table>

  <h2>Expenses (${args.expenses.length})</h2>
  <table>
    <thead><tr><th>Date</th><th>Description</th><th>Paid by</th><th class="amt">Amount</th></tr></thead>
    <tbody>${expenseRows || '<tr><td class="muted" colspan="4">No expenses.</td></tr>'}</tbody>
  </table>

  <h2>Payments (${args.settlements.length})</h2>
  <table>
    <thead><tr><th>Date</th><th>From → To</th><th class="amt">Amount</th></tr></thead>
    <tbody>${paymentRows || '<tr><td class="muted" colspan="3">No payments.</td></tr>'}</tbody>
  </table>
</body></html>`;
}

/** Render the HTML summary to a PDF and share it (native) or open print/save (web). */
export async function exportGroupPdf(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    // Print.printAsync prints the whole app page on web; render only our summary
    // by writing it into a fresh window and printing that.
    const g = globalThis as any;
    const win = g.open('', '_blank');
    if (!win) throw new Error('Allow pop-ups to export the summary.');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share summary',
      UTI: 'com.adobe.pdf',
    });
  }
}
