-- Verrouille les pieces jointes du chat equipe: bucket prive + lecture staff uniquement.

insert into storage.buckets (id, name, public)
values ('staff-chat', 'staff-chat', false)
on conflict (id) do update
  set public = false;

-- Les anciennes lignes stockaient des URL publiques permanentes. On conserve uniquement
-- le chemin objet afin que le client genere ensuite une URL signee temporaire.
update public.staff_discussion_messages
set attachment_url = regexp_replace(
  attachment_url,
  '^https?://[^/]+/storage/v1/object/(public|sign)/staff-chat/',
  ''
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
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );
