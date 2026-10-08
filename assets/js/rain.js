/* Water drops for the waterproof LBI 65.
   Drops fall onto the light bar, splash, bead up on the lens and drip off the bottom edge.
   Markup: any element with data-rain="x0,y0,x1,y1" (the bar's box in its <img>, as fractions of the image), or
   data-rain="line:x0,y0,x1,y1,t" for a bar that runs on a slant: (x0,y0)-(x1,y1) is its top edge and t its
   height, as fractions of the image. A "light;" prefix (or data-rain-tone="light") draws darker water for white backgrounds.
   Script: LEDRain.attach(container, bandFn, {tone}) where bandFn() returns {x, y, w, h, slope} in container pixels
   (slope = how far the top edge drops per pixel to the right; 0 for a level bar).
   Honors prefers-reduced-motion, and only animates while the element is on screen and visible. */
(function () {
  "use strict";
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // Where an <img> actually paints inside its box (object-fit contain/cover, padding), relative to `host`.
  function paintedRect(img, host) {
    const cs = getComputedStyle(img), r = img.getBoundingClientRect(), h = host.getBoundingClientRect();
    const pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0, pt = parseFloat(cs.paddingTop) || 0, pb = parseFloat(cs.paddingBottom) || 0;
    const bw = r.width - pl - pr, bh = r.height - pt - pb;
    const nw = img.naturalWidth || bw, nh = img.naturalHeight || bh, ar = nw / nh;
    let w = bw, hgt = bh;
    const fit = cs.objectFit;
    if (fit === "contain" || fit === "scale-down") { if (bw / bh > ar) w = bh * ar; else hgt = bw / ar; }
    else if (fit === "cover") { if (bw / bh > ar) hgt = bw / ar; else w = bh * ar; }
    const pos = (cs.objectPosition || "50% 50%").split(" ");
    const px = pos[0].endsWith("%") ? parseFloat(pos[0]) / 100 : 0.5, py = (pos[1] || "50%").endsWith("%") ? parseFloat(pos[1] || "50") / 100 : 0.5;
    return { x: r.left - h.left + pl + (bw - w) * px, y: r.top - h.top + pt + (bh - hgt) * py, w, h: hgt };
  }

  function attach(host, bandFn, opts) {
    if (!host || reduce) return { start() {}, stop() {}, destroy() {} };
    opts = opts || {};
    const canvas = document.createElement("canvas");
    canvas.className = "rain";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, dpr = 1, band = null, raf = 0, last = 0, running = false, onScreen = false, wanted = true;
    let drops = [], splashes = [], beads = [], drips = [], acc = 0, age = 0;
    const light = opts.tone === "light";
    const C = light
      ? { streak0: "rgba(70,130,200,0)", streak1: "rgba(55,115,190,0.7)", ring: "60,120,190", spark: "70,135,205", fill: "rgba(185,215,245,0.45)", edge: "50,95,160", hi: "rgba(255,255,255,1)", drip: "rgba(70,135,205,0.85)" }
      : { streak0: "rgba(210,232,255,0)", streak1: "rgba(225,240,255,0.85)", ring: "230,244,255", spark: "235,246,255", fill: "rgba(255,255,255,0.22)", edge: "120,150,190", hi: "rgba(255,255,255,0.95)", drip: "rgba(225,240,255,0.85)" };
    const top = x => band.y + (band.slope || 0) * (x - band.x);   // y of the bar's top edge at x

    function resize() {
      const r = host.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      band = bandFn();
      if (band && band.w > 4) seedBeads();
    }
    function seedBeads() {
      beads = [];
      const n = Math.round(band.w / 26);
      for (let i = 0; i < n; i++) beads.push(newBead());
    }
    function newBead() {
      const x = rnd(band.x + 4, band.x + band.w - 4);
      return { x, y: top(x) + band.h * rnd(0.12, 0.85), r: rnd(1.2, 3.1) * (band.h > 30 ? 1.3 : 1) * (band.h > 120 ? 1.5 : 1), v: 0, slide: Math.random() < 0.35, life: rnd(3, 9) };
    }
    function visible() {
      if (!host.isConnected) return false;
      if (host.classList.contains("ss-slide") && !host.classList.contains("is-on")) return false;
      return host.offsetParent !== null || getComputedStyle(host).position === "fixed";
    }
    function step(t) {
      raf = 0;
      if (!running) return;
      const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      if (!band || band.w < 4) { band = bandFn(); }
      // the bar can change size or move (a new length in the configurator, a layout shift): follow it
      if ((age += dt) > 0.4) { age = 0; const nb = bandFn(); if (nb && band && (Math.abs(nb.w - band.w) > 2 || Math.abs(nb.x - band.x) > 2 || Math.abs(nb.y - band.y) > 2 || Math.abs(nb.h - band.h) > 2)) { band = nb; seedBeads(); } }
      ctx.clearRect(0, 0, W, H);
      if (band && band.w > 4 && visible()) {
        // spawn falling drops over the bar
        const rate = (band.w / 1000) * (opts.rate || 34);
        acc += rate * dt;
        while (acc >= 1) {
          acc -= 1;
          const x = rnd(band.x, band.x + band.w);
          const t0 = top(x), from = Math.max(0, t0 - rnd(H * 0.25, H * 0.7));
          drops.push({ x, y: from - rnd(0, 40), vy: rnd(H * 0.9, H * 1.4) + 260, len: rnd(9, 18), hit: t0 + rnd(0, band.h * (band.slope ? 0.12 : 0.25)) });
        }
        // falling drops
        ctx.lineCap = "round";
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          d.y += d.vy * dt;
          if (d.y >= d.hit) {
            drops.splice(i, 1);
            const n = 3 + (Math.random() * 3 | 0);
            for (let k = 0; k < n; k++) splashes.push({ x: d.x, y: d.hit, vx: rnd(-70, 70), vy: rnd(-150, -60), life: rnd(0.25, 0.45), t: 0 });
            splashes.push({ ring: true, x: d.x, y: d.hit, life: 0.35, t: 0 });
            if (Math.random() < 0.18) { beads.push(Object.assign(newBead(), { x: d.x, y: top(d.x) + band.h * 0.15, slide: true })); if (beads.length > band.w / 14) beads.shift(); }
            continue;
          }
          const g = ctx.createLinearGradient(d.x, d.y - d.len, d.x, d.y);
          g.addColorStop(0, C.streak0); g.addColorStop(1, C.streak1);
          ctx.strokeStyle = g; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(d.x, d.y - d.len); ctx.lineTo(d.x, d.y); ctx.stroke();
        }
        // splashes
        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i]; s.t += dt;
          if (s.t >= s.life) { splashes.splice(i, 1); continue; }
          const k = 1 - s.t / s.life;
          if (s.ring) {
            ctx.strokeStyle = `rgba(${C.ring},${0.55 * k})`; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.ellipse(s.x, s.y, 3 + (1 - k) * 12, 1 + (1 - k) * 3, 0, 0, Math.PI * 2); ctx.stroke();
          } else {
            s.vy += 600 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
            ctx.fillStyle = `rgba(${C.spark},${0.9 * k})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, 1.3, 0, Math.PI * 2); ctx.fill();
          }
        }
        // beads on the lens: a few slide down and drip off the bottom edge
        for (let i = beads.length - 1; i >= 0; i--) {
          const b = beads[i];
          if (b.slide) { b.v = Math.min(b.v + 12 * dt, 26); b.y += b.v * dt; }
          b.life -= dt;
          if (b.y > top(b.x) + band.h - 1) { drips.push({ x: b.x, y: top(b.x) + band.h, vy: 40, r: b.r * 0.9 }); beads[i] = newBead(); continue; }
          if (b.life <= 0) { beads[i] = newBead(); continue; }
          const a = Math.min(1, b.life);
          ctx.globalAlpha = a;
          ctx.fillStyle = C.fill;
          ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r, b.r * (b.slide ? 1.25 : 1), 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = `rgba(${C.edge},${light ? 0.6 : 0.45})`; ctx.lineWidth = light ? 1 : 0.8; ctx.stroke();
          ctx.fillStyle = C.hi;
          ctx.beginPath(); ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, Math.max(0.6, b.r * 0.32), 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        // drips falling from the bar
        for (let i = drips.length - 1; i >= 0; i--) {
          const d = drips[i]; d.vy += 900 * dt; d.y += d.vy * dt;
          if (d.y > H + 10) { drips.splice(i, 1); continue; }
          ctx.fillStyle = C.drip;
          ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r * 0.8, d.r * 1.3, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      raf = requestAnimationFrame(step);
    }
    function start() { wanted = true; sync(); }
    function stop() { wanted = false; sync(); }
    function sync() {
      const go = wanted && onScreen && !document.hidden;
      if (go && !running) { running = true; last = 0; resize(); raf = requestAnimationFrame(step); }
      else if (!go && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; ctx.clearRect(0, 0, W, H); drops = []; splashes = []; drips = []; }
    }
    const io = new IntersectionObserver(es => { onScreen = es.some(e => e.isIntersecting); sync(); }, { rootMargin: "80px" });
    io.observe(host);
    const ro = new ResizeObserver(() => { if (running) resize(); });
    ro.observe(host);
    document.addEventListener("visibilitychange", sync);
    return {
      start, stop, refresh() { if (running) resize(); },
      destroy() { stop(); io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", sync); canvas.remove(); }
    };
  }

  // Images marked with data-rain: the band comes from the image coordinates
  function fromImage(host) {
    const img = host.querySelector("img");
    let spec = host.dataset.rain || "", tone = host.dataset.rainTone;
    if (spec.startsWith("light;")) { tone = "light"; spec = spec.slice(6); }   // white background: darker water
    const line = spec.startsWith("line:");
    const f = spec.replace("line:", "").split(",").map(Number);
    if (!img || f.length !== (line ? 5 : 4) || f.some(isNaN)) return null;
    const make = () => attach(host, () => {
      const p = paintedRect(img, host);
      if (line) {
        const x0 = p.x + f[0] * p.w, y0 = p.y + f[1] * p.h, x1 = p.x + f[2] * p.w, y1 = p.y + f[3] * p.h;
        return { x: x0, y: y0, w: x1 - x0, h: f[4] * p.h, slope: (y1 - y0) / Math.max(1, x1 - x0) };
      }
      return { x: p.x + f[0] * p.w, y: p.y + f[1] * p.h, w: (f[2] - f[0]) * p.w, h: (f[3] - f[1]) * p.h };
    }, { tone });
    if (img.complete && img.naturalWidth) return make();
    img.addEventListener("load", make, { once: true });
    return null;
  }

  window.LEDRain = { attach, paintedRect };
  const init = () => document.querySelectorAll("[data-rain]").forEach(fromImage);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
