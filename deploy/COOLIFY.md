# DocVerify on Coolify — one-click deploy (domain: docuchain.thecosmicdev.net)

The near-one-click path. Coolify handles the reverse proxy + HTTPS, so all the
nginx/certbot errors from before disappear. ~5 clicks after DNS.

---

## Step 1 — Cloudflare DNS (do this first, and mind the cloud colour)

In Cloudflare → DNS, add an **A record**:

| Type | Name | Content (VPS IP) | Proxy status |
|------|------|------------------|--------------|
| A | `@` | `<your VPS IP>` | **DNS only (grey cloud)** ← important |

> **Why grey cloud:** Coolify gets a free Let's Encrypt certificate using an
> HTTP challenge. If Cloudflare's orange-cloud proxy is on, it intercepts that
> challenge and the cert fails — this is the classic "tons of errors" cause.
> Keep it **grey (DNS only)** until HTTPS works. You can turn the orange cloud
> back on afterwards (see Step 5).

Optional: add a second A record `www` → same IP if you want `www.` to work.

---

## Step 2 — Create the resource in Coolify

1. Coolify → your Project → **+ New → Docker Compose**.
2. Source: **your Git repository** → `https://github.com/shreyanshSV/IMPACTHONE.git`, branch `main`.
   (Private repo? Add a GitHub App / deploy key in Coolify → Sources first.)
3. **Compose file path:** `docker-compose.coolify.yml`
4. Save.

---

## Step 3 — Set the domain

On the **app** service → **Domains** field, enter:

```
https://docuchain.thecosmicdev.net
```

Coolify auto-wires its proxy to the container's exposed port 3000 and requests
the HTTPS cert. (Leave the `watermark` service with no domain — it's internal.)

---

## Step 4 — Paste secrets (Environment Variables)

Coolify → **Environment Variables** → add these (values from your local
`docV/.env`). Coolify stores them encrypted and injects them at runtime:

```
MONGODB_URI=…
SESSION_SECRET=…
PINATA_API_KEY=…
PINATA_SECRET_API_KEY=…
WEB3_PROVIDER_URL=…
ACCOUNT_ADDRESS=…
PRIVATE_KEY=…
DOC_MASTER_KEY=…            # 32-byte hex — BACK THIS UP, losing it = docs unreadable
EMAIL_USER=…
EMAIL_PASS=…                # a WORKING Gmail app password (see note below)
```

`NODE_ENV`, `PORT`, `OCR_SERVICE_URL`, `RENDER_APP_URL` are already in the
compose file — don't re-add them.

---

## Step 5 — Deploy

Click **Deploy**. Coolify builds both images, starts them, and issues the cert.
When it's green, open **https://docuchain.thecosmicdev.net**.

**Then (optional) turn on Cloudflare proxy:** flip the A record to orange cloud,
and in Cloudflare → SSL/TLS set the mode to **Full (strict)**. This gives you
Cloudflare's CDN/DDoS protection on top. (Full, not Flexible — Flexible causes
redirect loops.)

Redeploy on new commits: Coolify → **Redeploy** (or enable auto-deploy on push).

---

## Before it works — 2 external things (not in Coolify)

1. **MongoDB Atlas → Network Access** → add your VPS IP (or `0.0.0.0/0` if the
   IP is dynamic; then the DB password is your only wall — keep it strong).
2. **Gmail app password** in `EMAIL_PASS` must be valid. The current one is
   rejected (`535 BadCredentials`) — regenerate at
   myaccount.google.com/apppasswords, or OTP + share codes stay broken.

---

## If a deploy errors — quick triage

| Symptom | Fix |
|---------|-----|
| Cert / SSL fails, "challenge failed" | Cloudflare A record is orange — set it **grey (DNS only)**, redeploy. |
| App starts then crashes | Missing env var — check Coolify logs; usually `MONGODB_URI` / `DOC_MASTER_KEY`. |
| Mongo "connection timed out" | VPS IP not whitelisted in Atlas Network Access. |
| Build fails on `watermark` | OpenCV needs `libgl1` — already in `docV/ocr-service/Dockerfile`; just retry the build. |
| 502 after deploy | App still booting or wrong port — the compose exposes 3000; leave the domain on the app service. |
| Emails/OTP fail | Gmail app password invalid — regenerate. |

Logs live in Coolify → your resource → **Logs**. That's where the real error is.
