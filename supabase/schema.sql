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
  created_at  timestamptz default now()
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
  created_at  timestamptz default now()
);

create table if not exists messages_contact (
  id          uuid default gen_random_uuid() primary key,
  nom         text,
  email       text,
  sujet       text,
  message     text not null,
  created_at  timestamptz default now()
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
create policy "avis: lecture publique"
  on avis for select using (true);
create policy "avis: création par utilisateur connecté"
  on avis for insert with check (auth.uid() = auteur_id);

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
