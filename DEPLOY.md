# Deploy Orbmare to Vultr (Ubuntu 22.04)

Server: `45.32.91.40` · Domain: `orbmare.com`

Do these on **your Mac**, then on the **server**.

---

## A. DNS (Porkbun / your registrar) — do first


| Type | Host  | Value         | TTL |
| ---- | ----- | ------------- | --- |
| A    | `@`   | `45.32.91.40` | 300 |
| A    | `www` | `45.32.91.40` | 300 |


Wait until `ping orbmare.com` shows `45.32.91.40`.

---

## B. On your Mac — upload the project

**Recommended (one command):**

```bash
cd "/Users/dai/Documents/3D打印独立站"
./scripts/deploy-production.sh
```

This rsyncs code (**never overwrites server `.env`**), runs `npm install` / migrations, and `pm2 restart printnova`.

Manual equivalent:

```bash
# From your machine (asks for root password / uses SSH key)
rsync -avz --progress \
  --exclude node_modules \
  --exclude .git \
  --exclude .env \
  --exclude 'assets/toys/jinqi/*.jpg' \
  "/Users/dai/Documents/3D打印独立站/" \
  root@45.32.91.40:/var/www/printnova/
```

### Auto deploy (optional)

| Way | How |
|-----|-----|
| **Push to GitHub → auto deploy** | Workflow: `.github/workflows/deploy-production.yml`. Add secrets `DEPLOY_HOST` (`root@45.32.91.40`) and `DEPLOY_SSH_KEY` (private key). Push to `main` or run **Actions → Deploy production → Run workflow**. |
| **Mac cron (scheduled)** | `crontab -e` then e.g. daily 3am: `0 3 * * * cd "/Users/dai/Documents/3D打印独立站" && ./scripts/deploy-production.sh >> /tmp/orbmare-deploy.log 2>&1` |

Do **not** copy local `.env` to production (local has `ADMIN_DEV_BYPASS` / `127.0.0.1`). Production keeps its own `DATABASE_URL`, `ADMIN_HOST=admin.orbmare.com`, `NODE_ENV=production`.

> If you need the toy images on the server too, remove the `--exclude 'assets/toys/jinqi/*.jpg'` line (upload is larger ~17MB).

Or upload images in a second pass:

```bash
rsync -avz --progress \
  "/Users/dai/Documents/3D打印独立站/assets/toys/jinqi/" \
  root@45.32.91.40:/var/www/printnova/assets/toys/jinqi/
```

Copy `.env` separately (never commit it):

```bash
scp "/Users/dai/Documents/3D打印独立站/.env" root@45.32.91.40:/var/www/printnova/.env
```

Then edit on server so it has:

```env
PUBLIC_BASE_URL=https://orbmare.com
STRIPE_PUBLISHABLE_KEY=pk_test_...   # or pk_live_...
STRIPE_SECRET_KEY=sk_test_...
PORT=4242
```

---

## C. On the server — install stack (paste all)

SSH in:

## C. On the server — install stack (paste all)

SSH in:

```bash
ssh root@45.32.91.40
```

Then:

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx
npm install -g pm2

mkdir -p /var/www/printnova
cd /var/www/printnova
npm install --omit=dev

# Start app
pm2 delete printnova 2>/dev/null || true
pm2 start server/index.js --name printnova
pm2 save
pm2 startup systemd -u root --hp /root
```

Nginx site:

```bash
cat >/etc/nginx/sites-available/printnova <<'EOF'
server {
    listen 80;Then:
```

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx
npm install -g pm2

mkdir -p /var/www/printnova
cd /var/www/printnova
npm install --omit=dev

# Start app
pm2 delete printnova 2>/dev/null || true
pm2 start server/index.js --name printnova
pm2 save
pm2 startup systemd -u root --hp /root
```

Nginx site:

```bash
cat >/etc/nginx/sites-available/printnova <<'EOF'
server {
    listen 80;
    server_name orbmare.com www.orbmare.com;

    location / {
        proxy_pass http://127.0.0.1:4242;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20m;
    }
}
EOF

ln -sf /etc/nginx/sites-available/printnova /etc/nginx/sites-enabled/printnova
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

HTTPS (DNS must already point here):

```bash
certbot --nginx -d orbmare.com -d www.orbmare.com --redirect -m you@your-email.com --agree-tos -n
```

Open firewall if ufw is on:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

---

## D. Verify

1. [https://orbmare.com](https://orbmare.com)
2. Seller portal: [https://orbmare.com/seller/](https://orbmare.com/seller/)
3. Buyer accounts: [https://orbmare.com/auth/](https://orbmare.com/auth/)
4. Entry hub: [https://orbmare.com/access/](https://orbmare.com/access/)
5. Add to cart → Checkout
6. Stripe test card `4242 4242 4242 4242`

After uploading new code:

```bash
cd /var/www/printnova
npm install --omit=dev
# Ensure .env has:
# PUBLIC_BASE_URL=https://orbmare.com
# DATABASE_URL=postgresql://...
pm2 restart printnova
```

Useful commands:

```bash
pm2 status
pm2 logs printnova
pm2 restart printnova
```

---

## E. Webhook (optional, after HTTPS works)

```bash
# In Stripe Dashboard → Developers → Webhooks
# Endpoint: https://orbmare.com/api/stripe/webhook
# Event: payment_intent.succeeded
# Paste signing secret into .env as STRIPE_WEBHOOK_SECRET=
pm2 restart printnova
```

## F. Enable seller portal (PostgreSQL)

Seller / buyer login **requires** `DATABASE_URL` on the server.

On the Vultr box:

```bash
# 1) Upload latest code from your Mac first (rsync), then:
cd /var/www/printnova
bash scripts/server-enable-seller-db.sh
```

Or manually:

```bash
apt install -y postgresql
sudo -u postgres createuser -P orbmare   # set a password
sudo -u postgres createdb -O orbmare orbmare

# Add to /var/www/printnova/.env :
# DATABASE_URL=postgresql://orbmare:PASSWORD@127.0.0.1:5432/orbmare
# PUBLIC_BASE_URL=https://orbmare.com

cd /var/www/printnova
npm install --omit=dev
npm run db:migrate
pm2 restart printnova
```

Then open [https://orbmare.com/seller/](https://orbmare.com/seller/)

Demo seller:

- email: `seller@orbmare.local`
- password: `Seller-Demo-Pass-2026!`
