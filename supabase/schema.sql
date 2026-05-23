-- ═══════════════════════════════════════════════════════════
-- CHEZMOICI — Schéma PostgreSQL Supabase
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════

-- ─── Tables ────────────────────────────────────────────────

create table if not exists profiles (
  id          uuid references auth.users on delete cascade primary key,
  email       text,
  nom         text,
  prenom      text,
  nom_famille text,
  type        text default 'particulier',
  telephone   text,
  quartier    text,
  photo_url   text,
  badge       text default 'bronze',
  is_admin    boolean default false,
  admin_role  text,
  account_status text default 'en_attente',
  created_at  timestamptz default now(),
  adresse_publique text
);

create table if not exists annonces (
  id              uuid default gen_random_uuid() primary key,
  utilisateur_id  uuid references profiles(id) on delete cascade,
  titre           text not null,
  description     text,
  type            text,
  type_propriete  text,
  type_service    text,
  prix            numeric,
  quartier        text,
  surface         numeric,
  nb_pieces       int,
  nb_chambres     int,
  meuble          boolean default false,
  disponibilite   text,
  latitude        numeric,
  longitude       numeric,
  photos                text[] default '{}',
  statut                text default 'actif',
  badge                 text default 'bronze',
  nb_vues               int default 0,
  duree_bail            text,
  equipements           text[] default '{}',
  annee_construction    int,
  titre_foncier_statut  text,
  zone_desservie        text,
  tarif_horaire         int,
  created_at            timestamptz default now()
);

create table if not exists favoris (
  id              uuid default gen_random_uuid() primary key,
  utilisateur_id  uuid references profiles(id) on delete cascade,
  annonce_id      uuid references annonces(id) on delete cascade,
  created_at      timestamptz default now(),
  unique(utilisateur_id, annonce_id)
);

create table if not exists messages (
  id           uuid default gen_random_uuid() primary key,
  sender_id    uuid references profiles(id) on delete cascade,
  receiver_id  uuid references profiles(id) on delete cascade,
  annonce_id   uuid references annonces(id) on delete set null,
  content      text not null,
  created_at   timestamptz default now()
);

create table if not exists notifications (
  id              uuid default gen_random_uuid() primary key,
  utilisateur_id  uuid references profiles(id) on delete cascade,
  type            text,
  titre           text,
  contenu         text,
  lien            text,
  lu              boolean default false,
  created_at      timestamptz default now()
);

create table if not exists avis (
  id          uuid default gen_random_uuid() primary key,
  annonce_id  uuid references annonces(id) on delete cascade,
  auteur_id   uuid references profiles(id) on delete cascade,
  note        int check (note >= 1 and note <= 5),
  commentaire text,
  created_at  timestamptz default now(),
  is_hidden   boolean default false,
  hidden_at   timestamptz,
  hidden_by   uuid references profiles(id) on delete set null,
  hidden_reason text,
  unique(annonce_id, auteur_id)
);

create table if not exists avis_moderation_logs (
  id            uuid default gen_random_uuid() primary key,
  avis_id        uuid references avis(id) on delete cascade,
  annonce_id     uuid references annonces(id) on delete cascade,
  owner_id       uuid references profiles(id) on delete set null,
  moderator_id   uuid references profiles(id) on delete set null,
  action         text not null,
  reason         text,
  created_at     timestamptz default now()
);

create table if not exists messages_contact (
  id          uuid default gen_random_uuid() primary key,
  nom         text,
  email       text,
  sujet       text,
  message     text not null,
  created_at  timestamptz default now(),
  statut      text default 'nouveau',
  note_interne text,
  traite_le   timestamptz,
  traite_par  uuid references profiles(id) on delete set null
);

create table if not exists demandes_badge (
  id              uuid default gen_random_uuid() primary key,
  utilisateur_id  uuid references profiles(id) on delete cascade,
  annonce_id      uuid references annonces(id) on delete set null,
  badge_demande   text,
  statut          text default 'en_attente',
  nom             text,
  telephone       text,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz
);

create table if not exists signalements (
  id              uuid default gen_random_uuid() primary key,
  annonce_id      uuid references annonces(id) on delete cascade,
  titre_annonce   text,
  signalant_uid   uuid references profiles(id) on delete cascade,
  motif           text not null,
  details         text,
  statut          text default 'en_attente',
  created_at      timestamptz default now()
);

-- ─── Fonction incrémenter les vues ─────────────────────────

create or replace function increment_vues(annonce_id uuid)
returns void as $$
  update annonces set nb_vues = nb_vues + 1 where id = annonce_id;
$$ language sql security definer;

-- ─── Trigger : créer le profil automatiquement à l'inscription ─

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nom, badge, type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nom', split_part(new.email, '@', 1), 'Utilisateur'),
    'bronze',
    'particulier'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Row Level Security ────────────────────────────────────

alter table profiles          enable row level security;
alter table annonces          enable row level security;
alter table favoris           enable row level security;
alter table messages          enable row level security;
alter table notifications     enable row level security;
alter table avis              enable row level security;
alter table avis_moderation_logs enable row level security;
alter table messages_contact  enable row level security;
alter table demandes_badge    enable row level security;
alter table signalements      enable row level security;

-- Profiles
create policy "profiles: lecture publique"
  on profiles for select using (true);
create policy "profiles: création par son propriétaire"
  on profiles for insert with check (auth.uid() = id);
create policy "profiles: modification par son propriétaire"
  on profiles for update using (auth.uid() = id);

-- Annonces
create policy "annonces: actives lisibles par tous"
  on annonces for select
  using (statut = 'actif' or auth.uid() = utilisateur_id);
create policy "annonces: création par utilisateur connecté"
  on annonces for insert with check (auth.uid() = utilisateur_id);
create policy "annonces: modification par son propriétaire"
  on annonces for update using (auth.uid() = utilisateur_id);
create policy "annonces: suppression par son propriétaire"
  on annonces for delete using (auth.uid() = utilisateur_id);

-- Favoris
create policy "favoris: visibles par leur propriétaire"
  on favoris for select using (auth.uid() = utilisateur_id);
create policy "favoris: création par utilisateur connecté"
  on favoris for insert with check (auth.uid() = utilisateur_id);
create policy "favoris: suppression par son propriétaire"
  on favoris for delete using (auth.uid() = utilisateur_id);

-- Messages
create policy "messages: visibles par les participants"
  on messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "messages: envoi par utilisateur connecté"
  on messages for insert with check (auth.uid() = sender_id);

-- Notifications
create policy "notifications: visibles par leur destinataire"
  on notifications for select using (auth.uid() = utilisateur_id);
create policy "notifications: création par utilisateur connecté"
  on notifications for insert with check (auth.uid() is not null);
create policy "notifications: modification par leur destinataire"
  on notifications for update using (auth.uid() = utilisateur_id);

-- Avis
create policy "avis: lecture contrôlée"
  on avis for select using (
    is_hidden = false
    or auth.uid() = auteur_id
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or exists (
      select 1 from annonces a
      where a.id = avis.annonce_id
        and a.utilisateur_id = auth.uid()
    )
  );
create policy "avis: création après contact qualifié"
  on avis for insert
  with check (
    auth.uid() = auteur_id
    and exists (
      select 1
      from messages m
      join annonces a on a.id = avis.annonce_id
      where m.annonce_id = avis.annonce_id
        and (
          (m.sender_id = avis.auteur_id and m.receiver_id = a.utilisateur_id)
          or
          (m.sender_id = a.utilisateur_id and m.receiver_id = avis.auteur_id)
        )
        and m.created_at <= now() - interval '2 hours'
    )
  );
create policy "avis: modification par auteur"
  on avis for update using (auth.uid() = auteur_id);
create policy "avis: moderation admin"
  on avis for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
create policy "avis logs: lecture admin"
  on avis_moderation_logs for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
create policy "avis logs: insert admin"
  on avis_moderation_logs for insert
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
create policy "avis logs: lecture propriétaire"
  on avis_moderation_logs for select
  using (auth.uid() = owner_id);

-- Contact (public)
create policy "contact: création publique"
  on messages_contact for insert with check (true);

-- Demandes badge
create policy "demandes: visibles par leur propriétaire"
  on demandes_badge for select using (auth.uid() = utilisateur_id);
create policy "demandes: création par utilisateur connecté"
  on demandes_badge for insert with check (auth.uid() = utilisateur_id);
create policy "demandes: lecture admin"
  on demandes_badge for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Signalements
create policy "signalements: création par utilisateur connecté"
  on signalements for insert with check (auth.uid() = signalant_uid);
create policy "signalements: lecture admin"
  on signalements for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- ─── Migrations (colonnes ajoutées après la création initiale) ─────────────

alter table demandes_badge add column if not exists nom text;
alter table demandes_badge add column if not exists telephone text;
alter table avis add column if not exists is_hidden boolean default false;
alter table avis add column if not exists hidden_at timestamptz;
alter table avis add column if not exists hidden_by uuid references profiles(id) on delete set null;
alter table avis add column if not exists hidden_reason text;
create table if not exists avis_moderation_logs (
  id            uuid default gen_random_uuid() primary key,
  avis_id        uuid references avis(id) on delete cascade,
  annonce_id     uuid references annonces(id) on delete cascade,
  owner_id       uuid references profiles(id) on delete set null,
  moderator_id   uuid references profiles(id) on delete set null,
  action         text not null,
  reason         text,
  created_at     timestamptz default now()
);

-- Rôles staff : super_admin | admin | moderator | annonce_manager (voir migrations)
alter table profiles add column if not exists admin_role text;
alter table profiles add column if not exists account_status text default 'en_attente';
alter table profiles add column if not exists account_suspended_until timestamptz;

create table if not exists site_feature_flags (
  key text primary key,
  value_boolean boolean not null default true,
  updated_at timestamptz default now(),
  updated_by uuid references profiles(id) on delete set null
);
alter table site_feature_flags enable row level security;

-- Salon discussion staff (RLS : migrations 20260510000004)
create table if not exists staff_discussion_messages (
  id uuid default gen_random_uuid() primary key,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Localisation précise des annonces
alter table annonces add column if not exists rue              text;
alter table annonces add column if not exists secteur          text;
alter table annonces add column if not exists arrondissement   text;
alter table annonces add column if not exists adresse_complete text;

-- ─── Storage : buckets et politiques ───────────────────────

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('annonces', 'annonces', true)
  on conflict (id) do nothing;

create policy "avatars: lecture publique"
  on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars: upload par utilisateur connecté"
  on storage.objects for insert with check (
    bucket_id = 'avatars' and auth.uid() is not null
  );
create policy "avatars: remplacement par utilisateur connecté"
  on storage.objects for update using (
    bucket_id = 'avatars' and auth.uid() is not null
  );

create policy "annonces: lecture publique"
  on storage.objects for select using (bucket_id = 'annonces');
create policy "annonces: upload par utilisateur connecté"
  on storage.objects for insert with check (
    bucket_id = 'annonces' and auth.uid() is not null
  );
create policy "annonces: remplacement par utilisateur connecté"
  on storage.objects for update using (
    bucket_id = 'annonces' and auth.uid() is not null
  );

-- ─── Correctifs sécurité staff/profils (voir migration 20260523000000) ───

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
