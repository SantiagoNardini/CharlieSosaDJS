/* Charlie Sosa DJs — JS del sitio (sin dependencias) */
(() => {
  "use strict";

  const doc = document.documentElement;
  doc.classList.add("js");

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = navigator.connection && navigator.connection.saveData;

  /* ---------- Año del footer ---------- */
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Footer: hora en vivo de Barcelona y Buenos Aires ---------- */
  const clocks = $$("time[data-tz]");
  if (clocks.length) {
    const tick = () => {
      const now = new Date();
      clocks.forEach((el) => {
        el.textContent = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: el.dataset.tz }).format(now);
      });
    };
    tick();
    setInterval(tick, 30000);
  }

  /* ---------- Menú móvil ---------- */
  const toggle = $(".nav-toggle");
  const nav = $("#menu");

  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  };

  if (toggle && nav) {
    toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); toggle.focus(); }
    });
    window.matchMedia("(min-width: 861px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });
  }

  /* ---------- Cabecera y botón "volver arriba" según scroll ---------- */
  const header = $(".site-header");
  const toTop = $(".fab-top");
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 40);
    toTop.classList.toggle("is-visible", y > 800);
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------- Resaltar la sección activa en el menú ---------- */
  const navLinks = $$('.nav a[href^="#"]:not(.btn)');
  if ("IntersectionObserver" in window && navLinks.length) {
    const byId = new Map(navLinks.map((a) => [a.getAttribute("href").slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.removeAttribute("aria-current"));
        const link = byId.get(entry.target.id);
        if (link) link.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- Aparición al hacer scroll (reemplaza a AOS) ---------- */
  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !reducedMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Videos: se cargan y reproducen solo cuando están en pantalla ---------- */
  const videos = $$("video[data-autoplay]");
  const loadVideo = (video) => {
    if (video.dataset.loaded) return;
    $$("source[data-src]", video).forEach((s) => { s.src = s.dataset.src; });
    video.load();
    video.dataset.loaded = "1";
  };

  if (!reducedMotion && !saveData && "IntersectionObserver" in window) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach(({ target: video, isIntersecting }) => {
        if (isIntersecting) {
          loadVideo(video);
          const p = video.play();
          if (p && p.catch) p.catch(() => {});
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { rootMargin: "200px 0px" });
    videos.forEach((v) => vio.observe(v));
  } else {
    // Con "reducir movimiento" o ahorro de datos: se muestran los pósters y controles.
    videos.forEach((v) => {
      if (!v.classList.contains("hero-video")) { v.controls = true; v.preload = "none"; loadVideo(v); }
    });
  }

  /* ---------- Carrusel de la galería ---------- */
  const carousel = $("[data-carousel]");
  if (carousel) {
    const step = () => {
      const slide = $(".slide", carousel);
      return slide ? slide.getBoundingClientRect().width + 18 : carousel.clientWidth * 0.8;
    };
    const atEnd = () => carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 4;
    // En PC arranca ya desplazado una foto: la primera asoma a la izquierda y no queda hueco vacío.
    const desktop = window.matchMedia("(min-width: 601px)");
    const home = () => (desktop.matches ? step() : 0);
    carousel.scrollLeft = home();

    const go = (dir) => {
      if (dir > 0 && atEnd()) carousel.scrollTo({ left: home(), behavior: "smooth" });
      else if (dir < 0 && carousel.scrollLeft <= 4) carousel.scrollTo({ left: carousel.scrollWidth, behavior: "smooth" });
      else carousel.scrollBy({ left: dir * step(), behavior: "smooth" });
    };

    $("[data-carousel-prev]")?.addEventListener("click", () => go(-1));
    $("[data-carousel-next]")?.addEventListener("click", () => go(1));
    carousel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    });

    // Autoplay suave: se pausa al pasar el mouse, al tocar, con foco o fuera de pantalla.
    if (!reducedMotion) {
      let timer = null;
      let visible = false;
      let hold = false;
      const start = () => { stop(); if (visible && !hold) timer = setInterval(() => go(1), 4500); };
      const stop = () => { clearInterval(timer); timer = null; };
      const pause = () => { hold = true; stop(); };
      const resume = () => { hold = false; start(); };

      carousel.addEventListener("mouseenter", pause);
      carousel.addEventListener("mouseleave", resume);
      carousel.addEventListener("focusin", pause);
      carousel.addEventListener("focusout", resume);
      carousel.addEventListener("touchstart", pause, { passive: true });

      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; start(); }, { threshold: 0.3 }).observe(carousel);
      document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    }
  }

  /* ---------- Visor de fotos ---------- */
  const lightbox = $("#lightbox");
  if (lightbox && typeof lightbox.showModal === "function") {
    const lbImg = $("img", lightbox);
    $$(".slide[data-full]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const img = $("img", btn);
        lbImg.src = btn.dataset.full;
        lbImg.alt = img ? img.alt : "";
        lightbox.showModal();
      });
    });
    $(".lightbox-close", lightbox).addEventListener("click", () => lightbox.close());
    lightbox.addEventListener("click", (e) => { if (e.target === lightbox) lightbox.close(); });
    lightbox.addEventListener("close", () => { lbImg.removeAttribute("src"); });
  }

  /* ---------- Spotify: el iframe se inserta solo al tocar "Ver playlist" (sin cookies antes) ---------- */
  const embed = $(".spotify-embed[data-src]");
  const loadSpotify = embed && $("[data-spotify-load]", embed);
  if (loadSpotify) {
    loadSpotify.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = embed.dataset.src;
      iframe.title = "Playlist de Charlie Sosa DJs en Spotify";
      iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
      embed.replaceChildren(iframe);
      iframe.focus();
    });
  }

  /* ---------- Formulario de contacto: WhatsApp o email ---------- */
  const form = $("#contact-form");
  if (form) {
    const status = $(".form-status", form);
    const WHATSAPP = "34660551818";
    const EMAIL = "info.csdjs@gmail.com";
    let channel = "whatsapp";

    $$("button[data-channel]", form).forEach((btn) => {
      btn.addEventListener("click", () => { channel = btn.dataset.channel; });
    });

    const setStatus = (msg, type) => {
      status.textContent = msg;
      status.className = "form-status" + (type ? " is-" + type : "");
    };

    form.addEventListener("input", (e) => {
      if (e.target.getAttribute("aria-invalid") === "true" && e.target.value.trim()) {
        e.target.removeAttribute("aria-invalid");
      }
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = form.elements;
      const invalid = [];

      [f.name, f.message].forEach((el) => {
        if (el.value.trim()) { el.removeAttribute("aria-invalid"); }
        else { el.setAttribute("aria-invalid", "true"); invalid.push(el); }
      });
      if (f.email.value.trim() && !f.email.checkValidity()) {
        f.email.setAttribute("aria-invalid", "true");
        invalid.push(f.email);
      }

      if (invalid.length) {
        setStatus("Completá tu nombre y el mensaje (y revisá el email si lo ingresaste).", "error");
        invalid[0].focus();
        return;
      }

      let fecha = "";
      if (f.date.value) {
        const [y, m, d] = f.date.value.split("-");
        fecha = `${d}/${m}/${y}`;
      }

      const details = [
        f.event.value && `Tipo de evento: ${f.event.value}`,
        fecha && `Fecha: ${fecha}`,
        f.phone.value.trim() && `Teléfono: ${f.phone.value.trim()}`,
        f.email.value.trim() && `Email: ${f.email.value.trim()}`,
      ].filter(Boolean);
      const text = [`¡Hola! Soy ${f.name.value.trim()}.`, ...details, "", f.message.value.trim()].join("\n");

      if (channel === "email") {
        const subject = `Consulta CS DJs${f.event.value ? " — " + f.event.value : ""}`;
        window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
        setStatus("Abrimos tu app de correo con el mensaje listo para enviar.", "ok");
      } else {
        window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
        setStatus("Abrimos WhatsApp con tu mensaje listo para enviar.", "ok");
      }
    });
  }
})();
