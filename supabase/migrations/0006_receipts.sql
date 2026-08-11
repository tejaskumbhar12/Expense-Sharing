-- ============================================================================
-- M6 — receipt photos: expenses.receipt_url + a Storage bucket for uploads
-- Run in Supabase dashboard SQL Editor after 0001-0005.
--
-- If your project blocks creating policies on storage.objects via SQL, create
-- the bucket named "receipts" (public) in Dashboard -> Storage and add the
-- equivalent policies there instead.
-- ============================================================================

alter table public.expenses
  add column if not exists receipt_url text;

-- Public bucket: receipt URLs are viewable via the public CDN link we store.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

-- Uploads are gated to group members. Object path convention: "<group_id>/<file>",
-- so the first path segment identifies the group.
drop policy if exists "receipts insert by members" on storage.objects;
create policy "receipts insert by members" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and public.is_group_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "receipts delete by members" on storage.objects;
create policy "receipts delete by members" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_group_member(((storage.foldername(name))[1])::uuid)
  );

-- Read is public (bucket is public); this select policy also covers API access.
drop policy if exists "receipts read" on storage.objects;
create policy "receipts read" on storage.objects
  for select to public
  using (bucket_id = 'receipts');
