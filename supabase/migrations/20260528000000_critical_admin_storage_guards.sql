-- Correctifs critiques : stockage chat staff prive + fusion profils atomique.

-- Les pieces jointes du chat equipe ne doivent jamais etre servies en lecture publique.
update storage.buckets
set public = false
where id = 'staff-chat';

drop policy if exists "staff_chat_storage: read" on storage.objects;
create policy "staff_chat_storage: read"
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
        and coalesce(p.account_status, '') not in ('banned', 'suspended')
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
        and coalesce(p.account_status, '') not in ('banned', 'suspended')
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

create or replace function public.admin_merge_profiles(
  p_actor_id uuid,
  p_source_user_id uuid,
  p_target_user_id uuid,
  p_summary jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_source_user_id is null or p_target_user_id is null or p_source_user_id = p_target_user_id then
    raise exception 'sourceUserId et targetUserId requis (valeurs differentes)';
  end if;

  if p_actor_id is null or p_actor_id = p_source_user_id then
    raise exception 'Acteur invalide pour la fusion';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_actor_id
      and p.is_admin = true
      and (p.admin_role = 'super_admin' or (p.admin_role is null and p.is_admin))
      and coalesce(p.account_status, '') not in ('banned', 'suspended')
      and (p.account_suspended_until is null or p.account_suspended_until <= now())
  ) then
    raise exception 'Reserve au super admin actif';
  end if;

  if not exists (select 1 from public.profiles where id = p_source_user_id) then
    raise exception 'Profil source introuvable';
  end if;

  if not exists (select 1 from public.profiles where id = p_target_user_id) then
    raise exception 'Profil cible introuvable';
  end if;

  insert into public.favoris (utilisateur_id, annonce_id, created_at)
  select p_target_user_id, f.annonce_id, min(f.created_at)
  from public.favoris f
  where f.utilisateur_id = p_source_user_id
    and f.annonce_id is not null
  group by f.annonce_id
  on conflict (utilisateur_id, annonce_id) do nothing;

  delete from public.favoris
  where utilisateur_id = p_source_user_id;

  update public.annonces
  set utilisateur_id = p_target_user_id
  where utilisateur_id = p_source_user_id;

  update public.demandes_badge
  set utilisateur_id = p_target_user_id
  where utilisateur_id = p_source_user_id;

  update public.profiles
  set account_status = 'banned',
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
