/* ==========================================================================
   lightbox.js: click a photo to see it full size, uncropped.
   window.initLightbox(container, selector) wires every matching <img>.
   Arrows / keyboard / swipe to browse, Esc / ✕ / backdrop to close.
   ========================================================================== */

(function () {
  let dialog, imgEl, countEl, capEl, items = [], index = 0;

  function build() {
    dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.setAttribute('aria-label', 'Photo viewer');
    dialog.innerHTML = `
      <button class="lb-close" type="button" aria-label="Close">✕</button>
      <button class="lb-nav lb-prev" type="button" aria-label="Previous photo">←</button>
      <figure class="lb-stage"><img alt=""><figcaption><span class="lb-count"></span><span class="lb-cap"></span></figcaption></figure>
      <button class="lb-nav lb-next" type="button" aria-label="Next photo">→</button>`;
    document.body.appendChild(dialog);
    imgEl = dialog.querySelector('.lb-stage img');
    countEl = dialog.querySelector('.lb-count');
    capEl = dialog.querySelector('.lb-cap');

    dialog.querySelector('.lb-close').addEventListener('click', close);
    dialog.querySelector('.lb-prev').addEventListener('click', () => show(index - 1));
    dialog.querySelector('.lb-next').addEventListener('click', () => show(index + 1));
    // click on the dark backdrop (not on the photo or a button) closes
    dialog.addEventListener('click', (e) => { if (e.target === dialog || e.target.classList.contains('lb-stage')) close(); });
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') show(index + 1);
      if (e.key === 'ArrowLeft') show(index - 1);
    });
    dialog.addEventListener('close', () => document.documentElement.classList.remove('lb-open'));

    // swipe on touch screens
    let x0 = null;
    dialog.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') x0 = e.clientX; });
    dialog.addEventListener('pointerup', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    });
  }

  function show(i) {
    index = (i + items.length) % items.length;
    const src = items[index];
    imgEl.src = src.currentSrc || src.src;
    imgEl.alt = src.alt || '';
    countEl.textContent = `${index + 1} / ${items.length}`;
    const cap = src.closest('figure')?.querySelector('figcaption')?.textContent || '';
    capEl.textContent = cap;
    // preload the next one
    const next = items[(index + 1) % items.length];
    if (next) { const pre = new Image(); pre.src = next.currentSrc || next.src; }
  }

  function open(i) {
    if (!dialog) build();
    show(i);
    document.documentElement.classList.add('lb-open');
    if (!dialog.open) dialog.showModal();
  }

  function close() { if (dialog && dialog.open) dialog.close(); }

  window.initLightbox = function (container, selector) {
    const imgs = [...(container || document).querySelectorAll(selector)];
    if (!imgs.length) return;
    // each call is its own set: arrows browse only the photos of that group
    const openAt = (i) => { items = imgs; open(i); };
    imgs.forEach((img, i) => {
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', `Open photo ${i + 1} of ${imgs.length}`);
      img.addEventListener('click', () => openAt(i));
      img.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAt(i); } });
    });
  };
})();
