import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText, Avatar, Divider, SegmentedControl } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/lib/format';
import {
  fromMinor,
  splitByPercent,
  splitByShares,
  splitEqual,
  toMinor,
  type SplitPart,
} from '@/lib/split';
import type { GroupMember, SplitType } from '@/types/models';

export interface SplitResult {
  splitType: SplitType;
  valid: boolean;
  error?: string;
  /** amounts in minor units */
  splits: { member_id: string; amountMinor: number; share: number | null }[];
}

interface Props {
  members: GroupMember[];
  totalMinor: number;
  currency: string;
  /** Optional initial state when editing an existing expense. */
  initial?: {
    splitType: SplitType;
    included?: string[];
    exact?: Record<string, string>;
    percent?: Record<string, string>;
    shares?: Record<string, string>;
  };
  onChange: (result: SplitResult) => void;
}

const num = (s: string | undefined) => {
  const n = parseFloat((s ?? '').trim());
  return Number.isFinite(n) ? n : 0;
};

export function SplitEditor({ members, totalMinor, currency, initial, onChange }: Props) {
  const c = useTheme();
  const [splitType, setSplitType] = useState<SplitType>(initial?.splitType ?? 'equal');
  const [included, setIncluded] = useState<Record<string, boolean>>(() => {
    if (!initial?.included) return {};
    const map: Record<string, boolean> = {};
    for (const m of members) map[m.id] = initial.included!.includes(m.id);
    return map;
  });
  const [exact, setExact] = useState<Record<string, string>>(() => initial?.exact ?? {});
  const [percent, setPercent] = useState<Record<string, string>>(() => initial?.percent ?? {});
  const [shares, setShares] = useState<Record<string, string>>(() => initial?.shares ?? {});

  const isIncluded = (id: string) => included[id] ?? true;
  const participants = members.filter((m) => isIncluded(m.id));

  const result = useMemo<SplitResult>(() => {
    const ids = participants.map((p) => p.id);
    if (ids.length === 0) {
      return { splitType, valid: false, error: 'Select at least one person.', splits: [] };
    }
    try {
      let parts: SplitPart[];
      let shareOf: (id: string) => number | null = () => null;

      if (splitType === 'equal') {
        parts = splitEqual(totalMinor, ids);
      } else if (splitType === 'exact') {
        const entered = participants.map((p) => ({ memberId: p.id, amountMinor: toMinor(num(exact[p.id])) }));
        const sum = entered.reduce((s, e) => s + e.amountMinor, 0);
        if (sum !== totalMinor) {
          return {
            splitType,
            valid: false,
            error: `Amounts add up to ${formatMoney(sum, currency)}, need ${formatMoney(totalMinor, currency)}.`,
            splits: entered.map((e) => ({ member_id: e.memberId, amountMinor: e.amountMinor, share: null })),
          };
        }
        parts = entered.map((e) => ({ memberId: e.memberId, amountMinor: e.amountMinor }));
      } else if (splitType === 'percent') {
        const pcts = participants.map((p) => ({ memberId: p.id, percent: num(percent[p.id]) }));
        const sumPct = pcts.reduce((s, p) => s + p.percent, 0);
        if (Math.abs(sumPct - 100) > 1e-6) {
          return { splitType, valid: false, error: `Percentages add up to ${sumPct}%, need 100%.`, splits: [] };
        }
        parts = splitByPercent(totalMinor, pcts);
        shareOf = (id) => num(percent[id]);
      } else {
        const shs = participants.map((p) => ({ memberId: p.id, shares: num(shares[p.id]) || 0 }));
        const totalShares = shs.reduce((s, x) => s + x.shares, 0);
        if (totalShares <= 0) {
          return { splitType, valid: false, error: 'Enter shares for at least one person.', splits: [] };
        }
        parts = splitByShares(totalMinor, shs);
        shareOf = (id) => num(shares[id]);
      }

      return {
        splitType,
        valid: true,
        splits: parts.map((p) => ({ member_id: p.memberId, amountMinor: p.amountMinor, share: shareOf(p.memberId) })),
      };
    } catch (e) {
      return { splitType, valid: false, error: (e as Error).message, splits: [] };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, totalMinor, currency, splitType, included, exact, percent, shares]);

  // Report changes upward without triggering render loops.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const sig = JSON.stringify(result);
  useEffect(() => {
    onChangeRef.current(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const perMemberAmount = (id: string): number | null => {
    const s = result.splits.find((x) => x.member_id === id);
    return s ? s.amountMinor : null;
  };

  return (
    <View style={{ gap: Spacing.three }}>
      <SegmentedControl<SplitType>
        value={splitType}
        onChange={setSplitType}
        options={[
          { value: 'equal', label: 'Equally' },
          { value: 'exact', label: 'Exact' },
          { value: 'percent', label: '%' },
          { value: 'shares', label: 'Shares' },
        ]}
      />

      <View>
        {members.map((m, i) => {
          const inc = isIncluded(m.id);
          const amt = perMemberAmount(m.id);
          return (
            <View key={m.id}>
              {i > 0 ? <Divider /> : null}
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three }}
              >
                <Pressable
                  onPress={() => setIncluded((prev) => ({ ...prev, [m.id]: !inc }))}
                  hitSlop={8}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: inc ? c.primary : c.border,
                    backgroundColor: inc ? c.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {inc ? <AppText style={{ color: c.primaryText, fontSize: 13, fontWeight: '800' }}>✓</AppText> : null}
                </Pressable>

                <Avatar name={m.display_name} size={36} />
                <View style={{ flex: 1 }}>
                  <AppText variant="body" style={{ fontWeight: '600' }}>
                    {m.display_name}
                  </AppText>
                  {inc && amt != null ? (
                    <AppText variant="caption">{formatMoney(amt, currency)}</AppText>
                  ) : null}
                </View>

                {inc && splitType !== 'equal' ? (
                  <SplitInput
                    value={
                      splitType === 'exact' ? exact[m.id] : splitType === 'percent' ? percent[m.id] : shares[m.id]
                    }
                    suffix={splitType === 'percent' ? '%' : splitType === 'shares' ? '×' : undefined}
                    onChangeText={(t) => {
                      if (splitType === 'exact') setExact((p) => ({ ...p, [m.id]: t }));
                      else if (splitType === 'percent') setPercent((p) => ({ ...p, [m.id]: t }));
                      else setShares((p) => ({ ...p, [m.id]: t }));
                    }}
                  />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="caption">
          {participants.length} {participants.length === 1 ? 'person' : 'people'} · {formatMoney(totalMinor, currency)}
        </AppText>
        {!result.valid && result.error ? (
          <AppText variant="caption" color="danger" style={{ flex: 1, textAlign: 'right' }}>
            {result.error}
          </AppText>
        ) : (
          <AppText variant="caption" color="success">
            Splits balanced
          </AppText>
        )}
      </View>
    </View>
  );
}

function SplitInput({
  value,
  onChangeText,
  suffix,
}: {
  value: string | undefined;
  onChangeText: (t: string) => void;
  suffix?: string;
}) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <TextInput
        value={value ?? ''}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={c.textSecondary}
        style={{
          minWidth: 64,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          color: c.text,
          textAlign: 'right',
        }}
      />
      {suffix ? <AppText variant="caption">{suffix}</AppText> : null}
    </View>
  );
}

/** Convert a validated SplitResult into RPC-ready splits (major units). */
export function toSplitInputs(result: SplitResult) {
  return result.splits.map((s) => ({
    member_id: s.member_id,
    amount: fromMinor(s.amountMinor),
    share: s.share,
  }));
}
