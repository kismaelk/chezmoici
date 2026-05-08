-- Le rôle annonce_manager ne doit pas modifier profils / signalements / demandes badge
-- (évite abus si is_admin = true pour l’accès annonces).

drop policy if exists "profiles: mise à jour admin" on public.profiles;
create policy "profiles: mise à jour admin"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and coalesce(p.admin_role, 'super_admin') <> 'annonce_manager'
    )
  );

drop policy if exists "demandes: lecture admin" on public.demandes_badge;
create policy "demandes: lecture admin"
  on public.demandes_badge for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and coalesce(p.admin_role, 'super_admin') <> 'annonce_manager'
    )
  );

drop policy if exists "signalements: lecture admin" on public.signalements;
create policy "signalements: lecture admin"
  on public.signalements for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and coalesce(p.admin_role, 'super_admin') <> 'annonce_manager'
    )
  );

drop policy if exists "avis: moderation admin" on public.avis;
create policy "avis: moderation admin"
  on public.avis for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and coalesce(p.admin_role, 'super_admin') <> 'annonce_manager'
    )
  );

drop policy if exists "avis logs: lecture admin" on public.avis_moderation_logs;
create policy "avis logs: lecture admin"
  on public.avis_moderation_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and coalesce(p.admin_role, 'super_admin') <> 'annonce_manager'
    )
  );

drop policy if exists "avis logs: insert admin" on public.avis_moderation_logs;
create policy "avis logs: insert admin"
  on public.avis_moderation_logs for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and coalesce(p.admin_role, 'super_admin') <> 'annonce_manager'
    )
  );
