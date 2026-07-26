# DocVerify — Encryption & Cryptography Reference

A function-by-function map of **every algorithm used to encrypt (and the supporting
key-derivation, hashing, randomness, and constant-time comparison)**, with the
exact file and line of each definition and each call site.

> **How to read this.** Line numbers are as of the current working tree and may
> shift if the files change — search the function name to relocate. "Encryption"
> means turning plaintext into ciphertext (AES-GCM here). Key derivation (scrypt,
> PBKDF2), hashing (SHA-256, keccak-256), encoding (base64), and constant-time
> compare are *supporting* primitives, listed separately so nothing is confused
> with encryption proper.

---

## 1. Algorithm catalogue (at a glance)

| # | Algorithm | Category | Where it runs | Used for |
|---|---|---|---|---|
| A1 | **AES-256-GCM** | Authenticated **encryption** | Server (Node `crypto`) | Share blob, DEK wrapping, vault at-rest |
| A2 | **AES-256-GCM** | Authenticated **encryption** | Browser (Web Crypto) | Zero-knowledge share; legacy `DOCVENC1` |
| K1 | **scrypt** (`N=2^14, r=8, p=1`) | Key derivation | Server (Node `crypto`) | Wrapping key, vault key, share password hash |
| K2 | **PBKDF2-HMAC-SHA-256** (150k iters) | Key derivation | Browser (Web Crypto) | Legacy `DOCVENC1` key (deprecated) |
| H1 | **SHA-256** | Hashing | Server (Node `crypto`) | Capability-token hash, OTP-code hash |
| H2 | **SHA-256** | Hashing | Browser (Web Crypto) | Legacy file hashing (`DOCVENC1` path) |
| H3 | **keccak-256** (Ethereum `sha3`) | Hashing | Server (`web3`) | File fingerprint committed on-chain (not encryption) |
| R1 | **CSPRNG** | Randomness | Server `crypto.randomBytes` / `randomInt` | DEKs, IVs, salts, tokens, OTP codes |
| R2 | **CSPRNG** | Randomness | Browser `crypto.getRandomValues` | ZK keys, IVs, salts |
| C1 | **Constant-time compare** | Side-channel defence | Server `crypto.timingSafeEqual` | Token / password / OTP verification |

**Common AES-GCM parameters everywhere:** 256-bit key, **96-bit (12-byte) random IV**, **128-bit (16-byte) authentication tag**.

---

## 2. Server share cryptography — `docV/services/shareService.js`

This module holds all ShareSecure server-side crypto.

| Function | Lines | Primitive | What it does |
|---|---|---|---|
| `wrappingKey()` | 48–53 | **scrypt** (K1) | Derives the 256-bit key-wrapping key from `DOC_MASTER_KEY` with fixed label `"docverify-share-wrap-v1"` (`N=16384, r=8, p=1`). |
| `aesEncrypt(plaintext, key)` | 54–59 | **AES-256-GCM** (A1) | Core encrypt: random 12-byte IV (`randomBytes(12)`, l.55), `createCipheriv("aes-256-gcm", …)` (l.56), returns `{iv, tag, ct}` (tag from `getAuthTag()`, l.58). |
| `aesDecrypt(iv, tag, ct, key)` | 61–64 | **AES-256-GCM** (A1) | Core decrypt: `createDecipheriv` (l.62) + `setAuthTag` (l.63); throws on tamper. |
| `createServerShareBlob(plaintext)` | 73–82 | **AES-256-GCM** + **scrypt** + **CSPRNG** | Generates a fresh **256-bit DEK** (`randomBytes(32)`, l.75), encrypts the document (`B_s = "DVSHARE1"‖iv‖tag‖ct`), then **wraps the DEK** under `wrappingKey()`. Returns `{blob, wrappedKey}`. |
| `openServerShareBlob(blob, wrappedKey)` | 85–100 | **AES-256-GCM** + **scrypt** | Unwraps the DEK with `wrappingKey()`, then decrypts the share blob. Inverse of the above. |
| `generateToken()` | 103–105 | **CSPRNG** (R1) | 256-bit capability token (`randomBytes(32)` → base64url, l.104). |
| `hashToken(token)` | 108–110 | **SHA-256** (H1) | `createHash("sha256")…digest("hex")` (l.109). Only this hash is stored. |
| `verifyTokenHash(token, storedHash)` | 113–119 | **SHA-256** + **timingSafeEqual** | Re-hashes and compares in constant time (`crypto.timingSafeEqual`, l.118). |
| `hashSharePassword(password)` | 124–128 | **scrypt** + **CSPRNG** | Random 16-byte salt (l.125) + `scryptSync(pw, salt, 32)` (l.126). |
| `verifySharePassword(password, saltHex, hashHex)` | 131–137 | **scrypt** + **timingSafeEqual** | `scryptSync` (l.133) then constant-time compare (l.136). |
| `generateOtpCode()` | 140–142 | **CSPRNG** (R1) | 6-digit code via `crypto.randomInt(0, 1000000)` (l.141). |
| `isShareConfigured()` | 41–43 | — | Guard: master key present. |

---

## 3. Vault (document-at-rest) cryptography — `docV/services/vaultService.js`

Reused by ShareSecure to decrypt source documents at share time, and by the
Issuer Portal to encrypt documents at rest. Blob format: `DVSITE01‖salt(16)‖iv(12)‖tag(16)‖ct`.

| Function | Lines | Primitive | What it does |
|---|---|---|---|
| `deriveKey(passphrase, salt)` | 36–45 | **scrypt** (K1) | Derives the AES key from `passphrase ‖ DOC_MASTER_KEY` and the salt (`scryptSync`, l.39; `N=16384, r=8, p=1`). |
| `vaultEncrypt(buffer, passphrase)` | 48–58 | **AES-256-GCM** (A1) | Random salt+IV; `createCipheriv("aes-256-gcm", …)` (l.54); tag via `getAuthTag` (l.56); emits the `DVSITE01` blob (l.57). |
| `vaultDecrypt(buffer, passphrase)` | 66–77 | **AES-256-GCM** (A1) | Parses salt/iv/tag/ct (l.69–72); `createDecipheriv` (l.74) + `setAuthTag` (l.75); throws on wrong passphrase/tamper. |
| `isVaultBlob(buffer)` | 61–63 | magic-bytes check | True if bytes start with `DVSITE01` (no crypto). |
| `isVaultConfigured()` | 32–34 | — | Guard: master key present. |

---

## 4. Browser zero-knowledge cryptography — `docV/frontend/script.js`

End-to-end path: the document is encrypted in the owner's browser; the key never
reaches the server. Uses the **Web Crypto API** (`crypto.subtle`).

| Function | Lines | Primitive | What it does |
|---|---|---|---|
| `zkEncryptBlob(blob)` | 4721–4728 | **AES-256-GCM** (A2) + **CSPRNG** (R2) | Generates a 256-bit key (`getRandomValues(32)`, l.4722) and 12-byte IV (l.4723); `subtle.importKey('raw', …, 'AES-GCM')` (l.4724); `subtle.encrypt({name:'AES-GCM', iv}, …)` (l.4726). Returns `{keyB64, ivB64, ciphertext}` — the key is returned to be placed in the URL fragment only. |
| `createZkShare(docId, ctx, opts)` | 4750–4789 | orchestration | Gets plaintext (View path), calls `zkEncryptBlob`, uploads **ciphertext only**, appends `&k=<key>` to the link locally. |
| `getDocPlaintextBlob(docId, ctx)` | 4741–4747 | orchestration | Obtains the decrypted document via the existing View flow (server-vault `428`/passphrase, or MetaMask signature). No crypto itself. |
| `createServerShare(docId, ctx, opts)` | 4803–… | orchestration | Uploads the **plaintext** (server re-encrypts via §2). No browser crypto. |
| `blobIsStillEncrypted(blob)` | 4791–4798 | magic-bytes check | Detects `DOCVENC1`/`DVSITE01` headers to fail fast (no crypto). |
| `bytesToB64` / `bytesToB64url` | 4730 / 4735 | base64 **encoding** | URL-safe encoding of key/iv (not encryption). |

### 4a. Legacy client-side encryption (`DOCVENC1`) — deprecated, still present

| Function | Lines | Primitive | What it does |
|---|---|---|---|
| `dvDeriveKey(passphrase, salt)` | 3454–3460 | **PBKDF2-HMAC-SHA-256** (K2) | `subtle.deriveKey({name:'PBKDF2', salt, iterations:150000, hash:'SHA-256'}, …)` (l.3457–3459) → AES-GCM-256 key. |
| `dvEncryptFile(file, passphrase)` | 3467–… | **AES-256-GCM** (A2) | Random salt(16)/iv(12); encrypts; emits `DOCVENC1‖mimeLen‖mime‖salt‖iv‖cipher`. |
| `dvDecrypt(bytes, passphrase)` | 3495–… | **AES-256-GCM** (A2) | Inverse of the above. |
| `dvIsEncrypted(bytes)` | 3488–3492 | magic-bytes check | Detects the `DOCVENC1` header. |
| (SHA-256 file digest) | 3450 | **SHA-256** (H2) | `crypto.subtle.digest('SHA-256', …)` for file hashing. |

> These functions are **not called** by the current view/share flow; documents in
> the `DOCVENC1` format must be re-published. They are documented here for
> completeness.

---

## 5. Recipient viewer cryptography — `docV/frontend/share.html`

| Function | Lines | Primitive | What it does |
|---|---|---|---|
| `zkDecrypt(keyB64url, ivB64, ciphertext)` | 186–191 | **AES-256-GCM** (A2) | `subtle.importKey('raw', key, 'AES-GCM')` (l.189) + `subtle.decrypt({name:'AES-GCM', iv}, …)` (l.190). Decrypts a zero-knowledge share locally using the key read from the URL fragment. |
| `b64ToBytes` / `b64urlToBytes` | 170 / 179 | base64 **decoding** | Decodes content/key (not crypto). |
| `sniffBlobType(blob)` | 120–133 | magic-bytes check | Identifies PDF/PNG/JPEG/etc. (not crypto). |

---

## 6. Hashing & fingerprinting (not encryption) — `docV/services/securityService.js`

| Function | Lines | Primitive | What it does |
|---|---|---|---|
| `computeSha256(buffer)` | 32–34 | **SHA-256** (H1) | Exact file hash (`createHash("sha256")`, l.33) — Layer-1 authenticity, not encryption. |
| `computePHash(buffer)` | 43–50 | perceptual hash (jimp) | Image fingerprint — not cryptographic. |
| `watermarkImage(buffer, lines)` | 73–93 | image processing (jimp) | Per-viewer **visible watermark** (l.75–91) — not encryption. |

---

## 7. Where the server actually calls each algorithm — `docV/server.js`

The imports are at the top: shareService functions (lines 35–44), vault functions
(line 33), `watermarkImage` (line 31).

### 7a. Create a Protected (server-gated) share — `POST /api/shares`
| Step | Line | Function · algorithm |
|---|---|---|
| Resolve gate; hash password if set | 1713 | `hashSharePassword` · **scrypt** |
| Detect real file type | 1798 | `sniffMime` · magic bytes |
| **Encrypt the share copy + wrap DEK** | 1800 | `createServerShareBlob` · **AES-256-GCM + scrypt + CSPRNG** |
| Mint capability token (link audience) | 1810 | `generateToken` · **CSPRNG** |
| Store only the token hash | 1824 | `hashToken` · **SHA-256** |

### 7b. Create a Zero-Knowledge share — `POST /api/shares/zk`
| Step | Line | Function · algorithm |
|---|---|---|
| Mint capability token | 1903 | `generateToken` · **CSPRNG** |
| Store only the token hash | 1915 | `hashToken` · **SHA-256** |
| *(document already encrypted in browser; server stores ciphertext, no key)* | — | — |

### 7c. Open a share — `POST /api/shares/:id/open`
| Step | Line | Function · algorithm |
|---|---|---|
| Verify capability token (link audience) | 1998 | `verifyTokenHash` · **SHA-256 + timingSafeEqual** |
| Verify password gate | 2006 | `verifySharePassword` · **scrypt + timingSafeEqual** |
| Verify emailed one-time code | 2018 | `verifyTokenHash` · **SHA-256 + timingSafeEqual** |
| **Decrypt the share copy (Protected tier)** | 2036 | `openServerShareBlob` · **AES-256-GCM + scrypt** |
| Apply per-viewer watermark (images) | 2044 | `watermarkImage` · image processing |

### 7d. Send a one-time code — `POST /api/shares/:id/send-code`
| Step | Line | Function · algorithm |
|---|---|---|
| Generate 6-digit code | 2116 | `generateOtpCode` · **CSPRNG** |
| Store only the code hash | 2117 | `hashToken` · **SHA-256** |

### 7e. Source-document handling & issuance (pre-existing, reused)
| Step | Line | Function · algorithm |
|---|---|---|
| Encrypt document at rest on issue | 1265 | `vaultEncrypt` · **AES-256-GCM + scrypt** |
| File fingerprint for the blockchain | 720, 1232, 1266 | `web3.utils.sha3` · **keccak-256** (hashing, not encryption) |
| Detect vault blob on view | 1428, 1601 | `isVaultBlob` · magic bytes |
| Decrypt vault blob on view | 1433, 1606 | `vaultDecrypt` · **AES-256-GCM + scrypt** |

---

## 8. Ciphertext / blob format reference

| Format (magic) | Produced by | Layout |
|---|---|---|
| `DVSHARE1` (share blob) | `createServerShareBlob` (shareService) | `"DVSHARE1"(8) ‖ iv(12) ‖ tag(16) ‖ ciphertext` |
| wrapped DEK (DB field) | `createServerShareBlob` | `base64( iv(12) ‖ tag(16) ‖ Enc_GCM(K_w, DEK) )` |
| `DVSITE01` (vault blob) | `vaultEncrypt` (vaultService) | `"DVSITE01"(8) ‖ salt(16) ‖ iv(12) ‖ tag(16) ‖ ciphertext` |
| Zero-knowledge | `zkEncryptBlob` (browser) | ciphertext on IPFS; `iv` stored as non-secret `zkMeta.ivB64`; **key only in URL `#k=`** |
| `DOCVENC1` (legacy) | `dvEncryptFile` (browser) | `"DOCVENC1"(8) ‖ mimeLen(2) ‖ mime ‖ salt(16) ‖ iv(12) ‖ cipher` |

---

## 9. One-line summary per feature

- **Protected share** → AES-256-GCM with a per-share random DEK; the DEK is wrapped with AES-256-GCM under a scrypt-derived key from the server master key. Tokens/codes hashed with SHA-256; passwords with scrypt.
- **Zero-knowledge share** → AES-256-GCM entirely in the browser (Web Crypto); the key lives only in the URL fragment; the server stores ciphertext + a SHA-256 token hash and nothing else.
- **Document at rest (vault)** → AES-256-GCM under a scrypt(passphrase ‖ master-key) key.
- **Legacy client encryption** → AES-256-GCM with a PBKDF2-HMAC-SHA-256 (150k) key (deprecated).
- **Blockchain anchor** → keccak-256 file hash (a fingerprint, not encryption).
