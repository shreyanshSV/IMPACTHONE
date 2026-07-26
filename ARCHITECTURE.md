# DocVerify — System Architecture (Full Detail)

**Blockchain document verification & publishing platform** with mandatory
AES-256 encryption, a 4-layer anti-copy authenticity system, temporary
encrypted sharing (ShareSecure), and WhatsApp/email automation.

- **Version:** 4.0 (current build)
- **Last updated:** 2026-07-07
- **Stack:** Node.js + Express (single server) · Vanilla JS + Tailwind (served SPA) · MongoDB Atlas · IPFS (Pinata) · Ethereum Sepolia · Python FastAPI (watermark micro-service) · n8n (VPS automation)
- **Deployed contract:** `DocVerifyRegistry.sol` @ `0xf0Ad70110e8016c2777E09465b40CA43f72a45c5` (Sepolia, deployed via Remix + MetaMask — never Hardhat/Truffle)

> This document describes the **actual running build** in prose. Companion
> documents: [`sharesecure.md`](sharesecure.md) (sharing research report),
> [`encryption-reference.md`](encryption-reference.md) (every crypto function
> with file/line), [`security-basics.md`](security-basics.md) (plain-English
> primer), [`PROJECT_NOTES.md`](PROJECT_NOTES.md) (change log / checkpoints).

---

## 1. Design philosophy

The entire system is organized around one rule — **no data bridge**:

> A readable document exists in exactly three places, ever: the owner's
> browser, the authorized viewer's browser, and (transiently) the server's RAM
> during an authorized action. Everywhere data *rests* (MongoDB, IPFS) or
> *travels between systems* (email, WhatsApp, webhooks), there is only
> ciphertext, one-way hashes, or links — never the document.

Five principles follow from it:

1. **Shares are off-chain by design.** A blockchain is public and permanent —
   the exact opposite of a share, which must be private, temporary and
   revocable. So the chain proves *authenticity* (permanent facts), while
   MongoDB grants — and erases — *access* (temporary permissions).
2. **Encryption is mandatory; the passphrase is optional.** Storage never sees
   plaintext, but the common case stays one-click: without a passphrase the
   server can decrypt with its master key for authorized viewers; with one,
   nobody — including the server — can open the file until it is typed.
3. **Expiry means key destruction, not a flag.** When a share expires or is
   revoked, the only key that can decrypt it is deleted. The leftover
   ciphertext on IPFS becomes mathematically unreadable, even to us.
4. **No third party ever reads a document.** Google Gemini (OCR + AI
   forensics) and cloud OCR were removed from the pipeline. Watermarking is
   self-hosted. Email/WhatsApp carry links and codes only. IPFS holds
   ciphertext only.
5. **Deterministic layers gate; heuristic layers advise.** Cryptographic
   checks (SHA-256, on-chain record) can reject a document. Heuristics
   (invisible watermark, perceptual hash) contribute to a score but can never
   override an exact cryptographic match.

---

## 2. Actors

**Issuer (organisation).** Authenticates purely with MetaMask: the portal
requests the account picker, then the issuer signs a one-line login message
(single line on purpose — multipart forms normalize `\n` to `\r\n`, which
breaks signature recovery). Every issuer API call carries
`{walletAddress, signature, message}`; the server recovers the signer address
and compares it checksummed. The issuer pays the gas for on-chain publishing.

**User / Recipient.** Registers with email + password; email ownership is
proven with a 6-digit OTP (5-minute TTL, stored in Mongo with an expiring
index). Sessions are Express sessions persisted in MongoDB (7-day cookie,
`secure` in production, `sameSite: lax`). A user may optionally link a wallet
(MetaMask account picker, stored checksummed in `users.walletAddress`);
documents reach them matched by **either** their email **or** their linked
wallet. Opening a received document additionally requires a fresh MetaMask
signature (`personal_sign` over `Open received document: <docId>`).

**External Viewer.** No account at all. Receives a share link
(`/share/<shareId>#t=<token>[&k=<key>]`) and interacts only with the public
share endpoints and the standalone `share.html` page.

---

## 3. Components

### 3.1 Express server (`docV/server.js`)

One Node.js process serves everything: static frontend, REST API, and all
business logic. There is no build step and no separate API gateway.

Middleware stack, in order: `trust proxy` → helmet (HSTS, nosniff,
X-Frame-Options; CSP/COEP off because the UI loads CDN scripts) → CORS
restricted to `CLIENT_ORIGIN` (defaults to same-origin) → JSON body parser
(20 MB) → `express-mongo-sanitize` (strips `$`/`.` keys, blocks NoSQL operator
injection) → three rate limiters:

| Limiter | Window | Max | Applied to |
|---|---|---|---|
| `authLimiter` | 15 min | 20/IP | `/api/auth/*` (password + OTP guessing) |
| `heavyLimiter` | 15 min | 40/IP | `/api/verify`, `/api/security/check`, `/api/issuer/upload`, share creation |
| `shareLimiter` | 15 min | 60/IP | public share endpoints (`meta`, `open`, `send-code`) |

File uploads go through multer (memory storage, 15 MB cap, mime allow-list:
PNG/JPEG/WEBP/PDF/octet-stream — the last because encrypted blobs are opaque).

### 3.2 Vault (`docV/services/vaultService.js`)

The at-rest encryption layer. Format:
`"DVSITE01"(8) ‖ salt(16) ‖ iv(12) ‖ authTag(16) ‖ ciphertext`.

- Cipher: **AES-256-GCM** (authenticated — any tampering makes decryption fail
  closed rather than return corrupted plaintext).
- Key derivation: `scrypt(passphrase + "|" + DOC_MASTER_KEY, salt, 32)` with
  `N=2^14, r=8, p=1` (memory-hard, anti-brute-force).
- `passphrase` may be the empty string → **server-key encryption** (the master
  key alone decrypts; used for every document unless the issuer opts into a
  passphrase). Non-empty → **passphrase-protected** (server cannot decrypt
  without user input; wrong passphrase fails the GCM auth check).
- `DOC_MASTER_KEY` is a 32-byte hex secret that exists **only** in the server
  environment (`.env`). It is never written to the database, never sent to a
  client, never logged. Losing it makes every encrypted document unrecoverable.

### 3.3 Security service (`docV/services/securityService.js`)

Houses the authenticity-check primitives and the visible share watermarks:

- `computeSha256` — exact byte fingerprint (Node crypto).
- `computePHash` / `comparePHash` — 64-bit perceptual hash via jimp
  (`img.hash(2)`), compared by Hamming distance: ≤ 5 identical, ≤ 15 similar,
  \> 15 different. Images only (returns null for PDFs).
- `verifyWatermark` / `embedWatermark` — HTTP clients for the Python service.
- `watermarkImage` (jimp) and `watermarkPdf` (pdf-lib) — **visible** per-viewer
  watermarks tiled across shared documents at view time (viewer identity +
  doc + timestamp), dispatched by mime through `watermarkDocument`.
- `runSecurityCheck` + `computeVerdict` — the 4-layer orchestrator (§5).

### 3.4 Share service (`docV/services/shareService.js`)

ShareSecure's crypto (§6): per-share data keys, key wrapping under the master
key (domain-separated by the fixed scrypt label `"docverify-share-wrap-v1"`),
256-bit capability tokens (stored only as SHA-256 hashes, compared with
`timingSafeEqual`), scrypt password hashing, and 6-digit OTP generation.
Share blob format: `"DVSHARE1"(8) ‖ iv(12) ‖ authTag(16) ‖ ciphertext`.

### 3.5 Watermark micro-service (`docV/ocr-service/`, Python FastAPI, port 8100)

Self-hosted — not a third party. Endpoints `/watermark/embed` and
`/watermark/verify` implement an **invisible DWT-DCT watermark** (via
`invisible-watermark`/OpenCV) that hides the full 66-char docId inside the
image's frequency domain. Screenshots, photocopies and heavy re-encoding
destroy the mark — that is the point: its absence on a *watermarked original*
signals a copy. The Node app degrades gracefully when the service is down
(`OCR_SERVICE_URL` unset → layer reports "not available", verdict unaffected).
OCR endpoints exist in the service but are disabled/unused by design.

### 3.6 Frontend (`docV/frontend/`)

Vanilla JS single-page app, no bundler:

- `index.html` — shell containing four "pages" toggled by `showPage()`:
  landing (`guestPage`), auth (`authPage`), User Portal (`dashboard`), Issuer
  Portal (`issuerAuthPage` + `issuerDashboard`).
- `script.js` (~5k lines) — all application logic; sections render into
  `#dashboard-content` via `showDashboardSection()`. User Portal menu is
  trimmed to what is actually used: **Dashboard · Analytics · Authenticity ·
  Received** (Inventory/Verify/QR/Share views still exist in code but are
  unreachable from navigation).
- `share.html` — standalone, minimal page for external share viewers: parses
  the URL fragment, drives the gate UI, renders view-only (images/PDFs),
  performs in-browser AES-GCM decryption for zero-knowledge shares. Sets
  `robots: noindex` and `Referrer-Policy: no-referrer`.
- `dogstudio.{js,css}` — motion layer: preloader, custom cursor, GSAP reveals,
  WebGL hero shader. **Lenis smooth-scroll runs only on the landing page** and
  is destroyed on app pages (it otherwise swallows the wheel events needed by
  the dashboard's inner scroll container).
- `dv3d.{js,css}` — 3D/premium UI layer: a Three.js particle depth-field
  behind the dashboards (one shared renderer, moved between pages, paused when
  the tab is hidden, DPR capped at 1.5), ambient aurora blobs, frosted-glass
  sidebar/headers, layered card elevation, and a delegated pointer-tilt +
  glare effect on document cards. Fully additive; degrades gracefully without
  Three.js and honors `prefers-reduced-motion`.

### 3.7 Blockchain (`docV/contracts/DocVerifyRegistry.sol`, Sepolia)

The registry stores, per `docId` (a keccak-256 of a UUID + timestamp):
`fileHash` (keccak-256 of the stored bytes), `issuer`, `receiver`, `ipfsCID`,
`docType`, `docNumber`, `issuedAt`. Reads used by the app: `getDocument`,
`getIssuedDocs(wallet)`, `getReceivedDocs(wallet)`, `canAccess(docId, wallet)`.
The frontend can list documents **directly from the contract** as a fallback
when Mongo is unavailable. Writes happen only from the issuer's MetaMask —
the server never holds gas keys for publishing.

### 3.8 Automation (n8n on the user's VPS)

`notifyN8N(event, payload)` fire-and-forgets a JSON POST to `N8N_WEBHOOK_URL`
(optional shared secret in the `x-webhook-token` header) on two events:
`document_verified` (legacy verify flow succeeds) and `authenticity_passed`
(4-layer check returns VERIFIED). Payload: user name/email/phone + document
metadata + score — **never file content**. n8n routes it to WhatsApp Business
API and email. Failures are logged and never block the user-facing response.

---

## 4. Data stores

### 4.1 MongoDB collections

| Collection | Purpose / notable fields |
|---|---|
| `users` | fullName, email (unique), bcrypt password hash, phone, walletAddress (checksummed, sparse-unique) |
| `otps` | email + code, TTL index `expires: 300s` (auto-purge) |
| `sessions` | Express session store (7-day expiry) |
| `documentverifications` | legacy Verify-flow records: docId, docType/Number, fileHash (keccak), transactionHash, verificationStatus, documentCID, qrId, `encrypted`, `passphraseProtected`, mimeType |
| `issued_documents` | publish flow: docId (bytes32), fileHash (keccak of stored bytes), **sha256 + pHash of the plaintext** (so the 4-layer check works on encrypted docs), watermarked flag, issuerWallet, receiverWallet, receiverEmail, documentCID, mimeType/fileName, transactionHash, `encrypted`, `passphraseProtected` |
| `document_shares` | shareId (UUID), docId, owner, audience (`link`/`user`), gate (`none`/`otp`/`password`), tier (`server`/`zk`), `tokenHash` (SHA-256 of the link secret — never the secret), passwordSalt/Hash (scrypt), otpCodeHash + attempts counter, shareCID, **wrappedKey** (per-share key encrypted under the master key; deleted on revoke), zkMeta (iv only), expiresAt with **TTL index** (Mongo deletes the row — and thus the wrapped key — at expiry), maxViews/viewCount, revoked |
| `share_access_logs` | append-only audit: shareId, event (`created/opened/denied/gate_sent/gate_failed/revoked`), detail, IP, user-agent, timestamp |

Secrets policy: the database stores **only one-way hashes** of link tokens,
share passwords and OTP codes; the master key never enters it; per-share keys
enter it only *wrapped* (useless without the master key).

### 4.2 IPFS (Pinata)

Holds two blob types, both opaque: `DVSITE01` vault blobs and `DVSHARE1` share
blobs. Pinata sees random-looking bytes and a CID — it cannot read any
document. Unpinning on revoke is best-effort; the *guarantee* of
unreadability comes from key destruction, not byte deletion (content-addressed
networks cannot promise deletion).

---

## 5. The 4-Layer Authenticity Check

**Goal:** given any uploaded file, decide whether it is the genuine registered
original or a copy (screenshot, photocopy, phone photo, re-save, edit).

**Step 1 — find the reference.** Try an exact `sha256` match in
`issued_documents`; if none and the upload is an image, find the nearest
`pHash` (best Hamming distance ≤ 15). No match → nothing to compare against →
cannot verify.

**Step 2 — run the layers** against the matched original's stored fingerprints:

| Layer | Question | Method | Weight | Hard fail? |
|---|---|---|---|---|
| L1 | Bytes identical? | SHA-256 compare | 40 | **Yes** on mismatch |
| L2 | Hidden mark intact? | DWT-DCT extract == docId (only if the original was watermarked) | 20 | No — **advisory** |
| L3 | Looks identical? | pHash Hamming distance | 25 (identical) / 12 (similar) | **Yes** beyond "similar" |
| L5 | Registered on-chain? | transactionHash exists for the match | 15 | **Yes** if absent |

**Verdict math:** `score = points_earned / weight_of_layers_that_ran × 100`.
`VERIFIED` ⇔ no hard failure **and** (exact SHA-256 match **or** score ≥ 60).
An exact byte match is treated as definitive proof of originality: a misread
watermark (common on small or re-encoded images — the 66-char payload needs
pixels to live in) cannot overturn it. The old L4 (Gemini vision forensics)
was deliberately removed — it uploaded the document to Google, which violates
principle 4; the remaining layers all run in-process or on self-hosted
infrastructure.

On VERIFIED: the n8n webhook fires (WhatsApp + email), including the score and
document metadata.

---

## 6. ShareSecure (temporary encrypted sharing)

A share is a **temporary, revocable capability** to view one document,
stored off-chain (principle 1). The owner composes it from four orthogonal
choices:

- **Audience** — `link` (anyone holding the secret link) or `user` (bound to a
  registered user's email/wallet; appears in their "Shared with me"; opened
  with their session — no forwardable token exists at all).
- **Gate** — `none`; `otp` (6-digit code emailed to a bound address; hashed at
  rest, 10-min TTL, 5 attempts max, then a fresh code is required); or
  `password` (owner-set, scrypt-hashed, told to the recipient out-of-band).
- **Tier** — `server` (*Protected*): the owner's browser obtains the plaintext
  through the normal view path (wallet signature / passphrase) and uploads it;
  the server re-encrypts it under a **fresh per-share key**, wraps that key
  under the master key, pins the ciphertext, and at each authorized view
  decrypts and stamps a **visible per-viewer watermark** (image or PDF) before
  returning a view-only copy. `zk` (*Zero-Knowledge*): the owner's **browser**
  generates a random AES-256-GCM key via WebCrypto, encrypts locally, uploads
  only ciphertext; the key is appended to the link **after the `#`** — URL
  fragments are never sent in HTTP requests, so the server never sees the key
  and can never read the share. The recipient's browser decrypts locally.
  (Cost of zk: no server watermark; link-audience only.)
- **Limits** — expiry from 1 hour to 90 days (enforced on every request *and*
  by the Mongo TTL index) and an optional max-view count.

**Link anatomy:** `/share/<shareId>#t=<token>&k=<zkKey?>` — `shareId` is a
non-secret UUID; the 256-bit `t` token is the capability (stored only as a
hash; compared constant-time); `k` exists only for zk shares and only in the
fragment. Tokens and keys therefore never appear in server logs, Referer
headers, or the database.

**Lifecycle:** create (owner-authenticated: wallet signature for issuer
context, session for recipient context) → open (limits → audience/token check
→ gate check → decrypt-and-watermark or release-ciphertext) → count the view →
audit-log every event → end by expiry (TTL deletes the row, destroying the
wrapped key) or revoke (immediately nulls the wrapped key + best-effort IPFS
unpin). After either, decryption is impossible for everyone — including the
operator. Full formal analysis (threat model, per-actor privacy tables,
comparisons): [`sharesecure.md`](sharesecure.md).

---

## 7. End-to-end workflows

### 7.1 Publish (Issuer → Recipient)

1. Issuer logs in (MetaMask signature) and fills the publish form: file,
   docType, docNumber, receiver wallet, optional receiver email, optional
   passphrase.
2. `POST /api/issuer/upload` (signature-gated): server generates `docId` →
   embeds the **invisible watermark** on images (if the Python service is up)
   → computes **sha256 + pHash of the (watermarked) plaintext** → **vault-
   encrypts** (master key + optional passphrase) → pins the ciphertext to
   IPFS → returns `{docId, documentCID, fileHash(keccak of stored bytes),
   sha256, pHash, watermarked, encrypted, passphraseProtected}`.
3. The **issuer's MetaMask** calls `issueDocument(docId, fileHash, receiver,
   CID, docType, docNumber)` on Sepolia and waits for the receipt.
4. `POST /api/issuer/record` mirrors everything + the transactionHash into
   `issued_documents`; if a receiver email was given, a notification email is
   sent (link only).
5. The document appears in the recipient's **Received Documents** (matched by
   wallet or email).

### 7.2 View / download (Recipient)

Session check → MetaMask `personal_sign` over the docId → server fetches the
ciphertext from IPFS → `isVaultBlob` → decrypt: automatically with the master
key for server-key docs; via HTTP 428 → passphrase prompt → retry for
passphrase-protected docs (the 428/retry dance is `siteGatedFetch()` on the
frontend). Response carries the original mime type so the browser renders it
correctly. Download reuses the same path to save the decrypted original.

### 7.3 Authenticity check

Upload → §5 → verdict panel (per-layer chips + score + reasons) → n8n alert on
success.

### 7.4 Share

Share button (My Documents / Received Documents) → modal (audience, gate,
tier, expiry, max views) → link with copy button + "Manage existing links"
(status, view counts, per-share audit trail, revoke). External viewer opens
`share.html`: meta probe → gate UI if needed → open → render view-only.

### 7.5 Dashboard & analytics

`/api/stats` merges the legacy verify-flow counts with **received documents**
(each received doc is on-chain ⇒ verified) — totals, verified, success rate,
IPFS count, types, 30-day activity. The frontend merges the same two sources
for the overview tiles, "Recent Chain Activity" (with Etherscan links) and the
two Chart.js charts (status doughnut, types bar).

---

## 8. API surface

| Area | Endpoints (auth) |
|---|---|
| Auth | `POST /api/auth/send-email-otp`, `verify-email-otp`, `signup`, `signin`, `logout` (rate-limited); `GET/PUT /api/profile`; `POST /api/profile/link-wallet`, `unlink-wallet` (session) |
| Legacy verify | `POST /api/verify` (session; encrypts before pinning; authorized-list check; **no OCR**); `GET /api/documents`; `POST /api/documents/:docId/view` (session + wallet sig); `GET /api/stats`; `GET /api/qr-check`; `POST /api/qr-verify-signature` |
| Issuer | `POST /api/issuer/upload`, `record`, `documents`, `documents/:docId/view` (all wallet-signature gated) |
| Received | `GET /api/received-documents` (session); `POST /api/received-documents/:docId/view` (session + wallet sig) |
| Authenticity | `POST /api/security/check` (session, heavy-limited) |
| ShareSecure | `POST /api/shares` (owner; multipart plaintext); `POST /api/shares/zk` (owner; multipart ciphertext, no key); `GET /api/shares/:id/meta`, `POST /api/shares/:id/open`, `POST /api/shares/:id/send-code` (public, share-limited); `POST /api/shares/:id/revoke`, `POST /api/shares/list`, `POST /api/shares/:id/audit` (owner); `GET /api/shares/received` (session); page `GET /share/:id` |

Error conventions: `401` bad credential/signature/passphrase/token/code,
`403` not authorized for the resource, `410` share expired/revoked/used-up,
`428` passphrase or fresh code required, `429` rate/attempt limits.

---

## 9. Repository layout

```
docV/
├─ server.js                  # routes, models, middleware, verdict wiring (~2.3k lines)
├─ services/
│  ├─ vaultService.js         # AES-256-GCM document vault (master key, DVSITE01)
│  ├─ shareService.js         # ShareSecure crypto (DEKs, wrapping, tokens, DVSHARE1)
│  └─ securityService.js      # SHA-256, pHash, watermark client, verdict, view-watermarks
├─ ocr-service/               # Python FastAPI: invisible DWT-DCT watermark (:8100, self-hosted)
├─ contracts/                 # DocVerifyRegistry.sol + Remix deploy guide
└─ frontend/
   ├─ index.html              # SPA shell (landing / auth / user portal / issuer portal)
   ├─ script.js               # all app logic (~5k lines)
   ├─ share.html              # standalone public share viewer (zk decryption in-browser)
   ├─ contract.js             # contract address + ABI + chain config
   ├─ dogstudio.{js,css}      # motion layer (Lenis on landing only)
   └─ dv3d.{js,css}           # 3D depth layer (Three.js particles, tilt, glass)
figures/                      # diagrams (SVG + editable Mermaid sources)
sharesecure.md · encryption-reference.md · security-basics.md · PROJECT_NOTES.md
```

---

## 10. Environment & operations

```
# docV/.env
MONGODB_URI=…                     # Atlas connection
PINATA_API_KEY=… PINATA_SECRET_API_KEY=…
DOC_MASTER_KEY=…                  # 32-byte hex — mandatory encryption; BACK IT UP
SESSION_SECRET=…
WEB3_PROVIDER_URL=…               # Infura Sepolia (reads); writes go via user MetaMask
EMAIL_USER=… EMAIL_PASS=…         # Gmail SMTP: OTPs, share codes, notices
OCR_SERVICE_URL=http://localhost:8100   # invisible-watermark service (L2)
# N8N_WEBHOOK_URL=…  N8N_WEBHOOK_TOKEN=…  # WhatsApp/email automation
PORT=5000
```

Run: `cd docV && npm start` (app) and
`cd docV/ocr-service && venv\Scripts\python -m uvicorn main:app --port 8100`
(watermark service — optional; L2 degrades gracefully without it).
Dependencies are lean by design: 17 runtime packages, no dev-dependency
toolchain (the unused React/webpack/jest tree was removed).

Known trade-offs, accepted deliberately: the Protected share tier trusts the
server transiently (that is what enables watermarking and revocation); the
pHash reference scan is O(n) per check (index it past ~10k documents);
"view-only" is a deterrent while the per-viewer watermark provides the real
traceability; legacy `DOCVENC1` client-encrypted documents must be re-published
to participate in sharing.
