/* ============================================================================
   DV3D — DocVerify 3D engine
   ----------------------------------------------------------------------------
   1. Injects a ".dv3d-stage" (ambient blobs + Three.js canvas) behind each app
      page (User dashboard, Issuer dashboard, both auth pages).
   2. Renders a floating particle depth-field (Three.js, CDN) with soft pointer
      parallax — ONE shared renderer, moved between pages, paused when hidden.
   3. Delegated 3D tilt + glare for dynamically rendered cards (received docs,
      issuer docs, opt-in [data-tilt-3d]) — no markup changes required.

   Everything degrades gracefully: no THREE → blobs only; reduced motion →
   static depth, no tilt; touch devices → no tilt. Zero coupling to app logic.
   ========================================================================== */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ------------------------------------------------------------ STAGES -- */
  // canvas:true pages host the Three.js field; others get CSS blobs only.
  const PAGES = {
    dashboard:       { hue: "sky",  canvas: true },
    issuerDashboard: { hue: "gold", canvas: true },
    authPage:        { hue: "sky",  canvas: false },
    issuerAuthPage:  { hue: "gold", canvas: false },
  };

  function ensureStage(pageId) {
    const page = document.getElementById(pageId);
    if (!page) return null;
    let stage = page.querySelector(":scope > .dv3d-stage");
    if (stage) return stage;
    stage = document.createElement("div");
    stage.className = "dv3d-stage";
    stage.setAttribute("aria-hidden", "true");
    stage.dataset.hue = PAGES[pageId].hue;
    stage.innerHTML =
      '<div class="dv3d-blob dv3d-blob--a"></div>' +
      '<div class="dv3d-blob dv3d-blob--b"></div>' +
      '<div class="dv3d-blob dv3d-blob--c"></div>';
    page.insertBefore(stage, page.firstChild);
    return stage;
  }

  /* -------------------------------------------------- THREE.JS FIELD ---- */
  const HUES = {
    sky:  { near: 0x38bdf8, far: 0x6366f1 },
    gold: { near: 0xf5b301, far: 0x10b981 },
  };

  let field = null; // { renderer, scene, camera, near, far, raf, running }
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function makeLayer(count, spread, size, color, opacity) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread * 2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color, size, sizeAttenuation: true, transparent: true,
      opacity, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    return new THREE.Points(geo, mat);
  }

  function buildField() {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05080d, 0.028);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 120);
    camera.position.set(0, 1.5, 16);

    const near = makeLayer(420, 22, 0.16, 0xffffff, 0.85);
    const far = makeLayer(900, 46, 0.10, 0xffffff, 0.45);
    scene.add(near, far);

    return { renderer, scene, camera, near, far, raf: 0, running: false };
  }

  function tintField(hue) {
    const c = HUES[hue] || HUES.sky;
    field.near.material.color.setHex(c.near);
    field.far.material.color.setHex(c.far);
  }

  function sizeField(stage) {
    const w = stage.clientWidth || window.innerWidth;
    const h = stage.clientHeight || window.innerHeight;
    field.renderer.setSize(w, h, false);
    field.camera.aspect = w / h;
    field.camera.updateProjectionMatrix();
  }

  function loop(t) {
    if (!field || !field.running) return;
    // Soft pointer parallax + endless slow drift (transform-only, GPU cheap).
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    field.near.rotation.y = t * 0.000045 + pointer.x * 0.12;
    field.far.rotation.y = t * 0.00002 + pointer.x * 0.06;
    field.near.rotation.x = pointer.y * 0.06;
    field.far.rotation.x = pointer.y * 0.03;
    field.camera.position.y = 1.5 + pointer.y * -0.6;
    field.renderer.render(field.scene, field.camera);
    field.raf = requestAnimationFrame(loop);
  }

  function startField(pageId) {
    if (prefersReduced || typeof THREE === "undefined") return;
    const cfg = PAGES[pageId];
    if (!cfg || !cfg.canvas) { stopField(); return; }
    const stage = ensureStage(pageId);
    if (!stage) return;
    if (!field) field = buildField();
    if (field.renderer.domElement.parentNode !== stage) stage.appendChild(field.renderer.domElement);
    tintField(cfg.hue);
    sizeField(stage);
    if (!field.running) { field.running = true; field.raf = requestAnimationFrame(loop); }
  }

  function stopField() {
    if (!field || !field.running) return;
    field.running = false;
    cancelAnimationFrame(field.raf);
  }

  window.addEventListener("pointermove", (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  window.addEventListener("resize", () => {
    if (field && field.running && field.renderer.domElement.parentNode) {
      sizeField(field.renderer.domElement.parentNode);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopField();
    else activate(currentPageId);
  });

  /* --------------------------------------------------- PAGE LIFECYCLE --- */
  let currentPageId = null;

  function activate(pageId) {
    currentPageId = pageId;
    if (!PAGES[pageId]) { stopField(); return; } // landing/guest keeps its own shader
    ensureStage(pageId);
    startField(pageId);
  }

  window.addEventListener("ds:pagechange", (e) => {
    activate(e.detail && e.detail.pageId);
  });

  function detectInitial() {
    for (const id of Object.keys(PAGES)) {
      const el = document.getElementById(id);
      if (el && !el.classList.contains("hidden")) { activate(id); return; }
    }
  }

  /* ------------------------------------------------ DELEGATED 3D TILT --- */
  // Card selectors that exist only after dynamic renders — delegation means
  // they get 3D tilt automatically, with zero changes to script.js.
  const TILT_SELECTOR = [
    "#received-docs-list > div",
    "#shared-with-me-list > div",
    "#issuer-docs-list .luxe-card",
    "[data-tilt-3d]",
  ].join(",");
  const MAX_TILT_H = 620, MAX_TILT_W = 980; // don't tilt whole panels
  const TILT_DEG = 5;

  let card = null, rect = null, rafId = 0, lastEv = null;

  function findCard(target) {
    const el = target && target.closest ? target.closest(TILT_SELECTOR) : null;
    if (!el) return null;
    if (el.closest(".fixed")) return null; // never tilt inside modals/overlays
    const r = el.getBoundingClientRect();
    if (r.height > MAX_TILT_H || r.width > MAX_TILT_W) return null;
    return el;
  }

  function applyTilt() {
    rafId = 0;
    if (!card || !lastEv || !rect) return;
    const px = Math.min(Math.max((lastEv.clientX - rect.left) / rect.width, 0), 1);
    const py = Math.min(Math.max((lastEv.clientY - rect.top) / rect.height, 0), 1);
    const ry = (px - 0.5) * TILT_DEG * 2;
    const rx = (0.5 - py) * TILT_DEG * 2;
    card.style.transform =
      "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) +
      "deg) translateY(-2px) scale(1.012)";
    card.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
    card.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
  }

  function enterCard(el) {
    card = el;
    rect = el.getBoundingClientRect();
    el.classList.add("dv-tilting");
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    if (!el.querySelector(":scope > .dv-glare")) {
      const g = document.createElement("div");
      g.className = "dv-glare";
      el.appendChild(g);
    }
    el.style.transition = "transform .2s cubic-bezier(.16,1,.3,1)";
  }

  function leaveCard() {
    if (!card) return;
    card.style.transform = "";
    card.classList.remove("dv-tilting");
    card = null; rect = null; lastEv = null;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  if (finePointer && !prefersReduced) {
    document.addEventListener("pointerover", (e) => {
      if (e.pointerType === "touch") return;
      const el = findCard(e.target);
      if (el && el !== card) { leaveCard(); enterCard(el); }
    }, { passive: true });

    document.addEventListener("pointermove", (e) => {
      if (!card) return;
      if (!card.isConnected) { leaveCard(); return; } // list re-rendered
      lastEv = e;
      if (!rafId) rafId = requestAnimationFrame(applyTilt);
    }, { passive: true });

    document.addEventListener("pointerout", (e) => {
      if (card && (!e.relatedTarget || !card.contains(e.relatedTarget))) leaveCard();
    }, { passive: true });
  }

  /* --------------------------------------------------------------- BOOT */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", detectInitial);
  } else {
    detectInitial();
  }
})();
