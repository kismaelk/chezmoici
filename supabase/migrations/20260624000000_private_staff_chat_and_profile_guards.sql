-- Critical guards:
-- 1) keep internal staff-chat attachments private and sign them per staff session;
-- 2) prevent normal users from granting themselves staff/admin/account privileges.

insert into storage.buckets (id, name, public)
values ('staff-chat', 'staff-chat', false)
on conflict (id) do update set public = false;

update public.staff_discussion_messages
set attachment_url = split_part(
  regexp_replace(
    attachment_url,
    '^https?://[^/]+/storage/v1/object/(public|sign)/staff-chat/',
    ''
  ),
  '?',
  1
)
where attachment_url ~ '^https?://[^/]+/storage/v1/object/(public|sign)/staff-chat/';

drop policy if exists "staff_chat_storage: read" on storage.objects;
drop policy if exists "staff_chat_storage: read staff" on storage.objects;
create policy "staff_chat_storage: read staff"
  on storage.objects for select
  using (
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

create or replace function public.guard_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_can_manage_staff boolean := false;
begin
  if current_setting('role', true) = 'service_role' then
    return new;
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = actor_id
      and p.is_admin = true
      and coalesce(p.admin_role, 'super_admin') in ('super_admin', 'admin')
  )
  into actor_can_manage_staff;

  if tg_op = 'INSERT' then
    if not actor_can_manage_staff
      and (
        coalesce(new.is_admin, false) is distinct from false
        or new.admin_role is not null
        or coalesce(new.account_status, 'en_attente') is distinct from 'en_attente'
        or new.account_suspended_until is not null
      )
    then
      raise exception 'Direct changes to privileged profile fields are not allowed'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE'
    and not actor_can_manage_staff
    and (
      new.is_admin is distinct from old.is_admin
      or new.admin_role is distinct from old.admin_role
      or new.account_status is distinct from old.account_status
      or new.account_suspended_until is distinct from old.account_suspended_until
    )
  then
    raise exception 'Direct changes to privileged profile fields are not allowed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_fields on public.profiles;
create trigger protect_profile_privileged_fields
  before insert or update of is_admin, admin_role, account_status, account_suspended_until
  on public.profiles
  for each row
  execute function public.guard_profile_privileged_fields();
