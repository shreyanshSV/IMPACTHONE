// ============================================================================
//  DocVerify — Server-side Document Vault (site-gated encryption)
// ----------------------------------------------------------------------------
//  A document is encrypted with a key derived from BOTH:
//    1. the user's passphrase (never stored), and
//    2. a server-held master key (DOC_MASTER_KEY in .env, never leaves the server)
//
//  Because the master key is required, the file on IPFS CANNOT be decrypted by
//  anyone who only has the CID + passphrase. Decryption can only happen on this
//  server — i.e. the document "only opens when you give the passphrase on our
//  site". The server enforces login + wallet-signature + rate limits before it
//  will decrypt.
//
//  Trade-off vs. zero-knowledge client-side encryption: the server can decrypt
//  during a viewing request (it must, to gate access). It never stores the
//  passphrase or the plaintext.
//
//  Blob format:  MAGIC(8) | salt(16) | iv(12) | authTag(16) | ciphertext
//  Cipher: AES-256-GCM, key = scrypt(passphrase | masterKey, salt)
// ============================================================================

import crypto from "crypto";

const MAGIC = Buffer.from("DVSITE01"); // 8 bytes, identifies a server-vault blob

// Read lazily: ES module imports run BEFORE dotenv.config() in server.js, so we
// must NOT capture process.env at module-load time.
function getMasterKey() {
    return process.env.DOC_MASTER_KEY || "";
}

export function isVaultConfigured() {
    return getMasterKey().length >= 32;
}

function deriveKey(passphrase, salt) {
    // scrypt is memory-hard; mixing in the server master key makes the
    // passphrase alone insufficient to derive the key off-site.
    return crypto.scryptSync(
        Buffer.from(`${passphrase}|${getMasterKey()}`, "utf8"),
        salt,
        32,
        { N: 16384, r: 8, p: 1 }
    );
}

/**
 * Encrypt plaintext bytes → self-describing vault blob.
 * `passphrase` may be an empty string "" for SERVER-KEY encryption (the document
 * is encrypted under the master key alone, so the server can decrypt it without
 * the user entering anything). A non-empty passphrase additionally requires that
 * passphrase to open the document.
 */
export function vaultEncrypt(buffer, passphrase = "") {
    if (!isVaultConfigured()) throw new Error("DOC_MASTER_KEY is not configured on the server.");
    if (typeof passphrase !== "string") throw new Error("Passphrase must be a string (use '' for server-key encryption).");
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = deriveKey(passphrase, salt);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const ct = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([MAGIC, salt, iv, tag, ct]);
}

/** True if these bytes are a server-vault blob. */
export function isVaultBlob(buffer) {
    return Buffer.isBuffer(buffer) && buffer.length > 52 && buffer.subarray(0, 8).equals(MAGIC);
}

/** Decrypt a vault blob with the passphrase. Throws on wrong passphrase. */
export function vaultDecrypt(buffer, passphrase) {
    if (!isVaultConfigured()) throw new Error("DOC_MASTER_KEY is not configured on the server.");
    let o = 8;
    const salt = buffer.subarray(o, o + 16); o += 16;
    const iv = buffer.subarray(o, o + 12); o += 12;
    const tag = buffer.subarray(o, o + 16); o += 16;
    const ct = buffer.subarray(o);
    const key = deriveKey(passphrase, salt);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]); // throws if passphrase/tag invalid
}
