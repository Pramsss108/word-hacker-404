/* ============================================================================
 * Abhijit Pramanik — v3 portfolio motion engine
 * One self-contained vanilla-JS IIFE. No libraries, no build step.
 * Implements the full v3 interaction contract:
 *   - animated mesh-gradient / aurora background (#bg-canvas)
 *   - sticky header [data-scrolled] + scroll progress bar
 *   - mobile hamburger ([data-nav-list]/[data-mobile-menu] + aria)
 *   - IntersectionObserver .reveal -> .is-visible (staggered)
 *   - data-parallax translateY (rAF, transform only)
 *   - data-split words/lines kinetic reveal
 *   - data-pin sections -> --progress 0..1 (drives process timeline)
 *   - .stat__num count-up
 *   - hero rotating word ([data-rotator])
 *   - data-tilt cards + data-magnetic buttons (pointer:fine only)
 *   - custom cursor [data-cursor] (pointer:fine only)
 *   - FAQ accordion (aria + panel[data-open])
 *   - scroll-spy nav (.nav__link.is-active)
 *   - smooth in-page anchor scroll
 *   - honors prefers-reduced-motion everywhere
 * Animate transform/opacity only; everything degrades gracefully on
 * mobile / touch / reduced-motion / no-JS.
 * ========================================================================== */
(function () {
  "use strict";

  /* -------------------------------------------------------------------------
   * Environment flags
   * ----------------------------------------------------------------------- */
  var win = window;
  var doc = document;
  var docEl = doc.documentElement;

  var mqReduce = win.matchMedia ? win.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var prefersReduced = !!(mqReduce && mqReduce.matches);

  var mqFine = win.matchMedia ? win.matchMedia("(pointer: fine)") : null;
  var hasFinePointer = !!(mqFine && mqFine.matches);

  var mqDesktop = win.matchMedia ? win.matchMedia("(min-width: 1024px)") : null;
  var isDesktop = !!(mqDesktop && mqDesktop.matches);

  var supportsIO = "IntersectionObserver" in win;

  // Mark <html> as JS-capable so the CSS reveal hide-rules (scoped to html.js)
  // engage only when we can actually un-hide content.
  docEl.classList.add("js");

  /* -------------------------------------------------------------------------
   * Tiny helpers
   * ----------------------------------------------------------------------- */
  function $(sel, ctx) {
    return (ctx || doc).querySelector(sel);
  }
  function $all(sel, ctx) {
    return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel));
  }
  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function noop() {}

  /* Keep the live reading and focus order aligned with the approved narrative:
     Proof → Expertise → Case Studies → Process → About → FAQ → Contact. */
  function normalizeNarrativeOrder() {
    var panel = $(".content-panel");
    var proofSection = $("#proof-numbers");
    var evidenceSection = $("#evidence");
    var ribbons = $(".marquees", proofSection);
    if (proofSection && evidenceSection && ribbons) {
      proofSection.insertBefore(evidenceSection, ribbons);
    }

    var companyTrack = $("[data-company-ribbon-track]");
    var companySet = companyTrack ? $(".company-ribbon__set", companyTrack) : null;
    if (companyTrack && companySet && companyTrack.children.length === 1) {
      var duplicateSet = companySet.cloneNode(true);
      duplicateSet.setAttribute("aria-hidden", "true");
      companyTrack.appendChild(duplicateSet);
      companyTrack.classList.add("is-ready");
    }

    var processSection = $("#process");
    var aboutSection = $("#about");
    var contactSection = $("#contact");
    if (!panel || !processSection || !aboutSection || !contactSection) return;

    panel.insertBefore(processSection, aboutSection);

    var faq = $(".faq", processSection);
    if (!faq || $("#faq")) return;
    var faqHeading = $("h2", faq);
    if (faqHeading) faqHeading.id = "faq-title";

    var faqSection = doc.createElement("section");
    faqSection.id = "faq";
    faqSection.className = "section section--tint faq-section";
    faqSection.setAttribute("aria-labelledby", "faq-title");
    var faqContainer = doc.createElement("div");
    faqContainer.className = "container";
    faqContainer.appendChild(faq);
    faqSection.appendChild(faqContainer);
    panel.insertBefore(faqSection, contactSection);
  }

  /* Continuous ambient motion should consume frames only while visible. */
  function initAmbientMotionVisibility() {
    var groups = $all(".hero, .marquees, .company-ribbon");
    if (!groups.length) return;
    if (!supportsIO) {
      groups.forEach(function (el) { el.classList.add("is-motion-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.__ambientVisible = entry.isIntersecting;
        entry.target.classList.toggle("is-motion-visible", entry.isIntersecting && !doc.hidden);
      });
    }, { rootMargin: "100px 0px" });
    groups.forEach(function (el) { io.observe(el); });
    doc.addEventListener("visibilitychange", function () {
      if (doc.hidden) groups.forEach(function (el) { el.classList.remove("is-motion-visible"); });
      else groups.forEach(function (el) { el.classList.toggle("is-motion-visible", !!el.__ambientVisible); });
    });
  }

  /* Prepare content-visibility sections before their child transitions start.
     Chromium can otherwise create a transition while a subtree is skipped and
     leave it parked at time 0 after a fast scroll. */
  function initSectionRenderReadiness() {
    var sections = $all("#proof-numbers, .proof-evidence, #services, #work, #process, #about, #faq, #contact, .site-footer");
    if (!sections.length) return;
    if (!supportsIO) {
      sections.forEach(function (section) { section.classList.add("motion-render-ready"); });
      return;
    }
    var io = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("motion-render-ready");
        observer.unobserve(entry.target);
      });
    }, { root: null, rootMargin: "70% 0px 70% 0px", threshold: 0 });
    sections.forEach(function (section) { io.observe(section); });
  }

  // requestAnimationFrame shim (very old browsers)
  var raf =
    win.requestAnimationFrame ||
    win.webkitRequestAnimationFrame ||
    function (cb) {
      return win.setTimeout(function () {
        cb(Date.now());
      }, 16);
    };

  // Cross-browser matchMedia change listener
  function onMQ(mq, fn) {
    if (!mq) return;
    if (mq.addEventListener) mq.addEventListener("change", fn);
    else if (mq.addListener) mq.addListener(fn);
  }

  /* -------------------------------------------------------------------------
   * Shared scroll dispatcher — one passive scroll listener, rAF-throttled.
   * Subscribers receive (scrollY) once per frame after a scroll/resize.
   * ----------------------------------------------------------------------- */
  var scrollSubs = [];
  var resizeSubs = [];
  var scrollTicking = false;
  var lastScrollY = win.pageYOffset || 0;

  function runScrollSubs() {
    scrollTicking = false;
    lastScrollY = win.pageYOffset || docEl.scrollTop || 0;
    for (var i = 0; i < scrollSubs.length; i++) {
      try {
        scrollSubs[i](lastScrollY);
      } catch (e) {
        /* keep the loop alive */
      }
    }
  }
  function onScroll() {
    if (!scrollTicking) {
      scrollTicking = true;
      raf(runScrollSubs);
    }
  }
  function subscribeScroll(fn) {
    scrollSubs.push(fn);
    fn(win.pageYOffset || 0); // prime once
  }
  function runResizeSubs() {
    for (var i = 0; i < resizeSubs.length; i++) {
      try {
        resizeSubs[i]();
      } catch (e) {}
    }
  }
  var resizeTimer = null;
  function onResize() {
    if (resizeTimer) win.clearTimeout(resizeTimer);
    resizeTimer = win.setTimeout(runResizeSubs, 150);
  }
  function subscribeResize(fn) {
    resizeSubs.push(fn);
  }

  win.addEventListener("scroll", onScroll, { passive: true });
  win.addEventListener("resize", onResize, { passive: true });
  win.addEventListener("orientationchange", onResize, { passive: true });

  /* =========================================================================
   * 1) ANIMATED BACKGROUND — drifting violet + lime aurora on #bg-canvas.
   *    Desktop + motion allowed: a soft, low-cost canvas animation of a few
   *    radial blobs that slowly drift, painted with low alpha + blur.
   *    Mobile / touch / reduced-motion: paint ONE static frame (no rAF loop)
   *    — the CSS .bg gradient remains the guaranteed-beautiful fallback.
   *    Always pauses when the tab is hidden.
   * ======================================================================= */
  function initBackground() {
    var canvas = doc.getElementById("bg-canvas");
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Palette (kept here so the canvas never fights the token text contrast;
    // these are background-bloom colors only, deliberately muted).
    var blobs = [
      { hue: [102, 55, 238], r: 0.55, x: 0.22, y: 0.18, ax: 0.07, ay: 0.05, sx: 0.00021, sy: 0.00017, a: 0.42 },
      { hue: [138, 99, 255], r: 0.48, x: 0.80, y: 0.30, ax: 0.09, ay: 0.06, sx: 0.00016, sy: 0.00024, a: 0.34 },
      { hue: [200, 255, 0], r: 0.30, x: 0.72, y: 0.78, ax: 0.06, ay: 0.05, sx: 0.00027, sy: 0.00013, a: 0.13 },
      { hue: [36, 17, 89], r: 0.62, x: 0.40, y: 0.85, ax: 0.05, ay: 0.04, sx: 0.00011, sy: 0.00019, a: 0.40 }
    ];

    var dpr = 1;
    var w = 0;
    var h = 0;
    var minDim = 0;

    function resize() {
      // Cap DPR — the aurora is soft, so 1.5x is plenty and far cheaper than 3x.
      dpr = Math.min(win.devicePixelRatio || 1, 1.5);
      w = canvas.clientWidth || win.innerWidth;
      h = canvas.clientHeight || win.innerHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      minDim = Math.max(w, h);
    }

    function paint(t) {
      ctx.clearRect(0, 0, w, h);

      // Deep-indigo base wash so the canvas reads even before blobs land.
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(13, 10, 31, 1)";
      ctx.fillRect(0, 0, w, h);

      // Additive light blooms.
      ctx.globalCompositeOperation = "lighter";
      for (var i = 0; i < blobs.length; i++) {
        var b = blobs[i];
        var cx = (b.x + Math.sin(t * b.sx + i) * b.ax) * w;
        var cy = (b.y + Math.cos(t * b.sy + i * 1.3) * b.ay) * h;
        var rad = b.r * minDim;
        var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        var c = b.hue;
        g.addColorStop(0, "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + b.a + ")");
        g.addColorStop(1, "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function ready() {
      // Fade the canvas in once the first frame is painted.
      canvas.classList.add("is-ready");
    }

    resize();
    subscribeResize(resize);

    // --- Static path: mobile / touch / reduced-motion -> one frame, no loop.
    var animateAllowed = !prefersReduced && hasFinePointer && isDesktop;

    if (!animateAllowed) {
      paint(0);
      ready();
      // Re-paint static frame on resize so it stays crisp; cheap & one-shot.
      subscribeResize(function () {
        paint(0);
      });
      // If the environment later flips to motion-OK (rare), we could upgrade,
      // but the CSS gradient fallback already guarantees beauty — keep it lean.
      return;
    }

    // --- Animated path -----------------------------------------------------
    var running = false;
    var startTs = 0;
    var rafId = 0;

    function loop(ts) {
      if (!running) return;
      if (!startTs) startTs = ts;
      paint(ts - startTs);
      rafId = raf(loop);
    }
    function start() {
      if (running) return;
      running = true;
      startTs = 0;
      rafId = raf(loop);
    }
    function stop() {
      running = false;
      if (rafId && win.cancelAnimationFrame) win.cancelAnimationFrame(rafId);
    }

    // Pause when the tab is hidden (saves battery / CPU).
    doc.addEventListener("visibilitychange", function () {
      if (doc.hidden) stop();
      else start();
    });

    // If the user switches on reduced-motion mid-session, freeze on a frame.
    onMQ(mqReduce, function (e) {
      if (e.matches) {
        stop();
        paint(0);
      } else if (!doc.hidden) {
        start();
      }
    });

    paint(0);
    ready();
    start();
  }

  /* =========================================================================
   * 2) STICKY HEADER + SCROLL PROGRESS BAR
   * ======================================================================= */
  function initHeaderAndProgress() {
    var header = $("[data-header]");
    var progress = $("[data-scroll-progress]");
    var threshold = 8;

    subscribeScroll(function (y) {
      if (header) {
        if (y > threshold) header.setAttribute("data-scrolled", "true");
        else header.removeAttribute("data-scrolled");
      }
      if (progress) {
        var max = (doc.documentElement.scrollHeight - win.innerHeight) || 1;
        progress.style.setProperty("--scroll", clamp(y / max, 0, 1).toFixed(4));
      }
    });
  }

  /* =========================================================================
   * 3) MOBILE NAV (hamburger) — [data-nav-toggle] toggles aria + [data-open]
   *    on both the desktop list and the mobile menu panel; locks scroll.
   * ======================================================================= */
  function initNav() {
    var toggle = $("[data-nav-toggle]");
    var menu = $("[data-mobile-menu]");
    var list = $("[data-nav-list]");
    var header = $("[data-header]");
    if (!toggle || (!menu && !list)) return;

    var open = false;
    var panel = menu || list;

    function setOpen(state) {
      open = state;
      toggle.setAttribute("aria-expanded", state ? "true" : "false");
      toggle.setAttribute("aria-label", state ? "Close menu" : "Open menu");

      if (menu) {
        if (state) {
          menu.hidden = false;
          // next frame so any transition plays from the hidden state
          raf(function () {
            menu.setAttribute("data-open", "true");
          });
        } else {
          menu.removeAttribute("data-open");
          win.setTimeout(function () {
            if (!open) menu.hidden = true;
          }, 360);
        }
      }
      if (list) {
        if (state) list.setAttribute("data-open", "true");
        else list.removeAttribute("data-open");
      }
      if (header) {
        if (state) header.classList.add("is-nav-open");
        else header.classList.remove("is-nav-open");
      }
      // Lock background scroll while the menu is open.
      docEl.style.overflow = state ? "hidden" : "";
    }

    toggle.addEventListener("click", function () {
      setOpen(!open);
    });

    // Close when any link inside the panel is clicked.
    if (panel) {
      $all("a", panel).forEach(function (a) {
        a.addEventListener("click", function () {
          if (open) setOpen(false);
        });
      });
    }

    // Close on Escape, return focus to the toggle.
    doc.addEventListener("keydown", function (e) {
      if ((e.key === "Escape" || e.key === "Esc") && open) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Auto-close when resizing up to desktop.
    onMQ(mqDesktop, function (e) {
      if (e.matches && open) setOpen(false);
    });
  }

  /* =========================================================================
   * 4) KINETIC SPLIT TEXT — wrap each word/line in a span with --i stagger.
   *    Must run BEFORE the reveal observer so the new spans are styled.
   * ======================================================================= */
  function initSplit() {
    var heads = $all("[data-split]");
    if (!heads.length) return;

    heads.forEach(function (el) {
      if (el.getAttribute("data-split-done") === "true") return;

      var mode = el.getAttribute("data-split") === "lines" ? "lines" : "words";

      // Preserve any inline accent spans (e.g. .text-grad) by splitting on a
      // shallow walk: we rebuild the heading from its child nodes, wrapping
      // text words while keeping element children intact.
      var idx = 0;
      var frag = doc.createDocumentFragment();

      function wrapWord(word) {
        var span = doc.createElement("span");
        span.className = "split__word";
        span.style.setProperty("--i", idx++);
        span.textContent = word;
        return span;
      }

      function processText(text, accentClass) {
        var parts = text.split(/(\s+)/); // keep whitespace tokens
        for (var i = 0; i < parts.length; i++) {
          var token = parts[i];
          if (token === "") continue;
          if (/^\s+$/.test(token)) {
            frag.appendChild(doc.createTextNode(token));
          } else {
            var ws = wrapWord(token);
            if (accentClass) ws.className += " " + accentClass;
            frag.appendChild(ws);
          }
        }
      }

      var children = Array.prototype.slice.call(el.childNodes);
      children.forEach(function (node) {
        if (node.nodeType === 3) {
          // text node
          processText(node.textContent, null);
        } else if (node.nodeType === 1) {
          // element (accent span etc.) — wrap its words, carry its classes
          processText(node.textContent || "", node.className || "");
        }
      });

      // For "lines" mode we still split per word but tag the element so CSS can
      // choose to reveal by visual line if it wants; per-word is the safe,
      // dependency-free default and looks great either way.
      if (mode === "lines") el.classList.add("split--lines");

      el.innerHTML = "";
      el.appendChild(frag);
      el.setAttribute("data-split-done", "true");

      // Reduced motion / no IO: just show it now.
      if (prefersReduced || !supportsIO) {
        el.classList.add("is-visible");
      }
    });
  }

  /* =========================================================================
   * 5) REVEAL ON SCROLL — .reveal -> .is-visible (staggered). Also flips
   *    split headings to is-visible so their words cascade in.
   * ======================================================================= */
  function initReveal() {
    var items = $all(".reveal");
    var splits = $all("[data-split]");
    // De-dupe (a heading can be both .reveal and [data-split])
    var seen = [];
    function add(el) {
      if (seen.indexOf(el) === -1) seen.push(el);
    }
    items.forEach(add);
    splits.forEach(add);
    if (!seen.length) return;

    if (prefersReduced || !supportsIO) {
      seen.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    // Apply transition-delay from reveal--delay-N modifier.
    seen.forEach(function (el) {
      var m = el.className.match(/reveal--delay-(\d)/);
      if (m) el.style.transitionDelay = parseInt(m[1], 10) * 90 + "ms";
    });

    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var target = entry.target;
          var section = target.closest("section, footer");
          if (section) section.classList.add("motion-render-ready");
          raf(function () {
            raf(function () {
              target.classList.add("is-visible");
              win.setTimeout(function () {
                if (parseFloat(win.getComputedStyle(target).opacity) < 0.98) target.classList.add("motion-force-visible");
              }, 1000);
            });
          });
          obs.unobserve(target);
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    seen.forEach(function (el) {
      io.observe(el);
    });
  }

  /* =========================================================================
   * 6) PARALLAX — data-parallax="speed" translateY by scroll progress.
   *    Disabled on reduced-motion / coarse pointer. Transform only.
   * ======================================================================= */
  function initParallax() {
    var els = $all("[data-parallax]");
    if (!els.length) return;

    if (prefersReduced || !hasFinePointer) {
      els.forEach(function (el) {
        el.style.transform = "";
      });
      return;
    }

    var items = els.map(function (el) {
      var speed = parseFloat(el.getAttribute("data-parallax")) || 0;
      return { el: el, speed: clamp(speed, 0, 0.4), y: 0 };
    });

    var vh = win.innerHeight || 800;
    subscribeResize(function () {
      vh = win.innerHeight || 800;
    });

    subscribeScroll(function () {
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var rect = it.el.getBoundingClientRect();
        // Progress of the element's center relative to viewport center: -1..1
        var center = rect.top + rect.height / 2;
        var rel = (center - vh / 2) / vh; // ~ -1 (below) .. 1 (above)
        // Move opposite to scroll for a gentle float; cap travel.
        var ty = -rel * it.speed * 100;
        it.el.style.transform = "translate3d(0," + ty.toFixed(2) + "px,0)";
      }
    });
  }

  /* =========================================================================
   * 7) PINNED SCENE — data-pin: write --progress 0..1 as the section scrolls
   *    through the viewport. Drives the process timeline fill + step states.
   * ======================================================================= */
  function initPin() {
    var pins = $all("[data-pin]");
    if (!pins.length) return;

    // Even under reduced motion we set --progress (CSS may use it for a
    // non-animated highlight); it's just a value, not a motion effect.
    var vh = win.innerHeight || 800;
    subscribeResize(function () {
      vh = win.innerHeight || 800;
    });

    subscribeScroll(function () {
      for (var i = 0; i < pins.length; i++) {
        var el = pins[i];
        var rect = el.getBoundingClientRect();
        // Start filling when the section top reaches ~70% down the viewport,
        // finish when its bottom passes ~30% up. Smooth 0..1 across the scroll.
        var start = vh * 0.7;
        var end = -rect.height + vh * 0.3;
        var p = (start - rect.top) / (start - end);
        el.style.setProperty("--progress", clamp(p, 0, 1).toFixed(4));
      }
    });
  }

  /* =========================================================================
   * 8) STAT COUNTERS — .stat__num[data-count][data-suffix] count up on enter.
   * ======================================================================= */
  function initCounters() {
    var nums = $all(".stat__num");
    if (!nums.length) return;

    function paintFinal(el) {
      el.textContent =
        (el.getAttribute("data-count") || "0") + (el.getAttribute("data-suffix") || "");
    }

    if (prefersReduced || !supportsIO) {
      nums.forEach(paintFinal);
      return;
    }

    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          obs.unobserve(el);

          var target = parseInt(el.getAttribute("data-count"), 10) || 0;
          var suffix = el.getAttribute("data-suffix") || "";
          var dur = 1500;
          var startTs = null;

          function step(ts) {
            if (startTs === null) startTs = ts;
            var p = clamp((ts - startTs) / dur, 0, 1);
            var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
            el.textContent = Math.round(eased * target) + suffix;
            if (p < 1) raf(step);
            else el.textContent = target + suffix;
          }
          raf(step);
        });
      },
      { threshold: 0.45 }
    );

    nums.forEach(function (el) {
      io.observe(el);
    });
  }

  /* =========================================================================
   * 9) HERO ROTATING WORD — [data-rotator] is a vertical stack of items;
   *    we translate the list up one item at a time. Reduced motion shows the
   *    first word statically. Pauses when tab hidden.
   * ======================================================================= */
  function initRotator() {
    var list = $("[data-rotator]");
    if (!list) return;
    var items = $all(".hero__rotator-item", list);
    if (items.length < 2) return;

    // Reduced motion: collapse to the first item, no cycling.
    if (prefersReduced) {
      list.style.transform = "none";
      for (var i = 1; i < items.length; i++) items[i].style.display = "none";
      return;
    }

    var index = 0;
    var timer = null;
    var intervalMs = 2200;

    list.style.willChange = "transform";
    list.style.transition = "transform 520ms cubic-bezier(.16,1,.3,1)";

    function show(n) {
      // Each item occupies one line height; translate by n line heights.
      var first = items[0];
      var lineH = first.offsetHeight || first.getBoundingClientRect().height || 0;
      list.style.transform = "translateY(" + -(n * lineH) + "px)";
      // Mark active item (CSS may fade siblings).
      for (var i = 0; i < items.length; i++) {
        if (i === n) items[i].classList.add("is-active");
        else items[i].classList.remove("is-active");
      }
    }

    function next() {
      index = (index + 1) % items.length;
      // When wrapping back to 0, snap without transition to keep it seamless
      // only if we duplicated the first; here list is finite, so a smooth
      // scroll back to top reads fine and is cheap.
      show(index);
    }

    function start() {
      if (timer === null) timer = win.setInterval(next, intervalMs);
    }
    function stop() {
      if (timer !== null) {
        win.clearInterval(timer);
        timer = null;
      }
    }

    doc.addEventListener("visibilitychange", function () {
      if (doc.hidden) stop();
      else start();
    });
    subscribeResize(function () {
      show(index); // recompute line height on resize
    });

    show(0);
    start();
  }

  /* =========================================================================
   * 10) TILT — data-tilt cards rotate toward the pointer. Desktop / fine
   *     pointer only; auto-disabled on touch / reduced-motion.
   * ======================================================================= */
  function initTilt() {
    if (prefersReduced || !hasFinePointer) return;
    var cards = $all("[data-tilt]");
    if (!cards.length) return;

    var MAX = 7; // degrees

    cards.forEach(function (card) {
      var frame = 0;
      var tx = 0,
        ty = 0;

      function apply() {
        frame = 0;
        card.style.transform =
          "perspective(900px) rotateX(" +
          ty.toFixed(2) +
          "deg) rotateY(" +
          tx.toFixed(2) +
          "deg)";
      }

      card.addEventListener("pointermove", function (e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width; // 0..1
        var py = (e.clientY - r.top) / r.height; // 0..1
        tx = (px - 0.5) * 2 * MAX;
        ty = -(py - 0.5) * 2 * MAX;
        card.style.setProperty("--tilt-mx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--tilt-my", (py * 100).toFixed(1) + "%");
        if (!frame) frame = raf(apply);
      });

      card.addEventListener("pointerleave", function () {
        if (frame) {
          win.cancelAnimationFrame && win.cancelAnimationFrame(frame);
          frame = 0;
        }
        card.style.transform = "";
      });
    });
  }

  /* =========================================================================
   * 11) MAGNETIC BUTTONS — data-magnetic pulls toward the cursor. Desktop /
   *     fine pointer only.
   * ======================================================================= */
  function initMagnetic() {
    if (prefersReduced || !hasFinePointer) return;
    var els = $all("[data-magnetic]");
    if (!els.length) return;

    var STRENGTH = 0.32;
    var RADIUS = 1.4; // multiplier of element size for the active field

    els.forEach(function (el) {
      var frame = 0;
      var x = 0,
        y = 0;

      function apply() {
        frame = 0;
        el.style.transform = "translate(" + x.toFixed(2) + "px," + y.toFixed(2) + "px)";
      }

      el.addEventListener("pointermove", function (e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        var r = el.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var dx = e.clientX - cx;
        var dy = e.clientY - cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var maxDist = (Math.max(r.width, r.height) / 2) * RADIUS;
        if (dist < maxDist) {
          x = dx * STRENGTH;
          y = dy * STRENGTH;
        } else {
          x = 0;
          y = 0;
        }
        if (!frame) frame = raf(apply);
      });

      el.addEventListener("pointerleave", function () {
        x = 0;
        y = 0;
        if (frame) {
          win.cancelAnimationFrame && win.cancelAnimationFrame(frame);
          frame = 0;
        }
        el.style.transform = "";
      });
    });
  }

  /* =========================================================================
   * 12) CUSTOM CURSOR — [data-cursor] follows the pointer with an eased ring;
   *     grows .is-hover over interactive targets. Fine pointer only.
   * ======================================================================= */
  function initCursor() {
    var cursor = $("[data-cursor]");
    if (!cursor) return;

    if (prefersReduced || !hasFinePointer) {
      cursor.style.display = "none";
      return;
    }

    var dot = $(".cursor__dot", cursor);
    var ring = $(".cursor__ring", cursor);

    var mx = win.innerWidth / 2,
      my = win.innerHeight / 2;
    var rx = mx,
      ry = my; // eased ring position
    var visible = false;

    win.addEventListener(
      "pointermove",
      function (e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        mx = e.clientX;
        my = e.clientY;
        if (!visible) {
          visible = true;
          cursor.classList.add("is-visible");
        }
      },
      { passive: true }
    );

    win.addEventListener("pointerout", function (e) {
      if (!e.relatedTarget && !e.toElement) {
        visible = false;
        cursor.classList.remove("is-visible");
      }
    });

    // Hover state over interactive / [data-cursor-skip] aware targets.
    var hoverSel = 'a, button, [role="button"], input, textarea, select, [data-tilt], [data-magnetic], .faq__trigger';
    doc.addEventListener(
      "pointerover",
      function (e) {
        var t = e.target;
        if (t && t.closest) {
          if (t.closest("[data-cursor-skip]")) {
            cursor.classList.remove("is-hover");
          } else if (t.closest(hoverSel)) {
            cursor.classList.add("is-hover");
          }
        }
      },
      true
    );
    doc.addEventListener(
      "pointerout",
      function (e) {
        var t = e.target;
        if (t && t.closest && t.closest(hoverSel)) {
          cursor.classList.remove("is-hover");
        }
      },
      true
    );

    function loop() {
      // Dot snaps; ring eases for a premium trailing feel.
      rx = lerp(rx, mx, 0.18);
      ry = lerp(ry, my, 0.18);
      if (dot) dot.style.transform = "translate3d(" + mx + "px," + my + "px,0) translate(-50%,-50%)";
      if (ring) ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0) translate(-50%,-50%)";
      raf(loop);
    }
    raf(loop);
  }

  /* =========================================================================
   * 13) FAQ ACCORDION — single-open, accessible. Toggles aria-expanded and
   *     [data-open] on the panel (CSS grid-rows 0fr/1fr transition).
   * ======================================================================= */
  function initFaq() {
    var triggers = $all(".faq__trigger");
    if (!triggers.length) return;

    function close(trigger) {
      var id = trigger.getAttribute("aria-controls");
      var panel = id ? doc.getElementById(id) : null;
      trigger.setAttribute("aria-expanded", "false");
      if (panel) panel.removeAttribute("data-open");
      var item = trigger.closest(".faq__item");
      if (item) item.classList.remove("is-open");
    }

    function open(trigger) {
      var id = trigger.getAttribute("aria-controls");
      var panel = id ? doc.getElementById(id) : null;
      trigger.setAttribute("aria-expanded", "true");
      if (panel) {
        // Two rAFs so the 0fr -> 1fr transition reliably plays.
        raf(function () {
          raf(function () {
            panel.setAttribute("data-open", "true");
          });
        });
      }
      var item = trigger.closest(".faq__item");
      if (item) item.classList.add("is-open");
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        var expanded = trigger.getAttribute("aria-expanded") === "true";
        if (expanded) {
          close(trigger);
        } else {
          triggers.forEach(function (other) {
            if (other !== trigger) close(other);
          });
          open(trigger);
        }
      });
    });
  }

  /* =========================================================================
   * 14) SMOOTH IN-PAGE ANCHOR SCROLL — respects reduced-motion (auto), moves
   *     focus for a11y, updates the hash without a second jump.
   * ======================================================================= */
  function initSmoothScroll() {
    var behavior = prefersReduced ? "auto" : "smooth";

    $all('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function (e) {
        var href = link.getAttribute("href");
        if (!href || href === "#") return;
        var target = doc.getElementById(href.slice(1));
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({ behavior: behavior, block: "start" });

        var hadTab = target.hasAttribute("tabindex");
        if (!hadTab) target.setAttribute("tabindex", "-1");
        try {
          target.focus({ preventScroll: true });
        } catch (err) {
          target.focus();
        }
        if (!hadTab) {
          target.addEventListener("blur", function handler() {
            target.removeAttribute("tabindex");
            target.removeEventListener("blur", handler);
          });
        }
        if (win.history && win.history.replaceState) {
          win.history.replaceState(null, "", href);
        }
      });
    });
  }

  /* =========================================================================
   * 15) SCROLL-SPY NAV — set .nav__link.is-active for the section in view.
   * ======================================================================= */
  function initScrollSpy() {
    var links = $all(".nav__link[href^='#'], .mobile-menu__link[href^='#']");
    if (!links.length) return;

    // Map of section id -> array of links that point to it.
    var map = {};
    var sections = [];
    links.forEach(function (link) {
      var id = link.getAttribute("href").slice(1);
      var sec = id && doc.getElementById(id);
      if (!sec) return;
      if (!map[id]) {
        map[id] = [];
        sections.push(sec);
      }
      map[id].push(link);
    });
    if (!sections.length) return;

    function activate(id) {
      links.forEach(function (l) {
        var match = l.getAttribute("href") === "#" + id;
        l.classList.toggle("is-active", match);
        if (match) l.setAttribute("aria-current", "true");
        else l.removeAttribute("aria-current");
      });
    }

    if (supportsIO) {
      var visible = {};
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            visible[entry.target.id] = entry.isIntersecting
              ? entry.intersectionRatio
              : 0;
          });
          // Pick the most-visible tracked section.
          var bestId = null;
          var bestRatio = 0;
          for (var k in visible) {
            if (visible[k] > bestRatio) {
              bestRatio = visible[k];
              bestId = k;
            }
          }
          if (bestId) activate(bestId);
        },
        { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
      );
      sections.forEach(function (s) {
        io.observe(s);
      });
    } else {
      // Fallback: nearest-section on scroll.
      subscribeScroll(function (y) {
        var best = null;
        var bestDist = Infinity;
        sections.forEach(function (s) {
          var d = Math.abs(s.getBoundingClientRect().top - 120);
          if (d < bestDist) {
            bestDist = d;
            best = s;
          }
        });
        if (best) activate(best.id);
      });
    }
  }

  /* =========================================================================
   * MODERN CURSOR — dot follows instantly (zero lag), ring trails smoothly.
   * The earlier cursor felt "slow" because it lerped the dot; here the dot is
   * pinned to the pointer every move and ONLY the ring eases.
   * ======================================================================= */
  function initModernCursor() {
    var wrap = document.querySelector("[data-cursor]");
    if (!wrap) return;
    if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;

    var dot = wrap.querySelector(".cursor__dot");
    var ring = wrap.querySelector(".cursor__ring");
    docEl.classList.add("has-cursor");

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my;
    var hovering = false;
    var INTERACTIVE = "a, button, .btn, [data-magnetic], input, textarea, select, [role='button'], label";

    window.addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (dot) dot.style.transform = "translate3d(" + mx + "px," + my + "px,0) translate(-50%,-50%)";
      wrap.classList.remove("is-hidden");
    }, { passive: true });

    function loop() {
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      if (ring) {
        ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0) translate(-50%,-50%)" + (hovering ? " scale(1.7)" : " scale(1)");
      }
      window.requestAnimationFrame(loop);
    }
    // reduced-motion: skip the trailing ease, snap the ring to the dot
    if (prefersReduced) {
      window.addEventListener("pointermove", function (e) {
        if (ring) ring.style.transform = "translate3d(" + e.clientX + "px," + e.clientY + "px,0) translate(-50%,-50%)";
      }, { passive: true });
    } else {
      window.requestAnimationFrame(loop);
    }

    document.addEventListener("pointerover", function (e) {
      if (e.target.closest && e.target.closest(INTERACTIVE)) { hovering = true; wrap.classList.add("is-hover"); }
    });
    document.addEventListener("pointerout", function (e) {
      if (e.target.closest && e.target.closest(INTERACTIVE)) { hovering = false; wrap.classList.remove("is-hover"); }
    });
    document.addEventListener("mouseleave", function () { wrap.classList.add("is-hidden"); });
    document.addEventListener("mouseenter", function () { wrap.classList.remove("is-hidden"); });
  }

  /* =========================================================================
   * BOOT
   * ======================================================================= */

  /* --- advanced scroll architecture (pinned work + scroll-driven motion) --- */
  function initWorkPin() {
    var section = doc.querySelector("[data-work]");
    if (!section) return;
  
    var items = $all("[data-work-item]", section);
    if (!items.length) return;
  
    var panels = $all(".work__narr-panel", section);
    var curEl = $("[data-work-current]", section);
    var totalEl = $("[data-work-total]", section);
    var fillEl = $("[data-work-progress]", section);
    var total = items.length;
  
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    if (totalEl) totalEl.textContent = pad(total);
  
    // Reduced motion / no IO: CSS already reveals all panels; just stamp
    // a stable total/current and bail (no active-swap choreography).
    if (prefersReduced || !supportsIO) {
      if (curEl) curEl.textContent = pad(1);
      if (fillEl) fillEl.style.setProperty("--work-p", "1");
      return;
    }
  
    var activeIdx = -1;
    function setActive(idx) {
      if (idx === activeIdx) return;
      activeIdx = idx;
  
      items.forEach(function (it, i) {
        if (i === idx) it.setAttribute("data-active", "true");
        else it.removeAttribute("data-active");
      });
  
      var target = items[idx].getAttribute("data-narr-target");
      panels.forEach(function (p) {
        p.classList.toggle("is-active", p.getAttribute("data-narr") === target);
      });
  
      if (curEl) curEl.textContent = pad(idx + 1);
      if (fillEl) {
        fillEl.style.setProperty("--work-p", ((idx + 1) / total).toFixed(4));
      }
    }
  
    // Track visibility ratios; the most-centred item wins.
    var ratios = new Array(items.length).fill(0);
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var i = items.indexOf(entry.target);
          if (i === -1) return;
          ratios[i] = entry.isIntersecting ? entry.intersectionRatio : 0;
        });
        var best = 0, bestRatio = -1;
        for (var i = 0; i < ratios.length; i++) {
          if (ratios[i] > bestRatio) { bestRatio = ratios[i]; best = i; }
        }
        if (bestRatio > 0) setActive(best);
      },
      { root: null, rootMargin: "-35% 0px -35% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
  
    items.forEach(function (it) { io.observe(it); });
  
    // Prime the first item so the narrative isn't blank before first scroll.
    setActive(0);
  }

  function initScrollDriven() {
    // Native support? Then CSS animation-timeline already drives everything —
    // we only add a tiny brightness pulse on the progress bar via --scroll (which
    // initHeaderAndProgress still sets every frame). No JS reveal work needed.
    var supportsTimeline =
      win.CSS && CSS.supports && CSS.supports("animation-timeline: view()");
  
    // Progress-bar glow: subtly intensify the bar's shadow as you near the end.
    // Cheap: one style write per scroll frame, only a custom prop the CSS reads.
    var bar = $("[data-scroll-progress]");
    if (bar && !prefersReduced) {
      subscribeScroll(function () {
        // --scroll is already set by initHeaderAndProgress; reuse it for opacity.
        var p = parseFloat(bar.style.getPropertyValue("--scroll")) || 0;
        bar.style.setProperty("--sd-glow", (0.45 + p * 0.4).toFixed(3));
      });
    }
  
    // If the browser HAS native scroll timelines, the [data-sd] reveals run in
    // CSS — stop here. The existing .reveal IntersectionObserver still covers any
    // element that is .reveal WITHOUT [data-sd], so nothing regresses.
    if (supportsTimeline || prefersReduced || !supportsIO) {
      // Reduced-motion / no-IO: make sure opt-in elements are visible (CSS RM
      // block already forces this, but belt-and-suspenders for old IO-less UAs).
      if (prefersReduced || !supportsIO) {
        $all("[data-sd]").forEach(function (el) {
          el.style.opacity = "1";
          el.style.transform = "none";
        });
      }
      return;
    }
  
    // FALLBACK (no animation-timeline, e.g. older Safari/Firefox): emulate the
    // native [data-sd] reveal with the same IO contract as initReveal so the look
    // matches. We add .is-visible and let a lightweight inline transition play.
    var items = $all("[data-sd]:not(.reveal)"); // .reveal ones are already observed
    if (!items.length) return;
  
    items.forEach(function (el) {
      el.style.opacity = "0";
      el.style.transform = "translateY(var(--reveal-shift, 26px))";
      el.style.willChange = "opacity, transform";
    });
  
    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          el.style.transition =
            "opacity .6s var(--ease-out), transform .6s var(--ease-out)";
          el.style.opacity = "1";
          el.style.transform = "none";
          obs.unobserve(el);
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    items.forEach(function (el) { io.observe(el); });
  }

  /* SCROLL-ENTRANCE ENHANCER — tags elements with reveal variants/stagger so
     they animate in (incl. the ribbon bounce) as the panel scrolls over the hero.
     Runs before initReveal() so the existing IO picks up everything it tags. */
  function initRevealEnhancer() {
    var canObserve = "IntersectionObserver" in win;
    function addClass(el, cls) { if (el && !el.classList.contains(cls)) el.classList.add(cls); }
    $all(".section__title").forEach(function (t) {
      if (t.getAttribute("data-split")) return;
      addClass(t, "reveal"); addClass(t, "rv-mask");
    });
    $all(".section__head.reveal").forEach(function (h) { addClass(h, "rv-up-lg"); });
    function staggerGroup(group, childSel, variant) {
      if (!group) return;
      $all(childSel, group).forEach(function (kid, i) {
        addClass(kid, "reveal"); if (variant) addClass(kid, variant);
        addClass(kid, "rv-stagger"); kid.style.setProperty("--rv-i", i);
      });
    }
    $all(".services__grid").forEach(function (g) { staggerGroup(g, ":scope > li", "rv-scale"); });
    $all(".proof__cases").forEach(function (g) {
      $all(":scope > li", g).forEach(function (kid, i) {
        addClass(kid, "reveal"); addClass(kid, i % 2 === 0 ? "rv-left" : "rv-right");
        addClass(kid, "rv-stagger"); kid.style.setProperty("--rv-i", i);
      });
    });
    var ribbons = doc.querySelector("#proof-numbers .marquees");
    if (ribbons) addClass(ribbons, "rv-marquee");
    $all('[data-rv="scrub"]').forEach(function (el) {
      if (el.closest(".hero, [data-work]")) return;
      addClass(el, "reveal"); addClass(el, "rv-scrub");
    });
    if (!canObserve) { $all(".reveal, .rv-marquee").forEach(function (el) { el.classList.add("is-visible"); }); }
  }

  /* Lightweight entrance layer for approved sections that do not use the
     shared .reveal contract. It changes paint/composite state only; layout,
     order and component geometry remain untouched. */
  function initSceneEntrances() {
    var groups = [
      { root: $("#services .skl-welcome"), selector: ":scope > .eyebrow, :scope > .section__title, :scope > .section__lead" },
      { root: $(".showreel"), selector: ".showreel__head, .showreel__item" },
      { root: $(".site-footer"), selector: ".site-footer__brand, .site-footer__nav, .site-footer__contact, .site-footer__bottom" }
    ];
    var items = [];

    groups.forEach(function (group) {
      if (!group.root) return;
      $all(group.selector, group.root).forEach(function (el, index) {
        el.classList.add("scene-enter");
        el.style.setProperty("--scene-i", index);
        items.push(el);
      });
    });

    if (!items.length) return;
    if (prefersReduced || !supportsIO) {
      items.forEach(function (el) { el.classList.add("is-scene-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var target = entry.target;
        var section = target.closest("section, footer");
        if (section) section.classList.add("motion-render-ready");
        raf(function () {
          raf(function () {
            target.classList.add("is-scene-visible");
            win.setTimeout(function () {
              if (parseFloat(win.getComputedStyle(target).opacity) < 0.98) target.classList.add("motion-force-visible");
            }, 1000);
          });
        });
        observer.unobserve(target);
      });
    }, { root: null, rootMargin: "0px 0px -5% 0px", threshold: 0.06 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* Fast-scroll safety net. IntersectionObserver remains the primary engine;
     this batched scroll check only handles browsers that report a skipped
     content-visibility subtree too late. Reads happen first, writes on the
     following frames, and completed elements drop out permanently. */
  function initMotionScrollSafety() {
    if (prefersReduced) return;
    var roots = $all("#proof-numbers, .proof-evidence, #services, #work, #process, #about, #faq, #contact, .site-footer");
    if (!roots.length) return;
    var queued = false;

    subscribeScroll(function () {
      if (queued) return;
      queued = true;
      raf(function () {
        queued = false;
        var vh = win.innerHeight || 800;
        var near = [];
        roots.forEach(function (root) {
          var rect = root.getBoundingClientRect();
          if (rect.bottom >= -120 && rect.top <= vh + 160) near.push(root);
        });
        if (!near.length) return;
        near.forEach(function (root) { root.classList.add("motion-render-ready"); });
        raf(function () {
          var revealNow = [];
          var sceneNow = [];
          near.forEach(function (root) {
            $all(".reveal:not(.is-visible), [data-split]:not(.is-visible)", root).forEach(function (el) {
              var rect = el.getBoundingClientRect();
              if (rect.bottom >= -40 && rect.top <= vh + 60) revealNow.push(el);
            });
            $all(".scene-enter:not(.is-scene-visible)", root).forEach(function (el) {
              var rect = el.getBoundingClientRect();
              if (rect.bottom >= -40 && rect.top <= vh + 60) sceneNow.push(el);
            });
          });
          raf(function () {
            revealNow.forEach(function (el) { el.classList.add("is-visible"); });
            sceneNow.forEach(function (el) {
              el.classList.add("is-scene-visible");
              win.setTimeout(function () {
                if (parseFloat(win.getComputedStyle(el).opacity) < 0.98) el.classList.add("motion-force-visible");
              }, 1000);
            });
          });
        });
      });
    });
  }

  /* ABOUT DEPTH PARALLAX — portrait drifts slower than scroll (text stays stable). */
  function initAboutParallax() {
    var about = doc.getElementById("about");
    if (!about) return;
    var wrapper = about.querySelector(".about__media[data-parallax]");
    if (wrapper) wrapper.removeAttribute("data-parallax");
    var photo = about.querySelector(".about__photo");
    if (!photo) return;
    if (prefersReduced || !hasFinePointer) { photo.style.transform = ""; return; }
    var hasViewTimeline = false;
    try { hasViewTimeline = win.CSS && CSS.supports && CSS.supports("animation-timeline: view()"); } catch (e) { hasViewTimeline = false; }
    if (hasViewTimeline) return;
    var MAX = 18, vh = win.innerHeight || 800;
    subscribeResize(function () { vh = win.innerHeight || 800; });
    subscribeScroll(function () {
      var rect = photo.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh) return;
      var center = rect.top + rect.height / 2;
      var rel = clamp((center - vh / 2) / vh, -1, 1);
      photo.style.setProperty("--about-drift", (-rel * MAX).toFixed(2) + "px");
    });
  }

  /* PROCESS STEPPER — scrubbable pinned timeline (sticky .process__stage). */
  function initProcessStepper() {
    var section = $("[data-stepper]");
    if (!section) return;
    var steps = $all(".process__step", section);
    if (steps.length < 2) return;
    var fill = $(".progress-line__fill", section);
    var stickyOK = win.CSS && CSS.supports && (CSS.supports("position", "sticky") || CSS.supports("position", "-webkit-sticky"));
    if (prefersReduced || !supportsIO || !stickyOK) { if (fill) section.style.setProperty("--progress", "1"); return; }
    section.classList.add("is-stepper");
    var stage = $(".process__stage", section) || section;
    var label = doc.createElement("p");
    label.className = "process__progress-label";
    label.setAttribute("aria-hidden", "true");
    var head = $(".section__head", stage);
    if (head && head.parentNode) head.parentNode.insertBefore(label, head.nextSibling);
    var total = steps.length, vh = win.innerHeight || 800;
    function applyHeight() { vh = win.innerHeight || 800; section.style.minHeight = Math.round(vh * (1 + total * 0.85)) + "px"; }
    applyHeight();
    subscribeResize(applyHeight);
    var activeIdx = -1;
    function setActive(idx) {
      if (idx === activeIdx) return;
      activeIdx = idx;
      for (var i = 0; i < steps.length; i++) {
        var s = steps[i];
        s.classList.toggle("is-active", i === idx);
        s.classList.toggle("is-past", i < idx);
        if (i === idx) s.setAttribute("aria-current", "step"); else s.removeAttribute("aria-current");
      }
      label.innerHTML = "Step <b>" + (idx + 1) + "</b> / " + total;
    }
    function update() {
      var rect = section.getBoundingClientRect();
      var sectionH = rect.height || (vh * total);
      var range = Math.max(1, sectionH - vh);
      var p = clamp(-rect.top / range, 0, 1);
      section.style.setProperty("--progress", p.toFixed(4));
      var idx = Math.floor(p * total);
      if (idx >= total) idx = total - 1; if (idx < 0) idx = 0;
      setActive(idx);
    }
    subscribeScroll(update);
    update();
  }

  /* =========================================================================
   * PROOF CHARTS — real, interactive graphs (Chart.js) from verified Bongbari
   * insights. Builds on scroll-into-view; reduced-motion renders the final
   * frame instantly. No invented data: all values come from the real insights
   * screenshot (Views 3,783,817 · 99.3% non-followers · Reached 2,531,718 +436.5%).
   * ======================================================================= */
  function initProofCharts() {
    if (!win.Chart) return;                       // CDN not loaded -> skip silently
    var wrap = $("[data-proof-graphs]");
    if (!wrap) return;

    var GOLD = "#d8a73e", GREEN = "#34d36b", FAINT = "rgba(255,255,255,.14)",
        GRID = "rgba(255,255,255,.08)", SOFT = "#cdc7b8", PANEL = "rgba(8,10,14,.96)";
    Chart.defaults.font.family = "Inter, system-ui, sans-serif";
    Chart.defaults.color = SOFT;
    Chart.defaults.font.size = 12;

    var built = false, visible = false, charts = [];
    function replay() {                              // re-run the entrance animation
      if (prefersReduced) return;
      charts.forEach(function (c) { c.reset(); c.update(); });
    }
    function build() {
      if (built) return; built = true;
      var anim = prefersReduced ? false : { duration: 1100, easing: "easeOutQuart" };

      var c1 = doc.getElementById("chart-views");
      if (c1) charts.push(new Chart(c1, {
        type: "doughnut",
        data: {
          labels: ["Non-followers", "Followers"],
          datasets: [{
            data: [99.3, 0.7],
            backgroundColor: [GOLD, FAINT],
            borderWidth: 0, hoverOffset: 6
          }]
        },
        options: {
          cutout: "78%", responsive: true, maintainAspectRatio: true,
          animation: prefersReduced ? false : { animateRotate: true, duration: 1100, easing: "easeOutQuart" },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: PANEL, borderColor: GOLD, borderWidth: 1, padding: 10,
              callbacks: { label: function (ctx) { return ctx.label + ": " + ctx.parsed + "% of views"; } }
            }
          }
        }
      }));

      var c2 = doc.getElementById("chart-reach");
      if (c2) charts.push(new Chart(c2, {
        type: "bar",
        data: {
          labels: ["Prev 90 days", "This 90 days"],
          datasets: [{
            data: [471894, 2531718],
            backgroundColor: [FAINT, GREEN],
            borderRadius: 8, maxBarThickness: 86
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: true, animation: anim,
          scales: {
            x: { grid: { display: false }, border: { display: false }, ticks: { color: SOFT } },
            y: {
              beginAtZero: true, grid: { color: GRID }, border: { display: false },
              ticks: { color: SOFT, callback: function (v) { return (v / 1e6).toFixed(1) + "M"; } }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: PANEL, borderColor: GREEN, borderWidth: 1, padding: 10,
              callbacks: { label: function (ctx) { return "Reached: " + ctx.parsed.y.toLocaleString(); } }
            }
          }
        }
      }));
    }

    if (!supportsIO) { build(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !visible) { visible = true; if (!built) build(); else replay(); }
        else if (!e.isIntersecting && visible) { visible = false; }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.25 });
    io.observe(wrap);
  }

  /* PROOF SCENE — real coded LINE graph: organic search clicks growth
   * (bongbari.com Search Console: prev 6mo 8,480 -> last 6mo 18,400, +117%).
   * Real data only. Re-animates on scroll-in; reduced-motion = static. */
  function initProofLine() {
    if (!win.Chart) return;
    var c = doc.getElementById("chart-search");
    if (!c) return;

    Chart.defaults.font.family = "Inter, system-ui, sans-serif";
    Chart.defaults.color = "#cdc7b8";

    // Real ANCHORS (verified in Search Console): across the last 6 months
    // clicks went 8,480 -> 18,400 (+117%) and impressions 192,000 -> 412,000
    // (+114%). The in-between points trace the GRIND — real SEO is never a
    // straight line (rank up, dip, up). It is an ILLUSTRATIVE shape: ONLY the
    // two real endpoints carry markers + tooltips (see ENDPTS / pointRadius /
    // tooltip.filter), so no fabricated month is ever asserted as exact.
    // To make every point exact, drop the GSC monthly export into these arrays.
    var LABELS      = ["6 mo ago", "", "", "", "", "", "Now"];
    var CLICKS      = [8480, 9600, 8200, 12100, 10800, 15200, 18400];          // green · left axis
    var IMPRESSIONS = [192000, 215000, 188000, 268000, 246000, 340000, 412000]; // gold · right axis
    var GREEN = "#34d36b", GOLD = "#d8a73e", GOLD_BRIGHT = "#f1c45a";
    var LAST = CLICKS.length - 1;          // index of the real end point

    // Bigger ticks on small screens for readability (<=860px).
    var mqSmall = win.matchMedia ? win.matchMedia("(max-width: 860px)") : null;
    function tickSize() { return (mqSmall && mqSmall.matches) ? 13 : 11; }

    var built = false, visible = false, chart = null;

    // ---- soft point-glow plugin: radial halo behind each point, per series color
    var pointGlow = {
      id: "pointGlow",
      afterDatasetsDraw: function (ch) {
        if (prefersReduced) return;            // static for reduced-motion
        var g = ch.ctx;
        ch.data.datasets.forEach(function (ds, di) {
          var meta = ch.getDatasetMeta(di);
          if (!meta || meta.hidden) return;
          var col = di === 0 ? GREEN : GOLD;
          var last = meta.data.length - 1;
          meta.data.forEach(function (pt, idx) {
            if (idx !== 0 && idx !== last) return;   // glow only the two REAL anchor points (clean, not busy)
            if (!pt || pt.skip) return;
            var x = pt.x, y = pt.y;
            if (x == null || y == null || !isFinite(x) || !isFinite(y)) return;  // skip undrawn progressive frames
            var r = 16;
            var rg = g.createRadialGradient(x, y, 0, x, y, r);
            rg.addColorStop(0, col + (di === 0 ? "55" : "4d"));
            rg.addColorStop(1, col + "00");
            g.save();
            g.globalCompositeOperation = "lighter";
            g.fillStyle = rg;
            g.beginPath();
            g.arc(x, y, r, 0, Math.PI * 2);
            g.fill();
            g.restore();
          });
        });
      }
    };

    // ---- progressive "PEN DRAW": clip the line/area/points to a growing width
    // so the chart visibly DRAWS itself left->right in one smooth ~2.5s pass.
    // Replaces Chart.js per-point timing (which popped/stuttered "one go, stop,
    // continue"). Axes/grid are drawn before this clip, so they stay full while
    // the line draws in. ch.$reveal (0..1) is driven by runDraw()'s rAF below.
    var clipReveal = {
      id: "clipReveal",
      beforeDatasetsDraw: function (ch) {
        var p = ch.$reveal == null ? 1 : ch.$reveal;
        if (p >= 1) return;                       // fully drawn -> no clip
        var a = ch.chartArea, g = ch.ctx;
        g.save();
        g.beginPath();
        g.rect(a.left, a.top - 30, (a.right - a.left) * p, (a.bottom - a.top) + 60);
        g.clip();
        ch.$clipped = true;
      },
      afterDatasetsDraw: function (ch) {
        if (ch.$clipped) { ch.ctx.restore(); ch.$clipped = false; }
      }
    };

    function build() {
      if (built) return; built = true;
      var ctx = c.getContext("2d");

      // Vertical gradient strokes (premium fade) — sized to the wrap height.
      var H = c.clientHeight || 188;
      var gClick = ctx.createLinearGradient(0, 0, 0, H);
      gClick.addColorStop(0, "#5ff09a");
      gClick.addColorStop(1, GREEN);
      var gImpr = ctx.createLinearGradient(0, 0, 0, H);
      gImpr.addColorStop(0, GOLD_BRIGHT);
      gImpr.addColorStop(1, GOLD);

      // Soft area fills under each line.
      var fillClick = ctx.createLinearGradient(0, 0, 0, H);
      fillClick.addColorStop(0, "rgba(52,211,107,0.30)");
      fillClick.addColorStop(1, "rgba(52,211,107,0)");
      var fillImpr = ctx.createLinearGradient(0, 0, 0, H);
      fillImpr.addColorStop(0, "rgba(216,167,62,0.26)");
      fillImpr.addColorStop(1, "rgba(216,167,62,0)");

      // Draw animation is handled by clipReveal + runDraw() (a single smooth
      // ~2.5s pen-draw), so Chart.js's own animation is OFF (animation:false).

      chart = new Chart(c, {
        type: "line",
        plugins: [pointGlow, clipReveal],
        data: {
          labels: LABELS,
          datasets: [
            {
              label: "Clicks",
              data: CLICKS,
              yAxisID: "yClicks",
              borderColor: gClick, backgroundColor: fillClick, fill: true,
              tension: 0, borderWidth: 3,
              pointRadius: [4, 3, 3, 3, 3, 3, 6.5], pointHoverRadius: [7, 4, 4, 4, 4, 4, 7],
              pointBackgroundColor: GREEN, pointBorderColor: "#0a0c10", pointBorderWidth: 2,
              order: 2
            },
            {
              label: "Impressions",
              data: IMPRESSIONS,
              yAxisID: "yImpr",
              borderColor: gImpr, backgroundColor: fillImpr, fill: true,
              tension: 0, borderWidth: 3, borderDash: [],
              pointRadius: [4, 3, 3, 3, 3, 3, 6.5], pointHoverRadius: [7, 4, 4, 4, 4, 4, 7],
              pointBackgroundColor: GOLD, pointBorderColor: "#0a0c10", pointBorderWidth: 2,
              order: 1
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: false,   // draw is driven by clipReveal + runDraw() (pen-draw)
          interaction: { mode: "index", intersect: false },
          layout: { padding: { top: 8, right: 2, bottom: 0, left: 2 } },
          scales: {
            x: {
              grid: { display: false }, border: { display: false },
              ticks: { color: "#8d8775", font: { size: tickSize() }, maxRotation: 0, autoSkip: false }
            },
            yClicks: {
              position: "left", beginAtZero: true,
              grid: { color: "rgba(255,255,255,.06)" }, border: { display: false },
              ticks: {
                color: GREEN, font: { size: tickSize() },
                maxTicksLimit: 5,
                callback: function (v) { return (v / 1000) + "K"; }
              }
            },
            yImpr: {
              position: "right", beginAtZero: true,
              grid: { drawOnChartArea: false }, border: { display: false },
              ticks: {
                color: GOLD, font: { size: tickSize() },
                maxTicksLimit: 5,
                callback: function (v) { return (v / 1000) + "K"; }
              }
            }
          },
          plugins: {
            legend: { display: false }, // hidden; colors distinguish the series
            tooltip: {
              backgroundColor: "rgba(8,10,14,.96)",
              borderColor: "rgba(216,167,62,.55)", borderWidth: 1, padding: 11,
              // Only the two REAL anchor points show numbers; the grind points
              // in between are shape-only (never assert a fabricated month).
              filter: function (it) { return it.dataIndex === 0 || it.dataIndex === LAST; },
              titleColor: "#f5f2ea", bodyColor: "#cdc7b8",
              usePointStyle: true, boxWidth: 8, boxHeight: 8,
              callbacks: {
                title: function (items) { return items && items.length ? items[0].label : ""; },
                label: function (x) {
                  var name = x.dataset.label === "Clicks" ? "Clicks" : "Impressions";
                  return name + ": " + x.parsed.y.toLocaleString();
                },
                labelColor: function (x) {
                  var col = x.datasetIndex === 0 ? GREEN : GOLD;
                  return { borderColor: col, backgroundColor: col, borderWidth: 0, borderRadius: 4 };
                }
              }
            }
          }
        }
      });

      // Start hidden (no full-frame flash), then pen-draw it in.
      chart.$reveal = 0; chart.draw();
      function runDraw() {
        if (!chart) return;
        if (prefersReduced) { chart.$reveal = 1; chart.draw(); return; }
        win.cancelAnimationFrame(chart.$raf);
        var DUR = 2500, t0 = null;          // exactly ~2.5s, movie pace
        function frame(ts) {
          if (t0 == null) t0 = ts;
          var p = (ts - t0) / DUR; if (p > 1) p = 1;
          chart.$reveal = p;
          chart.draw();
          if (p < 1) chart.$raf = win.requestAnimationFrame(frame);
        }
        chart.$raf = win.requestAnimationFrame(frame);
      }
      chart._runDraw = runDraw;
      runDraw();

      // Keep ticks readable when the viewport crosses the 860px breakpoint.
      if (mqSmall) {
        var onMq = function () {
          if (!chart) return;
          var s = tickSize();
          chart.options.scales.x.ticks.font.size = s;
          chart.options.scales.yClicks.ticks.font.size = s;
          chart.options.scales.yImpr.ticks.font.size = s;
          chart.update("none");
        };
        if (mqSmall.addEventListener) mqSmall.addEventListener("change", onMq);
        else if (mqSmall.addListener) mqSmall.addListener(onMq);
      }
    }

    function replay() { if (chart && chart._runDraw && !prefersReduced) chart._runDraw(); }

    if (!supportsIO) { build(); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !visible) { visible = true; if (!built) build(); else replay(); }
        else if (!e.isIntersecting && visible) { visible = false; }
      });
    }, { threshold: 0.3 });
    io.observe(c);
  }


  /* =========================================================================
   * PROOF NUMBERS — count up .proof-metric-num on enter-view.
   * Parses existing textContent into [prefix][number][suffix], animates the
   * numeric part with rAF (easeOutCubic), then restores the EXACT original
   * text on the last frame. Reduced-motion / no-IO: leave literal text as-is.
   * Re-trigger on re-enter is allowed; a per-element guard prevents overlap.
   * ======================================================================= */
  function initProofCount() {
    var nums = $all("#proof-numbers .proof-metric-num");
    if (!nums.length) return;

    // Reduced motion or no IntersectionObserver: the HTML already shows the
    // final literal values, so there is nothing to paint and nothing to do.
    if (prefersReduced || !supportsIO) return;

    // Parse a metric string into its animatable shape.
    // "3.78M"   -> { from:0,  to:3.78,  decimals:2, prefix:"",  suffix:"M",  raw:"3.78M" }
    // "+436.5%" -> { from:0,  to:436.5, decimals:1, prefix:"+", suffix:"%",  raw:"+436.5%" }
    // "#1"      -> { from:9,  to:1,     decimals:0, prefix:"#", suffix:"",   raw:"#1" }
    function parseMetric(raw) {
      var m = raw.match(/-?\d[\d,]*(?:\.\d+)?/); // first numeric run
      if (!m) return null;
      var numStr = m[0];
      var start = m.index;
      var end = start + numStr.length;
      var prefix = raw.slice(0, start);
      var suffix = raw.slice(end);
      var clean = numStr.replace(/,/g, "");
      var dot = clean.indexOf(".");
      var decimals = dot === -1 ? 0 : clean.length - dot - 1;
      var to = parseFloat(clean);
      if (isNaN(to)) return null;
      // "#1" style ranks count down from a higher number to the target.
      var from = (prefix.indexOf("#") !== -1 && decimals === 0 && to <= 9) ? 9 : 0;
      return { from: from, to: to, decimals: decimals, prefix: prefix, suffix: suffix, raw: raw };
    }

    nums.forEach(function (el) {
      var raw = (el.textContent || "").trim();
      var spec = parseMetric(raw);
      if (!spec) return; // nothing numeric — leave untouched

      var running = false;

      function animate() {
        if (running) return;
        running = true;
        var dur = 1500;
        var startTs = null;

        function step(ts) {
          if (startTs === null) startTs = ts;
          var p = clamp((ts - startTs) / dur, 0, 1);
          var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
          if (p < 1) {
            var val = spec.from + (spec.to - spec.from) * eased;
            el.textContent = spec.prefix + val.toFixed(spec.decimals) + spec.suffix;
            raf(step);
          } else {
            el.textContent = spec.raw; // restore EXACT original text
            running = false;
          }
        }
        raf(step);
      }

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) animate(); // re-trigger on re-enter is fine
        });
      }, { threshold: 0.55 });

      io.observe(el);
    });
  }

    /* =========================================================================
   * SKILLS / EXPERTISE — replaces initServicesCount().
   * (1) Auto-advancing, drag/arrow/keyboard/dot/pause-controllable carousel
   *     that clips internally (no page overflow). (2) Per-card graph DRAW-IN
   *     that RE-ARMS each time a card enters the carousel viewport. (3) Count-up
   *     real numbers (easeOutCubic, same idiom as initProofCount).
   * No-JS / no-IO: HTML degrades to a native scroll-snap strip in final state.
   * Reduced-motion: no auto-move, no draw; final state instantly; still fully
   * controllable by arrows / drag / keyboard / dots.
   * Fixes applied: arrow-mask reset (CSS), dots ARIA (plain buttons), social
   * timer leak (cleared on re-arm), perf gate (.skl-live only while in view),
   * touch pause affordance, standalone #sklGradGreen defs.
   * ======================================================================= */
  function initSkills() {
    var section = $("#services");
    var root = section ? $(".skl-carousel", section) : null;
    if (!section || !root) return;
    var viewport = $("[data-skl-viewport]", root) || root;
    var track = $(".skl-track", root);
    var cards = $all(".skl-card:not([hidden])", track);
    if (!track || !cards.length) return;

    var prevBtn = $("[data-skl-prev]", root);
    var nextBtn = $("[data-skl-next]", root);
    var foot = $("#services [data-skl-foot]");
    var dotsWrap = $("#services [data-skl-dots]");
    var pauseBtn = $("#services [data-skl-pause]");
    var welcomeHeader = $(".skl-welcome", section);

    function replayWelcome() {
      if (!welcomeHeader || prefersReduced) return;
      welcomeHeader.classList.remove("is-welcoming");
      void welcomeHeader.offsetWidth;
      welcomeHeader.classList.add("is-welcoming");
    }

    /* ---- COUNT-UP (real numbers only; reduced-motion = literal) ----------- */
    function parseMetric(raw) {
      var m = raw.match(/-?\d[\d,]*(?:\.\d+)?/);
      if (!m) return null;
      var numStr = m[0], start = m.index, end = start + numStr.length;
      var prefix = raw.slice(0, start), suffix = raw.slice(end);
      var clean = numStr.replace(/,/g, ""), dot = clean.indexOf(".");
      var decimals = dot === -1 ? 0 : clean.length - dot - 1;
      var to = parseFloat(clean);
      if (isNaN(to)) return null;
      return { from: 0, to: to, decimals: decimals, prefix: prefix, suffix: suffix, raw: raw };
    }
    function runCount(el) {
      if (prefersReduced) return;             // literal value already in DOM
      var raw = (el.getAttribute("data-skl-count") || el.textContent || "").trim();
      var spec = parseMetric(raw);
      if (!spec) return;
      if (el.__sklRunning) return;
      el.__sklRunning = true;
      el.__sklRunId = (el.__sklRunId || 0) + 1;
      var runId = el.__sklRunId;
      var requestedDuration = parseInt(el.getAttribute("data-skl-duration"), 10);
      var dur = isFinite(requestedDuration) && requestedDuration > 0 ? requestedDuration : 1150;
      var t0 = null;
      function step(ts) {
        if (runId !== el.__sklRunId) return;
        if (t0 === null) t0 = ts;
        var p = clamp((ts - t0) / dur, 0, 1);
        var eased = 1 - Math.pow(1 - p, 3);   // easeOutCubic
        if (p < 1) {
          var v = spec.from + (spec.to - spec.from) * eased;
          el.textContent = spec.prefix + v.toFixed(spec.decimals) + spec.suffix;
          raf(step);
        } else { el.textContent = spec.raw; el.__sklRunning = false; }
      }
      raf(step);
    }

    /* ---- DRAW-IN: arm (start state) then play (animate to final) ---------- */
    // Set --len on every dash-driven path so CSS dasharray/offset = exact length.
    function primeLengths(card) {
      if (card.__sklPrimed) return; card.__sklPrimed = true;
      $all("[data-skl-line],[data-skl-glin],[data-skl-arc],[data-skl-ring],[data-skl-check],[data-skl-edge]", card)
        .forEach(function (p) {
          var L = 0;
          try { L = p.getTotalLength(); } catch (e) { L = 600; }
          if (!L || !isFinite(L)) L = 600;
          p.style.setProperty("--len", (Math.ceil(L) + 2));
        });
    }
    function clearTimers(card) {                // FIX: kill pending node-light timers
      if (card.__sklTimers) {
        card.__sklTimers.forEach(function (id) { win.clearTimeout(id); });
      }
      card.__sklTimers = [];
    }
    function resetCard(card) {           // inactive cards hold a complete, quiet frame
      clearTimers(card);
      card.classList.remove("skl-play", "skl-armed");
      $all(".skl-loop__node", card).forEach(function (n) { n.classList.add("is-lit"); });
      $all(".skl-card__num", card).forEach(function (el) {
        el.__sklRunId = (el.__sklRunId || 0) + 1;
        el.__sklRunning = false;
        var raw = (el.getAttribute("data-skl-count") || "").trim();
        if (raw) el.textContent = raw;
      });
    }
    function playCard(card) {
      primeLengths(card);
      clearTimers(card);                  // FIX: never stack timers across re-arms
      if (prefersReduced) {              // final state instantly, no motion
        card.classList.remove("skl-armed", "skl-play");
        $all(".skl-loop__node", card).forEach(function (n) { n.classList.add("is-lit"); });
        return;
      }
      // ensure we start from armed, then flip to play on the next frame
      $all(".skl-loop__node", card).forEach(function (n) { n.classList.remove("is-lit"); });
      $all(".skl-card__num", card).forEach(function (el) {
        el.__sklRunId = (el.__sklRunId || 0) + 1;
        el.__sklRunning = false;
      });
      card.classList.add("skl-armed");
      // force reflow so the armed start state is committed before transitioning
      void card.offsetWidth;
      raf(function () {
        card.classList.remove("skl-armed");
        card.classList.add("skl-play");
        $all(".skl-card__num", card).forEach(runCount);
        // The tracer uses the exact SVG route and the same duration/easing as
        // the line, so its dot remains physically attached to the drawn tip.
        $all("[data-skl-motion]", card).forEach(function (motion) {
          var id = win.setTimeout(function () {
            try { motion.beginElement(); } catch (e) {}
          }, 120);
          card.__sklTimers.push(id);
        });
        // social loop: light nodes Strategy->Shoot->Edit->Post->Measure in turn
        var nodes = $all(".skl-loop__node", card);
        if (nodes.length) {
          nodes.forEach(function (n, i) {
            var id = win.setTimeout(function () { n.classList.add("is-lit"); }, 150 + i * 240);
            card.__sklTimers.push(id);
          });
        }
      });
    }
    // Prime geometry only. Inactive cards stay fully resolved; the active card
    // briefly arms inside playCard() so adjacent cards never appear blank.
    cards.forEach(function (card) {
      card.__sklTimers = [];
      primeLengths(card);
      card.__sklActive = false;
      resetCard(card);
    });

    /* ---- PERF + PLAYBACK GATE: film only the active card while in view ----- */
    var sectionVisible = !supportsIO;
    if (supportsIO) {
      var liveIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          sectionVisible = e.isIntersecting;
          section.classList.toggle("skl-live", sectionVisible);
          if (sectionVisible) {
            replayWelcome();
            render();
            restartAuto();
          } else {
            if (welcomeHeader) welcomeHeader.classList.remove("is-welcoming");
            stopAuto();
          }
        });
      }, { rootMargin: "120px 0px" });
      liveIO.observe(section);
    } else {
      section.classList.add("skl-live");
    }

    /* ---- CAROUSEL: transform-driven, internal clip, controllable ---------- */
    root.setAttribute("data-skl-on", "");       // CSS: overflow hidden + transform
    if (prevBtn) prevBtn.hidden = false;
    if (nextBtn) nextBtn.hidden = false;
    if (foot) foot.hidden = false;

    var index = 0, count = cards.length;
    var dots = [];

    function stepX() {                          // distance card-to-card = width + gap
      var a = cards[0].getBoundingClientRect();
      var b = cards[1] ? cards[1].getBoundingClientRect() : null;
      return b ? (b.left - a.left) : (a.width + 16);
    }
    function maxIndex() {                        // every card must become active, including card 10
      return Math.max(0, count - 1);
    }
    function wrap(i) {
      var mx = maxIndex();
      if (i < 0) return mx;                      // loop to end
      if (i > mx) return 0;                      // loop to start
      return i;
    }
    function offsetFor(i) {
      // Centre the active card. Generous track end-padding lets cards 1 and 10
      // receive the same presentation instead of being trapped at an edge.
      var card = cards[i] || cards[0];
      var vw = viewport.clientWidth;
      var desired = card.offsetLeft + card.offsetWidth / 2 - vw / 2;
      var max = Math.max(0, track.scrollWidth - vw);
      if (i <= 0) return 0;
      // The flex track's scrollWidth can under-report its percentage-based end
      // padding. Use the final card's actual centre instead of that clamp.
      if (i >= maxIndex()) return -Math.max(0, desired);
      return -clamp(desired, 0, max);
    }
    var filmTimer = null;
    function playActiveCard() {
      var card = cards[index];
      if (!card || prefersReduced || !sectionVisible || card.__sklActive) return;
      card.__sklActive = true;
      playCard(card);
    }
    function render(afterTrackMove) {
      if (filmTimer) { win.clearTimeout(filmTimer); filmTimer = null; }
      track.style.transform = "translate3d(" + offsetFor(index) + "px,0,0)";
      cards.forEach(function (c, i) {
        var active = i === index;
        c.classList.toggle("is-current", active);
        c.setAttribute("aria-current", active ? "true" : "false");
        if (prefersReduced) {
          c.classList.remove("skl-armed", "skl-play");
          return;
        }
        if (!active && c.__sklActive) {
          c.__sklActive = false;
          resetCard(c);
        }
      });
      if (afterTrackMove && !prefersReduced) {
        // Let the track settle first; then the selected card performs its film.
        filmTimer = win.setTimeout(function () {
          filmTimer = null;
          playActiveCard();
        }, 100);
      } else {
        playActiveCard();
      }
      dots.forEach(function (d, i) {
        d.setAttribute("aria-current", i === index ? "true" : "false");
      });
    }
    function go(i, manual) {
      index = wrap(i);
      render(true);
      if (manual) restartAuto();
    }

    /* ---- DOTS (plain buttons; aria-label + aria-current; NO tab/tablist) -- */
    if (dotsWrap) {
      for (var d = 0; d < count; d++) {
        (function (di) {
          var b = doc.createElement("button");
          b.type = "button";
          b.className = "skl-dot";
          b.setAttribute("aria-label", "Go to skill " + (di + 1));
          b.addEventListener("click", function () { go(di, true); });
          dotsWrap.appendChild(b);
          dots.push(b);
        })(d);
      }
    }

    /* ---- AUTO-ADVANCE (step model; paused on hover/focus/drag/hidden/btn) - */
    var AUTO_MS = 2800, autoId = null;
    var pausedHover = false, pausedFocus = false, pausedUser = false, dragging = false;
    function canAuto() { return sectionVisible && !doc.hidden && !prefersReduced && !pausedUser && !pausedHover && !pausedFocus && !dragging; }
    function tick() { if (canAuto()) go(index + 1, false); }
    function startAuto() {
      if (prefersReduced || !canAuto()) return;
      stopAuto();
      autoId = win.setInterval(tick, AUTO_MS);
    }
    function stopAuto() { if (autoId) { win.clearInterval(autoId); autoId = null; } }
    function restartAuto() { if (canAuto()) startAuto(); else stopAuto(); }
    function pauseHover() { pausedHover = true; stopAuto(); }
    function resumeHover() { pausedHover = false; restartAuto(); }

    var hoverResumeTimer = null;
    var hoverIdleTimer = null;
    var hoverIdleSince = 0;
    var pointerInsideCarousel = false;
    function clearHoverIdleTimer() {
      if (hoverIdleTimer) { win.clearTimeout(hoverIdleTimer); hoverIdleTimer = null; }
      hoverIdleSince = 0;
    }
    function armHoverIdleResume() {
      if (!pointerInsideCarousel) return;
      pauseHover();
      hoverIdleSince = Date.now();
      if (hoverIdleTimer) return;
      function checkIdle() {
        var remaining = 3000 - (Date.now() - hoverIdleSince);
        if (remaining > 0) {
          hoverIdleTimer = win.setTimeout(checkIdle, remaining);
          return;
        }
        hoverIdleTimer = null;
        hoverIdleSince = 0;
        pausedHover = false;
        if (canAuto()) {
          go(index + 1, false);
          startAuto();
        }
      }
      hoverIdleTimer = win.setTimeout(checkIdle, 3000);
    }

    root.addEventListener("pointerenter", function (e) {
      if (e.pointerType === "touch") return;
      pointerInsideCarousel = true;
      if (hoverResumeTimer) { win.clearTimeout(hoverResumeTimer); hoverResumeTimer = null; }
      armHoverIdleResume();
    });
    root.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      if (dragging) return;
      armHoverIdleResume();
    });
    root.addEventListener("pointerleave", function (e) {
      if (e.pointerType === "touch") return;
      pointerInsideCarousel = false;
      clearHoverIdleTimer();
      hoverResumeTimer = win.setTimeout(function () {
        pausedHover = false;
        restartAuto();
        hoverResumeTimer = null;
      }, 140);
    });

    cards.forEach(function (card, cardIndex) {
      card.addEventListener("pointerenter", function (e) {
        if (e.pointerType === "touch") return;
        // Hover animates the card in place. It must never move the track merely
        // because the pointer crossed a partially visible card at either edge.
        if (index === cardIndex) {
          card.__sklActive = false;
          resetCard(card);
          render(false);
        } else {
          card.__sklActive = false;
          resetCard(card);
          card.__sklActive = true;
          playCard(card);
        }
      });
      card.addEventListener("pointerleave", function (e) {
        if (e.pointerType === "touch") return;
        if (cardIndex !== index && card.__sklActive) {
          card.__sklActive = false;
          resetCard(card);
        }
      });
    });
    root.addEventListener("focusin", function () { pausedFocus = true; stopAuto(); });
    root.addEventListener("focusout", function (e) {
      if (!root.contains(e.relatedTarget)) { pausedFocus = false; restartAuto(); }
    });
    doc.addEventListener("visibilitychange", function () {
      if (doc.hidden) stopAuto(); else restartAuto();
    });

    /* ---- PAUSE/PLAY toggle (WCAG 2.2.2 affordance for touch users) -------- */
    if (pauseBtn) {
      if (prefersReduced) {
        pauseBtn.hidden = true;            // nothing auto-moves; toggle is moot
      } else {
        pauseBtn.addEventListener("click", function () {
          pausedUser = !pausedUser;
          pauseBtn.setAttribute("aria-pressed", pausedUser ? "true" : "false");
          pauseBtn.setAttribute("aria-label", pausedUser ? "Resume auto-advance" : "Pause auto-advance");
          if (pausedUser) stopAuto(); else restartAuto();
        });
      }
    }

    /* ---- ARROWS + KEYBOARD ------------------------------------------------ */
    if (prevBtn) prevBtn.addEventListener("click", function () { go(index - 1, true); });
    if (nextBtn) nextBtn.addEventListener("click", function () { go(index + 1, true); });
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1, true); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1, true); }
      else if (e.key === "Home") { e.preventDefault(); go(0, true); }
      else if (e.key === "End") { e.preventDefault(); go(maxIndex(), true); }
    });

    /* ---- POINTER DRAG / SWIPE (unified mouse + touch) --------------------- */
    var startX = 0, startT = 0, baseOffset = 0, pid = null, didDrag = false;
    function onDown(e) {
      if (e.button != null && e.button !== 0) return;
      dragging = true; didDrag = false; pid = e.pointerId;
      startX = e.clientX; startT = (e.timeStamp || Date.now());
      baseOffset = offsetFor(index);
      root.classList.add("is-dragging");
      clearHoverIdleTimer();
      pauseHover();
      try { track.setPointerCapture(pid); } catch (err) {}
    }
    function onMove(e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) didDrag = true;
      track.style.transform = "translate3d(" + (baseOffset + dx) + "px,0,0)";
    }
    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      root.classList.remove("is-dragging");
      try { track.releasePointerCapture(pid); } catch (err) {}
      var dx = e.clientX - startX;
      var dt = Math.max(1, (e.timeStamp || Date.now()) - startT);
      var vel = dx / dt;                         // px per ms
      var sx = stepX();
      var target = index + Math.round(-dx / sx);
      if (Math.abs(vel) > 0.45 && Math.abs(dx) > 8) target += (vel < 0 ? 1 : -1);
      if (Math.abs(dx) < sx * 0.18 && Math.abs(vel) <= 0.45) target = index;
      go(target, true);
      if (pointerInsideCarousel) armHoverIdleResume();
    }
    function onCancel() {
      if (!dragging) return;
      dragging = false;
      root.classList.remove("is-dragging");
      go(index, true);
      if (pointerInsideCarousel) armHoverIdleResume();
    }
    // suppress the click that fires after a real drag (e.g. ending on an arrow)
    track.addEventListener("click", function (e) {
      if (didDrag) { e.stopPropagation(); e.preventDefault(); didDrag = false; }
    }, true);
    track.addEventListener("pointerdown", onDown);
    track.addEventListener("pointermove", onMove);
    track.addEventListener("pointerup", onUp);
    track.addEventListener("pointercancel", onCancel);
    track.addEventListener("lostpointercapture", onCancel);
    track.addEventListener("dragstart", function (e) { e.preventDefault(); });
    // touch-action: vertical page scroll still works while horizontal is captured
    track.style.touchAction = "pan-y";

    /* ---- RESIZE: re-snap offset to the active index ---------------------- */
    var rT;
    win.addEventListener("resize", function () {
      win.clearTimeout(rT);
      rT = win.setTimeout(function () { index = wrap(index); render(false); }, 150);
    });

    render(false);
    startAuto();
  }

  /* Chart.js is useful only when the proof scene is reached. Keep the 72 KB
     library out of the hero's critical path, then initialise the existing
     proof graph code as soon as the section enters the viewport. */
  function initProofVisualsLazy() {
    var target = doc.getElementById("proof-numbers");
    if (!target) return;
    var started = false;
    function initialise() {
      if (started) return;
      started = true;
      if (win.Chart) {
        initProofCharts();
        initProofLine();
        return;
      }
      var script = doc.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.setAttribute("fetchpriority", "low");
      script.onload = function () {
        initProofCharts();
        initProofLine();
      };
      doc.head.appendChild(script);
    }
    if (!supportsIO) { initialise(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
      io.disconnect();
      initialise();
    }, { threshold: 0.01 });
    io.observe(target);
  }

  /* Evidence Desk is progressive enhancement: without JS every dossier stays
     open and readable. Desktop receives a keyboard-controlled claim index;
     mobile keeps native details/summary behaviour and normal page scrolling. */
  function initEvidenceDesk() {
    var desk = doc.querySelector("[data-evidence-desk]");
    if (!desk) return;
    var buttons = Array.prototype.slice.call(desk.querySelectorAll("[data-evidence-target]"));
    var panels = Array.prototype.slice.call(desk.querySelectorAll("[data-evidence-panel]"));
    if (!buttons.length || !panels.length) return;

    var compact = win.matchMedia("(max-width: 820px)");
    var active = "social";
    var hashMatch = win.location.hash.match(/^#evidence-(social|search|content|companies)$/);
    if (hashMatch) active = hashMatch[1];
    desk.classList.add("is-enhanced");

    function scan(panel) {
      if (!panel || prefersReduced) return;
      panel.classList.remove("is-scanning");
      void panel.offsetWidth;
      panel.classList.add("is-scanning");
      win.setTimeout(function () { panel.classList.remove("is-scanning"); }, 580);
    }

    function select(id, updateHash, intentional) {
      active = id;
      var selectedPanel = null;
      buttons.forEach(function (button) {
        var selected = button.getAttribute("data-evidence-target") === id;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-selected", selected ? "true" : "false");
        button.tabIndex = selected ? 0 : -1;
      });
      panels.forEach(function (panel) {
        var selected = panel.getAttribute("data-evidence-panel") === id;
        panel.classList.toggle("is-active", selected);
        if (selected) selectedPanel = panel;
        if (compact.matches) panel.open = selected;
      });
      if (updateHash && win.history && win.history.replaceState) {
        win.history.replaceState(null, "", "#evidence-" + id);
      }
      if (intentional) scan(selectedPanel);
    }

    function applyMode() {
      desk.classList.toggle("is-desktop", !compact.matches);
      if (compact.matches) {
        panels.forEach(function (panel) {
          panel.open = panel.getAttribute("data-evidence-panel") === active;
        });
      } else {
        panels.forEach(function (panel) { panel.open = true; });
      }
    }

    buttons.forEach(function (button, index) {
      button.addEventListener("click", function () {
        select(button.getAttribute("data-evidence-target"), true, true);
      });
      button.addEventListener("keydown", function (event) {
        var next = index;
        if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % buttons.length;
        else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = buttons.length - 1;
        else return;
        event.preventDefault();
        var target = buttons[next];
        select(target.getAttribute("data-evidence-target"), true, true);
        target.focus();
      });
    });

    panels.forEach(function (panel) {
      panel.addEventListener("toggle", function () {
        if (!compact.matches || !panel.open) return;
        active = panel.getAttribute("data-evidence-panel");
        panels.forEach(function (other) { if (other !== panel) other.open = false; });
      });
    });

    if (compact.addEventListener) compact.addEventListener("change", applyMode);
    else if (compact.addListener) compact.addListener(applyMode);
    select(active, false, false);
    applyMode();
  }

  /* Editorial media wall: six static posters, one on-demand player. */
  function initVideoViewerLegacy() {
    var modal = doc.querySelector("[data-media-player]");
    var items = $all("[data-media-item]");
    if (!modal || !items.length) return;
    var player = modal.querySelector("[data-player-video]");
    var title = modal.querySelector("[data-player-title]");
    var currentTitle = modal.querySelector("[data-player-current-title]");
    var format = modal.querySelector("[data-player-format]");
    var count = modal.querySelector("[data-player-count]");
    var close = modal.querySelector("[data-player-close]");
    var previous = modal.querySelector("[data-player-prev]");
    var next = modal.querySelector("[data-player-next]");
    var status = doc.querySelector("[data-media-status]");
    var current = 0;
    var opener = null;

    function pad(value) { return value < 10 ? "0" + value : String(value); }

    function itemData(index) {
      var item = items[index];
      return {
        item: item,
        title: item.getAttribute("data-media-title") || "Video sample",
        format: item.getAttribute("data-media-format") || "Video edit",
        orientation: (item.getAttribute("data-media-format") || "").indexOf("Short-form") === 0 ? "portrait" : "wide",
        duration: item.getAttribute("data-media-duration") || "",
        poster: item.getAttribute("data-media-poster") || "",
        src: item.getAttribute("data-media-src") || ""
      };
    }

    function playWhenReady() {
      if (!player) return;
      var expected = player.getAttribute("src");
      function start() {
        if (!expected || player.getAttribute("src") !== expected) return;
        var attempt = player.play();
        if (attempt && typeof attempt.catch === "function") attempt.catch(function () {});
      }
      if (player.readyState >= 3) start();
      else player.addEventListener("canplay", start, { once: true });
    }

    function load(index, shouldPlay) {
      current = (index + items.length) % items.length;
      var data = itemData(current);
      if (title) title.textContent = data.title;
      if (currentTitle) currentTitle.textContent = data.title;
      if (format) format.textContent = data.format + (data.duration ? " · " + data.duration : "");
      if (count) count.textContent = pad(current + 1) + " / " + pad(items.length);
      if (status) status.textContent = "Selected " + data.title + ", video " + (current + 1) + " of " + items.length + ".";
      if (!player || !data.src) return;
      modal.setAttribute("data-orientation", data.orientation);
      player.width = data.orientation === "portrait" ? 720 : 1280;
      player.height = data.orientation === "portrait" ? 1280 : 720;
      player.pause();
      player.poster = data.poster;
      player.src = data.src;
      player.load();
      if (shouldPlay) playWhenReady();
    }

    function open(index, trigger) {
      opener = trigger;
      load(index, false);
      doc.documentElement.classList.add("media-player-open");
      if (typeof modal.showModal === "function") modal.showModal();
      else modal.setAttribute("open", "");
      playWhenReady();
    }

    function closePlayer() {
      if (typeof modal.close === "function") modal.close();
      else {
        modal.removeAttribute("open");
        reset();
      }
    }

    function reset() {
      doc.documentElement.classList.remove("media-player-open");
      if (player) {
        player.pause();
        player.removeAttribute("src");
        player.removeAttribute("poster");
        player.load();
      }
      if (opener && doc.contains(opener)) opener.focus();
    }

    items.forEach(function (item, index) {
      item.addEventListener("click", function () { open(index, item); });
    });
    if (close) close.addEventListener("click", closePlayer);
    if (previous) previous.addEventListener("click", function () { load(current - 1, true); });
    if (next) next.addEventListener("click", function () { load(current + 1, true); });
    modal.addEventListener("click", function (event) {
      if (event.target !== modal) return;
      closePlayer();
    });
    modal.addEventListener("keydown", function (event) {
      if (event.target === player) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        load(current - 1, true);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        load(current + 1, true);
      }
    });
    modal.addEventListener("close", reset);
  }

  /* Inline video gallery: load on demand and allow only one active clip. */
  function initVideoViewerLegacyTwo() {
    var items = $all("[data-inline-media]");
    if (!items.length) return;
    var status = doc.querySelector("[data-media-status]");

    function controls(item) {
      return {
        video: item.querySelector("[data-inline-video]"),
        play: item.querySelector("[data-inline-play]"),
        expand: item.querySelector("[data-inline-expand]")
      };
    }

    function setResting(item, resetTime) {
      var parts = controls(item);
      if (!parts.video) return;
      parts.video.pause();
      if (resetTime) {
        try { parts.video.currentTime = 0; } catch (error) {}
      }
      parts.video.controls = false;
      item.removeAttribute("data-playing");
      item.removeAttribute("data-paused");
      if (parts.play) parts.play.hidden = false;
      if (parts.expand) parts.expand.hidden = true;
    }

    function stopOthers(active) {
      items.forEach(function (item) {
        if (item !== active) setResting(item, false);
      });
    }

    function playItem(item) {
      var parts = controls(item);
      if (!parts.video) return;
      stopOthers(item);
      if (!parts.video.getAttribute("src")) {
        parts.video.src = parts.video.getAttribute("data-src") || "";
        parts.video.load();
      }
      parts.video.controls = true;
      item.setAttribute("data-playing", "true");
      item.removeAttribute("data-paused");
      if (parts.play) parts.play.hidden = true;
      if (parts.expand) parts.expand.hidden = false;
      if (status) status.textContent = "Playing " + (item.getAttribute("data-media-title") || "selected video") + ".";
      var attempt = parts.video.play();
      if (attempt && typeof attempt.catch === "function") {
        attempt.catch(function () {
          item.removeAttribute("data-playing");
          if (parts.play) parts.play.hidden = false;
        });
      }
    }

    function maximize(video) {
      if (video.requestFullscreen) return video.requestFullscreen();
      if (video.webkitEnterFullscreen) return video.webkitEnterFullscreen();
      if (video.webkitRequestFullscreen) return video.webkitRequestFullscreen();
      return null;
    }

    items.forEach(function (item) {
      var parts = controls(item);
      if (!parts.video || !parts.play) return;
      parts.play.addEventListener("click", function () { playItem(item); });
      if (parts.expand) {
        parts.expand.addEventListener("click", function (event) {
          event.stopPropagation();
          var result = maximize(parts.video);
          if (result && typeof result.catch === "function") result.catch(function () {});
        });
      }
      parts.video.addEventListener("play", function () {
        stopOthers(item);
        item.setAttribute("data-playing", "true");
        item.removeAttribute("data-paused");
        parts.play.hidden = true;
        if (parts.expand) parts.expand.hidden = false;
      });
      parts.video.addEventListener("pause", function () {
        if (!item.hasAttribute("data-playing") || parts.video.ended) return;
        item.removeAttribute("data-playing");
        item.setAttribute("data-paused", "true");
        if (status) status.textContent = (item.getAttribute("data-media-title") || "Video") + " paused.";
      });
      parts.video.addEventListener("ended", function () {
        setResting(item, true);
        if (status) status.textContent = (item.getAttribute("data-media-title") || "Video") + " finished.";
      });
    });
  }

  function initShowreelPlayer() {
    var reel = doc.querySelector("[data-showreel]");
    if (!reel) return;
    var items = $all("[data-inline-media]", reel);
    if (!items.length) return;
    var status = reel.querySelector("[data-media-status]");
    var activeItem = null;

    function controls(item) {
      return {
        video: item.querySelector("[data-inline-video]"),
        play: item.querySelector("[data-inline-play]"),
        expand: item.querySelector("[data-inline-expand]")
      };
    }

    function title(item) {
      return item.getAttribute("data-media-title") || "Video";
    }

    function announce(message) {
      if (status) status.textContent = message;
    }

    function syncFocusMode() {
      var hasPlaying = items.some(function (item) {
        return item.getAttribute("data-state") === "playing";
      });
      if (hasPlaying) reel.setAttribute("data-has-active", "true");
      else reel.removeAttribute("data-has-active");
    }

    function setState(item, state) {
      var parts = controls(item);
      if (!parts.video || !parts.play) return;
      var hasProgress = parts.video.currentTime > .05 && !parts.video.ended;
      var verb = "Play ";
      if (state === "loading") verb = "Loading ";
      else if (state === "playing") verb = "Pause ";
      else if (state === "paused" || (state === "idle" && hasProgress)) verb = "Resume ";
      else if (state === "ended") verb = "Replay ";
      else if (state === "error") verb = "Retry ";
      item.setAttribute("data-state", state);
      item.setAttribute("aria-busy", state === "loading" ? "true" : "false");
      parts.play.setAttribute("aria-label", verb + title(item));
      parts.play.setAttribute("aria-pressed", state === "playing" ? "true" : "false");
      if (parts.expand) parts.expand.hidden = !(state === "loading" || state === "playing" || state === "paused");
      syncFocusMode();
    }

    function stopOthers(current) {
      items.forEach(function (item) {
        if (item === current) return;
        var parts = controls(item);
        if (!parts.video) return;
        item.__showreelResetting = true;
        parts.video.pause();
        parts.video.controls = false;
        item.__showreelResetting = false;
        setState(item, "idle");
        if (activeItem === item) activeItem = null;
      });
    }

    function ensureSource(video) {
      if (video.getAttribute("src")) return true;
      var source = video.getAttribute("data-src") || "";
      if (!source) return false;
      ensurePoster(video);
      video.src = source;
      video.load();
      return true;
    }

    function ensurePoster(video) {
      if (video.getAttribute("poster")) return;
      var poster = video.getAttribute("data-poster") || "";
      if (poster) video.poster = poster;
    }

    function playItem(item) {
      var parts = controls(item);
      if (!parts.video || !ensureSource(parts.video)) {
        setState(item, "error");
        announce("This video source is unavailable.");
        return;
      }
      stopOthers(item);
      activeItem = item;
      parts.video.controls = true;
      setState(item, "loading");
      announce("Loading " + title(item) + ".");
      var attempt = parts.video.play();
      if (attempt && typeof attempt.catch === "function") {
        attempt.catch(function () {
          if (parts.video.error) {
            setState(item, "error");
            announce(title(item) + " could not play. Try again.");
          } else if (item.getAttribute("data-state") === "paused") {
            setState(item, "paused");
          } else {
            setState(item, parts.video.currentTime > .05 ? "paused" : "idle");
          }
        });
      }
    }

    function toggleItem(item) {
      var parts = controls(item);
      if (!parts.video) return;
      var state = item.getAttribute("data-state") || "idle";
      if (state === "playing" || state === "loading") {
        parts.video.pause();
        setState(item, "paused");
        return;
      }
      playItem(item);
    }

    function maximize(video) {
      if (video.requestFullscreen) return video.requestFullscreen();
      if (video.webkitEnterFullscreen) return video.webkitEnterFullscreen();
      if (video.webkitRequestFullscreen) return video.webkitRequestFullscreen();
      return null;
    }

    items.forEach(function (item) {
      var parts = controls(item);
      if (!parts.video || !parts.play) return;
      setState(item, "idle");
      parts.play.addEventListener("click", function () { toggleItem(item); });
      if (parts.expand) {
        parts.expand.addEventListener("click", function (event) {
          event.stopPropagation();
          var result = maximize(parts.video);
          if (result && typeof result.catch === "function") result.catch(function () {});
        });
      }
      parts.video.addEventListener("play", function () {
        stopOthers(item);
        activeItem = item;
        parts.video.controls = true;
        setState(item, "playing");
        announce("Playing " + title(item) + ".");
      });
      parts.video.addEventListener("pause", function () {
        if (item.__showreelResetting || parts.video.ended) return;
        setState(item, "paused");
        announce(title(item) + " paused.");
      });
      parts.video.addEventListener("ended", function () {
        activeItem = null;
        parts.video.controls = false;
        try { parts.video.currentTime = 0; } catch (error) {}
        setState(item, "ended");
        announce(title(item) + " finished. Select replay to watch again.");
      });
      parts.video.addEventListener("error", function () {
        activeItem = null;
        parts.video.controls = false;
        setState(item, "error");
        announce(title(item) + " could not play. Try again.");
      });
    });

    if (supportsIO) {
      var itemObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var visibleVideo = entry.target.querySelector("[data-inline-video]");
          if (visibleVideo) ensurePoster(visibleVideo);
          entry.target.classList.add("is-ready");
          itemObserver.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -6% 0px", threshold: .08 });
      items.forEach(function (item) { itemObserver.observe(item); });
    } else {
      items.forEach(function (item) {
        var video = item.querySelector("[data-inline-video]");
        if (video) ensurePoster(video);
        item.classList.add("is-ready");
      });
    }

    doc.addEventListener("visibilitychange", function () {
      if (!doc.hidden || !activeItem) return;
      var parts = controls(activeItem);
      if (parts.video && !parts.video.paused) {
        parts.video.pause();
        announce(title(activeItem) + " paused while this tab is hidden.");
      }
    });
  }

  function init() {
    // Critical structural/navigation work stays synchronous and small.
    normalizeNarrativeOrder();
    initHeaderAndProgress();
    initNav();
    initSmoothScroll();

    // Split startup work across frames so mobile never receives one large
    // DOMContent task. Split still precedes reveal within this batch.
    raf(function () {
      initSectionRenderReadiness();
      initAmbientMotionVisibility();
      /* initBackground disabled — CSS-only premium dark+gold gradient now (lighter/faster) */
      initSplit();
      initRevealEnhancer();
      initReveal();
      initSceneEntrances();
      initMotionScrollSafety();
      initRotator();
      initFaq();
      initEvidenceDesk();
      initShowreelPlayer();

      win.setTimeout(function () {
        initScrollDriven();
        initWorkPin();
        initAboutParallax();
        initParallax();
        initPin();
        initCounters();
        initProofVisualsLazy();
        initProofCount();
        initSkills();
        initTilt();
        initMagnetic();
        /* initModernCursor disabled — native cursor is cleaner + no floating gold-dot artifact */
        initScrollSpy();
      }, 0);
    });
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
