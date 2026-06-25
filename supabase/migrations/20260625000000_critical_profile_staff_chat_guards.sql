-- Critical guards for profile privilege fields, blocked accounts, and private staff chat files.

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

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_is_admin boolean := false;
  caller_role text := null;
  caller_status text := null;
  caller_suspended_until timestamptz := null;
  admin_fields_changed boolean := false;
  status_fields_changed boolean := false;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.is_admin, false)
      or new.admin_role is not null
      or coalesce(new.account_status, 'en_attente') <> 'en_attente'
      or new.account_suspended_until is not null
    then
      raise exception 'Cannot set privileged profile fields on insert' using errcode = '42501';
    end if;
    return new;
  end if;

  admin_fields_changed :=
    new.is_admin is distinct from old.is_admin
    or new.admin_role is distinct from old.admin_role;
  status_fields_changed :=
    new.account_status is distinct from old.account_status
    or new.account_suspended_until is distinct from old.account_suspended_until;

  if not admin_fields_changed and not status_fields_changed then
    return new;
  end if;

  if caller_id is null or caller_id = old.id then
    raise exception 'Cannot change privileged profile fields' using errcode = '42501';
  end if;

  select p.is_admin, coalesce(p.admin_role, 'super_admin'), p.account_status, p.account_suspended_until
    into caller_is_admin, caller_role, caller_status, caller_suspended_until
  from public.profiles p
  where p.id = caller_id;

  if not coalesce(caller_is_admin, false)
    or caller_status in ('banned', 'suspended')
    or (
      caller_suspended_until is not null
      and caller_suspended_until > now()
    )
  then
    raise exception 'Only active staff can change privileged profile fields' using errcode = '42501';
  end if;

  if admin_fields_changed and caller_role <> 'super_admin' then
    raise exception 'Only super admin can change staff privileges' using errcode = '42501';
  end if;

  if status_fields_changed and caller_role not in ('super_admin', 'admin') then
    raise exception 'Only admin can change account status' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged_fields on public.profiles;
create trigger profiles_protect_privileged_fields
  before insert or update of is_admin, admin_role, account_status, account_suspended_until
  on public.profiles
  for each row
  execute function public.protect_profile_privileged_fields();

insert into storage.buckets (id, name, public)
values ('staff-chat', 'staff-chat', false)
on conflict (id) do update set public = false;

update public.staff_discussion_messages
set attachment_url = coalesce(
  substring(attachment_url from '/storage/v1/object/public/staff-chat/([^?]+)'),
  substring(attachment_url from '/storage/v1/object/sign/staff-chat/([^?]+)')
)
where attachment_url like '%/storage/v1/object/public/staff-chat/%'
   or attachment_url like '%/storage/v1/object/sign/staff-chat/%';

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
    and (storage.foldername(name))[1] = auth.uid()::text
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
