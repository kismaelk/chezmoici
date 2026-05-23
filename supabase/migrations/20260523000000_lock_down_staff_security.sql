-- Verrouillage des champs profil sensibles + pièces jointes staff privées.

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
        (p.account_suspended_until is not null and p.account_suspended_until > now())
        or coalesce(p.account_status, 'en_attente') in ('suspended', 'banned')
      )
  );
$$;

comment on function public.jwt_user_not_suspended() is
  'True si l’utilisateur JWT n’est ni suspendu temporairement ni suspendu/banni par statut. À combiner aux policies INSERT/UPDATE/DELETE.';

grant execute on function public.jwt_user_not_suspended() to authenticated, anon;

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not coalesce(p.is_admin, false) then null
    when p.admin_role in ('super_admin', 'admin', 'moderator', 'annonce_manager') then p.admin_role
    else 'super_admin'
  end
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

comment on function public.current_staff_role() is
  'Rôle staff du JWT courant, lu via security definer pour éviter la récursion RLS sur profiles.';

grant execute on function public.current_staff_role() to authenticated, anon;

create or replace function public.protect_profile_staff_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text := public.current_staff_role();
  role_changed boolean;
  status_changed boolean;
  old_staff_role text;
  new_staff_role text;
begin
  if auth.role() = 'service_role' or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.is_admin, false)
      or new.admin_role is not null
      or coalesce(new.account_status, 'en_attente') <> 'en_attente'
      or new.account_suspended_until is not null then
      raise exception 'Modification de champs protégés du profil interdite'
        using errcode = '42501';
    end if;
    return new;
  end if;

  role_changed :=
    new.is_admin is distinct from old.is_admin
    or new.admin_role is distinct from old.admin_role;
  status_changed :=
    new.account_status is distinct from old.account_status
    or new.account_suspended_until is distinct from old.account_suspended_until;

  if role_changed then
    old_staff_role := case
      when coalesce(old.is_admin, false) then coalesce(old.admin_role, 'super_admin')
      else null
    end;
    new_staff_role := case
      when coalesce(new.is_admin, false) then coalesce(new.admin_role, 'super_admin')
      else null
    end;

    if actor_role = 'super_admin' then
      null;
    elsif actor_role = 'admin'
      and coalesce(old_staff_role, '') <> 'super_admin'
      and coalesce(new_staff_role, '') <> 'super_admin' then
      null;
    else
      raise exception 'Modification de champs protégés du profil interdite'
        using errcode = '42501';
    end if;
  end if;

  if status_changed and coalesce(actor_role, '') not in ('super_admin', 'admin') then
    raise exception 'Modification du statut du compte interdite'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_staff_fields on public.profiles;
create trigger protect_profile_staff_fields
  before insert or update on public.profiles
  for each row execute function public.protect_profile_staff_fields();

drop policy if exists "profiles: modification par son propriétaire" on public.profiles;
create policy "profiles: modification par son propriétaire"
  on public.profiles for update
  using (auth.uid() = id and public.jwt_user_not_suspended())
  with check (auth.uid() = id and public.jwt_user_not_suspended());

drop policy if exists "profiles: mise à jour admin" on public.profiles;
create policy "profiles: mise à jour admin"
  on public.profiles for update
  using (
    public.jwt_user_not_suspended()
    and public.current_staff_role() in ('super_admin', 'admin')
  )
  with check (
    public.jwt_user_not_suspended()
    and public.current_staff_role() in ('super_admin', 'admin')
  );

insert into storage.buckets (id, name, public)
values ('staff-chat', 'staff-chat', false)
on conflict (id) do update set public = false;

drop policy if exists "staff_chat_storage: read" on storage.objects;
create policy "staff_chat_storage: read"
  on storage.objects for select
  using (
    bucket_id = 'staff-chat'
    and public.jwt_user_not_suspended()
    and public.current_staff_role() is not null
  );

drop policy if exists "staff_chat_storage: insert staff" on storage.objects;
create policy "staff_chat_storage: insert staff"
  on storage.objects for insert
  with check (
    bucket_id = 'staff-chat'
    and auth.uid() is not null
    and public.jwt_user_not_suspended()
    and public.current_staff_role() is not null
  );

drop policy if exists "staff_chat_storage: delete own" on storage.objects;
create policy "staff_chat_storage: delete own"
  on storage.objects for delete
  using (
    bucket_id = 'staff-chat'
    and owner = auth.uid()
    and public.jwt_user_not_suspended()
    and public.current_staff_role() is not null
  );
