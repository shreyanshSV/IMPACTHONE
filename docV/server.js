import express from "express";
import mongoose from "mongoose";
// Triggers restart
import path from "path";
import session from "express-session";
import bcrypt from "bcryptjs";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import Web3 from "web3";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import qrcode from 'qrcode';
import MongoStore from "connect-mongodb-session";
import pinataSDK from '@pinata/sdk';
import stream from 'stream';
import nodemailer from 'nodemailer';
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import {
    computeSha256,
    computePHash,
    comparePHash,
    embedWatermark,
    verifyWatermark,
    runSecurityCheck,
    isWatermarkServiceConfigured,
    watermarkImage,
    watermarkDocument,
} from "./services/securityService.js";
import { vaultEncrypt, vaultDecrypt, isVaultBlob, isVaultConfigured } from "./services/vaultService.js";
import {
    isShareConfigured,
    createServerShareBlob,
    openServerShareBlob,
    generateToken,
    hashToken,
    verifyTokenHash,
    hashSharePassword,
    verifySharePassword,
    generateOtpCode,
} from "./services/shareService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Debug: Log environment variables loading
console.log('🔧 Environment variables loaded:');
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
console.log('- PINATA_API_KEY:', process.env.PINATA_API_KEY ? '✅ Set' : '❌ Missing');
console.log('- PINATA_SECRET_API_KEY:', process.env.PINATA_SECRET_API_KEY ? '✅ Set' : '❌ Missing');
console.log('- WEB3_PROVIDER_URL:', process.env.WEB3_PROVIDER_URL ? '✅ Set' : '❌ Missing');
console.log('- ACCOUNT_ADDRESS:', process.env.ACCOUNT_ADDRESS ? '✅ Set' : '❌ Missing');
console.log('- PRIVATE_KEY:', process.env.PRIVATE_KEY ? '✅ Set' : '❌ Missing');
console.log('- SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Set' : '❌ Missing');
console.log('- PORT:', process.env.PORT ? '✅ Set' : '❌ Missing');
console.log('📍 Current working directory:', process.cwd());
console.log('📁 .env file path:', path.join(__dirname, '.env'));
console.log('📊 Total env vars loaded:', Object.keys(process.env).length);
const app = express();
const port = process.env.PORT || 3000;

app.set('trust proxy', 1);

// --- Security headers (helmet). CSP/COEP disabled because the UI loads CDN
//     scripts (Tailwind, ethers, Chart.js) and uses inline handlers. ---
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));

// CORS — restricted to the configured client origin (defaults to the same
// origin that serves this app). Set CLIENT_ORIGIN in .env to allow a separate
// frontend (e.g. the React dev server).
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "";
app.use((req, res, next) => {
    if (CLIENT_ORIGIN) {
        res.header('Access-Control-Allow-Origin', CLIENT_ORIGIN);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    }
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json({ limit: "20mb" }));

// Strip any keys containing `$` or `.` to block NoSQL/operator injection.
app.use(mongoSanitize());

// --- Rate limiters (defence against brute-force + cost abuse) ---
// Auth: tight, to stop password/OTP guessing.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many attempts. Please wait a few minutes and try again." },
});
// Heavy/paid endpoints (AI, IPFS, blockchain).
const heavyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Rate limit reached for this action. Please slow down." },
});
// Public share-open endpoint — tight, to stop token/code guessing by anyone
// who finds a /share link. Keyed by IP.
const shareLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many attempts. Please wait a few minutes and try again." },
});

// --- CRITICAL FIX: Reading MONGODB_URI from environment ---
const MONGODB_URI = process.env.MONGODB_URI;
// --- Reading PINATA keys from environment ---
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;
const SESSION_SECRET = process.env.SESSION_SECRET || "DEFAULT_SECRET_KEY";

// --- PINATA SETUP ---
const pinata = new pinataSDK(PINATA_API_KEY, PINATA_SECRET_API_KEY);
// -----------------------------------------------------------------


// --- SESSION STORE FIX: MongoDBStore ---
const MongoDBStore = MongoStore(session);
const sessionStore = new MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions',
    expires: 1000 * 60 * 60 * 24 * 7,
});

sessionStore.on('error', function(error) {
    console.error("Session Store Error:", error);
});

app.use(
    session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 7
        },
    })
);

const storage = multer.memoryStorage();
// Upload limits: 15 MB max, and an allow-list of document mime types.
// `application/octet-stream` is allowed because client-side-encrypted files are
// uploaded as opaque binary blobs.
const ALLOWED_UPLOAD_TYPES = new Set([
    "image/png", "image/jpeg", "image/jpg", "image/webp",
    "application/pdf", "application/octet-stream",
]);
const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_UPLOAD_TYPES.has(file.mimetype)) return cb(null, true);
        cb(new Error("Unsupported file type. Allowed: PNG, JPEG, WEBP, PDF."));
    },
});

// Surface multer errors (size/type) as clean JSON instead of a stack trace.
function handleUpload(field) {
    return (req, res, next) => {
        upload.single(field)(req, res, (err) => {
            if (err) return res.status(400).json({ message: err.message || "Upload failed." });
            next();
        });
    };
}

// Serve vanilla frontend from frontend folder.
// dotfiles: 'allow' so /.well-known/assetlinks.json is served (Android TWA
// Digital Asset Links verification — removes the address bar in the APK).
app.use(express.static(path.join(__dirname, 'frontend'), { dotfiles: 'allow' }));

mongoose
    .connect(MONGODB_URI)
    .then(() => console.log(" Successfully connected to MongoDB Atlas!"))
    .catch((err) => console.error(" MongoDB Connection error:", err.message));

// --- Blockchain Setup (omitted for brevity) ---
const web3 = new Web3(process.env.WEB3_PROVIDER_URL || "http://127.0.0.1:7545");
const accountAddress = process.env.ACCOUNT_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;

async function sendHashToBlockchain(fileHash) {
    try {
        if (!web3.utils.isAddress(accountAddress)) {
            throw new Error(`Invalid account address: ${accountAddress}. Please check your .env file.`);
        }
        if (!privateKey || privateKey.length < 64) {
            throw new Error("Private key is missing or invalid. Please check your .env file.");
        }

        const txCount = await web3.eth.getTransactionCount(accountAddress);
        const networkGasPrice = await web3.eth.getGasPrice();

        const increasedGasPrice = BigInt(networkGasPrice) * BigInt(125) / BigInt(100);

        const tx = {
            nonce: web3.utils.toHex(txCount),
            gasLimit: web3.utils.toHex(500000),
            gasPrice: web3.utils.toHex(increasedGasPrice),
            to: accountAddress,
            value: "0x0",
            data: web3.utils.toHex(fileHash),
        };

        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
        if (!signedTx || !signedTx.rawTransaction) {
            throw new Error("Failed to sign transaction, rawTransaction is missing.");
        }

        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log(" Blockchain Tx Successful:", receipt.transactionHash);
        return receipt.transactionHash;
    } catch (err) {
        console.error(" Blockchain Tx Failed:", err.message || err);
        return null;
    }
}
// --- AI / OCR removed for privacy ---
// Google Gemini (and Tesseract) previously read the uploaded document. Both were
// removed: Gemini sent the document to a third party, and local OCR produced
// character errors that caused false rejections. No document is analysed by any
// OCR/AI engine anywhere in this server.

// --- n8n automation webhook (WhatsApp + email on verification) ---
// Fire-and-forget POST to your n8n instance on your VPS. Set N8N_WEBHOOK_URL in
// .env (your n8n Webhook node URL); n8n handles the actual WhatsApp + email
// delivery. Optionally set N8N_WEBHOOK_TOKEN so the webhook can reject callers
// that don't present the token. Never blocks or fails the verification.
async function notifyN8N(event, payload) {
    const url = process.env.N8N_WEBHOOK_URL;
    if (!url) return; // not configured — skip silently
    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(process.env.N8N_WEBHOOK_TOKEN ? { "x-webhook-token": process.env.N8N_WEBHOOK_TOKEN } : {}),
            },
            body: JSON.stringify({ event, at: new Date().toISOString(), ...payload }),
        });
        console.log(`🔔 n8n notified (${event}): HTTP ${resp.status}`);
    } catch (e) {
        console.error("n8n webhook failed:", e.message);
    }
}

// --- Mongoose Schemas ---
const userSchema = new mongoose.Schema({
    fullName: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    walletAddress: { type: String, unique: true, sparse: true }
});
const User = mongoose.model("User", userSchema, "users");

const authorizedDocumentSchema = new mongoose.Schema({
    docNumber: { type: String, required: true, unique: true },
    docType: String,
});
const AuthorizedDocument = mongoose.model(
    "AuthorizedDocument",
    authorizedDocumentSchema,
    "authorized_documents"
);

const verificationSchema = new mongoose.Schema({
    qrId: { type: String, unique: true, sparse: true },
    docId: String,
    docType: String,
    docNumber: String,
    fileHash: String,
    transactionHash: String,
    verificationStatus: { type: String, default: "Pending" },
    userId: mongoose.Schema.Types.ObjectId,
    submittedAt: { type: Date, default: Date.now },
    documentCID: String, // <-- Stores the IPFS Content Identifier
    encrypted: { type: Boolean, default: false },           // stored as ciphertext on IPFS
    passphraseProtected: { type: Boolean, default: false }, // needs a user passphrase to open
    mimeType: String,                                       // original file mime (for correct view)
});
const DocumentVerification = mongoose.model(
    "DocumentVerification",
    verificationSchema,
    "document_verifications"
);

const messageSchema = new mongoose.Schema({
    subject: String,
    message: String,
    submittedBy: mongoose.Schema.Types.ObjectId,
    submittedAt: { type: Date, default: Date.now },
});
const ContactMessage = mongoose.model(
    "ContactMessage",
    messageSchema,
    "contact_messages"
);

const settingsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
});
const UserSettings = mongoose.model("UserSettings", settingsSchema, "user_settings");

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 } // Expires in 5 minutes
});
const OTP = mongoose.model("OTP", otpSchema);

// --- ISSUER PORTAL: Published documents (issuer -> receiver) ---
// Off-chain mirror of the on-chain DocVerifyRegistry record. The blockchain
// (deployed via Remix) holds the immutable proof; this mirror enables fast
// listing and metadata, and access is gated to the issuer/receiver wallets.
const issuedDocumentSchema = new mongoose.Schema({
    docId: { type: String, required: true, unique: true }, // bytes32 hex used on-chain
    fileHash: { type: String, required: true },            // keccak256 of file bytes (on-chain L5)
    sha256: String,                                        // L1 — SHA-256 exact file hash
    pHash: String,                                         // L3 — perceptual hash (binary string)
    watermarked: { type: Boolean, default: false },        // L2 — invisible watermark embedded
    issuerWallet: { type: String, required: true },        // checksummed sender address
    receiverWallet: { type: String, required: true },      // checksummed recipient address
    receiverEmail: { type: String, lowercase: true, trim: true }, // recipient's User-Portal email
    documentCID: { type: String, required: true },         // IPFS CID
    mimeType: String,                                      // original file mime (for correct view/download)
    fileName: String,                                      // original file name
    docType: String,
    docNumber: String,
    transactionHash: String,                               // on-chain tx hash
    encrypted: { type: Boolean, default: false },          // server-vault encrypted on IPFS
    passphraseProtected: { type: Boolean, default: false }, // needs a user passphrase to open
    issuedAt: { type: Date, default: Date.now },
});
const IssuedDocument = mongoose.model("IssuedDocument", issuedDocumentSchema, "issued_documents");

// --- Secure Share: a temporary, revocable grant to view ONE document. ---
// Lives off-chain by design: the blockchain proves the document is authentic
// (permanent), while a share is private + time-limited + revocable. A TTL index
// auto-deletes the record at `expiresAt`; because the wrapped key lives inside
// the record, deletion makes the encrypted share copy permanently unreadable.
const documentShareSchema = new mongoose.Schema({
    shareId: { type: String, required: true, unique: true },   // public id, used in the URL + management
    docId: { type: String, required: true },                   // -> issued_documents.docId
    // Who created the share (for ownership checks + the "Manage shares" list).
    ownerWallet: String,
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Audience: an anonymous expiring link, or a specific registered user.
    audience: { type: String, enum: ["link", "user"], default: "link" },
    recipientEmail: { type: String, lowercase: true, trim: true },
    recipientWallet: String,
    // Access gate the recipient must pass: nothing, an email code, or a password.
    gate: { type: String, enum: ["none", "otp", "password"], default: "none" },
    passwordSalt: String,
    passwordHash: String,
    otpCodeHash: String,                                       // hash of the active email code
    otpExpiresAt: Date,
    otpAttempts: { type: Number, default: 0 },
    // Capability secret: we store ONLY the hash of the link token.
    tokenHash: String,
    // Encryption tier + storage.
    tier: { type: String, enum: ["server", "zk"], default: "server" },
    shareCID: String,                                          // IPFS CID of the encrypted share copy
    wrappedKey: String,                                        // server tier: DEK wrapped under master key (cleared on revoke)
    zkMeta: {                                                  // zk tier: non-secret hints for the browser to decrypt
        algo: String,
        ivB64: String,
        saltB64: String,
        kdf: String,
    },
    mimeType: String,
    fileName: String,
    docType: String,
    docNumber: String,
    // Limits.
    expiresAt: { type: Date, required: true },
    maxViews: { type: Number, default: 0 },                    // 0 = unlimited
    viewCount: { type: Number, default: 0 },
    revoked: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});
documentShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-purge at expiry
const DocumentShare = mongoose.model("DocumentShare", documentShareSchema, "document_shares");

// --- Audit trail: every share action (create / open / deny / revoke). ---
const shareAccessLogSchema = new mongoose.Schema({
    shareId: String,
    docId: String,
    event: String,        // created | opened | denied | gate_sent | gate_failed | revoked
    detail: String,
    ip: String,
    userAgent: String,
    at: { type: Date, default: Date.now },
});
const ShareAccessLog = mongoose.model("ShareAccessLog", shareAccessLogSchema, "share_access_logs");

// --- EMAIL TRANSPORTER ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- Middleware (omitted for brevity) ---
function isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    res.status(401).json({ message: "Authentication required" });
}

// ----------------------------------------------------
// --- ROUTES (Defined after all Models & Middleware) ---
// ----------------------------------------------------

// Authentication Routes (omitted for brevity)
app.post("/api/auth/send-email-otp", authLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Remove existing OTP for this email
        await OTP.deleteMany({ email });
        
        // Save new OTP
        await new OTP({ email, otp }).save();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Document Portal Verification Code',
            text: `Your verification code is: ${otp}\n\nThis code will expire in 5 minutes.`
        };

        console.log(`🔧 Attempting to send email...`);
        console.log(`Sender: ${process.env.EMAIL_USER}`);
        console.log(`Password configured: ${process.env.EMAIL_PASS ? 'Yes' : 'No'} (Length: ${process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0})`);
        
        try {
            await transporter.sendMail(mailOptions);
            console.log(`📧 OTP sent via Gmail to ${email}`);
            res.json({ message: "OTP sent successfully" });
        } catch (emailError) {
            // Never leak the OTP to the client. Fail cleanly and log the real
            // reason server-side (usually EMAIL_USER/EMAIL_PASS misconfig).
            console.error("❌ Gmail Send Failed:", emailError.message);
            await OTP.deleteMany({ email });   // don't leave a code that can't be delivered
            res.status(502).json({ message: "Could not send the verification email. Please try again shortly." });
        }
    } catch (error) {
        console.error("System error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.post("/api/auth/verify-email-otp", authLimiter, async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    try {
        const record = await OTP.findOne({ email, otp });
        if (!record) {
            return res.status(400).json({ message: "Invalid or expired verification code" });
        }
        
        // Delete OTP after successful verification
        await OTP.deleteOne({ _id: record._id });
        
        res.json({ message: "Email verified successfully" });
    } catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).json({ message: "Verification failed" });
    }
});
app.post("/api/auth/signup", authLimiter, async (req, res) => {
    const { fullName, email, password, phone } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ fullName, email, password: hashedPassword, phone });
        await user.save();

        req.session.userId = user._id;
        await new UserSettings({ userId: user._id }).save();

        res.status(201).json({ message: "Account created successfully!" });
    } catch (error) {
        console.error("Error during sign-up:", error.message);
        res.status(400).json({ message: "Email already in use or invalid data." });
    }
});

app.post("/api/auth/signin", authLimiter, async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });

        req.session.userId = user._id;
        res.json({ message: "Signed in successfully!", user: { fullName: user.fullName } });
    } catch (error) {
        console.error("Error during sign-in:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
});

app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).json({ message: "Failed to log out." });
        }
        res.json({ message: "Logged out successfully." });
    });
});

// User Profile Routes (omitted for brevity)
app.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select("-password");
        if (!user) return res.status(404).json({ message: "User not found." });
        res.json(user);
    } catch (error) {
        console.error("Error fetching profile:", error.message);
        res.status(500).json({ message: "Failed to fetch profile." });
    }
});

app.put("/api/profile", isAuthenticated, async (req, res) => {
    try {
        const { fullName, email, phone } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser._id.toString() !== req.session.userId.toString()) {
            return res.status(400).json({ message: "Email already in use by another account." });
        }

        await User.findByIdAndUpdate(req.session.userId, { fullName, email, phone }, { new: true });
        res.json({ message: "Profile updated successfully!" });
    } catch (error) {
        console.error("Error updating profile:", error.message);
        res.status(500).json({ message: "Failed to update profile." });
    }
});

app.put("/api/settings", isAuthenticated, async (req, res) => {
    try {
        const { emailNotifications, smsNotifications } = req.body;
        await UserSettings.findOneAndUpdate({ userId: req.session.userId }, { emailNotifications, smsNotifications }, { new: true, upsert: true });
        res.json({ message: "Settings updated successfully!" });
    } catch (error) {
        console.error("Error updating settings:", error.message);
        res.status(500).json({ message: "Failed to update settings." });
    }
});

// --- RESTORED ROUTE: Link Wallet Address to Profile (FIXED LOCATION) ---
app.post("/api/profile/link-wallet", isAuthenticated, async (req, res) => {
    const { walletAddress } = req.body;
    const userId = req.session.userId;

    if (!walletAddress || !web3.utils.isAddress(walletAddress)) {
        return res.status(400).json({ message: "Invalid wallet address provided." });
    }

    try {
        const existingUser = await User.findOne({ walletAddress: web3.utils.toChecksumAddress(walletAddress) });
        if (existingUser && existingUser._id.toString() !== userId.toString()) {
            return res.status(400).json({ message: "This wallet address is already linked to another user account." });
        }

        await User.findByIdAndUpdate(userId, { walletAddress: web3.utils.toChecksumAddress(walletAddress) });
        res.json({ message: "Wallet address linked successfully!" });
    } catch (error) {
        console.error("Error linking wallet:", error.message);
        res.status(500).json({ message: "Failed to link wallet." });
    }
});

// --- Unlink the wallet from the current user's profile ---
app.post("/api/profile/unlink-wallet", isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    try {
        // $unset keeps the unique sparse index happy (removes the field entirely).
        await User.findByIdAndUpdate(userId, { $unset: { walletAddress: "" } });
        res.json({ message: "Wallet address unlinked successfully!" });
    } catch (error) {
        console.error("Error unlinking wallet:", error.message);
        res.status(500).json({ message: "Failed to unlink wallet." });
    }
});

// Document Verification Route (omitted for brevity)
app.post("/api/verify", heavyLimiter, isAuthenticated, handleUpload("document"), async (req, res) => {
        // Gemini is stateless, no worker check needed


    const { docType, docNumber } = req.body;
    const userId = new mongoose.Types.ObjectId(req.session.userId);

    if (!docType || !docNumber || !req.file) {
        return res.status(400).json({ message: "All fields are required (Document Type, Document Number, and Document File)." });
    }
    if (!req.file.buffer) {
        return res.status(400).json({ message: "Uploaded file is empty or corrupted." });
    }

    let documentCID = null;
    let verificationStatus = "Rejected";
    let transactionHash = null;
    let qrId;
    let qrCodeDataUrl = null;
    let qrLink = null;

    try {
        // =================================================================
        // *** FIX: STEP 1 - CHECK FOR EXISTING VERIFIED RECORD BY USER ***
        // =================================================================
        const existingRecord = await DocumentVerification.findOne({
            docNumber: docNumber,
            userId: userId, // Check by user ID as well
            verificationStatus: "Verified"
        });

        if (existingRecord) {
            console.log("Existing verified record found for this user. Regenerating QR Code Image.");

            const existingQrId = existingRecord.qrId;
            const existingQrLink = existingQrId ?
                `${process.env.RENDER_APP_URL || `http://localhost:${port}`}/verify-qr?id=${existingQrId}`
                : null;

            let existingQrCodeDataUrl = null;

            // --- CRITICAL FIX: Regenerate the QR Code Image Data URL ---
            if (existingQrLink) {
                existingQrCodeDataUrl = await qrcode.toDataURL(existingQrLink);
                console.log("QR Code Image Regenerated Successfully.");
            }
            // -----------------------------------------------------------

            return res.json({
                message: "Document Already Verified!",
                verificationStatus: "Verified",
                fileHash: existingRecord.fileHash,
                transactionHash: existingRecord.transactionHash,
                documentCID: existingRecord.documentCID,
                qrCodeLink: existingQrLink,       // Pass the permanent link
                qrCodeDataUrl: existingQrCodeDataUrl, // <-- PASS THE REGENERATED IMAGE DATA
            });
        }
        // =================================================================

        // --- STEP 2: NEW VERIFICATION (no OCR/AI) ---
        // Document details come from the submitted form. OCR was removed: local
        // OCR produced character errors (false rejections) and cloud OCR sent the
        // document to a third party. The file is ENCRYPTED before storage, so
        // IPFS/Pinata only ever receives ciphertext.

        const fileHash = web3.utils.sha3(req.file.buffer); // hash of the ORIGINAL bytes (for re-verification)

        // Mandatory encryption. The passphrase is OPTIONAL: with one, the file
        // can only be opened by someone who enters it on our site; without one,
        // the server can open it with its master key. Either way, storage sees
        // only ciphertext.
        let passphraseProtected = false;
        let encrypted = false;
        let storedBuffer = req.file.buffer;
        if (isVaultConfigured()) {
            const passphrase = req.body.passphrase || "";
            passphraseProtected = passphrase.length > 0;
            storedBuffer = vaultEncrypt(req.file.buffer, passphrase);
            encrypted = true;
        } else {
            console.warn("DOC_MASTER_KEY not configured — document stored WITHOUT encryption.");
        }

        // --- IPFS UPLOAD (ciphertext) ---
        if (pinata && PINATA_API_KEY && PINATA_SECRET_API_KEY) {
            const readableStreamForFile = stream.Readable.from(storedBuffer);
            readableStreamForFile.path = req.file.originalname;

            const pinataResponse = await pinata.pinFileToIPFS(readableStreamForFile, {
                pinataMetadata: {
                    name: `Verified_Doc_${docNumber}`,
                    keyvalues: { docNumber: docNumber, userId: userId.toString() }
                }
            });

            documentCID = pinataResponse.IpfsHash;
            console.log("IPFS Upload Successful (encrypted:", encrypted, "). CID:", documentCID);
        } else {
            console.error("Pinata SDK not fully initialized (check environment keys). Document CID will be null.");
        }

        // --- AUTHORIZATION + BLOCKCHAIN ---
        // The claimed document number must be on the authorised list.
        const isAuthorized = await AuthorizedDocument.findOne({ docNumber: docNumber });
        if (isAuthorized) {
            if (documentCID) {
                verificationStatus = "Verified";
                transactionHash = await sendHashToBlockchain(fileHash);
            } else {
                verificationStatus = "Rejected";
                console.error("Verification failed: Document could not be pinned to IPFS.");
            }
        }

        // --- 2.4 FINAL RECORD AND QR GENERATION ---
        if (verificationStatus === "Verified" && transactionHash && documentCID) {
            qrId = uuidv4(); // Generate new QR ID only for a new successful verification
            const baseUrl = process.env.RENDER_APP_URL || `http://localhost:${port}`;
            qrLink = `${baseUrl}/verify-qr?id=${qrId}`;
            qrCodeDataUrl = await qrcode.toDataURL(qrLink);
        } else {
            verificationStatus = "Rejected";
        }

        const verificationData = {
            docId: uuidv4(),
            docType,
            docNumber,
            fileHash,
            transactionHash,
            verificationStatus,
            userId,
            documentCID,
            encrypted,
            passphraseProtected,
            mimeType: req.file.mimetype,
        };

// ✅ ONLY add qrId if it exists
        if (qrId) {
            verificationData.qrId = qrId;
        }

        const newVerification = new DocumentVerification(verificationData);
        await newVerification.save();


        if (verificationStatus === "Verified") {
            // Notify the user via n8n (WhatsApp + email) — fire-and-forget.
            User.findById(userId).select("fullName email phone").then((u) => {
                notifyN8N("document_verified", {
                    user: { name: u?.fullName, email: u?.email, phone: u?.phone },
                    document: { docType, docNumber, fileHash, transactionHash, documentCID, verifiedAt: new Date().toISOString() },
                });
            }).catch(() => {});

            res.json({
                message: "Document Found and Verified!",
                verificationStatus: "Verified",
                fileHash,
                transactionHash,
                qrCodeDataUrl,
                documentCID: documentCID,
                qrCodeLink: qrLink,
            });
        } else {
            res.status(404).json({
                message: "Document not found or invalid. Verification Rejected.",
                verificationStatus: "Rejected",
                fileHash: newVerification.fileHash, // Return hash even if rejected for debugging
                transactionHash: null,
                documentCID: null,
                qrCodeDataUrl: null,
                qrCodeLink: null
            });
        }

    } catch (error) {
        console.error("Error during verification:", error.message);
        if (error.message && error.message.includes('API Key') || error.message.includes('pinFileToIPFS')) {
            return res.status(500).json({ message: "Verification failed. Pinata API Keys may be incorrect or missing from your .env/Render environment." });
        }
        res.status(500).json({ message: `An internal server error occurred during verification: ${error.message}` });
    }
});


// QR Code Initial Check Endpoint (omitted for brevity)
app.get("/api/qr-check", async (req, res) => {
    const qrId = req.query.id;
    if (!qrId) {
        return res.status(400).json({ message: "QR Document ID is required." });
    }

    try {
        const verificationRecord = await DocumentVerification.findOne({ qrId: qrId });

        if (!verificationRecord) {
            return res.status(404).json({ message: "Document verification record not found for this QR code." });
        }

        res.json({
            verificationStatus: verificationRecord.verificationStatus,
            docType: verificationRecord.docType,
            submittedAt: verificationRecord.submittedAt,
            message: "Initial verification check successful."
        });
    } catch (error) {
        console.error("Error during QR initial check:", error.message);
        res.status(500).json({ message: "An internal server error occurred during QR check." });
    }
});

// FINAL: Web3 Signature Verification Endpoint with Authorization Check
app.post("/api/qr-verify-signature", async (req, res) => {
    const { qrId, walletAddress, signature, message } = req.body;

    if (!qrId || !walletAddress || !signature || !message) {
        return res.status(400).json({ message: "QR ID, Wallet Address, Signature, and Message are required." });
    }

    try {
        const recoveredAddress = await web3.eth.accounts.recover(message, signature);
        const recoveredAddressChecksum = web3.utils.toChecksumAddress(recoveredAddress);
        const walletAddressChecksum = web3.utils.toChecksumAddress(walletAddress);

        if (recoveredAddressChecksum !== walletAddressChecksum) {
            return res.status(401).json({ message: "Invalid cryptographic signature." });
        }

        const verificationRecord = await DocumentVerification.findOne({ qrId: qrId });
        if (!verificationRecord) {
            return res.status(404).json({ message: "Document record not found." });
        }

        const owner = await User.findById(verificationRecord.userId);

        if (!owner) {
            return res.status(404).json({ message: "Document owner not found." });
        }

        // IMPROVED LOGIC: Allow access if user has no wallet linked OR if wallet matches
        if (!owner.walletAddress) {
            // If owner hasn't linked a wallet, allow any valid signature but warn
            console.log(`⚠️  Document owner has no wallet linked. Allowing access for wallet: ${recoveredAddressChecksum}`);
            
            return res.json({
                message: "Signature verified. Full details revealed. (Note: Document owner has not linked a wallet)",
                docType: verificationRecord.docType,
                docNumber: verificationRecord.docNumber,
                fileHash: verificationRecord.fileHash,
                transactionHash: verificationRecord.transactionHash,
                verificationStatus: verificationRecord.verificationStatus,
                documentCID: verificationRecord.documentCID,
                warning: "The document owner has not linked a MetaMask wallet to their account."
            });
        }

        const ownerWalletChecksum = web3.utils.toChecksumAddress(owner.walletAddress);

        if (recoveredAddressChecksum !== ownerWalletChecksum) {
            console.warn(`ACCESS DENIED: Wallet ${recoveredAddressChecksum} tried to unlock document owned by ${ownerWalletChecksum}`);
            return res.status(403).json({ 
                message: "Access Denied: The signing wallet does not match the registered document owner.",
                details: {
                    yourWallet: recoveredAddressChecksum,
                    requiredWallet: ownerWalletChecksum,
                    suggestion: "Please use the correct wallet or link your current wallet to your account in the Profile section."
                }
            });
        }

        // Perfect match - wallet is linked and matches
        console.log(`✅ Wallet verification successful: ${recoveredAddressChecksum} matches owner wallet`);
        
        res.json({
            message: "Signature verified. Full details revealed.",
            docType: verificationRecord.docType,
            docNumber: verificationRecord.docNumber,
            fileHash: verificationRecord.fileHash,
            transactionHash: verificationRecord.transactionHash,
            verificationStatus: verificationRecord.verificationStatus,
            documentCID: verificationRecord.documentCID,
        });

    } catch (error) {
        console.error("Error during signature verification:", error.message || error);
        res.status(500).json({ message: "An internal server error occurred during signature verification." });
    }
});

// Test endpoint to add authorized documents (for development)
app.post("/api/add-test-documents", async (req, res) => {
    try {
        const testDocuments = [
            { docNumber: "BC-2023-001", docType: "Birth Certificate" },
            { docNumber: "BC-2023-002", docType: "Birth Certificate" },
            { docNumber: "EC-2023-001", docType: "Educational Certificate" },
            { docNumber: "EC-2023-002", docType: "Educational Certificate" },
            { docNumber: "PD-2023-001", docType: "Property Document" },
            { docNumber: "PD-2023-002", docType: "Property Document" },
            { docNumber: "ID-2023-001", docType: "Identity Document" },
            { docNumber: "ID-2023-002", docType: "Identity Document" },
            { docNumber: "TEST-001", docType: "Birth Certificate" },
            { docNumber: "TEST-002", docType: "Educational Certificate" }
        ];

        for (const doc of testDocuments) {
            await AuthorizedDocument.findOneAndUpdate(
                { docNumber: doc.docNumber },
                doc,
                { upsert: true, new: true }
            );
        }

        res.json({ 
            message: "Test authorized documents added successfully!", 
            count: testDocuments.length,
            documents: testDocuments
        });
    } catch (error) {
        console.error("Error adding test documents:", error.message);
        res.status(500).json({ message: "Failed to add test documents." });
    }
});

// Statistics and Contact Routes (omitted for brevity)
app.get("/api/stats", isAuthenticated, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.session.userId);
        console.log("📊 Fetching statistics for user ID:", userId);

        // Get comprehensive document statistics
        const totalDocuments = await DocumentVerification.countDocuments({ userId });
        const verifiedDocuments = await DocumentVerification.countDocuments({
            userId,
            verificationStatus: "Verified",
        });
        const rejectedDocuments = await DocumentVerification.countDocuments({
            userId,
            verificationStatus: "Rejected",
        });
        const pendingDocuments = await DocumentVerification.countDocuments({
            userId,
            verificationStatus: "Pending",
        });

        // Get documents by type
        const documentsByType = await DocumentVerification.aggregate([
            { $match: { userId: userId } },
            { $group: { _id: "$docType", count: { $sum: 1 } } }
        ]);

        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentActivity = await DocumentVerification.countDocuments({
            userId,
            submittedAt: { $gte: thirtyDaysAgo }
        });

        // Include documents RECEIVED through the Issuer Portal (matched by the
        // user's email or linked wallet) — this is the data the account
        // actually uses; every received doc is on-chain, i.e. Verified.
        const statsUser = await User.findById(userId).select("email walletAddress");
        const recOr = [];
        if (statsUser?.email) recOr.push({ receiverEmail: statsUser.email.toLowerCase().trim() });
        if (statsUser?.walletAddress) recOr.push({ receiverWallet: web3.utils.toChecksumAddress(statsUser.walletAddress) });
        const receivedDocs = recOr.length
            ? await IssuedDocument.find({ $or: recOr }).select("docType documentCID transactionHash issuedAt")
            : [];

        const totalCombined = totalDocuments + receivedDocs.length;
        const verifiedCombined = verifiedDocuments + receivedDocs.length;
        const successRate = totalCombined > 0 ? Math.round((verifiedCombined / totalCombined) * 100) : 0;

        const byType = documentsByType.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});
        for (const d of receivedDocs) {
            const t = d.docType || "Document";
            byType[t] = (byType[t] || 0) + 1;
        }

        const statistics = {
            // Dashboard compatibility (old field names)
            totalVerified: totalCombined,
            successfulVerifications: verifiedCombined,
            pendingRequests: pendingDocuments,

            // New comprehensive statistics (legacy Verify flow + received docs)
            totalDocuments: totalCombined,
            verifiedDocuments: verifiedCombined,
            rejectedDocuments,
            pendingDocuments,
            documentsByType: byType,
            recentActivity: recentActivity + receivedDocs.filter(d => d.issuedAt >= thirtyDaysAgo).length,
            successRate,

            // Additional metrics
            totalIPFSUploads: (await DocumentVerification.countDocuments({
                userId,
                documentCID: { $exists: true, $ne: null }
            })) + receivedDocs.filter(d => d.documentCID).length,
            totalBlockchainTransactions: (await DocumentVerification.countDocuments({
                userId,
                transactionHash: { $exists: true, $ne: null }
            })) + receivedDocs.filter(d => d.transactionHash).length,
        };

        console.log("📊 Statistics calculated:", statistics);
        res.json(statistics);
    } catch (error) {
        console.error("Error fetching statistics:", error.message);
        res.status(500).json({ message: "Failed to fetch statistics." });
    }
});

// Get user's verified documents
app.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.session.userId);
        console.log("📊 Fetching documents for user ID:", userId);

        const documents = await DocumentVerification.find({ userId })
            .sort({ submittedAt: -1 }) // Most recent first
            .select('docId docType docNumber fileHash transactionHash verificationStatus submittedAt documentCID qrId');

        console.log(`📊 Found ${documents.length} documents for user`);

        // Transform the documents to match frontend expectations
        const transformedDocuments = documents.map(doc => ({
            id: doc.docId,
            docId: doc.docId,
            name: `${doc.docType} - ${doc.docNumber}`,
            docNumber: doc.docNumber,
            docType: doc.docType,
            ipfsHash: doc.documentCID,
            documentCID: doc.documentCID,
            uploadDate: doc.submittedAt, // Keep as Date object
            submittedAt: doc.submittedAt, // Keep as Date object
            status: doc.verificationStatus,
            fileType: 'application/pdf', // Default file type
            fileHash: doc.fileHash,
            transactionHash: doc.transactionHash,
            qrId: doc.qrId,
        }));

        console.log("📊 Transformed documents:", transformedDocuments.length);
        res.json(transformedDocuments);
    } catch (error) {
        console.error("Error fetching documents:", error.message);
        res.status(500).json({ message: "Failed to fetch documents." });
    }
});

// Get document content from IPFS with MetaMask verification
app.post("/api/documents/:docId/view", isAuthenticated, async (req, res) => {
    try {
        const { docId } = req.params;
        const { walletAddress, signature } = req.body;
        
        console.log("🔍 Document view request for docId:", docId);
        console.log("🦊 Wallet address:", walletAddress);
        
        // Find the document
        const userId = new mongoose.Types.ObjectId(req.session.userId);
        const document = await DocumentVerification.findOne({ 
            docId: docId, 
            userId: userId 
        });
        
        if (!document) {
            return res.status(404).json({ message: "Document not found." });
        }

        // Wallet signature is OPTIONAL. The login session (isAuthenticated) plus the
        // ownership filter above (docId + userId) already authorise this user for
        // their own document. Desktop/MetaMask may still send a signature as an
        // extra check; the mobile app omits it. Verify only if one is supplied.
        if (walletAddress && signature) {
            try {
                const message = `Access document: ${docId}`;
                const recoveredAddress = web3.eth.accounts.recover(message, signature);
                if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                    return res.status(401).json({ message: "Invalid MetaMask signature." });
                }
            } catch (sigError) {
                console.error("❌ Signature verification failed:", sigError.message);
                return res.status(401).json({ message: "Invalid signature format." });
            }
        }
        
        // Fetch document from IPFS
        if (!document.documentCID) {
            return res.status(404).json({ message: "Document not found in IPFS." });
        }
        
        try {
            console.log("📥 Fetching document from IPFS:", document.documentCID);
            
            // Fetch from Pinata IPFS gateway
            const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${document.documentCID}`;
            const response = await fetch(ipfsUrl);
            
            if (!response.ok) {
                throw new Error(`IPFS fetch failed: ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type') || 'application/octet-stream';
            let bytes = Buffer.from(await response.arrayBuffer());

            // Decrypt if it's an encrypted vault blob. A server-key doc (no user
            // passphrase) is decrypted automatically; a passphrase-protected doc
            // asks for the passphrase (428) and decrypts it here.
            if (isVaultBlob(bytes)) {
                if (req.body.passphrase) {
                    try { bytes = vaultDecrypt(bytes, req.body.passphrase); }
                    catch { return res.status(401).json({ message: "Wrong passphrase.", needsPassphrase: true }); }
                } else if (document.passphraseProtected) {
                    return res.status(428).json({ message: "Passphrase required.", needsPassphrase: true });
                } else {
                    // Server-key doc → decrypt with the master key; if that fails it is
                    // an older passphrase-protected doc, so ask for the passphrase.
                    try { bytes = vaultDecrypt(bytes, ""); }
                    catch { return res.status(428).json({ message: "Passphrase required.", needsPassphrase: true }); }
                }
            }

            console.log("✅ Document fetched from IPFS successfully");

            // Return document metadata and content
            res.json({
                success: true,
                document: {
                    id: document.docId,
                    name: `${document.docType} - ${document.docNumber}`,
                    docType: document.docType,
                    docNumber: document.docNumber,
                    contentType: document.mimeType || contentType,
                    size: bytes.byteLength,
                    ipfsHash: document.documentCID,
                    transactionHash: document.transactionHash,
                    verificationStatus: document.verificationStatus,
                    submittedAt: document.submittedAt
                },
                content: bytes.toString('base64'), // Base64 encoded content
            });
            
        } catch (ipfsError) {
            console.error("❌ IPFS fetch error:", ipfsError.message);
            res.status(500).json({ message: "Failed to fetch document from IPFS." });
        }
        
    } catch (error) {
        console.error("❌ Document view error:", error.message);
        res.status(500).json({ message: "Failed to access document." });
    }
});

app.post("/api/contact", isAuthenticated, async (req, res) => {
    const { subject, message } = req.body;
    try {
        const contactMessage = new ContactMessage({
            subject,
            message,
            submittedBy: req.session.userId,
        });
        await contactMessage.save();
        res.status(201).json({ message: "Message sent successfully!" });
    } catch (error) {
        console.error("Error sending contact message:", error.message);
        res.status(500).json({ message: "Failed to send message." });
    }
});

// ====================================================================
// --- ISSUER PORTAL ROUTES (MetaMask-wallet authenticated) ---
// ====================================================================

// Recover the signing wallet from a message + signature, checksummed.
async function recoverSigner(message, signature) {
    const recovered = await web3.eth.accounts.recover(message, signature);
    return web3.utils.toChecksumAddress(recovered);
}

// Middleware-style helper: verifies that `signature` over `message` was produced
// by `walletAddress`. Returns the checksummed address, or null on failure.
async function verifyWalletSignature(walletAddress, signature, message) {
    try {
        if (!walletAddress || !signature || !message) return null;
        if (!web3.utils.isAddress(walletAddress)) return null;
        const recovered = await recoverSigner(message, signature);
        if (recovered !== web3.utils.toChecksumAddress(walletAddress)) return null;
        return recovered;
    } catch (err) {
        console.error("Issuer signature verification failed:", err.message || err);
        return null;
    }
}

// --- Upload the original file to IPFS (issuer-authenticated) ---
// Returns the IPFS CID + keccak256 file hash so the frontend can publish them
// on-chain (via the issuer's MetaMask) before mirroring the record here.
app.post("/api/issuer/upload", heavyLimiter, handleUpload("document"), async (req, res) => {
    const { walletAddress, signature, message } = req.body;

    const issuer = await verifyWalletSignature(walletAddress, signature, message);
    if (!issuer) {
        return res.status(401).json({ message: "Invalid MetaMask signature. Please reconnect your wallet." });
    }

    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ message: "A document file is required." });
    }

    try {
        if (!pinata || !PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
            return res.status(500).json({ message: "IPFS storage is not configured (missing Pinata keys)." });
        }

        // docId is generated here so the invisible watermark can carry it.
        const docId = web3.utils.sha3(uuidv4() + Date.now());
        // Encryption is MANDATORY — storage only ever sees ciphertext. The
        // passphrase is OPTIONAL: with one, only someone who enters it on our
        // site can open the file; without one, the server opens it with its
        // master key.
        const passphrase = req.body.passphrase || "";
        const passphraseProtected = passphrase.length > 0;
        const encrypted = isVaultConfigured();
        const isImage = (req.file.mimetype || "").startsWith("image/");

        if (!encrypted) {
            console.warn("DOC_MASTER_KEY not configured — issued document stored WITHOUT encryption.");
        }
        if (passphraseProtected && passphrase.length < 6) {
            return res.status(400).json({ message: "If you set a passphrase, it must be at least 6 characters." });
        }

        // Start from the plaintext (the server receives plaintext for site-gated
        // encryption — that's what lets it gate decryption later).
        let plaintext = req.file.buffer;

        // --- Layer 2: embed an invisible watermark on the plaintext image
        //     (only when the Python service is configured/running). ---
        let watermarked = false;
        if (isImage && isWatermarkServiceConfigured()) {
            const wm = await embedWatermark(plaintext, docId, req.file.originalname);
            if (wm) { plaintext = wm; watermarked = true; }
        }

        // Fingerprints describe the PLAINTEXT the verifier will hold after the
        // server decrypts it — so the 5-layer check works for encrypted docs too.
        const sha256 = computeSha256(plaintext);          // L1
        const pHash = await computePHash(plaintext);      // L3 (null for non-images)

        // Always encrypt before pinning (when the vault is configured), then
        // pin the ciphertext to IPFS.
        const storedBuffer = encrypted ? vaultEncrypt(plaintext, passphrase) : plaintext;
        const fileHash = web3.utils.sha3(storedBuffer);   // keccak256 -> bytes32 (on-chain L5)

        const readableStreamForFile = stream.Readable.from(storedBuffer);
        readableStreamForFile.path = req.file.originalname || `issued_${Date.now()}`;

        const pinataResponse = await pinata.pinFileToIPFS(readableStreamForFile, {
            pinataMetadata: {
                name: `Issued_Doc_${Date.now()}`,
                keyvalues: { issuer }
            }
        });

        const documentCID = pinataResponse.IpfsHash;
        console.log(`📤 Issuer upload pinned: ${documentCID} | watermark: ${watermarked} | pHash: ${pHash ? "yes" : "n/a"}`);

        res.json({
            docId, documentCID, fileHash, sha256, pHash, watermarked,
            encrypted, passphraseProtected,
            mimeType: req.file.mimetype || "application/octet-stream",
            fileName: req.file.originalname || "document",
        });
    } catch (error) {
        console.error("Error during issuer upload:", error.message);
        res.status(500).json({ message: "Failed to upload document to IPFS." });
    }
});

// --- Mirror an on-chain published record (issuer-authenticated) ---
app.post("/api/issuer/record", async (req, res) => {
    const {
        docId, fileHash, documentCID, receiverWallet, receiverEmail,
        docType, docNumber, transactionHash, encrypted, passphraseProtected,
        sha256, pHash, watermarked, mimeType, fileName,
        walletAddress, signature, message
    } = req.body;

    const issuer = await verifyWalletSignature(walletAddress, signature, message);
    if (!issuer) {
        return res.status(401).json({ message: "Invalid MetaMask signature. Please reconnect your wallet." });
    }

    if (!docId || !fileHash || !documentCID || !receiverWallet) {
        return res.status(400).json({ message: "docId, fileHash, documentCID and receiverWallet are required." });
    }
    if (!web3.utils.isAddress(receiverWallet)) {
        return res.status(400).json({ message: "Invalid receiver wallet address." });
    }
    if (receiverEmail && !/^\S+@\S+\.\S+$/.test(receiverEmail)) {
        return res.status(400).json({ message: "Invalid recipient email address." });
    }

    try {
        const record = await IssuedDocument.findOneAndUpdate(
            { docId },
            {
                docId,
                fileHash,
                sha256,
                pHash,
                watermarked: !!watermarked,
                issuerWallet: issuer,
                receiverWallet: web3.utils.toChecksumAddress(receiverWallet),
                receiverEmail: receiverEmail ? receiverEmail.toLowerCase().trim() : undefined,
                documentCID,
                mimeType,
                fileName,
                docType,
                docNumber,
                transactionHash,
                encrypted: !!encrypted,
                passphraseProtected: !!passphraseProtected,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log(`📝 Issued document recorded: ${docId} (${issuer} -> ${record.receiverWallet}${record.receiverEmail ? " / " + record.receiverEmail : ""})`);

        // Best-effort: notify the recipient by email that a document is waiting.
        if (record.receiverEmail && process.env.EMAIL_USER) {
            transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: record.receiverEmail,
                subject: "📄 A verified document was issued to you on DocVerify",
                text: `An issuer has published a document to you.\n\nType: ${docType || "Document"}\nNumber: ${docNumber || "—"}\n\nLog in to your DocVerify User Portal with this email to view it under "Received Documents".${record.encrypted ? "\n\nNote: this document is encrypted — ask the issuer for the passphrase to open it." : ""}`,
            }).then(() => console.log(`📧 Recipient notified: ${record.receiverEmail}`))
              .catch((e) => console.warn("Recipient email failed:", e.message));
        }

        res.status(201).json({ message: "Document published and recorded successfully!", docId: record.docId });
    } catch (error) {
        console.error("Error recording issued document:", error.message);
        res.status(500).json({ message: "Failed to record the published document." });
    }
});

// --- List documents accessible to a wallet: issued by OR received by it ---
app.post("/api/issuer/documents", async (req, res) => {
    const { walletAddress, signature, message } = req.body;

    const wallet = await verifyWalletSignature(walletAddress, signature, message);
    if (!wallet) {
        return res.status(401).json({ message: "Invalid MetaMask signature. Please reconnect your wallet." });
    }

    try {
        const docs = await IssuedDocument.find({
            $or: [{ issuerWallet: wallet }, { receiverWallet: wallet }]
        }).sort({ issuedAt: -1 });

        const transformed = docs.map(d => ({
            docId: d.docId,
            fileHash: d.fileHash,
            issuerWallet: d.issuerWallet,
            receiverWallet: d.receiverWallet,
            documentCID: d.documentCID,
            docType: d.docType,
            docNumber: d.docNumber,
            transactionHash: d.transactionHash,
            encrypted: d.encrypted,
            issuedAt: d.issuedAt,
            role: d.issuerWallet === wallet ? "issued" : "received",
        }));

        res.json(transformed);
    } catch (error) {
        console.error("Error listing issued documents:", error.message);
        res.status(500).json({ message: "Failed to fetch documents." });
    }
});

// --- Fetch a published document's content from IPFS (issuer/receiver only) ---
app.post("/api/issuer/documents/:docId/view", async (req, res) => {
    const { docId } = req.params;
    const { walletAddress, signature, message } = req.body;

    const wallet = await verifyWalletSignature(walletAddress, signature, message);
    if (!wallet) {
        return res.status(401).json({ message: "Invalid MetaMask signature. Please reconnect your wallet." });
    }

    try {
        const doc = await IssuedDocument.findOne({ docId });
        if (!doc) {
            return res.status(404).json({ message: "Document not found." });
        }

        // Access control: only the issuer (sender) or the receiver may view.
        if (wallet !== doc.issuerWallet && wallet !== doc.receiverWallet) {
            return res.status(403).json({
                message: "Access Denied: only the issuer or the designated receiver can open this document.",
            });
        }

        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${doc.documentCID}`;
        const response = await fetch(ipfsUrl);
        if (!response.ok) {
            throw new Error(`IPFS fetch failed: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        let bytes = Buffer.from(await response.arrayBuffer());

        // Site-gated decryption: vault blobs can only be opened here, with the
        // passphrase the user submits to our server.
        if (isVaultBlob(bytes)) {
            if (req.body.passphrase) {
                try { bytes = vaultDecrypt(bytes, req.body.passphrase); }
                catch { return res.status(401).json({ message: "Wrong passphrase.", needsPassphrase: true }); }
            } else if (doc.passphraseProtected) {
                return res.status(428).json({ message: "Passphrase required.", needsPassphrase: true });
            } else {
                // Server-key doc → decrypt with the master key. If that fails it is
                // an older passphrase-protected doc, so ask for the passphrase.
                try { bytes = vaultDecrypt(bytes, ""); }
                catch { return res.status(428).json({ message: "Passphrase required.", needsPassphrase: true }); }
            }
        }

        res.json({
            success: true,
            document: {
                docId: doc.docId,
                docType: doc.docType,
                docNumber: doc.docNumber,
                contentType: doc.mimeType || contentType,   // original mime so it opens correctly
                fileName: doc.fileName,
                size: bytes.byteLength,
                ipfsHash: doc.documentCID,
                transactionHash: doc.transactionHash,
                issuerWallet: doc.issuerWallet,
                receiverWallet: doc.receiverWallet,
                issuedAt: doc.issuedAt,
            },
            content: bytes.toString('base64'),
        });
    } catch (error) {
        console.error("Error viewing issued document:", error.message);
        res.status(500).json({ message: "Failed to fetch document from IPFS." });
    }
});

// ====================================================================
// --- 5-LAYER ANTI-COPY SECURITY CHECK (User Portal) ---
// ====================================================================
//
// Upload any file; the system fingerprints it (SHA-256 + pHash), finds the
// matching registered original (by exact hash, else nearest perceptual hash),
// then runs all five layers and returns a verdict. This is what rejects
// screenshots, photocopies, and phone photos of a registered document.
app.post("/api/security/check", heavyLimiter, isAuthenticated, handleUpload("document"), async (req, res) => {
    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ message: "A document file is required." });
    }

    try {
        const buffer = req.file.buffer;
        const sha256 = computeSha256(buffer);
        const pHash = await computePHash(buffer);

        // 1) Try an exact SHA-256 match against a registered original.
        let match = await IssuedDocument.findOne({ sha256 });
        let matchType = match ? "exact" : null;

        // 2) Otherwise find the nearest perceptual-hash match (detects copies).
        // ponytail: full-collection pHash scan, O(n) per check — fine at current
        // scale; add a BK-tree / prefiltered index if issued_documents grows >10k.
        if (!match && pHash) {
            const candidates = await IssuedDocument.find({ pHash: { $exists: true, $ne: null } })
                .select("docId sha256 pHash watermarked transactionHash docType docNumber");
            let best = null, bestDist = Infinity;
            for (const c of candidates) {
                const { distance } = comparePHash(pHash, c.pHash);
                if (distance !== null && distance < bestDist) { bestDist = distance; best = c; }
            }
            if (best && bestDist <= 15) { match = best; matchType = "perceptual"; }
        }

        const expected = match ? {
            sha256: match.sha256,
            pHash: match.pHash,
            docId: match.docId,
            watermarked: match.watermarked,
            filename: req.file.originalname,
        } : {};

        const blockchainRegistered = match ? !!match.transactionHash : false;

        const result = await runSecurityCheck({
            buffer,
            mimeType: req.file.mimetype,
            expected,
            blockchainRegistered,
        });

        // On a passing authenticity check, notify the user via n8n (WhatsApp +
        // email) — fire-and-forget, never blocks the response.
        if (result.verified) {
            User.findById(req.session.userId).select("fullName email phone").then((u) => {
                notifyN8N("authenticity_passed", {
                    user: { name: u?.fullName, email: u?.email, phone: u?.phone },
                    document: match ? {
                        docType: match.docType, docNumber: match.docNumber,
                        docId: match.docId, transactionHash: match.transactionHash,
                    } : null,
                    securityScore: result.securityScore,
                    verifiedAt: new Date().toISOString(),
                });
            }).catch(() => {});
        }

        res.json({
            ...result,
            matched: !!match,
            matchType,
            registeredDoc: match ? {
                docType: match.docType,
                docNumber: match.docNumber,
                docId: match.docId,
                transactionHash: match.transactionHash,
            } : null,
            watermarkServiceConfigured: isWatermarkServiceConfigured(),
        });
    } catch (error) {
        console.error("Security check error:", error.message);
        res.status(500).json({ message: `Security check failed: ${error.message}` });
    }
});

// ====================================================================
// --- RECEIVED DOCUMENTS (User Portal sees docs issued to them) ---
// ====================================================================
//
// An issued document reaches the recipient here: matched by the logged-in
// user's email (set by the issuer) OR their linked wallet address.
app.get("/api/received-documents", isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select("email walletAddress");
        if (!user) return res.status(404).json({ message: "User not found." });

        const or = [];
        if (user.email) or.push({ receiverEmail: user.email.toLowerCase().trim() });
        if (user.walletAddress) or.push({ receiverWallet: web3.utils.toChecksumAddress(user.walletAddress) });
        if (!or.length) return res.json([]);

        const docs = await IssuedDocument.find({ $or: or }).sort({ issuedAt: -1 });

        res.json(docs.map(d => ({
            docId: d.docId,
            docType: d.docType,
            docNumber: d.docNumber,
            issuerWallet: d.issuerWallet,
            receiverWallet: d.receiverWallet,
            documentCID: d.documentCID,
            transactionHash: d.transactionHash,
            encrypted: d.encrypted,
            watermarked: d.watermarked,
            issuedAt: d.issuedAt,
        })));
    } catch (error) {
        console.error("Error fetching received documents:", error.message);
        res.status(500).json({ message: "Failed to fetch received documents." });
    }
});

// --- View a received document (recipient, MetaMask-signature gated) ---
app.post("/api/received-documents/:docId/view", isAuthenticated, async (req, res) => {
    const { docId } = req.params;
    const { walletAddress, signature, message } = req.body;
    try {
        const user = await User.findById(req.session.userId).select("email walletAddress");
        const doc = await IssuedDocument.findOne({ docId });
        if (!doc) return res.status(404).json({ message: "Document not found." });

        // Authorisation: the logged-in user must be the recipient (by email),
        // and must prove control of a wallet that is the issuer or receiver.
        const emailMatch = user?.email && doc.receiverEmail &&
            user.email.toLowerCase().trim() === doc.receiverEmail;

        const signer = await verifyWalletSignature(walletAddress, signature, message);
        const walletMatch = signer &&
            (signer === doc.receiverWallet || signer === doc.issuerWallet);

        // Authorised if the logged-in user is the recipient by email (mobile: no
        // wallet) OR proves control of the issuer/recipient wallet (desktop).
        if (!emailMatch && !walletMatch) {
            return res.status(403).json({ message: "Access denied: you are not the recipient of this document." });
        }

        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${doc.documentCID}`;
        const response = await fetch(ipfsUrl);
        if (!response.ok) throw new Error(`IPFS fetch failed: ${response.status}`);
        const contentType = response.headers.get("content-type") || "application/octet-stream";
        let bytes = Buffer.from(await response.arrayBuffer());

        // Site-gated decryption — only this server (with DOC_MASTER_KEY) can open
        // a vault blob, and only with the passphrase the user enters here.
        if (isVaultBlob(bytes)) {
            if (req.body.passphrase) {
                try { bytes = vaultDecrypt(bytes, req.body.passphrase); }
                catch { return res.status(401).json({ message: "Wrong passphrase.", needsPassphrase: true }); }
            } else if (doc.passphraseProtected) {
                return res.status(428).json({ message: "Passphrase required.", needsPassphrase: true });
            } else {
                // Server-key doc → decrypt with the master key. If that fails it is
                // an older passphrase-protected doc, so ask for the passphrase.
                try { bytes = vaultDecrypt(bytes, ""); }
                catch { return res.status(428).json({ message: "Passphrase required.", needsPassphrase: true }); }
            }
        }

        res.json({
            success: true,
            document: {
                docId: doc.docId, docType: doc.docType, docNumber: doc.docNumber,
                contentType: doc.mimeType || contentType, fileName: doc.fileName,
                encrypted: doc.encrypted,
            },
            content: bytes.toString("base64"),
        });
    } catch (error) {
        console.error("Error viewing received document:", error.message);
        res.status(500).json({ message: "Failed to open document." });
    }
});

// ====================================================================
// --- SECURE DOCUMENT SHARING (temporary, encrypted, revocable) ---
// ====================================================================
//
// Flow: the owner of a document (issuer or recipient) creates a time-limited
// share. The document is re-encrypted into a per-share copy on IPFS; only this
// server can decrypt it (server tier), and only while the share is live. The
// recipient opens /share/:id#t=<token>; the secret token never leaves the URL
// fragment except in the open request body.

const SHARE_MAX_MS = 90 * 24 * 60 * 60 * 1000; // hard cap: 90 days

function clientIp(req) {
    return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "";
}

function emailConfigured() {
    return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

async function logShare(req, shareId, docId, event, detail = "") {
    try {
        await ShareAccessLog.create({
            shareId, docId, event, detail,
            ip: clientIp(req),
            userAgent: (req.headers["user-agent"] || "").slice(0, 300),
        });
    } catch (e) {
        console.error("Share audit log failed:", e.message);
    }
}

// Verify the caller owns this document and may share it. Accepts either a
// wallet signature (issuer/receiver) or a logged-in session whose email/wallet
// matches the record. Returns { ok, ownerWallet, ownerUserId }.
async function authorizeDocOwner(req, doc) {
    const { walletAddress, signature, message } = req.body;
    const signer = await verifyWalletSignature(walletAddress, signature, message);
    if (signer && (signer === doc.issuerWallet || signer === doc.receiverWallet)) {
        return { ok: true, ownerWallet: signer };
    }
    if (req.session && req.session.userId) {
        const user = await User.findById(req.session.userId).select("email walletAddress");
        if (user) {
            const emailMatch = user.email && doc.receiverEmail &&
                user.email.toLowerCase().trim() === doc.receiverEmail;
            let walletMatch = false;
            if (user.walletAddress) {
                const w = web3.utils.toChecksumAddress(user.walletAddress);
                walletMatch = w === doc.issuerWallet || w === doc.receiverWallet;
            }
            if (emailMatch || walletMatch) {
                return { ok: true, ownerUserId: user._id, ownerWallet: user.walletAddress };
            }
        }
    }
    return { ok: false };
}

// Resolve the user-selected expiry from a request body (throws a friendly error).
function resolveShareExpiry(body) {
    let expiresAt = null;
    if (body.expiresInMs) expiresAt = new Date(Date.now() + Number(body.expiresInMs));
    else if (body.expiresAt) expiresAt = new Date(body.expiresAt);
    if (!expiresAt || isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
        throw new Error("Choose a valid future expiry time.");
    }
    if (expiresAt.getTime() - Date.now() > SHARE_MAX_MS) {
        throw new Error("A share can last at most 90 days.");
    }
    return expiresAt;
}

// Resolve the access gate config from a request body (throws a friendly error).
function resolveShareGate(body) {
    const gate = ["none", "otp", "password"].includes(body.gate) ? body.gate : "none";
    const out = { gate };
    if (gate === "otp") {
        const recipientEmail = (body.recipientEmail || "").toLowerCase().trim();
        if (!/^\S+@\S+\.\S+$/.test(recipientEmail)) throw new Error("A recipient email is required for the email-code gate.");
        if (!emailConfigured()) throw new Error("Email is not configured on the server, so the email-code gate can't be used.");
        out.recipientEmail = recipientEmail;
    }
    if (gate === "password") {
        const pw = String(body.password || "");
        if (pw.length < 4) throw new Error("Set a share password of at least 4 characters.");
        const h = hashSharePassword(pw);
        out.passwordSalt = h.salt;
        out.passwordHash = h.hash;
    }
    return out;
}

// Resolve the audience: an anonymous link, or a specific registered user bound
// by email and/or wallet (throws a friendly error).
function resolveShareAudience(body) {
    const audience = body.audience === "user" ? "user" : "link";
    const out = { audience };
    if (audience === "user") {
        const email = (body.recipientEmail || "").toLowerCase().trim();
        const wallet = (body.recipientWallet || "").trim();
        if (!email && !wallet) throw new Error("Enter the recipient's email or wallet address.");
        if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid recipient email.");
        if (wallet && !web3.utils.isAddress(wallet)) throw new Error("Enter a valid recipient wallet address.");
        if (email) out.recipientEmail = email;
        if (wallet) out.recipientWallet = web3.utils.toChecksumAddress(wallet);
    }
    return out;
}

// True if the logged-in session belongs to the user this share is bound to.
async function sessionMatchesRecipient(req, share) {
    if (!req.session || !req.session.userId) return false;
    const user = await User.findById(req.session.userId).select("email walletAddress");
    if (!user) return false;
    if (share.recipientEmail && user.email &&
        user.email.toLowerCase().trim() === share.recipientEmail) return true;
    if (share.recipientWallet && user.walletAddress &&
        web3.utils.toChecksumAddress(user.walletAddress) === share.recipientWallet) return true;
    return false;
}

// Detect a file's real type from its magic bytes — a reliable fallback when the
// client-supplied mime is generic (octet-stream), so the recipient's viewer
// renders it correctly.
function sniffMime(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
    if (buf.slice(0, 4).toString("latin1") === "%PDF") return "application/pdf";
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
    if (buf.slice(0, 3).toString("latin1") === "GIF") return "image/gif";
    if (buf.slice(0, 4).toString("latin1") === "RIFF" && buf.slice(8, 12).toString("latin1") === "WEBP") return "image/webp";
    return null;
}

// --- Create a share (owner-authenticated) — server-gated tier ---
// The browser uploads the DECRYPTED document (the same bytes the View screen
// shows) in the 'document' field. That makes sharing work for every document
// type and preserves the correct file type. The server re-encrypts a share copy
// it can reopen at view time (to watermark + keep it view-only).
app.post("/api/shares", heavyLimiter, handleUpload("document"), async (req, res) => {
    try {
        const { docId } = req.body;
        if (!docId) return res.status(400).json({ message: "docId is required." });
        if (!isShareConfigured()) {
            return res.status(500).json({ message: "Sharing is not configured on the server (missing DOC_MASTER_KEY)." });
        }
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: "Document data is required." });
        }

        const doc = await IssuedDocument.findOne({ docId });
        if (!doc) return res.status(404).json({ message: "Document not found." });

        const auth = await authorizeDocOwner(req, doc);
        if (!auth.ok) {
            return res.status(403).json({ message: "Only this document's issuer or recipient can share it." });
        }

        let expiresAt, gateCfg, audienceCfg;
        try {
            expiresAt = resolveShareExpiry(req.body);
            gateCfg = resolveShareGate(req.body);
            audienceCfg = resolveShareAudience(req.body);
        } catch (e) {
            return res.status(400).json({ message: e.message });
        }

        // Re-encrypt the uploaded plaintext into a fresh share copy and pin it.
        const plaintext = req.file.buffer;
        // Prefer sniffed type, then the client's hint, then the stored record.
        const mimeType = sniffMime(plaintext) || req.body.mimeType || doc.mimeType || "application/octet-stream";

        const { blob, wrappedKey } = createServerShareBlob(plaintext);
        const readable = stream.Readable.from(blob);
        readable.path = `share_${Date.now()}`;
        const pin = await pinata.pinFileToIPFS(readable, {
            pinataMetadata: { name: `Share_${doc.docId.slice(0, 10)}_${Date.now()}` },
        });

        const shareId = uuidv4();
        // A capability token only exists for anonymous-link shares; registered-user
        // shares are gated by the recipient's logged-in identity instead.
        const token = audienceCfg.audience === "link" ? generateToken() : null;
        const recipientEmail = audienceCfg.recipientEmail || gateCfg.recipientEmail;
        await DocumentShare.create({
            shareId,
            docId,
            ownerWallet: auth.ownerWallet,
            ownerUserId: auth.ownerUserId,
            audience: audienceCfg.audience,
            recipientEmail,
            recipientWallet: audienceCfg.recipientWallet,
            gate: gateCfg.gate,
            passwordSalt: gateCfg.passwordSalt,
            passwordHash: gateCfg.passwordHash,
            tier: "server",
            tokenHash: token ? hashToken(token) : undefined,
            shareCID: pin.IpfsHash,
            wrappedKey,
            mimeType,
            fileName: req.body.fileName || doc.fileName,
            docType: doc.docType,
            docNumber: doc.docNumber,
            expiresAt,
            maxViews: Number(req.body.maxViews) > 0 ? Number(req.body.maxViews) : 0,
        });

        await logShare(req, shareId, docId, "created", `${audienceCfg.audience} · ${gateCfg.gate} · expires ${expiresAt.toISOString()}`);

        const origin = `${req.protocol}://${req.get("host")}`;
        // Registered-user share: notify the recipient; no public link is returned.
        if (audienceCfg.audience === "user") {
            if (recipientEmail && emailConfigured()) {
                const docLabel = [doc.docType, doc.docNumber].filter(Boolean).join(" — ") || "a document";
                transporter.sendMail({
                    from: `"DocVerify" <${process.env.EMAIL_USER}>`,
                    to: recipientEmail,
                    subject: "A document was shared with you on DocVerify",
                    text: `${docLabel} was shared with you. Sign in to your DocVerify account to view it (under "Shared with me"). It expires ${expiresAt.toLocaleString()}.\n\n${origin}`,
                }).catch((e) => console.error("Share notify email failed:", e.message));
            }
            return res.json({
                success: true, shareId, audience: "user", tier: "server",
                gate: gateCfg.gate, expiresAt,
                recipient: audienceCfg.recipientEmail || audienceCfg.recipientWallet,
            });
        }

        const shareUrl = `${origin}/share/${shareId}#t=${token}`;
        res.json({ success: true, shareId, shareUrl, expiresAt, gate: gateCfg.gate, tier: "server", audience: "link" });
    } catch (error) {
        console.error("Create share error:", error.message);
        res.status(500).json({ message: "Failed to create the share link." });
    }
});

// --- Create a ZERO-KNOWLEDGE share. The browser encrypts the document and
//     uploads only ciphertext (the 'document' field); the key never reaches us.
//     We pin the ciphertext and store NO key, so this server can never read it.
app.post("/api/shares/zk", heavyLimiter, handleUpload("document"), async (req, res) => {
    try {
        const { docId, ivB64 } = req.body;
        if (!docId) return res.status(400).json({ message: "docId is required." });
        if (!ivB64) return res.status(400).json({ message: "Missing encryption metadata." });
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: "Encrypted document data is required." });
        }
        if (req.body.audience === "user") {
            return res.status(400).json({ message: "Zero-knowledge shares are delivered as a link. Use the Protected tier to share to a registered user." });
        }

        const doc = await IssuedDocument.findOne({ docId });
        if (!doc) return res.status(404).json({ message: "Document not found." });

        const auth = await authorizeDocOwner(req, doc);
        if (!auth.ok) {
            return res.status(403).json({ message: "Only this document's issuer or recipient can share it." });
        }

        let expiresAt, gateCfg;
        try {
            expiresAt = resolveShareExpiry(req.body);
            gateCfg = resolveShareGate(req.body);
        } catch (e) {
            return res.status(400).json({ message: e.message });
        }

        // Pin the ciphertext exactly as received — we cannot (and must not) read it.
        const readable = stream.Readable.from(req.file.buffer);
        readable.path = `zkshare_${Date.now()}`;
        const pin = await pinata.pinFileToIPFS(readable, {
            pinataMetadata: { name: `ZKShare_${doc.docId.slice(0, 10)}_${Date.now()}` },
        });

        const shareId = uuidv4();
        const token = generateToken();
        await DocumentShare.create({
            shareId,
            docId,
            ownerWallet: auth.ownerWallet,
            ownerUserId: auth.ownerUserId,
            audience: "link",
            gate: gateCfg.gate,
            recipientEmail: gateCfg.recipientEmail,
            passwordSalt: gateCfg.passwordSalt,
            passwordHash: gateCfg.passwordHash,
            tier: "zk",
            tokenHash: hashToken(token),
            shareCID: pin.IpfsHash,
            // wrappedKey intentionally omitted — the server holds NO key for zk shares.
            zkMeta: { algo: "AES-GCM", ivB64, kdf: "none" },
            // Metadata comes from the trusted on-chain-mirrored record, not the client.
            mimeType: doc.mimeType,
            fileName: doc.fileName,
            docType: doc.docType,
            docNumber: doc.docNumber,
            expiresAt,
            maxViews: Number(req.body.maxViews) > 0 ? Number(req.body.maxViews) : 0,
        });

        await logShare(req, shareId, docId, "created", `zk link · ${gateCfg.gate} · expires ${expiresAt.toISOString()}`);

        // Return the link WITHOUT the key; the browser appends #...&k=<key> itself.
        const origin = `${req.protocol}://${req.get("host")}`;
        const shareUrl = `${origin}/share/${shareId}#t=${token}`;
        res.json({ success: true, shareId, shareUrl, expiresAt, gate: gateCfg.gate, tier: "zk" });
    } catch (error) {
        console.error("Create zk share error:", error.message);
        res.status(500).json({ message: "Failed to create the zero-knowledge share." });
    }
});

// --- Public, non-secret metadata about a share (so the open page can render
//     the right prompt). Reveals nothing sensitive. ---
app.get("/api/shares/:shareId/meta", shareLimiter, async (req, res) => {
    try {
        const share = await DocumentShare.findOne({ shareId: req.params.shareId });
        if (!share) return res.status(404).json({ exists: false, message: "This link is invalid or has expired." });
        const expired = share.revoked || share.expiresAt <= new Date() ||
            (share.maxViews > 0 && share.viewCount >= share.maxViews);
        res.json({
            exists: true,
            expired,
            revoked: share.revoked,
            gate: share.gate,
            tier: share.tier,
            audience: share.audience,
            docType: share.docType,
            docNumber: share.docNumber,
            expiresAt: share.expiresAt,
            // hint for the email-code gate UI (Phase 2), never the full address
            recipientEmailHint: share.gate === "otp" && share.recipientEmail
                ? share.recipientEmail.replace(/^(.).*(@.*)$/, "$1***$2") : undefined,
        });
    } catch (error) {
        console.error("Share meta error:", error.message);
        res.status(500).json({ message: "Failed to read share." });
    }
});

// --- Open a share: validate the link + limits, then return the document. ---
app.post("/api/shares/:shareId/open", shareLimiter, async (req, res) => {
    try {
        const { shareId } = req.params;
        const { token } = req.body;
        const share = await DocumentShare.findOne({ shareId });
        if (!share) return res.status(404).json({ message: "This share link is invalid or has expired." });

        if (share.revoked) {
            await logShare(req, shareId, share.docId, "denied", "revoked");
            return res.status(410).json({ message: "This share link has been revoked." });
        }
        if (share.expiresAt <= new Date()) {
            await logShare(req, shareId, share.docId, "denied", "expired");
            return res.status(410).json({ message: "This share link has expired." });
        }
        if (share.maxViews > 0 && share.viewCount >= share.maxViews) {
            await logShare(req, shareId, share.docId, "denied", "max views reached");
            return res.status(410).json({ message: "This share link has reached its view limit." });
        }

        // Authorisation differs by audience:
        //  • link → the secret capability token from the #fragment.
        //  • user → the logged-in session must be the bound recipient.
        if (share.audience === "user") {
            if (!(await sessionMatchesRecipient(req, share))) {
                await logShare(req, shareId, share.docId, "denied", "not recipient");
                return res.status(401).json({ message: "Sign in to your DocVerify account as the recipient to open this document.", needsLogin: true });
            }
        } else {
            if (!verifyTokenHash(token, share.tokenHash)) {
                await logShare(req, shareId, share.docId, "gate_failed", "bad token");
                return res.status(401).json({ message: "Invalid share link." });
            }
        }

        // Access gate: password or emailed one-time code.
        if (share.gate === "password") {
            if (!verifySharePassword(req.body.password, share.passwordSalt, share.passwordHash)) {
                await logShare(req, shareId, share.docId, "gate_failed", "bad password");
                return res.status(401).json({ message: "Incorrect password.", gate: "password" });
            }
        } else if (share.gate === "otp") {
            const code = req.body.code;
            if (!share.otpCodeHash || !share.otpExpiresAt || share.otpExpiresAt <= new Date()) {
                return res.status(428).json({ message: "Request a fresh code to continue.", gate: "otp", needsCode: true });
            }
            if (share.otpAttempts >= 5) {
                return res.status(429).json({ message: "Too many incorrect codes. Request a new one.", gate: "otp", needsCode: true });
            }
            if (!code || !verifyTokenHash(code, share.otpCodeHash)) {
                share.otpAttempts += 1;
                await share.save();
                await logShare(req, shareId, share.docId, "gate_failed", "bad code");
                return res.status(401).json({ message: "Incorrect code.", gate: "otp" });
            }
            // Correct code — consume it so it can't be replayed.
            share.otpCodeHash = undefined;
            share.otpExpiresAt = undefined;
            share.otpAttempts = 0;
        }

        // Server-gated tier: fetch the encrypted share copy and decrypt it here.
        if (share.tier === "server") {
            if (!share.wrappedKey) return res.status(410).json({ message: "This share is no longer available." });
            const r = await fetch(`https://gateway.pinata.cloud/ipfs/${share.shareCID}`);
            if (!r.ok) throw new Error(`IPFS fetch failed: ${r.status}`);
            const blob = Buffer.from(await r.arrayBuffer());
            const plaintext = openServerShareBlob(blob, share.wrappedKey);

            // Per-viewer watermark (images AND PDFs) so any leak is traceable.
            const label = share.recipientEmail || "Shared via DocVerify";
            const docLabel = [share.docType, share.docNumber].filter(Boolean).join(" ");
            const wm = await watermarkDocument(
                plaintext,
                share.mimeType || "application/octet-stream",
                [label, docLabel, new Date().toISOString()]
            );
            const outBuffer = wm.buffer;
            const outContentType = wm.mime;

            share.viewCount += 1;
            await share.save();
            await logShare(req, shareId, share.docId, "opened", `view ${share.viewCount}`);

            return res.json({
                success: true,
                document: {
                    docType: share.docType,
                    docNumber: share.docNumber,
                    contentType: outContentType,
                    fileName: share.fileName,
                },
                content: outBuffer.toString("base64"),
                viewOnly: true,
                expiresAt: share.expiresAt,
            });
        }

        // Zero-knowledge tier: the gate has passed, so release the CIPHERTEXT.
        // We cannot decrypt it — the recipient's browser does, using the key from
        // the link #fragment. Plaintext never exists on this server.
        if (share.tier === "zk") {
            const r = await fetch(`https://gateway.pinata.cloud/ipfs/${share.shareCID}`);
            if (!r.ok) throw new Error(`IPFS fetch failed: ${r.status}`);
            const ciphertext = Buffer.from(await r.arrayBuffer());

            share.viewCount += 1;
            await share.save();
            await logShare(req, shareId, share.docId, "opened", `zk view ${share.viewCount}`);

            return res.json({
                success: true,
                tier: "zk",
                document: {
                    docType: share.docType,
                    docNumber: share.docNumber,
                    contentType: share.mimeType || "application/octet-stream",
                    fileName: share.fileName,
                },
                zk: { algo: (share.zkMeta && share.zkMeta.algo) || "AES-GCM", ivB64: share.zkMeta && share.zkMeta.ivB64 },
                content: ciphertext.toString("base64"),
                viewOnly: true,
                expiresAt: share.expiresAt,
            });
        }

        return res.status(400).json({ message: "Unsupported share type." });
    } catch (error) {
        console.error("Open share error:", error.message);
        res.status(500).json({ message: "Failed to open the shared document." });
    }
});

// --- Email a one-time code to the share's bound recipient (otp gate). ---
app.post("/api/shares/:shareId/send-code", shareLimiter, async (req, res) => {
    try {
        const share = await DocumentShare.findOne({ shareId: req.params.shareId });
        if (!share) return res.status(404).json({ message: "This link is invalid or has expired." });
        if (share.revoked || share.expiresAt <= new Date()) {
            return res.status(410).json({ message: "This share link is no longer available." });
        }
        if (share.gate !== "otp" || !share.recipientEmail) {
            return res.status(400).json({ message: "This share does not use an email code." });
        }
        if (!emailConfigured()) {
            return res.status(500).json({ message: "Email is not configured on the server." });
        }

        const code = generateOtpCode();
        share.otpCodeHash = hashToken(code);
        share.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        share.otpAttempts = 0;
        await share.save();

        const docLabel = [share.docType, share.docNumber].filter(Boolean).join(" — ") || "a document";
        await transporter.sendMail({
            from: `"DocVerify" <${process.env.EMAIL_USER}>`,
            to: share.recipientEmail,
            subject: "Your DocVerify access code",
            text: `Someone shared ${docLabel} with you via DocVerify.\n\nYour one-time access code is: ${code}\n\nIt expires in 10 minutes. If you didn't expect this, you can ignore this email.`,
            html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
                <h2 style="color:#0f766e">DocVerify secure document</h2>
                <p>Someone shared <strong>${docLabel}</strong> with you. Use this one-time code to open it:</p>
                <div style="font-size:30px;font-weight:bold;letter-spacing:8px;background:#0f766e;color:#fff;text-align:center;padding:16px;border-radius:8px;margin:16px 0">${code}</div>
                <p style="color:#555">This code expires in <strong>10 minutes</strong>. If you weren't expecting this, you can safely ignore this email.</p>
            </div>`,
        });

        await logShare(req, share.shareId, share.docId, "gate_sent", "email code");
        res.json({
            success: true,
            emailHint: share.recipientEmail.replace(/^(.).*(@.*)$/, "$1***$2"),
        });
    } catch (error) {
        console.error("Send share code error:", error.message);
        res.status(500).json({ message: "Failed to send the code. Please try again." });
    }
});

// --- Revoke a share (owner-authenticated). Crypto-erases the wrapped key and
//     best-effort unpins the IPFS copy, so the share becomes unreadable now. ---
app.post("/api/shares/:shareId/revoke", async (req, res) => {
    try {
        const share = await DocumentShare.findOne({ shareId: req.params.shareId });
        if (!share) return res.status(404).json({ message: "Share not found." });

        const doc = await IssuedDocument.findOne({ docId: share.docId });
        if (!doc) return res.status(404).json({ message: "Document not found." });
        const auth = await authorizeDocOwner(req, doc);
        if (!auth.ok) return res.status(403).json({ message: "Only the owner can revoke this share." });

        const cid = share.shareCID;
        share.revoked = true;
        share.wrappedKey = undefined; // cryptographic erasure — content is now unrecoverable
        await share.save();
        await logShare(req, share.shareId, share.docId, "revoked", "by owner");

        // Best-effort unpin (don't fail the request if Pinata hiccups).
        if (cid && pinata) pinata.unpin(cid).catch(() => {});

        res.json({ success: true });
    } catch (error) {
        console.error("Revoke share error:", error.message);
        res.status(500).json({ message: "Failed to revoke the share." });
    }
});

// --- Manage shares: list all shares of a document the caller owns. ---
app.post("/api/shares/list", async (req, res) => {
    try {
        const { docId } = req.body;
        if (!docId) return res.status(400).json({ message: "docId is required." });
        const doc = await IssuedDocument.findOne({ docId });
        if (!doc) return res.status(404).json({ message: "Document not found." });
        const auth = await authorizeDocOwner(req, doc);
        if (!auth.ok) return res.status(403).json({ message: "Only the document's owner can list its shares." });

        const shares = await DocumentShare.find({ docId }).sort({ createdAt: -1 });
        res.json(shares.map(s => ({
            shareId: s.shareId,
            audience: s.audience,
            gate: s.gate,
            tier: s.tier,
            recipientEmail: s.recipientEmail,
            recipientWallet: s.recipientWallet,
            expiresAt: s.expiresAt,
            revoked: s.revoked,
            viewCount: s.viewCount,
            maxViews: s.maxViews,
            createdAt: s.createdAt,
        })));
    } catch (error) {
        console.error("List shares error:", error.message);
        res.status(500).json({ message: "Failed to list shares." });
    }
});

// --- "Shared with me": registered-user shares addressed to the logged-in user. ---
app.get("/api/shares/received", isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select("email walletAddress");
        if (!user) return res.status(404).json({ message: "User not found." });
        const or = [];
        if (user.email) or.push({ recipientEmail: user.email.toLowerCase().trim() });
        if (user.walletAddress) or.push({ recipientWallet: web3.utils.toChecksumAddress(user.walletAddress) });
        if (!or.length) return res.json([]);

        const shares = await DocumentShare.find({
            audience: "user",
            revoked: false,
            expiresAt: { $gt: new Date() },
            $or: or,
        }).sort({ createdAt: -1 });

        res.json(shares.map(s => ({
            shareId: s.shareId,
            docType: s.docType,
            docNumber: s.docNumber,
            gate: s.gate,
            tier: s.tier,
            ownerWallet: s.ownerWallet,
            expiresAt: s.expiresAt,
            createdAt: s.createdAt,
        })));
    } catch (error) {
        console.error("Shared-with-me error:", error.message);
        res.status(500).json({ message: "Failed to load shared documents." });
    }
});

// --- Audit trail for a single share (owner only). ---
app.post("/api/shares/:shareId/audit", async (req, res) => {
    try {
        const share = await DocumentShare.findOne({ shareId: req.params.shareId });
        if (!share) return res.status(404).json({ message: "Share not found." });
        const doc = await IssuedDocument.findOne({ docId: share.docId });
        if (!doc) return res.status(404).json({ message: "Document not found." });
        const auth = await authorizeDocOwner(req, doc);
        if (!auth.ok) return res.status(403).json({ message: "Only the owner can view this activity." });

        const logs = await ShareAccessLog.find({ shareId: share.shareId }).sort({ at: -1 }).limit(50);
        res.json(logs.map(l => ({ event: l.event, detail: l.detail, ip: l.ip, at: l.at })));
    } catch (error) {
        console.error("Share audit error:", error.message);
        res.status(500).json({ message: "Failed to load activity." });
    }
});

// --- Serve the standalone, minimal public share page. Kept separate from the
//     main app so external recipients load almost no code and no wallet logic.
app.get("/share/:shareId", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "share.html"));
});

// Catch-all handler: send back vanilla frontend's index.html file for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// --- Server Start ---
app.listen(port, () => {
    console.log(` Server is running on http://localhost:${port}`);
});