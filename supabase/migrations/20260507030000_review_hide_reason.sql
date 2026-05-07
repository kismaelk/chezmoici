-- Audit modération avis: raison de masquage.

alter table public.avis add column if not exists hidden_reason text;
