-- Correctifs sécurité staff : comptes bannis/suspendus et pièces jointes privées.

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
        p.account_status in ('suspended', 'banned')
        or (
          p.account_suspended_until is not null
          and p.account_suspended_until > now()
        )
      )
  );
$$;

comment on function public.jwt_user_not_suspended() is
  'True si l’utilisateur JWT n’est ni suspendu ni banni (ou non connecté). À combiner aux policies INSERT/UPDATE/DELETE.';

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
    and public.jwt_user_not_suspended()
    and auth.uid() is not null
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
    and public.jwt_user_not_suspended()
    and owner = auth.uid()
  );
