/* LBI Project Builder: the rules that turn a project description into a bill of materials.
   No page code in here, so the same file runs in the browser (window.LBIPB) and in Node for tests.
   Every part number and limit comes from the spec sheets: RP-LBI (LBI G1, rev. 06.30.26), LBI G2 (07.28.26),
   LBI 65 (07.23.26), LBI MAX (08.25.26), the LBI Color Palette sell sheet and the 2026 catalog (pp. 24-32).
   Where a sheet is silent the rule is marked ASSUMED and listed in notes/catalog-questions.md for David. */
(function (root) {
  "use strict";

  // ------------------------------------------------------------------ catalog facts
  // len: real bar length in inches (a "4 ft" LBI is 43.3 in; the 4.7 in spacer connector brings it to 48 in).
  // watts / lm: FlexWatt settings and lumens at 3500K per setting (LBI 65: DLC values at 2700K; LBI MAX: interpolated).
  // feed: bars on one power feed, by voltage and length; lc120: the 120V limit when linking cables are used.
  const MODELS = {
    g1: {
      id: "g1", name: "LBI G1", kind: "the economical LBI", family: "lbi", lens: [4, 3, 2],
      len: { 2: 19.3, 3: 31.3, 4: 43.3 },
      watts: { 2: [6, 9, 12], 3: [10, 12, 15], 4: [10, 15, 25] },
      lm: { 2: [706, 1063, 1419], 3: [1335, 1648, 1961], 4: [1344, 2255, 3166] },
      def: { 2: 6, 3: 10, 4: 15 },
      ccts: [2700, 3000, 3500, 4000, 5000], cctDef: 4000,
      pn: (L, o) => `RP-LBI-G1-${L}F-${{ 2: 6, 3: 10, 4: 15 }[L]}W-${o.cct <= 3000 ? "27K-WC2" : "40K-WC"}`,
      feed: { 120: { 4: 33, 3: 40, 2: 40 }, hi: { 4: 40, 3: 40, 2: 40 } }, lc120: 24,
      volts: [120, 208, 240, 277], wet: false
    },
    g2: {
      id: "g2", name: "LBI G2", kind: "the everyday LBI", family: "lbi", lens: [4, 3, 2],
      len: { 2: 19.3, 3: 31.3, 4: 43.3 },
      watts: { 2: [6, 8, 10, 12], 3: [10, 12, 15, 18], 4: [12, 15, 20, 25] },
      lm: { 2: [948, 1264, 1580, 1896], 3: [1580, 1896, 2370, 2900], 4: [1896, 2370, 3160, 3950] },
      def: { 2: 6, 3: 10, 4: 15 },
      ccts: [2700, 3000, 3500, 4000, 5000], cctDef: 4000,
      pn: (L, o) => `RP-LBI-G2-${L}F-${{ 2: 6, 3: 10, 4: 15 }[L]}W-40K-WC${o.volts === 347 ? "-CN" : ""}${o.emg ? "-EMG" : ""}`,
      feed: { 120: { 4: 30, 3: 40, 2: 40 }, hi: { 4: 40, 3: 40, 2: 40 } }, lc120: 24,
      volts: [120, 208, 240, 277, 347], wet: false, emgBuiltIn: true
    },
    lbi65: {
      id: "lbi65", name: "LBI 65", kind: "IP65, for wet locations", family: "lbi65", lens: [4, 3, 2],
      len: { 2: 20.7, 3: 32.7, 4: 43.3 },
      watts: { 2: [4, 6, 9, 12], 3: [6, 10, 15, 20], 4: [10, 15, 20, 25] },
      lm: { 2: [620, 914, 1372, 1872], 3: [915, 1525, 2288, 2874], 4: [1505, 2258, 3010, 3824] },
      def: { 2: 6, 3: 10, 4: 25 },
      ccts: [2700, 3000, 3500, 4000, 5000, 5700], cctDef: 4000,
      pn: (L) => `RP-LBI65-${L}F-${{ 2: 6, 3: 10, 4: 25 }[L]}W-40K-WC`,
      feed: { 120: { 4: 30, 3: 40, 2: 40 }, hi: { 4: 40, 3: 40, 2: 40 } }, lc120: 24,
      volts: [120, 208, 240, 277], wet: true
    },
    max: {
      id: "max", name: "LBI MAX", kind: "high lumens for higher ceilings", family: "max", lens: [4, 2],
      len: { 2: 24, 4: 48 },
      watts: { 2: [15, 20, 25, 30], 4: [30, 35, 40, 48] },
      lm: { 2: [1950, 2600, 3250, 3900], 4: [3997, 4673, 5350, 6365] },
      def: { 2: 25, 4: 48 },
      ccts: [3000, 3500, 4000, 5000], cctDef: 4000,
      pn: (L, o) => `RP-LBIMAX-${L}F-${{ 2: 25, 4: 48 }[L]}W-40K-WC${o.sensor || ""}${o.emg ? "-EM1" : ""}`,
      feed: { 120: { 4: 20, 2: 28 }, 208: { 4: 30, 2: 40 }, 240: { 4: 35, 2: 40 }, 277: { 4: 40, 2: 40 } }, lc120: 12,
      volts: [120, 208, 240, 277], wet: false
    },
    plus: {
      id: "plus", name: "LBI Color Palette+", kind: "white light now, any color with the optional remote", family: "lbi", lens: [4, 2],
      len: { 2: 19.3, 4: 43.3 },
      watts: { 2: [6, 8, 10, 12], 4: [12, 15, 20, 25] },
      lm: { 2: [960, 1280, 1600, 1920], 4: [1920, 2400, 3200, 4000] },
      def: { 2: 12, 4: 25 },
      ccts: [2700, 3000, 3500, 4000, 5000], cctDef: 4000,
      pn: (L, o) => `RP-LBI-G2-${L}F-${{ 2: 12, 4: 25 }[L]}W-RGBWW-WC${o.volts === 347 ? "-CN" : ""}`,
      feed: { 120: { 4: 30, 2: 40 }, hi: { 4: 40, 2: 40 } }, lc120: 24,
      volts: [120, 208, 240, 277, 347], wet: false
    },
    palette: {
      id: "palette", name: "LBI Color Palette", kind: "precise colors, two per bar", family: "lbi", lens: [4, 2],
      len: { 2: 19.3, 4: 43.3 },
      watts: { 2: [6, 9, 12], 4: [10, 15, 25] },
      lm: null,
      def: { 2: 6, 4: 25 },
      ccts: [], cctDef: null, color: true,
      pn: (L, o) => `RP-LBI-G2-${L}F-${{ 2: 6, 4: 25 }[L]}W-${PAIRS[o.pair || "RO"].code}`,
      feed: { 120: { 4: 30, 2: 40 }, hi: { 4: 40, 2: 40 } }, lc120: 24,
      volts: [120, 208, 240, 277], wet: false
    }
  };
  const MODEL_ORDER = ["g1", "g2", "lbi65", "max", "palette", "plus"];
  const PAIRS = {
    RO: { code: "RED-WC-ORG", name: "Red / orange" },
    AG: { code: "AMB-WC-GRN", name: "Amber / green" },
    BV: { code: "BLU-WC-VLT", name: "Blue / violet" }
  };

  // Fluorescent lamps being replaced: initial lumens per lamp (typical catalog values) and the length they need.
  const LAMPS = {
    t8: { name: "T8 (F32)", lm: 2800, len: 4 },
    t12: { name: "T12 (F40 or F34)", lm: 2800, len: 4 },
    t5: { name: "T5 (F28)", lm: 2900, len: 4 },
    t5ho: { name: "T5HO (F54)", lm: 5000, len: 4 },
    ubend: { name: "U-bend T8", lm: 2600, len: 2 },
    t8s: { name: "2 ft T8 (F17)", lm: 1400, len: 2 },
    f96: { name: "8 ft T8 or T12 (F96)", lm: 5800, len: 8 },
    f96ho: { name: "8 ft HO (F96HO)", lm: 8800, len: 8 }
  };
  const BALLAST_FACTOR = 0.88;
  // An LED bar puts its light where a bare lamp in a fixture loses about 15 %: "match today" aims at 85 % of the lamp lumens.
  const LEVELS = { saver: 0.7, match: 0.85, brighter: 1.1 };

  const LINK_LENGTHS = { lbi: [3, 6, 12, 18, 24, 36, 48, 60, 72], max: [6, 12, 18, 24, 36, 48, 60, 72], lbi65: [6, 12, 24, 48] };
  const SENSOR_CAPACITY = 15;   // every in-line sensor and node: "control capacity 15 bars"
  // ASSUMED: a seamless connector adds no length between bars ("seamless"); David to confirm.
  const SSC_IN = 0;

  // Accessories: part number, description, pack size, picture (assets/img/acc).
  const ACC = {
    ssc: { pn: "RP-LBI-SSC-DIM-10P", d: "Seamless connector, dimmable", pack: 10, img: "seamless-connector-dimmable.png", g: "Connectors" },
    sscNo: { pn: "RP-LBI-SSC-NODIM-10P", d: "Seamless connector, non-dimming (control zone break)", pack: 10, img: "seamless-connector-non-dimmable.png", g: "Connectors" },
    lc: (n) => ({ pn: `RP-LBI-LC-${n}IN-DIM-10P`, d: `Linking cable, ${n} in, dimmable`, pack: 10, img: "linking-cable-72in.png", g: "Connectors" }),
    lc65: (n) => ({ pn: `RP-LBI65-LC-${n}IN-DIM`, d: `LBI 65 linking cable, ${n} in, dimmable`, pack: 1, img: "linking-cable-48in.png", g: "Connectors" }),
    ip3: { pn: "RP-LBI-G1-IP-3F-DIM", d: "3 ft incoming power kit: hardwire into the fixture or a junction box", pack: 1, img: "3ft-cable-kit.png", g: "Power" },
    ipPlug: { pn: "RP-LBI-G1-IP-7F-120V-SW", d: "7 ft plug-in power cable with on/off switch, 120V outlet", pack: 1, img: "cable-with-switch.png", g: "Power" },
    ip90: { pn: "RP-LBI-G1-IP-90DEG-12F-DIM", d: "12 ft 90° incoming power cable, for suspended bars", pack: 1, img: "90-cable.png", g: "Power" },
    ip65c3: { pn: "RP-LBI65-IPC-12NPT-3FT", d: "LBI 65 conduit adapter, 1/2 in NPT, 3 ft of wire", pack: 1, img: "conduit-adapter.png", g: "Power" },
    ip65c10: { pn: "RP-LBI65-IPC-12NPT-10FT", d: "LBI 65 conduit adapter, 1/2 in NPT, 10 ft of wire", pack: 1, img: "conduit-adapter.png", g: "Power" },
    ip65w3: { pn: "RP-LBI65-IP-3FT", d: "LBI 65 incoming power wire whip, 3 ft", pack: 1, img: "3ft-wire-whip.png", g: "Power" },
    ip65w10: { pn: "RP-LBI65-IP-10FT", d: "LBI 65 incoming power wire whip, 10 ft", pack: 1, img: "3ft-wire-whip.png", g: "Power" },
    tbar: { pn: "RP-LBI-T1516-10P", d: "T-bar clip, parallel to the T-bar", pack: 10, img: null, g: "Mounting" },
    b45: { pn: "RP-LBI-45DEG", d: "45° bracket for coves and displays (works with the included clips)", pack: 1, img: "45-bracket.png", g: "Mounting" },
    sil: { pn: "RP-LBI-SIL-KIT-10P", d: "Suspended in-line kit: bracket, 9.8 ft aircraft cable, gripper, ceiling anchor", pack: 10, img: "suspended-inline-bracket-kit.png", g: "Mounting" },
    spnd65: { pn: "RP-LBI65-SPND-SS-10FT-2P", d: "LBI 65 stainless, waterproof aircraft suspension cable, 10 ft", pack: 2, img: "aircraft-suspension-cable-10ft.png", g: "Mounting" },
    maxSm: { pn: "RP-LBIMAX-SM-LINK", d: "LBI MAX surface mount linking bracket (dimmable seamless connector included)", pack: 1, img: null, g: "Mounting" },
    maxSpnd: { pn: "RP-LBIMAX-SPND-KIT", d: "LBI MAX suspension linking bracket kit: cable, gripper, bracket, anchor (dimmable seamless connector included)", pack: 1, img: "suspension-linking-kit.png", g: "Mounting" },
    maxSil: { pn: "RP-LBIMAX-SIL-KIT-2P", d: "LBI MAX suspension kit: two 9.8 ft aircraft cables, grippers and anchors", pack: 1, img: "suspension-linking-kit.png", g: "Mounting" },
    oc2: { pn: "RP-LBI-OC2-A", d: "In-line microwave occupancy + daylight sensor, wide pattern (Simple Lighting Control)", pack: 1, img: null, g: "Controls" },
    oc3: { pn: "RP-LBI-OC3-A", d: "In-line microwave occupancy + daylight sensor, narrow pattern (Simple Lighting Control)", pack: 1, img: null, g: "Controls" },
    pir: { pn: "RP-LBI-PIR-A", d: "In-line passive infrared occupancy + daylight sensor (Simple Lighting Control)", pack: 1, img: null, g: "Controls" },
    bleOc: { pn: "RP-LBI-BLE-OC", d: "In-line Silvair Bluetooth mesh microwave motion + daylight sensor", pack: 1, img: null, g: "Controls" },
    blePir: { pn: "RP-LBI-BLE-PIR-A", d: "In-line Silvair Bluetooth mesh passive infrared motion + daylight sensor", pack: 1, img: null, g: "Controls" },
    bleA: { pn: "RP-LBI-BLE-A", d: "In-line Silvair Bluetooth mesh control node (for wireless switches and sensor groups)", pack: 1, img: null, g: "Controls" },
    pir65: { pn: "RP-LBI65-PIR-A", d: "IP65 in-line passive infrared occupancy + daylight sensor (Simple Lighting Control)", pack: 1, img: null, g: "Controls" },
    blePir65: { pn: "RP-LBI65-BLE-PIR-A", d: "IP65 in-line Silvair Bluetooth mesh passive infrared motion + daylight sensor", pack: 1, img: null, g: "Controls" },
    bleA65: { pn: "RP-LBI65-BLE-A", d: "IP65 in-line Silvair Bluetooth mesh control node", pack: 1, img: null, g: "Controls" },
    ir23: { pn: "RC-REMOTE-IR23", d: "IR23 remote, to change Simple Lighting Control sensor settings (one per project is enough)", pack: 1, img: null, g: "Controls" },
    irwc: { pn: "RC-REMOTE-IRWC", d: "LBI G2 tunable white remote", pack: 1, img: null, g: "Controls" },
    rgb: { pn: "RP-REMOTE-RGB-WC", d: "LBI Color Palette+ RGBWW remote with holster, unlocks color", pack: 1, img: null, g: "Controls" },
    emg8: { pn: "RP-LBI-EMG2-8W-DIM", d: "Remote emergency battery pack, 90 min, up to 100 W of bars", pack: 1, img: null, g: "Emergency" },
    emg25: { pn: "RP-LBI-EMG2-25W-DIM", d: "Remote emergency battery pack, 90 min, up to 300 W of bars", pack: 1, img: null, g: "Emergency" },
    emg65: { pn: "RP-LBI65-EMG-40W", d: "Wet-location emergency LED driver, 90 min, up to 40 W of bars", pack: 1, img: null, g: "Emergency" }
  };

  const MOUNT_NOTE = {
    lbi: "The bars mount with the magnetic clips and self-tapping screws that come with every bar.",
    lbi65: "Each LBI 65 bar mounts with its two included stainless brackets (45° or 90°).",
    max: "LBI MAX mounts with its included hardware: surface mount, or the V-hooks to suspend it."
  };
  const GROUPS = ["Light bars", "Connectors", "Power", "Mounting", "Controls", "Emergency"];

  // Retrofit fixture shapes: lamps across (rows) and how many bar lengths fit along each row.
  const SHAPES = {
    troffer: { "2x4": { rowLen: 4, lamps: 3, lampDef: "t8", lampsAllowed: [2, 3, 4], cable: 12, label: "2x4 troffer", many: "2x4 troffers" },
               "2x2": { rowLen: 2, lamps: 3, lampDef: "t8s", lampsAllowed: [2, 3, 4], cable: 12, label: "2x2 troffer", many: "2x2 troffers" },
               "1x4": { rowLen: 4, lamps: 2, lampDef: "t8", lampsAllowed: [1, 2], cable: 6, label: "1x4 troffer", many: "1x4 troffers" } },
    strip: { "4": { rowLen: 4, lamps: 2, lampDef: "t8", lampsAllowed: [1, 2, 3, 4], cable: 6, label: "4 ft strip or wrap", many: "4 ft strips or wraps" },
             "8": { rowLen: 8, lamps: 2, lampDef: "f96", lampsAllowed: [1, 2, 3, 4], cable: 6, label: "8 ft strip or wrap", many: "8 ft strips or wraps" } },
    vapor: { "4": { rowLen: 4, lamps: 2, lampDef: "t8", lampsAllowed: [1, 2, 3, 4], cable: 6, label: "4 ft vapor tight", many: "4 ft vapor tights" },
             "8": { rowLen: 8, lamps: 2, lampDef: "f96", lampsAllowed: [1, 2, 3, 4], cable: 6, label: "8 ft vapor tight", many: "8 ft vapor tights" } },
    bay: { "4": { rowLen: 4, lamps: 6, lampDef: "t5ho", lampsAllowed: [2, 3, 4, 6, 8], cable: 12, label: "fluorescent low or high bay", many: "fluorescent low or high bays" } }
  };

  // ------------------------------------------------------------------ helpers
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const ftIn = (inches) => {
    const neg = inches < 0; let x = Math.abs(inches);
    let ft = Math.floor(x / 12), i = Math.round((x - ft * 12) * 10) / 10;
    if (i >= 12) { ft += 1; i = 0; }
    const s = ft && i ? `${ft} ft ${i} in` : ft ? `${ft} ft` : `${i} in`;
    return neg ? "-" + s : s;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /** Bars allowed on one feed for a model, length and voltage. */
  function feedLimit(m, L, volts, usesCables) {
    const tbl = m.feed[volts] || (volts === 120 ? m.feed[120] : m.feed.hi) || m.feed.hi;
    let n = tbl[L] || 40;
    if (usesCables && volts === 120) n = Math.min(n, m.lc120);
    return n;
  }

  /** Fill a straight run with the fewest bars and the smallest unlit gap; nothing may be longer than the run. */
  function fillRun(m, runIn) {
    const lens = m.lens;
    const L4 = lens.includes(4) ? m.len[4] : null, L3 = lens.includes(3) ? m.len[3] : null, L2 = lens.includes(2) ? m.len[2] : null;
    let best = null;
    const max4 = L4 ? Math.floor(runIn / L4) : 0;
    for (let a = max4; a >= Math.max(0, max4 - 3); a--) {
      for (let b = 0; b <= (L3 ? 4 : 0); b++) {
        for (let c = 0; c <= (L2 ? 4 : 0); c++) {
          const n = a + b + c;
          if (!n) continue;
          const len = a * (L4 || 0) + b * (L3 || 0) + c * (L2 || 0) + (n - 1) * SSC_IN;
          if (len > runIn + 0.01) continue;
          const gap = runIn - len;
          const score = gap + n * 0.4;   // a few inches of extra light is worth less than an extra bar to stock
          if (!best || score < best.score - 1e-9) best = { a, b, c, n, len, gap, score };
        }
      }
    }
    if (!best) best = { a: 0, b: 0, c: 0, n: 0, len: 0, gap: runIn, score: 0 };
    const seq = [];   // longest bars first, short ones at the far end where a trim piece is least noticed
    for (let i = 0; i < best.a; i++) seq.push(4);
    for (let i = 0; i < best.b; i++) seq.push(3);
    for (let i = 0; i < best.c; i++) seq.push(2);
    return { seq, lit: best.len, gap: best.gap };
  }

  /** Split a run (list of bar lengths) into power segments within the feed limit, as evenly as possible. */
  function splitFeeds(m, seq, volts, usesCables) {
    const load = seq.reduce((s, L) => s + 1 / feedLimit(m, L, volts, usesCables), 0);
    const k = Math.max(1, Math.ceil(load - 1e-9));
    const out = []; let i = 0;
    for (let s = 0; s < k; s++) {
      const take = Math.round((seq.length - i) / (k - s));
      out.push(seq.slice(i, i + take)); i += take;
    }
    // if rounding left a segment over its limit, move bars on
    for (let s = 0; s < out.length; s++) {
      while (out[s].reduce((t, L) => t + 1 / feedLimit(m, L, volts, usesCables), 0) > 1 + 1e-9) {
        if (s + 1 >= out.length) out.push([]);
        out[s + 1].unshift(out[s].pop());
      }
    }
    return out.filter(x => x.length);
  }

  /** Split a segment into control zones of at most SENSOR_CAPACITY bars. */
  function zonesOf(n) {
    const z = Math.max(1, Math.ceil(n / SENSOR_CAPACITY));
    const out = []; let left = n;
    for (let i = 0; i < z; i++) { const t = Math.round(left / (z - i)); out.push(t); left -= t; }
    return out;
  }

  // Run shapes. A tray ceiling is a closed square or rectangle: straight sides with seamless connectors, a 12 in linking
  // cable around each corner (David, 2026-11-05). The chain starts at one corner with the power feed and ends back at that
  // corner, so a closed tray has one corner left unlinked.
  const SHAPE_SIDES = { line: (a) => [a.runFt], tray: (a) => [a.sideA, a.sideB, a.sideA, a.sideB], u: (a) => [a.sideA, a.sideB, a.sideA], l: (a) => [a.sideA, a.sideB] };
  const SHAPE_NAME = { line: "straight run", tray: "tray ceiling", u: "three-sided cove", l: "L-shaped cove" };
  const CORNER_IN = 12;
  function sidesOf(a) { return (SHAPE_SIDES[a.shape] || SHAPE_SIDES.line)(a).map(x => +x || 0); }

  function wattIndex(m, L, target) {
    const lm = m.lm && m.lm[L];
    if (!lm) return m.watts[L].indexOf(m.def[L]);
    for (let i = 0; i < lm.length; i++) if (lm[i] >= target) return i;
    return lm.length - 1;
  }

  // ------------------------------------------------------------------ area defaults and recommendation
  let seq = 0;
  function newArea(over) {
    seq += 1;
    return Object.assign({
      id: "a" + Date.now().toString(36) + seq, name: "", job: "retrofit", app: "troffer", size: "2x4", qty: 10,
      lamps: null, lamp: null, runFt: 40, runs: 1, shape: "line", sideA: 16, sideB: 12, env: "dry", model: "auto", barLen: 4, barsPer: null, cct: null, level: "match",
      watt: null, pair: "RO", mount: "surface", aim: "flat", volts: 120, feed: "hardwire", lead65: 3, chain: false, gapIn: 24,
      ctl: "none", sensor: "oc2", meshKind: "sensor", place: "end", emg: 0, emgKind: "remote", irwc: false, rgb: true
    }, over || {});
  }

  /** The model the builder suggests for an area, and why. */
  function recommend(a) {
    if (a.env === "wet") return { id: "lbi65", why: "Wet or outdoor location: LBI 65 is IP65 rated and UL listed for wet locations." };
    if (a.job === "retrofit" && a.app === "bay") {
      const lamp = a.lamp || "t5ho";
      if (lamp === "t5ho" || lamp === "f96ho" || (a.lamps || 6) >= 6) return { id: "max", why: "High-output bays: LBI MAX gives up to 6,365 lumens from a 4 ft strip." };
    }
    return { id: "g2", why: "LBI G2 is the everyday LBI: up to 160 lumens per watt, 4 wattages and 5 color temperatures on the bar." };
  }

  function modelFor(a) {
    const id = a.model === "auto" ? recommend(a).id : a.model;
    return MODELS[id] || MODELS.g2;
  }

  /** Normalize an area: fill defaults that depend on other answers and fix combinations the catalog does not offer. */
  function normalize(a) {
    const fixes = [];
    if (a.job === "new" && !["run", "fixtures"].includes(a.app)) a.app = "fixtures";
    if (a.job === "retrofit" && !SHAPES[a.app] && a.app !== "cove") a.app = "troffer";
    if (SHAPES[a.app] && !SHAPES[a.app][a.size]) a.size = Object.keys(SHAPES[a.app])[0];
    if (a.env === "wet" && a.model !== "auto" && a.model !== "lbi65") { fixes.push(`${MODELS[a.model].name} is for dry and damp locations, so this wet area uses LBI 65.`); a.model = "lbi65"; }
    const m = modelFor(a);
    if (!m.lens.includes(+a.barLen)) a.barLen = m.lens[0];
    if (!m.volts.includes(+a.volts)) { fixes.push(`${m.name} is not offered at ${a.volts}V; using 277V.`); a.volts = 277; }
    if (m.color) a.cct = null;
    else if (!m.ccts.includes(+a.cct)) a.cct = m.cctDef;
    if (a.feed === "plug" && +a.volts !== 120) { fixes.push("The plug-in cable is for 120V outlets; using a hardwired feed."); a.feed = "hardwire"; }
    if (m.family === "lbi65" && !["conduit", "whip"].includes(a.feed)) a.feed = "conduit";
    if (m.family !== "lbi65" && ["conduit", "whip"].includes(a.feed)) a.feed = "hardwire";
    if (a.mount === "tbar" && m.family !== "lbi") a.mount = "surface";
    if (a.mount === "cove45" && m.family !== "lbi") a.mount = "surface";
    if (m.family === "lbi65" && a.ctl === "simple") a.sensor = "pir";
    if (m.family === "max" && a.ctl === "simple") a.sensor = "oc2";
    if (m.family === "max" && a.ctl === "mesh" && a.meshKind === "sensor") a.sensor = "oc";
    if (a.emgKind === "builtin" && !m.emgBuiltIn && m.family !== "max") a.emgKind = "remote";
    if (m.family === "max") a.emgKind = "builtin";   // LBI MAX takes its battery inside the strip (-EM1)
    a.qty = clamp(Math.round(+a.qty || 0), 0, 9999);
    a.runs = clamp(Math.round(+a.runs || 0), 0, 999);
    if (!SHAPE_SIDES[a.shape]) a.shape = "line";
    a.sideA = clamp(+a.sideA || 0, 0, 500); a.sideB = clamp(+a.sideB || 0, 0, 500);
    if (a.shape !== "line") a.runFt = Math.round(sidesOf(a).reduce((t, x) => t + x, 0) * 10) / 10;
    a.runFt = clamp(+a.runFt || 0, 0, 2000);
    a.emg = clamp(Math.round(+a.emg || 0), 0, a.app === "run" || a.app === "cove" ? a.runs : a.qty);
    return fixes;
  }

  // ------------------------------------------------------------------ bill of materials for one area
  function areaBom(aIn) {
    const a = Object.assign({}, aIn);
    const fixes = normalize(a);
    const m = modelFor(a);
    const rec = recommend(a);
    const lines = [];       // { key, pn, d, qty, pack, img, g, set }
    const notes = [];       // placement and how-to notes
    const assumptions = []; // things the customer should know we assumed
    const add = (acc, qty, extra) => { if (qty > 0) lines.push(Object.assign({ qty }, acc, extra || {})); };
    const volts = +a.volts;
    const isRun = (a.job === "new" && a.app === "run") || (a.job === "retrofit" && a.app === "cove");
    const cct = a.cct;
    const setLabel = (L, w) => m.color ? `${PAIRS[a.pair].name}, ${w} W` : `Set to ${w} W, ${cct}K`;
    let layout = null;
    let units = 0;          // fixtures or runs
    let barsTotal = 0, wattsTotal = 0, lumensTotal = 0;
    const barCount = {};    // "L|w|emg|sensor" -> qty
    const addBars = (L, w, qty, opts) => {
      const k = [L, w, opts && opts.emg ? 1 : 0, (opts && opts.sensor) || ""].join("|");
      barCount[k] = (barCount[k] || 0) + qty;
      barsTotal += qty; wattsTotal += qty * w;
      const i = m.watts[L].indexOf(w);
      if (m.lm && m.lm[L] && i >= 0) lumensTotal += qty * m.lm[L][i];
    };
    const sensorAcc = () => {
      if (m.family === "lbi65") return a.ctl === "simple" ? ACC.pir65 : a.meshKind === "node" ? ACC.bleA65 : ACC.blePir65;
      if (a.ctl === "simple") return ACC[a.sensor] || ACC.oc2;
      return a.meshKind === "node" ? ACC.bleA : a.sensor === "pir" ? ACC.blePir : ACC.bleOc;
    };
    const maxSuffix = () => a.ctl === "simple" ? "-OC" : a.meshKind === "node" ? "-BT" : "-OCBT";
    const hasSensor = a.ctl === "simple" || a.ctl === "mesh";
    const lcFor = (inches) => {
      const list = LINK_LENGTHS[m.family] || LINK_LENGTHS.lbi;
      const n = list.find(x => x >= inches) || list[list.length - 1];
      return m.family === "lbi65" ? ACC.lc65(n) : ACC.lc(n);
    };
    const feedAcc = () => {
      if (m.family === "lbi65") return a.feed === "whip" ? (a.lead65 === 10 ? ACC.ip65w10 : ACC.ip65w3) : (a.lead65 === 10 ? ACC.ip65c10 : ACC.ip65c3);
      if (a.feed === "plug") return ACC.ipPlug;
      if (a.feed === "pendant" || a.mount === "suspended") return ACC.ip90;
      return ACC.ip3;
    };

    if (!isRun) {
      // ---------------- fixtures: retrofit housings or new individual fixtures
      units = a.qty;
      let rows, perRow, L, cable, w, label, lampLm = 0;
      if (a.job === "retrofit") {
        const sh = SHAPES[a.app][a.size];
        const lamp = LAMPS[a.lamp] || LAMPS[sh.lampDef];
        const lamps = a.lamps || sh.lamps;
        label = sh.label;
        // bars run where the lamps ran: one row per lamp, filled with the longest bars that fit the housing
        L = sh.rowLen === 8 ? 4 : sh.rowLen;
        if (!m.lens.includes(L)) L = m.lens[0];
        perRow = sh.rowLen === 8 ? 2 : 1;
        rows = lamps;
        if (a.app === "troffer" && a.size === "2x2" && (a.lamp || sh.lampDef) === "ubend") rows = Math.max(2, Math.round(lamps * 1.5));
        if (a.app === "bay") {
          // bays: as many bars as it takes to match the lamps, never more rows than lamps
          const target = lamps * lamp.lm * BALLAST_FACTOR * LEVELS[a.level || "match"];
          const top = m.lm ? m.lm[L][m.lm[L].length - 1] : 3000;
          rows = clamp(Math.ceil(target / top), 1, lamps);
        }
        if (a.barsPer) { rows = Math.max(1, Math.round(a.barsPer / perRow)); }
        lampLm = lamps * lamp.lm * BALLAST_FACTOR * LEVELS[a.level || "match"];
        const idx = wattIndex(m, L, lampLm / (rows * perRow));
        w = a.watt && m.watts[L].includes(+a.watt) ? +a.watt : m.watts[L][idx];
        cable = sh.cable;
        if (a.lamps == null) assumptions.push(`${lamps} lamps per fixture`);
        if (a.lamp == null) assumptions.push(`${lamp.name} lamps`);
        if (m.lm && m.lm[L]) {
          const got = rows * perRow * m.lm[L][m.watts[L].indexOf(w)];
          notes.push(`Light level: ${rows * perRow} × ${L} ft bars at ${w} W give about ${fmt(got)} lm per fixture, against about ${fmt(lamps * lamp.lm * BALLAST_FACTOR)} lm from ${lamps} ${lamp.name} lamps on a typical ballast.`);
        }
      } else {
        label = "new fixture";
        L = +a.barLen; perRow = a.barsPer || 1; rows = 1;
        w = a.watt && m.watts[L].includes(+a.watt) ? +a.watt : m.def[L];
        cable = 12;
      }
      const bars = rows * perRow;
      const seams = rows * (perRow - 1);
      const links = rows - 1;
      // emergency
      let emgUnits = Math.min(a.emg, units);
      const builtIn = emgUnits && a.emgKind === "builtin" && (m.emgBuiltIn || m.family === "max");
      // chains of new fixtures on one feed: power and the 0-10V control line run through every linking cable
      let feeds = units, sensorCount = hasSensor ? units : 0, chainNote = null;
      if (a.job === "new" && a.chain && units > 1) {
        const lim = feedLimit(m, L, volts, true);
        let perFeed = Math.max(1, Math.floor(lim / bars));
        const perZone = hasSensor ? Math.max(1, Math.floor(SENSOR_CAPACITY / bars)) : perFeed;
        // LBI 65 lists no non-dimming linking cable to split control zones, so each zone gets its own feed there
        if (hasSensor && m.family === "lbi65") perFeed = Math.min(perFeed, perZone);
        feeds = Math.ceil(units / perFeed);
        let zones = 0;
        for (let f = 0; f < feeds; f++) zones += Math.ceil(Math.min(perFeed, units - f * perFeed) / perZone);
        if (hasSensor) sensorCount = zones;
        const nodim = hasSensor ? zones - feeds : 0;
        const gapLink = lcFor(a.gapIn);
        add(gapLink, units - feeds - nodim, { why: "between fixtures" });
        if (nodim) add(Object.assign({}, gapLink, { pn: gapLink.pn.replace("-DIM", "-NODIM"), d: gapLink.d.replace("dimmable", "non-dimming (control zone break)") }), nodim);
        const n = gapLink.pn.match(/(\d+)IN/)[1];
        chainNote = `Fixtures are linked ${perFeed > 1 ? `up to ${perFeed} on one feed` : "one per feed"} with ${n} in linking cables: ${feeds} incoming power ${feeds === 1 ? "feed" : "feeds"} in all.`;
        if (hasSensor) chainNote += ` Linked fixtures dim together, so there is one sensor for every ${perZone === 1 ? "fixture" : `${perZone} fixtures`} (up to ${SENSOR_CAPACITY} bars)${nodim ? `, with a non-dimming linking cable where one sensor's zone ends` : ""}.`;
        if (+a.gapIn > (LINK_LENGTHS[m.family] || LINK_LENGTHS.lbi).slice(-1)[0]) chainNote += ` The gap is longer than the longest linking cable (${(LINK_LENGTHS[m.family] || LINK_LENGTHS.lbi).slice(-1)[0]} in), so move the fixtures closer or feed each one.`;
      }
      // bars: one bar in some fixtures carries the built-in battery (-EMG / -EM1) or the LBI MAX sensor (-OC, -OCBT, -BT)
      const emgFix = builtIn ? emgUnits : 0;
      const senFix = m.family === "max" ? sensorCount : 0;
      const both = Math.max(0, emgFix + senFix - units);
      const emgOnly = emgFix - both, senOnly = senFix - both;
      if (both) addBars(L, w, both, { emg: true, sensor: maxSuffix() });
      if (emgOnly) addBars(L, w, emgOnly, { emg: true });
      if (senOnly) addBars(L, w, senOnly, { sensor: maxSuffix() });
      const plainBars = units * bars - both - emgOnly - senOnly;
      if (plainBars > 0) addBars(L, w, plainBars);
      add(ACC.ssc, units * seams);
      add(lcFor(cable), units * links, { why: "between rows" });
      add(feedAcc(), feeds);
      // mounting
      if (a.job === "new") {
        if (m.family === "lbi") {
          if (a.mount === "tbar") add(ACC.tbar, units * bars * 2);
          if (a.mount === "cove45") add(ACC.b45, units * bars * 2);
          if (a.mount === "suspended") add(ACC.sil, units * (bars + 1));
        } else if (m.family === "lbi65") {
          if (a.mount === "suspended") add(ACC.spnd65, units * bars * 2);
        } else if (m.family === "max") {
          if (a.mount === "suspended") { add(ACC.maxSil, units); if (seams) { add(ACC.maxSpnd, units * seams); removeQty(lines, ACC.ssc.pn, units * seams); } }
          else if (seams) { add(ACC.maxSm, units * seams); removeQty(lines, ACC.ssc.pn, units * seams); }
        }
      }
      // controls
      if (hasSensor && m.family !== "max") add(sensorAcc(), sensorCount);
      if (chainNote) notes.push(chainNote);
      // emergency
      if (emgUnits && !builtIn) {
        const load = bars * w;
        if (m.family === "lbi65") add(ACC.emg65, emgUnits * Math.ceil(load / 40));
        else add(load <= 100 ? ACC.emg8 : ACC.emg25, emgUnits * (load <= 100 ? 1 : Math.ceil(load / 300)));
      }
      layout = { kind: "fixture", rows, perRow, L, w, bars, sensor: hasSensor, sensorAt: "end", emg: emgUnits > 0, label, job: a.job, app: a.app, size: a.size };
      // notes
      if (a.job === "retrofit") {
        notes.unshift(`Each ${label}: ${bars === 1 ? "1 bar" : `${bars} bars`}${rows > 1 ? ` in ${rows} rows where the lamps were` : ""}${perRow > 1 ? `, ${perRow} bars end to end per row with a seamless connector` : ""}. ${MOUNT_NOTE[m.family]}`);
        if (links) notes.push(`Rows are linked with ${cable} in linking cables, ${links} per fixture: the run snakes from row to row so each cable crosses at one end.`);
        notes.push(`Power: the incoming power kit connects to the existing fixture wiring; remove the old ballast and lamp holders.`);
      } else {
        notes.unshift(`Each fixture: ${bars === 1 ? `1 × ${L} ft bar` : `${bars} × ${L} ft bars end to end with seamless connectors`}.`);
      }
      if (hasSensor) {
        if (chainNote) { /* the chain note covers it */ }
        else if (m.family === "max") notes.push(`Controls: one LBI MAX per fixture is ordered with the sensor built in (${maxSuffix()}).`);
        else notes.push(`Controls: one in-line ${a.ctl === "mesh" ? "Silvair" : ""} sensor per fixture, plugged in at the end of the run (the far end of the last bar, away from the power feed), facing the room. One sensor controls up to ${SENSOR_CAPACITY} bars.`.replace("  ", " "));
      }
    } else {
      // ---------------- continuous runs: coves, lines, perimeters
      units = a.runs;
      const shaped = a.shape && a.shape !== "line";
      const sides = sidesOf(a).map(ft => Object.assign({ ft }, fillRun(m, ft * 12)));
      const runIn = a.runFt * 12;
      const fill = { seq: [].concat(...sides.map(sd => sd.seq)), lit: sides.reduce((t, sd) => t + sd.lit, 0), gap: sides.reduce((t, sd) => t + sd.gap, 0) };
      // what joins bar i to bar i+1: a seamless connector on a straight side, a linking cable around a corner
      const cornerAfter = new Set(); { let k = 0; sides.forEach((sd, i) => { k += sd.seq.length; if (i < sides.length - 1 && sd.seq.length && k < fill.seq.length) cornerAfter.add(k - 1); }); }
      const L = 4;
      const lmTarget = null;
      // the longest bars take the chosen level; shorter bars are set to the closest light per inch, so the run looks even
      const Lmain = fill.seq[0] || m.lens[0];
      const wsMain = m.watts[Lmain];
      let iMain = wsMain.indexOf(m.def[Lmain]);
      if (a.level === "brighter") iMain = Math.min(wsMain.length - 1, iMain + 1);
      if (a.level === "saver") iMain = Math.max(0, iMain - 1);
      if (a.watt && wsMain.includes(+a.watt)) iMain = wsMain.indexOf(+a.watt);
      const perIn = m.lm ? m.lm[Lmain][iMain] / m.len[Lmain] : null;
      const wFor = (len) => {
        if (len === Lmain) return wsMain[iMain];
        if (!perIn) return m.def[len];
        let bi = 0;
        m.lm[len].forEach((v, i) => { if (Math.abs(v / m.len[len] - perIn) < Math.abs(m.lm[len][bi] / m.len[len] - perIn)) bi = i; });
        return m.watts[len][bi];
      };
      const segs = splitFeeds(m, fill.seq, volts, cornerAfter.size > 0);
      let ssc = 0, nodim = 0, sensors = 0, corners = 0, cornersNo = 0, feeds = segs.length;
      const zonesBySeg = segs.map(sg => hasSensor ? zonesOf(sg.length) : [sg.length]);
      { let k = 0;
        segs.forEach((sg, i) => {
          const z = zonesBySeg[i]; let zi = 0, inZ = 0;
          sensors += hasSensor ? z.length : 0;
          sg.forEach((len, bi) => {
            inZ += 1; const zoneEnd = inZ === z[zi]; if (zoneEnd) { zi += 1; inZ = 0; }
            if (bi < sg.length - 1) {
              const corner = cornerAfter.has(k);
              if (corner) { if (zoneEnd) cornersNo += 1; else corners += 1; }
              else if (zoneEnd) nodim += 1; else ssc += 1;
            }
            k += 1;
          });
        });
      }
      const emgRuns = Math.min(a.emg, units);
      for (const len of [4, 3, 2]) {
        const n = fill.seq.filter(x => x === len).length;
        if (!n) continue;
        const w = wFor(len);
        let plainPer = n;
        if (len === fill.seq[0]) {
          if (emgRuns && a.emgKind === "builtin" && (m.emgBuiltIn || m.family === "max")) { addBars(len, w, emgRuns, { emg: true }); plainPer -= 0; }
          if (m.family === "max" && hasSensor) { addBars(len, w, units * sensors, { sensor: maxSuffix() }); }
        }
        let plain = units * n;
        if (len === fill.seq[0]) {
          if (emgRuns && a.emgKind === "builtin" && (m.emgBuiltIn || m.family === "max")) plain -= emgRuns;
          if (m.family === "max" && hasSensor) plain -= units * sensors;
        }
        if (plain > 0) addBars(len, w, plain);
      }
      // connectors and mounting
      if (m.family === "max") {
        const joins = units * (ssc + nodim);
        if (a.mount === "suspended") { add(ACC.maxSpnd, units * ssc); add(ACC.maxSil, units * zonesBySeg.flat().length); }
        else add(ACC.maxSm, units * ssc);
        add(ACC.sscNo, units * nodim);
        void joins;
      } else {
        add(ACC.ssc, units * ssc);
        add(ACC.sscNo, units * nodim);
        if (m.family === "lbi") {
          const b = fill.seq.length;
          if (a.mount === "cove45" || (a.job === "retrofit" && a.aim === "45")) add(ACC.b45, units * b * 2);
          if (a.mount === "tbar") add(ACC.tbar, units * b * 2);
          if (a.mount === "suspended") add(ACC.sil, units * (b + feeds));
        } else if (m.family === "lbi65" && a.mount === "suspended") add(ACC.spnd65, units * fill.seq.length * 2);
      }
      if (corners || cornersNo) {
        const lc = lcFor(CORNER_IN);
        add(lc, units * corners);
        if (cornersNo) add(Object.assign({}, lc, { pn: lc.pn.replace("-DIM", "-NODIM"), d: lc.d.replace("dimmable", "non-dimming (control zone break)") }), units * cornersNo);
      }
      add(feedAcc(), units * feeds);
      if (hasSensor && m.family !== "max") add(sensorAcc(), units * sensors);
      if (emgRuns && !(a.emgKind === "builtin" && (m.emgBuiltIn || m.family === "max"))) {
        const load = fill.seq.reduce((s, len) => s + wFor(len), 0);
        if (m.family === "lbi65") add(ACC.emg65, emgRuns * Math.ceil(load / 40));
        else add(load <= 100 ? ACC.emg8 : ACC.emg25, emgRuns * (load <= 100 ? 1 : Math.ceil(load / 300)));
      }
      const counts = [4, 3, 2].map(len => [len, fill.seq.filter(x => x === len).length]).filter(x => x[1]);
      layout = { kind: "run", seq: fill.seq, segs, zones: zonesBySeg, runIn, lit: fill.lit, gap: fill.gap, sensor: hasSensor, place: a.place, len: m.len, family: m.family,
        shape: a.shape || "line", sides: sides.map(sd => ({ ft: sd.ft, seq: sd.seq, gap: sd.gap })), corners: [...cornerAfter], closed: a.shape === "tray" };
      if (shaped) {
        const desc = (sd) => [4, 3, 2].map(len => [len, sd.seq.filter(x => x === len).length]).filter(x => x[1]).map(([len, n]) => `${n} × ${len} ft`).join(" + ");
        const uniq = [];
        sides.forEach(sd => { const d = `${ftIn(sd.ft * 12)} side${sd.seq.length ? `: ${desc(sd)}` : ""}`; const u = uniq.find(x => x.d === d); if (u) u.n += 1; else uniq.push({ d, n: 1 }); });
        notes.unshift(`Each ${SHAPE_NAME[a.shape]} (${a.shape === "l" ? `${a.sideA} × ${a.sideB} ft` : `${a.sideA} × ${a.sideB} ft`}, ${ftIn(runIn)} around): ${uniq.map(u => `${u.n > 1 ? `${u.n} × ` : ""}${u.d}`).join("; ")}. Bars on each straight side join with seamless connectors; ${corners + cornersNo === 1 ? "the linked corner takes" : `each of the ${corners + cornersNo} linked corners takes`} a ${CORNER_IN} in linking cable${cornersNo ? ` (${cornersNo === corners + cornersNo ? "all" : cornersNo} non-dimming, where a control zone ends at the corner)` : ""}.${cornerAfter.size > corners + cornersNo ? ` Where a new power feed starts at a corner, that corner is not linked.` : ""}${a.shape === "tray" ? " The run starts at one corner with the power feed and goes all the way around, so that last corner stays open: the run simply ends there." : ""} Measure each side along the cove, corner to corner.`);
      } else notes.unshift(`Each ${a.runFt} ft run: ${counts.map(([len, n]) => `${n} × ${len} ft`).join(" + ")} bars end to end with seamless connectors, ${ftIn(fill.lit)} of light${fill.gap > 0.05 ? `, ${ftIn(fill.gap)} short of the full ${a.runFt} ft (split it between the two ends)` : ""}. A ${m.lens.includes(4) ? "\"4 ft\"" : ""} bar is ${m.len[4] || m.len[2]} in long, which is why the count is not simply length ÷ 4.`.replace("A  bar", "A bar"));
      if (segs.length > 1) notes.push(`Power: ${segs.length} feeds per run (at ${volts}V one feed carries up to ${feedLimit(m, 4, volts, cornerAfter.size > 0)} four-foot bars). Feed ${segs.map((s, i) => `${i + 1} powers bars ${segs.slice(0, i).reduce((t, x) => t + x.length, 0) + 1}–${segs.slice(0, i + 1).reduce((t, x) => t + x.length, 0)}`).join(", feed ")}; where two feeds meet, leave the bars unconnected.`);
      else notes.push(`Power: one incoming power feed at the start of each run carries all ${fill.seq.length} bars at ${volts}V.`);
      if (hasSensor) {
        const pos = { end: "at the far end of each zone (away from the feed)", middle: "in the middle of each zone, between two bars", start: "at the start of each zone, next to the power feed" }[a.place] || "";
        const zs = zonesBySeg.flat();
        if (m.family === "max") notes.push(`Controls: ${zs.length} LBI MAX ${zs.length === 1 ? "unit" : "units"} per run ordered with the sensor built in (${maxSuffix()}), one per zone of up to ${SENSOR_CAPACITY} bars.`);
        else notes.push(`Controls: ${zs.length === 1 ? "one in-line sensor per run" : `${zs.length} control zones per run (${zs.join(", ")} bars), one in-line sensor each`}, placed ${pos}. One sensor controls up to ${SENSOR_CAPACITY} bars.`);
        if (nodim) notes.push(`Zones are separated with a non-dimming seamless connector, so each sensor dims only its own bars while power continues down the run.`);
      }
      if (a.job === "retrofit") notes.push(`Remove the old strips or lamp holders and ballasts. ${MOUNT_NOTE[m.family]}`);
      if (counts.length > 1 && perIn) notes.push(`Shorter bars are set to the wattage closest to the light per inch of the ${Lmain} ft bars, so the run looks even.`);
      void lmTarget; void L;
    }

    // light bar lines, longest first, ahead of everything else
    const barLines = [];
    Object.keys(barCount).sort((x, y) => (+y.split("|")[0]) - (+x.split("|")[0]) || ((x.split("|")[2] === "1" || x.split("|")[3]) ? 1 : 0) - ((y.split("|")[2] === "1" || y.split("|")[3]) ? 1 : 0)).forEach(k => {
      const [L, w, e, sensor] = k.split("|");
      const qty = barCount[k];
      if (!qty) return;
      const len = +L, watt = +w;
      const pn = m.pn(len, { cct, volts, emg: e === "1", sensor, pair: a.pair });
      const d = `${m.name}, ${len} ft linkable ${m.family === "max" ? "strip" : "bar"}${e === "1" ? ", built-in emergency battery" : ""}${sensor ? `, built-in ${sensor === "-OC" ? "occupancy sensor" : sensor === "-BT" ? "Silvair node" : "Silvair sensor"}` : ""}`;
      barLines.push({ pn, d, qty, pack: 1, img: null, g: "Light bars", set: setLabel(len, watt), bar: { len, model: m.id } });
    });
    lines.unshift(...barLines);
    // remotes that belong to the area
    if (m.id === "g2" && a.irwc) add(ACC.irwc, 1);
    if (m.id === "plus" && a.rgb) add(ACC.rgb, 1);

    if (m.family === "lbi65") notes.push("Every LBI 65 bar comes with its remote for wattage and color temperature, two mounting brackets (45° and 90°) and stainless screws, and ships with the waterproof end cap and moisture valve installed.");
    if (a.ctl === "dimmer") notes.push("Dimming: connect a 0-10V wall dimmer (by others) to the dimming leads of the incoming power cable; the whole run dims together.");
    if (a.ctl === "mesh") notes.push("Commission the Silvair devices in the Silvair app. Silvair wireless wall switches: ask us which ones to add.");
    if (m.id === "plus") notes.push(a.rgb ? "LBI Color Palette+ ships in white light mode with switches like LBI G2; the RGBWW remote unlocks color for every bar on the job." : "LBI Color Palette+ ships in white light mode with switches like LBI G2; color needs the optional RGBWW remote, sold separately.");
    if (volts === 347) notes.push("347V: the bars are the -CN models for Canada (120-347V).");

    return { area: a, model: m, rec, lines: merge(lines), notes, assumptions, fixes, layout, units, barsTotal, wattsTotal, lumensTotal, isRun };
  }

  function removeQty(lines, pn, n) {
    for (const l of lines) if (l.pn === pn) { const t = Math.min(l.qty, n); l.qty -= t; n -= t; }
    for (let i = lines.length - 1; i >= 0; i--) if (lines[i].qty <= 0) lines.splice(i, 1);
  }

  function merge(lines) {
    const out = [];
    for (const l of lines) {
      const hit = out.find(x => x.pn === l.pn && (x.set || "") === (l.set || ""));
      if (hit) hit.qty += l.qty; else out.push(Object.assign({}, l));
    }
    return out.filter(l => l.qty > 0);
  }

  // ------------------------------------------------------------------ the whole project
  function projectBom(areas, opts) {
    const per = areas.map(areaBom);
    const map = new Map();
    per.forEach((r, i) => r.lines.forEach(l => {
      const k = l.pn + "|" + (l.set || "");
      if (!map.has(k)) map.set(k, Object.assign({}, l, { qty: 0, areas: [] }));
      const x = map.get(k); x.qty += l.qty; x.areas.push({ i, qty: l.qty });
    }));
    // project-wide items
    const anySimple = per.some(r => r.area.ctl === "simple");
    if (anySimple && !(opts && opts.noIr23)) map.set(ACC.ir23.pn, Object.assign({}, ACC.ir23, { qty: 1, areas: [], project: true }));
    const lines = [...map.values()].map(l => Object.assign(l, { order: l.pack > 1 ? Math.ceil(l.qty / l.pack) : l.qty }));
    lines.sort((x, y) => GROUPS.indexOf(x.g) - GROUPS.indexOf(y.g) || (y.bar ? y.bar.len : 0) - (x.bar ? x.bar.len : 0));
    const totals = {
      bars: per.reduce((s, r) => s + r.barsTotal, 0),
      watts: per.reduce((s, r) => s + r.wattsTotal, 0),
      lumens: per.reduce((s, r) => s + r.lumensTotal, 0),
      feeds: lines.filter(l => l.g === "Power").reduce((s, l) => s + l.qty, 0),
      sensors: lines.filter(l => l.g === "Controls" && !/REMOTE/.test(l.pn)).reduce((s, l) => s + l.qty, 0) + lines.filter(l => /-OC|-BT|-OCBT/.test(l.pn) && l.g === "Light bars").reduce((s, l) => s + l.qty, 0),
      parts: lines.length
    };
    return { per, lines, totals };
  }

  /** "4 packs of 10" style order text. */
  function orderText(l) {
    if (l.order == null) l = Object.assign({}, l, { order: l.pack > 1 ? Math.ceil(l.qty / l.pack) : l.qty });
    if (l.pack > 1) return `${l.order} ${l.order === 1 ? "pack" : "packs"} of ${l.pack}`;
    return String(l.qty);
  }

  // ------------------------------------------------------------------ plain-English reader
  const NUMW = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
    thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40,
    fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, dozen: 12, single: 1, double: 2, twin: 2, triple: 3 };
  const ROOMS = ["dining room", "meeting rooms", "meeting room", "conference room", "conference rooms", "board room", "boardroom", "ballroom", "open office", "office", "offices", "lobby", "warehouse", "hallway", "hallways", "corridor", "corridors", "classroom", "classrooms", "break room", "breakroom",
    "kitchen", "parking garage", "garage", "parking deck", "restroom", "restrooms", "bathroom", "stairwell", "stairwells", "stairs", "gym", "gymnasium", "retail", "store",
    "showroom", "conference room", "conference rooms", "lab", "laboratory", "cooler", "coolers", "freezer", "freezers", "canopy", "mechanical room", "shop", "workshop",
    "factory", "plant", "manufacturing", "school", "hospital", "hotel", "restaurant", "bar", "theater", "theatre", "church", "sanctuary", "aisle", "aisles",
    "loading dock", "wash bay", "dock", "storage", "stock room", "back room", "cafeteria", "library", "atrium", "reception", "pool", "car wash", "tunnel", "walkway"];

  function wordsToNumbers(s) {
    // "twenty five" / "twenty-five" -> 25, "a hundred" -> 100, "one hundred twenty" -> 120
    return s.replace(/\b(?:(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|a|an)[\s-]+hundred(?:[\s-]+(?:and[\s-]+)?(\w+)(?:[\s-]+(\w+))?)?)\b/g, (m0, h, t1, t2) => {
      let n = (h === "a" || h === "an" ? 1 : NUMW[h]) * 100;
      let used = m0;
      if (t1 && NUMW[t1] != null && NUMW[t1] < 100) {
        n += NUMW[t1];
        if (t2 && NUMW[t2] != null && NUMW[t2] < 10 && NUMW[t1] >= 20) n += NUMW[t2];
        else if (t2) used = m0.slice(0, m0.lastIndexOf(t2));
      } else if (t1) { used = m0.slice(0, m0.indexOf(t1)); return String(n) + " " + m0.slice(used.length); }
      return String(n) + (used.length < m0.length ? " " + m0.slice(used.length) : "");
    }).replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[\s-]+(one|two|three|four|five|six|seven|eight|nine)\b/g, (m0, t, u) => String(NUMW[t] + NUMW[u]))
      .replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|dozen|single|double|twin|triple)\b/g, (m0) => String(NUMW[m0]));
  }

  const FIXTURE_RE = /\b(troffers?|lay-?ins?|parabolics?|recessed|panels?|strips?|strip lights?|wraps?|wraparounds?|wrap-arounds?|industrials?|channels?|vapou?r[\s-]?tights?|vaportights?|vt'?s|coves?|continuous|perimeter|valances?|high[\s-]?bays?|low[\s-]?bays?|highbays?|lowbays?|bays|fixtures?|lights?|light bars?|lbis?)\b/;

  function detectApp(t) {
    if (/\btray(?:ed)?\b|\bcoves?\b|\bvalances?\b|\bcontinuous\b|\bperimeter\b|\bline of light\b|\brun of\b|\bruns?\b.*\b(?:ft|feet|foot)\b|\b(?:ft|feet|foot)\b.*\bruns?\b/.test(t)) return "cove";
    if (/\bvapou?r[\s-]?tights?\b|\bvaportights?\b|\bvt'?s\b/.test(t)) return "vapor";
    if (/\btroffers?\b|\blay-?ins?\b|\bparabolics?\b|\brecessed\b|\b2\s*x\s*[24]\b|\b1\s*x\s*4\b/.test(t)) return "troffer";
    if (/\bhigh[\s-]?bays?\b|\blow[\s-]?bays?\b|\bhighbays?\b|\blowbays?\b/.test(t)) return "bay";
    if (/\bstrips?\b|\bwraps?\b|\bwrap-?arounds?\b|\bindustrials?\b|\bchannels?\b/.test(t)) return "strip";
    if (/\bfixtures?\b|\blights\b|\blight bars?\b|\blbis?\b|\bbars\b|\blbi\s*(?:65|max|g1|g2)\b/.test(t)) return "generic";
    return null;
  }

  function parse(text) {
    const raw = String(text || "");
    let t = " " + raw.toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/×/g, "x") + " ";
    t = wordsToNumbers(t);
    t = t.replace(/(\d+)\s*(?:'|ft|foot|feet)?\s*(?:x|by)\s*(\d+)\s*(?:'|ft|foot|feet)?/g, (m0, p, q) => ` ${p}x${q} `);
    t = t.replace(/(\d),(\d{3})\b/g, "$1$2");
    // sentences, then "..., and 10 vapor tights" style joins
    const sentences = t.split(/(?<=[.!?;])\s+|\n+/).flatMap(s => s.split(/,?\s+(?:and|plus|also|then)\s+(?=(?:about\s+|another\s+|approximately\s+)?\(?\d+\)?\s)/)).map(s => s.trim()).filter(Boolean);
    const scenarios = [];
    const global = {};
    let cur = null;
    const notes = [];

    for (const s of sentences) {
      const f = readFacts(s);
      const startsNew = f.app && (f.qty != null || f.runFt != null || f.sideA != null);
      if (startsNew && (!cur || cur.app || cur.qty != null)) {
        cur = { src: [] }; scenarios.push(cur);
      } else if (!cur && f.app) { cur = { src: [] }; scenarios.push(cur); }
      const target = cur || global;
      const whole = /\b(?:whole|entire|all|every|everything|throughout|project|building|space|all areas|each area)\b/.test(s) && !f.app;
      for (const [k, v] of Object.entries(f)) {
        if (v == null) continue;
        if (whole && cur && ["ctl", "volts", "env", "cct", "emgAll", "model"].includes(k)) global[k] = v;
        if (target[k] == null || k === "lamps" || k === "lamp") target[k] = v;
      }
      if (target.src) target.src.push(s);
    }
    // global facts fill gaps in every scenario
    if (!scenarios.length && (global.app || global.qty != null || global.runFt != null)) scenarios.push(Object.assign({ src: [] }, global));
    const areas = scenarios.map((sc, i) => toArea(Object.assign({}, global, sc), i, notes));
    return { areas, notes, sentences };
  }

  function readFacts(s) {
    const f = {};
    let x = " " + s + " ";
    const app = detectApp(x);
    if (app) f.app = app;
    // tray ceilings and shaped coves: "a 16 x 12 tray ceiling", "an L-shaped cove 10 by 6"
    const shape = /\btray(?:ed)?\b/.test(x) ? "tray" : /\bl[\s-]?shaped?\b/.test(x) ? "l" : /\bu[\s-]?shaped?\b|\bthree[\s-]sided\b|\b3[\s-]sided\b/.test(x) ? "u" : null;
    if (shape) {
      f.app = "cove"; f.shape = shape;
      const d = x.match(/\b(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)\b/);
      if (d && +d[1] >= 3 && +d[2] >= 3) { f.sideA = +d[1]; f.sideB = +d[2]; x = x.replace(d[0], " SIDES "); }
      else { const one = x.match(/(\d+(?:\.\d+)?)\s*(?:'|ft\b|foot\b|feet\b)\s*(?:square\b|sq\b)?/); if (one && shape === "tray" && /square/.test(x)) { f.sideA = f.sideB = +one[1]; x = x.replace(one[0], " SIDES "); } }
      const n = x.match(/\b(\d+)\s+(?:[a-z-]+\s+){0,2}?(?:tray(?:ed)?|coves?|ceilings?|rooms?|areas?|offices?|suites?)\b/);
      if (n && +n[1] < 1000) { f.qty = +n[1]; x = x.replace(n[0], " QTY "); }
    }
    if (/\bnew\b|\bnew construction\b|\binstall(?:ing)? lbi\b|\bbrand new\b/.test(x) && !/\breplac|\bretrofit|\bexisting\b/.test(x)) f.job = "new";
    if (/\breplac|\bretrofit|\bexisting\b|\bswap|\bupgrad|\bfluorescent\b/.test(x)) f.job = "retrofit";
    // sizes
    const size = x.match(/\b(2x4|4x2|2x2|1x4|4x1)\b/);
    if (size) f.size = { "4x2": "2x4", "4x1": "1x4" }[size[1]] || size[1];
    x = x.replace(/\b\d+x\d+\b/g, " SIZE ");
    // voltage
    const v = x.match(/\b(120|208|240|277|347)\s*(?:v|volts?|vac)?\b/);
    if (v && (/\bv\b|volt|vac|\d\s*v\b/.test(x) || /\b(277|347|208)\b/.test(x))) { f.volts = +v[1]; x = x.replace(v[0], " VOLT "); }
    x = x.replace(/(\d+(?:\.\d+)?)\s*(?:in|inch|inches|"|ft|foot|feet|')\s*(?:apart|between|gap|spacing|on center|o\.?c\.?)/g, " GAP ");
    // lengths: runs, 8 ft fixtures
    const ftm = x.match(/(\d+(?:\.\d+)?)\s*(?:'|ft\b|foot\b|feet\b|lf\b|linear feet\b)/);
    if (ftm) {
      const n = +ftm[1];
      if ((n === 8 || n === 4 || n === 2) && /\b(strip|wrap|vapou?r|vt|fixture|lamp|tube|light)s?\b/.test(x) && !/\bcove|continuous|run\b/.test(x)) {
        if (/^\s*(?:t8|t12|ho|high output|fluorescent)?\s*(?:lamps?|tubes?)\b/.test(x.slice(x.indexOf(ftm[0]) + ftm[0].length))) { if (n === 8) f.lamp = "f96"; }
        else f.size = String(n);
      } else if (n >= 6) f.runFt = n;
      x = x.replace(ftm[0], " LEN ");
    }
    const runsM = x.match(/(\d+)\s+(?:separate\s+|identical\s+|continuous\s+)?(?:runs|rows|coves|lines)\b/);
    if (runsM && f.runFt != null) { f.qty = +runsM[1]; x = x.replace(runsM[0], " RUNS "); }
    // lamps per fixture
    const lampTypes = [["t5ho", /\bt5\s*-?ho\b|\bf54\b|\bt5 high output\b/], ["f96ho", /\bf96\s*-?t?\d*\s*-?ho\b|\b8 ?ft ho\b/], ["f96", /\bf96\b|\b8 ?(?:ft|foot)\s+(?:lamps?|tubes?)\b/], ["ubend", /\bu-?bend\b|\bu-?tubes?\b|\bu-?lamps?\b|\bu-?shaped\b/], ["t12", /\bt12\b|\bf40\b|\bf34\b/], ["t5", /\bt5\b|\bf28\b/], ["t8", /\bt8\b|\bf32\b|\bf17\b/]];
    for (const [k, re] of lampTypes) if (re.test(x)) { f.lamp = k; break; }
    if (f.lamp === "t8" && /\bf17\b|\b2 ?(?:ft|foot)\s+t8\b/.test(x)) f.lamp = "t8s";
    const lampN = x.match(/\(?\b(\d+)\)?\s*(?:-|\s)?(?:lamps?|tubes?|bulbs?)\b/) || x.match(/\(?\b(\d+)\)?\s+(?:[a-z0-9-]+\s+){0,2}?(?:t8|t12|t5ho|t5|f32|f40|f96|f54|f28|fluorescent|u-?bend|lamps|tubes|bulbs)\b/) || x.match(/\b(\d+)[\s-]*lamp\b/);
    if (lampN && +lampN[1] <= 12) { f.lamps = +lampN[1]; x = x.replace(lampN[0], " LAMPS "); }
    // quantity: "quantity 20 of", "(20)", "20 of", first plain number before a fixture word
    let q = x.match(/\b(?:quantity|qty|count of)\s*:?\s*\(?(\d+)\)?/) || x.match(/\(?\b(\d+)\)?\s+(?:of\s+)?(?:the\s+|our\s+|existing\s+|these\s+)?(?:SIZE\s+|LEN\s+)?(?:[a-zA-Z0-9-]+\s+){0,3}?(?:troffers?|lay-?ins?|parabolics?|panels?|strips?|wraps?|wraparounds?|industrials?|channels?|vapou?r[\s-]?tights?|vaportights?|high[\s-]?bays?|low[\s-]?bays?|highbays?|lowbays?|bays|fixtures?|lights?|light bars?|lbis?|bars)\b/);
    if (!q && FIXTURE_RE.test(x)) q = x.match(/\(?\b(\d+)\)?/);
    if (q && f.qty == null && !f.shape && +q[1] > 0 && +q[1] < 10000) f.qty = +q[1];
    // environment
    if (/\bwet\b|\boutdoors?\b|\boutside\b|\bexterior\b|\bcanopy\b|\bcanopies\b|\bparking (?:garage|deck|structure)\b|\bgarage\b|\bcoolers?\b|\bfreezers?\b|\bwash-?down\b|\bcar wash\b|\bwash bay\b|\btunnels?\b|\bip65\b|\bwalk-?in\b|\bpool\b|\bfood process/.test(x)) f.env = "wet";
    // model
    if (/\blbi\s*65\b|\bip65\b/.test(x)) f.model = "lbi65";
    else if (/\blbi\s*max\b|\bhigh lumen/.test(x)) f.model = "max";
    else if (/\bg1\b|\beconomical\b|\bbudget\b|\bcheapest\b|\blowest cost\b/.test(x)) f.model = "g1";
    else if (/\bg2\b/.test(x)) f.model = "g2";
    else if (/\brgb|\bany colou?r|\bcolou?r[\s-]?chang|\bpalette\s*\+|\bpalette plus|\bmulti-?colou?r/.test(x)) f.model = "plus";
    else if (/\b(red|orange|amber|green|blue|violet|purple)\b(?:\s+(?:light|lights|light bars?|colou?r))/.test(x)) { f.model = "palette"; f.pair = /\b(red|orange)\b/.test(x) ? "RO" : /\b(amber|green)\b/.test(x) ? "AG" : "BV"; }
    // color temperature
    const k = x.match(/\b(2700|3000|3500|4000|5000|5700)\s*k?\b/) || x.match(/\b(27|30|35|40|50|57)00?\s*k\b/) || x.match(/\b(27|30|35|40|50|57)k\b/);
    if (k) { let n = +k[1]; if (n < 100) n *= 100; f.cct = n; }
    else if (/\bwarm white\b|\bwarm light\b|\bwarm\b/.test(x)) f.cct = 3000;
    else if (/\bcool white\b|\bdaylight white\b|\bcool\b/.test(x)) f.cct = 5000;
    else if (/\bneutral\b/.test(x)) f.cct = 3500;
    // controls
    if (/\bno controls?\b|\bjust (?:a )?(?:wall )?switch\b|\bon\/off only\b/.test(x)) f.ctl = "none";
    else if (/\bbluetooth\b|\bmesh\b|\bsilvair\b|\bnetwork(?:ed)?\b|\bnlc\b|\bwireless\b/.test(x)) {
      f.ctl = "mesh";
      if (/\bnode\b|\bswitch(?:es)? only\b|\bno sensors?\b|\bwithout (?:a )?sensors?\b/.test(x)) f.meshKind = "node";
      else if (/\bpir\b|\bpassive infrared\b|\binfrared\b/.test(x)) f.sensor = "pir";
    } else if (/\boccupancy\b|\bmotion\b|\bvacancy\b|\bsensors?\b|\bpir\b|\bmicrowave\b|\bdaylight harvest/.test(x)) {
      f.ctl = "simple";
      f.sensor = /\bpir\b|\bpassive infrared\b|\binfrared\b/.test(x) ? "pir" : /\bnarrow\b|\baisle\b/.test(x) ? "oc3" : "oc2";
    } else if (/\bdimm(?:er|ing|able)\b|\b0-10\s*v?\b/.test(x)) f.ctl = "dimmer";
    if (/\btunable white\b|\btune the white\b|\bchange (?:the )?colou?r temp/.test(x)) f.irwc = true;
    // mounting, power
    if (/\bsuspend|\bhung\b|\bhang(?:ing)?\b|\bpendants?\b|\baircraft cable\b|\bcable[\s-]hung\b/.test(x)) f.mount = "suspended";
    else if (/\bt-?bar\b|\bgrid ceiling\b|\bceiling grid\b/.test(x) && !/\btroffer/.test(x)) f.mount = "tbar";
    else if (/\b45\b|\bangled?\b|\btilt/.test(x) && /\bcove\b|\bbracket\b|\bangle/.test(x)) { f.mount = "cove45"; f.aim = "45"; }
    if (/\bplug(?:-?in| in)?\b|\boutlets?\b|\breceptacles?\b/.test(x)) f.feed = "plug";
    if (/\bconduit\b/.test(x)) f.feed = "conduit";
    // fixtures linked on one circuit, and how far apart
    if (/\blink(?:ed|ing)?(?: them)? together\b|\bdaisy[\s-]?chain|\blinked\b|\bone circuit\b|\bsame circuit\b/.test(x)) f.chain = true;
    const gap = s.match(/(\d+(?:\.\d+)?)\s*(in|inch|inches|"|ft|foot|feet|')\s*(?:apart|between|gap|spacing|on center|o\.?c\.?)/);
    if (gap) { f.gapIn = /^(?:in|inch|inches|")$/.test(gap[2]) ? +gap[1] : +gap[1] * 12; f.chain = true; }
    // light level
    if (/\bbrighter\b|\bmore light\b|\bbrighten\b|\bmore lumens\b/.test(x)) f.level = "brighter";
    else if (/\bsave (?:more )?energy\b|\bless light\b|\blower light\b|\bover-?lit\b|\btoo bright\b|\bmaximum savings\b/.test(x)) f.level = "saver";
    // emergency
    if (/\bemergency\b|\bbattery\b|\begress\b|\bbackup\b|\bback-up\b/.test(x)) {
      const en = x.match(/(\d+)\s+(?:of (?:them|those|these)\s+)?(?:\w+\s+){0,3}?(?:on|with|need|needing|have|require)\s+(?:an?\s+)?(?:emergency|battery|egress|backup)/) || x.match(/(?:emergency|battery|egress|backup)\s+(?:\w+\s+){0,3}?(?:on|in|for)\s+(\d+)/);
      if (en) f.emg = +en[1]; else f.emgAll = true;
    }
    // area name
    for (const r of ROOMS) {
      const re = new RegExp("\\b" + r.replace(/ /g, "\\s+") + "\\b");
      if (re.test(s)) { f.name = r.replace(/\b\w/g, c => c.toUpperCase()); break; }
    }
    return f;
  }

  function toArea(sc, i, notes) {
    const a = newArea({ name: sc.name || `Area ${i + 1}` });
    const shown = [];
    const assumed = [];
    a.app = sc.app && sc.app !== "generic" ? sc.app : "troffer";
    if (sc.app === "generic" && !sc.job && sc.env === "wet") sc.job = "new";
    a.job = sc.job || (sc.app === "cove" && sc.lamp == null && !/fluorescent/.test((sc.src || []).join(" ")) ? "new" : "retrofit");
    if (a.job === "new") a.app = sc.app === "cove" || (sc.runFt != null && sc.app !== "strip") ? "run" : "fixtures";
    if (sc.app === "cove" && a.job === "retrofit") a.app = "cove";
    if (!sc.size && (sc.lamp === "f96" || sc.lamp === "f96ho") && (a.app === "strip" || a.app === "vapor")) sc.size = "8";
    if (sc.size && SHAPES[a.app] && SHAPES[a.app][sc.size]) a.size = sc.size;
    else if (SHAPES[a.app]) a.size = Object.keys(SHAPES[a.app])[0];
    if ((a.app === "run" || a.app === "cove") && sc.shape) {
      a.shape = sc.shape; a.runs = sc.qty || 1;
      if (sc.sideA) { a.sideA = sc.sideA; a.sideB = sc.sideB; } else assumed.push(`${a.sideA} × ${a.sideB} ft`);
    } else if (a.app === "run" || a.app === "cove") {
      a.runFt = sc.runFt != null ? sc.runFt : 40; a.runs = sc.qty || 1;
      if (sc.runFt == null) assumed.push("a 40 ft run");
    } else {
      a.qty = sc.qty != null ? sc.qty : 1;
      if (sc.qty == null) assumed.push("1 fixture");
    }
    if (sc.lamps != null) a.lamps = sc.lamps;
    if (sc.lamp) a.lamp = sc.lamp;
    if (a.app === "troffer" && a.size === "2x2" && !sc.lamp) a.lamp = "ubend";
    ["env", "model", "pair", "cct", "ctl", "sensor", "meshKind", "mount", "aim", "feed", "level", "volts", "irwc", "chain", "gapIn"].forEach(k => { if (sc[k] != null) a[k] = sc[k]; });
    if (a.mount === "tbar" && a.job === "retrofit") a.mount = "surface";
    if (sc.emg != null) a.emg = sc.emg; else if (sc.emgAll) a.emg = a.app === "run" || a.app === "cove" ? a.runs : a.qty;
    if (sc.volts == null) assumed.push("120V");
    if (sc.ctl == null) assumed.push("no controls");
    a._src = (sc.src || []).join(" ");
    a._assumed = assumed;
    void shown; void notes;
    return a;
  }

  const api = { SHAPE_NAME, sidesOf, MODELS, MODEL_ORDER, PAIRS, LAMPS, SHAPES, LEVELS, ACC, GROUPS, LINK_LENGTHS, SENSOR_CAPACITY,
    newArea, recommend, modelFor, normalize, areaBom, projectBom, orderText, fillRun, splitFeeds, feedLimit, parse, ftIn, fmt };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LBIPB = api;
})(typeof window !== "undefined" ? window : this);
