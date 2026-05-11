-- Messagerie staff : lecture / mise à jour des messages du formulaire contact (exclut annonce_manager).

-- Garde-fou: au cas où la migration 00002 n'a pas encore été appliquée.
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
      and p.account_suspended_until is not null
      and p.account_suspended_until > now()
  );
$$;

grant execute on function public.jwt_user_not_suspended() to authenticated, anon;

alter table public.messages_contact add column if not exists statut text default 'nouveau';
alter table public.messages_contact add column if not exists note_interne text;
alter table public.messages_contact add column if not exists traite_le timestamptz;
alter table public.messages_contact add column if not exists traite_par uuid references public.profiles(id) on delete set null;

comment on column public.messages_contact.statut is 'nouveau | en_cours | traite';

update public.messages_contact
set statut = 'nouveau'
where statut is null;

drop policy if exists "contact: lecture staff" on public.messages_contact;
create policy "contact: lecture staff"
  on public.messages_contact for select
  using (
    public.jwt_user_not_suspended()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and coalesce(p.admin_role, 'super_admin') <> 'annonce_manager'
    )
  );

drop policy if exists "contact: mise à jour staff" on public.messages_contact;
create policy "contact: mise à jour staff"
  on public.messages_contact for update
  using (
    public.jwt_user_not_suspended()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
        and coalesce(p.admin_role, 'super_admin') <> 'annonce_manager'
    )
  );
