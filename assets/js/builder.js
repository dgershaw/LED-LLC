/* LBI Project Builder: the page. Areas are edited with list pickers or read from plain English (builder-engine.js),
   the list is shown live, and it downloads as a PDF or an Excel file made right here in the browser (no server, no library).
   The project is kept in this browser (localStorage) and can be shared as a link (#p=...). */
(() => {
  "use strict";
  const E = window.LBIPB;
  if (!E) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const h = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = E.fmt;
  const KEY = "lbi-project-builder-v1";
  const EMAIL = "sales@led-llc.com";

  const EXAMPLES = [
    "For example, in my project I have quantity 20 of 2 x 4 troffer fixtures in the ceiling. In each fixture, I am replacing three T8 fluorescent lamps. I want a Mesh Bluetooth control to control the whole space.",
    "The lobby has a 100 ft cove of 4 ft fluorescent strips, 277V, on a 0-10V dimmer, 3000K. The warehouse has 40 8 ft strips with two F96 lamps each, occupancy sensors, and emergency battery backup on 6 of them.",
    "Parking garage: 60 new LBI 65 fixtures, 4 ft, linked together about 3 ft apart, 277V, with PIR occupancy sensors. Plus 12 vapor tights in the wash bay with two T8 lamps each.",
    "The dining room has a 16 x 12 tray ceiling with fluorescent strips in the cove, 3000K, on a 0-10V dimmer. The two meeting rooms each have a 12 x 12 tray ceiling with Bluetooth mesh."
  ];

  // ------------------------------------------------------------------ state
  const state = { mode: "list", areas: [], open: null, project: { name: "", person: "", company: "", email: "", phone: "", zip: "" }, text: "", undo: null };

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ areas: state.areas, project: state.project, text: state.text, mode: state.mode })); } catch (e) { /* private mode */ }
  }
  function restore() {
    const m = location.hash.match(/#p=([A-Za-z0-9_-]+)/);
    if (m) {
      try {
        const d = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, "+").replace(/_/g, "/")))));
        state.areas = (d.a || []).map(x => E.newArea(x));
        Object.assign(state.project, d.p || {});
        return true;
      } catch (e) { /* bad link: start fresh */ }
    }
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || "null");
      if (d && Array.isArray(d.areas) && d.areas.length) {
        state.areas = d.areas.map(x => E.newArea(x));
        Object.assign(state.project, d.project || {});
        state.text = d.text || ""; state.mode = d.mode === "words" ? "words" : "list";
        return true;
      }
    } catch (e) { /* storage blocked */ }
    return false;
  }
  function shareLink() {
    const base = E.newArea({});
    const slim = state.areas.map(a => {
      const o = {};
      for (const k of Object.keys(a)) if (k !== "id" && !k.startsWith("_") && JSON.stringify(a[k]) !== JSON.stringify(base[k])) o[k] = a[k];
      return o;
    });
    const p = {}; for (const [k, v] of Object.entries(state.project)) if (v) p[k] = v;
    const enc = btoa(unescape(encodeURIComponent(JSON.stringify({ a: slim, p })))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return location.href.split("#")[0] + "#p=" + enc;
  }

  // ------------------------------------------------------------------ form pieces
  const seg = (k, opts, cur, cls = "") => `<div class="pb-seg ${cls}${opts.filter(o => o[2]).length > 1 && opts.length > 2 ? " cards" : ""}" role="radiogroup">${opts.map(([v, label, sub, dis]) =>
    `<button type="button" role="radio" data-k="${k}" data-v="${h(v)}" aria-checked="${String(cur) === String(v)}"${dis ? " disabled" : ""}><span>${label}</span>${sub ? `<small>${sub}</small>` : ""}</button>`).join("")}</div>`;
  const num = (k, v, min, max, unit, step = 1) => `<div class="pb-num"><button type="button" data-step="${k}" data-d="-${step}" aria-label="Fewer">−</button><input type="number" inputmode="decimal" data-k="${k}" value="${h(v)}" min="${min}" max="${max}" step="${step}" aria-label="${h(unit || k)}"><button type="button" data-step="${k}" data-d="${step}" aria-label="More">+</button>${unit ? `<span class="pb-unit">${unit}</span>` : ""}</div>`;
  const q = (label, body, help, wide) => `<div class="pb-q${wide ? " wide" : ""}"><div class="pb-q-l">${label}</div>${body}${help ? `<p class="pb-q-h">${help}</p>` : ""}</div>`;

  const NUMERIC = new Set(["qty", "lamps", "runFt", "runs", "barLen", "barsPer", "cct", "watt", "volts", "lead65", "gapIn", "emg", "sideA", "sideB"]);

  const moreOpen = new Set();
  document.addEventListener("toggle", (ev) => {
    const d = ev.target; if (!d.matches || !d.matches(".pb-more")) return;
    const a = areaOf(d); if (!a) return;
    if (d.open) moreOpen.add(a.id); else moreOpen.delete(a.id);
    const g = d.querySelector(".pb-more-go"); if (g) g.textContent = d.open ? "Hide" : "Change";
  }, true);

  function areaTitle(a, i) { return a.name ? a.name : `Area ${i + 1}`; }

  function areaSummary(r) {
    const a = r.area, m = r.model;
    const shapeName = { tray: ["tray ceiling", "tray ceilings"], u: ["three-sided cove", "three-sided coves"], l: ["L-shaped cove", "L-shaped coves"] }[a.shape];
    const what = r.isRun && shapeName
      ? `${a.runs} ${shapeName[a.runs === 1 ? 0 : 1]}, ${a.sideA} × ${a.sideB} ft`
      : r.isRun
      ? `${a.runs} × ${a.runFt} ft ${a.job === "retrofit" ? "cove" : "run"}${a.runs === 1 ? "" : "s"}`
      : a.job === "retrofit" ? `${a.qty} × ${a.qty === 1 ? E.SHAPES[a.app][a.size].label : E.SHAPES[a.app][a.size].many}` : `${a.qty} new fixture${a.qty === 1 ? "" : "s"}`;
    return `${what} → ${fmt(r.barsTotal)} × ${m.name} bars`;
  }

  function renderArea(a, i, r) {
    const open = state.open === a.id;
    const m = r.model;
    const rec = r.rec;
    const isRun = r.isRun;
    const lampOpts = a.app === "troffer" && a.size === "2x2" ? ["ubend", "t8s"] : a.size === "8" ? ["f96", "f96ho"] : a.app === "bay" ? ["t5ho", "t8", "t5"] : ["t8", "t12", "t5", "t5ho"];
    const sh = E.SHAPES[a.app] && E.SHAPES[a.app][a.size];
    const head = `<div class="pb-area-head">
        <span class="pb-n">${i + 1}</span>
        <div class="pb-area-t">${open ? `<input class="pb-name" type="text" data-k="name" value="${h(a.name)}" placeholder="${h(`Name area ${i + 1}`)}" aria-label="Name this area" autocomplete="off">` : `<strong>${h(areaTitle(a, i))}</strong>`}<span>${h(areaSummary(r))}</span></div>
        <div class="pb-area-acts">
          <button type="button" class="pb-link" data-act="toggle" aria-expanded="${open}">${open ? "Done" : "Edit"}</button>
          <button type="button" class="pb-icon" data-act="dup" title="Duplicate this area" aria-label="Duplicate ${h(areaTitle(a, i))}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/></svg></button>
          <button type="button" class="pb-icon" data-act="del" title="Remove this area" aria-label="Remove ${h(areaTitle(a, i))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/></svg></button>
        </div>
      </div>`;
    if (!open) return `<article class="pb-area" data-id="${a.id}">${head}</article>`;

    const qs = [];
    const adv = [];
    qs.push(q("What are you doing?", seg("job", [["retrofit", "Retrofit", "Keep the fixtures, replace the lamps"], ["new", "New LBI fixtures", "The bars are the fixture"]], a.job)));
    if (a.job === "retrofit") {
      qs.push(q("What is there now?", seg("app", [["troffer", "Troffers"], ["strip", "Strips or wraps"], ["vapor", "Vapor tights"], ["cove", "Coves and continuous runs"], ["bay", "Low or high bays"]], a.app, "flow"), null, true));
      if (a.app === "troffer") qs.push(q("Troffer size", seg("size", [["2x4", "2x4"], ["2x2", "2x2"], ["1x4", "1x4"]], a.size)));
      if (a.app === "strip" || a.app === "vapor") qs.push(q("Fixture length", seg("size", [["4", "4 ft"], ["8", "8 ft"]], a.size)));
    } else {
      qs.push(q("What are you building?", seg("app", [["fixtures", "Individual fixtures", "Garages, closets, stairs, rows"], ["run", "Continuous runs", "Coves, lines, perimeters"]], a.app), null, true));
    }
    if (isRun) {
      qs.push(q("Shape", seg("shape", [["line", "Straight", "One straight line"], ["tray", "Tray ceiling", "Square or rectangle, 4 sides"], ["u", "Three sides", "U-shaped cove"], ["l", "L-shape", "Two sides and a corner"]], a.shape || "line"), a.shape && a.shape !== "line" ? "Seamless connectors along each side, a 12 in linking cable around each corner." : null, true));
      if (!a.shape || a.shape === "line") {
        qs.push(q(a.job === "retrofit" ? "How many coves or runs?" : "How many runs?", num("runs", a.runs, 1, 999, a.runs === 1 ? "run" : "runs")));
        qs.push(q("Length of each run", num("runFt", a.runFt, 1, 2000, "ft"), a.job === "retrofit" ? "A row of 25 four-foot fixtures end to end is 100 ft." : "Measure the length you want lit, end to end."));
      } else {
        const word = { tray: ["tray ceiling", "tray ceilings"], u: ["cove", "coves"], l: ["cove", "coves"] }[a.shape];
        qs.push(q(`How many ${word[1]}?`, num("runs", a.runs, 1, 999, word[a.runs === 1 ? 0 : 1])));
        qs.push(q(a.shape === "tray" ? "Size of each tray" : "Side lengths", `<div class="pb-pair">${num("sideA", a.sideA, 1, 500, "ft")}<span aria-hidden="true">×</span>${num("sideB", a.sideB, 1, 500, "ft")}</div>`, a.shape === "tray" ? `Length × width, measured along the cove. ${E.ftIn(a.runFt * 12)} around.` : a.shape === "u" ? `The two matching sides × the side between them. ${E.ftIn(a.runFt * 12)} in all.` : `The two sides of the L. ${E.ftIn(a.runFt * 12)} in all.`));
      }
    } else {
      qs.push(q(a.job === "retrofit" ? "How many fixtures?" : "How many fixtures?", num("qty", a.qty, 1, 9999, a.qty === 1 ? "fixture" : "fixtures")));
    }
    if (a.job === "retrofit" && sh) {
      const lamps = a.lamps || sh.lamps;
      qs.push(q(a.size === "8" ? "8 ft lamps in each fixture" : "Lamps in each fixture", seg("lamps", sh.lampsAllowed.map(n => [n, String(n)]), lamps)));
      const lamp = a.lamp || sh.lampDef;
      qs.push(q("Lamp type", seg("lamp", lampOpts.map(k => [k, E.LAMPS[k].name]), lamp, "flow")));
    }
    qs.push(q("Location", seg("env", [["dry", "Dry or damp", "Indoors"], ["wet", "Wet or outdoors", "Washdown, coolers, garages, canopies"]], a.env)));

    // light bar
    const allowed = a.env === "wet" ? ["lbi65"] : ["g1", "g2", "lbi65", "max", "palette", "plus"];
    const modelOpts = [["auto", `Recommended`, E.MODELS[rec.id].name]].concat(E.MODEL_ORDER.filter(id => allowed.includes(id)).map(id => [id, E.MODELS[id].name, E.MODELS[id].kind]));
    adv.push(q("Light bar", seg("model", modelOpts, a.model, "flow models"), a.model === "auto" ? h(rec.why) : null, true));
    if (a.job === "new") {
      adv.push(q("Bar length", seg("barLen", m.lens.map(L => [L, `${L} ft`, `${m.len[L]} in`]), a.barLen)));
      if (!isRun) adv.push(q("Bars end to end in each fixture", seg("barsPer", [[1, "1"], [2, "2"], [3, "3"], [4, "4"]], a.barsPer || 1), "Two 4 ft bars make an 8 ft fixture."));
    } else if (!isRun && sh) {
      const def = r.layout ? r.layout.bars : null;
      adv.push(q("Bars in each fixture", num("barsPer", a.barsPer || def, 1, 16, "bars"), a.barsPer ? `<button type="button" class="pb-link" data-k="barsPer" data-v="">Back to the recommended ${h(String(def))}</button>` : "Recommended from the lamps. Change it if you want more or fewer bars."));
    }
    if (m.color) adv.push(q("Colors on each bar", seg("pair", Object.entries(E.PAIRS).map(([k, p]) => [k, p.name]), a.pair), "Each bar carries two colors on a switch."));
    else adv.push(q("Color temperature", seg("cct", m.ccts.map(k => [k, `${k}K`]), a.cct || m.cctDef, "flow"), m.id === "g1" ? "2700K and 3000K use the warm model (WC2)." : null));
    if (!m.color) {
      if (a.job === "retrofit" || isRun) adv.push(q("Light level", seg("level", [["saver", "Save energy"], ["match", isRun ? "Standard" : "Match today"], ["brighter", "Brighter"]], a.level), "Sets the FlexWatt switch on each bar. You can change it on site."));
      else { const L = +a.barLen; adv.push(q("Wattage (FlexWatt)", seg("watt", m.watts[L].map(w => [w, `${w} W`, m.lm && m.lm[L] ? `${fmt(m.lm[L][m.watts[L].indexOf(w)])} lm` : ""]), a.watt || m.def[L], "flow"))); }
    }
    if (a.job === "new") {
      const mounts = [["surface", "Surface", "Ceiling or wall"], ["suspended", "Suspended", "Aircraft cable"]];
      if (m.family === "lbi") mounts.push(["tbar", "T-bar grid", "Clips under the T-bar"], ["cove45", "45° bracket", "Coves, displays"]);
      adv.push(q("Mounting", seg("mount", mounts, a.mount, "flow")));
    } else if (a.app === "cove" && m.family === "lbi") {
      adv.push(q("Aim", seg("aim", [["flat", "Flat"], ["45", "Tilted 45°", "45° brackets"]], a.aim)));
    }
    // power
    adv.push(q("Voltage", seg("volts", [120, 208, 240, 277, 347].map(v => [v, `${v}V`, v === 347 ? "Canada" : "", !m.volts.includes(v)]), a.volts, "flow")));
    if (m.family === "lbi65") {
      adv.push(q("Incoming power", seg("feed", [["conduit", "Conduit adapter", "Liquid-tight, 1/2 in NPT"], ["whip", "Wire whip"]], a.feed)));
      adv.push(q("Lead length", seg("lead65", [[3, "3 ft"], [10, "10 ft"]], a.lead65)));
    } else {
      const feeds = [["hardwire", "Hardwired", "Into the fixture or a junction box"], ["plug", "Plug-in", "120V outlet, on/off switch", +a.volts !== 120], ["pendant", "From above", "12 ft 90° cable for suspended bars"]];
      adv.push(q("Incoming power", seg("feed", feeds, a.feed, "flow")));
    }
    if (a.job === "new" && !isRun) {
      adv.push(q("Feed several fixtures from one circuit?", seg("chain", [[false, "No", "One feed per fixture"], [true, "Yes", "Link them with cables"]], a.chain)));
      if (a.chain) adv.push(q("Gap between fixtures", num("gapIn", a.gapIn, 1, 72, "in"), `Linking cables go up to ${m.family === "lbi65" ? 48 : 72} in.`));
    }
    // controls
    qs.push(q("Controls", seg("ctl", [["none", "None", "Wall switch"], ["dimmer", "0-10V dimmer", "Whole run dims together"], ["simple", "Occupancy sensor", "Simple Lighting Control"], ["mesh", "Bluetooth mesh", "Silvair networked control"]], a.ctl, "flow"), null, true));
    if (a.ctl === "simple" && m.family === "lbi") qs.push(q("Sensor", seg("sensor", [["oc2", "Microwave, wide"], ["oc3", "Microwave, narrow", "Aisles"], ["pir", "Passive infrared"]], a.sensor, "flow")));
    if (a.ctl === "mesh") {
      const kinds = [["sensor", "Sensor in each zone", "Motion + daylight"], ["node", "Node only", "For wireless switches"]];
      qs.push(q("Silvair device", seg("meshKind", kinds, a.meshKind)));
      if (a.meshKind === "sensor" && m.family === "lbi") qs.push(q("Sensor type", seg("sensor", [["oc2", "Microwave"], ["pir", "Passive infrared"]], a.sensor === "pir" ? "pir" : "oc2")));
    }
    if ((a.ctl === "simple" || a.ctl === "mesh") && isRun && m.family !== "max") qs.push(q("Sensor position in the run", seg("place", [["end", "At the end", "Recommended"], ["middle", "In the middle"], ["start", "Next to the feed"]], a.place, "flow"), "One sensor for every 15 bars."));
    if (m.id === "g2") adv.push(q("Tunable white remote", seg("irwc", [[false, "No", "Not needed"], [true, "Add one", "RC-REMOTE-IRWC"]], a.irwc)));
    if (m.id === "plus") adv.push(q("Color remote", seg("rgb", [[true, "Add one", "Unlocks color"], [false, "White light only"]], a.rgb)));
    // emergency
    const emgMax = isRun ? a.runs : a.qty;
    adv.push(q(isRun ? "Runs with battery backup" : "Fixtures with battery backup", num("emg", a.emg, 0, emgMax, `of ${emgMax}`), "90 minutes of emergency light."));
    if (a.emg > 0 && m.emgBuiltIn) adv.push(q("Battery", seg("emgKind", [["remote", "Remote battery pack", "Powers the whole fixture"], ["builtin", "Built into one bar", "-EMG, 500 lm"]], a.emgKind)));

    const fixes = r.fixes.length ? `<p class="pb-fix">${r.fixes.map(h).join(" ")}</p>` : "";
    const feedName = { hardwire: "hardwired", plug: "plug-in", pendant: "power from above", conduit: "conduit adapter", whip: "wire whip" }[a.feed] || "";
    const picks = [m.name + (a.model === "auto" ? " (recommended)" : ""), m.color ? (E.PAIRS[a.pair] || {}).name : `${a.cct || m.cctDef}K`, `${a.volts}V`, feedName, a.emg ? `${a.emg} with battery backup` : "no battery backup"].filter(Boolean);
    const more = `<details class="pb-more"${moreOpen.has(a.id) ? " open" : ""}><summary><span class="pb-more-t">Light bar, color, power and battery backup</span><span class="pb-more-s">${h(picks.join(" · "))}</span><span class="pb-more-go" aria-hidden="true">${moreOpen.has(a.id) ? "Hide" : "Change"}</span></summary><div class="pb-qs">${adv.join("")}</div></details>`;
    return `<article class="pb-area is-open" data-id="${a.id}">${head}<div class="pb-qs">${qs.join("")}</div>${more}${fixes}<div class="pb-area-foot"><button type="button" class="btn btn-primary btn-sm" data-act="toggle">Done</button><a class="pb-link" href="#pb-a-${a.id}">See this area's parts ›</a></div></article>`;
  }

  // ------------------------------------------------------------------ layout drawings
  function drawFixture(L) {
    const W = 420, rowGap = 34, padX = 40, padY = 30;
    const rows = L.rows, per = L.perRow;
    const H = padY * 2 + (rows - 1) * rowGap + 16;
    const inner = W - padX * 2;
    const barW = (inner - (per - 1) * 2) / per;
    let s = `<svg class="pb-draw" viewBox="0 0 ${W} ${H + 4}" role="img" aria-label="Layout of one fixture: ${L.bars} bars in ${rows} ${rows === 1 ? "row" : "rows"}">`;
    if (L.job === "retrofit") s += `<rect class="hous" x="14" y="8" width="${W - 28}" height="${H - 4}" rx="10"/>`;
    for (let r = 0; r < rows; r++) {
      const y = padY + r * rowGap;
      for (let p = 0; p < per; p++) {
        const x = padX + p * (barW + 2);
        s += `<rect class="bar${r === 0 && p === 0 && L.emg ? " emg" : ""}" x="${x}" y="${y}" width="${barW}" height="12" rx="4"/>`;
        if (p > 0) s += `<rect class="ssc" x="${x - 3}" y="${y - 2}" width="4" height="16" rx="1"/>`;
      }
      if (r < rows - 1) {
        const right = r % 2 === 0;
        const x = right ? padX + inner : padX;
        const dx = right ? 16 : -16;
        s += `<path class="lc" d="M${x} ${y + 6} C ${x + dx} ${y + 6}, ${x + dx} ${y + rowGap + 6}, ${x} ${y + rowGap + 6}"/>`;
      }
    }
    // power at the start of row 1 (left), sensor at the end of the last row
    s += `<path class="feed" d="M${padX} ${padY + 6} H 4"/><circle class="feed-dot" cx="${padX - 8}" cy="${padY + 6}" r="7"/><path class="bolt" d="M${padX - 9} ${padY + 1} l-3 6 h4 l-2 5 5-7 h-4 l2-4z"/>`;
    if (L.sensor) {
      const last = rows - 1, endRight = last % 2 === 0;
      const x = endRight ? padX + inner + 9 : padX - 9, y = padY + last * rowGap + 6;
      s += `<circle class="sensor" cx="${x}" cy="${y}" r="7"/><text class="sl" x="${x}" y="${y + 3.5}" text-anchor="middle">S</text>`;
    }
    s += "</svg>";
    const leg = [`<span><i class="k bar"></i>${L.L} ft bar</span>`, `<span><i class="k feed"></i>power feed</span>`];
    if (per > 1) leg.push(`<span><i class="k ssc"></i>seamless connector</span>`);
    if (rows > 1) leg.push(`<span><i class="k lc"></i>linking cable</span>`);
    if (L.sensor) leg.push(`<span><i class="k sensor"></i>sensor</span>`);
    if (L.emg) leg.push(`<span><i class="k emg"></i>battery backup</span>`);
    return s + `<p class="pb-legend">${leg.join("")}</p>`;
  }

  function drawRun(L) {
    const W = 1000, x0 = 24, x1 = W - 24, y = 44;
    const sc = (x1 - x0) / Math.max(L.runIn, 1);
    const fam = L.family;
    let s = `<svg class="pb-draw run" viewBox="0 0 ${W} 100" role="img" aria-label="Layout of one run: ${L.seq.length} bars">`;
    s += `<path class="dim" d="M${x0} 92 H ${x1} M${x0} 86 V 98 M${x1} 86 V 98"/>`;
    let x = x0 + (L.gap * sc) / 2, k = 0;
    L.segs.forEach((seg, si) => {
      // feed marker
      s += `<circle class="feed-dot" cx="${x}" cy="${y - 22}" r="8"/><path class="bolt" d="M${x - 1} ${y - 28} l-3 6 h4 l-2 5 5-7 h-4 l2-4z"/><path class="feed" d="M${x} ${y - 14} V ${y - 2}"/>`;
      const zones = L.zones[si];
      let zi = 0, inZone = 0;
      const zoneStarts = [];
      seg.forEach((len, bi) => {
        const w = L.len[len] * sc;
        if (inZone === 0) zoneStarts.push({ x, n: zones[zi] });
        s += `<rect class="bar len${len}" x="${x + 0.6}" y="${y}" width="${Math.max(1, w - 1.2)}" height="14" rx="3"><title>${len} ft bar #${k + 1}</title></rect>`;
        inZone += 1; k += 1;
        const endOfZone = inZone === zones[zi];
        if (bi < seg.length - 1) s += `<rect class="${endOfZone ? "ssc nodim" : "ssc"}" x="${x + w - 1.5}" y="${y - 3}" width="3" height="20" rx="1"/>`;
        x += w;
        if (endOfZone) { zoneStarts[zoneStarts.length - 1].x1 = x; zi += 1; inZone = 0; }
      });
      if (L.sensor && fam !== "max") zoneStarts.forEach(z => {
        const sx = L.place === "start" ? z.x + 6 : L.place === "middle" ? (z.x + z.x1) / 2 : z.x1 - 6;
        s += `<circle class="sensor" cx="${sx}" cy="${y + 28}" r="7"/><text class="sl" x="${sx}" y="${y + 31.5}" text-anchor="middle">S</text><path class="lead" d="M${sx} ${y + 21} V ${y + 14}"/>`;
      });
      if (L.sensor && fam === "max") zoneStarts.forEach(z => { s += `<circle class="sensor" cx="${z.x + 8}" cy="${y + 28}" r="7"/><text class="sl" x="${z.x + 8}" y="${y + 31.5}" text-anchor="middle">S</text>`; });
      if (si < L.segs.length - 1) s += `<path class="brk" d="M${x} ${y - 6} V ${y + 20}"/>`;
    });
    return s + "</svg>";
  }

  // Plan view of a tray ceiling, U or L cove: bars along each side, linking cables around the corners.
  function drawShape(L) {
    const A = L.sides[0].ft * 12, B = (L.sides[1] || { ft: 0 }).ft * 12;
    const sc = Math.min(860 / Math.max(A, 1), 440 / Math.max(B, 1));
    const pad = 70, W = Math.round(A * sc + pad * 2), H = Math.round(B * sc + pad * 2);
    const P = [[pad, pad], [pad + A * sc, pad], [pad + A * sc, pad + B * sc], [pad, pad + B * sc]];   // corners, clockwise from top left
    const cx = W / 2, cy = H / 2;
    const bars = [];   // {x1,y1,x2,y2,len}
    L.sides.forEach((sd, i) => {
      const [ax, ay] = P[i % 4], [bx, by] = P[(i + 1) % 4];
      const ux = Math.sign(bx - ax), uy = Math.sign(by - ay);
      let t = (sd.gap * sc) / 2;
      sd.seq.forEach(len => { const w = L.len[len] * sc; bars.push({ x1: ax + ux * t, y1: ay + uy * t, x2: ax + ux * (t + w), y2: ay + uy * (t + w), len, side: i }); t += w; });
    });
    const toward = (x, y, d) => { const dx = cx - x, dy = cy - y, n = Math.hypot(dx, dy) || 1; return [x + dx / n * d, y + dy / n * d]; };
    let s = `<svg class="pb-draw shape" viewBox="0 0 ${W} ${H}" role="img" aria-label="Plan of one ${h(E.SHAPE_NAME[L.shape])}: ${L.seq.length} bars">`;
    s += `<path class="ceil" d="M${P[0]} L${P[1]} L${P[2]} L${P[3]} Z"/>`;
    const ln = (b, cls, i) => `<line class="${cls}" x1="${b.x1 + Math.sign(b.x2 - b.x1) * 1.5}" y1="${b.y1 + Math.sign(b.y2 - b.y1) * 1.5}" x2="${b.x2 - Math.sign(b.x2 - b.x1) * 1.5}" y2="${b.y2 - Math.sign(b.y2 - b.y1) * 1.5}">${i != null ? `<title>${b.len} ft bar #${i + 1}</title>` : ""}</line>`;
    s += bars.map((b, i) => ln(b, "sbar", null) + ln(b, "sbar-in", i)).join("");
    // joins
    const corners = new Set(L.corners);
    let k = 0; const ends = [];
    L.segs.forEach((seg, si) => {
      const zones = L.zones[si]; let zi = 0, inZ = 0, zoneStart = k;
      seg.forEach((len, bi) => {
        inZ += 1; const zoneEnd = inZ === zones[zi];
        const b = bars[k], nb = bars[k + 1];
        if (bi < seg.length - 1) {
          if (corners.has(k)) { const d1x = Math.sign(b.x2 - b.x1), d1y = Math.sign(b.y2 - b.y1), d2x = Math.sign(nb.x2 - nb.x1), d2y = Math.sign(nb.y2 - nb.y1); s += `<path class="lc${zoneEnd ? " nodim" : ""}" d="M${b.x2} ${b.y2} C ${b.x2 + d1x * 34} ${b.y2 + d1y * 34} ${nb.x1 - d2x * 34} ${nb.y1 - d2y * 34} ${nb.x1} ${nb.y1}"/>`; }
          else s += `<circle class="${zoneEnd ? "ssc nodim" : "ssc"}" cx="${b.x2}" cy="${b.y2}" r="4.5"/>`;
        }
        if (zoneEnd) { ends.push({ from: zoneStart, to: k }); zoneStart = k + 1; zi += 1; inZ = 0; }
        k += 1;
      });
      const f = bars[k - seg.length];
      const [fx, fy] = toward(f.x1, f.y1, -26);
      s += `<path class="feed" d="M${fx} ${fy} L${f.x1} ${f.y1}"/><circle class="feed-dot" cx="${fx}" cy="${fy}" r="10"/><path class="bolt" d="M${fx - 1} ${fy - 6} l-3 6 h4 l-2 5 5-7 h-4 l2-4z"/>`;
      if (si > 0) { const pb = bars[k - seg.length - 1]; s += `<path class="brk" d="M${(pb.x2 + f.x1) / 2} ${(pb.y2 + f.y1) / 2} L${toward((pb.x2 + f.x1) / 2, (pb.y2 + f.y1) / 2, 22).join(" ")}"/>`; }
    });
    if (L.sensor) ends.forEach(z => {
      const bi = L.family === "max" ? z.from : L.place === "start" ? z.from : L.place === "middle" ? Math.floor((z.from + z.to) / 2) : z.to;
      const b = bars[bi]; const mx = L.place === "end" && L.family !== "max" ? b.x2 * 0.8 + b.x1 * 0.2 : (b.x1 + b.x2) / 2, my = L.place === "end" && L.family !== "max" ? b.y2 * 0.8 + b.y1 * 0.2 : (b.y1 + b.y2) / 2;
      const [sx, sy] = toward(mx, my, 24);
      s += `<path class="lead" d="M${mx} ${my} L${sx} ${sy}"/><circle class="sensor" cx="${sx}" cy="${sy}" r="9"/><text class="sl" x="${sx}" y="${sy + 3.5}" text-anchor="middle">S</text>`;
    });
    return s + "</svg>";
  }

  function legendRun(L) {
    const shaped = L.shape && L.shape !== "line";
    const parts = [`<span class="len">${shaped ? `${E.ftIn(L.sides[0].ft * 12)} × ${E.ftIn(L.sides[1].ft * 12)}, ${E.ftIn(L.lit)} lit` : `${E.ftIn(L.runIn)} run, ${E.ftIn(L.lit)} lit`}</span>`, `<span><i class="k bar"></i>bars (${[4, 3, 2].map(len => [len, L.seq.filter(x => x === len).length]).filter(x => x[1]).map(([len, n]) => `${n} × ${len} ft`).join(", ")})</span>`, `<span><i class="k feed"></i>power feed</span>`, `<span><i class="k ssc${shaped ? " dot" : ""}"></i>seamless connector</span>`];
    if (shaped && L.corners.length) parts.push(`<span><i class="k lc"></i>12 in linking cable at a corner</span>`);
    if (L.sensor) parts.push(`<span><i class="k sensor"></i>sensor</span>`);
    if (L.zones.flat().length > L.segs.length) parts.push(`<span><i class="k nodim"></i>zone break (non-dimming connector)</span>`);
    if (L.segs.length > 1) parts.push(`<span><i class="k brk"></i>next feed starts</span>`);
    return `<p class="pb-legend">${parts.join("")}</p>`;
  }

  // ------------------------------------------------------------------ list rendering
  const THUMB = (l) => l.img ? `<img src="assets/img/acc/${l.img}" alt="" loading="lazy" width="40" height="40">` : l.bar ? `<span class="pb-glyph bar-${l.bar.model}" aria-hidden="true"></span>` : `<span class="pb-glyph g-${l.g.toLowerCase().replace(/\s+/g, "-")}" aria-hidden="true"></span>`;

  function linesTable(lines, withAreas, project) {
    let html = `<div class="pb-table-wrap"><table class="pb-table"><thead><tr><th scope="col" class="th-pic"><span class="sr">Picture</span></th><th scope="col">Part #</th><th scope="col">Description</th><th scope="col" class="num">Qty</th><th scope="col" class="num">Order</th>${withAreas ? `<th scope="col">Areas</th>` : ""}</tr></thead><tbody>`;
    let g = null;
    for (const l of lines) {
      if (l.g !== g) { g = l.g; html += `<tr class="grp"><th colspan="${withAreas ? 6 : 5}" scope="rowgroup">${h(g)}</th></tr>`; }
      html += `<tr><td class="pic">${THUMB(l)}</td><td class="pn">${h(l.pn)}</td><td>${h(l.d)}${l.set ? `<span class="set">${h(l.set)}</span>` : ""}</td><td class="num">${fmt(l.qty)}</td><td class="num ord${l.pack > 1 ? "" : " same"}">${h(E.orderText(Object.assign({ order: l.pack > 1 ? Math.ceil(l.qty / l.pack) : l.qty }, l)))}</td>${withAreas ? `<td class="ar"><span class="ar-l">${l.project ? "For the whole project" : "Areas "}</span>${l.project ? "" : l.areas.map(x => `<a href="#pb-a-${state.areas[x.i].id}">${x.i + 1}</a>`).join(" ")}</td>` : ""}</tr>`;
    }
    void project;
    return html + "</tbody></table></div>";
  }

  let last = null;
  function compute() { last = E.projectBom(state.areas); return last; }

  function renderAreas() {
    const P = last;
    $("#pb-areas").innerHTML = state.areas.map((a, i) => renderArea(a, i, P.per[i])).join("") || `<p class="pb-empty">No areas yet. Add one to start.</p>`;
  }

  function renderSide() {
    const P = last, T = P.totals;
    const top = P.lines.slice(0, 9);
    $("#pb-side").innerHTML = `<div class="pb-side-in">
      <p class="eyebrow">Your bill of materials so far</p>
      <div class="pb-tiles"><div><b>${fmt(T.bars)}</b><span>light bars</span></div><div><b>${fmt(T.feeds)}</b><span>power feeds</span></div>${T.sensors ? `<div><b>${fmt(T.sensors)}</b><span>sensors</span></div>` : `<div><b>${P.lines.length}</b><span>line items</span></div>`}</div>
      <ul class="pb-mini">${top.map(l => `<li><span class="pn">${h(l.pn)}</span><span class="q">${l.pack > 1 ? `${l.order} × ${l.pack}-pk` : `× ${fmt(l.qty)}`}</span></li>`).join("")}${P.lines.length > top.length ? `<li class="more">and ${P.lines.length - top.length} more</li>` : ""}</ul>
      <a class="btn btn-primary" href="#pb-results">See the full list</a>
      <div class="pb-side-acts"><button type="button" class="pb-link" data-act="pdf">PDF</button><button type="button" class="pb-link" data-act="xlsx">Excel</button><button type="button" class="pb-link" data-act="quote">Email for a quote</button></div>
    </div>`;
    $("#pb-bar").innerHTML = `<a href="#pb-results"><span><b>${fmt(T.bars)}</b> bars · <b>${P.lines.length}</b> line items</span><span class="go">See list ›</span></a>`;
  }

  function renderResults() {
    const P = last, T = P.totals;
    if (!state.areas.length) { $("#pb-out").innerHTML = `<p class="pb-empty">Add an area to see the list.</p>`; return; }
    let html = `<div class="pb-sum">
      <div><b>${fmt(T.bars)}</b><span>light bars</span></div>
      <div><b>${fmt(T.feeds)}</b><span>power feeds</span></div>
      ${T.sensors ? `<div><b>${fmt(T.sensors)}</b><span>sensors</span></div>` : ""}
      <div><b>${fmt(T.watts)} W</b><span>connected load</span></div>
      ${T.lumens ? `<div><b>${fmt(T.lumens)}</b><span>lumens, at the settings shown</span></div>` : ""}
    </div>`;
    html += `<h3 class="pb-h3">Everything to order</h3>`;
    html += linesTable(P.lines, true);
    html += `<p class="pb-fine">Parts sold in packs of 10 are rounded up to whole packs in the Order column. "Set to" is the FlexWatt and FlexColor switch position for each bar; we can preset it at the factory to save labor on site.</p>`;
    html += `<h3 class="pb-h3">Area by area</h3><div class="pb-areas-out">`;
    P.per.forEach((r, i) => {
      const a = state.areas[i];
      html += `<article class="pb-ao" id="pb-a-${a.id}">
        <header><span class="pb-n">${i + 1}</span><div><h4>${h(areaTitle(a, i))}</h4><p>${h(areaSummary(r))}${r.area.model === "auto" ? "" : ""}</p></div><button type="button" class="pb-link" data-edit="${a.id}">Edit</button></header>
        <div class="pb-ao-body">
          <figure class="pb-fig">${r.layout ? (r.layout.kind === "run" ? (r.layout.shape && r.layout.shape !== "line" ? drawShape(r.layout) : drawRun(r.layout)) + legendRun(r.layout) : drawFixture(r.layout)) : ""}<figcaption>${r.layout && r.layout.kind === "run" ? (r.layout.shape && r.layout.shape !== "line" ? `One ${E.SHAPE_NAME[r.layout.shape]}, seen from below, to scale` : "One run, to scale") : "One fixture"}</figcaption></figure>
          <ul class="pb-notes">${r.notes.map(n => `<li>${h(n)}</li>`).join("")}${r.area._assumed && r.area._assumed.length ? `<li class="as">Assumed from your description: ${h(r.area._assumed.join(", "))}. Change it in the area if that is not right.</li>` : ""}</ul>
        </div>
        ${linesTable(r.lines.map(l => Object.assign({ areas: [] }, l)), false)}
      </article>`;
    });
    html += `</div>`;
    $("#pb-out").innerHTML = html;
  }

  function renderMode() {
    $$(".pb-mode-btn").forEach(b => b.setAttribute("aria-selected", String(b.dataset.mode === state.mode)));
    $("#pb-words").hidden = state.mode !== "words";
    $("#pb-text").value = state.text;
  }

  function renderProject() { $$("[data-p]").forEach(i => { if (document.activeElement !== i) i.value = state.project[i.dataset.p] || ""; }); }

  function renderAll() { compute(); renderAreas(); renderSide(); renderResults(); renderProject(); save(); }
  function renderOutputs() { compute(); renderSide(); renderResults(); save(); }

  // ------------------------------------------------------------------ events
  function areaOf(el) { const card = el.closest(".pb-area"); return card ? state.areas.find(a => a.id === card.dataset.id) : null; }

  function setVal(a, k, raw) {
    let v = raw;
    if (raw === "true") v = true; else if (raw === "false") v = false;
    else if (raw === "") v = null;
    else if (NUMERIC.has(k)) v = +raw;
    const resets = { job: ["app", "lamps", "lamp", "barsPer", "watt"], app: ["lamps", "lamp", "barsPer", "watt", "size"], size: ["lamps", "lamp", "barsPer"], lamps: ["barsPer"], model: ["watt", "cct"], barLen: ["watt"], env: ["model"] };
    (resets[k] || []).forEach(x => { a[x] = x === "size" ? "" : null; });
    if (k === "job") a.app = v === "new" ? "fixtures" : "troffer";
    if (k === "app" && (v === "cove" || v === "run")) { a.runs = a.runs || 1; }
    if (k === "model" && v === "plus") a.rgb = true;
    if (k === "cct" && v === null) return;
    a[k] = v;
    if (k === "barsPer" && v === 1 && a.job === "new") a.barsPer = null;
    E.normalize(a);
  }

  document.addEventListener("click", (ev) => {
    const t = ev.target.closest("button, a");
    if (!t) return;
    if (t.matches(".pb-mode-btn")) { state.mode = t.dataset.mode; renderMode(); save(); if (state.mode === "words") $("#pb-text").focus(); return; }
    if (t.matches("[data-example]")) { state.text = EXAMPLES[+t.dataset.example]; $("#pb-text").value = state.text; save(); return; }
    if (t.id === "pb-read") { readText(); return; }
    if (t.id === "pb-undo") { if (state.undo) { state.areas = state.undo; state.undo = null; $("#pb-readout").innerHTML = ""; renderAll(); } return; }
    if (t.id === "pb-add") {
      const prev = state.areas[state.areas.length - 1];
      const a = E.newArea(prev ? { volts: prev.volts, ctl: prev.ctl, cct: prev.cct, model: prev.model === "auto" ? "auto" : prev.model, meshKind: prev.meshKind, sensor: prev.sensor } : {});
      state.areas.push(a); state.open = a.id; renderAll();
      const card = $(`.pb-area[data-id="${a.id}"]`); if (card) { card.scrollIntoView({ behavior: "smooth", block: "start" }); const n = $("input[data-k=name]", card); if (n) n.focus({ preventScroll: true }); }
      return;
    }
    if (t.dataset.edit) { state.mode = state.mode; state.open = t.dataset.edit; renderAll(); const card = $(`.pb-area[data-id="${t.dataset.edit}"]`); if (card) card.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const act = t.dataset.act;
    if (act === "pdf") { downloadPdf(); return; }
    if (act === "xlsx") { downloadXlsx(); return; }
    if (act === "quote") { emailQuote(); return; }
    if (act === "link") { copyLink(); return; }
    const a = areaOf(t);
    if (!a) return;
    if (act === "toggle") { state.open = state.open === a.id ? null : a.id; renderAll(); const card = $(`.pb-area[data-id="${a.id}"]`); if (card && state.open !== a.id) card.scrollIntoView({ block: "nearest" }); return; }
    if (act === "dup") { const c = E.newArea(Object.assign({}, a, { id: undefined, name: a.name ? a.name + " (copy)" : "" })); delete c._src; state.areas.splice(state.areas.indexOf(a) + 1, 0, c); state.open = c.id; renderAll(); return; }
    if (act === "del") { const i = state.areas.indexOf(a); state.undo = state.areas.slice(); state.areas.splice(i, 1); if (state.open === a.id) state.open = null; renderAll(); return; }
    if (t.dataset.step) {
      const k = t.dataset.step, inp = $(`input[data-k="${k}"]`, t.parentElement);
      const v = Math.max(+inp.min || 0, Math.min(+inp.max || 9999, (+inp.value || 0) + (+t.dataset.d)));
      setVal(a, k, String(v)); renderAll(); const again = $(`.pb-area[data-id="${a.id}"] [data-step="${k}"][data-d="${t.dataset.d}"]`); if (again) again.focus();
      return;
    }
    if (t.dataset.k != null && t.dataset.v != null) {
      setVal(a, t.dataset.k, t.dataset.v); renderAll();
      const again = $(`.pb-area[data-id="${a.id}"] [data-k="${t.dataset.k}"][data-v="${CSS.escape(t.dataset.v)}"]`); if (again) again.focus({ preventScroll: true });
    }
  });

  document.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.id === "pb-text") { state.text = t.value; save(); return; }
    if (t.dataset.p) { state.project[t.dataset.p] = t.value; save(); return; }
    const a = t.dataset.k ? areaOf(t) : null;
    if (!a) return;
    if (t.dataset.k === "name") { a.name = t.value; const s = $(`.pb-area[data-id="${a.id}"] .pb-area-t strong`); if (s) s.textContent = a.name || `Area ${state.areas.indexOf(a) + 1}`; renderOutputs(); return; }
    if (t.type === "number") { if (t.value === "") return; setVal(a, t.dataset.k, t.value); renderOutputs(); const s = $(`.pb-area[data-id="${a.id}"] .pb-area-t span`); if (s) s.textContent = areaSummary(last.per[state.areas.indexOf(a)]); }
  });
  document.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.type === "number" && t.dataset.k && areaOf(t)) { const a = areaOf(t); if (t.value === "") t.value = a[t.dataset.k] || 0; setVal(a, t.dataset.k, t.value); renderAll(); }
  });
  $("#pb-text") && $("#pb-text").addEventListener("keydown", (ev) => { if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") readText(); });

  // ------------------------------------------------------------------ plain English
  function readText() {
    const text = $("#pb-text").value.trim();
    state.text = text;
    if (!text) { $("#pb-read-note").textContent = "Write a sentence or two about the project first."; return; }
    const res = E.parse(text);
    if (!res.areas.length) {
      $("#pb-read-note").textContent = "";
      $("#pb-readout").innerHTML = `<p class="pb-fix">I could not find fixtures or runs in that. Try naming how many fixtures and what kind, for example "20 2x4 troffers with three T8 lamps", or "a 100 ft cove".</p>`;
      return;
    }
    state.undo = state.areas.slice();
    state.areas = res.areas.map(a => { E.normalize(a); return a; });
    state.open = null;
    renderAll();
    const P = last;
    $("#pb-read-note").textContent = `${res.areas.length} ${res.areas.length === 1 ? "area" : "areas"} found.`;
    $("#pb-readout").innerHTML = `<p class="pb-ro-h">Here is how I read it. Check each area below and change anything that is not right.${state.undo && state.undo.length ? ` <button type="button" class="pb-link" id="pb-undo">Undo</button>` : ""}</p><ol class="pb-ro">${P.per.map((r, i) => {
      const a = r.area;
      const bits = [areaSummary(r)];
      if (a.job === "retrofit" && !r.isRun) bits.push(`${a.lamps || E.SHAPES[a.app][a.size].lamps} × ${E.LAMPS[a.lamp || E.SHAPES[a.app][a.size].lampDef].name} lamps each`);
      if (a.env === "wet") bits.push("wet location");
      bits.push(`${a.volts}V`);
      bits.push({ none: "no controls", dimmer: "0-10V dimming", simple: "occupancy sensors", mesh: a.meshKind === "node" ? "Silvair nodes" : "Bluetooth mesh sensors" }[a.ctl]);
      if (a.emg) bits.push(`battery backup on ${a.emg}`);
      return `<li><strong>${h(areaTitle(a, i))}</strong> ${h(bits.join(" · "))}${a._assumed && a._assumed.length ? `<span class="as">Assumed: ${h(a._assumed.join(", "))}</span>` : ""}</li>`;
    }).join("")}</ol>`;
  }

  // ------------------------------------------------------------------ export: shared rows
  function today() { return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); }
  function projectTitle() { return state.project.name || "LBI project"; }
  function fileBase() { return ("LBI-Project-" + (state.project.name || "List")).replace(/[^\w-]+/g, "-").replace(/-+/g, "-").replace(/-$/, "") + "-" + new Date().toISOString().slice(0, 10); }
  function contactLines() {
    const p = state.project;
    return [["Project", p.name], ["Prepared for", [p.person, p.company].filter(Boolean).join(", ")], ["Email", p.email], ["Phone", p.phone], ["Job ZIP code", p.zip]].filter(x => x[1]);
  }
  function areaSpec(r) {
    const a = r.area;
    const bits = [];
    if (a.job === "retrofit" && !r.isRun) bits.push(`${a.lamps || E.SHAPES[a.app][a.size].lamps} × ${E.LAMPS[a.lamp || E.SHAPES[a.app][a.size].lampDef].name} lamps each`);
    bits.push(a.env === "wet" ? "wet location" : "dry or damp");
    bits.push(`${a.volts}V`);
    bits.push({ none: "no controls", dimmer: "0-10V dimming", simple: "occupancy sensors (Simple Lighting Control)", mesh: a.meshKind === "node" ? "Silvair Bluetooth mesh nodes" : "Silvair Bluetooth mesh sensors" }[a.ctl]);
    if (a.emg) bits.push(`battery backup on ${a.emg}`);
    return bits.join(" · ");
  }
  function download(name, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = name; document.body.appendChild(link); link.click();
    setTimeout(() => { URL.revokeObjectURL(url); link.remove(); }, 4000);
  }

  // ------------------------------------------------------------------ export: Excel (.xlsx, written by hand)
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {   // stored (no compression): Excel opens it fine
    const enc = new TextEncoder(); const parts = []; const central = []; let off = 0;
    const d = new Date(); const dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(); const tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    for (const [name, text] of files) {
      const nb = enc.encode(name), data = enc.encode(text), crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, tm, true); lh.setUint16(12, dt, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, nb.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), nb, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, tm, true); ch.setUint16(14, dt, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, nb.length, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array(ch.buffer), nb);
      off += 30 + nb.length + data.length;
    }
    const csize = central.reduce((s, x) => s + x.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csize, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  const xe = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  function colName(i) { let s = ""; i += 1; while (i) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; }
  function sheetXml(rows, widths, merges) {
    // rows: [{ cells: [value|{v,s}], s: default style }]
    let x = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"/></sheetViews><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>`;
    rows.forEach((row, ri) => {
      x += `<row r="${ri + 1}">`;
      row.cells.forEach((c, ci) => {
        if (c == null || c === "") return;
        const o = typeof c === "object" ? c : { v: c };
        const s = o.s != null ? o.s : row.s || 0;
        const ref = colName(ci) + (ri + 1);
        x += typeof o.v === "number" ? `<c r="${ref}" s="${s}"><v>${o.v}</v></c>` : `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xe(o.v)}</t></is></c>`;
      });
      x += `</row>`;
    });
    x += `</sheetData>${merges && merges.length ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : ""}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
    return x;
  }
  function downloadXlsx() {
    const P = compute();
    const head = [{ cells: ["Light Efficient Design · RemPhos LBI Project Builder"], s: 1 }, { cells: ["Bill of materials, " + today()], s: 4 }];
    contactLines().forEach(([k, v]) => head.push({ cells: [{ v: k, s: 2 }, v] }));
    head.push({ cells: [] });
    const rows1 = head.slice();
    rows1.push({ cells: ["Group", "Part #", "Description", "Setting", "Qty needed", "Order", "Pack", "Areas"], s: 3 });
    P.lines.forEach(l => rows1.push({ cells: [l.g, { v: l.pn, s: 5 }, l.d, l.set || "", l.qty, l.pack > 1 ? `${l.order} × ${l.pack}-pack` : l.qty, l.pack, l.project ? "Whole project" : l.areas.map(x => areaTitle(state.areas[x.i], x.i)).join(", ")], s: 4 }));
    rows1.push({ cells: [] });
    rows1.push({ cells: ["Totals"], s: 2 });
    rows1.push({ cells: ["Light bars", P.totals.bars] }, { cells: ["Power feeds", P.totals.feeds] }, { cells: ["Sensors", P.totals.sensors] }, { cells: ["Connected load (W)", P.totals.watts] });
    rows1.push({ cells: [] });
    rows1.push({ cells: ["A recommendation from the LBI spec sheets. Our team confirms quantities, settings and lead times on the quote. sales@led-llc.com · 847.380.3540"], s: 4 });
    const rows2 = head.slice();
    rows2.push({ cells: ["Area", "Part #", "Description", "Setting", "Qty", "Order"], s: 3 });
    P.per.forEach((r, i) => {
      rows2.push({ cells: [`${i + 1}. ${areaTitle(state.areas[i], i)}: ${areaSummary(r)}`], s: 2 });
      rows2.push({ cells: [areaSpec(r)], s: 4 });
      r.lines.forEach(l => rows2.push({ cells: ["", { v: l.pn, s: 5 }, l.d, l.set || "", l.qty, l.pack > 1 ? `${Math.ceil(l.qty / l.pack)} × ${l.pack}-pack` : l.qty], s: 4 }));
      r.notes.forEach(n => rows2.push({ cells: ["", "", n], s: 4 }));
      rows2.push({ cells: [] });
    });
    const files = [
      ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
      ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Bill of materials" sheetId="1" r:id="rId1"/><sheet name="Area by area" sheetId="2" r:id="rId2"/></sheets></workbook>`],
      ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ["xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF004E99"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
      ["xl/worksheets/sheet1.xml", sheetXml(rows1, [14, 30, 60, 20, 11, 14, 7, 28])],
      ["xl/worksheets/sheet2.xml", sheetXml(rows2, [10, 30, 70, 20, 8, 14])]
    ];
    download(fileBase() + ".xlsx", zip(files));
  }

  // ------------------------------------------------------------------ export: PDF (written by hand, Helvetica)
  const HW = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  const HB = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
  const WIN = { "–": 0x96, "—": 0x97, "°": 0xB0, "×": 0xD7, "·": 0xB7, "’": 0x92, "‘": 0x91, "“": 0x93, "”": 0x94, "…": 0x85, "é": 0xE9, "÷": 0xF7, "•": 0x95, "→": null, "›": 0x9B, "−": null };
  function winBytes(s) {
    const out = [];
    for (const ch of String(s)) {
      const c = ch.codePointAt(0);
      if (c >= 32 && c < 127) out.push(c);
      else if (WIN[ch]) out.push(WIN[ch]);
      else if (ch === "→") out.push(0x2D, 0x3E);
      else if (ch === "−") out.push(0x2D);
      else if (ch === " ") out.push(32);
      else out.push(0x3F);
    }
    return out;
  }
  function textW(s, size, bold) {
    const t = bold ? HB : HW; let w = 0;
    for (const b of winBytes(s)) w += b >= 32 && b < 127 ? t[b - 32] : b === 0xD7 ? 584 : b === 0xB7 ? 278 : b === 0x96 ? 556 : b === 0x97 ? 1000 : b === 0xB0 ? 400 : 556;
    return w * size / 1000;
  }
  function wrap(s, size, bold, maxW) {
    const words = String(s).split(/\s+/); const lines = []; let cur = "";
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (textW(t, size, bold) <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  }
  const hex = (s) => "<" + winBytes(s).map(b => b.toString(16).padStart(2, "0")).join("") + ">";

  async function logoJpeg() {
    try {
      const img = new Image(); img.src = "assets/img/brand/led-logo-original.png";
      await img.decode();
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0);
      const data = c.toDataURL("image/jpeg", 0.92);
      const bin = atob(data.split(",")[1]); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return { bytes: u, w: c.width, h: c.height };
    } catch (e) { return null; }
  }

  async function downloadPdf() {
    const P = compute();
    const logo = await logoJpeg();
    const PW = 612, PH = 792, M = 40;
    const pages = []; let ops = null; let y = 0;
    const BLUE = [0, 0.306, 0.6], INK = [0.106, 0.11, 0.125], MUTED = [0.36, 0.37, 0.42], LINE = [0.86, 0.87, 0.9];
    const col = (c) => c.map(v => v.toFixed(3)).join(" ");
    const text = (x, yy, s, size = 9, bold = false, c = INK) => ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${col(c)} rg ${x.toFixed(2)} ${(PH - yy).toFixed(2)} Td ${hex(s)} Tj ET`);
    const rect = (x, yy, w, hh, c) => ops.push(`${col(c)} rg ${x.toFixed(2)} ${(PH - yy - hh).toFixed(2)} ${w.toFixed(2)} ${hh.toFixed(2)} re f`);
    const hline = (x1, x2, yy, c = LINE, w = 0.6) => ops.push(`${col(c)} RG ${w} w ${x1.toFixed(2)} ${(PH - yy).toFixed(2)} m ${x2.toFixed(2)} ${(PH - yy).toFixed(2)} l S`);
    function newPage() {
      ops = []; pages.push(ops); y = M;
      if (pages.length === 1) {
        if (logo) { const lh = 34, lw = lh * logo.w / logo.h; ops.push(`q ${lw.toFixed(2)} 0 0 ${lh} ${M} ${PH - M - lh} cm /Im1 Do Q`); }
        text(PW - M - textW("LBI Project Builder", 9, true), M + 12, "LBI Project Builder", 9, true, BLUE);
        text(PW - M - textW(today(), 9), M + 26, today(), 9, false, MUTED);
        y = M + 58;
        text(M, y, "Bill of materials" + (state.project.name ? ": " + state.project.name : ""), 18, true); y += 14;
        const cl = contactLines().filter(x => x[0] !== "Project");
        if (cl.length) { y += 6; cl.forEach(([k, v]) => { text(M, y, k, 8.5, true, MUTED); text(M + 80, y, v, 9); y += 12; }); }
        y += 8;
      } else {
        text(M, y + 8, "LBI Project Builder · " + projectTitle(), 8.5, true, MUTED); y += 24;
      }
    }
    function need(hh) { if (y + hh > PH - M - 24) newPage(); }
    // columns: Part #, Description, Qty, Order
    const C = [{ x: M, w: 150 }, { x: M + 156, w: 250 }, { x: M + 412, w: 40 }, { x: M + 458, w: PW - M - (M + 458) }];
    function tableHead() {
      need(40);
      rect(M, y, PW - 2 * M, 18, BLUE);
      [["Part #", 0], ["Description", 1], ["Qty", 2], ["Order", 3]].forEach(([t, i]) => text(i >= 2 ? C[i].x + C[i].w - textW(t, 8.5, true) : C[i].x + 4, y + 12.5, t, 8.5, true, [1, 1, 1]));
      y += 22;
    }
    function row(l, qty, order) {
      const desc = wrap(l.d, 8.5, false, C[1].w - 4);
      const set = l.set ? wrap(l.set, 8, false, C[1].w - 4) : [];
      const pn = wrap(l.pn, 8.5, true, C[0].w - 4);
      const hh = Math.max(pn.length, desc.length + set.length) * 11 + 6;
      if (y + hh > PH - M - 24) { newPage(); tableHead(); }
      pn.forEach((t, i) => text(C[0].x + 4, y + 9 + i * 11, t, 8.5, true));
      desc.forEach((t, i) => text(C[1].x, y + 9 + i * 11, t, 8.5));
      set.forEach((t, i) => text(C[1].x, y + 9 + (desc.length + i) * 11, t, 8, true, BLUE));
      text(C[2].x + C[2].w - textW(String(qty), 9, true), y + 9, String(qty), 9, true);
      text(C[3].x + C[3].w - textW(order, 8.5), y + 9, order, 8.5);
      y += hh; hline(M, PW - M, y - 2);
    }
    function groupRow(g) { need(30); text(M + 4, y + 10, g.toUpperCase(), 7.5, true, MUTED); y += 15; }

    newPage();
    // totals
    const T = P.totals;
    const tiles = [[fmt(T.bars), "light bars"], [fmt(T.feeds), "power feeds"], [fmt(T.sensors), "sensors"], [fmt(T.watts) + " W", "connected load"]];
    const tw = (PW - 2 * M - 3 * 8) / 4;
    tiles.forEach(([v, k], i) => { const x = M + i * (tw + 8); rect(x, y, tw, 40, [0.95, 0.95, 0.97]); text(x + 10, y + 19, v, 15, true, BLUE); text(x + 10, y + 32, k, 8, false, MUTED); });
    y += 56;
    text(M, y, "Everything to order", 12.5, true); y += 10;
    tableHead();
    let g = null;
    for (const l of P.lines) { if (l.g !== g) { g = l.g; groupRow(g); } row(l, fmt(l.qty), E.orderText(l)); }
    y += 6;
    wrap("Parts sold in packs are rounded up to whole packs in the Order column. \"Set to\" is the FlexWatt and FlexColor switch position for each bar; we can preset it at the factory.", 8, false, PW - 2 * M).forEach(t => { need(12); text(M, y + 8, t, 8, false, MUTED); y += 11; });
    // areas
    P.per.forEach((r, i) => {
      y += 16; need(90);
      text(M, y + 4, `${i + 1}. ${areaTitle(state.areas[i], i)}`, 12.5, true); y += 18;
      wrap(areaSummary(r) + " · " + areaSpec(r), 9, false, PW - 2 * M).forEach(t => { need(12); text(M, y + 2, t, 9, false, MUTED); y += 12; });
      y += 4;
      tableHead();
      r.lines.forEach(l => row(l, fmt(l.qty), E.orderText(l)));
      y += 4;
      r.notes.forEach(n => { const ls = wrap(n, 8.5, false, PW - 2 * M - 12); need(ls.length * 11 + 4); text(M, y + 8, "•", 8.5, true, BLUE); ls.forEach((t, j) => text(M + 12, y + 8 + j * 11, t, 8.5)); y += ls.length * 11 + 3; });
    });
    y += 14; need(40);
    wrap("This list is a recommendation from the LBI spec sheets. Our team checks every quote and confirms quantities, settings and lead times with you. Send it to sales@led-llc.com or call 847.380.3540.", 8.5, false, PW - 2 * M).forEach(t => { need(12); text(M, y + 8, t, 8.5, false, MUTED); y += 11; });

    // footers
    pages.forEach((o, i) => {
      ops = o;
      hline(M, PW - M, PH - M + 4);
      text(M, PH - M + 16, "Light Efficient Design · 188 S. Northwest Highway, Cary, IL 60013 · 847.380.3540 · sales@led-llc.com", 7.5, false, MUTED);
      const pg = `Page ${i + 1} of ${pages.length}`; text(PW - M - textW(pg, 7.5), PH - M + 16, pg, 7.5, false, MUTED);
    });

    // assemble
    const objs = [];   // index = object number - 1
    const enc = new TextEncoder();
    const add = (s) => { objs.push(s); return objs.length; };
    const catalog = add(null), pagesObj = add(null);
    const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    const f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const im = logo ? add({ img: logo }) : null;
    const kids = [];
    pages.forEach(o => {
      const content = o.join("\n");
      const c = add(`<< /Length ${enc.encode(content).length} >>\nstream\n${content}\nendstream`);
      kids.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >>${im ? ` /XObject << /Im1 ${im} 0 R >>` : ""} >> /Contents ${c} 0 R >>`));
    });
    objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
    objs[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
    const chunks = []; let len = 0; const offs = [];
    const push = (x) => { const b = typeof x === "string" ? enc.encode(x) : x; chunks.push(b); len += b.length; };
    push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n".replace(/[\u0080-ÿ]/g, "-"));
    objs.forEach((o, i) => {
      offs.push(len);
      if (o && o.img) {
        push(`${i + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${o.img.w} /Height ${o.img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${o.img.bytes.length} >>\nstream\n`);
        push(o.img.bytes); push("\nendstream\nendobj\n");
      } else push(`${i + 1} 0 obj\n${o}\nendobj\n`);
    });
    const xref = len;
    let xr = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    offs.forEach(o => { xr += String(o).padStart(10, "0") + " 00000 n \n"; });
    const info = `/Info << /Title ${hex("LBI Project Builder: " + projectTitle())} /Producer (led-llc.com) >>`;
    push(xr + `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R ${info} >>\nstartxref\n${xref}\n%%EOF\n`);
    download(fileBase() + ".pdf", new Blob(chunks, { type: "application/pdf" }));
  }

  // ------------------------------------------------------------------ quote and link
  function emailQuote() {
    const P = compute();
    const p = state.project;
    const lines = [];
    lines.push("Hello, please quote this LBI project.", "");
    contactLines().forEach(([k, v]) => lines.push(`${k}: ${v}`));
    lines.push("", "AREAS");
    P.per.forEach((r, i) => lines.push(`${i + 1}. ${areaTitle(state.areas[i], i)}: ${areaSummary(r)} (${areaSpec(r)})`));
    lines.push("", "BILL OF MATERIALS");
    P.lines.forEach(l => lines.push(`${E.orderText(l)} | ${l.pn}${l.set ? " | " + l.set : ""}`));
    lines.push("", "Open this list: " + shareLink(), "", "(I can attach the PDF or Excel file from the LBI Project Builder.)");
    const subject = `LBI project quote request${p.name ? ": " + p.name : ""}${p.company ? " (" + p.company + ")" : ""}`;
    location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
  }
  async function copyLink() {
    const url = shareLink();
    try { await navigator.clipboard.writeText(url); $("#pb-copied").textContent = "Link copied. Anyone with the link sees this list."; }
    catch (e) { history.replaceState(null, "", url); $("#pb-copied").textContent = "The link is in the address bar: copy it from there."; }
  }

  // ------------------------------------------------------------------ start
  if (!restore()) {
    state.areas = [E.newArea({ name: "", qty: 20, lamps: 3, lamp: "t8" })];
  }
  state.areas.forEach(a => E.normalize(a));
  if (state.areas.length === 1 && !location.hash) state.open = state.areas[0].id;
  if (location.hash.startsWith("#p=")) history.replaceState(null, "", location.pathname + location.search + "#pb-results");
  renderMode();
  renderAll();
})();
