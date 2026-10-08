/* Shared behaviour for every page: brand mega menus, the mobile drawer, part-number search,
   table filtering and copy buttons. No framework, no build step. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement.dataset.root || "";

  /* ----- Mega menus ----- */
  const header = $(".site-header");
  const navBtns = $$(".nav-item[aria-controls]");
  function closeMenus(except) {
    navBtns.forEach(b => {
      const panel = document.getElementById(b.getAttribute("aria-controls"));
      if (b !== except) { b.setAttribute("aria-expanded", "false"); if (panel) panel.dataset.open = "false"; }
    });
  }
  navBtns.forEach(b => {
    const panel = document.getElementById(b.getAttribute("aria-controls"));
    if (!panel) return;
    b.addEventListener("click", () => {
      const open = b.getAttribute("aria-expanded") === "true";
      closeMenus(b);
      b.setAttribute("aria-expanded", String(!open));
      panel.dataset.open = String(!open);
    });
  });
  document.addEventListener("click", e => { if (header && !header.contains(e.target)) closeMenus(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeMenus(); closeDrawer(); closeSearch(); } });

  /* ----- Mobile drawer ----- */
  const drawer = $("#drawer");
  function openDrawer() { if (!drawer) return; drawer.dataset.open = "true"; document.body.style.overflow = "hidden"; $("#menu-close")?.focus(); }
  function closeDrawer() { if (!drawer || drawer.dataset.open !== "true") return; drawer.dataset.open = "false"; document.body.style.overflow = ""; $("#menu-open")?.focus(); }
  $("#menu-open")?.addEventListener("click", openDrawer);
  $("#menu-close")?.addEventListener("click", closeDrawer);
  drawer?.querySelector(".scrim")?.addEventListener("click", closeDrawer);
  $$(".drawer .acc > button").forEach(b => b.addEventListener("click", () => {
    const open = b.getAttribute("aria-expanded") === "true";
    b.setAttribute("aria-expanded", String(!open));
  }));

  /* ----- Part-number search ----- */
  const search = $("#search");
  const input = $("#search-input");
  const results = $("#search-results");
  let index = null, loading = null, sel = -1;
  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (!loading) loading = fetch(root + "assets/js/search-index.json").then(r => r.json()).then(j => (index = j)).catch(() => (index = []));
    return loading;
  }
  function openSearch() { if (!search) return; search.dataset.open = "true"; document.body.style.overflow = "hidden"; loadIndex().then(() => render(input.value)); setTimeout(() => input?.focus(), 30); }
  function closeSearch() { if (!search || search.dataset.open !== "true") return; search.dataset.open = "false"; document.body.style.overflow = ""; }
  $$("[data-open-search]").forEach(b => b.addEventListener("click", openSearch));
  search?.addEventListener("click", e => { if (e.target === search) closeSearch(); });
  document.addEventListener("keydown", e => {
    if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !/input|textarea/i.test(document.activeElement?.tagName || ""))) { e.preventDefault(); openSearch(); }
  });
  const norm = s => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  function render(q) {
    if (!results) return;
    const nq = norm(q); sel = -1;
    if (!index) { results.innerHTML = '<div class="empty">Loading…</div>'; return; }
    if (nq.length < 2) { results.innerHTML = '<div class="empty">Type a part number (for example LED-8038, RP-LBI-G2 or SL-MA1), or a product name.</div>'; return; }
    const scored = [];
    for (const it of index) {
      const pn = norm(it.pn), name = norm(it.name);
      let score = 0;
      if (pn.startsWith(nq)) score = 3; else if (pn.includes(nq)) score = 2; else if (name.includes(nq)) score = 1;
      if (score) scored.push([score, it]);
    }
    scored.sort((a, b) => b[0] - a[0] || a[1].pn.localeCompare(b[1].pn));
    const top = scored.slice(0, 40);
    if (!top.length) { results.innerHTML = `<div class="empty">No part numbers match “${q.replace(/[<>&]/g, "")}”. Try the first characters only, or browse by brand above.</div>`; return; }
    results.innerHTML = top.map(([, it]) => `<a href="${root}${it.href}"><span class="pn">${it.pn}</span><span class="brand">${it.brand}</span><span class="where">${it.name}${it.table && it.table !== it.name ? " · " + it.table : ""}</span></a>`).join("");
  }
  input?.addEventListener("input", () => render(input.value));
  input?.addEventListener("keydown", e => {
    const links = $$("a", results);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); if (!links.length) return;
      sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
      links.forEach((l, i) => l.toggleAttribute("aria-selected", i === sel) || l.setAttribute("aria-selected", String(i === sel)));
      links[sel].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && sel >= 0 && links[sel]) { links[sel].click(); }
  });
  if (location.hash === "#search") openSearch();

  /* ----- Table filter (category pages) ----- */
  const filter = $("#pn-filter");
  if (filter) {
    const scope = $("#parts") || document;
    const rows = $$("table.parts tbody tr", scope);
    const count = $("#pn-count");
    const blocks = $$(".table-block", scope);
    const foot = $(".footnotes", scope);
    let empty = $(".filter-empty", scope);
    if (!empty) {
      empty = document.createElement("p"); empty.className = "filter-empty"; empty.hidden = true;
      empty.textContent = "No matches. Try a shorter part of the part number, or clear the filter.";
      (blocks[0]?.parentNode || scope).insertBefore(empty, blocks[0] || null);
    }
    const apply = () => {
      const nq = norm(filter.value);
      let shown = 0;
      rows.forEach(r => { const hit = !nq || norm(r.textContent).includes(nq); r.hidden = !hit; if (hit) shown++; });
      blocks.forEach(b => { b.hidden = !!nq && !$$("tbody tr", b).some(r => !r.hidden); });
      empty.hidden = !(nq && shown === 0);
      if (foot) foot.hidden = !!nq && shown === 0;
      if (count) count.textContent = nq ? `${shown} ${shown === 1 ? "match" : "matches"}` : "";
    };
    filter.addEventListener("input", apply); apply();
    // deep link: #pn=LED-8038 highlights that row
    const m = location.hash.match(/^#pn=(.+)$/);
    if (m) { filter.value = decodeURIComponent(m[1]); apply(); const first = rows.find(r => !r.hidden); first?.classList.add("hit"); first?.scrollIntoView({ block: "center" }); }
  }

  /* ----- Copy buttons ----- */
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-copy]"); if (!b) return;
    navigator.clipboard?.writeText(b.dataset.copy).then(() => { const t = b.textContent; b.textContent = "Copied"; setTimeout(() => (b.textContent = t), 1200); });
  });

  /* ----- Highlight the current nav item ----- */
  const here = location.pathname.split("/").pop() || "index.html";
  $$(".hdr-nav a, .drawer a").forEach(a => { if ((a.getAttribute("href") || "").split("#")[0] === here) a.setAttribute("aria-current", "page"); });
})();

/* 2026-10-08: page-top on arrival, YouTube player, photo lightbox, slideshows, portal note, Eddy's page. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----- Arrive at the top of a new page -----
     Inside a tall embed (like the preview), the parent window keeps its scroll position when a link changes the page,
     so a visitor would land halfway down the new page. On a fresh visit with no #anchor, scroll the frame into view. */
  try {
    const nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    const fresh = !nav || nav.type === "navigate";
    if (window.top !== window && fresh && !location.hash) {
      const toTop = () => {
        const html = document.documentElement, pad = html.style.scrollPaddingTop;
        html.style.scrollPaddingTop = "0px";
        html.scrollIntoView({ block: "start", behavior: "instant" });
        html.style.scrollPaddingTop = pad;
      };
      toTop();
      window.addEventListener("load", toTop, { once: true });
    }
  } catch (e) { /* cross-origin parents may refuse; nothing to do */ }

  /* ----- YouTube: poster first, player on click (no YouTube code loads until then) ----- */
  $$(".video-frame[data-yt]").forEach(a => {
    const yt = a.querySelector(".poster.yt");
    if (yt) {   // upgrade the YouTube thumbnail to full HD when it exists
      const hi = new Image();
      hi.onload = () => { if (hi.naturalWidth > 200) yt.src = hi.src; };
      hi.src = `https://i.ytimg.com/vi/${a.dataset.yt}/maxresdefault.jpg`;
    }
    a.addEventListener("click", e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${a.dataset.yt}?autoplay=1&rel=0&playsinline=1`;
      f.title = a.dataset.title || "Product video";
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      f.allowFullscreen = true;
      a.appendChild(f);
      a.removeAttribute("href");
    });
  });

  /* ----- Lightbox for installation photos ----- */
  let lb;
  document.addEventListener("click", e => {
    const a = e.target.closest("a[data-lightbox]");
    if (!a || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    if (!lb) {
      lb = document.createElement("dialog");
      lb.className = "lightbox";
      lb.innerHTML = '<button class="lb-close" type="button" aria-label="Close">×</button><img alt=""><p></p>';
      document.body.appendChild(lb);
      lb.addEventListener("click", ev => { if (ev.target === lb || ev.target.closest(".lb-close")) lb.close(); });
    }
    const img = a.querySelector("img");
    lb.querySelector("img").src = a.getAttribute("href");
    lb.querySelector("img").alt = img ? img.alt : "";
    lb.querySelector("p").textContent = a.dataset.caption || "";
    lb.showModal();
  });

  /* ----- Slideshows ----- */
  $$("[data-slideshow]").forEach(ss => {
    const slides = $$(".ss-slide", ss), thumbs = $$(".ss-thumb", ss), count = $(".ss-count b", ss);
    if (slides.length < 2) return;
    let i = 0, timer = 0, hover = false, seen = false;
    const go = n => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => { const on = k === i; s.classList.toggle("is-on", on); s.setAttribute("aria-hidden", String(!on)); const im = s.querySelector("img"); if (on && im) im.loading = "eager"; });
      thumbs.forEach((t, k) => t.setAttribute("aria-current", String(k === i)));
      if (count) count.textContent = String(i + 1);
      const t = thumbs[i];
      if (t) { const row = t.parentElement; row.scrollTo({ left: t.offsetLeft - row.clientWidth / 2 + t.clientWidth / 2, behavior: reduce ? "auto" : "smooth" }); }
    };
    const play = () => { stop(); if (!reduce && seen && !hover && !document.hidden) timer = setTimeout(() => { go(i + 1); play(); }, 5500); };
    const stop = () => { clearTimeout(timer); timer = 0; };
    $(".ss-btn.prev", ss)?.addEventListener("click", () => { go(i - 1); play(); });
    $(".ss-btn.next", ss)?.addEventListener("click", () => { go(i + 1); play(); });
    thumbs.forEach((t, k) => t.addEventListener("click", () => { go(k); play(); }));
    ss.addEventListener("mouseenter", () => { hover = true; stop(); });
    ss.addEventListener("mouseleave", () => { hover = false; play(); });
    ss.addEventListener("focusin", () => { hover = true; stop(); });
    ss.addEventListener("focusout", () => { hover = false; play(); });
    ss.addEventListener("keydown", e => { if (e.key === "ArrowLeft") { go(i - 1); play(); } if (e.key === "ArrowRight") { go(i + 1); play(); } });
    let x0 = null, y0 = null;
    const stage = $(".ss-stage", ss);
    stage.addEventListener("pointerdown", e => { x0 = e.clientX; y0 = e.clientY; });
    stage.addEventListener("pointerup", e => {
      if (x0 === null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { go(i + (dx < 0 ? 1 : -1)); play(); }
    });
    new IntersectionObserver(es => { seen = es.some(x => x.isIntersecting); seen ? play() : stop(); }, { threshold: 0.4 }).observe(ss);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : play()));
  });

  /* ----- Folded sections (details.fold) open when a link points at them or into them ----- */
  const unfold = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id || id.includes("=")) return;
    const el = document.getElementById(id);
    const d = el && (el.closest("details") || el.querySelector("details.fold"));
    if (d && !d.open) { d.open = true; el.scrollIntoView(); }
  };
  window.addEventListener("hashchange", unfold);
  unfold();

  /* ----- Part-number links on the same page (#pn=...) ----- */
  window.addEventListener("hashchange", () => {
    const m = location.hash.match(/^#pn=(.+)$/), f = $("#pn-filter");
    if (!m || !f) return;
    f.value = decodeURIComponent(m[1]);
    f.dispatchEvent(new Event("input"));
    const row = $$("table.parts tbody tr").find(r => !r.hidden);
    if (row) { $$("tr.hit").forEach(r => r.classList.remove("hit")); row.classList.add("hit"); row.scrollIntoView({ block: "center" }); }
  });

  /* ----- Customer portal: not live yet, so say so instead of going nowhere ----- */
  const tip = $("#portal-tip");
  let tipTimer = 0;
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-portal]");
    if (!b || !tip) return;
    e.preventDefault();
    tip.hidden = false;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => (tip.hidden = true), 7000);
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && tip) tip.hidden = true; });

  /* ----- Meet Eddy ----- */
  const buddy = $("[data-eddy-talk]");
  if (buddy) {
    const say = $(".eddy-say span");
    const lines = [
      "Hi! I'm Eddy. Short for Edison.",
      "Only 5 mm tall. Big ideas, though.",
      "Ask me about rebates. Actually, please do.",
      "I link, therefore I am.",
      "Waterproof? Not me. The LBI 65, yes.",
      "Need a sample? I'll grab my scoop.",
      "Fun fact: I live on top of our logo.",
      "Careful, I tickle. I'm a diode.",
    ];
    let k = 0;
    buddy.addEventListener("click", () => {
      buddy.classList.remove("hop"); void buddy.offsetWidth; buddy.classList.add("hop");
      if (say) { say.textContent = lines[k++ % lines.length]; say.parentElement.classList.remove("pop"); void say.offsetWidth; say.parentElement.classList.add("pop"); }
    });
  }
  // count the facts up once they scroll into view
  const counters = $$("[data-count]");
  if (counters.length && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      const el = en.target, end = +el.dataset.count, t0 = performance.now(), dur = 1100;
      const tick = t => { const p = Math.min(1, (t - t0) / dur); el.textContent = String(Math.round(end * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(tick); };
      el.textContent = "0"; requestAnimationFrame(tick);
    }), { threshold: 0.6 });
    counters.forEach(c => io.observe(c));
  }
  // looks and timeline cards wake up as they scroll into view
  const wake = $$(".eddy-page .look, .eddy-page .eddy-timeline li, .eddy-page .eddy-origin, .eddy-page .amy");
  if (wake.length && !reduce && "IntersectionObserver" in window) {
    wake.forEach(el => el.classList.add("sleepy"));
    const io2 = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add("awake"); io2.unobserve(en.target); } }), { threshold: 0.2 });
    wake.forEach(el => io2.observe(el));
  }
})();
