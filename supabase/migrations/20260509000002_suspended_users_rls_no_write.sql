-- Comptes avec account_suspended_until > now() : aucune écriture via JWT (anon key),
-- même si une session locale garde un ancien token.

create or replace function public.jwt_user_not_suspended()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.account_suspended_until is not null
      and p.account_suspended_until > now()
  );
$$;

comment on function public.jwt_user_not_suspended() is
  'True si l’utilisateur JWT n’est pas suspendu (ou non connecté). À combiner aux policies INSERT/UPDATE/DELETE.';

grant execute on function public.jwt_user_not_suspended() to authenticated, anon;

-- ─── profiles ───

drop policy if exists "profiles: création par son propriétaire" on public.profiles;
create policy "profiles: création par son propriétaire"
  on public.profiles for insert
  with check (auth.uid() = id and public.jwt_user_not_suspended());

drop policy if exists "profiles: modification par son propriétaire" on public.profiles;
create policy "profiles: modification par son propriétaire"
  on public.profiles for update
  using (auth.uid() = id and public.jwt_user_not_suspended());

drop policy if exists "profiles: mise à jour admin" on public.profiles;
create policy "profiles: mise à jour admin"
  on public.profiles for update
  using (
    public.jwt_user_not_suspended()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and coalesce(p.admin_role, 'super_admin') <> 'annonce_manager'
    )
  );

-- ─── annonces ───

drop policy if exists "annonces: création par utilisateur connecté" on public.annonces;
create policy "annonces: création par utilisateur connecté"
  on public.annonces for insert
  with check (auth.uid() = utilisateur_id and public.jwt_user_not_suspended());

drop policy if exists "annonces: modification par son propriétaire" on public.annonces;
create policy "annonces: modification par son propriétaire"
  on public.annonces for update
  using (auth.uid() = utilisateur_id and public.jwt_user_not_suspended());

drop policy if exists "annonces: suppression par son propriétaire" on public.annonces;
create policy "annonces: suppression par son propriétaire"
  on public.annonces for delete
  using (auth.uid() = utilisateur_id and public.jwt_user_not_suspended());

drop policy if exists "annonces: mise à jour admin" on public.annonces;
create policy "annonces: mise à jour admin"
  on public.annonces for update
  using (
    public.jwt_user_not_suspended()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "annonces: suppression admin" on public.annonces;
create policy "annonces: suppression admin"
  on public.annonces for delete
  using (
    public.jwt_user_not_suspended()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ─── favoris ───

drop policy if exists "favoris: création par utilisateur connecté" on public.favoris;
create policy "favoris: création par utilisateur connecté"
  on public.favoris for insert
  with check (auth.uid() = utilisateur_id and public.jwt_user_not_suspended());

drop policy if exists "favoris: suppression par son propriétaire" on public.favoris;
create policy "favoris: suppression par son propriétaire"
  on public.favoris for delete
  using (auth.uid() = utilisateur_id and public.jwt_user_not_suspended());

-- ─── messages ───

drop policy if exists "messages: envoi par utilisateur connecté" on public.messages;
create policy "messages: envoi par utilisateur connecté"
  on public.messages for insert
  with check (auth.uid() = sender_id and public.jwt_user_not_suspended());

-- ─── notifications ───

drop policy if exists "notifications: création par utilisateur connecté" on public.notifications;
create policy "notifications: création par utilisateur connecté"
  on public.notifications for insert
  with check (auth.uid() is not null and public.jwt_user_not_suspended());

drop policy if exists "notifications: modification par leur destinataire" on public.notifications;
create policy "notifications: modification par leur destinataire"
  on public.notifications for update
  using (auth.uid() = utilisateur_id and public.jwt_user_not_suspended());

-- ─── avis ───

drop policy if exists "avis: création après contact qualifié" on public.avis;
create policy "avis: création après contact qualifié"
  on public.avis for insert
  with check (
    public.jwt_user_not_suspended()
    and auth.uid() = auteur_id
    and exists (
      select 1
      from public.messages m
      join public.annonces a on a.id = avis.annonce_id
      where m.annonce_id = avis.annonce_id
        and (
          (m.sender_id = avis.auteur_id and m.receiver_id = a.utilisateur_id)
          or
          (m.sender_id = a.utilisateur_id and m.receiver_id = avis.auteur_id)
        )
        and m.created_at <= now() - interval '2 hours'
    )
  );

drop policy if exists "avis: modification par auteur" on public.avis;
create policy "avis: modification par auteur"
  on public.avis for update
  using (auth.uid() = auteur_id and public.jwt_user_not_suspended());

drop policy if exists "avis: moderation admin" on public.avis;
create policy "avis: moderation admin"
  on public.avis for update
  using (
    public.jwt_user_not_suspended()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and coalesce(p.admin_role, 'super_admin') <> 'annonce_manager'
    )
  );

-- ─── avis_moderation_logs ───

drop policy if exists "avis logs: insert admin" on public.avis_moderation_logs;
create policy "avis logs: insert admin"
  on public.avis_moderation_logs for insert
  with check (
    public.jwt_user_not_suspended()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and coalesce(p.admin_role, 'super_admin') <> 'annonce_manager'
    )
  );

-- ─── messages_contact (formulaire public : anon OK si non suspendu n’applique pas) ───

drop policy if exists "contact: création publique" on public.messages_contact;
create policy "contact: création publique"
  on public.messages_contact for insert
  with check (public.jwt_user_not_suspended());

-- ─── demandes_badge ───

drop policy if exists "demandes: création par utilisateur connecté" on public.demandes_badge;
create policy "demandes: création par utilisateur connecté"
  on public.demandes_badge for insert
  with check (auth.uid() = utilisateur_id and public.jwt_user_not_suspended());

drop policy if exists "demandes: lecture admin" on public.demandes_badge;
create policy "demandes: lecture admin"
  on public.demandes_badge for all
  using (
    public.jwt_user_not_suspended()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and coalesce(p.admin_role, 'super_admin') <> 'annonce_manager'
    )
  );

-- ─── signalements ───

drop policy if exists "signalements: création par utilisateur connecté" on public.signalements;
create policy "signalements: création par utilisateur connecté"
  on public.signalements for insert
  with check (auth.uid() = signalant_uid and public.jwt_user_not_suspended());

drop policy if exists "signalements: lecture admin" on public.signalements;
create policy "signalements: lecture admin"
  on public.signalements for all
  using (
    public.jwt_user_not_suspended()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and coalesce(p.admin_role, 'super_admin') <> 'annonce_manager'
    )
  );

-- ─── site_feature_flags ───

drop policy if exists "site_feature_flags: mise à jour super" on public.site_feature_flags;
create policy "site_feature_flags: mise à jour super"
  on public.site_feature_flags for update
  using (
    public.jwt_user_not_suspended()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and (p.admin_role = 'super_admin' or p.admin_role is null)
    )
  );

drop policy if exists "site_feature_flags: insertion super" on public.site_feature_flags;
create policy "site_feature_flags: insertion super"
  on public.site_feature_flags for insert
  with check (
    public.jwt_user_not_suspended()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and (p.admin_role = 'super_admin' or p.admin_role is null)
    )
  );

-- ─── Storage (buckets avatars, annonces) ───

drop policy if exists "avatars: upload par utilisateur connecté" on storage.objects;
create policy "avatars: upload par utilisateur connecté"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and public.jwt_user_not_suspended()
  );

drop policy if exists "avatars: remplacement par utilisateur connecté" on storage.objects;
create policy "avatars: remplacement par utilisateur connecté"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and public.jwt_user_not_suspended()
  );

drop policy if exists "annonces: upload par utilisateur connecté" on storage.objects;
create policy "annonces: upload par utilisateur connecté"
  on storage.objects for insert
  with check (
    bucket_id = 'annonces'
    and auth.uid() is not null
    and public.jwt_user_not_suspended()
  );

drop policy if exists "annonces: remplacement par utilisateur connecté" on storage.objects;
create policy "annonces: remplacement par utilisateur connecté"
  on storage.objects for update
  using (
    bucket_id = 'annonces'
    and auth.uid() is not null
    and public.jwt_user_not_suspended()
  );
