-- Salon de discussion interne (tout le personnel is_admin, y compris annonce_manager).

create table if not exists public.staff_discussion_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint staff_discussion_body_len check (
    char_length(trim(body)) > 0 and char_length(body) <= 4000
  )
);

create index if not exists staff_discussion_messages_created_at_idx
  on public.staff_discussion_messages (created_at desc);

alter table public.staff_discussion_messages enable row level security;

drop policy if exists "staff_discussion: lecture staff" on public.staff_discussion_messages;
create policy "staff_discussion: lecture staff"
  on public.staff_discussion_messages for select
  using (
    public.jwt_user_not_suspended()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "staff_discussion: insert staff" on public.staff_discussion_messages;
create policy "staff_discussion: insert staff"
  on public.staff_discussion_messages for insert
  with check (
    public.jwt_user_not_suspended()
    and author_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

comment on table public.staff_discussion_messages is 'Messages du salon staff (portail admin).';

-- Realtime : si besoin, Dashboard → Database → Replication → activer pour cette table.
do $$
begin
  alter publication supabase_realtime add table public.staff_discussion_messages;
exception
  when duplicate_object then null;
end $$;
