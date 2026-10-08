/* Solera i-Series family page: configure a modular solar lighting system (head, power, pack, optics, program, pole),
   see the live part number, compare the heads, get a recommendation from project details and check the pole.
   Facts come from the i-Series spec sheets, installation guides, the Pole Offering and the 2026 catalog (pp. 56/58). */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const h = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (n) => n.toLocaleString("en-US");

  const DOC = {
    specArea: "https://assets.led-llc.com/Solera-Website-Files/Spec-Sheets/I-Series-Area-Light-Spec-Sheet.pdf",
    specDeco: "https://assets.led-llc.com/Solera-Website-Files/Spec-Sheets/I-Series-Decorative-Light-Spec-Sheet.pdf",
    instA1og: "https://assets.led-llc.com/Solera-Website-Files/Instructions/SL-MA1-OG%20-%20%20I-Series%20Instructions%20V1.pdf",
    instA1hyb: "https://assets.led-llc.com/Solera-Website-Files/Instructions/SL-MA1-HYB%20-%20%20I-Series%20Instructions%20V1.pdf",
    instA2: "https://assets.led-llc.com/Solera-Website-Files/Instructions/SL-MA2-Installation.pdf",
    instD1: "https://assets.led-llc.com/Solera-Website-Files/Instructions/SL-MD1-Installation.pdf",
    iesA1: "https://assets.led-llc.com/Solera-Website-Files/IES-files/SAL-MA1-100L-ies.zip",
    iesA2: "https://assets.led-llc.com/Solera-Website-Files/IES-files/SL-MA2-IES.zip",
    poles: "https://assets.led-llc.com/Solera-Website-Files/Additional-Documents/Pole-Offering.pdf",
    layout: "https://solera-solar.com/lighting-layout-request/"
  };

  // glyphs for the switcher and compare headers
  const G = {
    a1: '<svg class="is-g" viewBox="0 0 48 48" aria-hidden="true"><path d="M8 30 L30 16 L40 22 L18 36 Z"/><path d="M18 36 L14 44"/><path d="M12 32 L24 24"/><path d="M30 16 L28 12"/></svg>',
    a2: '<svg class="is-g" viewBox="0 0 48 48" aria-hidden="true"><path d="M4 30 L30 13 L44 21 L18 38 Z"/><path d="M18 38 L13 46"/><path d="M9 33 L26 22"/><path d="M15 36 L32 25"/><path d="M30 13 L28 8"/></svg>',
    d1: '<svg class="is-g" viewBox="0 0 48 48" aria-hidden="true"><path d="M10 44 L10 20 C10 8 30 8 30 20"/><path d="M30 20 L30 26"/><path d="M18 36 L42 36 L34 26 L26 26 Z"/></svg>'
  };

  const HEADS = [
    { id: "a1", code: "A1", name: "A1 Standard", kind: "Modular Area Light", module: "AL-101", watts: 50, leds: 192, lm: 10000, lmCode: "100", epa: 8.0, tenon: "T2", tenonText: "2-3/8 in (T2)",
      weight: "99 lb assembly", packs: [600, 1200], hyb: true, optDef: 3, img: "hero-a1.jpg",
      tagline: "The everyday area light: up to 10,000 lumens from a 50 W head, on a 600 Wh or 1,200 Wh pack, off-grid or hybrid.",
      best: "Parking lots, streets, paths and campuses at 20 to 25 ft", fam: "Up to 10,000 lm · 50 W head",
      spec: DOC.specArea, ies: DOC.iesA1 },
    { id: "a2", code: "A2", name: "A2 High Output", kind: "Modular Area Light", module: "AL-200", watts: 100, leds: 384, lm: 15000, lmCode: "150", epa: 14.0, tenon: "T4", tenonText: "4 in (T4), or a 2-3/8 to 4 in adapter",
      weight: "124 lb assembly", packs: [1200], hyb: true, optDef: 3, img: "hero-a1.jpg",
      tagline: "Up to 15,000 lumens from a 100 W head with the 200 W panel and 1,200 Wh battery, for wide lots and taller poles.",
      best: "Wide lots, yards, roadways and intersections at 25 to 30 ft", fam: "Up to 15,000 lm · 100 W head",
      spec: DOC.specArea, ies: DOC.iesA2 },
    { id: "d1", code: "D1", name: "D1 Decorative", kind: "Modular Decorative Light", module: "AL-101 at 20 W", watts: 20, leds: 192, lm: 3000, lmCode: "030", epa: 9.0, tenon: "T2", tenonText: "2-3/8 in (T2)",
      weight: "111 lb assembly", packs: [600], hyb: false, optDef: 5, img: "deco",
      tagline: "A gooseneck arm and bell shade for parks, plazas and streetscapes, with up to 3,000 lumens and Type 5 optics.",
      best: "Parks, plazas, walkways and streetscapes that want a decorative look", fam: "Up to 3,000 lm · gooseneck",
      spec: DOC.specDeco, ies: null }
  ];
  const byId = Object.fromEntries(HEADS.map(v => [v.id, v]));
  const PACKS = {
    600: { code: "06", wh: 600, ah: 47, panels: "Two 55 W panels", short: "2 × 55 W", dims: "27.1 × 19.2 × 2.2 in each", sub: "Two 55 W panels, 600 Wh / 47 Ah battery" },
    1200: { code: "12", wh: 1200, ah: 94, panels: "One 200 W panel", short: "1 × 200 W", dims: "46 × 34 × 3 in, 52 lb", sub: "One 200 W panel, 1,200 Wh / 94 Ah battery" }
  };
  const OPTICS = {
    2: { name: "Type 2", best: "Paths, one-row parking and narrow streets: a long, narrow pattern along the way", rx: 250, ry: 46, cy: 72, py: 30 },
    3: { name: "Type 3", best: "Two-row lots, intersections and general area lighting: the standard optic", rx: 215, ry: 60, cy: 76, py: 24 },
    4: { name: "Type 4", best: "Perimeters and wide lots lit from the edge: light thrown forward, little behind the pole", rx: 195, ry: 72, cy: 82, py: 18 },
    5: { name: "Type 5", best: "Plazas, roundabouts and the middle of a lot: even light all around the pole", rx: 120, ry: 60, cy: 70, py: 70 }
  };
  const SHIELDS = { none: { name: "None", pn: "" }, back: { name: "Back light shield", pn: "SL-AL1-SHIELD-1" }, cutoff: { name: "Full cutoff shield", pn: "SL-AL1-SHIELD-2" } };
  const PROGRAMS = {
    default: { name: "Default", text: "80 % for 2 hours after dusk, then 20 % with 80 % on motion (1-minute dwell)." },
    motion: { name: "Motion sensing", text: "Low all night, full output when someone is there. Recommended for cold, cloudy or shaded sites." },
    night: { name: "All night", text: "Constant output all night. Suited to sunny sites; pair it with the 1,200 Wh pack." }
  };
  const CCT = { 3000: "#ffb55c", 4000: "#ffe3b0", 5000: "#eef3ff" };
  const WINDS = [80, 90, 100, 120];
  const FINISH = { DB: "Dark bronze", BK: "Black", GR: "Gray" };
  // Solera Pole Offering: the three square straight 7 GA poles it recommends for the i-Series modular family
  const POLES = [
    { h: 20, shaft: 5, ab: [26.4, 21.3, 17.2, 12.1], emb: [26.4, 21.3, 17.2, 12.1], total: 24 },
    { h: 25, shaft: 6, ab: [27.5, 22.3, 18.0, 12.6], emb: [27.5, 22.3, 18.0, 12.6], total: 30 },
    { h: 30, shaft: 6, ab: [17.9, 14.5, 11.7, 8.3], emb: [17.9, 11.7, 8.3, 8.3], total: 35 }
  ];
  const IMG = { "a1-600": "sys-a1-600.jpg", "a1-1200": "sys-a1-1200.jpg", "a2-1200": "sys-a2-1200.jpg", "d1-600": "sys-d1-600.jpg" };

  const state = { head: "a1", power: "og", pack: 600, optic: 3, shield: "none", cct: 4000, program: "default", pole: { h: 25, base: "ab", finish: "DB", wind: 90 } };

  const head = () => byId[state.head];
  const hybOk = (s = state) => byId[s.head].hyb && !(s.head === "a1" && s.pack === 1200);   // the A1 + 1,200 Wh system is off-grid only in the catalog
  function normalize() {
    const v = head();
    if (!v.packs.includes(state.pack)) state.pack = v.packs[0];
    if (!hybOk()) state.power = "og";
  }
  const pnOf = (s = state) => `SL-M${byId[s.head].code}-${s.power === "hyb" ? "HYB" : "OG"}-${byId[s.head].lmCode}${PACKS[s.pack].code}${s.optic}4DB1`;
  const poleOf = (p, v) => { const P = POLES.find(x => x.h === p.h); return { P, pn: `SL-RPSQ-${p.h}-${P.shaft}-7-${p.base === "ab" ? "AB" : "EMB"}-${v.tenon}-${p.finish}`, epa: P[p.base][WINDS.indexOf(p.wind)] }; };
  const sysImg = (s = state) => `assets/img/iseries/${IMG[`${s.head}-${s.pack}`] || IMG["a1-600"]}`;

  // ---------- switcher + family ----------
  function renderSwitcher() {
    $("#switcher-row").innerHTML = `<div class="sw-group" role="group" aria-label="Light heads">${HEADS.map(v => `<button class="sw-btn" data-go="${v.id}" aria-pressed="false">${G[v.id]}${h(v.name)}</button>`).join("")}</div>
      <span class="sw-divider" aria-hidden="true"></span><a class="sw-btn is-help" href="#finder-band">Help me choose</a>`;
  }
  function renderFamily() {
    $("#is-fam").innerHTML = HEADS.map(v => `<button data-go="${v.id}" data-scroll="1" aria-pressed="false"><span class="pic"><img src="${sysImg({ head: v.id, pack: v.packs[0] })}" alt="" loading="lazy"></span><span class="t"><span class="name">${h(v.name)}</span><span class="sub">${h(v.fam)}</span></span></button>`).join("");
  }

  // ---------- product ----------
  function renderProduct(animate) {
    normalize();
    const v = head();
    document.querySelectorAll("[data-go]").forEach(b => b.hasAttribute("aria-pressed") && b.setAttribute("aria-pressed", String(b.dataset.go === v.id)));
    const i = HEADS.indexOf(v), prev = HEADS[(i + HEADS.length - 1) % HEADS.length], next = HEADS[(i + 1) % HEADS.length];
    const shot = v.img === "deco" ? "assets/img/cat/i-series/hero-sl-md1.jpg" : `assets/img/iseries/${v.img}`;
    $("#product-head").innerHTML = `
      <div class="ph-text">
        <div class="tag"><span class="chip">${h(v.kind)}</span><span class="chip">${v.hyb ? "Off-grid or Hybrid" : "Off-grid"}</span></div>
        <h2>${h(v.name)}</h2>
        <p class="tagline">${h(v.tagline)}</p>
        <div class="step-nav">
          <button class="round" data-go="${prev.id}" aria-label="Previous: ${h(prev.name)}">‹</button>
          <button class="round" data-go="${next.id}" aria-label="Next: ${h(next.name)}">›</button>
        </div>
      </div>
      <figure class="shot is-shot"><img src="${shot}" alt="${h(v.name)} installed" style="object-position:center top;object-fit:cover"></figure>`;
    renderScene();
    renderControls();
    renderReadout();
    renderDetails();
    renderCompareHighlight();
    renderPoles();
    if (animate) { ["#product-head", "#details"].forEach(s => { const el = $(s); el.classList.remove("fade"); void el.offsetWidth; el.classList.add("fade"); }); }
  }

  function renderScene() {
    const v = head(), o = OPTICS[state.optic], c = CCT[state.cct], p = state.pole;
    const sc = $("#scene");
    const img = sysImg();
    if (!sc.dataset.img) {
      sc.innerHTML = `
        <div class="is-photo">
          <img id="sys-img" src="${img}" alt="">
          <div class="is-chips" id="sys-chips"></div>
          <div class="is-gauge" aria-label="Mounting height"><div class="bar" id="gauge-bar"></div><div class="ticks" id="gauge-ticks"></div></div>
        </div>
        <div class="is-ground">
          <svg viewBox="0 0 600 136" role="img" aria-label="Plan view of the light pattern on the ground">
            <line class="road" x1="0" y1="20" x2="600" y2="20"/><line class="road" x1="0" y1="122" x2="600" y2="122"/>
            <ellipse id="fp3" cx="300" cy="80" rx="100" ry="40" fill-opacity="0.16"/>
            <ellipse id="fp2" cx="300" cy="80" rx="70" ry="28" fill-opacity="0.22"/>
            <ellipse id="fp1" cx="300" cy="80" rx="40" ry="16" fill-opacity="0.5"/>
            <circle class="pole" id="fp-pole" cx="300" cy="30" r="4"/>
          </svg>
        </div>
        <div class="is-cap" id="sys-cap"></div>`;
      sc.dataset.img = img;
    } else if (sc.dataset.img !== img) {
      const el = $("#sys-img");
      el.classList.add("swap");
      setTimeout(() => { el.src = img; el.onload = () => el.classList.remove("swap"); }, 160);
      sc.dataset.img = img;
    }
    $("#sys-img").alt = `${v.name} with ${PACKS[state.pack].panels.toLowerCase()} and a ${fmt(PACKS[state.pack].wh)} Wh battery`;
    $("#sys-chips").innerHTML = `<span class="${state.power}"><i class="d"></i>${state.power === "hyb" ? "Hybrid: AC backup" : "Off-grid"}</span><span><i class="d"></i>${PACKS[state.pack].short} · ${fmt(PACKS[state.pack].wh)} Wh</span><span><i class="d"></i>4G Solera Connect</span>`;
    $("#gauge-bar").style.setProperty("--p", { 20: 0.6, 25: 0.8, 30: 1 }[p.h]);
    $("#gauge-ticks").innerHTML = [30, 25, 20].map(ft => `<span class="${ft === p.h ? "on" : ""}" style="top:${(1 - { 20: 0.6, 25: 0.8, 30: 1 }[ft]) * 100}%">${ft} ft</span>`).join("");
    // footprint: three rings at 1, 0.5 and 0.1 fc, shaped by the optic, colored by the color temperature
    const set = (id, k) => { const e = $(id); e.setAttribute("cx", 300); e.setAttribute("cy", o.cy); e.setAttribute("rx", o.rx * k); e.setAttribute("ry", o.ry * k); e.setAttribute("fill", c); };
    set("#fp3", 1); set("#fp2", 0.7); set("#fp1", 0.42);
    $("#fp-pole").setAttribute("cy", o.py);
    $("#sys-cap").innerHTML = `<div><b>${o.name}</b> at ${p.h} ft, ${fmt(state.cct)}K preview</div><div class="lg">Illustrative footprint<span><i style="--c:${c}"></i>1 fc</span><span><i style="--c:${c};opacity:.55"></i>0.5 fc</span><span><i style="--c:${c};opacity:.3"></i>0.1 fc</span></div>`;
  }

  function renderReadout() {
    const v = head(), pk = PACKS[state.pack], pole = poleOf(state.pole, v), ok = pole.epa >= v.epa;
    $("#readout").innerHTML = `
      <span class="pnwrap"><span class="pn" id="pn">${pnOf()}</span><button class="copy" data-copy="${pnOf()}" aria-label="Copy the part number">Copy</button></span>
      <span>Light <b>up to ${fmt(v.lm)} lm</b></span>
      <span>Pack <b>${pk.short} · ${fmt(pk.wh)} Wh</b></span>
      <span>EPA <b>${v.epa.toFixed(1)}</b></span>
      <span>Pole <b class="pn" style="font-size:.875rem">${pole.pn}</b> <span class="${ok ? "ok" : "bad"}">${ok ? "✓" : "✗"} ${pole.epa.toFixed(1)} EPA at ${state.pole.wind} mph</span></span>`;
    // phones: the photo and footprint scroll away and this slim bar stays pinned above the controls instead
    $("#stage-bar").innerHTML = `<img src="${sysImg()}" alt=""><div><b class="pn">${pnOf()}</b><span>${h(v.name)} · ${fmt(v.lm)} lm · ${pk.short} · ${fmt(pk.wh)} Wh · EPA ${v.epa.toFixed(1)}</span><span class="${ok ? "ok" : "bad"}">${ok ? "✓" : "✗"} ${state.pole.h} ft pole · max EPA ${pole.epa.toFixed(1)} at ${state.pole.wind} mph</span></div>`;
  }

  // ---------- controls ----------
  const seg = (key, opts, cur, label, cls = "") => `<div class="seg ${cls}" role="group" aria-label="${h(label)}">${opts.map(o => `<button data-set="${key}" data-v="${o.v}" aria-pressed="${String(o.v) === String(cur)}"${o.off ? " disabled" : ""}>${o.t}${o.s ? `<small>${o.s}</small>` : ""}</button>`).join("")}</div>`;
  function renderControls() {
    const v = head(), o = OPTICS[state.optic], pole = poleOf(state.pole, v), ok = pole.epa >= v.epa;
    const packOpts = v.packs.map(w => `<button class="opt" data-set="pack" data-v="${w}" aria-pressed="${state.pack === w}"><span class="dot"></span><span><strong>${fmt(w)} Wh pack</strong><span>${PACKS[w].sub}${w === 1200 && v.id === "a1" ? ". Long nights, cloudy sites or an all-night program; off-grid only" : ""}</span></span></button>`).join("");
    const powerNote = !v.hyb ? `<p class="note plain">The decorative system is off-grid only.</p>`
      : !hybOk() ? `<p class="note plain">The A1 head with the 1,200 Wh pack is offered off-grid.</p>`
      : state.power === "hyb" ? `<p class="note plain">Hybrid adds an AC driver that runs the LED when the battery is low (100 to 277 VAC). It does not charge the battery or power the 4G module.</p>`
      : `<p class="note plain">No wiring, no trenching. Choose Hybrid where power already reaches the pole and the site must never go dark.</p>`;
    $("#controls").innerHTML = `
      <div class="ctl ctl-full"><span class="lbl">1 · Light head</span>
        ${seg("head", HEADS.map(x => ({ v: x.id, t: h(x.name), s: h(x.fam) })), state.head, "Light head", "is-heads")}
        <p class="hint">${h(v.best)}.</p>
      </div>
      <div class="ctl-grid">
        <div class="ctl"><span class="lbl">2 · Power</span>
          ${seg("power", [{ v: "og", t: "Off-grid" }, { v: "hyb", t: "Hybrid", off: !hybOk() }], state.power, "Power scheme")}
          ${powerNote}
        </div>
        <div class="ctl"><span class="lbl">3 · Solar + battery</span><div class="is-pack">${packOpts}</div>
          ${v.packs.length === 1 ? `<p class="note plain">${v.id === "a2" ? "The high-output head ships with the 200 W panel and 1,200 Wh battery." : "The decorative system ships with two 55 W panels and the 600 Wh battery."}</p>` : ""}
        </div>
        <div class="ctl"><span class="lbl">4 · Optics</span>
          ${seg("optic", [2, 3, 4, 5].map(n => ({ v: n, t: OPTICS[n].name })), state.optic, "Optic")}
          <p class="hint">${h(o.best)}.${state.optic === v.optDef ? " Standard on this head." : ""}</p>
          <span class="lbl" style="margin-top:14px">Shield</span>
          ${seg("shield", Object.entries(SHIELDS).map(([k, s]) => ({ v: k, t: s.name })), state.shield, "Shield")}
          ${state.shield !== "none" ? `<p class="note plain">Add ${SHIELDS[state.shield].pn} to the order.</p>` : ""}
        </div>
        <div class="ctl"><span class="lbl">5 · Light on site</span>
          ${seg("cct", [3000, 4000, 5000].map(k => ({ v: k, t: `${fmt(k)}K` })), state.cct, "Color temperature")}
          <div class="cct"><i style="--c:${CCT[state.cct]}"></i><span>Every head carries all three; a switch picks it at installation. CRI 70+.</span></div>
          <span class="lbl" style="margin-top:14px">Program</span>
          ${seg("program", Object.entries(PROGRAMS).map(([k, p]) => ({ v: k, t: p.name })), state.program, "Program")}
          <p class="hint">${h(PROGRAMS[state.program].text)} Changed any time from Solera Connect.</p>
        </div>
        <div class="ctl ctl-full"><span class="lbl">6 · Pole</span>
          <div class="ctl-grid">
            <div>${seg("pole.h", [20, 25, 30].map(n => ({ v: n, t: `${n} ft` })), state.pole.h, "Mounting height")}
              <p class="hint">${state.pole.h} ft square straight steel, ${pole.P.shaft}.0 in shaft, 7 GA${state.pole.base === "emb" ? `; ${pole.P.total} ft overall, set 4 to 5 ft deep` : "; 1 × 40 in anchor bolts"}.</p></div>
            <div>${seg("pole.base", [{ v: "ab", t: "Anchor base" }, { v: "emb", t: "Direct burial" }], state.pole.base, "Base")}</div>
            <div>${seg("pole.finish", Object.entries(FINISH).map(([k, n]) => ({ v: k, t: n })), state.pole.finish, "Finish")}</div>
            <div>${seg("pole.wind", WINDS.map(w => ({ v: w, t: `${w} mph` })), state.pole.wind, "Wind rating")}
              <p class="note ${ok ? "ok" : "bad"}">${ok ? `Carries the ${h(v.name)} (EPA ${v.epa.toFixed(1)}) at ${state.pole.wind} mph: max EPA ${pole.epa.toFixed(1)}.` : `Not rated for the ${h(v.name)} (EPA ${v.epa.toFixed(1)}) at ${state.pole.wind} mph: max EPA ${pole.epa.toFixed(1)}. Try a lower height or wind rating, or ask Solera about a pole for this site.`}</p></div>
          </div>
          <p class="hint">Tenon ${h(v.tenonText)}, built into the pole part number${v.tenon === "T4" ? ". Standard Solera poles top out at 2.38 in, so order the T4 tenon or the adapter" : ""}. Poles are made to order and are not returnable.</p>
        </div>
      </div>`;
  }

  // ---------- details ----------
  function renderDetails() {
    const v = head(), pk = PACKS[state.pack], pole = poleOf(state.pole, v);
    const inst = v.id === "a1" ? (state.power === "hyb" ? DOC.instA1hyb : DOC.instA1og) : v.id === "a2" ? DOC.instA2 : DOC.instD1;
    const pnParts = [["SL-M", "Solera modular"], [v.code, v.name.split(" ")[0] + " head"], [state.power === "hyb" ? "HYB" : "OG", state.power === "hyb" ? "Hybrid" : "Off-grid"], [v.lmCode, `${fmt(v.lm)} lm`], [pk.code, `${fmt(pk.wh)} Wh`], [String(state.optic), OPTICS[state.optic].name], ["4", "4G Connect"], ["DB", "Dark bronze"], ["1", "Generation 1"]];
    $("#details").innerHTML = `
      <div>
        <div class="section-head"><h3>Your system</h3><p class="muted">What the configuration above orders, piece by piece.</p></div>
        <div class="is-sum">
          <article><span class="k">Fixture</span><span class="v">${h(v.name)}</span><span class="pn">${pnOf()}</span><span class="s">${h(v.module)}, ${v.leds} LEDs, up to ${fmt(v.lm)} lm, ${fmt(state.cct)}K set on site</span></article>
          <article><span class="k">Solar + battery</span><span class="v">${pk.panels}</span><span class="s">${pk.dims}</span><span class="s">${fmt(pk.wh)} Wh / ${pk.ah} Ah LiFePO4, MPPT controller, replaceable</span></article>
          <article><span class="k">Power + program</span><span class="v">${state.power === "hyb" ? "Hybrid" : "Off-grid"}</span><span class="s">${h(PROGRAMS[state.program].name)} program${state.power === "hyb" ? "; AC driver for the LED when the battery is low" : ""}</span></article>
          <article><span class="k">Optics</span><span class="v">${OPTICS[state.optic].name}${state.shield !== "none" ? ` + ${SHIELDS[state.shield].name.toLowerCase()}` : ""}</span>${state.shield !== "none" ? `<span class="pn">${SHIELDS[state.shield].pn}</span>` : `<span class="s">Lens set SL-AL1-LENS-T${state.optic}</span>`}<span class="s">EPA ${v.epa.toFixed(1)}, ${h(v.weight)}</span></article>
          <article><span class="k">Pole</span><span class="v">${state.pole.h} ft ${state.pole.base === "ab" ? "anchor base" : "direct burial"}</span><span class="pn">${pole.pn}</span><span class="s">${FINISH[state.pole.finish]}, ${h(v.tenon)} tenon, max EPA ${pole.epa.toFixed(1)} at ${state.pole.wind} mph</span></article>
        </div>
      </div>
      <div class="is-two">
        <div>
          <div class="section-head"><h3>How to read the part number</h3><p class="muted">Each block of the number is one choice above.</p></div>
          <div class="is-pn">${pnParts.map(([b, s], i) => `<span class="${[1, 2, 3, 4, 5].includes(i) ? "live" : ""}"><b>${h(b)}</b><small>${h(s)}</small></span>`).join("")}</div>
          <p class="footnotes" style="margin-top:12px">The 2026 Solera catalog adds -TAA for Trade Agreements Act compliant builds. Ask your rep.</p>
        </div>
        <div>
          <div class="section-head"><h3>Documents for this system</h3></div>
          <div class="is-reslinks">
            <a class="doc-dl" href="${v.spec}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><span>${v.id === "d1" ? "i-Series Decorative Light spec sheet" : "i-Series Area Light spec sheet"}</span></a>
            <a class="doc-dl" href="${inst}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><span>Installation guide: SL-M${v.code}${v.id === "a1" ? (state.power === "hyb" ? "-HYB" : "-OG") : ""}</span></a>
            ${v.ies ? `<a class="doc-dl" href="${v.ies}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><span>IES files: SL-M${v.code}</span><small>ZIP</small></a>` : ""}
            <a class="doc-dl" href="${DOC.poles}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><span>Pole Offering</span></a>
            <a class="btn btn-primary" href="${DOC.layout}" target="_blank" rel="noopener">Request a free lighting layout</a>
          </div>
        </div>
      </div>`;
  }

  // ---------- compare ----------
  const CMP = [
    ["Light output", v => `Up to ${fmt(v.lm)} lm`],
    ["Head", v => v.id === "d1" ? "AL-101 run at 20 W · gooseneck arm and bell shade" : `${v.module} · ${v.watts} W · ${v.leds} LEDs`],
    ["Solar + battery", v => v.packs.map(w => `${PACKS[w].short} + ${fmt(w)} Wh`).join(" · or ")],
    ["Power", v => v.hyb ? "Off-grid or Hybrid" : "Off-grid"],
    ["Optics", v => v.id === "d1" ? "Type 5 standard" : "Type 2, 3 (standard), 4 or 5 · back light or full cutoff shield"],
    ["Color", () => "3000, 4000 or 5000K by switch · CRI 70+"],
    ["EPA", v => v.epa.toFixed(1)],
    ["Tenon", v => v.tenonText],
    ["Weight", v => v.weight],
    ["Best for", v => v.best],
    ["Part numbers", v => v.id === "a1" ? "SL-MA1-OG-10006X4DB1 · SL-MA1-HYB-10006X4DB1 · SL-MA1-OG-10012X4DB1" : v.id === "a2" ? "SL-MA2-OG-15012X4DB1 · SL-MA2-HYB-15012X4DB1" : "SL-MD1-OG-03006X4DB1"]
  ];
  function renderCompare() {
    const headRow = `<tr><th scope="col"><span class="visually-hidden">Spec</span></th>${HEADS.map(v => `<th scope="col" data-col="${v.id}"><button class="colbtn" data-go="${v.id}" data-scroll="1">${G[v.id]}<span class="grp">${h(v.kind)}</span><strong>${h(v.name)}</strong></button></th>`).join("")}</tr>`;
    const body = CMP.map(([lab, f]) => `<tr><th scope="row">${lab}</th>${HEADS.map(v => `<td data-col="${v.id}"${lab === "Part numbers" ? ' class="pnlist"' : ""}>${h(f(v)).split(" · ").join("<br>")}</td>`).join("")}</tr>`).join("");
    $("#cmp").innerHTML = `<thead>${headRow}</thead><tbody>${body}</tbody>`;
    $("#cmp-cards").innerHTML = HEADS.map(v => `<details class="cmp-card" data-col="${v.id}"${v.id === state.head ? " open" : ""}>
        <summary>${G[v.id]}<span class="t"><span class="grp">${h(v.kind)}</span><strong>${h(v.name)}</strong></span><span class="chev" aria-hidden="true">›</span></summary>
        <dl>${CMP.map(([lab, f]) => `<div><dt>${lab}</dt><dd>${h(f(v)).split(" · ").join("<br>")}</dd></div>`).join("")}</dl>
        <button class="btn btn-ghost btn-sm" data-go="${v.id}" data-scroll="1">Open ${h(v.name)}</button>
      </details>`).join("");
  }
  function renderCompareHighlight() {
    document.querySelectorAll("#cmp [data-col]").forEach(c => c.classList.toggle("cur", c.dataset.col === state.head));
    document.querySelectorAll("#cmp-cards [data-col]").forEach(c => { const cur = c.dataset.col === state.head; c.classList.toggle("cur", cur); c.open = cur; });
  }

  // ---------- poles ----------
  function renderPoles() {
    const v = head(), cur = poleOf(state.pole, v);
    const rows = POLES.flatMap(P => ["ab", "emb"].map(base => {
      const pn = `SL-RPSQ-${P.h}-${P.shaft}-7-${base === "ab" ? "AB" : "EMB"}-${v.tenon}-${state.pole.finish}`;
      const isCur = pn === cur.pn;
      return `<tr class="${isCur ? "cur" : ""}"><th scope="row">${P.h} ft${base === "emb" ? `<br><span class="muted" style="font-weight:400;font-size:.8125rem">${P.total} ft overall</span>` : ""}</th><td>${base === "ab" ? "Anchor base" : "Direct burial"}</td><td>${P.shaft}.0 in · 7 GA</td>${P[base].map((e, i) => `<td class="${e >= v.epa ? "y" : "n"}${WINDS[i] === state.pole.wind ? " w" : ""}">${e >= v.epa ? "✓" : "✗"} ${e.toFixed(1)}</td>`).join("")}<td class="pn">${pn}</td></tr>`;
    })).join("");
    $("#pole-table").innerHTML = `<thead><tr><th scope="col">Pole</th><th scope="col">Base</th><th scope="col">Shaft</th>${WINDS.map(w => `<th scope="col" class="${w === state.pole.wind ? "w" : ""}">${w} mph</th>`).join("")}<th scope="col">Part number</th></tr></thead><tbody>${rows}</tbody>`;
    $("#pole-h").textContent = `Poles rated for the ${v.name} (EPA ${v.epa.toFixed(1)})`;
  }

  // ---------- finder ----------
  const finder = { app: null, size: null, h: null, look: null, grid: null, sky: null, run: null, wind: null };
  const Q = [
    ["app", "What are you lighting?", [["lot", "Parking lot", "Cars and people, rows and drive aisles"], ["street", "Street or roadway", "A line of poles along the way"], ["path", "Path, trail or park", "Walkers, benches, playgrounds"], ["plaza", "Campus, plaza or streetscape", "Gathering space, often with a decorative look"], ["yard", "Perimeter or storage yard", "Fence lines, laydown areas, lit from the edge"], ["remote", "Remote site", "Trailheads, bus stops, pump stations, nowhere near power"]]],
    ["size", "How much ground does each pole cover?", [["one", "One row or a path", "Pole spacing along a line"], ["two", "A two-row lot or an intersection", "Light both ways from the pole"], ["wide", "A wide lot or yard", "As much ground as possible per pole"]]],
    ["h", "Mounting height", [["20", "About 20 ft", "Paths, small lots, decorative poles"], ["25", "About 25 ft", "Most parking lots and streets"], ["30", "About 30 ft", "Wide lots, roadways and yards"]]],
    ["look", "The look", [["area", "Area light", "A clean shoebox head on an arm"], ["deco", "Decorative", "A gooseneck arm with a bell shade"]]],
    ["grid", "Power at the pole", [["none", "None, or not worth trenching", "Fully off-grid"], ["grid", "Yes, and it must never go dark", "Hybrid: AC backs up the battery"]]],
    ["sky", "The sky at the site", [["sunny", "Sunny most of the year", "Southwest, Texas, Florida, California"], ["mixed", "Four seasons", "Midwest, Mid-Atlantic, much of the country"], ["cloudy", "Cloudy, snowy or shaded", "Northern states, mountains, trees or buildings nearby"]]],
    ["run", "How it should run", [["motion", "Dim between visitors, bright on motion", "The most battery-friendly program"], ["night", "Constant all night", "Full light without motion"]]],
    ["wind", "Wind at the site", [["normal", "Ordinary", "Rated to 90 mph"], ["high", "Coastal or open plains", "Rated to 100 mph or more"]]]
  ];
  function recommend(f) {
    const deco = f.look === "deco";
    const hgt = Number(f.h || 25);
    const headId = deco ? "d1" : (f.size === "wide" || hgt === 30 || (f.run === "night" && hgt === 25) || f.app === "yard") ? "a2" : "a1";
    const v = byId[headId];
    const pack = headId === "a2" ? 1200 : headId === "d1" ? 600 : (f.sky === "cloudy" || f.run === "night") ? 1200 : 600;
    const power = f.grid === "grid" && hybOk({ head: headId, pack }) ? "hyb" : "og";
    const optic = deco ? 5 : (f.app === "path" || f.app === "street" || f.size === "one") ? 2 : f.app === "yard" ? 4 : f.app === "plaza" ? 5 : f.size === "wide" ? 4 : 3;
    const shield = !deco && f.app === "yard" ? "back" : "none";
    const program = f.run === "night" ? "night" : f.sky === "cloudy" ? "motion" : "default";
    const wind = f.wind === "high" ? 100 : 90;
    const pole = { h: deco && hgt === 30 ? 25 : hgt, base: "ab", finish: state.pole.finish, wind };
    const p = poleOf(pole, v);
    const reasons = [];
    reasons.push(deco ? "A decorative look calls for the D1 gooseneck and bell shade, which comes as one off-grid system with Type 5 optics."
      : headId === "a2" ? `${f.size === "wide" || f.app === "yard" ? "Wide ground per pole" : hgt === 30 ? "A 30 ft pole" : "Constant light at 25 ft"} wants the high-output head: up to 15,000 lumens on the 200 W panel and 1,200 Wh battery.`
      : "The standard head covers it: up to 10,000 lumens, the most economical i-Series system.");
    if (headId === "a1") reasons.push(pack === 1200 ? `${f.sky === "cloudy" ? "Less sun" : "An all-night program"} means more battery: the 200 W panel and 1,200 Wh pack carry it.` : "Two 55 W panels and the 600 Wh battery recharge in about six hours of sun and run about 30 hours.");
    reasons.push(power === "hyb" ? "Power is already at the pole, so Hybrid adds an AC driver that keeps the LED on if the battery ever runs down." : f.grid === "grid" ? "This system is offered off-grid; on a sunny site with the motion program it carries itself, and Solera Connect alerts you if it ever runs low." : "No trenching or wiring: set the pole, bolt on the pieces, aim the panel south.");
    reasons.push(`${OPTICS[optic].name}: ${OPTICS[optic].best.split(":")[0].toLowerCase()}.${shield === "back" ? " The back light shield keeps light off the neighbor's side of the fence." : ""}`);
    reasons.push(program === "motion" ? "Motion sensing stretches the battery through cloudy stretches and cold nights, when the battery charges less." : program === "night" ? "All night at constant output; Solera recommends it for sunny sites." : "The default program runs at 80 % for two hours after dusk, then dims to 20 % and brightens to 80 % on motion.");
    const warn = p.epa >= v.epa ? "" : `The ${pole.h} ft pole is rated for EPA ${p.epa.toFixed(1)} at ${wind} mph, below this fixture's ${v.epa.toFixed(1)}. Ask Solera about a pole for this wind zone, or review the height.`;
    return { headId, pack, power, optic, shield, program, pole, reasons, warn, p };
  }
  function renderFinder() {
    const opt = (key, val, title, sub) => `<button class="opt" data-f="${key}" data-v="${val}" aria-pressed="${finder[key] === val}"><span class="dot"></span><span><strong>${h(title)}</strong><span>${h(sub)}</span></span></button>`;
    const answered = Object.values(finder).filter(Boolean).length;
    let result = `<p class="is-empty">${answered ? `Answered ${answered} of ${Q.length}. The recommendation appears after the first four.` : "Start with what you are lighting."}</p>`;
    if (finder.app && finder.size && finder.h && finder.look) {
      const r = recommend(finder), v = byId[r.headId], s = { head: r.headId, power: r.power, pack: r.pack, optic: r.optic };
      result = `<div class="is-result" id="fd-result">
        <div class="pic"><img src="${sysImg(s)}" alt="${h(v.name)} system"></div>
        <div>
          <div class="k">Our recommendation${answered < Q.length ? ` · based on ${answered} of ${Q.length} answers` : ""}</div>
          <h3>${h(v.name)}, ${r.power === "hyb" ? "Hybrid" : "off-grid"}, ${fmt(r.pack)} Wh pack, ${OPTICS[r.optic].name}</h3>
          <div class="pnl">${pnOf(s)}${r.shield !== "none" ? ` + ${SHIELDS[r.shield].pn}` : ""}<small>Fixture</small></div>
          <div class="pnl">${r.p.pn}<small>${r.pole.h} ft anchor-base pole, max EPA ${r.p.epa.toFixed(1)} at ${r.pole.wind} mph</small></div>
          <ul class="is-reasons">${r.reasons.map(x => `<li>${h(x)}</li>`).join("")}</ul>
          ${r.warn ? `<p class="warn">${h(r.warn)}</p>` : ""}
          <div class="acts"><button class="btn btn-primary" data-load="1">Load it in the configurator</button><a class="btn btn-ghost" href="${DOC.layout}" target="_blank" rel="noopener">Request a free lighting layout</a></div>
        </div>
      </div>`;
    }
    $("#finder").innerHTML = Q.map(([key, title, opts], i) => `<div class="q"><h3>${i + 1}. ${h(title)}</h3><div class="opts${opts.length > 3 ? " row" : ""}">${opts.map(([v, t, s]) => opt(key, v, t, s)).join("")}</div></div>`).join("") + result;
  }
  function loadRecommendation() {
    const r = recommend(finder);
    Object.assign(state, { head: r.headId, power: r.power, pack: r.pack, optic: r.optic, shield: r.shield, program: r.program });
    Object.assign(state.pole, { h: r.pole.h, wind: r.pole.wind, base: "ab" });
    go(r.headId, true);
  }

  // ---------- navigation ----------
  // Switching heads: if the configurator stage is on screen it stays exactly where it is; at the compare table the page
  // holds still and the new column lights up; from anywhere else the page goes to the configurator (same as the LBI page).
  function go(id, open) {
    if (!byId[id]) return;
    const stage = $(".stage"), before = stage.getBoundingClientRect(), cmp = $("#compare"), cmpBefore = cmp && cmp.getBoundingClientRect();
    const topEdge = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0);
    const seen = (r) => Math.min(r.bottom, innerHeight) - Math.max(r.top, topEdge);
    const inConfigurator = seen(before) > 120;
    const inCompare = !inConfigurator && !open && cmpBefore && seen(cmpBefore) > 160;
    const from = state.head;
    state.head = id;
    if ((from === "d1") !== (id === "d1")) state.optic = byId[id].optDef;   // area and decorative heads have different standard optics
    renderProduct(true);
    try { history.replaceState(null, "", `#${id}`); } catch (e) { /* sandboxed */ }
    if (inConfigurator) {
      const after = stage.getBoundingClientRect();
      let target = before.top;
      if (target < topEdge && target + after.height < innerHeight) target = Math.min(topEdge, innerHeight - after.height);
      const d = after.top - target;
      if (Math.abs(d) > 0.5) window.scrollBy({ top: d, left: 0, behavior: "instant" });
    } else if (inCompare) {
      const d = cmp.getBoundingClientRect().top - cmpBefore.top;
      if (Math.abs(d) > 0.5) window.scrollBy({ top: d, left: 0, behavior: "instant" });
    } else {
      $("#product").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  }

  // Scroll catch on laptops, as on the LBI Family Overview: scrolling down with a mouse or trackpad stops the page for a
  // moment with the configurator framed under the switcher. The page locks scrolling (html.scroll-hold) once the stage
  // reaches its spot, until that gesture (momentum included) ends: at least 0.9 s, at most 2.5 s. Scrolling up lets go.
  (() => {
    const root = document.documentElement;
    let armed = true, holding = false, held = 0, lastWheel = -1e9, prevGap = null, timer = 0;
    const edge = () => parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    const gap = () => $(".stage").getBoundingClientRect().top - edge();
    // the controls column is long here, so the test is whether the sticky scene (photo, footprint, readout) fits the window
    const fits = () => matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)").matches && $(".stage-view").offsetHeight + edge() + 8 <= innerHeight;
    const release = () => { holding = false; clearInterval(timer); root.classList.remove("scroll-hold"); };
    addEventListener("wheel", (e) => { lastWheel = performance.now(); if (holding && e.deltaY < 0) release(); }, { passive: true });
    addEventListener("scroll", () => {
      const g = gap(), was = prevGap;
      prevGap = g;
      if (holding) return;
      if (g > 2) { armed = true; return; }
      if (!armed || was === null || was <= 0 || performance.now() - lastWheel > 250 || !fits()) return;
      armed = false; holding = true; held = performance.now();
      root.classList.add("scroll-hold");
      if (g < -0.5) window.scrollBy({ top: g, left: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      timer = setInterval(() => {
        const now = performance.now();
        if ((now - held > 900 && now - lastWheel > 250) || now - held > 2500) release();
      }, 50);
    }, { passive: true });
  })();

  // The stage holds its place while a control changes it: controls to the right can get taller or shorter.
  function rerender() {
    const stage = $(".stage"), top = stage.getBoundingClientRect().top;
    renderProduct(false);
    const d = stage.getBoundingClientRect().top - top;
    if (Math.abs(d) > 0.5) window.scrollBy({ top: d, left: 0, behavior: "instant" });
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a");
    if (!t) return;
    if (t.dataset.go) { go(t.dataset.go, !!t.closest("#cmp-cards") || !!t.closest("#is-fam")); return; }
    if (t.dataset.set) {
      const key = t.dataset.set, raw = t.dataset.v, val = /^\d+$/.test(raw) ? Number(raw) : raw;
      if (key === "head") { go(raw); return; }
      if (key.startsWith("pole.")) state.pole[key.slice(5)] = val; else state[key] = val;
      rerender();
      return;
    }
    if (t.dataset.f) {
      finder[t.dataset.f] = finder[t.dataset.f] === t.dataset.v ? null : t.dataset.v;
      const band = $("#finder-band"), top = band.getBoundingClientRect().top;
      renderFinder();
      const d = band.getBoundingClientRect().top - top;
      if (Math.abs(d) > 0.5) window.scrollBy({ top: d, left: 0, behavior: "instant" });
      return;
    }
    if (t.dataset.load) { loadRecommendation(); return; }
    if (t.dataset.copy) {
      const txt = t.dataset.copy, done = () => { const was = t.textContent; t.textContent = "Copied"; setTimeout(() => { t.textContent = was; }, 1400); };
      try { navigator.clipboard.writeText(txt).then(done, () => selectText(t.previousElementSibling)); } catch (err) { selectText(t.previousElementSibling); }
    }
  });
  function selectText(el) { if (!el) return; const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }

  // ---------- boot ----------
  renderSwitcher();
  renderFamily();
  renderCompare();
  renderFinder();
  const fromHash = (location.hash || "").slice(1);
  if (byId[fromHash]) { state.head = fromHash; state.optic = byId[fromHash].optDef; }
  renderProduct(false);
  window.addEventListener("hashchange", () => { const id = location.hash.slice(1); if (byId[id] && id !== state.head) go(id); });
})();
