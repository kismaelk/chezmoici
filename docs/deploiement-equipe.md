# Déploiement et exploitation — équipe Chez Moi CI

Document interne : migrations Supabase, contrôle d’accès admin, vérifications après mise en ligne, audit des avis, notifications.

---

## Lien SQL Editor (Supabase)

1. Ouvrir le [dashboard Supabase](https://supabase.com/dashboard) du projet **production**.
2. Menu **SQL** → **New query**.
3. Coller le contenu d’une migration (voir ordre ci-dessous), exécuter, vérifier qu’il n’y a pas d’erreur.

Remplacez l’URL par celle de **votre** projet si vous la partagez à l’équipe :

`https://supabase.com/dashboard/project/<VOTRE_PROJECT_REF>/sql/new`

---

## Ordre des migrations SQL (à appliquer sur la base prod)

Les fichiers sont dans le dépôt : `supabase/migrations/`.

| Ordre | Fichier | Rôle |
|------|---------|------|
| 1 | `20260503000000_profile_adresse_publique.sql` | Colonne optionnelle profil |
| 2 | `20260506000000_admin_role_and_rls.sql` | `admin_role`, RLS staff sur annonces / profils |
| 3 | `20260507000000_unique_review_per_user.sql` | Un avis par utilisateur et annonce |
| 4 | `20260507010000_review_antispam_and_update_policy.sql` | Anti-spam avis + mise à jour par auteur |
| 5 | `20260507020000_admin_hide_reviews.sql` | Masquage avis par admin |
| 6 | `20260507030000_review_hide_reason.sql` | Motif de masquage |
| 7 | `20260507040000_review_moderation_logs_and_visibility.sql` | Table `avis_moderation_logs`, visibilité |
| 8 | `20260508000000_profiles_account_status.sql` | **`account_status` sur `profiles`** (indispensable pour l’admin utilisateurs) |

Si une migration a déjà été appliquée (message du type « already exists »), ignorer ou adapter ; l’important est que le schéma final corresponde à `supabase/schema.sql`.

---

## Qui a accès super admin / modérateur ?

- **Super admin (accès complet `/admin`)**  
  - Compte dont l’e-mail = `NEXT_PUBLIC_ADMIN_EMAIL_FALLBACK` (secours), **ou**  
  - Ligne `profiles` avec `is_admin = true` et (`admin_role` absent ou `admin_role = 'super_admin'`).

- **Modérateur (validation annonces uniquement dans l’UI)**  
  - `is_admin = true` et `admin_role = 'moderator'`.

La logique est dans `lib/staffRoles.js`. En production, définir `NEXT_PUBLIC_ADMIN_EMAIL_FALLBACK` et les rôles en base pour les comptes concernés (voir onglet **Utilisateurs** une fois les migrations passées).

---

## Checklist post-déploiement

À faire après déploiement du front (Vercel, etc.) **et** exécution des migrations sur Supabase prod :

1. **Connexion admin** : se connecter avec un compte staff → `/admin` s’affiche sans renvoi vers l’accueil.
2. **Enregistrer un profil** : onglet **Utilisateurs** → modifier badge et/ou statut → **Enregistrer** → recharger la page : les valeurs persistent ; le bandeau « vérification » côté header reflète `account_status` si applicable.
3. **Masquage d’un avis** : onglet **Avis** → masquer avec un motif → l’avis disparaît du public ; l’historique apparaît dans **Historique modération**.
4. **Page « Mes avis modérés »** : se connecter en tant que **propriétaire** de l’annonce concernée → menu utilisateur → **Avis modérés** → le motif et la date s’affichent.

Variables Vercel : aligner `.env.local` / `.env.local.example` (Supabase, `NEXT_PUBLIC_SITE_URL`, webhooks modération, etc.).

---

## Sauvegardes et audit (`avis_moderation_logs`)

- **Export ponctuel** (SQL Editor) :

```sql
select l.*, a.titre as annonce_titre
from public.avis_moderation_logs l
left join public.annonces a on a.id = l.annonce_id
order by l.created_at desc
limit 5000;
```

- **Rétention** : Supabase ne purge pas automatiquement cette table. Décider en équipe (ex. conservation 12–24 mois) ; si besoin, planifier une suppression des lignes plus anciennes qu’un seuil via un job manuel ou pg_cron.

---

## Notifications (Slack / e-mail / webhook)

Les mêmes variables servent pour :

- nouvelle annonce en vérification (`/api/notify-moderation`) ;
- compte passé en **actif** ou annonce passée en **actif** depuis l’admin (`/api/notify-admin-action`).

Événements webhook JSON possibles : `annonce_en_verification`, `compte_verifie`, `annonce_validee` (voir payloads dans le code des routes API).

Configurer au moins un canal : `SLACK_MODERATION_WEBHOOK_URL`, ou `MODERATION_NOTIFY_WEBHOOK_URL`, ou `RESEND_API_KEY` + `MODERATION_NOTIFY_EMAIL`.
