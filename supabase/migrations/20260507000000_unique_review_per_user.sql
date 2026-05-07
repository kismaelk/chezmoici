-- Un seul avis/note par compte et par annonce.
-- 1) Déduplication des doublons existants (on garde le plus récent)
-- 2) Contrainte unique au niveau base

delete from public.avis a
using public.avis b
where a.annonce_id = b.annonce_id
  and a.auteur_id = b.auteur_id
  and (
    a.created_at < b.created_at
    or (a.created_at = b.created_at and a.id < b.id)
  );

alter table public.avis
  add constraint avis_unique_annonce_auteur unique (annonce_id, auteur_id);
