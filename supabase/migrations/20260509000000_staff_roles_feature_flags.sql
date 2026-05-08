-- Rôles étendus : super_admin | admin | moderator | annonce_manager
alter table public.profiles drop constraint if exists profiles_admin_role_check;
alter table public.profiles add constraint profiles_admin_role_check
  check (
    admin_role is null
    or admin_role in ('super_admin', 'admin', 'moderator', 'annonce_manager')
  );

comment on column public.profiles.admin_role is
  'super_admin = tout ; admin = gestion large ; moderator = avis/signalements ; annonce_manager = annonces uniquement';

-- Suspension temporaire (date de fin optionnelle ; déblocage manuel ou job ultérieur)
alter table public.profiles add column if not exists account_suspended_until timestamptz;

comment on column public.profiles.account_suspended_until is
  'Si défini et > now(), le compte peut être traité comme suspendu côté appli';

-- Flags fonctionnels (modifiables par super_admin via /admin-portail)
create table if not exists public.site_feature_flags (
  key text primary key,
  value_boolean boolean not null default true,
  updated_at timestamptz default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.site_feature_flags enable row level security;

drop policy if exists "site_feature_flags: lecture staff" on public.site_feature_flags;
create policy "site_feature_flags: lecture staff"
  on public.site_feature_flags for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "site_feature_flags: mise à jour super" on public.site_feature_flags;
create policy "site_feature_flags: mise à jour super"
  on public.site_feature_flags for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and (p.admin_role = 'super_admin' or p.admin_role is null)
    )
  );

drop policy if exists "site_feature_flags: insertion super" on public.site_feature_flags;
create policy "site_feature_flags: insertion super"
  on public.site_feature_flags for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and (p.admin_role = 'super_admin' or p.admin_role is null)
    )
  );

insert into public.site_feature_flags (key, value_boolean)
values
  ('reviews_enabled', true),
  ('new_listings_enabled', true),
  ('user_registration_enabled', true)
on conflict (key) do nothing;
