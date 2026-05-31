-- Critical guardrails: privileged profile fields, staff-chat privacy, and atomic profile merge.

create or replace function public.jwt_user_not_suspended()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        coalesce(p.account_status, '') in ('banned', 'suspended')
        or (
          p.account_suspended_until is not null
          and p.account_suspended_until > now()
        )
      )
  );
$$;

comment on function public.jwt_user_not_suspended() is
  'True si l’utilisateur JWT n’est ni suspendu ni banni (ou non connecté). À combiner aux policies INSERT/UPDATE/DELETE.';

grant execute on function public.jwt_user_not_suspended() to authenticated, anon;

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.is_admin is true
      and coalesce(p.account_status, '') not in ('banned', 'suspended')
      and (
        p.account_suspended_until is null
        or p.account_suspended_until <= now()
      )
    then case
      when p.admin_role in ('super_admin', 'admin', 'moderator', 'annonce_manager') then p.admin_role
      else 'super_admin'
    end
    else null
  end
  from public.profiles p
  where p.id = auth.uid();
$$;

grant execute on function public.current_staff_role() to authenticated, anon;

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  actor_role := public.current_staff_role();

  if tg_op = 'INSERT' then
    if coalesce(new.is_admin, false) is distinct from false
      or new.admin_role is not null
      or coalesce(new.badge, 'bronze') is distinct from 'bronze'
      or coalesce(new.account_status, 'en_attente') is distinct from 'en_attente'
      or new.account_suspended_until is not null
    then
      if actor_role not in ('super_admin', 'admin') then
        raise exception 'Modification non autorisée des champs privilégiés du profil'
          using errcode = '42501';
      end if;
    end if;
    return new;
  end if;

  if new.is_admin is distinct from old.is_admin
    or new.admin_role is distinct from old.admin_role
  then
    if actor_role = 'super_admin' then
      null;
    elsif actor_role = 'admin'
      and coalesce(old.admin_role, '') <> 'super_admin'
      and coalesce(new.admin_role, '') <> 'super_admin'
    then
      null;
    else
      raise exception 'Modification non autorisée des rôles staff'
        using errcode = '42501';
    end if;
  end if;

  if new.badge is distinct from old.badge
    or new.account_status is distinct from old.account_status
    or new.account_suspended_until is distinct from old.account_suspended_until
  then
    if actor_role not in ('super_admin', 'admin') then
      raise exception 'Modification non autorisée des champs de modération du profil'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_fields on public.profiles;
create trigger protect_profile_privileged_fields
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileged_fields();

-- Existing staff-chat attachments were persisted as public URLs. Store object paths only.
update public.staff_discussion_messages
set attachment_url = regexp_replace(
  split_part(attachment_url, '?', 1),
  '^.*/storage/v1/object/public/staff-chat/',
  ''
)
where attachment_url like '%/storage/v1/object/public/staff-chat/%';

insert into storage.buckets (id, name, public)
values ('staff-chat', 'staff-chat', false)
on conflict (id) do update set public = false;

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
    and auth.uid() is not null
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
declare
  actor_role text;
begin
  if p_actor_id is null
    or p_source_user_id is null
    or p_target_user_id is null
    or p_source_user_id = p_target_user_id
  then
    raise exception 'Paramètres de fusion invalides' using errcode = '22023';
  end if;

  if p_actor_id = p_source_user_id then
    raise exception 'Impossible de fusionner votre propre compte comme source'
      using errcode = '42501';
  end if;

  select case
    when p.is_admin is true
      and coalesce(p.account_status, '') not in ('banned', 'suspended')
      and (
        p.account_suspended_until is null
        or p.account_suspended_until <= now()
      )
    then case
      when p.admin_role in ('super_admin', 'admin', 'moderator', 'annonce_manager') then p.admin_role
      else 'super_admin'
    end
    else null
  end
  into actor_role
  from public.profiles p
  where p.id = p_actor_id;

  if actor_role <> 'super_admin' then
    raise exception 'Réservé au super admin' using errcode = '42501';
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
    raise exception 'Profil source introuvable' using errcode = 'P0002';
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
