#!/usr/bin/env bash
#
# Installation de WeddingInvite Pro sur un VPS Ubuntu/Debian neuf.
# A executer en root (ou avec sudo) : sudo bash install.sh
#
# Ce script installe Node.js, MySQL, Nginx et PM2, clone le depot,
# configure la base de donnees, construit le frontend et demarre
# le backend. Concu pour une IP brute (pas de nom de domaine) ;
# relancer `certbot` plus tard quand un domaine sera pointe.

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration (modifiable via variables d'environnement avant l'execution)
# ---------------------------------------------------------------------------
REPO_URL="${REPO_URL:-https://github.com/kadilab/wedding.git}"
INSTALL_DIR="${INSTALL_DIR:-/var/www/wedding}"
DB_NAME="${DB_NAME:-wedding_invite}"
DB_USER="${DB_USER:-wedding_app}"
BACKEND_PORT="${BACKEND_PORT:-5000}"
NODE_MAJOR="${NODE_MAJOR:-20}"
PM2_APP_NAME="${PM2_APP_NAME:-wedding-backend}"

if [[ $EUID -ne 0 ]]; then
  echo "Ce script doit etre execute en root (ou via sudo)." >&2
  exit 1
fi

log()  { echo -e "\n\033[1;32m==> $*\033[0m"; }
warn() { echo -e "\033[1;33m!! $*\033[0m"; }

# ---------------------------------------------------------------------------
# 1. Paquets systeme de base
# ---------------------------------------------------------------------------
log "Mise a jour du systeme et installation des paquets de base"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git build-essential ufw

# ---------------------------------------------------------------------------
# 2. Node.js (via NodeSource)
# ---------------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1 || ! node --version | grep -q "v${NODE_MAJOR}\."; then
  log "Installation de Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
else
  log "Node.js deja present : $(node --version)"
fi

log "Installation de PM2 (gestionnaire de processus)"
npm install -g pm2

# ---------------------------------------------------------------------------
# 3. MySQL
# ---------------------------------------------------------------------------
log "Installation et configuration de MySQL"
apt-get install -y mysql-server
systemctl enable --now mysql

DB_PASS="$(openssl rand -hex 16)"

mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

# ---------------------------------------------------------------------------
# 4. Nginx
# ---------------------------------------------------------------------------
log "Installation de Nginx"
apt-get install -y nginx

# ---------------------------------------------------------------------------
# 5. Recuperation du code
# ---------------------------------------------------------------------------
if [[ -d "${INSTALL_DIR}/.git" ]]; then
  log "Mise a jour du depot existant dans ${INSTALL_DIR}"
  git -C "${INSTALL_DIR}" pull --ff-only
else
  log "Clonage du depot dans ${INSTALL_DIR}"
  mkdir -p "$(dirname "${INSTALL_DIR}")"
  git clone "${REPO_URL}" "${INSTALL_DIR}"
fi

# ---------------------------------------------------------------------------
# 6. Dependances
# ---------------------------------------------------------------------------
log "Installation des dependances (racine, backend, frontend)"
cd "${INSTALL_DIR}"
npm install
(cd backend && npm install)
(cd frontend && npm install)

# ---------------------------------------------------------------------------
# 7. Fichier .env du backend
# ---------------------------------------------------------------------------
SERVER_IP="$(curl -fsSL https://ifconfig.me || hostname -I | awk '{print $1}')"
JWT_SECRET="$(openssl rand -hex 32)"

if [[ -f "${INSTALL_DIR}/backend/.env" ]]; then
  warn "backend/.env existe deja, il n'est PAS ecrase. Verifiez son contenu manuellement."
else
  log "Generation de backend/.env"
  cat > "${INSTALL_DIR}/backend/.env" <<ENV
NODE_ENV=production
PORT=${BACKEND_PORT}

DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}"

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://${SERVER_IP}

# A configurer manuellement pour activer l'envoi d'emails :
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@weddinginvite.pro
ENV
fi

# ---------------------------------------------------------------------------
# 8. Base de donnees : schema + donnees initiales
# ---------------------------------------------------------------------------
log "Application du schema Prisma (db push, pas de migrations versionnees dans ce depot)"
cd "${INSTALL_DIR}/backend"
npx prisma generate
npx prisma db push --accept-data-loss --skip-generate

log "Insertion des donnees initiales (plans, compte admin, templates)"
node prisma/seed.js
node prisma/seed-templates.js || warn "seed-templates a echoue (non bloquant, vous pourrez le relancer plus tard avec: node prisma/seed-templates.js)"

# ---------------------------------------------------------------------------
# 9. Build du frontend
# ---------------------------------------------------------------------------
log "Build du frontend (production)"
cd "${INSTALL_DIR}/frontend"
npm run build

# ---------------------------------------------------------------------------
# 10. Configuration Nginx
# ---------------------------------------------------------------------------
log "Configuration de Nginx"
NGINX_SITE=/etc/nginx/sites-available/wedding
cat > "${NGINX_SITE}" <<NGINX
server {
    listen 80;
    server_name ${SERVER_IP};

    root ${INSTALL_DIR}/frontend/dist;
    index index.html;

    client_max_body_size 25m;

    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/uploads/;
    }

    location /templates/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/templates/;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

ln -sf "${NGINX_SITE}" /etc/nginx/sites-enabled/wedding
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# ---------------------------------------------------------------------------
# 11. Pare-feu
# ---------------------------------------------------------------------------
log "Configuration du pare-feu (UFW)"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ---------------------------------------------------------------------------
# 12. Demarrage du backend avec PM2
# ---------------------------------------------------------------------------
log "Demarrage du backend avec PM2"
cd "${INSTALL_DIR}/backend"
pm2 delete "${PM2_APP_NAME}" >/dev/null 2>&1 || true
pm2 start src/server.js --name "${PM2_APP_NAME}"
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

# ---------------------------------------------------------------------------
# Recapitulatif
# ---------------------------------------------------------------------------
cat <<SUMMARY

============================================================
 Installation terminee !
============================================================

 Site accessible sur :       http://${SERVER_IP}
 Dossier d'installation :    ${INSTALL_DIR}
 Backend (PM2) :             pm2 status / pm2 logs ${PM2_APP_NAME}

 Base de donnees MySQL :
   Nom         : ${DB_NAME}
   Utilisateur : ${DB_USER}
   Mot de passe: ${DB_PASS}
   (deja inscrits dans ${INSTALL_DIR}/backend/.env)

 Compte administrateur par defaut :
   Email    : admin@weddinginvite.pro
   Mot de passe : Admin@123
   /!\\ CHANGEZ CE MOT DE PASSE IMMEDIATEMENT APRES LA PREMIERE CONNEXION.

 A faire ensuite :
   - Configurer SMTP_* dans ${INSTALL_DIR}/backend/.env puis: pm2 restart ${PM2_APP_NAME}
   - Configurer Admin > Parametres (paiement, Telegram, etc.)
   - Quand un nom de domaine pointera vers ce serveur :
       1) remplacer server_name dans ${NGINX_SITE} par le domaine
       2) sudo apt install certbot python3-certbot-nginx
       3) sudo certbot --nginx -d votredomaine.com

============================================================
SUMMARY
