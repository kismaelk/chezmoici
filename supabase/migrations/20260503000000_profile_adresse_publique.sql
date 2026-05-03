-- Adresse affichée aux membres connectés (ex. agences)
alter table public.profiles add column if not exists adresse_publique text;
