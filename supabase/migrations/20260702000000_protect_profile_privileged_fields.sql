-- Critical guardrails for profile-backed authorization.
-- Client sessions may update their own profile row, so privileged columns must be
-- protected by the database rather than by admin UI checks alone.

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
        coalesce(p.account_status, 'active') in ('banned', 'suspended')
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

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor record;
  actor_role text;
  actor_is_super boolean := false;
  actor_is_admin boolean := false;
  target_is_super boolean := false;
  privileged_changed boolean := false;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.is_admin, false)
      or new.admin_role is not null
      or coalesce(new.account_status, 'en_attente') <> 'en_attente'
      or new.account_suspended_until is not null
      or coalesce(new.badge, 'bronze') <> 'bronze'
    then
      raise exception 'Modification de champs de profil réservée au personnel'
        using errcode = '42501';
    end if;
    return new;
  end if;

  privileged_changed :=
    new.is_admin is distinct from old.is_admin
    or new.admin_role is distinct from old.admin_role
    or new.account_status is distinct from old.account_status
    or new.account_suspended_until is distinct from old.account_suspended_until
    or new.badge is distinct from old.badge;

  if not privileged_changed then
    return new;
  end if;

  select p.is_admin, p.admin_role
  into actor
  from public.profiles p
  where p.id = auth.uid();

  if not coalesce(actor.is_admin, false) then
    raise exception 'Modification de champs de profil réservée au personnel'
      using errcode = '42501';
  end if;

  actor_role := coalesce(actor.admin_role, 'super_admin');
  actor_is_super := actor_role = 'super_admin';
  actor_is_admin := actor_role = 'admin';
  target_is_super :=
    coalesce(old.is_admin, false)
    and coalesce(old.admin_role, 'super_admin') = 'super_admin';

  if actor_is_super then
    return new;
  end if;

  if actor_is_admin and not target_is_super then
    if new.admin_role = 'super_admin'
      or (coalesce(new.is_admin, false) and new.admin_role is null)
    then
      raise exception 'Seul un super administrateur peut accorder le rôle super_admin'
        using errcode = '42501';
    end if;
    return new;
  end if;

  raise exception 'Modification de champs de profil réservée au personnel'
    using errcode = '42501';
end;
$$;

revoke all on function public.protect_profile_privileged_fields() from public;

drop trigger if exists protect_profile_privileged_fields on public.profiles;
create trigger protect_profile_privileged_fields
  before insert or update on public.profiles
  for each row
  execute function public.protect_profile_privileged_fields();
