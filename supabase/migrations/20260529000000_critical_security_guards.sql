-- Critical guards for profile privileges, blocked accounts, moderation fields,
-- private staff-chat attachments, and atomic profile merges.

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
  'True when the JWT user is not banned or suspended. Combine with write policies.';

grant execute on function public.jwt_user_not_suspended() to authenticated, anon;

create or replace function public.current_jwt_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.is_admin = true then coalesce(p.admin_role, 'super_admin')
    else null
  end
  from public.profiles p
  where p.id = auth.uid()
    and coalesce(p.account_status, '') not in ('banned', 'suspended')
    and (p.account_suspended_until is null or p.account_suspended_until <= now())
  limit 1;
$$;

revoke all on function public.current_jwt_staff_role() from public;
grant execute on function public.current_jwt_staff_role() to authenticated, service_role;

create or replace function public.guard_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  privileged_changed boolean := false;
  staff_fields_changed boolean := false;
  old_staff_is_super boolean := false;
  new_staff_is_super boolean := false;
begin
  if auth.role() = 'service_role'
    or current_setting('request.jwt.claim.role', true) = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    privileged_changed :=
      coalesce(new.is_admin, false) <> false
      or new.admin_role is not null
      or coalesce(new.account_status, 'en_attente') <> 'en_attente'
      or new.account_suspended_until is not null
      or coalesce(new.badge, 'bronze') <> 'bronze';
    staff_fields_changed :=
      coalesce(new.is_admin, false) <> false
      or new.admin_role is not null;
    new_staff_is_super :=
      coalesce(new.is_admin, false) = true
      and (new.admin_role = 'super_admin' or new.admin_role is null);
  else
    privileged_changed :=
      new.is_admin is distinct from old.is_admin
      or new.admin_role is distinct from old.admin_role
      or coalesce(new.account_status, 'en_attente') is distinct from coalesce(old.account_status, 'en_attente')
      or new.account_suspended_until is distinct from old.account_suspended_until
      or coalesce(new.badge, 'bronze') is distinct from coalesce(old.badge, 'bronze');
    staff_fields_changed :=
      new.is_admin is distinct from old.is_admin
      or new.admin_role is distinct from old.admin_role;
    old_staff_is_super :=
      coalesce(old.is_admin, false) = true
      and (old.admin_role = 'super_admin' or old.admin_role is null);
    new_staff_is_super :=
      coalesce(new.is_admin, false) = true
      and (new.admin_role = 'super_admin' or new.admin_role is null);
  end if;

  if not privileged_changed then
    return new;
  end if;

  actor_role := public.current_jwt_staff_role();

  if actor_role = 'super_admin' then
    return new;
  end if;

  if actor_role = 'admin' then
    if old_staff_is_super or new_staff_is_super then
      raise exception 'Only a super admin can modify super-admin profile fields'
        using errcode = '42501';
    end if;

    if staff_fields_changed then
      if coalesce(new.is_admin, false) = false and new.admin_role is not null then
        raise exception 'admin_role must be null when is_admin is false'
          using errcode = '42501';
      end if;

      if coalesce(new.is_admin, false) = true
        and coalesce(new.admin_role, '') not in ('admin', 'moderator', 'annonce_manager') then
        raise exception 'Only a super admin can assign this staff role'
          using errcode = '42501';
      end if;
    end if;

    return new;
  end if;

  raise exception 'Only authorized staff can modify privileged profile fields'
    using errcode = '42501';
end;
$$;

drop trigger if exists guard_profile_privileged_fields on public.profiles;
create trigger guard_profile_privileged_fields
  before insert or update on public.profiles
  for each row execute function public.guard_profile_privileged_fields();

revoke all on function public.guard_profile_privileged_fields() from public;

drop policy if exists "profiles: mise a jour admin" on public.profiles;
drop policy if exists "profiles: mise à jour admin" on public.profiles;
create policy "profiles: mise à jour admin"
  on public.profiles for update
  using (
    public.jwt_user_not_suspended()
    and public.current_jwt_staff_role() in ('super_admin', 'admin')
  );

create or replace function public.guard_annonce_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  if auth.role() = 'service_role'
    or current_setting('request.jwt.claim.role', true) = 'service_role' then
    return new;
  end if;

  actor_role := public.current_jwt_staff_role();
  if actor_role in ('super_admin', 'admin', 'moderator', 'annonce_manager') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.statut, 'actif') = 'actif' then
      raise exception 'Only staff can publish a listing directly'
        using errcode = '42501';
    end if;

    if coalesce(new.badge, 'bronze') <> 'bronze' then
      raise exception 'Only staff can assign listing badges'
        using errcode = '42501';
    end if;
  else
    if coalesce(new.badge, 'bronze') is distinct from coalesce(old.badge, 'bronze') then
      raise exception 'Only staff can change listing badges'
        using errcode = '42501';
    end if;

    if coalesce(new.statut, '') = 'actif'
      and coalesce(old.statut, '') <> 'actif' then
      raise exception 'Only staff can approve a listing'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_annonce_moderation_fields on public.annonces;
create trigger guard_annonce_moderation_fields
  before insert or update on public.annonces
  for each row execute function public.guard_annonce_moderation_fields();

revoke all on function public.guard_annonce_moderation_fields() from public;

create or replace function public.guard_avis_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  if auth.role() = 'service_role'
    or current_setting('request.jwt.claim.role', true) = 'service_role' then
    return new;
  end if;

  actor_role := public.current_jwt_staff_role();
  if actor_role in ('super_admin', 'admin', 'moderator') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.is_hidden, false) <> false
      or new.hidden_at is not null
      or new.hidden_by is not null
      or new.hidden_reason is not null then
      raise exception 'Only staff can set review moderation fields'
        using errcode = '42501';
    end if;
  elsif coalesce(new.is_hidden, false) is distinct from coalesce(old.is_hidden, false)
    or new.hidden_at is distinct from old.hidden_at
    or new.hidden_by is distinct from old.hidden_by
    or new.hidden_reason is distinct from old.hidden_reason then
    raise exception 'Only staff can change review moderation fields'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_avis_moderation_fields on public.avis;
create trigger guard_avis_moderation_fields
  before insert or update on public.avis
  for each row execute function public.guard_avis_moderation_fields();

revoke all on function public.guard_avis_moderation_fields() from public;

drop policy if exists "annonces: suppression admin" on public.annonces;
create policy "annonces: suppression admin"
  on public.annonces for delete
  using (
    public.jwt_user_not_suspended()
    and public.current_jwt_staff_role() in ('super_admin', 'admin')
  );

insert into storage.buckets (id, name, public)
values ('staff-chat', 'staff-chat', false)
on conflict (id) do update set public = false;

drop policy if exists "staff_chat_storage: read" on storage.objects;
create policy "staff_chat_storage: read"
  on storage.objects for select
  using (
    bucket_id = 'staff-chat'
    and auth.uid() is not null
    and public.jwt_user_not_suspended()
    and public.current_jwt_staff_role() is not null
  );

drop policy if exists "staff_chat_storage: insert staff" on storage.objects;
create policy "staff_chat_storage: insert staff"
  on storage.objects for insert
  with check (
    bucket_id = 'staff-chat'
    and auth.uid() is not null
    and public.jwt_user_not_suspended()
    and public.current_jwt_staff_role() is not null
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
  p_actor_id uuid,
  p_source_user_id uuid,
  p_target_user_id uuid,
  p_summary jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Reserved to service role' using errcode = '42501';
  end if;

  if p_actor_id is null
    or p_source_user_id is null
    or p_target_user_id is null
    or p_source_user_id = p_target_user_id then
    raise exception 'Invalid merge parameters' using errcode = '22023';
  end if;

  if p_actor_id = p_source_user_id then
    raise exception 'Actor cannot merge their own profile as source'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_actor_id
      and p.is_admin = true
      and (p.admin_role = 'super_admin' or (p.admin_role is null and p.is_admin))
      and coalesce(p.account_status, '') not in ('banned', 'suspended')
      and (p.account_suspended_until is null or p.account_suspended_until <= now())
  ) then
    raise exception 'Reserved to active super admin' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = p_source_user_id) then
    raise exception 'Source profile not found' using errcode = '23503';
  end if;

  if not exists (select 1 from public.profiles where id = p_target_user_id) then
    raise exception 'Target profile not found' using errcode = '23503';
  end if;

  insert into public.favoris (utilisateur_id, annonce_id, created_at)
  select p_target_user_id, f.annonce_id, min(f.created_at)
  from public.favoris f
  where f.utilisateur_id = p_source_user_id
    and f.annonce_id is not null
  group by f.annonce_id
  on conflict (utilisateur_id, annonce_id) do nothing;

  delete from public.favoris
  where utilisateur_id = p_source_user_id;

  update public.annonces
  set utilisateur_id = p_target_user_id
  where utilisateur_id = p_source_user_id;

  update public.demandes_badge
  set utilisateur_id = p_target_user_id
  where utilisateur_id = p_source_user_id;

  update public.profiles
  set account_status = 'banned',
      admin_role = null,
      is_admin = false
  where id = p_source_user_id;

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
revoke all on function public.admin_merge_profiles(uuid, uuid, uuid, jsonb) from anon;
revoke all on function public.admin_merge_profiles(uuid, uuid, uuid, jsonb) from authenticated;
grant execute on function public.admin_merge_profiles(uuid, uuid, uuid, jsonb) to service_role;
