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

```bash
# From your machine (asks for root password once)
rsync -avz --progress \
  --exclude node_modules \
  --exclude .git \
  "/Users/dai/Documents/3D打印独立站/" \
  root@45.32.91.40:/var/www/printnova/
```

Project layout after upload (key folders):

- `web/` — frontend modules (shop / product / checkout / auth / admin / legal)
- `server/` — Express + Stripe API
- `docs/` — DEPLOY / LAUNCH

Site URLs: `/shop/` `/checkout/` `/admin/` `/auth/` `/product/?id=...`

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
2. Add to cart → Checkout
3. Stripe test card `4242 4242 4242 4242`
4. Admin: [https://orbmare.com/admin.html](https://orbmare.com/admin.html)

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

Not required for first sales.