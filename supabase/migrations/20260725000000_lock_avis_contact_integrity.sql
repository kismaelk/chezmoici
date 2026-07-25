-- Prevent forged/backdated messages from bypassing avis contact rules,
-- and block listing owners from self-reviewing.

-- Client inserts previously could set messages.created_at in the past, so the
-- avis INSERT policy (`created_at <= now() - interval '2 hours'`) was trivial
-- to satisfy without waiting.
create or replace function public.messages_force_created_at()
returns trigger
language plpgsql
as $$
begin
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists messages_force_created_at on public.messages;
create trigger messages_force_created_at
  before insert on public.messages
  for each row
  execute function public.messages_force_created_at();

revoke all on function public.messages_force_created_at() from public;

-- Require distinct participants. When an annonce is attached, one party must
-- be the listing owner (blocks arbitrary forged listing contact pairs).
drop policy if exists "messages: envoi par utilisateur connecté" on public.messages;
create policy "messages: envoi par utilisateur connecté"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.jwt_user_not_suspended()
    and sender_id is distinct from receiver_id
    and (
      annonce_id is null
      or exists (
        select 1
        from public.annonces a
        where a.id = messages.annonce_id
          and (
            a.utilisateur_id = messages.sender_id
            or a.utilisateur_id = messages.receiver_id
          )
      )
    )
  );

-- No self-reviews; keep qualified contact + 2h delay against forged spam.
drop policy if exists "avis: création après contact qualifié" on public.avis;
create policy "avis: création après contact qualifié"
  on public.avis for insert
  with check (
    public.jwt_user_not_suspended()
    and auth.uid() = auteur_id
    and exists (
      select 1
      from public.annonces a
      where a.id = avis.annonce_id
        and a.utilisateur_id is distinct from avis.auteur_id
    )
    and exists (
      select 1
      from public.messages m
      join public.annonces a on a.id = avis.annonce_id
      where m.annonce_id = avis.annonce_id
        and m.sender_id is distinct from m.receiver_id
        and (
          (m.sender_id = avis.auteur_id and m.receiver_id = a.utilisateur_id)
          or
          (m.sender_id = a.utilisateur_id and m.receiver_id = avis.auteur_id)
        )
        and m.created_at <= now() - interval '2 hours'
    )
  );
