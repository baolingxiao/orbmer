#!/usr/bin/env bash
# Run ON the Vultr server as root:
#   bash scripts/server-enable-seller-db.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/printnova}"
DB_NAME="${DB_NAME:-orbmare}"
DB_USER="${DB_USER:-orbmare}"
DB_PASS="${DB_PASS:-$(openssl rand -hex 16)}"

echo "==> Installing PostgreSQL if needed"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y postgresql postgresql-contrib

echo "==> Ensuring database role and database"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  ELSE
    ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

ENV_FILE="${APP_DIR}/.env"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}"

echo "==> Updating ${ENV_FILE}"
touch "${ENV_FILE}"
if grep -q '^DATABASE_URL=' "${ENV_FILE}"; then
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" "${ENV_FILE}"
else
  printf '\nDATABASE_URL=%s\n' "${DATABASE_URL}" >> "${ENV_FILE}"
fi

if grep -q '^PUBLIC_BASE_URL=' "${ENV_FILE}"; then
  sed -i 's|^PUBLIC_BASE_URL=.*|PUBLIC_BASE_URL=https://orbmare.com|' "${ENV_FILE}"
else
  printf 'PUBLIC_BASE_URL=https://orbmare.com\n' >> "${ENV_FILE}"
fi

if ! grep -q '^NODE_ENV=' "${ENV_FILE}"; then
  printf 'NODE_ENV=production\n' >> "${ENV_FILE}"
fi

cd "${APP_DIR}"
echo "==> Installing deps + migrating"
npm install --omit=dev
DATABASE_URL="${DATABASE_URL}" npm run db:migrate

echo "==> Restarting app"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart printnova || pm2 start server/index.js --name printnova
  pm2 save
else
  echo "pm2 not found; start the app manually"
fi

echo
echo "Done. Seller portal: https://orbmare.com/seller/"
echo "Demo login: seller@orbmare.local / Seller-Demo-Pass-2026!"
echo "DATABASE_URL was written to ${ENV_FILE} (keep secret)."
