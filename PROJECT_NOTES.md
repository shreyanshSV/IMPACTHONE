# DocVerify — Project Notes & Checkpoint

> Quick-resume notes kept inside the project so you can pick up where you left off.
> Last updated: 2026-06-05

## Wallet account selection (added 2026-06-05)

MetaMask used to silently auto-select the active account. Both portals now force
the **account picker** via `wallet_requestPermissions({ eth_accounts: {} })`
before `eth_requestAccounts`, so you choose which account to use:

- **User Portal** → My Profile: when a wallet is linked there are now
  **🔄 Change Wallet** and **🔓 Unlink Wallet** buttons.
  - `linkWallet()` (frontend) forces the picker.
  - `unlinkWallet()` → backend `POST /api/profile/unlink-wallet`
    (session-protected, `$unset`s the field).
- **Issuer Portal** → `issuerConnectAndLogin()` forces the picker on every
  sign-in; it also auto-logs-out on MetaMask account/network change.

Intended setup: **Account 1** (`0x20bc5…`) for the User Portal,
**Account 2** (`0x77A40…`) for the Issuer Portal.

Frontend-only changes apply on browser refresh; backend route changes need a
server restart.

---

---

## Two-portal architecture

The DocVerify app (`docV/`) is one Express server (`docV/server.js`) that serves a
vanilla HTML/JS frontend (`docV/frontend/`) and exposes two portals:

1. **User Portal** (existing) — email/password + session login. Verifies your own
   documents (`/api/verify`, `/api/qr-*`). MetaMask is used only to *sign-to-unlock*
   document details.
2. **Issuer Portal** (new) — pure MetaMask login. An issuer publishes original
   documents on-chain; only the issuer (sender) and the receiver wallets can open a
   published document. Routes under `/api/issuer/*`, Mongo collection
   `issued_documents`, frontend module at the bottom of `docV/frontend/script.js`.

**Smart contracts are deployed via Remix IDE only — never Hardhat / Truffle.**

---

## Current status (DONE)

- Smart contract: `docV/contracts/DocVerifyRegistry.sol`
  - Remix deploy guide: `docV/contracts/README_REMIX.md`
- **Contract DEPLOYED to Sepolia** at:
  - `0xf0Ad70110e8016c2777E09465b40CA43f72a45c5`
  - Deployer / issuer wallet: `0x20bc5c436122c2d38E4E28D5e7f87eD7Ec0bBc75`
    (same as `ACCOUNT_ADDRESS` in `.env`)
  - Verified on Sourcify / Blockscout
  - Deployed in Remix via: Environment **"Browser Extension"** →
    **"Sepolia Testnet - MetaMask"**
- Address already pasted into `docV/frontend/contract.js` (`CONTRACT_ADDRESS`),
  which also holds the ABI + Sepolia chain config.
- Backend routes added in `docV/server.js`:
  - `POST /api/issuer/upload`  — pins file to IPFS (Pinata), returns keccak fileHash
  - `POST /api/issuer/record`  — mirrors the on-chain record in Mongo
  - `POST /api/issuer/documents` — lists docs issued by OR received by a wallet
  - `POST /api/issuer/documents/:docId/view` — fetch IPFS content (issuer/receiver only)
  - All are signature-gated via `verifyWalletSignature(...)`.
  - New model: `IssuedDocument` → collection `issued_documents`.
- Frontend:
  - Landing page has two buttons: **User Portal** / **Issuer Portal**.
  - Issuer auth page `#issuerAuthPage` + dashboard `#issuerDashboard` in
    `docV/frontend/index.html`.
  - Issuer JS appended to bottom of `docV/frontend/script.js`
    (showIssuerPortal, issuerConnectAndLogin, showIssuerSection, handleIssuerPublish,
    loadIssuerDocuments, viewIssuerDocument).
  - `ethers.js` v5.7.2 UMD loaded via CDN.

---

## How the issuer flow works

1. Issuer connects MetaMask + signs a login message (no gas).
2. Publish: file → `/api/issuer/upload` (IPFS pin + keccak fileHash) →
   frontend calls `contract.issueDocument(...)` via the issuer's MetaMask
   (**issuer pays the gas**) → `/api/issuer/record` mirrors it in Mongo.
3. Access: only issuer + receiver wallets can open a doc — enforced in the backend
   view route AND on-chain via `canAccess(docId, wallet)`.

---

## STATUS: ✅ WORKING END-TO-END (verified 2026-06-05)

- [x] Server boots on port 5000; `/api/issuer/*` routes live & signature-gated.
- [x] Contract confirmed on-chain at `0xf0Ad...45c5` (Sepolia).
- [x] **Full publish flow tested & working:** Account 2 (issuer) published a doc
      to Account 1 (receiver). File pinned to IPFS, recorded on-chain, mirrored
      in Mongo. Receiver (Account 1) signed in and successfully received/opened
      the document. Access control confirmed.

### Bug fixed during testing (multipart newline)
The MetaMask login message originally used `\n` line breaks. When sent as a
multipart/form-data field during file upload, browsers normalise `\n` → `\r\n`,
which changed the signed bytes and broke signature recovery on the server
("Invalid MetaMask signature"). **Fix:** the login message in
`issuerConnectAndLogin()` is now a single line (no `\n`, uses ` | ` separators).
Keep it that way. Temporary `🔎 sig-verify` debug logs were removed after the fix.

## SITE-GATED DOCUMENT VAULT (2026-06-21)
Replaced client-side AES with **server-gated encryption** so a document can only
be decrypted on our site (with the passphrase), not by anyone holding CID+passphrase.
- `docV/services/vaultService.js`: AES-256-GCM, key = scrypt(passphrase | DOC_MASTER_KEY, salt).
  Blob = MAGIC "DVSITE01" | salt | iv | tag | ciphertext. `DOC_MASTER_KEY` in `.env`
  (32-byte hex; REQUIRED to encrypt/decrypt; back it up — loss = unrecoverable docs).
- Publish: client sends PLAINTEXT + passphrase to `/api/issuer/upload`; server
  watermarks (if svc) → fingerprints plaintext (sha256/pHash so 5-layer still works)
  → `vaultEncrypt` → pins ciphertext. Server never stores passphrase/plaintext.
- View: `/api/issuer/documents/:id/view` + `/api/received-documents/:id/view` detect
  vault blobs and return HTTP 428 needsPassphrase; client prompts on-site, resends;
  server `vaultDecrypt`s and returns plaintext. Frontend helper `siteGatedFetch()`.
- Trade-off (intended): NOT zero-knowledge — server can decrypt during a gated view.
  That's required for "only opens on our site". Old client-encrypted (DOCVENC1) docs
  must be re-published.

## FIXES + SECURITY HARDENING (2026-06-21)
- **Wallet persistence fix:** `handleSignin` only stored `{fullName}` from the
  signin response, so the linked wallet looked "unlinked" until a page reload.
  Now it fetches `/api/profile` after login (incl. walletAddress); header shows
  Linked/Not-Linked from the DB. Added `reconnectLinkedWallet()` (silent
  `eth_accounts`). The link lives in the DB (`users.walletAddress`) and persists.
- **Download original:** Received Documents cards got a **Download** button
  (`downloadReceivedDocument`) + shared `fetchReceivedDoc()` helper (sign → fetch
  → decrypt). Lets recipients save the original to re-upload to Authenticity Check.
- **Security hardening pass (server.js):** added `helmet` (HSTS, nosniff,
  X-Frame-Options; CSP/COEP off for CDN), `express-mongo-sanitize` (NoSQL
  injection), `express-rate-limit` (authLimiter 20/15min on /api/auth/*,
  heavyLimiter 40/15min on /api/verify, /api/security/check, /api/issuer/upload),
  multer limits (15MB + mime allow-list incl. octet-stream for encrypted blobs)
  via `handleUpload()`, CORS now gated by `CLIENT_ORIGIN` env (default same-origin).
  Deps added: helmet, express-rate-limit, express-mongo-sanitize.
- **CLIENT ACTION (not code):** rotate ALL secrets in `.env` (PRIVATE_KEY,
  MONGODB_URI pwd, PINATA_*, GEMINI_API_KEY, EMAIL_PASS, SESSION_SECRET) — they
  were exposed. For prod: HTTPS + NODE_ENV=production (enables secure cookie).

## 5-LAYER SECURITY + RECIPIENT DELIVERY (2026-06-21)
Implemented the 5-layer anti-copy system natively in the Express app + a Python
micro-service for L2, and made issued documents reach the recipient's User Portal.

**5-layer (`docV/services/securityService.js`):**
- L1 SHA-256 (Node crypto), L3 perceptual hash (jimp, `img.hash(2)` + Hamming),
  L4 AI forensics (Gemini vision — moiré/scan-line/photo detection), L5 blockchain
  (existing contract). L2 invisible watermark = optional Python service.
- Orchestrator `runSecurityCheck()` + weighted `computeVerdict()` (score 0-100,
  hard-fail on hash mismatch / broken watermark / AI=copy / no on-chain record /
  pHash not similar).
- Endpoint `POST /api/security/check` (session-gated): fingerprints upload, finds
  registered original by exact SHA-256 then nearest pHash, runs all layers,
  returns verdict + per-layer detail. UI: User Portal → "Authenticity Check".
- Fingerprints captured at Issuer publish: `/api/issuer/upload` now generates the
  docId server-side, embeds the watermark (if service running), and stores
  sha256/pHash/watermarked. `issued_documents` schema gained those fields.

**Python micro-service (`docV/ocr-service/`):** FastAPI `main.py` +
requirements.txt + README. Endpoints: /watermark/embed, /watermark/verify,
/phash/compute, /phash/compare, /ocr (PaddleOCR optional), /health. Enable by
setting `OCR_SERVICE_URL=http://localhost:8100` in `.env`. App degrades
gracefully when it's off (L2 reports "not available").

**Recipient delivery (email + wallet):** Issuer publish form has a Recipient
Email field; `issued_documents.receiverEmail` stored; recipient emailed on
publish. User Portal → "Received Documents" lists docs where receiverEmail==user
email OR receiverWallet==user's linked wallet. Endpoints:
`GET /api/received-documents`, `POST /api/received-documents/:docId/view`
(MetaMask-signature gated; decrypts client-side if encrypted).

**Deps:** added `jimp@0.22.12` (installed with `--legacy-peer-deps`).

## LUXE UI PASS (2026-06-06)
Issuer Portal restyled to a premium dark theme: deep emerald/charcoal `luxe-bg`
with gold (#F59E0B family) accents + glassmorphism. Added reusable classes in
`frontend/style.css`: `.luxe-bg`, `.luxe-grid`, `.luxe-card`, `.luxe-card-soft`,
`.luxe-hover`, `.luxe-input`, `.gold-text`, `.luxe-divider`, `.btn-gold`,
`.btn-emerald-glass`, `.luxe-shimmer`. Added a `gold` palette to the Tailwind
config in `index.html`. Login, dashboard header/tabs, publish form, document
cards, filter chips, skeleton, empty/error states, publish result, and the
passphrase modal all converted to the dark+gold luxe look. User Portal left as-is.

## TASK LIST (2026-06-06)

- [x] **1. Better Issuer Portal UI** — DONE. Redesigned login (trust signals,
      SVG icons, focus rings), dashboard header (network badge, wallet badge with
      copy), tabs with SVG icons, publish form (drag-drop file zone, required
      markers, validation), documents list (filter chips All/Issued/Received,
      skeleton loading, rich empty state, error+retry, per-card copy + tx link).
      Emoji icons removed from the issuer portal (replaced with Heroicons SVG).
      Helpers added: `ISSUER_ICONS`, `copyToClipboard`, `issuerKvRow`,
      `issuerTxUrl`. Landing-page portal buttons also use SVG icons now.
- [x] **2. Client-side file encryption before IPFS** — DONE (passphrase-based AES).
      Web Crypto API: PBKDF2(150k, SHA-256) → AES-GCM-256. File encrypted in the
      browser before upload; server/IPFS only ever see ciphertext. Self-describing
      blob format: magic `DOCVENC1` | mimeLen | mime | salt(16) | iv(12) | cipher.
      Publish form has an "Encrypt file" toggle + passphrase/confirm. Viewer
      (`viewIssuerDocument`) detects the magic header, shows `promptPassphrase`
      modal, decrypts in-browser. Wrong passphrase → AES-GCM auth fail → friendly
      error. `encrypted` flag stored in Mongo + shown as a lock badge in the list.
      Helpers: `dvEncryptFile`, `dvDecrypt`, `dvIsEncrypted`, `dvDeriveKey`,
      `promptPassphrase`. ⚠️ MetaMask removed eth_decrypt/eth_getEncryptionPublicKey
      so true wallet-to-wallet encryption isn't possible; passphrase is shared
      out-of-band. Lost passphrase = unrecoverable file.
- [x] **3. On-chain verify + tx links in My Documents** — DONE. Each card has a
      "Verify" button (`verifyIssuerDocument` reads `getDocument` via JSON-RPC and
      compares fileHash + issuer + receiver) and a "View tx" Etherscan link.
      Publish success panel also shows the tx link + copy buttons.
- [x] **4. Read listings from the contract** — DONE. `loadIssuerDocumentsFromChain`
      reads `getIssuedDocs`/`getReceivedDocs` + `getDocument` directly from the
      contract; used as automatic fallback if the backend/Mongo is unavailable.

To (re)start the server: `cd docV; npm start`
- Possible future enhancement: client-side encryption of files before IPFS upload
  (right now IPFS content is public; only the app gates access).

### Handy facts
- App port: **5000** (`PORT` in `docV/.env`). `API_BASE_URL` in `script.js` =
  `http://localhost:5000/api`.
- Network: **Sepolia testnet** (`WEB3_PROVIDER_URL` is an Infura Sepolia endpoint).
- Need a little Sepolia test ETH in the issuer wallet to publish (pays gas).

## DV3D — 3D DEPTH + PREMIUM UI LAYER (2026-07-06)
Site-wide "Modern Dark Cinema" 3D upgrade, purely additive (no logic touched):
- `frontend/dv3d.css` — design tokens, ambient blob styles, glass sidebar/header,
  card elevation + hover glow, pointer glare, CTA glows, dark scrollbars,
  focus-visible rings, cursor/touch-action fixes, reduced-motion support.
- `frontend/dv3d.js` — injects a `.dv3d-stage` (3 drifting glow blobs + Three.js
  particle depth-field w/ pointer parallax) behind #dashboard (sky) and
  #issuerDashboard (gold); blobs-only on both auth pages. ONE shared renderer,
  moved between pages via `ds:pagechange`, paused on tab-hidden, DPR≤1.5.
  Also a DELEGATED 3D tilt+glare engine for dynamic cards (received-docs,
  shared-with-me, issuer docs, `[data-tilt-3d]` opt-in) — excludes `.fixed`
  modals, panels >620px tall, touch, reduced-motion.
- Three.js r149 via CDN (defer); everything degrades gracefully without it.
- `share.html` got CSS-only blobs + `.dv-glass` surfaces (no new JS for recipients).
- Landing page untouched (keeps its own dogstudio shader hero).
- Stacking: stage is z-0 first-child; content lifted via `#dashboard.ds-dark >
  div.flex-1` and `#issuerDashboard > header/main` (relative z-1). Do NOT add
  transforms to those wrappers (would break fixed children).
- Tested via jsdom: 8/8 stage-lifecycle, Lenis gating regression, share.html JS.

## SCROLL FIX — Lenis vs inner-scroll (2026-06-29)
Dashboard / Received Documents wouldn't scroll. Cause: `dogstudio.js` ran **Lenis
smooth-scroll globally** (hijacks the window wheel), but the app pages scroll inside
an inner `<main class="flex-1 overflow-y-auto">` (wrapper is `h-screen
overflow-hidden`), so the wheel never reached it. Fix: Lenis is now **enabled only
on `guestPage` and `destroy()`-ed on every app page** via the `ds:pagechange`
handler (`enableLenis`/`disableLenis` in `dogstudio.js`); `stop()` won't work — it
keeps preventing default. Added `data-lenis-prevent` to both `<main>` scrollers as
insurance. Frontend-only → just hard-refresh the browser (no server restart).

## SECURE DOCUMENT SHARING (2026-06-29)
Temporary, encrypted, revocable sharing for any doc in My Documents (issuer) and
Received Documents (user). **Shares are OFF-chain by design** — the blockchain
proves authenticity (permanent); a share is a private, expiring, revocable grant.

**Files:** `docV/services/shareService.js` (AES-256-GCM share crypto, capability
tokens, password/OTP helpers), share routes + `DocumentShare`/`ShareAccessLog`
models in `docV/server.js`, standalone recipient page `docV/frontend/share.html`
(served at `/share/:shareId`), share modal + "Shared with me" in
`docV/frontend/script.js`. Visible per-viewer watermark = `watermarkImage()` in
`securityService.js` (jimp). **No new env vars** — reuses `DOC_MASTER_KEY`
(required) + `EMAIL_USER/PASS` (only for the email-code gate).

**Per-share options (owner picks in the Share modal):**
- Expiry: 1h / 24h / 7d / custom (max 90 days). Enforced on every open **+**
  Mongo TTL index auto-deletes the record at `expiresAt` → the wrapped key dies
  with it = cryptographic erasure.
- Audience: `link` (anyone with the link) or `user` (a registered DocVerify user
  by email/wallet — appears under "Shared with me", opened with their session).
- Gate: `none` / `otp` (one-time code emailed to the recipient) / `password`.
- Tier: `server` (re-encrypted copy on IPFS, server decrypts at view time →
  enables per-viewer watermark + view-only; NOT zero-knowledge) or `zk`
  (zero-knowledge: browser encrypts, key rides in the link `#fragment`, server
  stores only ciphertext and can never read it — link audience only, no watermark).
- Max opens (optional).

**Routes** (all before the catch-all): `POST /api/shares` (server tier create),
`POST /api/shares/zk` (multipart ciphertext upload), `GET /api/shares/:id/meta`,
`POST /api/shares/:id/open`, `POST /api/shares/:id/send-code`,
`POST /api/shares/:id/revoke` (crypto-erases wrapped key + best-effort unpin),
`POST /api/shares/list` (manage, owner-auth), `GET /api/shares/received`
(session), `POST /api/shares/:id/audit` (owner-auth). Open route is rate-limited
(`shareLimiter`); OTP has a 5-try cap; capability token stored only as SHA-256.

**Link shape:** `/share/<shareId>#t=<token>` (server tier) or
`...#t=<token>&k=<key>` (zk). Token + key live only in the `#fragment` (never sent
in the URL path → not logged); the page reads them and posts in the body.

**Create flow (fixed 2026-06-29):** the browser uploads the document's DECRYPTED
bytes (same path the View button uses → `getDocPlaintextBlob`) for BOTH tiers —
server tier uploads plaintext (multipart, server re-encrypts the share copy), zk
uploads ciphertext. This preserves the correct file type (server `sniffMime()` +
client sniff in `share.html`) and means sharing a Received doc now prompts
MetaMask (the doc-fetch signature) — that's the "confirmation" the owner sees.
Older **client-encrypted (DOCVENC1)** docs can't be decrypted client-side anymore
(`dvDecrypt` is dead code), so sharing them now fails fast with a clear
"re-publish" message instead of a broken link.

**Known limits / TODO:** view-only is a deterrent, not DRM (watermark is the real
traceability); PDFs get no *visible* watermark (jimp is raster-only); `user`+`otp`
combo isn't wired in the in-portal opener (rare; password gate is); DOCVENC1 docs
must be re-published to be shareable.
