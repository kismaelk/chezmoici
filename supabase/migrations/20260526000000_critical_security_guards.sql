-- Correctifs sécurité critiques : privilèges profils, avis modérés,
-- pièces jointes staff privées, comptes bannis et fusion atomique.

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
      and (
        p.account_status in ('banned', 'suspended')
        or (
          p.account_suspended_until is not null
          and p.account_suspended_until > now()
        )
      )
  );
$$;

comment on function public.jwt_user_not_suspended() is
  'True si l’utilisateur JWT n’est ni banni ni suspendu. À combiner aux policies INSERT/UPDATE/DELETE.';

grant execute on function public.jwt_user_not_suspended() to authenticated, anon;

create or replace function public.jwt_can_manage_privileged_fields()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'service_role'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and coalesce(p.admin_role, 'super_admin') <> 'annonce_manager'
        and public.jwt_user_not_suspended()
    );
$$;

revoke all on function public.jwt_can_manage_privileged_fields() from public;
grant execute on function public.jwt_can_manage_privileged_fields() to authenticated, anon, service_role;

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.jwt_can_manage_privileged_fields() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.is_admin, false) <> false
      or new.admin_role is not null
      or coalesce(new.account_status, 'en_attente') <> 'en_attente'
      or new.account_suspended_until is not null
      or coalesce(new.badge, 'bronze') <> 'bronze'
    then
      raise exception 'Modification de champs profil privilégiés interdite';
    end if;
    return new;
  end if;

  if new.is_admin is distinct from old.is_admin
    or new.admin_role is distinct from old.admin_role
    or new.account_status is distinct from old.account_status
    or new.account_suspended_until is distinct from old.account_suspended_until
    or new.badge is distinct from old.badge
  then
    raise exception 'Modification de champs profil privilégiés interdite';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_fields on public.profiles;
create trigger protect_profile_privileged_fields
  before insert or update on public.profiles
  for each row
  execute function public.protect_profile_privileged_fields();

create or replace function public.protect_review_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.jwt_can_manage_privileged_fields() then
    return new;
  end if;

  if new.is_hidden is distinct from old.is_hidden
    or new.hidden_at is distinct from old.hidden_at
    or new.hidden_by is distinct from old.hidden_by
    or new.hidden_reason is distinct from old.hidden_reason
  then
    raise exception 'Modification de champs de modération avis interdite';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_review_moderation_fields on public.avis;
create trigger protect_review_moderation_fields
  before update on public.avis
  for each row
  execute function public.protect_review_moderation_fields();

update storage.buckets
set public = false
where id = 'staff-chat';

drop policy if exists "staff_chat_storage: read" on storage.objects;
create policy "staff_chat_storage: read"
  on storage.objects for select
  using (
    bucket_id = 'staff-chat'
    and public.jwt_user_not_suspended()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

drop policy if exists "staff_chat_storage: insert staff" on storage.objects;
create policy "staff_chat_storage: insert staff"
  on storage.objects for insert
  with check (
    bucket_id = 'staff-chat'
    and public.jwt_user_not_suspended()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

drop policy if exists "staff_chat_storage: delete own" on storage.objects;
create policy "staff_chat_storage: delete own"
  on storage.objects for delete
  using (
    bucket_id = 'staff-chat'
    and owner = auth.uid()
    and public.jwt_user_not_suspended()
  );

create or replace function public.admin_merge_profiles(
  p_source_user_id uuid,
  p_target_user_id uuid,
  p_actor_id uuid,
  p_summary jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_source_user_id is null or p_target_user_id is null or p_actor_id is null then
    raise exception 'Paramètres de fusion manquants';
  end if;

  if p_source_user_id = p_target_user_id then
    raise exception 'Les comptes source et cible doivent être différents';
  end if;

  update public.annonces
  set utilisateur_id = p_target_user_id
  where utilisateur_id = p_source_user_id;

  update public.demandes_badge
  set utilisateur_id = p_target_user_id
  where utilisateur_id = p_source_user_id;

  delete from public.favoris
  where utilisateur_id = p_source_user_id;

  update public.profiles
  set
    account_status = 'banned',
    admin_role = null,
    is_admin = false
  where id = p_source_user_id;

  if not found then
    raise exception 'Profil source introuvable';
  end if;

  insert into public.admin_profile_merge_logs (
    actor_id,
    source_user_id,
    target_user_id,
    dry_run,
    summary
  )
  values (
    p_actor_id,
    p_source_user_id,
    p_target_user_id,
    false,
    coalesce(p_summary, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.admin_merge_profiles(uuid, uuid, uuid, jsonb) from public;
grant execute on function public.admin_merge_profiles(uuid, uuid, uuid, jsonb) to service_role;
