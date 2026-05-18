-- Chat équipe : édition, suppression douce, réactions, recherche (côté client).

alter table public.staff_discussion_messages
  add column if not exists edited_at timestamptz,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz;

create table if not exists public.staff_discussion_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.staff_discussion_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint staff_reaction_emoji_len check (char_length(emoji) between 1 and 8),
  unique (message_id, user_id, emoji)
);

create index if not exists staff_discussion_reactions_message_idx
  on public.staff_discussion_reactions (message_id);

alter table public.staff_discussion_reactions enable row level security;

drop policy if exists "staff_discussion: update own recent" on public.staff_discussion_messages;
create policy "staff_discussion: update own recent"
  on public.staff_discussion_messages for update
  using (
    public.jwt_user_not_suspended()
    and author_id = auth.uid()
    and not is_deleted
    and created_at > (now() - interval '30 minutes')
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    author_id = auth.uid()
    and not is_deleted
  );

drop policy if exists "staff_discussion: soft delete super" on public.staff_discussion_messages;
create policy "staff_discussion: soft delete super"
  on public.staff_discussion_messages for update
  using (
    public.jwt_user_not_suspended()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
        and (p.admin_role = 'super_admin' or (p.admin_role is null and p.is_admin))
    )
  );

drop policy if exists "staff_reaction: lecture staff" on public.staff_discussion_reactions;
create policy "staff_reaction: lecture staff"
  on public.staff_discussion_reactions for select
  using (
    public.jwt_user_not_suspended()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "staff_reaction: insert staff" on public.staff_discussion_reactions;
create policy "staff_reaction: insert staff"
  on public.staff_discussion_reactions for insert
  with check (
    public.jwt_user_not_suspended()
    and user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "staff_reaction: delete own" on public.staff_discussion_reactions;
create policy "staff_reaction: delete own"
  on public.staff_discussion_reactions for delete
  using (
    public.jwt_user_not_suspended()
    and user_id = auth.uid()
  );

grant select, insert, update on public.staff_discussion_messages to authenticated;
grant select, insert, delete on public.staff_discussion_reactions to authenticated;
grant all on public.staff_discussion_messages to service_role;
grant all on public.staff_discussion_reactions to service_role;

do $$
begin
  alter publication supabase_realtime add table public.staff_discussion_reactions;
exception
  when duplicate_object then null;
end $$;
