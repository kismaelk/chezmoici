-- Correctifs critiques: pièces jointes staff privées et fusion profils atomique.

insert into storage.buckets (id, name, public)
values ('staff-chat', 'staff-chat', false)
on conflict (id) do update set public = false;

drop policy if exists "staff_chat_storage: read" on storage.objects;
drop policy if exists "staff_chat_storage: read staff" on storage.objects;
create policy "staff_chat_storage: read staff"
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

update public.staff_discussion_messages
set attachment_url = split_part(
  regexp_replace(
    attachment_url,
    '^.*?/storage/v1/object/(public|sign)/staff-chat/',
    ''
  ),
  '?',
  1
)
where attachment_url like '%/storage/v1/object/%/staff-chat/%';

create or replace function public.admin_merge_profiles(
  p_actor_id uuid,
  p_source_user_id uuid,
  p_target_user_id uuid,
  p_summary jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_actor_id is null then
    raise exception 'Acteur requis' using errcode = '22023';
  end if;

  if p_source_user_id is null
    or p_target_user_id is null
    or p_source_user_id = p_target_user_id then
    raise exception 'sourceUserId et targetUserId requis (valeurs différentes)' using errcode = '22023';
  end if;

  if p_source_user_id = p_actor_id then
    raise exception 'Impossible de fusionner votre propre compte comme source' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_actor_id
      and p.is_admin = true
      and (p.admin_role = 'super_admin' or (p.admin_role is null and p.is_admin))
  ) then
    raise exception 'Réservé au super admin' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_source_user_id) then
    raise exception 'Profil source introuvable' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_target_user_id) then
    raise exception 'Profil cible introuvable' using errcode = 'P0001';
  end if;

  update public.annonces
  set utilisateur_id = p_target_user_id
  where utilisateur_id = p_source_user_id;

  update public.demandes_badge
  set utilisateur_id = p_target_user_id
  where utilisateur_id = p_source_user_id;

  delete from public.favoris
  where utilisateur_id = p_source_user_id;

  update public.profiles
  set
    account_status = 'banned',
    admin_role = null,
    is_admin = false
  where id = p_source_user_id;

  insert into public.admin_profile_merge_logs (
    actor_id,
    source_user_id,
    target_user_id,
    dry_run,
    summary
  )
  values (
    p_actor_id,
    p_source_user_id,
    p_target_user_id,
    false,
    coalesce(p_summary, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.admin_merge_profiles(uuid, uuid, uuid, jsonb) from public;
revoke all on function public.admin_merge_profiles(uuid, uuid, uuid, jsonb) from anon;
revoke all on function public.admin_merge_profiles(uuid, uuid, uuid, jsonb) from authenticated;
grant execute on function public.admin_merge_profiles(uuid, uuid, uuid, jsonb) to service_role;
