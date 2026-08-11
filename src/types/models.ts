/**
 * Plain TypeScript shapes mirroring the Postgres schema
 * (supabase/migrations/0001_init.sql). Hand-written for the POC; can be
 * replaced later with `supabase gen types typescript`.
 */

export type SplitType = 'equal' | 'exact' | 'percent' | 'shares';
export type MemberRole = 'owner' | 'member';

export interface Profile {
  id: string; // = auth.users.id
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  currency: string;
  simplify_debts: boolean;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string | null; // null => placeholder member (not yet a registered user)
  display_name: string;
  email: string | null;
  phone: string | null;
  role: MemberRole;
  joined_at: string;
}

export interface Expense {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  currency: string;
  paid_by: string; // group_members.id
  split_type: SplitType;
  spent_at: string;
  created_by: string;
  notes: string | null;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  member_id: string; // group_members.id
  amount_owed: number;
  share: number | null; // metadata for percent/shares splits
}

export interface Settlement {
  id: string;
  group_id: string;
  from_member: string; // group_members.id (payer)
  to_member: string; // group_members.id (receiver)
  amount: number;
  settled_at: string;
  note: string | null;
  created_at: string;
}
