# Deploying DocVerify (live demo URL)

The app is a Node/Express server that also serves the frontend, so one web
service hosts everything. Easiest free option: **Render** (Docker blueprint
included). The frontend uses a same-origin API path, so it works on any domain.

## Option A — Render (recommended, free)

1. Push the repo to GitHub (done: `shreyanshSV/DOC-BLOCK`).
2. Go to **https://render.com** → sign up → **New → Blueprint**.
3. Connect the repo. Render reads **`render.yaml`** and creates the `docverify`
   web service (Docker, root dir `docV`).
4. When prompted, fill the **secret env vars** (these are NOT in the repo):
   `MONGODB_URI, SESSION_SECRET, WEB3_PROVIDER_URL, ACCOUNT_ADDRESS, PRIVATE_KEY,
   PINATA_API_KEY, PINATA_SECRET_API_KEY, GEMINI_API_KEY, EMAIL_USER, EMAIL_PASS,
   DOC_MASTER_KEY`  (leave `OCR_SERVICE_URL` blank unless you host the Python service).
5. **Deploy.** You get a URL like `https://docverify.onrender.com`.

### Required external setup
- **MongoDB Atlas → Network Access:** add `0.0.0.0/0` (allow from anywhere) so
  Render can connect.
- Pinata / Gemini / Infura keys must be valid.
- The Sepolia contract is already deployed (`0xf0Ad…45c5`).

## Option B — Any Docker host (Coolify, VPS, Railway, Fly.io)
Build context is `docV/`:
```bash
cd docV
docker build -t docverify .
docker run -p 3000:3000 --env-file .env docverify
```
Put it behind HTTPS (the platform usually does this).

## Notes
- **Use HTTPS** in production. With `NODE_ENV=production` the session cookie is
  marked secure — so it only works over HTTPS (which Render provides).
- **Rotate all secrets** before going live (they were exposed during development).
- The free Render tier sleeps when idle and cold-starts on the next request
  (first load can take ~30s). Fine for a demo.
- MetaMask actions still require the user to be on **Sepolia** with test ETH.
