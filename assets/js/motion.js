/* Quiet, Apple-style motion (2026-10-08): sections ease up as they scroll into view and the header firms up once the
   page moves. Hero entrances and hover effects are CSS only (site.css, "Motion"). Nothing moves for visitors who ask
   for reduced motion, and anything already on screen when the page opens is left alone so nothing blinks.
   The same file is shared by the standalone LBI page (lbi-website/motion.js); keep the two copies identical. */
(function () {
  "use strict";
  const header = document.querySelector(".site-header");
  if (header) {
    let ticking = false;
    const mark = () => { header.classList.toggle("scrolled", window.scrollY > 8); ticking = false; };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(mark); } }, { passive: true });
    mark();
  }

  const still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still || !("IntersectionObserver" in window)) return;

  const SEL = [
    ".band-head", ".section-head", ".group-head", ".card", ".brand-card", ".find", ".spec-tiles > div", ".case",
    ".video-grid > *", ".gal-grid > *", ".feature > *", ".help-card", ".callout", ".glyph-row", ".table-block",
    ".resources > *", ".next-steps > *", ".related", ".fold", ".eddy-card", ".cmp", ".fam", ".sys article", ".role",
    ".acc-group", ".link-chart", ".soon-line"
  ].join(",");
  const SKIP = ".mega, .drawer, .search, .eddy-page, .stage, .switcher, .site-footer, .home-hero, .page-hero, .brand-hero, .hero";

  function init() {
    const found = Array.from(document.querySelectorAll(SEL)).filter(el => !el.closest(SKIP));
    const set = new Set(found);
    // reveal a block once: children of a block that is itself revealed ride along with it
    const top = found.filter(el => { for (let p = el.parentElement; p; p = p.parentElement) if (set.has(p)) return false; return true; });
    const line = window.innerHeight * 0.92;
    const later = top.filter(el => el.getBoundingClientRect().top > line);
    if (!later.length) return;

    const settle = el => { el.classList.remove("rv", "in"); el.style.removeProperty("--rv-d"); };
    const io = new IntersectionObserver(entries => {
      let k = 0;
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const el = en.target;
        io.unobserve(el);
        // items arriving together (a row of cards) follow one another by a beat
        el.style.setProperty("--rv-d", Math.min(k++, 5) * 70 + "ms");
        el.classList.add("in");
        // hand the element back to its own hover transitions once it has settled
        setTimeout(() => settle(el), 1400);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0 });

    later.forEach(el => { el.classList.add("rv"); io.observe(el); });
    window.addEventListener("beforeprint", () => later.forEach(settle));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
