/* ============================================================
   DocuChain mobile app — document wallet (loads over the live site,
   reuses the same session-cookie API as the desktop portal).
   ============================================================ */
const API = location.origin + "/api";
const root = document.getElementById("root");
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

const state = { user: null, tab: "home", docs: [], received: [], shares: [] };

/* ---------- tiny helpers ---------- */
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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
  const res = await fetch(API + path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");

const ICONS = {
  logo: `<img class="logo" src="/icon.svg" alt="" />`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-7 9 7v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z"/></svg>`,
  doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>`,
  inbox: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
  share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>`,
};

/* ============================================================
   AUTH
   ============================================================ */
function renderAuth(mode = "signin") {
  const verified = { done: false };
  root.innerHTML = `
    <div class="auth">
      <div class="auth-brand">
        <img class="logo" src="/icon.svg" alt="DocuChain" />
        <h1>DocuChain</h1>
        <p>Your secure blockchain document wallet</p>
      </div>
      <div class="seg">
        <button data-mode="signin" class="${mode === "signin" ? "active" : ""}">Sign In</button>
        <button data-mode="signup" class="${mode === "signup" ? "active" : ""}">Sign Up</button>
      </div>
      <div id="auth-form"></div>
    </div>`;
  root.querySelectorAll(".seg button").forEach((b) =>
    b.addEventListener("click", () => renderAuth(b.dataset.mode))
  );
  const f = root.querySelector("#auth-form");
  if (mode === "signin") {
    f.innerHTML = `
      <div class="field"><label>Email</label><input id="si-email" type="email" inputmode="email" placeholder="you@email.com" /></div>
      <div class="field"><label>Password</label><input id="si-pass" type="password" placeholder="Your password" /></div>
      <button class="btn" id="si-btn">Sign In</button>`;
    f.querySelector("#si-btn").addEventListener("click", doSignin);
  } else {
    f.innerHTML = `
      <div class="field"><label>Full name</label><input id="su-name" placeholder="Your name" /></div>
      <div class="field"><label>Email</label>
        <div class="otp-row">
          <div class="field" style="margin:0"><input id="su-email" type="email" inputmode="email" placeholder="you@email.com" /></div>
          <button class="btn btn-sm" id="su-send">Verify</button>
        </div>
      </div>
      <div class="field" id="su-otp-wrap" style="display:none">
        <label>Enter the code sent to your email</label>
        <div class="otp-row">
          <div class="field" style="margin:0"><input id="su-otp" inputmode="numeric" placeholder="6-digit code" /></div>
          <button class="btn btn-sm" id="su-check">Check</button>
        </div>
      </div>
      <div class="row">
        <div class="field"><label>Phone</label><input id="su-phone" inputmode="tel" placeholder="Phone" /></div>
      </div>
      <div class="field"><label>Password</label><input id="su-pass" type="password" placeholder="Create a password" /></div>
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
      verified.done = true;
      btn.disabled = false; btn.textContent = "Create Account";
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
  btn.disabled = true; btn.textContent = "Creating…";
  const r = await apiPost("/auth/signup", { fullName, email, password, phone });
  if (!r.ok) { btn.disabled = false; btn.textContent = "Create Account"; return toast(r.data.message || "Sign up failed", true); }
  boot();
}

/* ============================================================
   APP SHELL + TABS
   ============================================================ */
function renderShell() {
  const name = state.user?.fullName || "there";
  root.innerHTML = `
    <div class="header">
      <img class="logo" src="/icon.svg" alt="" />
      <div><div class="h-title">DocuChain</div><div class="h-sub">Hi, ${esc(name.split(" ")[0])}</div></div>
    </div>
    <div id="screen" class="screen"></div>
    <nav class="nav">
      ${navBtn("home", "Home")}${navBtn("documents", "Documents")}${navBtn("received", "Received")}${navBtn("profile", "Profile")}
    </nav>`;
  root.querySelectorAll(".nav button").forEach((b) =>
    b.addEventListener("click", () => setTab(b.dataset.tab))
  );
  renderTab();
}
function navBtn(tab, label) {
  return `<button data-tab="${tab}" class="${state.tab === tab ? "active" : ""}">${ICONS[tab === "documents" ? "doc" : tab === "received" ? "inbox" : tab === "profile" ? "user" : "home"]}<span>${label}</span></button>`;
}
function setTab(tab) {
  state.tab = tab;
  root.querySelectorAll(".nav button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  renderTab();
}

function renderTab() {
  const s = document.getElementById("screen");
  if (state.tab === "home") return renderHome(s);
  if (state.tab === "documents") return renderDocs(s);
  if (state.tab === "received") return renderReceived(s);
  if (state.tab === "profile") return renderProfile(s);
}

function loading(s) { s.innerHTML = `<div class="spinner"></div>`; }

async function renderHome(s) {
  loading(s);
  try {
    if (!state.docs.length && !state._docsLoaded) await loadDocs();
    if (!state.received.length && !state._recLoaded) await loadReceived();
  } catch (e) { /* show anyway */ }
  const recent = state.received.slice(0, 3);
  s.innerHTML = `
    <h2>Your wallet</h2>
    <div class="stats">
      <div class="stat accent"><div class="n">${state.received.length}</div><div class="l">Received documents</div></div>
      <div class="stat"><div class="n">${state.docs.length}</div><div class="l">Your documents</div></div>
    </div>
    <div class="section-title">Recently received</div>
    ${recent.length ? recent.map((d) => docCard(d, "received")).join("") : emptyBox("Nothing received yet")}
    ${state.received.length > 3 ? `<button class="btn btn-ghost" id="see-all">See all received</button>` : ""}`;
  bindCards(s);
  s.querySelector("#see-all")?.addEventListener("click", () => setTab("received"));
}

async function renderDocs(s) {
  loading(s);
  try { await loadDocs(); } catch (e) { return errBox(s, e); }
  s.innerHTML = `<h2>Your documents</h2>${state.docs.length ? state.docs.map((d) => docCard(d, "documents")).join("") : emptyBox("You haven't added any documents")}`;
  bindCards(s);
}

async function renderReceived(s) {
  loading(s);
  try { await loadReceived(); } catch (e) { return errBox(s, e); }
  s.innerHTML = `<h2>Received</h2>${state.received.length ? state.received.map((d) => docCard(d, "received")).join("") : emptyBox("No documents shared to you yet")}`;
  bindCards(s);
}

function renderProfile(s) {
  const u = state.user || {};
  const initials = (u.fullName || "U").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  s.innerHTML = `
    <div class="profile-hero">
      <div class="avatar">${esc(initials)}</div>
      <h2 style="margin:0">${esc(u.fullName || "User")}</h2>
    </div>
    <div class="list">
      <div class="list-item"><span class="k">Email</span><span class="v">${esc(u.email || "—")}</span></div>
      <div class="list-item"><span class="k">Phone</span><span class="v">${esc(u.phone || "—")}</span></div>
      <div class="list-item"><span class="k">Wallet</span><span class="v">${u.walletAddress ? esc(u.walletAddress.slice(0, 6) + "…" + u.walletAddress.slice(-4)) : "Not linked"}</span></div>
    </div>
    <div class="section-title">Account</div>
    <div class="list">
      <button class="list-item" id="logout" style="width:100%;background:transparent;border:0;color:var(--red);text-align:left">
        <span style="display:grid;place-items:center;width:22px">${ICONS.logout}</span><span class="k" style="color:var(--red)">Log out</span>
      </button>
    </div>
    <p style="text-align:center;color:var(--faint);font-size:12px;margin-top:20px">Issuing documents & wallet actions are available on the web portal.</p>`;
  s.querySelector("#logout").addEventListener("click", async () => {
    await apiPost("/auth/logout");
    state.user = null; state.docs = []; state.received = []; state._docsLoaded = state._recLoaded = false;
    renderAuth();
  });
}

/* ---------- data ---------- */
async function loadDocs() { state.docs = await apiGet("/documents"); state._docsLoaded = true; }
async function loadReceived() { state.received = await apiGet("/received-documents"); state._recLoaded = true; }

/* ---------- cards ---------- */
function docLabel(d) {
  return [d.docType, d.docNumber].filter(Boolean).join(" · ") || d.name || d.docId || "Document";
}
function statusChip(d, kind) {
  if (kind === "documents") {
    const st = (d.status || "").toLowerCase();
    if (st.includes("verif")) return `<span class="chip ok">Verified</span>`;
    if (st.includes("reject")) return `<span class="chip bad">Rejected</span>`;
    return `<span class="chip warn">${esc(d.status || "Pending")}</span>`;
  }
  return `<span class="chip ok">On-chain</span>`;
}
function docCard(d, kind) {
  const date = fmtDate(d.submittedAt || d.uploadDate || d.issuedAt);
  return `
    <div class="doc-card">
      <div class="doc-ic">${ICONS.doc}</div>
      <div class="doc-meta">
        <div class="t">${esc(docLabel(d))}</div>
        <div class="s">${statusChip(d, kind)} &nbsp; ${esc(date)}</div>
      </div>
      <div class="doc-actions">
        <button class="icon-btn" data-view="${esc(d.docId)}" data-kind="${kind}" data-title="${esc(docLabel(d))}" title="View">${ICONS.eye}</button>
        ${kind === "received" ? `<button class="icon-btn" data-share="${esc(d.docId)}" data-title="${esc(docLabel(d))}" title="Share">${ICONS.share}</button>` : ""}
      </div>
    </div>`;
}
function bindCards(s) {
  s.querySelectorAll("[data-view]").forEach((b) =>
    b.addEventListener("click", () => viewDoc(b.dataset.kind, b.dataset.view, b.dataset.title))
  );
  s.querySelectorAll("[data-share]").forEach((b) =>
    b.addEventListener("click", () => openShareSheet(b.dataset.share, b.dataset.title))
  );
}
function emptyBox(msg) { return `<div class="empty">${ICONS.inbox}<div>${esc(msg)}</div></div>`; }
function errBox(s, e) { s.innerHTML = `<div class="empty">${ICONS.close}<div>${esc(e.message || "Something went wrong")}</div></div>`; }

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

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function showViewer(title, contentType, base64) {
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = `
    <div class="viewer-bar">
      <button class="icon-btn" id="v-close">${ICONS.close}</button>
      <div class="vt">${esc(title)}</div>
    </div>
    <div class="viewer-body" id="v-body"></div>`;
  document.body.appendChild(ov);
  ov.querySelector("#v-close").addEventListener("click", () => ov.remove());
  const body = ov.querySelector("#v-body");

  if (contentType.startsWith("image/")) {
    body.innerHTML = `<img src="data:${contentType};base64,${base64}" alt="${esc(title)}" />`;
  } else if (contentType === "application/pdf" && window.pdfjsLib) {
    body.innerHTML = `<div class="spinner"></div>`;
    renderPdf(body, b64ToBytes(base64)).catch(() => {
      body.innerHTML = `<p style="color:var(--muted);text-align:center;padding:30px">Couldn't render this PDF.</p>`;
    });
  } else {
    body.innerHTML = `<p style="color:var(--muted);text-align:center;padding:40px">Preview not supported for this file type (${esc(contentType)}).</p>`;
  }
}

async function renderPdf(container, bytes) {
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  container.innerHTML = "";
  const maxW = Math.min(container.clientWidth - 24, 900);
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const vp0 = page.getViewport({ scale: 1 });
    const scale = maxW / vp0.width;
    const vp = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = vp.width; canvas.height = vp.height;
    container.appendChild(canvas);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
  }
}

/* ============================================================
   SHARE (received documents only)
   ============================================================ */
function openShareSheet(docId, title) {
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  backdrop.innerHTML = `
    <div class="sheet">
      <div class="grip"></div>
      <h3>Share document</h3>
      <p>${esc(title)} — creates a secure, expiring link.</p>
      <div class="chips" id="exp-chips">
        <button data-days="1">1 day</button>
        <button data-days="7" class="active">7 days</button>
        <button data-days="30">30 days</button>
      </div>
      <button class="btn" id="mk-share">Create link</button>
      <div id="share-out"></div>
    </div>`;
  document.body.appendChild(backdrop);
  let days = 7;
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });
  backdrop.querySelectorAll("#exp-chips button").forEach((b) =>
    b.addEventListener("click", () => {
      backdrop.querySelectorAll("#exp-chips button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active"); days = Number(b.dataset.days);
    })
  );
  backdrop.querySelector("#mk-share").addEventListener("click", async () => {
    const btn = backdrop.querySelector("#mk-share");
    btn.disabled = true; btn.textContent = "Creating…";
    try {
      const url = await createShare(docId, days);
      backdrop.querySelector("#share-out").innerHTML = `
        <div class="section-title" style="margin-top:16px">Your link</div>
        <div class="share-link"><input id="s-url" readonly value="${esc(url)}" /><button class="btn btn-sm" id="s-copy">Copy</button></div>`;
      backdrop.querySelector("#s-copy").addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(url); toast("Link copied"); } catch { backdrop.querySelector("#s-url").select(); }
      });
    } catch (e) { toast(e.message, true); }
    btn.disabled = false; btn.textContent = "Create link";
  });
}

async function createShare(docId, days) {
  // The share endpoint re-encrypts the plaintext we upload, so first pull the
  // decrypted bytes via the view endpoint (session-authorised), then post them.
  const data = await fetchContent("received", docId);
  const bytes = b64ToBytes(data.content);
  const blob = new Blob([bytes], { type: data.document?.contentType || "application/octet-stream" });
  const fd = new FormData();
  fd.append("document", blob, (data.document?.fileName || docId) + "");
  fd.append("docId", docId);
  fd.append("audience", "link");
  fd.append("gate", "none");
  fd.append("expiresInMs", String(days * 24 * 60 * 60 * 1000));
  const res = await fetch(API + "/shares", { method: "POST", credentials: "include", body: fd });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out.shareUrl) throw new Error(out.message || "Could not create share link");
  return out.shareUrl;
}

/* ============================================================
   BOOT
   ============================================================ */
async function boot() {
  try {
    state.user = await apiGet("/profile");
    state._docsLoaded = state._recLoaded = false;
    state.tab = "home";
    renderShell();
  } catch {
    renderAuth();
  }
}
boot();
