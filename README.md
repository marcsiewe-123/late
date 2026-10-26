# PointAfrik SaaS — Plateforme Complète de Gestion du Personnel & Présences

PointAfrik SaaS est une solution multi-tenant complète conçue spécifiquement pour les entreprises d’Afrique Francophone (Cameroun, Côte d’Ivoire, Sénégal, Bénin, Togo, Gabon, RDC, Congo). Elle intègre la gestion du personnel, le pointage en direct, le calcul automatique des retards, les pauses chronométrées, les rapports officiels certifiés, un système d'essai gratuit strict de 72 heures géré côté serveur, et le paiement des abonnements par Mobile Money via la passerelle **SasPay**.

---

## 1. Architecture Technique

- **Frontend** : React 19 + TypeScript + Tailwind CSS (Vite SPA)
- **Backend** : Node.js Express Full-Stack (`server.ts`) avec API REST modulaire
- **Base de Données** : Moteur persistant avec intégrité référentielle, transactions et stockage automatique sécurisé (`server/db.ts` dans `data/db.json`)
- **Paiements** : Passerelle `SasPayPaymentProvider` isolée avec validation de signature cryptographique HMAC-SHA256, clé d'idempotence et banc de test Sandbox.
- **Mode Hors-Ligne (PWA)** : File d'attente locale `OfflineQueueManager` avec synchronisation automatique lors du rétablissement de la connexion.

---

## 2. Fonctionnalités Clés Implémentées

### A. Gestion du Personnel & Présences
1. **Répertoire Employés** : Matricule RH unique, fiche complète, département, horaire de shift, import CSV groupé et export CSV.
2. **Pointage en Direct** : Arrivée et départ comparés à l'horaire de référence avec calcul automatique des minutes de retard et tolérance de retard paramétrable.
3. **Gestion des Pauses** : Début et fin de pause avec chronomètre actif. Verrouillage strict : impossible de cumuler plusieurs pauses actives ou de clore une pause inexistante.
4. **Corrections Manuelles Audités** : Rectification d'horaire réservée aux responsables avec motif obligatoire (`justification`), enregistrement de l'auteur et de l'ancienne valeur dans les journaux d'audit.
5. **Rapports & Exports Certifiés** : Rapports journaliers, hebdomadaires et mensuels avec vue imprimable/PDF prête pour signature officielle et inspection du travail.

### B. Essai Gratuit de 72 Heures
- Horodatage strict côté serveur (`trial_started_at` et `trial_ends_at = +72h`).
- Compte à rebours temps réel affiché dans le bandeau de l'application.
- **Contrôle d'expiration serveur** : À l'échéance des 72 heures, le compte passe automatiquement en statut `expired` et les actions d'écriture sont bloquées (HTTP 403), protégeant les données du client tout en l'invitant à régulariser son abonnement par Mobile Money.
- **Extension Exceptionnelle** : Le Super-Administrateur peut accorder une prolongation (+24h, +48h, +72h) avec justification obligatoire inscrite au journal d'audit.

### C. Paiements SasPay Mobile Money
- Opérateurs supportés : **Orange Money**, **MTN Mobile Money**, **Wave**, **Moov Money**.
- Devises : **XAF** (Afrique Centrale) et **XOF** (Afrique de l'Ouest).
- Forfaits : Starter (5 000 FCFA/mois), Business Pro (10 000 FCFA/mois), Premium (25 000 FCFA/mois), avec option annuelle (2 mois offerts).
- Webhook sécurisé : Validation de signature HMAC-SHA256, idempotence (`eventId`) pour empêcher les doubles renouvellements, et génération de reçu officiel certifié (`REC-2026-XAF-XXXX`).
- Simulateur Sandbox intégré pour tester de bout en bout le flux de confirmation ou d'échec sans argent réel.

### D. Espace Super-Administrateur (`/admin`)
1. **Vue d'ensemble** : KPI clients, essais en cours, essais expirés, abonnements actifs, MRR estimé et alertes système.
2. **Finances & Revenus** : Chiffre d'affaires réellement encaissé (strictement distingué des montants en attente), ventilation par pays et par opérateur.
3. **Gestion des Clients** : Fiche client, suspension/réactivation de compte, prolongation d'essai avec motif.
4. **Support Client 3-Volets** :
   - Volet 1 : Liste des tickets filtrable (Nouveau, Urgent, Ouvert, Résolu).
   - Volet 2 : Conversation en direct et réponse administrative.
   - Volet 3 : Fiche client contextuelle + **Notes Internes Confidentielles** (strictement invisibles pour le client).
5. **Incidents Techniques & Réparation Contrôlée** : Historique des alertes webhooks avec bouton de réconciliation automatique sans double débit.

---

## 3. Comptes de Démonstration Pré-Configurés

Pour tester immédiatement l'ensemble des parcours, utilisez le sélecteur de compte dans le header :

1. **Super-Administrateur SaaS** :
   - E-mail : `admin@pointafrik.com`
   - Rôle : `superadmin`
   - Accès : Dashboard Super-Admin, KPI financiers, boîte support 3 volets, incidents.
2. **Entreprise en Essai 72h (48h restantes)** :
   - Entreprise : `TransLog Cameroun SARL` (Douala, Cameroun - XAF)
   - Responsable : `Marc Siewe` (`marcsiewe326@gmail.com`)
   - Statut : Essai actif avec pointages réels, retards et pauses du jour.
3. **Entreprise Abonnée Payante** :
   - Entreprise : `TechNova Abidjan SAS` (Abidjan, Côte d'Ivoire - XOF)
   - Responsable : `Amadou Koné` (`kone@technova-ci.com`)
   - Statut : Forfait Business Pro actif (réglé par Wave Mobile Money).
4. **Entreprise en Essai Expiré** :
   - Entreprise : `Dakar BTP Solutions` (Dakar, Sénégal - XOF)
   - Responsable : `Fatou Diop` (`fatou@dakarbtp.sn`)
   - Statut : Essai 72h expiré — démontre le blocage sécurisé en lecture seule et le flux de régularisation par Mobile Money.

---

## 4. Intégration Officielle SasPay (Conforme https://docs.saspay.me/)

PointAfrik SaaS s’interface directement avec l’API REST v1 officielle de SasPay :

### Endpoints SasPay Utilisés :
- **Initialisation Directe Softpay** : `POST https://api.saspay.me/api/v1/payments/softpay/`
  - Paramètres obligatoires : `amount` (chaîne décimale e.g. `"5000.00"`), `currency` (`XAF` ou `XOF`), `country` (code ISO 2 lettres e.g. `CM`, `CI`, `SN`, `BJ`), `network` (`orange_cm`, `mtn_cm`, `wave_ci`, `orange_ci`, `mtn_ci`, etc.), `customer` (`email`, `first_name`, `last_name`, `phone`).
  - En-têtes : `Authorization: Bearer sk_...`, `Idempotency-Key: <UUID>`, `Content-Type: application/json`.
- **Vérification d’une Transaction** : `GET https://api.saspay.me/api/v1/payments/{payment_id}/verify/`
- **Webhook Sécurisé** : `POST /api/payments/webhook`
  - En-têtes validés : `X-Webhook-Signature`, `X-Webhook-Timestamp`, `X-Webhook-Event`.
  - Signature : HMAC-SHA256 (`timestamp + "." + raw_body`) avec protection contre le rejeu (> 300 secondes) et comparaison à temps constant.

### Variables d'Environnement :

```env
# SasPay Mobile Money Gateway Configuration (https://docs.saspay.me/)
# Obtenez vos clés dans la section Developer sur https://app.saspay.me/
SASPAY_API_KEY="sk_test_xxxxxxxxxxxxxxxx"
SASPAY_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxxxx"
SASPAY_ENV="sandbox" # ou "production"
SASPAY_API_BASE_URL="https://api.saspay.me/api/v1"
PORT=3000
```

### URL du Webhook de Production :
`https://votre-domaine.com/api/payments/webhook`

---

## 5. Procédure de Création du Premier Super-Administrateur

Un premier compte super-administrateur est déjà injecté lors de l'initialisation de la base :
- **Identifiant** : `admin@pointafrik.com`
- **Mot de passe initial** : `AdminPassword2026!`

Pour promouvoir un utilisateur existant en super-administrateur via la console serveur ou l'API interne, mettez à jour le champ `role` de l'enregistrement utilisateur vers `'superadmin'`.

---

## 6. Lancement & Déploiement

```bash
# Installation des dépendances
npm install

# Démarrage en mode développement (Serveur Full-Stack Express + Vite)
npm run dev

# Construction pour la production
npm run build

# Démarrage du serveur en production
npm start
```
