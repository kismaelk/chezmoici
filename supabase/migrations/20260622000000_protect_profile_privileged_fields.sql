-- Empêche les mises à jour JWT directes de contourner la matrice staff.
-- Les champs de rôle/statut restent modifiables via service_role et par les rôles staff autorisés.

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
  'True si l’utilisateur JWT n’est ni suspendu ni banni (ou non connecté). À combiner aux policies INSERT/UPDATE/DELETE.';

grant execute on function public.jwt_user_not_suspended() to authenticated, anon;

create or replace function public.guard_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_is_admin boolean := false;
  actor_role text := null;
  target_old_role text := null;
  service_role text := coalesce(current_setting('request.jwt.claim.role', true), auth.role());
  role_changed boolean := false;
  status_changed boolean := false;
begin
  if service_role = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.is_admin, false) = false
      and new.admin_role is null
      and coalesce(new.account_status, 'en_attente') = 'en_attente'
      and new.account_suspended_until is null then
      return new;
    end if;

    raise exception 'Modification non autorisée des champs privilégiés du profil'
      using errcode = '42501';
  end if;

  role_changed :=
    coalesce(new.is_admin, false) is distinct from coalesce(old.is_admin, false)
    or new.admin_role is distinct from old.admin_role;

  status_changed :=
    coalesce(new.account_status, 'en_attente') is distinct from coalesce(old.account_status, 'en_attente')
    or new.account_suspended_until is distinct from old.account_suspended_until;

  if not role_changed and not status_changed then
    return new;
  end if;

  if actor_id is null then
    raise exception 'Modification non autorisée des champs privilégiés du profil'
      using errcode = '42501';
  end if;

  select p.is_admin, case when p.is_admin then coalesce(p.admin_role, 'super_admin') else null end
    into actor_is_admin, actor_role
  from public.profiles p
  where p.id = actor_id;

  if not coalesce(actor_is_admin, false) then
    raise exception 'Modification non autorisée des champs privilégiés du profil'
      using errcode = '42501';
  end if;

  target_old_role := case when old.is_admin then coalesce(old.admin_role, 'super_admin') else null end;

  if role_changed then
    if actor_role = 'super_admin' then
      -- Super admin conserve la capacité complète de gestion des rôles.
      null;
    elsif actor_role = 'admin'
      and actor_id <> old.id
      and coalesce(target_old_role, '') <> 'super_admin'
      and (
        (coalesce(new.is_admin, false) = false and new.admin_role is null)
        or (new.is_admin = true and new.admin_role in ('admin', 'moderator', 'annonce_manager'))
      ) then
      null;
    else
      raise exception 'Modification non autorisée des rôles staff'
        using errcode = '42501';
    end if;
  end if;

  if status_changed then
    if actor_role = 'super_admin' then
      null;
    elsif actor_role = 'admin'
      and actor_id <> old.id
      and coalesce(target_old_role, '') <> 'super_admin' then
      null;
    else
      raise exception 'Modification non autorisée du statut du compte'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_privileged_fields on public.profiles;
create trigger guard_profile_privileged_fields
  before insert or update on public.profiles
  for each row
  execute function public.guard_profile_privileged_fields();
