-- Avis: autoriser la modification de son propre avis + anti-spam minimum
-- Condition insert: un message lié à l'annonce entre l'auteur et le propriétaire,
-- datant d'au moins 2 heures.

drop policy if exists "avis: création par utilisateur connecté" on public.avis;
create policy "avis: création après contact qualifié"
  on public.avis for insert
  with check (
    auth.uid() = auteur_id
    and exists (
      select 1
      from public.messages m
      join public.annonces a on a.id = avis.annonce_id
      where m.annonce_id = avis.annonce_id
        and (
          (m.sender_id = avis.auteur_id and m.receiver_id = a.utilisateur_id)
          or
          (m.sender_id = a.utilisateur_id and m.receiver_id = avis.auteur_id)
        )
        and m.created_at <= now() - interval '2 hours'
    )
  );

drop policy if exists "avis: modification par auteur" on public.avis;
create policy "avis: modification par auteur"
  on public.avis for update
  using (auth.uid() = auteur_id);
