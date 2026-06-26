-- Critical guards for account state, moderation fields, and private staff files.

create or replace function public.jwt_user_not_suspended()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select auth.uid() is null or not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        coalesce(p.account_status, 'en_attente') in ('banned', 'suspended')
        or (
          p.account_suspended_until is not null
          and p.account_suspended_until > now()
        )
      )
  );
$$;

comment on function public.jwt_user_not_suspended() is
  'True si l’utilisateur JWT n’est pas banni/suspendu. À combiner aux policies INSERT/UPDATE/DELETE.';

grant execute on function public.jwt_user_not_suspended() to authenticated, anon;

create or replace function public.jwt_actor_is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and coalesce(p.account_status, 'en_attente') not in ('banned', 'suspended')
        and (
          p.account_suspended_until is null
          or p.account_suspended_until <= now()
        )
    );
$$;

comment on function public.jwt_actor_is_active_staff() is
  'True pour le service role ou un profil staff non bloqué.';

grant execute on function public.jwt_actor_is_active_staff() to authenticated, anon;

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if (
      coalesce(new.is_admin, false) <> false
      or new.admin_role is not null
      or coalesce(new.account_status, 'en_attente') <> 'en_attente'
      or new.account_suspended_until is not null
      or coalesce(new.badge, 'bronze') <> 'bronze'
    ) and not public.jwt_actor_is_active_staff() then
      raise exception 'Modification de champs profil privilégiés non autorisée'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if (
    new.is_admin is distinct from old.is_admin
    or new.admin_role is distinct from old.admin_role
    or new.account_status is distinct from old.account_status
    or new.account_suspended_until is distinct from old.account_suspended_until
    or new.badge is distinct from old.badge
  ) and not public.jwt_actor_is_active_staff() then
    raise exception 'Modification de champs profil privilégiés non autorisée'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_fields on public.profiles;
create trigger protect_profile_privileged_fields
  before insert or update on public.profiles
  for each row
  execute function public.protect_profile_privileged_fields();

create or replace function public.protect_annonce_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or public.jwt_actor_is_active_staff() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.statut, 'en_verification') = 'actif' then
      raise exception 'Publication directe sans modération non autorisée'
        using errcode = '42501';
    end if;
    if coalesce(new.badge, 'bronze') <> 'bronze' then
      raise exception 'Badge annonce non autorisé'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.utilisateur_id is distinct from old.utilisateur_id then
    raise exception 'Transfert propriétaire annonce non autorisé'
      using errcode = '42501';
  end if;

  if new.badge is distinct from old.badge then
    raise exception 'Badge annonce non autorisé'
      using errcode = '42501';
  end if;

  if old.statut is distinct from new.statut
     and new.statut = 'actif'
     and coalesce(old.statut, '') <> 'actif' then
    raise exception 'Publication directe sans modération non autorisée'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_annonce_moderation_fields on public.annonces;
create trigger protect_annonce_moderation_fields
  before insert or update on public.annonces
  for each row
  execute function public.protect_annonce_moderation_fields();

-- Convert previously stored public/signed staff-chat URLs to storage object paths.
update public.staff_discussion_messages
set attachment_url = split_part(
  regexp_replace(attachment_url, '^.*/storage/v1/object/(public|sign)/staff-chat/', ''),
  '?',
  1
)
where attachment_url ~ '/storage/v1/object/(public|sign)/staff-chat/';

insert into storage.buckets (id, name, public)
values ('staff-chat', 'staff-chat', false)
on conflict (id) do update set public = false;

drop policy if exists "staff_chat_storage: read" on storage.objects;
create policy "staff_chat_storage: read"
  on storage.objects for select
  using (
    bucket_id = 'staff-chat'
    and public.jwt_actor_is_active_staff()
  );

drop policy if exists "staff_chat_storage: insert staff" on storage.objects;
create policy "staff_chat_storage: insert staff"
  on storage.objects for insert
  with check (
    bucket_id = 'staff-chat'
    and public.jwt_actor_is_active_staff()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "staff_chat_storage: delete own" on storage.objects;
create policy "staff_chat_storage: delete own"
  on storage.objects for delete
  using (
    bucket_id = 'staff-chat'
    and owner = auth.uid()
    and public.jwt_actor_is_active_staff()
  );

drop policy if exists "avatars: upload par utilisateur connecté" on storage.objects;
create policy "avatars: upload par utilisateur connecté"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and public.jwt_user_not_suspended()
    and (
      name = auth.uid()::text
      or name like auth.uid()::text || '-%'
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists "avatars: remplacement par utilisateur connecté" on storage.objects;
create policy "avatars: remplacement par utilisateur connecté"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and public.jwt_user_not_suspended()
    and (
      name = auth.uid()::text
      or name like auth.uid()::text || '-%'
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and public.jwt_user_not_suspended()
    and (
      name = auth.uid()::text
      or name like auth.uid()::text || '-%'
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists "annonces: upload par utilisateur connecté" on storage.objects;
create policy "annonces: upload par utilisateur connecté"
  on storage.objects for insert
  with check (
    bucket_id = 'annonces'
    and auth.uid() is not null
    and public.jwt_user_not_suspended()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "annonces: remplacement par utilisateur connecté" on storage.objects;
create policy "annonces: remplacement par utilisateur connecté"
  on storage.objects for update
  using (
    bucket_id = 'annonces'
    and auth.uid() is not null
    and public.jwt_user_not_suspended()
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'annonces'
    and auth.uid() is not null
    and public.jwt_user_not_suspended()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
