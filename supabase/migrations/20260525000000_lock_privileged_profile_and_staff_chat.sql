-- Guard privileged profile fields and keep internal chat attachments private.

create or replace function public.protect_profile_privileged_fields()
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
  -- Service-role server jobs still need to run administrative maintenance.
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
      or new.account_status is distinct from old.account_status
      or new.account_suspended_until is distinct from old.account_suspended_until
      or new.badge is distinct from old.badge;
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

  select case
      when p.is_admin = true and (p.admin_role = 'super_admin' or p.admin_role is null) then 'super_admin'
      when p.is_admin = true and p.admin_role = 'admin' then 'admin'
      else null
    end
    into actor_role
  from public.profiles p
  where p.id = auth.uid()
    and public.jwt_user_not_suspended();

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

drop trigger if exists protect_profile_privileged_fields on public.profiles;
create trigger protect_profile_privileged_fields
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileged_fields();

revoke all on function public.protect_profile_privileged_fields() from public;

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
