# Déploiement avec Docker (VPS)

Ce projet se déploie avec 5 conteneurs orchestrés par `docker-compose.yml` :

- **mysql** — base de données MySQL 8, données persistées dans un volume Docker.
- **backend** — API Express/Prisma (port interne 5000, jamais exposé directement).
- **frontend** — build Vite servi par nginx (dashboard web), reverse-proxy `/api`, `/uploads`, `/templates` et `/socket.io` vers le backend. Pas de port publié directement.
- **checkin** — l'application mobile (PWA) de check-in. Pas de port publié directement.
- **caddy** — unique point d'entrée public (ports 80/443). Route `/checkin/*` vers l'app de check-in et tout le reste vers le dashboard, et obtient/renouvelle automatiquement un certificat HTTPS Let's Encrypt pour ton domaine.

Tout est donc servi sur **un seul domaine et un seul port (443)** : le dashboard sur `https://tondomaine.com/` et l'app de check-in sur `https://tondomaine.com/checkin/` — pas besoin de taper un numéro de port.

Un nom de domaine pointé vers le VPS (enregistrement DNS A) est **requis** : Let's Encrypt ne délivre pas de certificat pour une IP brute. Si tu n'as pas de domaine, un sous-domaine gratuit type `IP.sslip.io` fonctionne aussi.

## 1. Prérequis sur le VPS

```bash
curl -fsSL https://get.docker.com | sh
# docker compose (plugin v2) est inclus par get.docker.com sur les distros récentes
docker compose version
```

Ouvre les ports HTTP et HTTPS (Caddy a besoin des deux : 80 pour la validation Let's Encrypt + redirection, 443 pour le site) :

```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

## 2. Récupérer le projet

```bash
git clone https://github.com/kadilab/wedp.git
cd wedp
```

## 3. Configurer les variables d'environnement

```bash
cp .env.docker.example .env
nano .env
```

Renseigne au minimum :

- `DOMAIN` — ton nom de domaine pointé vers ce VPS (ex: `winvite.pro`). **Vérifie d'abord que le DNS pointe bien dessus** (`dig +short winvite.pro` doit renvoyer l'IP du VPS), sinon Caddy ne pourra pas obtenir le certificat.
- `ACME_EMAIL` — ton email, utilisé par Let's Encrypt pour les notifications d'expiration (pas critique, le renouvellement est automatique).
- `FRONTEND_URL` — `https://winvite.pro` (utilisée pour le CORS et les liens dans les emails).
- `DB_PASSWORD`, `DB_ROOT_PASSWORD` — mots de passe MySQL (choisis des valeurs fortes).
- `JWT_SECRET` — chaîne aléatoire longue (ex: `openssl rand -hex 32`).
- `SMTP_*` / `EMAIL_FROM` — si tu veux que les emails (reset password, confirmations) partent réellement. Laisse vide sinon, le reste de l'app fonctionne quand même.

Ce fichier `.env` n'est jamais commité (déjà dans `.gitignore`) — il reste local au VPS.

## 4. Lancer

```bash
docker compose up -d --build
```

Au premier démarrage, le conteneur `backend` attend que MySQL soit prêt puis applique automatiquement les migrations Prisma (`prisma migrate deploy`, voir `backend/docker-entrypoint.sh`). Pas d'étape manuelle de migration à faire.

Caddy va automatiquement demander un certificat à Let's Encrypt pour `DOMAIN` au premier démarrage — ça prend quelques secondes. Suis ses logs pour confirmer :

```bash
docker compose logs -f caddy
```

Tu dois voir une ligne du type `certificate obtained successfully`. Si Caddy boucle sur des erreurs ACME, vérifie que le DNS pointe bien vers le VPS et que les ports 80/443 sont ouverts (firewall **et** sécurité du fournisseur VPS si applicable).

Le site est ensuite accessible sur `https://winvite.pro` et l'app de check-in sur `https://winvite.pro/checkin/`.

## 5. Peupler des données de démo (optionnel, premier déploiement seulement)

Pour créer le compte super admin (`admin@weddinginvite.pro`) et un client de démo (`demo@weddinginvite.pro`) :

```bash
docker compose exec backend node prisma/seed.js
```

(Tu peux aussi mettre `RUN_SEED=true` dans `.env` avant le premier `up`, mais pense à le remettre à `false` ensuite pour ne pas re-seed à chaque redémarrage du conteneur.)

**Change le mot de passe admin dès la première connexion.**

## 6. Mettre à jour après un nouveau commit

```bash
git pull
docker compose up -d --build
```

Les migrations Prisma en attente sont rejouées automatiquement au redémarrage du backend. Les données MySQL, les fichiers uploadés (`backend/uploads`) et le certificat HTTPS (`caddy_data`) sont dans des volumes Docker nommés — ils survivent à `docker compose up --build` et même à `docker compose down` (mais pas à `docker compose down -v`, qui supprime les volumes : à éviter en prod).

## 7. Commandes utiles

```bash
docker compose ps                     # état des conteneurs
docker compose logs -f                # tous les logs
docker compose logs -f backend        # logs backend seulement
docker compose logs -f caddy          # logs HTTPS/reverse proxy
docker compose exec backend sh        # shell dans le conteneur backend
docker compose exec mysql mysql -u root -p   # client MySQL
docker compose restart backend        # redémarrer un service
docker compose down                   # arrêter (garde les volumes/données)
```

## 8. Sauvegarder la base de données

```bash
docker compose exec mysql sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > backup_$(date +%Y%m%d).sql
```

## 9. Application mobile de check-in (PWA)

Accessible sur `https://tondomaine.com/checkin/`. C'est une PWA (Progressive Web App) : depuis le navigateur mobile (Chrome/Safari), ouvrir l'URL puis "Ajouter à l'écran d'accueil" pour l'installer comme une vraie app, avec icône. L'invite d'installation automatique (bandeau "Installer l'application") n'apparaît que servie en **HTTPS** — c'est pour ça qu'elle ne s'affichait pas tant que le site était en HTTP simple.

De même, la **caméra** (scan QR) ne peut être ouverte par le navigateur que sur une origine sécurisée (HTTPS) ou `localhost` — c'est pourquoi le scan était refusé sur ton téléphone en HTTP. Une fois HTTPS actif via Caddy, la demande de permission caméra doit s'afficher normalement.

Utilisation le jour J :

1. Se connecter (même compte que le dashboard web) — nécessite une connexion la première fois.
2. Ouvrir le mariage, cliquer **Télécharger** pendant qu'il y a du réseau (Wi-Fi du lieu, 4G...) : la liste complète des invités (nom, table, type Couple/Singleton, code d'invitation) est mise en cache sur le téléphone.
3. Scanner les QR codes : ça fonctionne désormais **même sans connexion** — chaque scan affiche immédiatement le nom de l'invité, sa table et son type d'invitation, et passe en "Arrivé" localement.
4. Dès que la connexion revient (même brièvement), les check-ins enregistrés hors-ligne se synchronisent automatiquement avec le serveur (bouton manuel de synchro aussi disponible). Le compteur "en attente de synchro" indique combien de scans n'ont pas encore été envoyés.

## 10. Tu migres depuis une installation HTTP existante (sans domaine) ?

Si l'app tournait déjà en HTTP simple sur l'IP avant l'ajout de Caddy :

1. `git pull` pour récupérer le Caddyfile et le nouveau `docker-compose.yml`.
2. Ajoute `DOMAIN` et `ACME_EMAIL` dans `.env`, et passe `FRONTEND_URL` en `https://...`.
3. Vérifie le DNS du domaine (`dig +short tondomaine.com`).
4. `docker compose up -d --build` — `frontend` et `checkin` ne publient plus de port direct (80/8080), seul `caddy` expose désormais 80/443.
5. Si ton firewall avait une règle spécifique pour l'ancien port 8080 de l'app de check-in, tu peux la retirer (`ufw delete allow 8080/tcp`), elle n'est plus utilisée.
