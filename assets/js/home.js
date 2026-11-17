/* The home page banner (Kcampbell, 2026-11-11): the banners the team uploads take turns, one every few seconds (the block's
   "seconds"), with no arrows or dots. It pauses while the pointer is on it, while keyboard focus is in it and while the tab is
   hidden; with reduced motion it still turns, without the fade (home.css). */
(function () {
  "use strict";
  document.querySelectorAll(".hm-banner").forEach(function (box) {
    var slides = Array.prototype.slice.call(box.querySelectorAll(".hm-slide"));
    if (slides.length < 2) return;
    var ms = Math.max(3, +box.dataset.seconds || 6) * 1000, i = 0, held = false, timer = 0;
    function show(n) {
      slides[i].classList.remove("on"); slides[i].setAttribute("aria-hidden", "true");
      var a = slides[i].querySelector("a"); if (a) a.setAttribute("tabindex", "-1");
      i = (n + slides.length) % slides.length;
      slides[i].classList.add("on"); slides[i].removeAttribute("aria-hidden");
      a = slides[i].querySelector("a"); if (a) a.removeAttribute("tabindex");
      var img = slides[(i + 1) % slides.length].querySelector("img"); if (img) img.loading = "eager";   // fetch the next one early
    }
    function tick() { clearTimeout(timer); timer = setTimeout(function () { if (!held && !document.hidden) show(i + 1); tick(); }, ms); }
    box.addEventListener("pointerenter", function () { held = true; });
    box.addEventListener("pointerleave", function () { held = false; });
    box.addEventListener("focusin", function () { held = true; });
    box.addEventListener("focusout", function () { held = false; });
    tick();
  });
})();
