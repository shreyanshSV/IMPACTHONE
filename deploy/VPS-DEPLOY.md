# DocVerify — VPS deployment (your server + your domain) → then Android APK

One-time setup to host DocVerify (app + watermark service) on your VPS behind
HTTPS on your domain, then wrap the hosted site as an installable Android APK.

Assumes: a fresh Ubuntu VPS, root/sudo, and a domain whose DNS you control.

---

## 1. Point the domain at the VPS (DNS)

In your DNS provider, add an **A record**:

| Type | Name | Value |
|------|------|-------|
| A | `docverify` (or `@` for the root) | `<your VPS public IP>` |

Wait for it to resolve: `ping docverify.yourdomain.com` should show the VPS IP.
Everything below uses `YOUR_DOMAIN` = that hostname.

---

## 2. Install Docker + nginx + certbot on the VPS

```bash
curl -fsSL https://get.docker.com | sh          # Docker + compose plugin
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## 3. Get the code + secrets onto the VPS

```bash
git clone <your repo> docverify && cd docverify
nano docV/.env            # paste your real secrets (see checklist below)
```

`docV/.env` must contain (same values you use locally, production-tuned):
```
MONGODB_URI=…             SESSION_SECRET=…
PINATA_API_KEY=…          PINATA_SECRET_API_KEY=…
WEB3_PROVIDER_URL=…       ACCOUNT_ADDRESS=…   PRIVATE_KEY=…
DOC_MASTER_KEY=…          # 32-byte hex — BACK IT UP
EMAIL_USER=…              EMAIL_PASS=…        # working Gmail app password
# OCR_SERVICE_URL is set by docker-compose to http://watermark:8100 — leave unset here
NODE_ENV=production
# CLIENT_ORIGIN not needed (same-origin); leave unset
```
`.env` is gitignored and excluded from the Docker image — it never leaves the server.

---

## 4. Set your domain in the compose file

Edit `docker-compose.yml` → `RENDER_APP_URL: "https://YOUR_DOMAIN"` (used in QR
links + emails).

## 5. Build + run the containers

```bash
docker compose up -d --build
docker compose ps           # app (127.0.0.1:5000) + watermark (internal) up
curl -s localhost:5000 | head -c 100    # sanity: HTML comes back
```

The app is bound to `127.0.0.1:5000` only — not exposed to the internet yet.
nginx will front it with HTTPS next.

---

## 6. nginx + HTTPS

```bash
sudo cp deploy/nginx-docverify.conf /etc/nginx/sites-available/docverify
sudo sed -i "s/YOUR_DOMAIN/docverify.yourdomain.com/g" /etc/nginx/sites-available/docverify
sudo ln -s /etc/nginx/sites-available/docverify /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d docverify.yourdomain.com   # free HTTPS cert, auto-renews
```

Visit `https://docverify.yourdomain.com` — the app is live. Set
`NODE_ENV=production` (done) so the session cookie is `secure`.

### External checklist (do once)
- **MongoDB Atlas → Network Access:** allow the VPS IP (or `0.0.0.0/0` if the
  VPS IP is dynamic — then the DB password is the wall, so keep it strong).
- **Gmail:** a valid app password in `EMAIL_PASS` (OTP + share codes depend on it).
- **Issuer wallet:** a little Sepolia test ETH for gas (free faucet).

### Updating later
```bash
git pull && docker compose up -d --build
```

---

## 7. Build the Android APK (wraps the hosted site)

On your **dev machine** (needs Android Studio installed once):

```bash
cd docV
npm i -D @capacitor/cli
npm i @capacitor/core @capacitor/android
npx cap init DocVerify com.docverify.app --web-dir=frontend
```

Edit the generated `capacitor.config.json` to point at your live site:
```json
{
  "appId": "com.docverify.app",
  "appName": "DocVerify",
  "webDir": "frontend",
  "server": { "url": "https://docverify.yourdomain.com", "androidScheme": "https" }
}
```

```bash
npx cap add android
npx cap open android     # Android Studio → Build → Build Bundle(s)/APK(s) → Build APK
```

APK output: `docV/android/app/build/outputs/apk/debug/app-debug.apk`.
Install on a phone (enable "install unknown apps") or upload to Play Store.

### Mobile note — MetaMask
A WebView has no `window.ethereum`, so wallet-gated actions (opening received
docs, issuer publishing) won't sign inside the APK. Two options:
1. Ship the APK for **recipients/viewers** (email+OTP login, dashboard,
   analytics, authenticity check, share links all work). For wallet actions,
   users open the same site in the **MetaMask mobile app browser**.
2. Add **WalletConnect** later for native in-app signing (~a day of work).
