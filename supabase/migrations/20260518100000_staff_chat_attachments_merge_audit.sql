-- Pièces jointes chat staff + journal fusions profils

alter table public.staff_discussion_messages
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text;

create table if not exists public.admin_profile_merge_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  source_user_id uuid not null,
  target_user_id uuid not null,
  dry_run boolean not null default false,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_profile_merge_logs_created_idx
  on public.admin_profile_merge_logs (created_at desc);

alter table public.admin_profile_merge_logs enable row level security;

drop policy if exists "merge_logs: select super" on public.admin_profile_merge_logs;
create policy "merge_logs: select super"
  on public.admin_profile_merge_logs for select
  using (
    public.jwt_user_not_suspended()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
        and (p.admin_role = 'super_admin' or (p.admin_role is null and p.is_admin))
    )
  );

drop policy if exists "merge_logs: insert super" on public.admin_profile_merge_logs;
create policy "merge_logs: insert super"
  on public.admin_profile_merge_logs for insert
  with check (
    public.jwt_user_not_suspended()
    and actor_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
        and (p.admin_role = 'super_admin' or (p.admin_role is null and p.is_admin))
    )
  );

grant select, insert on public.admin_profile_merge_logs to authenticated;
grant all on public.admin_profile_merge_logs to service_role;

-- Bucket staff-chat (public read pour staff authentifié via signed URL côté app si besoin)
insert into storage.buckets (id, name, public)
values ('staff-chat', 'staff-chat', true)
on conflict (id) do nothing;

drop policy if exists "staff_chat_storage: read" on storage.objects;
create policy "staff_chat_storage: read"
  on storage.objects for select
  using (bucket_id = 'staff-chat');

drop policy if exists "staff_chat_storage: insert staff" on storage.objects;
create policy "staff_chat_storage: insert staff"
  on storage.objects for insert
  with check (
    bucket_id = 'staff-chat'
    and auth.uid() is not null
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "staff_chat_storage: delete own" on storage.objects;
create policy "staff_chat_storage: delete own"
  on storage.objects for delete
  using (
    bucket_id = 'staff-chat'
    and owner = auth.uid()
  );
