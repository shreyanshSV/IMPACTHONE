/* ============================================================
   DocuChain mobile app — light DigiLocker-style document wallet.
   Loads over the live site, reuses the session-cookie API.
   ============================================================ */
const API = location.origin + "/api";
const root = document.getElementById("root");
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

const state = { user: null, tab: "home", docs: [], received: [], _docsLoaded: false, _recLoaded: false };

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");

function toast(msg, isErr) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (isErr ? " err" : "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.className = "toast"), 2800);
}

async function apiGet(path) {
  const res = await fetch(API + path, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}
async function apiPost(path, body) {
  const res = await fetch(API + path, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

/* ---------- icons (Lucide-style stroke) ---------- */
const S = (p, opts = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${opts}>${p}</svg>`;
const ICONS = {
  home: S(`<path d="M3 10l9-7 9 7v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z"/>`),
  doc: S(`<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>`),
  inbox: S(`<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>`),
  user: S(`<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>`),
  eye: S(`<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>`),
  share: S(`<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>`),
  close: S(`<path d="M18 6 6 18M6 6l12 12"/>`),
  logout: S(`<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>`),
  shield: S(`<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>`),
  idcard: S(`<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M14 10h4M14 14h4M6 15c.5-1.5 4.5-1.5 5 0"/>`),
  cert: S(`<circle cx="12" cy="9" r="5"/><path d="M9 13l-1 8 4-2 4 2-1-8"/>`),
  wallet: S(`<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.3"/>`),
  trash: S(`<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>`),
};
const logoBadge = (cls) => `<span class="${cls}"><img src="/icon.svg" alt="" /></span>`;

const DOC_COLORS = [
  { bg: "#eff6ff", fg: "#2563eb" }, { bg: "#ecfdf5", fg: "#16a34a" }, { bg: "#f5f3ff", fg: "#7c3aed" },
  { bg: "#fff7ed", fg: "#ea580c" }, { bg: "#f0fdfa", fg: "#0d9488" }, { bg: "#fdf2f8", fg: "#db2777" },
];
function docColor(t) { let h = 0; for (const c of String(t || "d")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return DOC_COLORS[h % DOC_COLORS.length]; }
function docIcon(t) { const s = String(t || "").toLowerCase(); if (/id|aadhaar|pan|licen|passport/.test(s)) return ICONS.idcard; if (/cert|degree|marks|diploma/.test(s)) return ICONS.cert; return ICONS.doc; }

/* ============================================================
   AUTH
   ============================================================ */
function renderAuth(mode = "signin") {
  const verified = { done: false };
  root.innerHTML = `
    <div class="auth">
      <div class="auth-brand">
        ${logoBadge("badge")}
        <h1>DocuChain</h1>
        <p>Your secure blockchain document wallet</p>
      </div>
      <div class="seg">
        <button data-mode="signin" class="${mode === "signin" ? "active" : ""}">Sign In</button>
        <button data-mode="signup" class="${mode === "signup" ? "active" : ""}">Sign Up</button>
      </div>
      <div id="auth-form"></div>
    </div>`;
  root.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => renderAuth(b.dataset.mode)));
  const f = root.querySelector("#auth-form");
  if (mode === "signin") {
    f.innerHTML = `
      <div class="field"><label>Email</label><input id="si-email" type="email" inputmode="email" autocomplete="email" placeholder="you@email.com" /></div>
      <div class="field"><label>Password</label><input id="si-pass" type="password" autocomplete="current-password" placeholder="Your password" /></div>
      <button class="btn" id="si-btn">Sign In</button>
      <div class="or">or</div>
      <button class="btn btn-ghost" id="si-mm">${ICONS.wallet} Sign in with MetaMask</button>`;
    f.querySelector("#si-btn").addEventListener("click", doSignin);
    f.querySelector("#si-mm").addEventListener("click", doSigninWallet);
  } else {
    f.innerHTML = `
      <div class="field"><label>Full name</label><input id="su-name" placeholder="Your name" /></div>
      <div class="field"><label>Email</label>
        <div class="otp-row"><div class="field" style="margin:0"><input id="su-email" type="email" inputmode="email" placeholder="you@email.com" /></div>
        <button class="btn btn-sm" id="su-send">Verify</button></div>
      </div>
      <div class="field" id="su-otp-wrap" style="display:none">
        <label>Enter the code sent to your email</label>
        <div class="otp-row"><div class="field" style="margin:0"><input id="su-otp" inputmode="numeric" placeholder="6-digit code" /></div>
        <button class="btn btn-sm" id="su-check">Check</button></div>
      </div>
      <div class="field"><label>Phone</label><input id="su-phone" inputmode="tel" placeholder="Phone number" /></div>
      <div class="field"><label>Password</label><input id="su-pass" type="password" autocomplete="new-password" placeholder="Create a password" /></div>
      <button class="btn" id="su-btn" disabled>Verify your email first</button>`;
    const btn = f.querySelector("#su-btn");
    f.querySelector("#su-send").addEventListener("click", async (e) => {
      const email = f.querySelector("#su-email").value.trim();
      if (!email.includes("@")) return toast("Enter a valid email", true);
      e.target.disabled = true; e.target.textContent = "…";
      const r = await apiPost("/auth/send-email-otp", { email });
      e.target.disabled = false; e.target.textContent = "Verify";
      if (!r.ok) return toast(r.data.message || "Could not send code", true);
      f.querySelector("#su-otp-wrap").style.display = "block";
      toast("Code sent to " + email);
    });
    f.querySelector("#su-check").addEventListener("click", async () => {
      const email = f.querySelector("#su-email").value.trim();
      const otp = f.querySelector("#su-otp").value.trim();
      const r = await apiPost("/auth/verify-email-otp", { email, otp });
      if (!r.ok) return toast(r.data.message || "Invalid code", true);
      verified.done = true; btn.disabled = false; btn.textContent = "Connect MetaMask & Create Account";
      toast("Email verified ✓");
    });
    btn.addEventListener("click", () => doSignup(verified));
  }
}
async function doSignin() {
  const email = root.querySelector("#si-email").value.trim();
  const password = root.querySelector("#si-pass").value;
  if (!email || !password) return toast("Enter email and password", true);
  const btn = root.querySelector("#si-btn");
  btn.disabled = true; btn.textContent = "Signing in…";
  const r = await apiPost("/auth/signin", { email, password });
  btn.disabled = false; btn.textContent = "Sign In";
  if (!r.ok) return toast(r.data.message || "Sign in failed", true);
  boot();
}
async function doSignup(verified) {
  if (!verified.done) return toast("Verify your email first", true);
  const fullName = root.querySelector("#su-name").value.trim();
  const email = root.querySelector("#su-email").value.trim();
  const phone = root.querySelector("#su-phone").value.trim();
  const password = root.querySelector("#su-pass").value;
  if (!fullName || !email || !password) return toast("Fill all fields", true);
  const btn = root.querySelector("#su-btn");
  const reset = () => { btn.disabled = false; btn.textContent = "Connect MetaMask & Create Account"; };
  btn.disabled = true; btn.textContent = "Connecting wallet…";
  let wallet;
  try { wallet = await Wallet.authenticate(true); }
  catch (e) { reset(); return toast(e.message || "Wallet connection failed", true); }
  btn.textContent = "Creating account…";
  const r = await apiPost("/auth/signup", { fullName, email, password, phone, walletAddress: wallet.walletAddress, signature: wallet.signature });
  if (!r.ok) { reset(); return toast(r.data.message || "Sign up failed", true); }
  boot();
}

async function doSigninWallet() {
  const btn = root.querySelector("#si-mm");
  const label = btn.innerHTML;
  btn.disabled = true; btn.textContent = "Connecting…";
  try {
    const wallet = await Wallet.authenticate(true);
    const r = await apiPost("/auth/signin-wallet", wallet);
    if (!r.ok) throw new Error(r.data.message || "Wallet sign-in failed");
    boot();
  } catch (e) { btn.disabled = false; btn.innerHTML = label; toast(e.message || "Wallet sign-in failed", true); }
}

/* ============================================================
   APP SHELL
   ============================================================ */
const TAB_TITLE = { home: "", documents: "Your Documents", received: "Received", shares: "My Shares", profile: "Profile" };
function appbarHtml() {
  const first = (state.user?.fullName || "there").split(" ")[0];
  const inner = state.tab === "home"
    ? `<div class="greet">Welcome back 👋</div><div class="title">Hi, ${esc(first)}</div>`
    : `<div class="title">${esc(TAB_TITLE[state.tab])}</div>`;
  return `<div class="appbar"><div class="appbar-in">${logoBadge("logo")}<div>${inner}</div></div></div>`;
}
function renderShell() {
  root.innerHTML = `${appbarHtml()}<div id="screen" class="screen"></div>
    <nav class="nav">${navBtn("home", "Home", ICONS.home)}${navBtn("documents", "Docs", ICONS.doc)}${navBtn("received", "Received", ICONS.inbox)}${navBtn("shares", "Shares", ICONS.share)}${navBtn("profile", "Profile", ICONS.user)}</nav>`;
  root.querySelectorAll(".nav button").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
  renderTab();
}
function navBtn(tab, label, icon) { return `<button data-tab="${tab}" class="${state.tab === tab ? "active" : ""}">${icon}<span>${label}</span></button>`; }
function setTab(tab) {
  state.tab = tab;
  root.querySelector(".appbar").outerHTML = appbarHtml();
  root.querySelectorAll(".nav button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  renderTab();
}
function renderTab() {
  const s = document.getElementById("screen");
  if (state.tab === "home") return renderHome(s);
  if (state.tab === "documents") return renderDocs(s);
  if (state.tab === "received") return renderReceived(s);
  if (state.tab === "shares") return renderShares(s);
  if (state.tab === "profile") return renderProfile(s);
}
function skeletons(n = 4) { return Array.from({ length: n }, () => `<div class="sk-card"><div class="sk a"></div><div class="b"><div class="sk l1"></div><div class="sk l2"></div></div></div>`).join(""); }

async function renderHome(s) {
  s.innerHTML = `<div class="summary"><div class="sum-card"><div class="sk a" style="width:38px;height:38px"></div></div><div class="sum-card"></div></div><div class="section-title">Recent</div>${skeletons(3)}`;
  try {
    if (!state._recLoaded) await loadReceived();
    if (!state._docsLoaded) await loadDocs();
  } catch (e) {}
  const recent = state.received.slice(0, 4);
  s.innerHTML = `
    <div class="summary">
      <div class="sum-card" style="animation-delay:.02s"><div class="ic" style="background:#eff6ff;color:#2563eb">${ICONS.inbox}</div><div class="n">${state.received.length}</div><div class="l">Received documents</div></div>
      <div class="sum-card" style="animation-delay:.08s"><div class="ic" style="background:#ecfdf5;color:#16a34a">${ICONS.shield}</div><div class="n">${state.docs.length}</div><div class="l">Verified by you</div></div>
    </div>
    <div class="section-title">Recently received ${state.received.length > 4 ? `<a id="see-all">See all</a>` : ""}</div>
    ${recent.length ? recent.map((d, i) => docCard(d, "received", i)).join("") : emptyBox("Nothing received yet", "Documents shared to you will appear here.")}`;
  bindCards(s);
  s.querySelector("#see-all")?.addEventListener("click", () => setTab("received"));
}
async function renderDocs(s) {
  s.innerHTML = skeletons();
  try { await loadDocs(); } catch (e) { return errBox(s, e); }
  s.innerHTML = state.docs.length ? state.docs.map((d, i) => docCard(d, "documents", i)).join("") : emptyBox("No documents yet", "Documents you verify on the web portal show up here.");
  bindCards(s);
}
async function renderReceived(s) {
  s.innerHTML = skeletons();
  try { await loadReceived(); } catch (e) { return errBox(s, e); }
  s.innerHTML = state.received.length ? state.received.map((d, i) => docCard(d, "received", i)).join("") : emptyBox("No shared documents", "When someone issues or shares a document to you, it lands here.");
  bindCards(s);
}
async function renderShares(s) {
  s.innerHTML = skeletons();
  let shares;
  try { shares = await apiGet("/shares/mine"); } catch (e) { return errBox(s, e); }
  if (!shares.length) return void (s.innerHTML = emptyBox("No shares yet", "Links you create from a received document appear here — revoke access anytime."));
  s.innerHTML = shares.map((sh, i) => shareRow(sh, i)).join("");
  s.querySelectorAll("[data-revoke]").forEach((b) => b.addEventListener("click", () => revokeShare(b.dataset.revoke)));
}
function shareState(sh) {
  if (sh.revoked) return { chip: `<span class="chip bad">Revoked</span>`, active: false };
  if (sh.expiresAt && new Date(sh.expiresAt) < new Date()) return { chip: `<span class="chip warn">Expired</span>`, active: false };
  return { chip: `<span class="chip ok">Active</span>`, active: true };
}
function shareRow(sh, i) {
  const c = docColor(sh.docType);
  const st = shareState(sh);
  const to = sh.audience === "user" ? (sh.recipientEmail || sh.recipientWallet || "a user") : "Anyone with the link";
  return `
    <div class="doc-card" style="animation-delay:${Math.min(i, 8) * 45}ms">
      <div class="doc-ic" style="background:${c.bg};color:${c.fg}">${ICONS.share}</div>
      <div class="doc-meta">
        <div class="t">${esc(sh.docType || "Document")} ${sh.docNumber ? "· " + esc(sh.docNumber) : ""}</div>
        <div class="s">${st.chip} <span>${esc(to)}</span> ${sh.expiresAt ? "· exp " + esc(fmtDate(sh.expiresAt)) : ""}</div>
      </div>
      <div class="doc-actions">
        ${st.active ? `<button class="icon-btn" data-revoke="${esc(sh.shareId)}" aria-label="Revoke share" style="color:var(--red)">${ICONS.trash}</button>` : ""}
      </div>
    </div>`;
}
async function revokeShare(shareId) {
  if (!confirm("Revoke this share? The link stops working immediately and can't be undone.")) return;
  toast("Revoking…");
  const r = await apiPost("/shares/" + encodeURIComponent(shareId) + "/revoke");
  if (!r.ok) return toast(r.data.message || "Could not revoke", true);
  toast("Share revoked ✓");
  renderShares(document.getElementById("screen"));
}
function renderProfile(s) {
  const u = state.user || {};
  const initials = (u.fullName || "U").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  s.innerHTML = `
    <div class="p-hero"><div class="avatar">${esc(initials)}</div><div class="p-name">${esc(u.fullName || "User")}</div></div>
    <div class="section-title">Account</div>
    <div class="list">
      <div class="list-item"><span class="k">Email</span><span class="v">${esc(u.email || "—")}</span></div>
      <div class="list-item"><span class="k">Phone</span><span class="v">${esc(u.phone || "—")}</span></div>
      <div class="list-item"><span class="k">Wallet</span><span class="v">${u.walletAddress ? esc(u.walletAddress.slice(0, 6) + "…" + u.walletAddress.slice(-4)) : "Not linked"}</span></div>
    </div>
    <div class="section-title">More</div>
    <div class="list"><button class="list-item" id="logout"><span style="color:var(--red);display:grid;place-items:center;width:22px">${ICONS.logout}</span><span class="k" style="color:var(--red);font-weight:600">Log out</span></button></div>
    <p style="text-align:center;color:var(--faint);font-size:12.5px;margin-top:22px">Issuing documents & wallet actions live on the web portal.</p>`;
  s.querySelector("#logout").addEventListener("click", async () => {
    await apiPost("/auth/logout");
    Object.assign(state, { user: null, docs: [], received: [], _docsLoaded: false, _recLoaded: false });
    renderAuth();
  });
}

/* ---------- data ---------- */
async function loadDocs() { state.docs = await apiGet("/documents"); state._docsLoaded = true; }
async function loadReceived() { state.received = await apiGet("/received-documents"); state._recLoaded = true; }

/* ---------- cards ---------- */
function docLabel(d) { return [d.docType, d.docNumber].filter(Boolean).join(" · ") || d.name || d.docId || "Document"; }
function statusChip(d, kind) {
  if (kind === "documents") {
    const st = (d.status || "").toLowerCase();
    if (st.includes("verif")) return `<span class="chip ok">${ICONS.shield} Verified</span>`;
    if (st.includes("reject")) return `<span class="chip bad">Rejected</span>`;
    return `<span class="chip warn">${esc(d.status || "Pending")}</span>`;
  }
  return `<span class="chip info">${ICONS.shield} On-chain</span>`;
}
function docCard(d, kind, i = 0) {
  const c = docColor(d.docType);
  const date = fmtDate(d.submittedAt || d.uploadDate || d.issuedAt);
  return `
    <div class="doc-card" style="animation-delay:${Math.min(i, 8) * 45}ms">
      <div class="doc-ic" style="background:${c.bg};color:${c.fg}">${docIcon(d.docType)}</div>
      <div class="doc-meta">
        <div class="t">${esc(d.docType || d.name || "Document")}</div>
        <div class="s">${statusChip(d, kind)} <span>${esc(d.docNumber || "")}</span> ${date ? `· ${esc(date)}` : ""}</div>
      </div>
      <div class="doc-actions">
        <button class="icon-btn" data-view="${esc(d.docId)}" data-kind="${kind}" data-title="${esc(docLabel(d))}" aria-label="View">${ICONS.eye}</button>
        ${kind === "received" ? `<button class="icon-btn" data-share="${esc(d.docId)}" data-title="${esc(docLabel(d))}" aria-label="Share">${ICONS.share}</button>` : ""}
      </div>
    </div>`;
}
function bindCards(s) {
  s.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => viewDoc(b.dataset.kind, b.dataset.view, b.dataset.title)));
  s.querySelectorAll("[data-share]").forEach((b) => b.addEventListener("click", () => openShareSheet(b.dataset.share, b.dataset.title)));
}
function emptyBox(title, sub) { return `<div class="empty"><div class="eic">${ICONS.inbox}</div><div class="et">${esc(title)}</div><div class="es">${esc(sub || "")}</div></div>`; }
function errBox(s, e) { s.innerHTML = `<div class="empty"><div class="eic" style="background:var(--red-bg);color:var(--red)">${ICONS.close}</div><div class="et">Something went wrong</div><div class="es">${esc(e.message || "")}</div></div>`; }

/* ============================================================
   DOCUMENT VIEWER
   ============================================================ */
async function fetchContent(kind, docId, passphrase) {
  const path = (kind === "received" ? "/received-documents/" : "/documents/") + encodeURIComponent(docId) + "/view";
  const r = await apiPost(path, passphrase ? { passphrase } : {});
  if (r.status === 428 || r.data.needsPassphrase) {
    const p = prompt("This document is passphrase-protected. Enter its passphrase:");
    if (!p) throw new Error("Passphrase required");
    return fetchContent(kind, docId, p);
  }
  if (!r.ok) throw new Error(r.data.message || "Could not open document");
  return r.data;
}
async function viewDoc(kind, docId, title) {
  toast("Opening…");
  try {
    const data = await fetchContent(kind, docId);
    showViewer(title, data.document?.contentType || "application/octet-stream", data.content);
  } catch (e) { toast(e.message, true); }
}
function b64ToBytes(b64) { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
function showViewer(title, contentType, base64) {
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = `<div class="viewer-bar"><button class="ib" id="v-close">${ICONS.close}</button><div class="vt">${esc(title)}</div></div><div class="viewer-body" id="v-body"></div>`;
  document.body.appendChild(ov);
  ov.querySelector("#v-close").addEventListener("click", () => ov.remove());
  const body = ov.querySelector("#v-body");
  if (contentType.startsWith("image/")) body.innerHTML = `<img src="data:${contentType};base64,${base64}" alt="${esc(title)}" />`;
  else if (contentType === "application/pdf" && window.pdfjsLib) {
    body.innerHTML = `<div class="spinner"></div>`;
    renderPdf(body, b64ToBytes(base64)).catch(() => (body.innerHTML = `<p style="color:var(--muted);text-align:center;padding:30px">Couldn't render this PDF.</p>`));
  } else body.innerHTML = `<p style="color:var(--muted);text-align:center;padding:40px">Preview not supported for this file type.</p>`;
}
async function renderPdf(container, bytes) {
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  container.innerHTML = "";
  const maxW = Math.min(container.clientWidth - 28, 900);
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const scale = maxW / page.getViewport({ scale: 1 }).width;
    const vp = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = vp.width; canvas.height = vp.height;
    container.appendChild(canvas);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
  }
}

/* ============================================================
   SHARE (received documents)
   ============================================================ */
function openShareSheet(docId, title) {
  const bd = document.createElement("div");
  bd.className = "sheet-backdrop";
  bd.innerHTML = `<div class="sheet"><div class="grip"></div><h3>Share document</h3><p>${esc(title)} — a secure, expiring link.</p>
    <div class="chips" id="exp"><button data-d="1">1 day</button><button data-d="7" class="active">7 days</button><button data-d="30">30 days</button></div>
    <button class="btn" id="mk">Create link</button><div id="out"></div></div>`;
  document.body.appendChild(bd);
  let days = 7;
  bd.addEventListener("click", (e) => { if (e.target === bd) bd.remove(); });
  bd.querySelectorAll("#exp button").forEach((b) => b.addEventListener("click", () => { bd.querySelectorAll("#exp button").forEach((x) => x.classList.remove("active")); b.classList.add("active"); days = +b.dataset.d; }));
  bd.querySelector("#mk").addEventListener("click", async () => {
    const btn = bd.querySelector("#mk"); btn.disabled = true; btn.textContent = "Creating…";
    try {
      const url = await createShare(docId, days);
      bd.querySelector("#out").innerHTML = `<div class="section-title" style="margin:18px 0 8px">Your link</div><div class="share-link"><input id="u" readonly value="${esc(url)}" /><button class="btn btn-sm" id="cp">Copy</button></div>`;
      bd.querySelector("#cp").addEventListener("click", async () => { try { await navigator.clipboard.writeText(url); toast("Link copied ✓"); } catch { bd.querySelector("#u").select(); } });
    } catch (e) { toast(e.message, true); }
    btn.disabled = false; btn.textContent = "Create link";
  });
}
async function createShare(docId, days) {
  const data = await fetchContent("received", docId);
  const blob = new Blob([b64ToBytes(data.content)], { type: data.document?.contentType || "application/octet-stream" });
  const fd = new FormData();
  fd.append("document", blob, (data.document?.fileName || docId) + "");
  fd.append("docId", docId); fd.append("audience", "link"); fd.append("gate", "none");
  fd.append("expiresInMs", String(days * 24 * 60 * 60 * 1000));
  const res = await fetch(API + "/shares", { method: "POST", credentials: "include", body: fd });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out.shareUrl) throw new Error(out.message || "Could not create share link");
  return out.shareUrl;
}

/* ============================================================ */
async function boot() {
  try { state.user = await apiGet("/profile"); Object.assign(state, { _docsLoaded: false, _recLoaded: false, tab: "home" }); renderShell(); }
  catch { renderAuth(); }
}
boot();
