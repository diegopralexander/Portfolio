/* ==========================================================================
   main.js: interactions shared by every page
   - Theme toggle (light / dark, remembered per visitor)
   - Header border once the page scrolls
   - Live Barcelona clock badge in the footer
   - Reveal-on-scroll for elements with class="reveal"
   ========================================================================== */

(function () {
  const root = document.documentElement;
  root.classList.remove('no-js');

  /* ---------- Theme toggle ---------- */
  // The saved theme is applied by a tiny inline script in <head> to avoid a flash.
  const toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = root.dataset.theme ||
        (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = current === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) { /* storage blocked */ }
      toggle.setAttribute('aria-label', `Switch to ${current} theme`);
    });
  }

  /* ---------- Header state ---------- */
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Barcelona clock ---------- */
  const clocks = document.querySelectorAll('[data-clock]');
  if (clocks.length) {
    // Shows e.g. "FRI 12:19:07" (weekday + 24h time in Barcelona's time zone)
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid',
      weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    const label = (date) => {
      const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
      return `${p.weekday} ${p.hour}:${p.minute}:${p.second}`;
    };
    const tick = () => {
      const now = new Date();
      clocks.forEach((el) => {
        el.textContent = label(now);
        el.setAttribute('datetime', now.toISOString());
      });
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Current year in footers ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Reveal on scroll ---------- */
  // Exposed so projects.js can register cards it creates after loading the JSON.
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 })
    : null;

  window.observeReveal = function (scope) {
    (scope || document).querySelectorAll('.reveal:not(.is-in)').forEach((el) => {
      if (io) io.observe(el); else el.classList.add('is-in');
    });
  };
  window.observeReveal();
})();
