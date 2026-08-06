/* ============================================================
   ESSENZA — interações da landing
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header: estado ao rolar ---------- */
  var header = document.querySelector(".header");
  var onScroll = function () {
    if (window.scrollY > 40) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Menu mobile ---------- */
  var mobileNav = document.getElementById("mobileNav");
  var openMenu = function () {
    mobileNav.classList.add("is-open");
    mobileNav.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };
  var closeMenu = function () {
    mobileNav.classList.remove("is-open");
    mobileNav.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };
  document.querySelectorAll("[data-menu-open]").forEach(function (b) { b.addEventListener("click", openMenu); });
  document.querySelectorAll("[data-menu-close]").forEach(function (b) { b.addEventListener("click", closeMenu); });
  mobileNav.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeMenu); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  /* ---------- Reveal ao entrar na viewport ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Hero: escolha e carregamento do vídeo ---------- */
  (function heroVideo() {
    var video = document.querySelector(".hero__video");
    if (!video) return;

    // Vídeo também no celular. Coloque false para usar só o poster estático no mobile
    // (economiza ~5MB de dados por acesso em campanhas de tráfego pago).
    var ENABLE_MOBILE_VIDEO = true;

    var conn = navigator.connection || {};
    var saveData = conn.saveData === true;
    // Só pula o vídeo em conexão muito ruim (2G) ou economia de dados ativada.
    // 3G continua recebendo o vídeo — ainda é comum na região e o carregamento é progressivo.
    var slow = /2g/.test(conn.effectiveType || "");
    if (reduceMotion || saveData || slow) return;

    var isMobile = window.matchMedia("(max-width: 860px)").matches;
    // No celular (maioria do tráfego pago) usamos o poster estático por padrão — mais rápido e sem gastar dados.
    if (isMobile && !ENABLE_MOBILE_VIDEO) return;

    var src = isMobile ? video.getAttribute("data-src-mobile") : video.getAttribute("data-src-desktop");
    if (!src) return;

    // Chamar play() logo após load() falha (o vídeo ainda não tem dados) e a promise
    // rejeitada era engolida em silêncio — por isso tentamos de novo quando há dados.
    var startPlay = function () {
      if (!video.paused) return;
      var p = video.play();
      if (p && p.then) p.then(function () { video.classList.add("is-playing"); })
                        .catch(function () { /* autoplay bloqueado: fica a capa */ });
      else video.classList.add("is-playing");
    };
    video.addEventListener("playing", function () { video.classList.add("is-playing"); });

    var load = function () {
      if (video.dataset.loaded) return;
      video.dataset.loaded = "1";
      var s = document.createElement("source");
      s.src = src; s.type = "video/mp4";
      video.appendChild(s);
      video.addEventListener("loadeddata", startPlay, { once: true });
      video.addEventListener("canplay", startPlay, { once: true });
      video.load();
      startPlay();
      // último recurso: alguns navegadores só liberam o autoplay após uma interação
      ["touchstart", "click"].forEach(function (ev) {
        document.addEventListener(ev, startPlay, { once: true, passive: true });
      });
    };
    // Só depois da página carregar por completo, para não competir por banda
    // com o LCP e as métricas que o PageSpeed mede.
    var schedule = function () {
      if ("requestIdleCallback" in window) requestIdleCallback(load, { timeout: 2500 });
      else setTimeout(load, 1200);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
  })();

  /* ---------- Carrossel da galeria ---------- */
  (function carousel() {
    var root = document.querySelector("[data-carousel]");
    if (!root) return;
    var track = root.querySelector("[data-track]");
    var prev = root.querySelector("[data-prev]");
    var next = root.querySelector("[data-next]");
    var progress = root.querySelector("[data-progress]");

    var step = function () {
      var slide = track.querySelector(".slide");
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || 20) || 20;
      return slide ? slide.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
    };
    if (next) next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: "smooth" }); });
    if (prev) prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: "smooth" }); });

    var updateProgress = function () {
      var max = track.scrollWidth - track.clientWidth;
      var ratio = max > 0 ? track.scrollLeft / max : 0;
      var vis = Math.max(0.14, track.clientWidth / track.scrollWidth);
      progress.style.width = (vis * 100) + "%";
      progress.style.left = (ratio * (100 - vis * 100)) + "%";
    };
    track.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();

    /* arrastar com o mouse (desktop) */
    var down = false, startX = 0, startLeft = 0;
    track.addEventListener("mousedown", function (e) { down = true; startX = e.pageX; startLeft = track.scrollLeft; track.style.cursor = "grabbing"; });
    window.addEventListener("mouseup", function () { down = false; track.style.cursor = ""; });
    track.addEventListener("mouseleave", function () { down = false; track.style.cursor = ""; });
    track.addEventListener("mousemove", function (e) { if (!down) return; e.preventDefault(); track.scrollLeft = startLeft - (e.pageX - startX); });
  })();

  /* ---------- FAQ (acordeão) ---------- */
  (function faq() {
    var items = document.querySelectorAll(".acc-item");
    items.forEach(function (item) {
      var q = item.querySelector(".acc-q");
      var a = item.querySelector(".acc-a");
      q.addEventListener("click", function () {
        var open = item.classList.contains("is-open");
        // fecha os demais (comportamento de acordeão)
        items.forEach(function (other) {
          if (other !== item && other.classList.contains("is-open")) {
            other.classList.remove("is-open");
            other.querySelector(".acc-q").setAttribute("aria-expanded", "false");
            other.querySelector(".acc-a").style.height = "0px";
          }
        });
        if (open) {
          item.classList.remove("is-open");
          q.setAttribute("aria-expanded", "false");
          a.style.height = "0px";
        } else {
          item.classList.add("is-open");
          q.setAttribute("aria-expanded", "true");
          a.style.height = a.firstElementChild.offsetHeight + "px";
        }
      });
    });
    window.addEventListener("resize", function () {
      document.querySelectorAll(".acc-item.is-open .acc-a").forEach(function (a) {
        a.style.height = a.firstElementChild.offsetHeight + "px";
      });
    });
  })();

  /* ---------- Contador do número de prova social ---------- */
  (function counter() {
    var el = document.querySelector("[data-count]");
    if (!el || reduceMotion || !("IntersectionObserver" in window)) return;
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(el);
        var start = null, dur = 1400;
        var tick = function (t) {
          if (!start) start = t;
          var p = Math.min((t - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(eased * target);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    io.observe(el);
  })();

  /* ---------- Parallax + hero ao rolar ---------- */
  (function scrollFx() {
    if (reduceMotion) return;
    var pxEls = [].slice.call(document.querySelectorAll("[data-parallax]"));
    var heroInner = document.querySelector(".hero__inner");
    var heroMedia = document.querySelector(".hero__media");
    var hero = document.querySelector(".hero");
    var ticking = false;

    var update = function () {
      var vh = window.innerHeight;

      // parallax das imagens de fundo
      for (var i = 0; i < pxEls.length; i++) {
        var el = pxEls[i];
        var r = el.getBoundingClientRect();
        if (r.bottom < -240 || r.top > vh + 240) continue;
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.1;
        var offset = (r.top + r.height / 2) - vh / 2;
        el.style.transform = "translate3d(0," + (-offset * speed).toFixed(1) + "px,0)";
      }

      // hero: leve deslize + fade do conteúdo, zoom sutil do fundo
      if (hero) {
        var y = window.scrollY || window.pageYOffset;
        if (y < vh) {
          if (heroInner) {
            heroInner.style.transform = "translate3d(0," + (y * 0.22).toFixed(1) + "px,0)";
            heroInner.style.opacity = Math.max(0, 1 - y / (vh * 0.72)).toFixed(3);
          }
          if (heroMedia) heroMedia.style.transform = "scale(" + (1 + y / vh * 0.08).toFixed(4) + ")";
        }
      }
      ticking = false;
    };
    var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  })();

})();
