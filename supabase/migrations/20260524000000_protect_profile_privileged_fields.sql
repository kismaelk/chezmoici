-- Empêche une mise à jour directe du profil de s'octroyer des privilèges.
-- Les policies RLS autorisent le propriétaire à modifier sa ligne; ce trigger
-- verrouille les champs de statut/rôle qui doivent rester pilotés par l'équipe.

create or replace function public.jwt_staff_role_for_profile_guard()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.account_status = 'banned' then null
    when p.account_suspended_until is not null and p.account_suspended_until > now() then null
    when p.is_admin = true then coalesce(p.admin_role, 'super_admin')
    else null
  end
  from public.profiles p
  where p.id = auth.uid();
$$;

comment on function public.jwt_staff_role_for_profile_guard() is
  'Rôle staff effectif du JWT courant pour les triggers/policies de sécurité profiles.';

drop policy if exists "profiles: mise à jour admin" on public.profiles;
create policy "profiles: mise à jour admin"
  on public.profiles for update
  using (public.jwt_staff_role_for_profile_guard() in ('super_admin', 'admin'))
  with check (true);

create or replace function public.profiles_guard_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  old_role text;
  new_role text;
  role_changed boolean := false;
  status_changed boolean := false;
begin
  -- Les opérations serveur/service-role et les triggers internes restent possibles.
  if actor_id is null or auth.role() = 'service_role' then
    return new;
  end if;

  actor_role := public.jwt_staff_role_for_profile_guard();

  if tg_op = 'INSERT' then
    role_changed :=
      coalesce(new.is_admin, false) is distinct from false
      or new.admin_role is not null;
    status_changed :=
      coalesce(new.account_status, 'en_attente') is distinct from 'en_attente'
      or new.account_suspended_until is not null
      or coalesce(new.badge, 'bronze') is distinct from 'bronze';
  else
    old_role := case when old.is_admin = true then coalesce(old.admin_role, 'super_admin') end;
    new_role := case when new.is_admin = true then coalesce(new.admin_role, 'super_admin') end;
    role_changed :=
      new.is_admin is distinct from old.is_admin
      or new.admin_role is distinct from old.admin_role;
    status_changed :=
      new.account_status is distinct from old.account_status
      or new.account_suspended_until is distinct from old.account_suspended_until
      or new.badge is distinct from old.badge;
  end if;

  if role_changed then
    new_role := case when new.is_admin = true then coalesce(new.admin_role, 'super_admin') end;

    if actor_role is null or actor_role not in ('super_admin', 'admin') then
      raise exception 'Modification des rôles staff non autorisée'
        using errcode = '42501';
    end if;

    if actor_role is distinct from 'super_admin' and (old_role = 'super_admin' or new_role = 'super_admin') then
      raise exception 'Seul un super admin peut attribuer ou modifier le rôle super_admin'
        using errcode = '42501';
    end if;
  end if;

  if status_changed and (actor_role is null or actor_role not in ('super_admin', 'admin')) then
    raise exception 'Modification des champs de statut profil non autorisée'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.profiles_guard_privileged_fields() is
  'Bloque les changements directs de is_admin/admin_role/account_status/account_suspended_until/badge sans rôle staff autorisé.';

drop trigger if exists profiles_guard_privileged_fields on public.profiles;
create trigger profiles_guard_privileged_fields
  before insert or update on public.profiles
  for each row
  execute function public.profiles_guard_privileged_fields();
