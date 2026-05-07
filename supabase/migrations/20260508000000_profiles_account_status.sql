-- Statut de vérification du compte (utilisé par l’admin, le header, la publication d’annonces)
alter table public.profiles add column if not exists account_status text default 'en_attente';

comment on column public.profiles.account_status is
  'en_attente | active | suspended | banned';

update public.profiles
set account_status = 'en_attente'
where account_status is null;
