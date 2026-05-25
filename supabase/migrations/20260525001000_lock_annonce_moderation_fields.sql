-- Owners can edit their listings, but approval and trust badges are staff-only.

create or replace function public.protect_annonce_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_staff boolean := false;
begin
  if auth.role() = 'service_role'
    or current_setting('request.jwt.claim.role', true) = 'service_role' then
    return new;
  end if;

  select exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and public.jwt_user_not_suspended()
    )
    into is_staff;

  if is_staff then
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
    if new.badge is distinct from old.badge then
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

drop trigger if exists protect_annonce_moderation_fields on public.annonces;
create trigger protect_annonce_moderation_fields
  before insert or update on public.annonces
  for each row execute function public.protect_annonce_moderation_fields();

revoke all on function public.protect_annonce_moderation_fields() from public;
