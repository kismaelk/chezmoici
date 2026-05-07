-- Modération avis : masquer/afficher depuis l'admin.

alter table public.avis add column if not exists is_hidden boolean default false;
alter table public.avis add column if not exists hidden_at timestamptz;
alter table public.avis add column if not exists hidden_by uuid references public.profiles(id) on delete set null;

drop policy if exists "avis: moderation admin" on public.avis;
create policy "avis: moderation admin"
  on public.avis for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
