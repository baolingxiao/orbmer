#!/usr/bin/env bash
# Deploy Orbmare storefront + ops console to Vultr.
# Usage (on your Mac, with SSH access to the server):
#   ./scripts/deploy-production.sh
#   DEPLOY_HOST=root@45.32.91.40 DEPLOY_PATH=/var/www/printnova ./scripts/deploy-production.sh
#
# Never syncs local .env (production must keep its own DATABASE_URL / ADMIN_HOST / no ADMIN_DEV_BYPASS).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-root@45.32.91.40}"
REMOTE="${DEPLOY_PATH:-/var/www/printnova}"

echo "==> Deploying $ROOT → $HOST:$REMOTE"
echo "    (excluding .env / node_modules / .git / local runtime dumps)"

rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude .env \
  --exclude .env.* \
  --exclude 'server/runtime-data' \
  --exclude '.DS_Store' \
  --exclude 'assets/toys/jinqi/*.jpg' \
  "$ROOT/" \
  "$HOST:$REMOTE/"

echo "==> Remote install / migrate / restart"
ssh "$HOST" "bash -s" <<REMOTE
set -euo pipefail
export NVM_DIR="\$HOME/.nvm"
if [ -s "\$NVM_DIR/nvm.sh" ]; then
  . "\$NVM_DIR/nvm.sh"
fi
export PATH="/usr/local/bin:/usr/bin:\$HOME/.nvm/versions/node/v22.22.0/bin:\$PATH"
cd '$REMOTE'
npm install --omit=dev
npm run db:migrate
# Keep catalog seed idempotent; safe to re-run
npm run db:migrate-editorial || true
pm2 restart printnova || pm2 start server/index.js --name printnova
pm2 save
pm2 status printnova
REMOTE

echo "==> Smoke checks"
curl -fsS -o /dev/null -w "storefront %{http_code}\n" "https://orbmare.com/" || true
curl -fsS -o /dev/null -w "brands API %{http_code}\n" "https://orbmare.com/api/brands" || true
curl -fsS -o /dev/null -w "designers %{http_code}\n" "https://orbmare.com/designers/" || true

echo "Done. Do NOT copy local .env to production."
echo "Production .env must keep: DATABASE_URL, ADMIN_HOST=admin.orbmare.com, NODE_ENV=production"
echo "and must NOT set ADMIN_DEV_BYPASS=1."
