# Supabase — migrations appliquées en production

**Dernière mise à jour :** 18 mai 2026  
**Statut :** migrations staff chat et audit fusion **appliquées** sur le projet Supabase de prod.

## Migrations récentes (chat équipe + admin)

| Fichier | Contenu |
|---------|---------|
| `20260513000000_staff_chat_advanced.sql` | Édition (30 min), suppression douce (super admin), réactions, RLS + grants + realtime |
| `20260518100000_staff_chat_attachments_merge_audit.sql` | Pièces jointes (`attachment_*`), bucket `staff-chat`, table `admin_profile_merge_logs`, RLS fusion |

## Prérequis déjà en place (ne pas oublier)

| Fichier | Rôle |
|---------|------|
| `20260510000004_staff_discussion_chat.sql` | Table `staff_discussion_messages` |
| `20260511000000_staff_discussion_messages_grants.sql` | Grants lecture/écriture staff |

## Fonctionnalités débloquées côté app

- **Portail admin → Discussion équipe** : réactions, recherche, édition, retrait message, pièces jointes (bucket `staff-chat`).
- **Portail admin → Fusion profils** : aperçu dry-run, journal `admin_profile_merge_logs`.
- **Exports admin** : Excel multi-feuilles, rate limit API.

## Vérification rapide (SQL Editor)

```sql
-- Colonnes chat avancé
select column_name from information_schema.columns
where table_name = 'staff_discussion_messages'
  and column_name in ('edited_at', 'is_deleted', 'attachment_url');

-- Journal fusions
select count(*) from admin_profile_merge_logs;

-- Bucket storage
select id from storage.buckets where id = 'staff-chat';
```

## PWA / déploiement

Après chaque déploiement Vercel, le fichier `public/sw.js` est régénéré au build. Les utilisateurs PWA peuvent garder un ancien cache : prévoir une invalidation ou un bump de version si besoin.
