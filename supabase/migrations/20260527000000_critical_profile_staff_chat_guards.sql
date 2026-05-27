-- Critical guards for profile privileges, blocked accounts, staff-chat files,
-- and profile merges.

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
  old_role text;
  new_role text;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  actor_role := public.current_jwt_staff_role();

  if tg_op = 'INSERT' then
    if coalesce(new.is_admin, false)
      or new.admin_role is not null
      or coalesce(new.badge, 'bronze') <> 'bronze'
      or coalesce(new.account_status, 'en_attente') <> 'en_attente'
      or new.account_suspended_until is not null
    then
      if actor_role is distinct from 'super_admin' then
        raise exception 'Modification de champs profil privilégiés non autorisée'
          using errcode = '42501';
      end if;
    end if;
    return new;
  end if;

  if coalesce(new.is_admin, false) is distinct from coalesce(old.is_admin, false)
    or new.admin_role is distinct from old.admin_role
  then
    old_role := case
      when old.is_admin = true then coalesce(old.admin_role, 'super_admin')
      else null
    end;
    new_role := case
      when new.is_admin = true then coalesce(new.admin_role, 'super_admin')
      else null
    end;

    if coalesce(actor_role, '') not in ('super_admin', 'admin') then
      raise exception 'Modification des rôles staff non autorisée'
        using errcode = '42501';
    end if;

    if actor_role is distinct from 'super_admin'
      and (old_role = 'super_admin' or new_role = 'super_admin')
    then
      raise exception 'Seul un super admin peut modifier un rôle super admin'
        using errcode = '42501';
    end if;
  end if;

  if new.account_status is distinct from old.account_status
    or new.account_suspended_until is distinct from old.account_suspended_until
    or new.badge is distinct from old.badge
  then
    if coalesce(actor_role, '') not in ('super_admin', 'admin') then
      raise exception 'Modification de champs profil administratifs non autorisée'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_privileged_fields on public.profiles;
create trigger guard_profile_privileged_fields
  before insert or update on public.profiles
  for each row execute function public.guard_profile_privileged_fields();

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
  'True si l’utilisateur JWT n’est ni banni ni suspendu (ou non connecté). À combiner aux policies INSERT/UPDATE/DELETE.';

grant execute on function public.jwt_user_not_suspended() to authenticated, anon;

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
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

drop policy if exists "staff_chat_storage: insert staff" on storage.objects;
create policy "staff_chat_storage: insert staff"
  on storage.objects for insert
  with check (
    bucket_id = 'staff-chat'
    and auth.uid() is not null
    and public.jwt_user_not_suspended()
    and exists (
      select 1 from public.profiles p
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
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Réservé au service role' using errcode = '42501';
  end if;

  if p_actor_id is null
    or p_source_user_id is null
    or p_target_user_id is null
    or p_source_user_id = p_target_user_id
  then
    raise exception 'Paramètres de fusion invalides' using errcode = '22023';
  end if;

  if not exists (select 1 from public.profiles where id = p_target_user_id) then
    raise exception 'Profil cible introuvable' using errcode = '23503';
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
  set account_status = 'banned',
      admin_role = null,
      is_admin = false
  where id = p_source_user_id;

  if not found then
    raise exception 'Profil source introuvable' using errcode = '23503';
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
