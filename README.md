# WeddingInvite Pro mm

Application SaaS professionnelle de gestion d'invitations de mariage avec QR codes.

## 🎯 Fonctionnalités

- **Gestion des mariages** : Créez et gérez vos événements de mariage
- **Invités** : Importez/exportez des listes, gérez les RSVP
- **Invitations avec QR Code** : Génération automatique de QR codes uniques
- **PDF** : Génération de cartes d'invitation PDF
- **Check-in temps réel** : Scan QR code le jour J avec notifications live
- **Templates** : Bibliothèque de modèles élégants
- **Plans d'abonnement** : Système de facturation avec validation manuelle
- **Panel Admin** : Gestion complète de la plateforme

## 🛠 Technologies

### Backend
- Node.js + Express.js
- Prisma ORM
- MySQL
- Socket.IO (temps réel)
- JWT (authentification)
- QRCode, PDFKit

### Frontend
- React 18 + Vite
- TailwindCSS
- React Query
- Zustand
- React Router DOM
- Framer Motion

## 📋 Prérequis

- Node.js 18+
- MySQL 8.0+
- npm ou yarn

## 🚀 Installation

### Installation rapide (recommandée)

```bash
# 1. Cloner le projet
git clone <repo-url>
cd WEDDING

# 2. Configurer l'environnement backend
cp backend/.env.example backend/.env
# ⚠️ Éditer backend/.env avec vos paramètres (voir section Configuration ci-dessous)

# 3. Créer la base de données MySQL
mysql -u root -p -e "CREATE DATABASE wedding_invite;"

# 4. Installation complète (dépendances + base de données + données initiales)
npm run setup
```

> La commande `npm run setup` exécute automatiquement :
> - Installation de toutes les dépendances (root, backend, frontend)
> - Application du schéma Prisma sur la base de données
> - Seed des données initiales (plans, compte admin, etc.)

```bash
# 5. Lancer l'application (backend + frontend simultanément)
npm run dev
```

L'application sera accessible sur :
- 🌐 **Frontend** : http://localhost:3000
- 🔌 **Backend API** : http://localhost:5000

---

### Installation détaillée (pas à pas)

#### Étape 1 — Cloner le projet

```bash
git clone <repo-url>
cd WEDDING
```

#### Étape 2 — Configuration de l'environnement

```bash
# Copier le fichier d'environnement
cp backend/.env.example backend/.env
```

Éditez `backend/.env` avec vos paramètres :

| Variable | Description | Exemple |
|---|---|---|
| `NODE_ENV` | Environnement d'exécution | `development` |
| `PORT` | Port du serveur backend | `5000` |
| `DATABASE_URL` | URL de connexion MySQL | `mysql://root:password@localhost:3306/wedding_invite` |
| `JWT_SECRET` | Clé secrète JWT (min. 32 caractères) | `votre_secret_jwt_tres_long_et_securise` |
| `JWT_EXPIRES_IN` | Durée de validité du token JWT | `7d` |
| `FRONTEND_URL` | URL du frontend (pour CORS) | `http://localhost:3000` |
| `SMTP_HOST` | Hôte SMTP pour les emails | `smtp.gmail.com` |
| `SMTP_PORT` | Port SMTP | `587` |
| `SMTP_USER` | Adresse email SMTP | `votre@email.com` |
| `SMTP_PASS` | Mot de passe application SMTP | `votre_mot_de_passe_app` |
| `EMAIL_FROM` | Adresse expéditeur des emails | `noreply@weddinginvite.pro` |

#### Étape 3 — Base de données MySQL

```bash
# Se connecter à MySQL et créer la base de données
mysql -u root -p
```

```sql
CREATE DATABASE wedding_invite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

#### Étape 4 — Installation des dépendances

```bash
# Depuis la racine du projet — installe root + backend + frontend
npm run install:all
```

Ou manuellement :

```bash
npm install              # Dépendances racine (concurrently)
cd backend && npm install  # Dépendances backend
cd ../frontend && npm install  # Dépendances frontend
```

#### Étape 5 — Initialisation de la base de données

```bash
# Appliquer le schéma Prisma à MySQL
npm run db:push

# Générer le client Prisma
cd backend && npx prisma generate

# Remplir avec les données initiales (plans, admin, templates)
npm run db:seed
```

#### Étape 6 — Démarrer l'application

**Option A — Tout en un (recommandé) :**

```bash
npm run dev
```

> Démarre le backend et le frontend simultanément grâce à `concurrently`.

**Option B — Séparément :**

```bash
# Terminal 1 — Backend
cd backend
npm run dev    # Démarre avec nodemon (auto-reload)

# Terminal 2 — Frontend
cd frontend
npm run dev    # Démarre Vite sur le port 3000
```

L'application sera accessible sur :
- 🌐 **Frontend** : http://localhost:3000
- 🔌 **Backend API** : http://localhost:5000
- 📊 **Prisma Studio** : `cd backend && npx prisma studio` (port 5555)

---

### 📜 Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Démarre backend + frontend en mode développement |
| `npm run dev:backend` | Démarre uniquement le backend |
| `npm run dev:frontend` | Démarre uniquement le frontend |
| `npm run install:all` | Installe toutes les dépendances |
| `npm run setup` | Installation complète (dépendances + DB + seed) |
| `npm run build` | Build de production du frontend |
| `npm run start` | Démarre le backend en mode production |
| `npm run db:push` | Applique le schéma Prisma à la base de données |
| `npm run db:seed` | Remplit la base de données avec les données initiales |

## 👤 Compte Admin par défaut

Après le seed :
- **Email** : admin@weddinginvite.pro
- **Mot de passe** : Admin@123

⚠️ **Changez ce mot de passe en production !**

## 📁 Structure du projet

```
WEDDING/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Schéma base de données
│   │   └── seed.js            # Données initiales
│   ├── src/
│   │   ├── config/            # Configuration
│   │   ├── middleware/        # Auth, upload, validation
│   │   ├── routes/            # Routes API
│   │   ├── utils/             # Helpers, QRCode, PDF, Email
│   │   └── server.js          # Point d'entrée
│   ├── uploads/               # Fichiers uploadés
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Composants réutilisables
│   │   ├── layouts/           # Layouts (Dashboard, Auth, Public)
│   │   ├── pages/
│   │   │   ├── auth/          # Login, Register, etc.
│   │   │   ├── dashboard/     # Pages client
│   │   │   ├── admin/         # Pages admin
│   │   │   └── public/        # Pages publiques
│   │   ├── services/          # API, Socket
│   │   ├── stores/            # État global (Zustand)
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
└── README.md
```

## 🔌 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/forgot-password` - Mot de passe oublié
- `POST /api/auth/reset-password` - Réinitialiser mot de passe

### Mariages
- `GET /api/weddings` - Liste des mariages
- `POST /api/weddings` - Créer un mariage
- `GET /api/weddings/:id` - Détails d'un mariage
- `PUT /api/weddings/:id` - Modifier un mariage
- `DELETE /api/weddings/:id` - Supprimer un mariage

### Invités
- `GET /api/guests/wedding/:weddingId` - Liste des invités
- `POST /api/guests` - Ajouter un invité
- `PUT /api/guests/:id` - Modifier un invité
- `DELETE /api/guests/:id` - Supprimer un invité
- `POST /api/guests/import` - Importer depuis Excel

### Invitations
- `POST /api/invitations/generate` - Générer des invitations
- `GET /api/invitations/:id/pdf` - Télécharger PDF
- `POST /api/invitations/send-email` - Envoyer par email

### Check-in
- `POST /api/checkin` - Scanner un QR code
- `DELETE /api/checkin/:id/undo` - Annuler un check-in

### Public
- `GET /api/public/invitation/:code` - Voir une invitation
- `POST /api/public/rsvp/:code` - Répondre RSVP

### Admin
- `GET /api/admin/stats` - Statistiques globales
- `GET /api/admin/users` - Gérer les utilisateurs
- `GET /api/admin/payments` - Gérer les paiements
- `PUT /api/admin/payments/:id` - Valider/rejeter paiement

## 💳 Système de paiement

Le système utilise la validation manuelle :

1. L'utilisateur choisit un plan
2. Il effectue le paiement Mobile Money
3. Il upload la preuve de paiement
4. L'admin valide le paiement
5. Le plan est activé automatiquement

## 🔒 Sécurité

- Authentification JWT
- Mots de passe hashés (bcrypt)
- Rate limiting
- Helmet.js (en-têtes sécurisés)
- CORS configuré
- Validation des entrées

## 📱 Responsive Design

L'application est entièrement responsive et optimisée pour :
- Desktop
- Tablette
- Mobile

## 🚢 Déploiement

### Production

1. **Backend** (Heroku, Railway, VPS) :
```bash
cd backend
npm run build
npm start
```

2. **Frontend** (Vercel, Netlify) :
```bash
cd frontend
npm run build
```

3. **Variables d'environnement** : Configurer en production

## 📄 License

MIT License - Libre d'utilisation

## 🤝 Support

Pour toute question ou problème :
- Email : support@weddinginvite.pro
- Documentation : /docs

---

Développé avec ❤️ pour les mariages africains
