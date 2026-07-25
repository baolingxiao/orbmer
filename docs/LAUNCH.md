# Orbmare — 14-day money sprint (Stripe)

Goal: take real USD card payments for Jinqi PLA toys as fast as possible.

## What is already built

- 162 Jinqi toys + images, USD pricing, variants on product pages
- Shop search / sort / pagination
- Product detail pages (`product.html?id=...`)
- Guest checkout (no login required)
- **Stripe Payment Element** checkout (`npm start` → port 4242)
- Shipping / Privacy / Terms / Contact pages
- Admin terminal for orders + stock

Local preview:

```bash
cd "/Users/dai/Documents/3D打印独立站"
npm start
# open http://127.0.0.1:4242
```

---

## YOUR checklist

### Day 1–2 — Take the first real dollar

1. **Stripe account (US)**  
   - https://dashboard.stripe.com/register  
   - Activate account / link bank for payouts  
   - Developers → API keys → copy **Publishable** + **Secret** test keys  
   - Paste into `.env`:
     ```
     STRIPE_PUBLISHABLE_KEY=pk_test_...
     STRIPE_SECRET_KEY=sk_test_...
     ```
   - Restart `npm start`  
   - Checkout test card: `4242 4242 4242 4242`, any future expiry, any CVC  
   - When ready: switch to `pk_live_` / `sk_live_` keys

2. **Domain + HTTPS** on your cloud server (Square was removed; Stripe also needs HTTPS off-localhost)

3. **Deploy** Express app (`node server/index.js` / pm2 / Railway)

4. Replace `support@orbmare.com` emails with your real inbox

### Day 3–5 — Fulfillment

5. Order top ~20 Jinqi SKUs  
6. USPS / Pirate Ship labels  
7. Set real stock in admin

### Day 6–14 — Traffic

8. TikTok / Reels daily  
9. Meta Ads $20–50/day after organic proof

---

Ship paid orders first. Improve reviews / OAuth later.
