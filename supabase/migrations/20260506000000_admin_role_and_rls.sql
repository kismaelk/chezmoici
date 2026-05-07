-- Rôles admin : super_admin | moderator (voir lib/staffRoles.js)
-- + politiques RLS pour que le dashboard /admin fonctionne avec la clé anon (sans service role).

alter table public.profiles add column if not exists admin_role text;

alter table public.profiles drop constraint if exists profiles_admin_role_check;
alter table public.profiles add constraint profiles_admin_role_check
  check (admin_role is null or admin_role in ('super_admin', 'moderator'));

comment on column public.profiles.admin_role is
  'null = non applicable ; super_admin = accès complet ; moderator = modération annonces (UI)';

-- ─── Annonces : staff peut lire / modifier / supprimer toutes les lignes ───

drop policy if exists "annonces: lecture admin" on public.annonces;
create policy "annonces: lecture admin"
  on public.annonces for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "annonces: mise à jour admin" on public.annonces;
create policy "annonces: mise à jour admin"
  on public.annonces for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "annonces: suppression admin" on public.annonces;
create policy "annonces: suppression admin"
  on public.annonces for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ─── Profils : staff peut mettre à jour n’importe quel profil (bannir, rôles) ───

drop policy if exists "profiles: mise à jour admin" on public.profiles;
create policy "profiles: mise à jour admin"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
