// ============================================================================
//  DocVerify — Secure Share Service
// ----------------------------------------------------------------------------
//  Crypto + capability helpers for the temporary document-share feature.
//
//  Two tiers (chosen per share by the owner):
//
//   • "server"  — server-gated. A fresh per-share data key (DEK) encrypts a
//                 COPY of the document. The DEK is wrapped under the server
//                 master key (DOC_MASTER_KEY) and stored in the DB. Only this
//                 server can unwrap it, and only while the share is live. This
//                 enables a per-viewer watermark + view-only rendering.
//                 Deleting/clearing the wrapped key (on expiry/revoke) makes
//                 the share copy permanently undecryptable — cryptographic
//                 erasure, not just a flag.
//
//   • "zk"      — zero-knowledge. The document is encrypted in the OWNER's
//                 browser; the key travels only in the link's URL #fragment,
//                 which browsers never send to any server. This server stores
//                 ONLY ciphertext and can never read it. (Handled here only for
//                 the wrap-free storage path; the key never reaches us.)
//
//  Capability token: a 256-bit random secret that lives only in the share
//  link's #fragment. We store just its SHA-256 hash, so a database leak does
//  not expose live links.
//
//  Server-gated blob format:  MAGIC(8) | iv(12) | authTag(16) | ciphertext
//  Cipher: AES-256-GCM everywhere.
// ============================================================================

import crypto from "crypto";

const SHARE_MAGIC = Buffer.from("DVSHARE1"); // 8 bytes — identifies a share blob

// Read lazily: ES imports run before dotenv.config() in server.js.
function getMasterKey() {
    return process.env.DOC_MASTER_KEY || "";
}

/** Sharing requires the same master key the vault uses. */
export function isShareConfigured() {
    return getMasterKey().length >= 32;
}

// Normalise the master key to a stable 32-byte wrapping key. A fixed,
// purpose-specific salt separates this from the vault's key derivation so the
// two never collide.
function wrappingKey() {
    return crypto.scryptSync(getMasterKey(), "docverify-share-wrap-v1", 32, {
        N: 16384, r: 8, p: 1,
    });
}

function aesEncrypt(plaintext, key) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return { iv, tag: cipher.getAuthTag(), ct };
}

function aesDecrypt(iv, tag, ct, key) {
    const d = crypto.createDecipheriv("aes-256-gcm", key, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]);
}

/**
 * Server-gated tier: encrypt a copy of the document with a fresh DEK, and wrap
 * that DEK under the master key.
 * @returns {{ blob: Buffer, wrappedKey: string }} blob to pin on IPFS + the
 *          base64 wrapped key to store in the DB.
 */
export function createServerShareBlob(plaintext) {
    if (!isShareConfigured()) throw new Error("DOC_MASTER_KEY is not configured.");
    const dek = crypto.randomBytes(32);
    const { iv, tag, ct } = aesEncrypt(plaintext, dek);
    const blob = Buffer.concat([SHARE_MAGIC, iv, tag, ct]);

    const w = aesEncrypt(dek, wrappingKey());
    const wrappedKey = Buffer.concat([w.iv, w.tag, w.ct]).toString("base64");
    return { blob, wrappedKey };
}

/** Server-gated tier: unwrap the DEK and decrypt the share blob back to bytes. */
export function openServerShareBlob(blob, wrappedKey) {
    if (!isShareConfigured()) throw new Error("DOC_MASTER_KEY is not configured.");
    if (!Buffer.isBuffer(blob) || blob.length <= 36 || !blob.subarray(0, 8).equals(SHARE_MAGIC)) {
        throw new Error("Not a valid share blob.");
    }
    const wk = Buffer.from(wrappedKey, "base64");
    const dek = aesDecrypt(wk.subarray(0, 12), wk.subarray(12, 28), wk.subarray(28), wrappingKey());

    let o = 8;
    const iv = blob.subarray(o, o + 12); o += 12;
    const tag = blob.subarray(o, o + 16); o += 16;
    const ct = blob.subarray(o);
    return aesDecrypt(iv, tag, ct, dek);
}

// ── Capability token (the secret in the link #fragment) ─────────────────────

/** A 256-bit URL-safe random token. Lives only in the share link. */
export function generateToken() {
    return crypto.randomBytes(32).toString("base64url");
}

/** SHA-256 of a token — this is all we persist. */
export function hashToken(token) {
    return crypto.createHash("sha256").update(String(token)).digest("hex");
}

/** Constant-time compare of a presented token against the stored hash. */
export function verifyTokenHash(token, storedHash) {
    if (!token || !storedHash) return false;
    const a = Buffer.from(hashToken(token), "hex");
    const b = Buffer.from(storedHash, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

// ── Password gate (Phase 2) ─────────────────────────────────────────────────

/** Hash a share password with a per-share random salt (scrypt). */
export function hashSharePassword(password) {
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(String(password), salt, 32);
    return { salt: salt.toString("hex"), hash: hash.toString("hex") };
}

/** Constant-time verify of a share password against its stored salt+hash. */
export function verifySharePassword(password, saltHex, hashHex) {
    if (!password || !saltHex || !hashHex) return false;
    const hash = crypto.scryptSync(String(password), Buffer.from(saltHex, "hex"), 32);
    const stored = Buffer.from(hashHex, "hex");
    if (hash.length !== stored.length) return false;
    return crypto.timingSafeEqual(hash, stored);
}

/** A short numeric one-time code for the email gate (Phase 2). */
export function generateOtpCode() {
    return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}
