-- ============================================================================
-- M3 — expenses & splits: atomic create/update RPCs
-- Run in Supabase dashboard SQL Editor after 0001-0003.
--
-- Both insert/replace an expense together with its per-member split rows in a
-- single transaction, and validate that the splits sum to the expense amount.
-- SECURITY INVOKER: the caller's RLS still applies (must be a group member).
-- `p_splits` is a JSON array: [{ "member_id": uuid, "amount": number, "share": number|null }]
-- ============================================================================

create or replace function public.create_expense(
  p_group_id uuid,
  p_description text,
  p_amount numeric,
  p_currency text,
  p_paid_by uuid,
  p_split_type text,
  p_spent_at date,
  p_notes text,
  p_splits jsonb
)
returns public.expenses
language plpgsql
security invoker
set search_path = public
as $$
declare
  e public.expenses;
  v_sum numeric;
begin
  select coalesce(sum((s->>'amount')::numeric), 0) into v_sum
  from jsonb_array_elements(p_splits) s;

  if abs(v_sum - p_amount) > 0.005 then
    raise exception 'Splits must sum to the amount (got % vs %)', v_sum, p_amount;
  end if;

  insert into public.expenses
    (group_id, description, amount, currency, paid_by, split_type, spent_at, created_by, notes)
  values
    (p_group_id, trim(p_description), p_amount,
     coalesce(nullif(trim(p_currency), ''), 'INR'), p_paid_by, p_split_type,
     coalesce(p_spent_at, current_date), auth.uid(), nullif(trim(p_notes), ''))
  returning * into e;

  insert into public.expense_splits (expense_id, member_id, amount_owed, share)
  select e.id, (s->>'member_id')::uuid, (s->>'amount')::numeric, nullif(s->>'share', '')::numeric
  from jsonb_array_elements(p_splits) s;

  return e;
end;
$$;

create or replace function public.update_expense(
  p_expense_id uuid,
  p_description text,
  p_amount numeric,
  p_paid_by uuid,
  p_split_type text,
  p_spent_at date,
  p_notes text,
  p_splits jsonb
)
returns public.expenses
language plpgsql
security invoker
set search_path = public
as $$
declare
  e public.expenses;
  v_sum numeric;
begin
  select coalesce(sum((s->>'amount')::numeric), 0) into v_sum
  from jsonb_array_elements(p_splits) s;

  if abs(v_sum - p_amount) > 0.005 then
    raise exception 'Splits must sum to the amount (got % vs %)', v_sum, p_amount;
  end if;

  update public.expenses
     set description = trim(p_description),
         amount = p_amount,
         paid_by = p_paid_by,
         split_type = p_split_type,
         spent_at = coalesce(p_spent_at, current_date),
         notes = nullif(trim(p_notes), '')
   where id = p_expense_id
  returning * into e;

  if e.id is null then
    raise exception 'Expense not found or not permitted';
  end if;

  delete from public.expense_splits where expense_id = p_expense_id;

  insert into public.expense_splits (expense_id, member_id, amount_owed, share)
  select p_expense_id, (s->>'member_id')::uuid, (s->>'amount')::numeric, nullif(s->>'share', '')::numeric
  from jsonb_array_elements(p_splits) s;

  return e;
end;
$$;

grant execute on function
  public.create_expense(uuid, text, numeric, text, uuid, text, date, text, jsonb),
  public.update_expense(uuid, text, numeric, uuid, text, date, text, jsonb)
  to authenticated;
