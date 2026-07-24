# Spoon — Restaurant Créole Platform

Application web complète pour restaurant créole haut de gamme à La Réunion.

## Stack technique

- **Framework** : Next.js 15 (App Router)
- **Langage** : TypeScript
- **Styles** : Tailwind CSS
- **Base de données** : PostgreSQL (Neon) + Prisma ORM
- **Paiement** : Stripe
- **Emails** : Resend
- **Temps réel** : Pusher
- **Médias** : Cloudinary
- **Hébergement** : Vercel

## Installation

```bash
# 1. Cloner et installer les dépendances
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env.local
# Remplir toutes les variables dans .env.local

# 3. Initialiser la base de données
npm run db:push

# 4. Seeder les données initiales
npm run db:seed

# 5. Lancer le serveur de développement
npm run dev
```

## Accès admin

- **URL** : `/admin/login`
- **Identifiant** : `admin`
- **Mot de passe** : `admin`
- Changer le mot de passe au premier login (obligatoire)

## Structure du projet

```
src/
├── app/           # Pages et routes API (Next.js App Router)
├── components/    # Composants React
├── lib/           # Utilitaires et configurations
├── hooks/         # React hooks personnalisés
├── services/      # Logique métier
├── types/         # Types TypeScript
└── emails/        # Templates d'emails
```

## Variables d'environnement requises

Voir `.env.example` pour la liste complète des variables à configurer.

## Déploiement Vercel

```bash
vercel --prod
```

Les cron jobs sont automatiquement configurés via `vercel.json`.

## Fonctionnalités

### Espace public
- Page d'accueil avec plats mis en avant
- Carte / menu avec filtres et allergènes
- Galerie photo
- Événements & privatisations
- Réservation en ligne multi-étapes
- Contact

### Espace client
- Inscription / connexion
- Historique des réservations
- Factures téléchargeables
- Gestion du profil

### Espace admin
- Dashboard avec statistiques en temps réel
- Gestion complète des réservations (liste + calendrier)
- CRUD menu (catégories + plats)
- Offres spéciales ciblées
- Gestion clients
- Paiements + remboursements Stripe
- Factures
- Galerie médias
- Demandes d'événements
- Horaires + jours fermés
- Notifications temps réel (Pusher)
- Paramètres généraux
