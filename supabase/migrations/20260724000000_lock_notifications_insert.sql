-- Empêche tout utilisateur authentifié d'insérer une notification pour un tiers
-- (phishing / spam via cloche in-app). Les inserts légitimes restent :
--   - staff (profiles.is_admin) : modération, etc.
--   - expéditeur d'un message récent vers le destinataire (après contact fiche).
-- Lien : chemins relatifs same-origin uniquement (pas d'URL absolue / protocol-relative).

drop policy if exists "notifications: création par utilisateur connecté" on public.notifications;

create policy "notifications: création autorisée"
  on public.notifications for insert
  with check (
    auth.uid() is not null
    and public.jwt_user_not_suspended()
    and utilisateur_id is not null
    and (lien is null or (lien like '/%' and lien not like '//%'))
    and (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.is_admin = true
      )
      or (
        coalesce(type, '') = 'message'
        and exists (
          select 1
          from public.messages m
          where m.sender_id = auth.uid()
            and m.receiver_id = utilisateur_id
            and m.created_at > now() - interval '10 minutes'
        )
      )
    )
  );

comment on policy "notifications: création autorisée" on public.notifications is
  'Staff admin, ou notification message liée à un envoi récent ; lien relatif uniquement.';
