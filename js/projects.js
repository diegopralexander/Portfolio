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

    // The work, one tab per pillar (story.formats): { title, text, tabs: [{ pillar, items: [..] }] }
    // An item is a carousel { title, slides: [{ src, alt }] } or a reel { title, cover, video }.
    const pillarByKey = Object.fromEntries((story.pillars || []).filter((pl) => pl.key).map((pl) => [pl.key, pl]));
    const fm = story.formats;
    const fmTabs = fm ? (fm.tabs || []).map((t) => ({ ...t, items: (t.items || []).filter((m) => m && (m.video || (m.slides || []).length)) })).filter((t) => t.items.length) : [];
    const carousels = [];
    const formatItem = (m) => {
      if (m.video) return `
          <figure class="fmt-item is-reel">
            <div class="fmt-media">
              ${m.cover ? `<img src="${esc(m.cover)}" alt="${esc(m.title)}: Meet our partner cover" loading="lazy" decoding="async">` : ''}
              <video src="${esc(m.video)}" muted playsinline preload="none" aria-hidden="true"></video>
            </div>
            <figcaption>${esc(m.title)}</figcaption>
          </figure>`;
      carousels.push(m.slides.map((sl) => ({ src: sl.src, alt: sl.alt || m.title })));
      const n = m.slides.length;
      return `
          <figure class="fmt-item is-carousel">
            <button class="fmt-media" type="button" data-carousel="${carousels.length - 1}" aria-label="Open ${esc(m.title)}, ${n} slides">
              <img src="${esc(m.slides[0].src)}" alt="${esc(m.slides[0].alt || m.title)}" loading="lazy" decoding="async">
              ${n > 1 ? `<span class="fmt-count" aria-hidden="true">${n}</span>` : ''}
            </button>
            <figcaption>${esc(m.title)}</figcaption>
          </figure>`;
    };
    const formatsHtml = fmTabs.length ? `
      <section class="cs-formats reveal" aria-label="${esc(fm.title || 'The work')}">
        ${fm.title ? `<p class="eyebrow">${esc(fm.title)}</p>` : ''}
        ${fm.text ? `<p class="cs-body-text">${text(fm.text)}</p>` : ''}
        <div class="fmt-tabs" role="tablist">${fmTabs.map((t, i) => {
          const pl = pillarByKey[t.pillar] || {};
          return `
          <button type="button" role="tab" id="fmt-tab-${i}" aria-controls="fmt-panel-${i}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''} style="--pc:${esc(pl.color || 'var(--accent)')}">${esc(t.label || pl.title || t.pillar)} <span>${t.items.length}</span></button>`;
        }).join('')}
        </div>
        ${fmTabs.map((t, i) => `
        <div class="fmt-panel${t.items.some((m) => m.video) ? ' is-reels' : ''}" role="tabpanel" id="fmt-panel-${i}" aria-labelledby="fmt-tab-${i}"${i ? ' hidden' : ''}>
          ${t.items.map(formatItem).join('')}
        </div>`).join('')}
      </section>` : '';

    // Results (story.results): { title, lead, stats: [{ value, label, note }], chart: { title, note, bars: [{ label, value, display }] }, aside: [..], more: { title, stats: [..] } }
    const rs = story.results;
    const rsBars = rs && rs.chart ? (rs.chart.bars || []).filter((b) => b && b.value) : [];
    const rsMax = Math.max(...rsBars.map((b) => b.value), 1);
    const statList = (list) => `<dl class="rs-stats" style="--n:${list.length}">${list.map((st) => `
            <div><dt>${text(st.value)}</dt><dd>${text(st.label)}${st.note ? `<span>${text(st.note)}</span>` : ''}</dd></div>`).join('')}
          </dl>`;
    const resultsHtml = rs ? `
      <section class="cs-results reveal" aria-label="${esc(rs.title || 'Results')}">
        ${rs.title ? `<p class="eyebrow">${esc(rs.title)}</p>` : ''}
        ${rs.lead ? `<p class="cs-case-lead">${text(rs.lead)}</p>` : ''}
        ${(rs.stats || []).length ? statList(rs.stats) : ''}
        ${rsBars.length ? `
        <figure class="rs-chart" style="--card-color:${esc(p.cardColor)}">
          ${rs.chart.title ? `<figcaption>${esc(rs.chart.title)}</figcaption>` : ''}
          <ul>${rsBars.map((b) => `
            <li><span class="rs-label">${esc(b.label)}</span><span class="rs-bar"><span style="width:${Math.max(4, (b.value / rsMax) * 100).toFixed(1)}%"></span></span><span class="rs-val">${esc(b.display || b.value)}</span></li>`).join('')}
          </ul>
          ${(rs.aside || []).map((a) => `<p class="rs-note">${text(a)}</p>`).join('')}
          ${rs.link && rs.link.url ? `<a class="cs-proposal-cta rs-link" href="${esc(rs.link.url)}" target="_blank" rel="noopener">${esc(rs.link.label || 'View profile')} <span aria-hidden="true">↗</span></a>` : ''}
        </figure>` : ''}
        ${rs.more && (rs.more.stats || []).length ? `
        <div class="rs-more">
          ${rs.more.title ? `<p class="eyebrow">${esc(rs.more.title)}</p>` : ''}
          ${statList(rs.more.stats)}
        </div>` : ''}
      </section>` : '';

    const storyHtml = story.headline || (story.body || []).length ? `
      <section class="cs-story reveal">
        ${story.headline ? `<h2 class="cs-headline">${text(story.headline)}</h2>` : ''}
        ${story.subhead ? `<p class="cs-subhead">${text(story.subhead)}</p>` : ''}
        ${(story.body || []).map((para) => `<p class="cs-body-text">${text(para)}</p>`).join('')}
        ${(story.case || []).length ? `
        <div class="cs-case">
          ${story.caseTitle ? `<p class="eyebrow">${esc(story.caseTitle)}</p>` : ''}
          ${story.case.map((para, i) => `<p class="${i ? 'cs-body-text' : 'cs-case-lead'}">${text(para)}</p>`).join('')}
        </div>` : ''}
        ${(story.images || []).length ? `
        <div class="cs-trio" style="--n:${story.images.length};--ar:${story.images[0].width && story.images[0].height ? `${story.images[0].width} / ${story.images[0].height}` : '4 / 5'}">
          ${story.images.map((m) => `<figure>${mediaEl(m)}</figure>`).join('')}
        </div>` : ''}
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
        ${processHtml || resultsHtml || splitHtml ? `<div class="cs-after">${processHtml}${resultsHtml}${splitHtml}</div>` : ''}
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
    mount.querySelectorAll('.cs-formats').forEach((root) => initFormats(root, carousels));
  }

  /* ---------- The work: pillar tabs, carousels, silent looping reels ---------- */
  function initFormats(root, carousels) {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const panels = [...root.querySelectorAll('[role="tabpanel"]')];
    const videos = [...root.querySelectorAll('video')];
    const onScreen = new Set();
    // Reels loop like a GIF while on screen in the open tab: cover first, then the clip fades in,
    // and at the end of each clip the cover shows again for a moment.
    const COVER_MS = 1600;
    const run = (v, on) => {
      const fig = v.closest('.fmt-media');
      clearTimeout(v._t);
      if (!on) { v.pause(); fig.classList.remove('is-playing'); return; }
      if (!v.paused || v._waiting) return;
      v._waiting = true;
      v.preload = 'auto';
      v._t = setTimeout(() => {
        v._waiting = false;
        v.play().then(() => fig.classList.add('is-playing')).catch(() => {});
      }, COVER_MS);
    };
    videos.forEach((v) => v.addEventListener('ended', () => {
      v.closest('.fmt-media').classList.remove('is-playing');
      setTimeout(() => { v.currentTime = 0; sync(); }, 600);
    }));
    const sync = () => videos.forEach((v) => {
      const show = onScreen.has(v) && !v.closest('[role="tabpanel"]').hidden;
      if (!show) { v._waiting = false; run(v, false); } else run(v, true);
    });
    const select = (i) => {
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', i === j); t.tabIndex = i === j ? 0 : -1; });
      panels.forEach((p, j) => { p.hidden = i !== j; });
      sync();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => { select(i); t.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); });
      t.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { const n = (i + d + tabs.length) % tabs.length; select(n); tabs[n].focus(); }
      });
    });
    // a carousel opens in the photo viewer with all its slides
    root.querySelectorAll('[data-carousel]').forEach((btn) => {
      btn.addEventListener('click', () => window.openLightbox && window.openLightbox(carousels[btn.dataset.carousel], 0));
    });
    if (!videos.length) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return; // covers stay as still images
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)));
      sync();
    }, { threshold: 0.35 });
    videos.forEach((v) => io.observe(v));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); }); // browsers pause muted video in background tabs
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
