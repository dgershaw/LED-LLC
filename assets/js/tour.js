/* Eddy's welcome tour (David, 2026-10-09). On laptops, Eddy pops up on the home page and offers a look around that takes
   about a minute: he hops from stop to stop across a few pages with a spotlight and a speech bubble, can read his lines
   aloud, and brings visitors back to the home page at the end. The stop to resume lives in sessionStorage so he survives
   the page changes; "done" and "not now" are remembered in localStorage. Phones and portrait tablets get nothing.
   index.html?tour shows the invitation again; index.html?tour=start begins the tour at once (the Meet Eddy page uses it). */
(function () {
  "use strict";
  if (!window.matchMedia) return;
  if (/[?&]tourframe\b/.test(location.search)) return;            // a page shown inside the touch-screen tour never runs its own
  // Touch screens (iPhone, iPad) only let a page start sound after a tap, and every page change locks it again. So there the
  // tour never leaves the home page: other pages open in a full-screen frame under Eddy, and his voice runs straight through
  // (David, 2026-10-09: "make this one continuous thing"). Laptops still move from page to page.
  const FRAME = window.matchMedia("(pointer: coarse)").matches;
  // Phones and tablets too since 2026-10-09 (David: "make that live to work on the iPhone or on a tablet"). NARROW is the
  // header without its nav (980px and below): the menu stops use the menu drawer and Eddy docks along the bottom.
  const NARROW = window.matchMedia("(max-width: 980px)");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement.dataset.root || "";
  const here = location.pathname.split("/").pop() || "index.html";
  const STEP = "eddyTourStep", VOICE = "eddyTourVoice", SEEN = "eddyTour";
  const DAY = 864e5;
  const $ = (s, r = document) => r.querySelector(s);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } } };
  const sess = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } }, del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* private mode */ } } };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* The stops. `at` is what the spotlight frames, `do` opens or closes the Products menu first, `pose` adds a wave. */
  const STOPS = [
    { key: "welcome", page: "index.html", at: ".home-hero h1", pose: "wave", fun: "juggle", hold: 7600, bare: true,
      say: "<strong>Welcome to our new home!</strong> Light Efficient Design, RemPhos and Solera, all under one roof. Let me show you around." },
    { key: "products", page: "index.html", at: "#mega-products .mega-cols", do: "menu",
      say: "Everything we make lives under <strong>Products</strong>, sorted the way the trade thinks: lamps, indoor fixtures, retrofit kits, outdoor and solar, controls." },
    { key: "brands", page: "index.html", at: "#mega-products .mega-brands", do: "menu",
      say: "Or shop by brand. Light Efficient Design, RemPhos and Solera each have a home of their own." },
    { key: "search", page: "index.html", at: ".hdr-right [data-open-search]",
      say: "Know the part number? <strong>Search</strong> it and land right on its page. The slash key opens search from anywhere." },
    { key: "lbi", page: "lbi.html", at: ".switcher",
      say: "This is the <strong>LBI Family Overview</strong>: eight linkable light bars. Pick one up here and the whole page follows." },
    { key: "switches", page: "lbi.html", at: ".stage", fun: "flip", narrowSpan: ["#stage-view", '[data-slide="cct"], [data-slide="pk2"]'],
      say: "Flip the FlexWatt and FlexColor switches, pick a length, and the bar on screen follows along." },
    { key: "glance", page: "shoe-box-wall-pack.html", at: "section.cs-glance",
      say: "Every product page opens with the facts <strong>at a glance</strong>, straight from the spec sheet." },
    { key: "parts", page: "shoe-box-wall-pack.html", at: "#parts table", narrowAt: "#parts table tbody tr",
      say: "Then the <strong>part numbers</strong>, with spec sheets, instructions and IES files right in the table." },
    { key: "next", page: "shoe-box-wall-pack.html", at: ".next-steps", pose: "wave",
      say: "Need a sample, a rebate or your local rep? That's my department, at the bottom of every page." },
    { key: "home", page: "index.html", at: ".hdr-eddy", pose: "wave", fun: "wiggle", last: true,
      say: "That's the tour! I live in the logo, so whenever I wiggle, click me and I'll lend a hand. <strong>Welcome home.</strong>" },
  ];

  /* Eddy as a drawing, so he can point, wave, blink and hop. Proportions follow Amy George's stickers. */
  const EDDY = `<svg class="eddy-svg" viewBox="0 0 200 240" aria-hidden="true" focusable="false">
  <g class="e-ant" fill="none" stroke="#0b4f9b" stroke-width="6" stroke-linecap="round"><path d="M118 38c2-14 8-24 18-32"/><path d="M118 38c7-13 15-20 30-24"/><path d="M118 38c11-9 23-12 37-10"/></g>
  <path class="e-torso" d="M56 126h88v72h-4v38h-28v-38h-24v38H60v-38h-4z" fill="#0b4f9b"/>
  <path d="M28 130a72 72 0 0 1 144 0z" fill="#7a9f3c"/>
  <path d="M100 134v16" stroke="#5a92cd" stroke-width="3" stroke-linecap="round"/><circle cx="100" cy="134" r="4.5" fill="#5a92cd"/>
  <g class="e-eye"><circle cx="100" cy="90" r="26" fill="#fff"/><circle cx="100" cy="90" r="16" fill="none" stroke="#0b4f9b" stroke-width="8"/><circle class="e-pupil" cx="100" cy="90" r="6.5" fill="#0b4f9b"/></g>
  <path d="M116 117q10-3 16-12" fill="none" stroke="#0b4f9b" stroke-width="3" stroke-linecap="round"/>
  <g class="e-arm e-arm-l"><path d="M60 150h-40" fill="none" stroke="#0b4f9b" stroke-width="18" stroke-linecap="round"/><circle cx="18" cy="150" r="14" fill="#0b4f9b"/></g>
  <g class="e-arm e-arm-r"><path d="M140 150h40" fill="none" stroke="#0b4f9b" stroke-width="18" stroke-linecap="round"/><circle cx="182" cy="150" r="14" fill="#0b4f9b"/></g>
</svg>`;
  const SPEAKER = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

  let veil, spot, guide, fig, say, bar, nextBtn, voiceBtn, tapBtn, cur = null, arriving = false, frame = null;
  const view = () => (frame && frame.contentWindow) || window;   // the window the current stop lives in
  let i = -1, timer = 0, left = 0, total = 0, lastT = 0, paused = false, pauseCap = 0, poll = 0, quick = 0, lastBox = "";
  // With David's recordings in place (2026-10-09) Eddy talks by default; the speaker button turns him off and that is remembered.
  let voice = store.get(VOICE) !== "off";

  /* ----- Pieces on the page ----- */
  function mount(arrive) {
    if (veil) return;
    arriving = arrive;
    veil = el("div", "tour-veil");
    spot = el("div", "tour-spot");
    guide = el("div", "tour-guide"); guide.setAttribute("role", "dialog"); guide.setAttribute("aria-label", "Eddy's tour");
    fig = el("div", "tour-eddy"); fig.innerHTML = EDDY;
    const bub = el("div", "tour-bubble");
    say = el("p", "tour-say"); say.setAttribute("aria-live", "polite");
    const row = el("div", "tour-row");
    voiceBtn = el("button", "tour-voice"); voiceBtn.type = "button"; voiceBtn.innerHTML = SPEAKER;
    voiceBtn.title = "Read aloud"; voiceBtn.setAttribute("aria-label", "Read aloud"); voiceBtn.setAttribute("aria-pressed", String(voice));
    if (!canTalk()) voiceBtn.hidden = true;
    const endBtn = el("button", "tour-btn quiet"); endBtn.type = "button"; endBtn.textContent = "End tour";
    nextBtn = el("button", "tour-btn sp"); nextBtn.type = "button"; nextBtn.textContent = "Next ›";
    row.append(voiceBtn, endBtn, nextBtn);
    bar = el("div", "tour-bar"); bar.innerHTML = "<i></i>";
    tapBtn = el("button", "tour-tap"); tapBtn.type = "button"; tapBtn.hidden = true;
    tapBtn.innerHTML = SPEAKER + "<span>Tap to hear Eddy</span>";      // unlock() runs on this tap like any other
    bub.append(tapBtn, say, row, bar);
    guide.append(fig, bub);
    if (arrive) guide.classList.add("dash-in");
    document.body.append(veil, spot, guide);
    requestAnimationFrame(() => { veil.classList.add("on"); spot.classList.add("on"); });
    // a click on the dimmed page moves on; it must not reach site.js, which would close the menu we are showing
    ["touchend", "click", "keydown"].forEach(t => document.addEventListener(t, unlock, true));
    veil.addEventListener("click", e => { e.stopPropagation(); setTimeout(next, 0); });
    nextBtn.addEventListener("click", next);
    endBtn.addEventListener("click", () => finish(true));
    voiceBtn.addEventListener("click", () => {
      voice = !voice; store.set(VOICE, voice ? "on" : "off"); voiceBtn.setAttribute("aria-pressed", String(voice));
      if (voice) { speak(STOPS[i]); left = Math.max(left, duration(STOPS[i].say) * 0.8); total = Math.max(total, left); } else hush();
    });
    // Hovering the bubble pauses the clock so slow readers can finish, for 10 s at most. Only a pointer that really moves
    // counts: Chrome fakes mouse events when the bubble lands under a still pointer, which would stall the tour.
    let px = -1, py = -1;
    bub.addEventListener("pointermove", e => {
      if (px >= 0 && Math.hypot(e.clientX - px, e.clientY - py) > 2 && !paused) { paused = true; clearTimeout(pauseCap); pauseCap = setTimeout(() => { paused = false; }, 10000); }
      px = e.clientX; py = e.clientY;
    });
    bub.addEventListener("pointerleave", () => { paused = false; px = py = -1; clearTimeout(pauseCap); });
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", refit);
    window.addEventListener("scroll", refit, { passive: true });
    poll = setInterval(() => { if (cur) fit(false); }, 300);          // follow reveals and late layout
    if (voice) loadClips();
  }

  function onKey(e) {
    if (/input|textarea|select/i.test((document.activeElement && document.activeElement.tagName) || "")) return;
    if (e.key === "Escape") { finish(true); return; }
    if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
      if (e.target && e.target.closest && e.target.closest(".tour-guide button")) return;   // the button's own click handles it
      e.preventDefault(); next();
    }
  }
  function onVis() {
    if (document.hidden) { if (audio) audio.pause(); if ("speechSynthesis" in window) speechSynthesis.pause(); }
    else { if (audio) audio.play().catch(() => {}); if ("speechSynthesis" in window) speechSynthesis.resume(); }
  }
  function refit() {
    if (!cur || !guide) return;
    spot.classList.add("quick"); guide.classList.add("quick");
    fit(false);
    clearTimeout(quick);
    quick = setTimeout(() => { if (spot) { spot.classList.remove("quick"); guide.classList.remove("quick"); } }, 160);
  }

  /* ----- Running the stops ----- */
  function begin() { unlock(); store.set(SEEN, JSON.stringify({ state: "done", t: Date.now() })); sess.set(STEP, "0"); JUG.forEach(f => { new Image().src = root + "assets/img/eddy/" + f; }); mount(false); show(0); }
  function next() { if (i < 0) return; if (STOPS[i] && STOPS[i].last) finish(true); else show(i + 1); }

  async function show(k) {
    const st = STOPS[k];
    if (!st) return finish(true);
    i = k; sess.set(STEP, String(k));
    stopTimer(); stopFun();
    hush();
    if (st.page !== here && !FRAME) return depart(st);
    mount(false);
    if (FRAME) { await framePage(st.page); if (i !== k) return; }
    await wait(0);   // let the tap on Next finish first: site.js closes the menu on any click outside the header
    if (i !== k) return;
    if (st.do === "menu") { openMenu(); await wait(260); } else closeMenu();
    const target = targetOf(st);
    if (!target) return next();                                    // the page changed under us: skip the stop
    say.innerHTML = st.say;
    nextBtn.textContent = st.last ? "Finish" : "Next ›";
    await bring(target);                                           // the spot rides along with the old stop meanwhile
    if (i !== k) return;                                           // the visitor moved on while we scrolled
    if (spot) spot.classList.toggle("bare", !!st.bare);   // the welcome has no highlight, just Eddy and his bubble (David, 2026-10-09)
    cur = target; lastBox = "";
    fit(true);
    if (arriving) { arriving = false; requestAnimationFrame(() => requestAnimationFrame(() => guide && guide.classList.remove("dash-in"))); }
    if (st.fun === "juggle" && !reduce) funIntro(); else if (st.pose === "wave") wave();
    if (st.fun === "flip") flipSwitches(); else if (st.fun === "wiggle") wiggleLogo();
    speak(st);
    startTimer(Math.max(duration(st.say), st.hold || 0));
    try { nextBtn.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
  }

  /* Touch screens: show another page in the frame (or drop the frame for the home page), with Eddy dashing across. */
  async function framePage(page) {
    const want = page === here ? "" : page;
    if ((frame ? frame.dataset.page : "") === want) return;
    if (guide) guide.classList.add("dash-out");
    const out = wait(reduce ? 0 : 470);
    if (!want) { await out; if (frame) { frame.remove(); frame = null; } }
    else {
      if (!frame) { frame = el("iframe", "tour-frame"); frame.title = "Tour page"; frame.setAttribute("tabindex", "-1"); document.body.append(frame); }
      frame.dataset.page = want;
      const loaded = new Promise(r => { frame.onload = r; setTimeout(r, 9000); });
      frame.src = root + want + "?tourframe";
      await Promise.all([out, loaded]);
      try { frame.contentWindow.addEventListener("scroll", refit, { passive: true }); frame.contentDocument.documentElement.style.scrollBehavior = "auto"; } catch (e) { /* cross-origin never happens here */ }
      await wait(250);                                               // let its reveals and fonts settle
    }
    if (guide) { guide.classList.remove("dash-out"); guide.classList.add("dash-in"); arriving = true; }
  }

  async function depart(st) {
    if (guide) guide.classList.add("dash-out");
    await wait(reduce || !guide ? 0 : 470);
    location.href = root + st.page;
  }

  function finish(mark) {
    stopTimer(); stopFun(); clearInterval(poll); clearTimeout(quick); cur = null; i = -1;
    hush();
    ["touchend", "click", "keydown"].forEach(t => document.removeEventListener(t, unlock, true));
    sess.del(STEP);
    if (mark) store.set(SEEN, JSON.stringify({ state: "done", t: Date.now() }));
    closeMenu();
    document.removeEventListener("keydown", onKey); document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("resize", refit); window.removeEventListener("scroll", refit);
    if (frame) { const pg = frame.dataset.page; frame.remove(); frame = null; if (pg) { location.href = root + pg; return; } }   // ended part way: stay on the page being shown
    if (!veil) return;
    veil.classList.remove("on"); spot.classList.remove("on"); guide.classList.add("bye");
    const v = veil, s = spot, g = guide; veil = spot = guide = null;
    setTimeout(() => { v.remove(); s.remove(); g.remove(); }, 520);
  }

  function openMenu() {
    if (NARROW.matches) {
      const d = $("#drawer"); if (d && d.dataset.open !== "true") $("#menu-open")?.click();
      const accs = document.querySelectorAll("#drawer .acc > button"), b = accs[accs.length - 1];   // Shop by brand: open it on the brands stop so its logos show
      if (b) { const want = STOPS[i] && STOPS[i].key === "brands"; if ((b.getAttribute("aria-expanded") === "true") !== want) b.click(); }
      return;
    }
    const b = $(".nav-item.products"); if (b && b.getAttribute("aria-expanded") !== "true") b.click();
  }
  function closeMenu() {
    const pn = $("#drawer .panel"); if (pn) pn.scrollTop = 0;
    const d = $("#drawer"); if (d && d.dataset.open === "true") $("#menu-close")?.click();
    const bs = document.querySelectorAll("#drawer .acc > button"), bb = bs[bs.length - 1]; if (bb && bb.getAttribute("aria-expanded") === "true") bb.click();
    const b = $(".nav-item.products"); if (b && b.getAttribute("aria-expanded") === "true") b.click();
  }
  /* What a stop frames. On narrow screens the Products and Shop by brand stops frame the groups in the menu drawer. */
  function targetOf(st) {
    if (NARROW.matches && st.do === "menu") {
      const accs = [...document.querySelectorAll("#drawer .acc")];
      if (accs.length < 2) return null;
      const els = st.key === "brands" ? accs.slice(-1) : accs.slice(0, -1);
      return { closest: q => els[0].closest(q), getBoundingClientRect: () => {
        const rs = els.map(e => e.getBoundingClientRect()), l = Math.min(...rs.map(r => r.left)), t = Math.min(...rs.map(r => r.top));
        const rr = Math.max(...rs.map(r => r.right)), b = Math.max(...rs.map(r => r.bottom));
        return { left: l, top: t, right: rr, bottom: b, width: rr - l, height: b - t };
      } };
    }
    if (NARROW.matches && st.narrowSpan) {
      view().document.documentElement.classList.add("tour-lean");   // site.css hides the readout so the bar and the switch fit above the bubble   // a phone stacks the bar over the switches: frame from the bar down to the FlexColor switch
      const d = view().document, a = $(st.narrowSpan[0], d), b = $(st.narrowSpan[1], d), c = b && b.closest(".ctl");
      if (a && c) return { closest: q => a.closest(q), pinBelow: () => ({ el: c, gap: a.offsetHeight + 4 }), getBoundingClientRect: () => {
        const r = a.getBoundingClientRect(), r2 = c.getBoundingClientRect();
        return { left: Math.min(r.left, r2.left), top: r.top, right: Math.max(r.right, r2.right), bottom: r2.bottom, width: Math.max(r.right, r2.right) - Math.min(r.left, r2.left), height: r2.bottom - r.top };
      } };
    }
    return $((NARROW.matches && st.narrowAt) || st.at, view().document);   // a phone shows the table as tall cards: frame the first one
  }

  /* Scroll the stop into view: centered when it fits under the header, else its top just below the header. */
  async function bring(target) {
    const panel = NARROW.matches && target.closest(".drawer .panel");
    if (panel) {                                                   // a menu group under the docked bubble: scroll the menu, not the page
      const r = target.getBoundingClientRect(), head = panel.querySelector(".panel-head"), top = (head ? head.getBoundingClientRect().bottom : 0) + 8;
      const below = r.bottom - (innerHeight - (guide ? guide.offsetHeight : 0) - 24);
      if (below > 0) { panel.scrollTo({ top: panel.scrollTop + Math.min(below, r.top - top), behavior: reduce ? "instant" : "smooth" }); await wait(reduce ? 0 : 420); }
      return;
    }
    if (target.closest(".site-header, .mega, .switcher, .drawer")) return;   // pinned things never need a scroll
    const w = view(), r = target.getBoundingClientRect(), hh = headerH();
    if (target.pinBelow) {                                         // phones: the bar sticks under the switcher, so scroll the switch up to meet it
      const p = target.pinBelow(), y = Math.max(0, Math.round(w.scrollY + p.el.getBoundingClientRect().top - hh - p.gap));
      return glide(w, y);
    }
    const vh = innerHeight - (NARROW.matches && guide ? guide.offsetHeight + 20 : 0);   // keep it clear of the docked bubble
    const fits = r.height <= vh - hh - 40;
    const y = Math.max(0, Math.round(w.scrollY + r.top - (fits ? hh + (vh - hh - r.height) / 2 : hh + 16)));
    return glide(w, y);
  }
  /* Smooth-scroll to y and wait for it. A page still settling (images, fonts) can stall a smooth scroll part way, so finish the job. */
  async function glide(w, y) {
    if (Math.abs(y - w.scrollY) < 4) return;
    w.scrollTo({ top: y, behavior: reduce ? "instant" : "smooth" });
    let last = -1, same = 0;
    for (let n = 0; n < 30; n++) { await wait(50); if (Math.abs(w.scrollY - last) < 1) { if (++same >= 2) break; } else same = 0; last = w.scrollY; }
    if (Math.abs(y - w.scrollY) >= 4) w.scrollTo({ top: y, behavior: "instant" });
  }
  function headerH() {   // the header, plus the LBI page's sticky variant switcher under it
    const d = view().document, h = $(".site-header", d), sw = $(".switcher", d);
    return (h ? h.getBoundingClientRect().bottom : 0) + (sw ? sw.offsetHeight : 0);
  }

  /* Frame the stop and put Eddy and his bubble beside it. */
  function fit(hop) {
    if (!cur || !spot) return;
    const r = cur.getBoundingClientRect();
    if (!r.width && !r.height) return;
    const box = [r.left, r.top, r.width, r.height].map(Math.round).join(",");
    if (box === lastBox && !hop) return;
    lastBox = box;
    const pad = clamp(Math.round(Math.min(r.width, r.height) * 0.12), 6, 14);
    spot.style.left = (r.left - pad) + "px"; spot.style.top = (r.top - pad) + "px";
    spot.style.width = (r.width + 2 * pad) + "px"; spot.style.height = (r.height + 2 * pad) + "px";
    let p;
    if (NARROW.matches) {                                           // docked along the bottom of the screen
      guide.classList.add("dock"); guide.classList.remove("flip"); guide.style.left = guide.style.top = "";
      const g = guide.getBoundingClientRect(); p = { x: g.left, y: g.top, flip: false };
    } else {
      guide.classList.remove("dock");
      p = place(r, guide.offsetWidth, guide.offsetHeight);
      guide.classList.toggle("flip", p.flip);
      guide.style.left = p.x + "px"; guide.style.top = p.y + "px";
    }
    point(r, p);
    if (hop && !reduce) { fig.classList.remove("hop"); void fig.offsetWidth; fig.classList.add("hop"); setTimeout(() => fig && fig.classList.remove("hop"), 720); }
  }
  function place(r, gw, gh) {
    const vw = innerWidth, vh = innerHeight, m = 14, g = 18;
    const midY = r.top + r.height / 2 - gh / 2;
    const cands = [
      { x: r.right + g, y: midY, flip: false },                   // beside it, on the right
      { x: r.left - g - gw, y: midY, flip: true },                // beside it, on the left
      { x: r.left, y: r.bottom + g, flip: false },                // under it
      { x: r.right - gw, y: r.bottom + g, flip: true },
      { x: r.left, y: r.top - g - gh, flip: false },              // above it
      { x: r.right - gw, y: r.top - g - gh, flip: true },
    ];
    for (const c of cands) if (c.x >= m && c.y >= m && c.x + gw <= vw - m && c.y + gh <= vh - m) return c;
    return { x: vw - m - gw, y: vh - m - gh, flip: true };        // too big to sit beside: bottom right corner
  }
  /* Eddy points at the stop with the nearer arm and looks at it. */
  function point(r, p) {
    const svg = fig.firstElementChild;
    const fx = p.flip ? p.x + guide.offsetWidth - fig.offsetWidth / 2 : p.x + fig.offsetWidth / 2;   // where he will stand
    const fy = p.y + guide.offsetHeight - fig.offsetHeight * 0.4;
    const ang = Math.atan2(r.top + r.height / 2 - fy, r.left + r.width / 2 - fx) * 180 / Math.PI;   // 0 right, -90 up
    const rightSide = Math.cos(ang * Math.PI / 180) >= 0;
    if (rightSide) { svg.style.setProperty("--ar", clamp(ang, -95, 60).toFixed(0) + "deg"); svg.style.setProperty("--al", "-42deg"); }
    else { let a = ang - 180; if (a <= -180) a += 360; svg.style.setProperty("--al", clamp(a, -60, 95).toFixed(0) + "deg"); svg.style.setProperty("--ar", "42deg"); }
    svg.style.setProperty("--lx", (5 * Math.cos(ang * Math.PI / 180)).toFixed(1) + "px");
    svg.style.setProperty("--ly", (5 * Math.sin(ang * Math.PI / 180)).toFixed(1) + "px");
    fig.dataset.side = rightSide ? "r" : "l";
  }
  function wave() {
    if (reduce || !fig) return;
    const c = fig.dataset.side === "r" ? "wave-l" : "wave-r";       // the arm that is not pointing
    fig.classList.add(c); setTimeout(() => fig && fig.classList.remove(c), 2500);
  }
  /* The party trick at the first stop (David, 2026-10-09: "wave and be more fun", "juggle some of our products"): after the
     hop lands, a two-armed wave with a sway, then he juggles a Shoe Box retrofit lamp, an LBI G1 and a Solera flood light. */
  const JUG = ["jug-lamp.png", "jug-lbi.png", "jug-solar.png"];
  let funT = [], unflip = null;
  function stopFun() {
    funT.forEach(clearTimeout); funT = [];
    try { view().document.documentElement.classList.remove("tour-lean"); } catch (e) { /* frame gone */ }
    if (unflip) { unflip(); unflip = null; }
    if (!fig) return;
    fig.classList.remove("wave-l", "wave-r", "sway", "juggling");
    const j = fig.querySelector(".jug"); if (j) j.remove();
  }
  function funIntro() {
    funT.push(setTimeout(() => {
      if (!fig) return;
      fig.classList.add("wave-l", "wave-r", "sway");
      funT.push(setTimeout(() => fig && fig.classList.remove("wave-l", "wave-r", "sway"), 2150));
    }, 700));
    funT.push(setTimeout(() => {
      if (!fig) return;
      const j = el("span", "jug"); j.setAttribute("aria-hidden", "true");
      JUG.forEach(f => { const im = new Image(); im.src = root + "assets/img/eddy/" + f; im.alt = ""; j.append(im); });
      fig.append(j); fig.classList.add("juggling");
      requestAnimationFrame(() => j.classList.add("on"));
      funT.push(setTimeout(() => { j.classList.remove("on"); fig.classList.remove("juggling"); funT.push(setTimeout(() => j.remove(), 450)); }, 4300));
    }, 2900));
  }

  /* The switches stop (David, 2026-10-09): Eddy flips the FlexColor switch through every setting in time with "Flip the
     FlexWatt and FlexColor switches", so the bar on screen changes color, then sets it back where the visitor had it. */
  function flipSwitches() {
    const doc = view().document, knob = () => doc.querySelector('[data-slide="cct"][aria-checked="true"], [data-slide="pk2"][aria-checked="true"]');
    const first = knob(); if (!first) return;
    const id = first.dataset.slide, home = +first.dataset.i, n = doc.querySelectorAll(`[data-slide="${id}"]`).length;
    const set = j => {
      const b = doc.querySelector(`[data-slide="${id}"][data-i="${j}"]`); if (!b || b.getAttribute("aria-checked") === "true") return;
      const had = document.activeElement === nextBtn, from = +(doc.querySelector(`[data-slide="${id}"][aria-checked="true"]`) || b).dataset.i;
      b.click();                                                    // lbi.js redraws the controls and the bar
      const sl = doc.querySelector(`[data-slide="${id}"]`)?.closest(".slide");   // the redraw is a new knob: start it at the old spot so it slides
      if (sl) { sl.style.setProperty("--i", from); void sl.offsetWidth; sl.style.setProperty("--i", j); }
      if (had) try { nextBtn.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
    };
    const seq = [...Array(n).keys()].filter(j => j !== home).concat(home);   // warm to cool, then back to the visitor's setting
    seq.forEach((j, s) => funT.push(setTimeout(() => { set(j); if (s === seq.length - 1) unflip = null; }, 1000 + s * 620)));
    unflip = () => set(home);
  }
  /* The last stop: the header LED wiggles as Eddy says "whenever I wiggle", and once more on "click me" (David, 2026-10-09). */
  function wiggleLogo() {
    const led = $(".hdr-eddy"); if (!led) return;
    const go = twice => { led.classList.remove("wiggle", "twice"); void led.offsetWidth; led.classList.toggle("twice", twice); led.classList.add("wiggle"); };
    funT.push(setTimeout(() => go(true), 2700), setTimeout(() => go(false), 5100));
  }

  /* ----- Pace: a line stays up long enough to read, longer when spoken; hovering the bubble pauses it. ----- */
  function duration(s) {
    const n = s.replace(/<[^>]+>/g, "").length;
    const d = clamp(1200 + n * 36, 3200, 9000);
    return voice ? Math.max(d, 1200 + n * 70) : d;
  }
  function startTimer(ms) { total = left = ms; lastT = 0; paused = false; clearTimeout(pauseCap); bar.firstChild.style.width = "0%"; cancelAnimationFrame(timer); timer = requestAnimationFrame(tick); }
  function tick(t) {
    if (lastT && !paused && !document.hidden) left -= t - lastT;
    lastT = t;
    bar.firstChild.style.width = (100 * (1 - left / total)).toFixed(1) + "%";
    if (left <= 0) { timer = 0; next(); return; }
    timer = requestAnimationFrame(tick);
  }
  function stopTimer() { cancelAnimationFrame(timer); timer = 0; }

  /* ----- Eddy's voice (David, 2026-10-09: male, smooth, uplifting, natural and fun). Recorded clips come first: if
     assets/audio/tour/clips.json exists it maps a stop's key to a file in that folder, and the tour plays it. Without a clip
     the device's own speech voices are used, preferring natural male US English ones; they vary a lot by device. ----- */
  const AUDIO = root + "assets/audio/tour/";
  let clips = null, clipsReq = null, audio = null;
  const loadClips = () => clipsReq || (clipsReq = fetch(AUDIO + "clips.json").then(r => (r.ok ? r.json() : null)).then(j => (clips = j && typeof j === "object" ? j : null)).catch(() => (clips = null)));
  const VOICE_PREFS = [
    /(Guy|Christopher|Eric|Andrew|Brian|Roger|Steffan) Online \(Natural\)/i,   // Edge's natural voices
    /^Eddy\b/i,                                                                   // Apple's "Eddy", a friendly one, and the name fits
    /^(Aaron|Alex|Tom|Evan|Nathan|Reed)\b/i,                                      // Apple male voices
    /Microsoft (David|Mark|Guy|Christopher|Eric)\b/i,                             // Windows male voices
    /x-(iom|tpd|iod)/i,                                                           // Android male voices
    /^(Daniel|Oliver|Arthur|Ryan|George)\b/i,                                     // British male voices
  ];
  function pickVoice() {
    const all = speechSynthesis.getVoices();
    const us = all.filter(v => /^en[-_]US/i.test(v.lang)), en = all.filter(v => /^en/i.test(v.lang));
    for (const re of VOICE_PREFS) { const v = us.find(x => re.test(x.name)) || en.find(x => re.test(x.name)); if (v) return v; }
    return us.find(v => v.default) || us[0] || en.find(v => v.default) || en[0] || null;
  }
  const voicesReady = () => new Promise(res => {
    if (!("speechSynthesis" in window)) return res();
    if (speechSynthesis.getVoices().length) return res();
    const done = () => { speechSynthesis.removeEventListener("voiceschanged", done); res(); };
    speechSynthesis.addEventListener("voiceschanged", done); setTimeout(done, 600);
  });
  function hush() {
    if (audio) { audio.pause(); audio.onended = null; audio = null; }
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }
  const canTalk = () => ("speechSynthesis" in window) || ("Audio" in window);
  async function speak(st) {
    if (!voice || !st) return;
    const my = i; hush();
    await loadClips();
    if (!voice || i !== my) return;
    const text = st.say.replace(/<[^>]+>/g, "");
    if (clips && clips[st.key] && "Audio" in window) {
      const a = getPlayer(); audio = a;
      a.onended = () => { if (audio === a) { audio = null; if (left > 900) left = 900; } };
      a.src = AUDIO + clips[st.key];
      a.play().then(() => { nudge(false); stretch(a); }).catch(err => {
        if (audio !== a) return;
        if (err && err.name === "AbortError") return;                       // replaced by the next clip
        if (err && err.name === "NotAllowedError") { unlocked = false; nudge(true); return; }   // blocked until a tap: unlock() plays it
        audio = null; sayAloud(text);
      });
      return;
    }
    sayAloud(text);
  }
  // A stop never moves on while Eddy is still talking: it lasts at least the rest of the clip plus a breath.
  function stretch(a) {
    const go = () => {
      if (audio !== a || !isFinite(a.duration)) return;
      const need = (a.duration - a.currentTime) * 1000 + 700;
      if (need > left) { total += need - left; left = need; }
    };
    if (a.readyState >= 1) go(); else a.addEventListener("loadedmetadata", go, { once: true });
  }
  /* iPhones and iPads only let a page start sound during a tap (David heard nothing on his iPhone, 2026-10-09). So every clip
     on a page plays through one audio element, and the visitor's first tap on the page (Show me around, Next, anywhere)
     plays a moment of silence on it, or the clip that was waiting, which unlocks it for the rest of that page. A new page
     starts locked again; until the next tap the speaker button pulses. */
  const SILENT = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//NwwAAAAAAAAAAAAEluZm8AAAAPAAAABgAAAykAWlpaWlpaWlpaWlpaWlpaWnt7e3t7e3t7e3t7e3t7e3t7nJycnJycnJycnJycnJycnL29vb29vb29vb29vb29vb293t7e3t7e3t7e3t7e3t7e3t7/////////////////////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQEUQAAAAAAAAMpso/G6AAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=";
  let player = null, unlocked = false;
  function getPlayer() { if (!player) { player = new Audio(); player.preload = "auto"; player.setAttribute("playsinline", ""); } return player; }
  function unlock(e) {
    if (e && e.isTrusted === false) return;                         // the tour's own clicks (the switch flips) are not a visitor's tap
    if (unlocked || !("Audio" in window)) return;
    const p = getPlayer(); unlocked = true;
    if (audio === p && voice) { p.play().then(() => { nudge(false); stretch(p); }).catch(() => { unlocked = false; }); return; }
    if (audio) return;
    p.src = SILENT; p.play().catch(() => {});
  }
  function nudge(on) { if (tapBtn) tapBtn.hidden = !(on && voice); }
  async function sayAloud(text) {
    if (!("speechSynthesis" in window)) return;
    const my = i;
    await voicesReady();
    if (!voice || i !== my) return;
    const ss = speechSynthesis; ss.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    const natural = v && /Natural|Online/i.test(v.name);
    u.rate = 1; u.pitch = natural ? 1 : 1.05;           // smooth, not chirpy; neural voices sound best untouched
    u.onend = () => { if (left > 900) left = 900; };
    setTimeout(() => ss.speak(u), 60);
  }

  /* ----- The invitation on the home page ----- */
  function invite() {
    const box = el("div", "tour-invite"); box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Eddy offers a tour");
    const bub = el("div", "tour-bubble");
    bub.innerHTML = `<p class="tour-say"><strong>Hi, I'm Eddy!</strong> Welcome to our new home. Want a quick look around? It takes about a minute.</p>`;
    const row = el("div", "tour-row");
    const later = el("button", "tour-btn quiet"); later.type = "button"; later.textContent = "Not now";
    const go = el("button", "tour-btn sp"); go.type = "button"; go.textContent = "Show me around";
    row.append(later, go); bub.append(row);
    const ed = el("button", "tour-eddy"); ed.type = "button"; ed.setAttribute("aria-label", "Start Eddy's tour"); ed.innerHTML = EDDY;
    box.append(bub, ed);
    document.body.append(box);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      box.classList.add("on");
      if (!reduce) { ed.classList.add("wave-l"); setTimeout(() => ed.classList.remove("wave-l"), 2600); }
    }));
    const close = () => { box.classList.remove("on"); setTimeout(() => box.remove(), 500); };
    later.addEventListener("click", () => { store.set(SEEN, JSON.stringify({ state: "later", t: Date.now() })); close(); });
    const start = () => { close(); begin(); };
    go.addEventListener("click", start); ed.addEventListener("click", start);
  }
  function wantsInvite() {
    const q = new URLSearchParams(location.search);
    if (q.has("tour")) return q.get("tour") === "start" ? "start" : "ask";
    let rec = null; try { rec = JSON.parse(store.get(SEEN) || "null"); } catch (e) { rec = null; }
    if (!rec) return "ask";
    const age = Date.now() - (rec.t || 0);
    if (rec.state === "later" && age > 30 * DAY) return "ask";
    if (rec.state === "done" && age > 180 * DAY) return "ask";
    return "";
  }

  /* ----- Boot: resume a tour in flight, or offer one on the home page ----- */
  const stored = sess.get(STEP);
  if (stored !== null) {
    const k = +stored;
    if (STOPS[k] && STOPS[k].page === here) { mount(true); show(k); }
    else sess.del(STEP);
  } else if (here === "index.html") {
    const w = wantsInvite();
    if (w === "start") setTimeout(begin, 400);
    else if (w === "ask") setTimeout(() => { if (!veil) invite(); }, 2500);
  }
})();
