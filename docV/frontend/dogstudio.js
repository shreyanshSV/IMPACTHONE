/* ============================================================================
   DOGSTUDIO-STYLE MOTION CONTROLLER — DocVerify
   Preloader · custom cursor · Lenis smooth scroll · GSAP scroll reveals ·
   kinetic hero · marquees · magnetic buttons · counters · WebGL hero shader.

   Depends (loaded via CDN before this file):
     - Lenis (window.Lenis)
     - gsap, ScrollTrigger (window.gsap, window.ScrollTrigger)
   Everything degrades gracefully if a lib is missing or reduced-motion is on.
   ========================================================================== */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
    .matches;
  const hasGSAP = typeof window.gsap !== "undefined";
  const hasLenis = typeof window.Lenis !== "undefined";

  // Mark the document as motion-enabled so CSS applies its hidden-until-animated
  // states ONLY when this script is actually running (no JS / failed load = visible).
  if (!prefersReduced) {
    document.documentElement.classList.add("ds-anim");
  }

  if (hasGSAP && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ---------------------------------------------------------------- LENIS */
  // Lenis smooth-scroll drives the WINDOW. It must run ONLY on the full-window
  // landing page. The dashboard / issuer pages scroll inside an inner <main>
  // (their wrapper is h-screen overflow-hidden), and Lenis's global wheel hook
  // would otherwise swallow the wheel before it reaches that inner scroller —
  // making the app feel unscrollable. So we enable it on the guest page and
  // fully destroy it elsewhere.
  let lenis = null;
  let lenisRafStarted = false;
  function enableLenis() {
    if (lenis || !hasLenis || prefersReduced) return;
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
    }
    // Single rAF/ticker loop, guarded so it's a harmless no-op once Lenis is
    // destroyed and safe to re-enable later without stacking loops.
    if (!lenisRafStarted) {
      if (hasGSAP && window.ScrollTrigger) {
        gsap.ticker.add((time) => { if (lenis) lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
      } else {
        const raf = (t) => { if (lenis) lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
      lenisRafStarted = true;
    }
    window.__dsLenis = lenis;
  }
  // Hand scrolling back to the browser. destroy() removes Lenis's wheel/touch
  // listeners (stop() would keep preventing default and still block scroll).
  function disableLenis() {
    if (!lenis) return;
    try { lenis.destroy(); } catch (e) {}
    lenis = null;
    window.__dsLenis = null;
  }

  /* --------------------------------------------------------------- CURSOR */
  function initCursor() {
    if (!finePointer || prefersReduced) return;
    const ring = document.createElement("div");
    ring.className = "ds-cursor is-hidden";
    ring.innerHTML = '<span class="ds-cursor-label"></span>';
    const dot = document.createElement("div");
    dot.className = "ds-cursor-dot is-hidden";
    document.body.appendChild(ring);
    document.body.appendChild(dot);
    const label = ring.querySelector(".ds-cursor-label");

    let mx = window.innerWidth / 2,
      my = window.innerHeight / 2;
    let rx = mx,
      ry = my;
    let first = true;
    let hovered = false;
    let isText = false;

    const hoverSel =
      "a, button, [data-cursor], [role='button'], .ds-portal, .ds-feature, .ds-menu__item";
    const textSel = "input, textarea, select, [contenteditable='true']";

    // Recompute hover state on EVERY move so it self-corrects even when the
    // element under the cursor is removed during a re-render (no stuck blob).
    function syncHover(target) {
      const overText = target && target.closest(textSel);
      const t = !overText && target ? target.closest(hoverSel) : null;
      if (t) {
        if (!hovered) {
          ring.classList.add("is-hover");
          hovered = true;
        }
        label.textContent = t.getAttribute("data-cursor") || "";
      } else if (hovered) {
        ring.classList.remove("is-hover");
        hovered = false;
        label.textContent = "";
      }
      const nowText = !!overText;
      if (nowText !== isText) {
        ring.classList.toggle("is-text", nowText);
        isText = nowText;
      }
    }

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      if (first) {
        ring.classList.remove("is-hidden");
        dot.classList.remove("is-hidden");
        first = false;
      }
      syncHover(e.target);
    });
    // hide when the pointer leaves the window; show again on re-entry
    document.addEventListener("mouseleave", () => {
      ring.classList.add("is-hidden");
      dot.classList.add("is-hidden");
    });
    document.addEventListener("mouseenter", () => {
      ring.classList.remove("is-hidden");
      dot.classList.remove("is-hidden");
    });
    // pressed feedback
    window.addEventListener("mousedown", () => ring.classList.add("is-down"));
    window.addEventListener("mouseup", () => ring.classList.remove("is-down"));

    function loop() {
      rx += (mx - rx) * 0.22;
      ry += (my - ry) * 0.22;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    }
    loop();
  }

  /* ------------------------------------------------------- WEBGL HERO BG */
  function initHeroGL(container) {
    if (!container || prefersReduced) return false;
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return false;

    const vert = `
      attribute vec2 p;
      void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
    const frag = `
      precision highp float;
      uniform vec2 u_res;
      uniform float u_time;
      uniform vec2 u_mouse;
      // smooth value noise
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
        vec2 u=f*f*(3.-2.*f);
        return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
      }
      float fbm(vec2 p){
        float v=0., a=.5;
        for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=.5; }
        return v;
      }
      void main(){
        vec2 uv = gl_FragCoord.xy/u_res.xy;
        vec2 q = uv;
        q.x *= u_res.x/u_res.y;
        float t = u_time*0.05;
        vec2 m = (u_mouse - 0.5)*0.4;
        float n = fbm(q*2.2 + vec2(t, -t*0.6) + m);
        float n2 = fbm(q*3.5 - vec2(t*0.7, t) + n);
        vec3 deep = vec3(0.02,0.031,0.051);
        vec3 sky  = vec3(0.054,0.647,0.913);  // brand sky
        vec3 emer = vec3(0.063,0.725,0.506);  // emerald
        vec3 col = mix(deep, sky, smoothstep(0.35,0.95,n));
        col = mix(col, emer, smoothstep(0.55,1.0,n2)*0.7);
        col += pow(n2,4.0)*0.25;
        // vignette
        float vig = smoothstep(1.25,0.2,length(uv-0.5));
        col *= vig;
        gl_FragColor = vec4(col,1.0);
      }`;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");
    let mouse = [0.5, 0.5];
    window.addEventListener("mousemove", (e) => {
      mouse = [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight];
    });

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    let running = true;
    function render(now) {
      if (!running) return;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uMouse, mouse[0], mouse[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
    // pause when hero off-screen
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((ents) => {
        running = ents[0].isIntersecting;
        if (running) requestAnimationFrame(render);
      }).observe(container);
    }
    return true;
  }

  /* ----------------------------------------------- POINTER-REACTIVE FIELD */
  /* Updates --mx/--my CSS vars (eased) so any background can follow the mouse.
     Drives the cursor-reactive glow on the auth pages + dashboard. */
  function initPointerField() {
    if (!finePointer || prefersReduced) return;
    let tx = 50,
      ty = 35,
      cx = 50,
      cy = 35;
    const root = document.documentElement.style;
    window.addEventListener("mousemove", (e) => {
      tx = (e.clientX / window.innerWidth) * 100;
      ty = (e.clientY / window.innerHeight) * 100;
    });
    (function loop() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      root.setProperty("--mx", cx.toFixed(2) + "%");
      root.setProperty("--my", cy.toFixed(2) + "%");
      requestAnimationFrame(loop);
    })();
  }

  /* ------------------------------------------------------ CARD TILT (3D) */
  /* Subtle perspective tilt that follows the cursor — used on the auth card
     and any [data-tilt] element. */
  function initTilt() {
    if (!finePointer || prefersReduced) return;
    const targets = [];
    const authCard = document.querySelector("#authPage .bg-white");
    if (authCard)
      targets.push({ el: authCard, area: document.getElementById("authPage") });
    const issuerCard = document.querySelector("#issuerAuthPage .luxe-card");
    if (issuerCard)
      targets.push({
        el: issuerCard,
        area: document.getElementById("issuerAuthPage"),
      });
    document.querySelectorAll("[data-tilt]").forEach((el) => {
      targets.push({ el, area: el });
    });
    targets.forEach(({ el, area }) => {
      if (!el || !area) return;
      el.style.transition = "transform .25s cubic-bezier(.16,1,.3,1)";
      el.style.transformStyle = "preserve-3d";
      area.addEventListener("mousemove", (e) => {
        const r = area.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform =
          "perspective(1000px) rotateY(" +
          px * 9 +
          "deg) rotateX(" +
          -py * 9 +
          "deg)";
      });
      area.addEventListener("mouseleave", () => {
        el.style.transform = "perspective(1000px) rotateY(0deg) rotateX(0deg)";
      });
    });
  }

  /* --------------------------------------------------------- MAGNETIC BTN */
  function initMagnetic() {
    if (!finePointer || prefersReduced) return;
    document.querySelectorAll(".ds-magnetic, [data-magnetic]").forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic) || 0.35;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "translate(0,0)";
        el.style.transition = "transform .5s cubic-bezier(.16,1,.3,1)";
      });
      el.addEventListener("mouseenter", () => {
        el.style.transition = "transform .1s linear";
      });
    });
  }

  /* ----------------------------------------------------------- MARQUEES */
  function initMarquees() {
    document.querySelectorAll(".ds-marquee").forEach((m) => {
      const track = m.querySelector(".ds-marquee__track");
      if (!track) return;
      // duplicate content so it loops seamlessly
      track.innerHTML += track.innerHTML;
      const speed = parseFloat(m.dataset.speed) || 60; // px/s
      const dir = m.dataset.dir === "right" ? 1 : -1;
      let x = 0;
      let last = performance.now();
      const half = () => track.scrollWidth / 2;
      function step(now) {
        const dt = (now - last) / 1000;
        last = now;
        x += dir * speed * dt;
        const h = half();
        if (x <= -h) x += h;
        if (x >= 0 && dir === 1) x -= h;
        track.style.transform = `translateX(${x}px)`;
        requestAnimationFrame(step);
      }
      if (!prefersReduced) requestAnimationFrame(step);
    });
  }

  /* ---------------------------------------------------- GSAP HERO + REVEALS */
  function initHeroIntro() {
    const lines = document.querySelectorAll(".ds-hero__title .ds-line > span");
    if (!lines.length) return;
    if (!hasGSAP || prefersReduced) {
      lines.forEach((l) => (l.style.transform = "none"));
      document.querySelectorAll(".ds-hero .ds-fade").forEach(
        (el) => (el.style.opacity = 1)
      );
      return;
    }
    const tl = gsap.timeline({ delay: 0.1 });
    tl.to(lines, {
      y: 0,
      duration: 1.1,
      ease: "expo.out",
      stagger: 0.12,
    }).to(
      ".ds-hero .ds-fade",
      { opacity: 1, y: 0, duration: 0.9, ease: "power2.out", stagger: 0.1 },
      "-=0.6"
    );
    return tl;
  }

  function initReveals() {
    if (!hasGSAP || !window.ScrollTrigger) {
      document
        .querySelectorAll(".ds-reveal, .ds-fade")
        .forEach((el) => ((el.style.opacity = 1), (el.style.transform = "none")));
      return;
    }
    // generic reveals (skip hero fades, handled by intro)
    gsap.utils
      .toArray(".ds-reveal")
      .forEach((el) => {
        gsap.fromTo(
          el,
          { y: 48, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: "expo.out",
            scrollTrigger: { trigger: el, start: "top 85%" },
          }
        );
      });

    // word-by-word manifesto highlight
    document.querySelectorAll(".ds-manifesto").forEach((m) => {
      const words = m.querySelectorAll(".ds-word");
      if (!words.length) return;
      gsap.to(words, {
        opacity: 1,
        stagger: 0.06,
        ease: "none",
        scrollTrigger: {
          trigger: m,
          start: "top 80%",
          end: "bottom 60%",
          scrub: true,
        },
      });
    });

    // parallax for [data-speed]
    gsap.utils.toArray("[data-parallax]").forEach((el) => {
      const sp = parseFloat(el.dataset.parallax) || 0.2;
      gsap.to(el, {
        yPercent: -sp * 100,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    });

    // counters
    gsap.utils.toArray("[data-count]").forEach((el) => {
      const end = parseFloat(el.dataset.count);
      const dec = (el.dataset.count.split(".")[1] || "").length;
      const suffix = el.dataset.suffix || "";
      const obj = { v: 0 };
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () =>
          gsap.to(obj, {
            v: end,
            duration: 1.8,
            ease: "power2.out",
            onUpdate: () => {
              el.textContent = obj.v.toFixed(dec) + suffix;
            },
          }),
      });
    });
  }

  /* --------------------------------------------------------- PRELOADER */
  function runPreloader(done) {
    const pre = document.querySelector(".ds-preloader");
    const curtain = document.querySelector(".ds-curtain");
    const countEl = pre && pre.querySelector(".ds-preloader__count");
    const bar = pre && pre.querySelector(".ds-preloader__bar span");

    const finish = () => {
      document.documentElement.classList.add("ds-loaded");
      done && done();
    };

    if (!pre || prefersReduced || !hasGSAP) {
      if (pre) pre.style.display = "none";
      if (curtain)
        curtain.querySelectorAll("span").forEach((s) => (s.style.transform = "scaleY(0)"));
      finish();
      return;
    }

    const state = { n: 0 };
    const tl = gsap.timeline();
    tl.to(state, {
      n: 100,
      duration: 1.6,
      ease: "power1.inOut",
      onUpdate: () => {
        const v = Math.round(state.n);
        if (countEl) countEl.textContent = v;
        if (bar) bar.style.transform = `scaleX(${state.n / 100})`;
      },
    })
      .to(pre, { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, "+=0.15")
      .from(
        curtain ? curtain.querySelectorAll("span") : [],
        {
          scaleY: 1,
        },
        "<"
      )
      .to(
        curtain ? curtain.querySelectorAll("span") : [],
        {
          scaleY: 0,
          transformOrigin: "bottom",
          duration: 0.8,
          ease: "expo.inOut",
          stagger: 0.06,
          onStart: finish,
        },
        "<0.1"
      )
      .set(pre, { display: "none" });
  }

  /* -------------------------------------------------- FULLSCREEN MENU */
  function dsOpenMenu() {
    const m = document.getElementById("dsMenu");
    if (!m) return;
    m.classList.add("is-open");
    m.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("ds-menu-open");
    if (window.__dsLenis) window.__dsLenis.stop();
  }
  function dsCloseMenu() {
    const m = document.getElementById("dsMenu");
    if (!m) return;
    m.classList.remove("is-open");
    m.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("ds-menu-open");
    if (window.__dsLenis) window.__dsLenis.start();
  }
  function dsMenuGo(section) {
    dsCloseMenu();
    if (typeof window.showDashboardSection === "function") {
      window.showDashboardSection(section);
    }
  }
  // highlight the active item in the permanent rail
  function dsSetActive(section) {
    document.querySelectorAll("#dsMenu .ds-menu__item").forEach((it) => {
      const oc = it.getAttribute("onclick") || "";
      it.classList.toggle("ds-active", oc.indexOf("'" + section + "'") !== -1);
    });
  }
  // expose for inline onclick handlers
  window.dsOpenMenu = dsOpenMenu;
  window.dsCloseMenu = dsCloseMenu;
  window.dsMenuGo = dsMenuGo;
  window.dsSetActive = dsSetActive;
  // Esc closes the menu
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") dsCloseMenu();
  });

  /* -------------------------------------------------- NETWORK STATUS (static) */
  function initNetworkStatus() {
    const gasEl = document.getElementById("network-gas");
    if (!gasEl) return;
    // Static label by design — no live RPC/gas polling (zero failure risk).
    gasEl.textContent = "· Connected";
    gasEl.style.color = "var(--ds-emerald, #34d399)";
  }

  /* ------------------------------------------------------------- BOOT */
  // Chart.js renders with dark-grey text/grid by default — invisible on the
  // dark dashboard. Re-default to light so analytics charts read clearly.
  function initChartTheme() {
    if (typeof window.Chart === "undefined") return;
    try {
      window.Chart.defaults.color = "#9aa6b2";
      window.Chart.defaults.borderColor = "rgba(255,255,255,0.08)";
      window.Chart.defaults.font.family = "Inter, sans-serif";
    } catch (e) {
      /* older Chart API — ignore */
    }
  }

  function boot() {
    const scope = document.querySelector(".ds-scope");
    initChartTheme();
    initCursor();
    initPointerField();
    initTilt();
    initNetworkStatus();

    // Keep the menu rail's active item in sync with the real navigation,
    // whoever triggers it (rail click, code, etc.).
    if (typeof window.showDashboardSection === "function") {
      const _orig = window.showDashboardSection;
      window.showDashboardSection = function (section) {
        const r = _orig.apply(this, arguments);
        try {
          dsSetActive(section);
        } catch (e) {}
        return r;
      };
    }
    dsSetActive("home");
    // default the rail to 'home' whenever the dashboard becomes visible
    window.addEventListener("ds:pagechange", (e) => {
      if (e.detail && e.detail.pageId === "dashboard") {
        const active = document.querySelector("#dsMenu .ds-menu__item.ds-active");
        if (!active) dsSetActive("home");
      }
    });
    if (scope) {
      initHeroGL(scope.querySelector(".ds-hero__canvas"));
      initMarquees();
      initMagnetic();
    }
    runPreloader(() => {
      initHeroIntro();
      initReveals();
      // Only smooth-scroll if the landing page is the one on screen (a logged-in
      // user may already have been switched to the dashboard by now).
      const gp = document.getElementById("guestPage");
      if (gp && !gp.classList.contains("hidden")) enableLenis();
      if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh();
      if (scope) scope.classList.add("is-ready");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Enable/disable smooth scroll when the app swaps pages (script.js calls
  // showPage). Smooth scroll belongs to the full-window landing page only; the
  // app pages must scroll natively inside their inner <main>.
  window.addEventListener("ds:pagechange", (e) => {
    const pageId = e.detail && e.detail.pageId;
    if (pageId === "guestPage") {
      enableLenis();
      if (window.__dsLenis) window.__dsLenis.scrollTo(0, { immediate: true });
    } else {
      disableLenis();
      window.scrollTo(0, 0);
    }
    if (hasGSAP && window.ScrollTrigger) {
      setTimeout(() => ScrollTrigger.refresh(), 60);
    }
  });
})();
