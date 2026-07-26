# Split hosting — frontend on Cloudflare Pages, backend on VPS

Yes, this works, and the backend was already wired for it (it has a
`CLIENT_ORIGIN` CORS switch + credentialed cookies). One hard rule makes or
breaks it:

> **The backend MUST live on a subdomain of the SAME domain as the frontend.**
> Frontend → `docuchain.thecosmicdev.net` (Pages), backend → `api.docuchain.thecosmicdev.net` (VPS).
> They're then "same-site", so the login **session cookie is sent** on API
> calls. If the backend were on a bare IP or a different domain, browsers treat
> the cookie as third-party and **login silently breaks**. This is the whole
> reason for the subdomain.

Layout:

```
Browser ── https://docuchain.thecosmicdev.net ──────────► Cloudflare Pages (static: index.html, script.js, css)
   │
   └──────── https://api.docuchain.thecosmicdev.net/api ─► VPS / Coolify (Express API + Mongo + IPFS + chain)
                                                  (also serves /share/:id links)
```

---

## 1. Backend on the VPS at `api.docuchain.thecosmicdev.net`

Deploy the backend exactly like before (Coolify — see [COOLIFY.md](COOLIFY.md)),
with two differences:

- **Domain** on the app service → `https://api.docuchain.thecosmicdev.net`
- Add **one env var** so it accepts the Pages frontend:
  ```
  CLIENT_ORIGIN=https://docuchain.thecosmicdev.net
  ```
  (Also keep `RENDER_APP_URL=https://api.docuchain.thecosmicdev.net` — share/QR links are
  served by the backend, so they should point at the API host.)

Cloudflare DNS: add an **A record** `api` → VPS IP, **grey cloud (DNS only)**
until the cert is issued (same Let's Encrypt reason as before).

That's the only backend change — the CORS + preflight + credentialed-cookie
handling is already in `server.js` and activates when `CLIENT_ORIGIN` is set.

---

## 2. Frontend on Cloudflare Pages

The frontend defaults to same-origin. For the split, tell it where the API is by
adding **one line** to `docV/frontend/index.html`, right BEFORE `<script src="script.js">`:

```html
<script>window.API_ORIGIN = "https://api.docuchain.thecosmicdev.net";</script>
```

Then:

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Repo: `IMPACTHONE`, branch `main`.
3. Build settings — it's plain static, no build step:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `docV/frontend`
4. Deploy. You get a `*.pages.dev` URL.
5. **Custom domains** → add `docuchain.thecosmicdev.net` (and `www` if you want). Cloudflare
   wires DNS + HTTPS automatically (Pages custom domains can stay orange-cloud).

Done. Open `https://docuchain.thecosmicdev.net` — the app loads from Pages and talks to
the API on the VPS.

---

## Gotchas (the things that error)

| Symptom | Cause / fix |
|---------|-------------|
| Login "works" then you're logged out on refresh | Backend not on a `docuchain.thecosmicdev.net` subdomain → cookie is third-party. Must be `api.docuchain.thecosmicdev.net`. |
| CORS error in console | `CLIENT_ORIGIN` on the backend must be **exactly** `https://docuchain.thecosmicdev.net` (no trailing slash, right scheme). |
| API cert fails | `api` A record is orange-cloud during first deploy → set grey, redeploy, then re-enable. |
| Share links open a broken page | They point at the API host (`api.docuchain.thecosmicdev.net/share/...`), which serves `share.html` itself — that's expected; don't route `/share` through Pages. |
| Uploads fail with 413 | Cloudflare's free plan caps request body at 100 MB (fine here — app limit is 15 MB), but if you proxy the API through Cloudflare and hit limits, upload straight to `api.` (grey cloud). |

---

## Worth it? (honest take)

The split gives you a global CDN for the static app and takes static-serving load
off the VPS. But you can get ~80% of that benefit with **zero split** — just keep
everything on the VPS (Coolify) and turn the Cloudflare **orange cloud on** in
front of it; Cloudflare then caches your static assets at the edge anyway.

Use the split if you want Pages' instant global static hosting and don't mind two
deploy targets. Use the all-in-one ([COOLIFY.md](COOLIFY.md)) if you want the
simplest thing that's already done.
