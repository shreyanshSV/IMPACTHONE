// ============================================================================
//  DocVerify — Anti-Copy Security Service (4 layers, no third-party AI)
// ----------------------------------------------------------------------------
//  Orchestrates the trust layers that distinguish an ORIGINAL digital file
//  from a screenshot / photocopy / phone photo / edit:
//
//    L1  SHA-256 exact file hash         (Node crypto, in-process)
//    L2  Invisible watermark (DWT-DCT)   (self-hosted Python micro-service)
//    L3  Perceptual hash (pHash)         (jimp, in-process)
//    L5  Blockchain immutable record     (handled in server.js via the contract)
//
//  L4 (AI forensics via Google Gemini) was REMOVED: it uploaded the document
//  image to a third party (Google). Every remaining layer runs in-process or on
//  infrastructure you control, so the document never leaves your trust boundary
//  for this check.
// ============================================================================

import crypto from "crypto";
import Jimp from "jimp";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

// Optional Python micro-service (ocr-service/main.py). Read lazily because ES
// module imports run before dotenv.config() in server.js.
function getOcrUrl() {
    return process.env.OCR_SERVICE_URL || "";
}

export function isWatermarkServiceConfigured() {
    return !!getOcrUrl();
}

// ── Layer 1 — SHA-256 exact file hash ──────────────────────────────────────
export function computeSha256(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function verifyFileHash(buffer, expectedHash) {
    return computeSha256(buffer) === expectedHash;
}

// ── Layer 3 — Perceptual hash (pHash) ──────────────────────────────────────
// Returns a 64-bit binary string, or null if the buffer is not a raster image
// (e.g. a PDF) — pHash only applies to images.
export async function computePHash(buffer) {
    try {
        const img = await Jimp.read(buffer);
        return img.hash(2); // base-2 (binary) perceptual hash
    } catch {
        return null;
    }
}

export function hammingDistance(a, b) {
    if (!a || !b) return null;
    const len = Math.max(a.length, b.length);
    a = a.padStart(len, "0");
    b = b.padStart(len, "0");
    let d = 0;
    for (let i = 0; i < len; i++) if (a[i] !== b[i]) d++;
    return d;
}

// Hamming-distance interpretation: 0–5 identical, 6–15 suspicious, >15 different.
export function comparePHash(currentHash, expectedHash) {
    const distance = hammingDistance(currentHash, expectedHash);
    if (distance === null) return { distance: null, identical: false, similar: false };
    return { distance, identical: distance <= 5, similar: distance <= 15 };
}

// ── Visible per-viewer watermark (for shared documents) ────────────────────
// Tiles a low-opacity label across an image so any screenshot of a shared
// document is traceable back to the recipient + time. Best-effort: on any
// failure it returns the original bytes so viewing is never broken.
export async function watermarkImage(buffer, lines) {
    try {
        const img = await Jimp.read(buffer);
        const font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
        const text = (Array.isArray(lines) ? lines : [lines]).filter(Boolean).join("   •   ");
        const W = img.bitmap.width, H = img.bitmap.height;

        // Transparent overlay with the label repeated in a brick pattern.
        const tile = new Jimp(W, H, 0x00000000);
        for (let y = 16; y < H; y += 88) {
            const offset = (Math.floor(y / 88) % 2) * 190;
            for (let x = -220 + offset; x < W; x += 400) {
                tile.print(font, x, y, text);
            }
        }
        tile.opacity(0.22);
        img.composite(tile, 0, 0);

        return await img.getBufferAsync(Jimp.MIME_PNG);
    } catch {
        return buffer;
    }
}

// Visible per-viewer watermark for PDFs: tiles a low-opacity diagonal label
// across every page. Best-effort — returns the original bytes on any failure.
export async function watermarkPdf(buffer, lines) {
    try {
        const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        const text = (Array.isArray(lines) ? lines : [lines]).filter(Boolean).join("   •   ");
        const size = 11;
        for (const page of pdf.getPages()) {
            const { width, height } = page.getSize();
            for (let y = 20; y < height + 40; y += 95) {
                const offset = (Math.floor(y / 95) % 2) * 180;
                for (let x = -80 + offset; x < width; x += 360) {
                    page.drawText(text, {
                        x, y, size, font,
                        color: rgb(0.5, 0.5, 0.5),
                        opacity: 0.16,
                        rotate: degrees(30),
                    });
                }
            }
        }
        return Buffer.from(await pdf.save());
    } catch {
        return buffer;
    }
}

// Dispatch a per-viewer watermark by MIME type. Returns { buffer, mime } — the
// mime may change (images are re-encoded to PNG). Non-image/PDF types pass
// through unchanged.
export async function watermarkDocument(buffer, mime, lines) {
    const m = mime || "";
    if (m.startsWith("image/")) {
        const out = await watermarkImage(buffer, lines);
        return { buffer: out, mime: out === buffer ? m : "image/png" };
    }
    if (m === "application/pdf") {
        return { buffer: await watermarkPdf(buffer, lines), mime: "application/pdf" };
    }
    return { buffer, mime: m };
}

// ── Layer 4 — REMOVED (privacy) ────────────────────────────────────────────
//  AI forensics (Google Gemini vision) used to detect screenshots/photocopies
//  by uploading the document image to Google. That handed the document to a
//  third party, which is incompatible with the project's "no external entity
//  ever sees the document" guarantee — so it was removed entirely. There is no
//  code path in this service that transmits a document off this server.

// ── Layer 2 — Invisible watermark (Python micro-service) ───────────────────
export async function embedWatermark(buffer, docId, filename = "doc.png") {
    const url = getOcrUrl();
    if (!url) return null;
    try {
        const form = new FormData();
        form.append("file", new Blob([buffer]), filename);
        form.append("doc_id", docId);
        const resp = await fetch(`${url}/watermark/embed`, { method: "POST", body: form });
        if (!resp.ok) return null;
        return Buffer.from(await resp.arrayBuffer());
    } catch (err) {
        console.warn("Watermark embed unavailable:", err.message);
        return null;
    }
}

export async function verifyWatermark(buffer, expectedId, filename = "doc.png") {
    const url = getOcrUrl();
    if (!url) return { available: false, intact: null, extracted: null };
    try {
        const form = new FormData();
        form.append("file", new Blob([buffer]), filename);
        form.append("expected_id", expectedId);
        const resp = await fetch(`${url}/watermark/verify`, { method: "POST", body: form });
        if (!resp.ok) return { available: true, intact: null, error: `HTTP ${resp.status}` };
        const json = await resp.json();
        return { available: true, intact: !!json.intact, extracted: json.extracted };
    } catch (err) {
        return { available: false, intact: null, error: err.message };
    }
}

// ── Orchestrator ───────────────────────────────────────────────────────────
/**
 * Run the 5-layer anti-copy check on an uploaded buffer.
 *
 * @param {object} opts
 * @param {Buffer} opts.buffer        - the uploaded file bytes
 * @param {object} [opts.model]       - Gemini model for L4
 * @param {string} [opts.mimeType]    - upload mime type
 * @param {object} [opts.expected]    - the registered fingerprints to compare against:
 *                                       { sha256, pHash, docId, watermarked, filename }
 * @param {boolean} [opts.blockchainRegistered] - L5 result resolved by caller
 * @returns {object} layers + verdict + securityScore (0-100)
 */
export async function runSecurityCheck({ buffer, model, mimeType, expected = {}, blockchainRegistered = null }) {
    const layers = {
        layer1_sha256: { hash: computeSha256(buffer), expected: expected.sha256 || null, match: null },
        layer2_watermark: { available: false, intact: null },
        layer3_phash: { hash: null, expected: expected.pHash || null, distance: null, identical: null, similar: null },
        layer5_blockchain: { registered: blockchainRegistered },
    };

    // L1
    if (expected.sha256) layers.layer1_sha256.match = layers.layer1_sha256.hash === expected.sha256;

    // L3
    const ph = await computePHash(buffer);
    layers.layer3_phash.hash = ph;
    if (ph && expected.pHash) Object.assign(layers.layer3_phash, comparePHash(ph, expected.pHash));

    // L2 — verify the invisible watermark ONLY when the registered original was
    // actually watermarked. Otherwise (older docs, PDFs, or the service was off
    // at issue time) there is no mark to find, and we must not hard-fail a
    // legitimate document for lacking one.
    if (expected.docId && expected.watermarked) {
        layers.layer2_watermark = await verifyWatermark(buffer, expected.docId, expected.filename);
    }

    // L4 (AI forensics) intentionally removed — see note above. No document ever
    // leaves this server for the authenticity check.

    return { layers, ...computeVerdict(layers) };
}

// Weighted verdict across whichever layers actually produced a signal.
export function computeVerdict(layers) {
    const reasons = [];
    let score = 0, weight = 0;
    const exactOriginal = layers.layer1_sha256.match === true; // definitive proof

    // L1 — SHA-256 exact hash (deterministic backbone, heaviest weight)
    if (layers.layer1_sha256.match === true) { score += 40; weight += 40; }
    else if (layers.layer1_sha256.match === false) { weight += 40; reasons.push("File bytes do not match the registered original (different hash)."); }

    // L2 — invisible watermark (ADVISORY: unreliable on small images and after
    // re-encoding, so it scores but NEVER rejects on its own, and never overrides
    // an exact hash match).
    if (layers.layer2_watermark.intact === true) { score += 20; weight += 20; }
    else if (layers.layer2_watermark.intact === false) {
        weight += 20;
        if (!exactOriginal) reasons.push("Invisible watermark is missing or degraded (possible copy).");
    }

    // L3 — pHash
    if (layers.layer3_phash.distance !== null) {
        weight += 25;
        if (layers.layer3_phash.identical) score += 25;
        else if (layers.layer3_phash.similar) { score += 12; reasons.push("Visual fingerprint is only similar, not identical (possible re-save/crop)."); }
        else reasons.push("Visual fingerprint differs significantly from the original.");
    }

    // L5 — blockchain (deterministic trust anchor — raised now that AI is gone)
    if (layers.layer5_blockchain.registered === true) { score += 15; weight += 15; }
    else if (layers.layer5_blockchain.registered === false) { weight += 15; reasons.push("No matching record found on the blockchain."); }

    const securityScore = weight > 0 ? Math.round((score / weight) * 100) : 0;
    // Verdict: any hard failure rejects. A document with no matching on-chain
    // record cannot be "verified" as an authentic registered original.
    // Hard failures REJECT regardless of score. The watermark is intentionally
    // NOT a hard fail. An exact SHA-256 match is definitive proof of the original,
    // so it passes even if a weaker layer (e.g. the watermark) misfires.
    const hardFail =
        layers.layer1_sha256.match === false ||
        layers.layer5_blockchain.registered === false ||
        (layers.layer3_phash.distance !== null && !layers.layer3_phash.similar);
    const verified = !hardFail && (exactOriginal || securityScore >= 60);

    return {
        verdict: verified ? "VERIFIED" : "REJECTED",
        verified,
        securityScore,
        reasons,
    };
}
