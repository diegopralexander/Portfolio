/* ==========================================================================
   flipbook.js: the two squares on the home page that flick through work and
   photography like a GIF (hard cuts). Runs only while they're on screen.
   Edit the image lists below; files live in assets/images/flipbook/.
   ========================================================================== */

(function () {
  const BASE = 'assets/images/flipbook/';
  const n = (prefix, count) => Array.from({ length: count }, (_, i) => `${BASE}${prefix}-${String(i + 1).padStart(2, '0')}.jpg`);
  const SETS = {
    // Casalia interiors + Placement carousels (all already tall, so nothing important gets cropped)
    work: ['02', '04', '15', '05', '10', '16', '08', '17', '13', '18', '19'].map((k) => `${BASE}work-${k}.jpg`),
    // Through the Lens: black & white with the colour shots spaced out
    photo: ['01', '13', '03', '08', '16', '07', '10', '18', '02', '05', '14', '09', '11', '15', '04', '06', '17', '12'].map((k) => `${BASE}photo-${k}.jpg`),
  };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-flip]').forEach((fig) => {
    const list = SETS[fig.dataset.flip] || [];
    if (!list.length) return;
    const speed = Number(fig.dataset.speed) || 600;
    const offset = Number(fig.dataset.offset) || 0;

    const stage = document.createElement('div');
    stage.className = 'flip-stage';
    fig.prepend(stage);
    const imgs = list.map((src, i) => {
      const img = new Image();
      img.alt = '';
      img.decoding = 'async';
      img.dataset.src = src;
      // ready = downloaded *and* decoded, so a hard cut never flashes an empty frame
      img.addEventListener('load', () => {
        if (img.decode) img.decode().then(() => { img._ready = true; }, () => { img._ready = true; });
        else img._ready = true;
      });
      if (i < 3) img.src = src; // first frames load right away
      stage.appendChild(img);
      return img;
    });
    imgs[0].classList.add('is-on');
    if (reduce) return; // one still image, no flicking

    let index = 0, timer = null, loadedAll = false;
    const loadRest = () => {
      if (loadedAll) return;
      loadedAll = true;
      imgs.forEach((img) => { if (!img.src) img.src = img.dataset.src; });
    };
    const tick = () => {
      // jump to the next image that has finished loading (never shows a blank frame)
      for (let step = 1; step <= imgs.length; step++) {
        const next = (index + step) % imgs.length;
        if (imgs[next]._ready) {
          imgs[index].classList.remove('is-on');
          imgs[next].classList.add('is-on');
          index = next;
          break;
        }
      }
    };
    const play = () => {
      if (timer) return;
      loadRest();
      timer = setTimeout(function run() { tick(); timer = setTimeout(run, speed); }, speed + offset);
    };
    const stop = () => { clearTimeout(timer); timer = null; };

    let visible = false;
    const sync = () => (visible && !document.hidden ? play() : stop());
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        if (entries[0].intersectionRatio > 0 || entries[0].isIntersecting) loadRest();
        sync();
      }, { rootMargin: '200px 0px', threshold: 0 }).observe(fig);
    } else { visible = true; sync(); }
    document.addEventListener('visibilitychange', sync);
  });
})();
