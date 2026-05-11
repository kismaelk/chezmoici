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
| 9 | `20260509000000_staff_roles_feature_flags.sql` | Rôles `admin` / `annonce_manager`, `account_suspended_until`, table `site_feature_flags` |
| 10 | `20260509000001_annonce_manager_rls_restrict.sql` | RLS : le rôle gestionnaire d’annonces ne modifie pas profils / avis / signalements |
| 11 | `20260509000002_suspended_users_rls_no_write.sql` | Fonction `jwt_user_not_suspended()` : **aucune écriture** (tables + storage) tant que `account_suspended_until` est dans le futur |
| 12 | `20260509000003_messages_contact_staff.sql` | Colonnes suivi sur `messages_contact` + RLS **lecture / mise à jour** staff (onglet **Messages contact** du portail) |

Si une migration a déjà été appliquée (message du type « already exists »), ignorer ou adapter ; l’important est que le schéma final corresponde à `supabase/schema.sql`.

### Option : Supabase CLI (même ordre)

Depuis la racine du dépôt, avec le projet lié (`npx supabase link --project-ref <ref>` si besoin) :

```bash
npx supabase db push
```

Cela applique les migrations locales non encore enregistrées sur le projet distant. Sinon, exécuter les fichiers **un par un** dans le SQL Editor comme ci-dessus.

---

## Vercel — variable `SUPABASE_SERVICE_ROLE_KEY`

1. Dashboard Supabase → **Project Settings** → **API** → copier la **service_role** secret (ne jamais la préfixer par `NEXT_PUBLIC_`).
2. Vercel → projet → **Settings** → **Environment Variables** → ajouter `SUPABASE_SERVICE_ROLE_KEY` pour **Production** (et Preview si vous testez les routes admin dessus).
3. Redéployer. Sans cette clé, `POST /api/admin/user-auth` (confirmation e-mail, envoi reset mot de passe) échoue côté serveur.

---

## Rôles staff dans `profiles`

À faire dans le **SQL Editor** ou via l’onglet **Utilisateurs** du portail (selon vos droits). Exemples SQL (remplacer l’UUID par celui du compte) :

```sql
-- Super admin (héritage : is_admin + pas de rôle restreint)
update public.profiles
set is_admin = true, admin_role = 'super_admin'
where id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

-- Admin
update public.profiles
set is_admin = true, admin_role = 'admin'
where id = '...';

-- Modérateur
update public.profiles
set is_admin = true, admin_role = 'moderator'
where id = '...';

-- Gestionnaire d’annonces uniquement
update public.profiles
set is_admin = true, admin_role = 'annonce_manager'
where id = '...';
```

Vérifier chaque rôle en se connectant avec le compte concerné et en ouvrant `/admin-portail` : les onglets visibles doivent correspondre à `lib/staffRoles.js`.

---

## Suspension de compte (`account_suspended_until`)

Si cette colonne est renseignée avec une **date/heure future**, l’utilisateur ne peut plus rester connecté :

- refus à la connexion (e-mail / mot de passe, SMS) ;
- refus après OAuth (`/auth/callback`) ;
- déconnexion automatique si la suspension est ajoutée pendant une session active (`AccountSuspensionListener` dans le layout).

Message sur `/connexion?suspendu=1` ou erreur explicite sur le formulaire.

Côté base, après la migration **11**, un JWT valide mais **profil suspendu** ne peut plus **insérer / mettre à jour / supprimer** (y compris storage `avatars` et `annonces`), ni agir en staff tant que la suspension est active. Les **lectures** restent possibles selon les policies existantes (ex. annonces publiques).

---

## Qui a accès super admin / modérateur ?

- **Super admin (contrôle total, `/admin-portail`)**  
  - E-mail = `NEXT_PUBLIC_ADMIN_EMAIL_FALLBACK` (secours), **ou**  
  - `is_admin = true` et (`admin_role` absent / `super_admin`).

- **Administrateur** — `admin_role = 'admin'` : annonces, utilisateurs, signalements, badges, reset MDP ; pas les flags produit ni confirmation e-mail forcée.

- **Modérateur** — `moderator` : avis, signalements, annonces (sans suppression ni badge selon matrice).

- **Gestionnaire d’annonces** — `annonce_manager` : annonces uniquement (médias, champs, statut, badge) ; **pas** les profils utilisateurs (RLS).

La logique est dans `lib/staffRoles.js`. En production : définir `NEXT_PUBLIC_ADMIN_EMAIL_FALLBACK`, les rôles en base (onglet **Utilisateurs**), et **`SUPABASE_SERVICE_ROLE_KEY`** sur le serveur (Vercel) pour les actions Auth (confirmation e-mail, lien reset mot de passe).

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
