/* ==========================================================================
   projects.js: builds pages from data/projects.json
   - index.html     → fills #work-grid with one card per project
   - proyecto.html  → reads ?id=... and renders that case study into #case-study
   You shouldn't need to edit this file to change content: edit projects.json.
   ========================================================================== */

(function () {
  const DATA_URL = 'data/projects.json';

  /* ---------- Helpers ---------- */
  const esc = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  // Values starting with "TODO" get a dashed outline so they're easy to spot.
  const isTodo = (str) => /^\s*TODO/i.test(String(str ?? '')) || /TODO:/.test(String(str ?? ''));
  const text = (str) => isTodo(str) ? `<span class="todo">${esc(str)}</span>` : esc(str);

  async function loadProjects() {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Could not load ${DATA_URL} (${res.status})`);
    const data = await res.json();
    return (data.projects || []).slice().sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  }

  function loadError(target, err) {
    console.error(err);
    const local = location.protocol === 'file:';
    target.innerHTML = `<p class="status">${local
      ? 'Projects can’t load when the file is opened directly. Run a local server (see README.md) and open http://localhost:8000.'
      : 'Projects couldn’t load. Please refresh the page.'}</p>`;
  }

  /* ---------- index.html: cards ---------- */
  function renderCards(projects, grid) {
    grid.innerHTML = projects.map((p, i) => {
      const firstImage = p.cardImage || '';
      const isWord = !/\d/.test(p.cardStat || '');
      if (p.comingSoon) return `
        <div class="card is-locked reveal" aria-disabled="true" style="transition-delay:${(i % 2) * 80}ms">
          <div class="card-head">
            <h3 class="card-title display">${esc(p.title)}</h3>
            <p class="card-sub">${text(p.subtitle)}</p>
          </div>
          <div class="card-panel" style="--card-color:${esc(p.cardColor)}" data-ink="${esc(p.cardInk || 'light')}">
            ${p.cardImage ? `<img src="${esc(p.cardImage)}" alt="" loading="lazy" decoding="async"${p.cardImagePosition ? ` style="object-position:${esc(p.cardImagePosition)}"` : ''}>` : ''}
            <div class="meta"><span>${esc(p.category)}</span><span>${String(i + 1).padStart(2, '0')}</span></div>
            <div class="lock">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none"/></svg>
              <span class="card-stat display is-word">Coming soon</span>
            </div>
          </div>
        </div>`;
      return `
        <a class="card reveal" href="proyecto.html?id=${encodeURIComponent(p.id)}" style="transition-delay:${(i % 2) * 80}ms">
          <div class="card-head">
            <h3 class="card-title display">${esc(p.title)} <span class="arrow" aria-hidden="true">→</span></h3>
            <p class="card-sub">${text(p.subtitle)}</p>
          </div>
          <div class="card-panel" style="--card-color:${esc(p.cardColor)}" data-ink="${esc(p.cardInk || 'light')}">
            ${firstImage ? `<img src="${esc(firstImage)}" alt="" loading="lazy" decoding="async"${p.cardImagePosition ? ` style="object-position:${esc(p.cardImagePosition)}"` : ''}>` : ''}
            <div class="meta"><span>${esc(p.category)}</span><span>${String(i + 1).padStart(2, '0')}</span></div>
            ${firstImage ? '' : `
            <div>
              <div class="card-stat display${isWord ? ' is-word' : ''}">${esc(p.cardStat)}</div>
              <p class="card-stat-label">${esc(p.cardStatLabel)}</p>
            </div>`}
          </div>
        </a>`;
    }).join('');

    if (window.observeReveal) window.observeReveal(grid);
  }

  /* ---------- proyecto.html: case study ---------- */
  function renderCaseStudy(projects, mount) {
    const id = new URLSearchParams(location.search).get('id');
    const index = projects.findIndex((p) => p.id === id);

    // Locked pages can still be previewed while building them: localhost + ?preview
    const localPreview = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('preview');
    if (index !== -1 && projects[index].comingSoon && !localPreview) {
      document.title = `${projects[index].title} · Coming soon · Diego Prado`;
      mount.innerHTML = `
        <section class="cs-hero wrap">
          <a class="back" href="index.html#work">← Recent Works</a>
          <h1 class="display">${esc(projects[index].title)}</h1>
          <p class="lead">This case study is coming soon.</p>
        </section>`;
      return;
    }
    if (index === -1) {
      document.title = 'Project not found · Diego Prado';
      mount.innerHTML = `
        <section class="cs-hero wrap">
          <a class="back" href="index.html#work">← Recent Works</a>
          <h1 class="display">Not found</h1>
          <p class="lead">That project doesn’t exist, or the link has changed.</p>
          <p style="margin-top:24px"><a class="back" href="index.html#work">See all work →</a></p>
        </section>`;
      return;
    }

    const p = projects[index];
    const open = projects.filter((x) => !x.comingSoon);
    const next = open[(open.indexOf(projects[index]) + 1) % open.length] || projects[(index + 1) % projects.length];
    const stats = p.stats || [];
    const story = p.story || {};
    const tags = p.tags || [];

    document.title = `${p.title} · Diego Prado`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', `${p.title}: ${p.subtitle}`);

    // One image, GIF or video. Videos (.mp4 / .webm) play muted and looping, like a GIF.
    const mediaEl = (m, eager) => {
      const dims = `${m.width ? `width="${esc(m.width)}"` : ''} ${m.height ? `height="${esc(m.height)}"` : ''}`;
      return /\.(mp4|webm)$/i.test(m.src)
        ? `<video src="${esc(m.src)}" ${dims} autoplay muted loop playsinline preload="metadata" aria-label="${esc(m.alt)}"></video>`
        : `<img src="${esc(m.src)}" alt="${esc(m.alt)}" ${dims} ${eager ? '' : 'loading="lazy"'} decoding="async">`;
    };

    // Gallery layout is automatic: wide images (w/h >= 1.3) get a full row,
    // square or portrait ones pair up two per row, in the order listed.
    const isWide = (m) => m.width && m.height && m.width / m.height >= 1.3;
    const galleryHtml = (() => {
      const items = (p.gallery || []).filter((m) => m && m.src);
      const rows = [];
      let pair = [];
      items.forEach((m) => {
        if (isWide(m)) {
          if (pair.length) { rows.push(pair); pair = []; }
          rows.push([m]);
        } else {
          pair.push(m);
          if (pair.length === 2) { rows.push(pair); pair = []; }
        }
      });
      if (pair.length) rows.push(pair);
      return rows.map((row) => {
        const type = row.length === 2 ? 'is-pair' : (isWide(row[0]) ? 'is-full' : 'is-single');
        return `<div class="cs-row ${type} reveal">${row.map((m) => `<figure>${mediaEl(m)}</figure>`).join('')}</div>`;
      }).join('');
    })();

    const band = stats.length
      ? `<div class="cs-band n-${stats.length} reveal" style="--card-color:${esc(p.cardColor)}" data-ink="${esc(p.cardInk || 'light')}">
          ${stats.map((s) => `
            <div>
              <div class="stat-value">${esc(s.value)}</div>
              <p class="stat-label">${esc(s.label)}</p>
            </div>`).join('')}
        </div>`
      : ''; // no stats: no banner

    const cover = p.cover && p.cover.src
      ? `<figure class="cs-cover reveal">${mediaEl(p.cover, true)}</figure>`
      : band; // no picture yet: the numbers banner takes its place

    // "Who did what" columns (story.split): { title, columns: [{ heading, items: [..] }] }
    const sp = story.split;
    const splitHtml = sp && (sp.columns || []).length ? `
        <div class="cs-split">
          ${sp.title ? `<p class="eyebrow">${esc(sp.title)}</p>` : ''}
          <div class="cs-split-cols">${sp.columns.map((c) => `
            <div><h3>${esc(c.heading)}</h3><ul>${(c.items || []).map((it) => `<li>${text(it)}</li>`).join('')}</ul></div>`).join('')}
          </div>
        </div>` : '';

    // Method steps + one result (story.process): { title, steps: [{ title, text }], result: { value, label } }
    const pc = story.process;
    const processHtml = pc && (pc.steps || []).length ? `
        <div class="cs-process">
          ${pc.title ? `<p class="eyebrow">${esc(pc.title)}</p>` : ''}
          <ol>${pc.steps.map((st, i) => `
            <li><span class="n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(st.title)}</h3><p>${text(st.text)}</p></li>`).join('')}
          </ol>
          ${pc.result && pc.result.value ? `<p class="cs-process-result"><strong>${text(pc.result.value)}</strong> <span>${text(pc.result.label)}</span></p>` : ''}
        </div>` : '';

    // Posts / Stories / Reels in tabs (story.formats): { title, tabs: [{ label, ratio, items: [{ src, alt, pillar }] }] }
    // An item's pillar comes from "pillar", or from the file name: 01-visa.jpg -> pillar key "visa".
    const pillarByKey = Object.fromEntries((story.pillars || []).filter((pl) => pl.key).map((pl) => [pl.key, pl]));
    const fm = story.formats;
    const fmTabs = fm ? (fm.tabs || []).map((t) => ({ ...t, items: (t.items || []).filter((m) => m && m.src) })).filter((t) => t.items.length) : [];
    const formatItem = (m) => {
      const key = m.pillar || (m.src.match(/\/\d+-([a-z-]+)\.[a-z0-9]+$/i) || [])[1];
      const pl = pillarByKey[key];
      const isVideo = /\.(mp4|webm|mov)$/i.test(m.src);
      const media = isVideo
        ? `<video src="${esc(m.src)}" ${m.poster ? `poster="${esc(m.poster)}"` : ''} muted loop playsinline preload="metadata" aria-label="${esc(m.alt)}"></video><span class="fmt-play" aria-hidden="true"></span>`
        : `<img src="${esc(m.src)}" alt="${esc(m.alt)}" loading="lazy" decoding="async">`;
      return `<figure class="fmt-item${isVideo ? ' is-video' : ''}">${media}${pl ? `<figcaption class="fmt-tag" style="--pc:${esc(pl.color || 'var(--accent)')}">${esc(pl.title)}</figcaption>` : ''}</figure>`;
    };
    const formatsHtml = fmTabs.length ? `
      <section class="cs-formats reveal" aria-label="${esc(fm.title || 'The work')}">
        ${fm.title ? `<p class="eyebrow">${esc(fm.title)}</p>` : ''}
        ${fm.text ? `<p class="cs-body-text">${text(fm.text)}</p>` : ''}
        <div class="fmt-tabs" role="tablist">${fmTabs.map((t, i) => `
          <button type="button" role="tab" id="fmt-tab-${i}" aria-controls="fmt-panel-${i}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${esc(t.label)} <span>${t.items.length}</span></button>`).join('')}
        </div>
        ${fmTabs.map((t, i) => `
        <div class="fmt-panel" role="tabpanel" id="fmt-panel-${i}" aria-labelledby="fmt-tab-${i}" style="--ar:${esc(t.ratio || '4 / 5')}"${i ? ' hidden' : ''}>
          ${t.items.map(formatItem).join('')}
        </div>`).join('')}
      </section>` : '';

    const storyHtml = story.headline || (story.body || []).length ? `
      <section class="cs-story reveal">
        ${story.headline ? `<h2 class="cs-headline">${text(story.headline)}</h2>` : ''}
        ${story.subhead ? `<p class="cs-subhead">${text(story.subhead)}</p>` : ''}
        ${(story.body || []).map((para) => `<p class="cs-body-text">${text(para)}</p>`).join('')}
        ${(story.images || []).length ? `
        <div class="cs-trio" style="--n:${story.images.length};--ar:${story.images[0].width && story.images[0].height ? `${story.images[0].width} / ${story.images[0].height}` : '4 / 5'}">
          ${story.images.map((m) => `<figure>${mediaEl(m)}</figure>`).join('')}
        </div>` : ''}
        ${splitHtml}
        ${(story.pillars || []).length ? `
        <div class="cs-pillars${story.pillars.some((pl) => pl.role) ? ' has-roles' : ''}">
          ${story.pillarsTitle ? `<p class="eyebrow">${esc(story.pillarsTitle)}</p>` : ''}
          <ol>${story.pillars.map((pl, i) => `
            <li${pl.color ? ` style="--pc:${esc(pl.color)}"` : ''}>
              <span class="n">${String(i + 1).padStart(2, '0')}${pl.role ? `<span class="pl-role">${esc(pl.role)}</span>` : ''}</span>
              <h3>${esc(pl.title)}</h3><p>${text(pl.text)}</p>
              ${(pl.chips || []).length ? `<ul class="pl-chips">${pl.chips.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
            </li>`).join('')}
          </ol>
        </div>` : ''}
        ${processHtml}
      </section>` : '';

    // Looping image slider (story.carousel): fixed height, images at natural width, arrows + drag.
    const slides = (story.carousel || []).filter((m) => m && m.src);
    const carouselHtml = slides.length ? `
      <div class="cs-carousel reveal" aria-roledescription="carousel" aria-label="${esc(p.title)} lookbook">
        <div class="cs-carousel-track">
          ${[0, 1, 2].map((copy) => slides.map((m) => `
            <figure class="cs-slide"${copy === 1 ? '' : ' aria-hidden="true"'}>
              <img src="${esc(m.src)}" alt="${copy === 1 ? esc(m.alt) : ''}" width="${esc(m.width)}" height="${esc(m.height)}" decoding="async" draggable="false">
            </figure>`).join('')).join('')}
        </div>
        <button class="cs-carousel-btn prev" type="button" aria-label="Previous image">←</button>
        <button class="cs-carousel-btn next" type="button" aria-label="Next image">→</button>
      </div>` : '';

    // Rows of images after the banner: every image in a row has the same height,
    // and the row fits the page width (never taller than the slider).
    const stripRow = (row) => {
      const list = (row || []).filter((m) => m && m.src && m.width && m.height);
      if (!list.length) return '';
      const ratios = list.map((m) => (m.width / m.height).toFixed(4));
      return `
      <div class="cs-strip reveal" style="--cols:${ratios.map((r) => `${r}fr`).join(' ')};--sum:${ratios.reduce((s, r) => s + Number(r), 0).toFixed(4)};--count:${list.length}">
        ${list.map((m) => `<figure>${mediaEl(m)}</figure>`).join('')}
      </div>`;
    };
    const stripsHtml = (story.strips || (story.strip ? [story.strip] : [])).map(stripRow).join('');

    // External projects list (story.works), e.g. fashion stories hosted on Readymag
    const works = (story.works || []).filter((w) => w && w.title);
    const worksHtml = works.length ? `
      <section class="cs-works reveal">
        ${story.worksTitle ? `<p class="eyebrow">${esc(story.worksTitle)}</p>` : ''}
        ${works.map((w) => `
          <article class="cs-work${w.image ? ' has-image' : ''}">
            ${w.image ? `<a class="cs-work-img" href="${esc(w.url)}" target="_blank" rel="noopener" aria-label="${esc(w.cta || w.title)}">${mediaEl(w.image)}</a>` : ''}
            <div class="cs-work-body">
            <div class="cs-work-head">
              <h3 class="display">${esc(w.title)}</h3>
              ${w.year ? `<span class="cs-work-year">${esc(w.year)}</span>` : ''}
            </div>
            ${w.category ? `<p class="eyebrow">${esc(w.category)}</p>` : ''}
            ${w.text ? `<p class="cs-body-text">${text(w.text)}</p>` : ''}
            ${(w.credits || []).length ? `<ul class="cs-work-credits">${w.credits.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
            ${w.url ? `<a class="cs-proposal-cta" href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.cta || 'View project')} <span aria-hidden="true">↗</span></a>` : ''}
            </div>
          </article>`).join('')}
      </section>` : '';

    // Photo journal (story.journal): black, full-width, one centered column of photos
    const journal = (story.journal || []).filter((m) => m && m.src);
    const journalHtml = journal.length ? `
      <section class="cs-journal" aria-label="${esc(story.journalTitle || 'Photo journal')}">
        ${story.journalTitle ? `<p class="cs-journal-title">${esc(story.journalTitle)}</p>` : ''}
        <div class="cs-journal-grid">
          ${journal.map((m) => `
          <figure>
            ${mediaEl(m)}
            ${m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : ''}
          </figure>`).join('')}
        </div>
      </section>` : '';

    // Compact photo gallery in columns (story.masonry), photographer-portfolio style
    const masonry = (story.masonry || []).filter((m) => m && m.src);
    const masonryHtml = masonry.length ? `
      <div class="cs-masonry reveal">
        ${masonry.map((m) => `<figure>${mediaEl(m)}</figure>`).join('')}
      </div>` : '';

    // Closing "proposal" section: live, scaled-down preview of a separate page + link
    const pr = p.proposal;
    const proposalHtml = pr && pr.url ? `
      <section class="cs-proposal reveal">
        ${pr.eyebrow ? `<p class="eyebrow">${esc(pr.eyebrow)}</p>` : ''}
        ${pr.title ? `<h2 class="cs-headline">${esc(pr.title)}</h2>` : ''}
        ${pr.text ? `<p class="cs-body-text">${text(pr.text)}</p>` : ''}
        <a class="cs-proposal-frame" href="${esc(pr.url)}" aria-label="${esc(pr.cta || 'Open the proposal')}">
          <iframe src="${esc(pr.url)}" title="${esc(pr.title || 'Proposal')} preview" loading="lazy" scrolling="no" tabindex="-1" aria-hidden="true"></iframe>
        </a>
        <a class="cs-proposal-cta" href="${esc(pr.url)}">${esc(pr.cta || 'View the proposal')} <span aria-hidden="true">→</span></a>
      </section>` : '';

    mount.innerHTML = `
      <section class="cs-hero wrap">
        <a class="back" href="index.html#work">← Recent Works</a>
        <p class="eyebrow">${esc(p.category)}</p>
        <h1 class="display">${esc(p.title)}</h1>
        <p class="lead">${text(p.subtitle)}</p>
        ${[['Sector', p.sector], ['Role', p.role], ['When', p.dates], ['Where', p.location]].some(([, v]) => v) ? `
        <dl class="cs-facts">
          ${[['Sector', p.sector], ['Role', p.role], ['When', p.dates], ['Where', p.location]]
            .filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd>${text(v)}</dd></div>`).join('')}
        </dl>` : ''}
        ${tags.length ? `
        <div class="cs-tags">
          <p class="eyebrow">What I did</p>
          <ul>${tags.map((tg) => `<li>${esc(tg)}</li>`).join('')}</ul>
        </div>` : ''}
      </section>
      ${cover ? `<div class="wrap">${cover}</div>` : ''}
      <div class="cs-content wrap">
        ${storyHtml}
        ${formatsHtml}
        ${proposalHtml}
        ${journalHtml}
        ${worksHtml}
        ${masonryHtml}
        ${carouselHtml}
        ${story.banner && story.banner.src ? `<figure class="cs-banner reveal">${mediaEl(story.banner)}</figure>` : ''}
        ${stripsHtml}
        ${p.cover && p.cover.src ? band : ''}
        ${galleryHtml ? `<div class="cs-gallery">${galleryHtml}</div>` : ''}
      </div>
      <nav class="cs-next wrap" aria-label="Next project">
        <a href="proyecto.html?id=${encodeURIComponent(next.id)}">
          <span class="eyebrow">Next project</span>
          <div class="title">${esc(next.title)} <span class="arrow" aria-hidden="true">→</span></div>
        </a>
      </nav>`;

    if (window.observeReveal) window.observeReveal(mount);
    mount.querySelectorAll('.cs-carousel').forEach(initCarousel);
    mount.querySelectorAll('.cs-proposal-frame').forEach(scalePreview);
    if (window.initLightbox) window.initLightbox(mount, '.cs-journal img');
    mount.querySelectorAll('.cs-formats').forEach(initFormats);
  }

  /* ---------- Posts / Stories / Reels tabs ---------- */
  function initFormats(root) {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const panels = [...root.querySelectorAll('[role="tabpanel"]')];
    const select = (i) => {
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', i === j); t.tabIndex = i === j ? 0 : -1; });
      panels.forEach((p, j) => { p.hidden = i !== j; });
      root.querySelectorAll('video').forEach((v) => v.pause());
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { const n = (i + d + tabs.length) % tabs.length; select(n); tabs[n].focus(); }
      });
    });
    // each panel's images browse as their own set in the photo viewer
    panels.forEach((p) => { if (window.initLightbox) window.initLightbox(p, '.fmt-item img'); });
    // reels: play on hover (mouse) or tap (touch), muted
    root.querySelectorAll('.fmt-item.is-video').forEach((fig) => {
      const v = fig.querySelector('video');
      const set = (on) => { fig.classList.toggle('is-playing', on); if (on) v.play().catch(() => {}); else v.pause(); };
      fig.addEventListener('mouseenter', () => set(true));
      fig.addEventListener('mouseleave', () => set(false));
      fig.addEventListener('click', () => set(v.paused));
    });
  }

  /* ---------- Proposal preview: render the page at desktop width, scaled to fit ---------- */
  function scalePreview(frame) {
    const iframe = frame.querySelector('iframe');
    const fit = () => {
      const w = frame.clientWidth;
      const desktop = w >= 700;
      const base = desktop ? 1440 : w; // phones show the page's own mobile layout
      const s = w / base;
      iframe.style.width = `${base}px`;
      iframe.style.height = `${frame.clientHeight / s}px`;
      iframe.style.transform = `scale(${s})`;
    };
    fit();
    window.addEventListener('resize', fit, { passive: true });
  }

  /* ---------- Carousel: infinite loop, arrows move one image, drag to scroll ---------- */
  function initCarousel(root) {
    const track = root.querySelector('.cs-carousel-track');
    const items = [...track.children];
    const setSize = items.length / 3;
    const setWidth = () => items[setSize].offsetLeft - items[0].offsetLeft;
    let dragging = false, startX = 0, startLeft = 0;

    // start on the middle copy, then keep the scroll inside it so the loop never ends
    const recenter = () => {
      const w = setWidth();
      if (!w) return;
      if (track.scrollLeft < w * 0.5) track.scrollLeft += w;
      else if (track.scrollLeft > w * 1.5) track.scrollLeft -= w;
    };
    const start = () => { track.scrollLeft = setWidth(); };
    start();
    items.forEach((el) => { const img = el.querySelector('img'); if (img && !img.complete) img.addEventListener('load', () => { if (track.scrollLeft < 2) start(); }, { once: true }); });
    let settle;
    let pending = null; // where the current arrow animation is heading
    track.addEventListener('scroll', () => {
      if (dragging) return;
      clearTimeout(settle);
      settle = setTimeout(() => { pending = null; recenter(); }, 150); // after smooth scrolling ends
    }, { passive: true });

    let lastClick = 0;
    const step = (dir) => {
      // a new click after the last animation: start from where we are (and re-loop if needed);
      // quick repeated clicks keep advancing from the previous target
      if (pending === null || Date.now() - lastClick > 700) { pending = null; recenter(); }
      lastClick = Date.now();
      const left = pending ?? track.scrollLeft;
      const offsets = items.map((el) => el.offsetLeft - items[0].offsetLeft);
      const target = dir > 0
        ? offsets.find((o) => o > left + 2)
        : [...offsets].reverse().find((o) => o < left - 2);
      if (target === undefined) return;
      pending = target;
      track.scrollTo({ left: target, behavior: 'smooth' });
    };
    root.querySelector('.prev').addEventListener('click', () => step(-1));
    root.querySelector('.next').addEventListener('click', () => step(1));

    // mouse drag (touch already scrolls natively)
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      dragging = true; startX = e.clientX; startLeft = track.scrollLeft;
      track.classList.add('is-dragging'); track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', (e) => { if (dragging) track.scrollLeft = startLeft - (e.clientX - startX); });
    const end = () => { if (!dragging) return; dragging = false; track.classList.remove('is-dragging'); recenter(); };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
  }

  /* ---------- Boot ---------- */
  const grid = document.getElementById('work-grid');
  const mount = document.getElementById('case-study');
  if (!grid && !mount) return;

  loadProjects()
    .then((projects) => {
      if (grid) renderCards(projects, grid);
      if (mount) renderCaseStudy(projects, mount);
    })
    .catch((err) => loadError(grid || mount, err));
})();
