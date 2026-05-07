-- Logs de modération avis + visibilité contrôlée des avis masqués.

create table if not exists public.avis_moderation_logs (
  id            uuid default gen_random_uuid() primary key,
  avis_id        uuid references public.avis(id) on delete cascade,
  annonce_id     uuid references public.annonces(id) on delete cascade,
  owner_id       uuid references public.profiles(id) on delete set null,
  moderator_id   uuid references public.profiles(id) on delete set null,
  action         text not null,
  reason         text,
  created_at     timestamptz default now()
);

alter table public.avis_moderation_logs enable row level security;

drop policy if exists "avis: lecture publique" on public.avis;
drop policy if exists "avis: lecture contrôlée" on public.avis;
create policy "avis: lecture contrôlée"
  on public.avis for select
  using (
    is_hidden = false
    or auth.uid() = auteur_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
    or exists (
      select 1 from public.annonces a
      where a.id = avis.annonce_id
        and a.utilisateur_id = auth.uid()
    )
  );

drop policy if exists "avis logs: lecture admin" on public.avis_moderation_logs;
create policy "avis logs: lecture admin"
  on public.avis_moderation_logs for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "avis logs: insert admin" on public.avis_moderation_logs;
create policy "avis logs: insert admin"
  on public.avis_moderation_logs for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "avis logs: lecture propriétaire" on public.avis_moderation_logs;
create policy "avis logs: lecture propriétaire"
  on public.avis_moderation_logs for select
  using (auth.uid() = owner_id);
