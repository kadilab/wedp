# Déploiement avec Docker (VPS)

Ce projet se déploie avec 3 conteneurs orchestrés par `docker-compose.yml` :

- **mysql** — base de données MySQL 8, données persistées dans un volume Docker.
- **backend** — API Express/Prisma (port interne 5000, jamais exposé directement).
- **frontend** — build Vite servi par nginx, qui sert le site et reverse-proxy `/api`, `/uploads`, `/templates` et `/socket.io` vers le backend. C'est le seul service exposé sur le VPS (port 80).

Aucun nom de domaine n'est requis pour démarrer : le site sera accessible sur `http://IP_DU_VPS`. Tu pourras ajouter un domaine + HTTPS plus tard (voir tout en bas).

## 1. Prérequis sur le VPS

```bash
curl -fsSL https://get.docker.com | sh
# docker compose (plugin v2) est inclus par get.docker.com sur les distros récentes
docker compose version
```

Ouvre le port 80 si un firewall est actif :

```bash
ufw allow 80/tcp
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
- `DB_PASSWORD`, `DB_ROOT_PASSWORD` — mots de passe MySQL (choisis des valeurs fortes).
- `JWT_SECRET` — chaîne aléatoire longue (ex: `openssl rand -hex 32`).
- `FRONTEND_URL` — `http://IP_DU_VPS` (utilisée pour le CORS et les liens dans les emails).
- `SMTP_*` / `EMAIL_FROM` — si tu veux que les emails (reset password, confirmations) partent réellement. Laisse vide sinon, le reste de l'app fonctionne quand même.

Ce fichier `.env` n'est jamais commité (déjà dans `.gitignore`) — il reste local au VPS.

## 4. Lancer

```bash
docker compose up -d --build
```

Au premier démarrage, le conteneur `backend` attend que MySQL soit prêt puis applique automatiquement les migrations Prisma (`prisma migrate deploy`, voir `backend/docker-entrypoint.sh`). Pas d'étape manuelle de migration à faire.

Suis les logs pendant le premier démarrage :

```bash
docker compose logs -f backend
```

Le site est ensuite accessible sur `http://IP_DU_VPS`.

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

Les migrations Prisma en attente sont rejouées automatiquement au redémarrage du backend. Les données MySQL et les fichiers uploadés (`backend/uploads`) sont dans des volumes Docker nommés (`mysql_data`, `backend_uploads`) — ils survivent à `docker compose up --build` et même à `docker compose down` (mais pas à `docker compose down -v`, qui supprime les volumes : à éviter en prod).

## 7. Commandes utiles

```bash
docker compose ps                     # état des conteneurs
docker compose logs -f                # tous les logs
docker compose logs -f backend        # logs backend seulement
docker compose exec backend sh        # shell dans le conteneur backend
docker compose exec mysql mysql -u root -p   # client MySQL
docker compose restart backend        # redémarrer un service
docker compose down                   # arrêter (garde les volumes/données)
```

## 8. Sauvegarder la base de données

```bash
docker compose exec mysql sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > backup_$(date +%Y%m%d).sql
```

## 9. Ajouter un domaine + HTTPS plus tard

Quand un nom de domaine pointe vers le VPS :
1. Mets à jour `FRONTEND_URL` dans `.env` avec `https://tondomaine.com`.
2. Mets en place un reverse proxy TLS devant le conteneur `frontend` (le plus simple : installer `nginx` + `certbot` directement sur l'hôte en frontal du port 80 du conteneur, ou remplacer le service `frontend` par une image Caddy qui gère Let's Encrypt automatiquement). Dis-moi quand tu en es là, je peux préparer cette partie.
3. Redémarre : `docker compose up -d`.
