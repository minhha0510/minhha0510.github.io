/* Volumes load early for the cover; the unchanged layout routine waits for the DOM.
   The front page still loads with defer and runs the routine immediately. */
(() => {
  const initialize = () => {
    const motion = window.Paper;
/* Shared paper behavior. Load with defer, after paper.css. */
(() => {
  const R = 28;
  const root = document.documentElement;
  root.classList.add('js');
  if (location.search.includes('static')) root.classList.add('static');
  const still = root.classList.contains('static') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still && document.querySelector('.paper-head')) root.classList.add('static');
  const sheet = document.getElementById('sheet') || document.querySelector('.sheet');
  const ink = sheet?.querySelector('.ink');
  const nib = sheet?.querySelector('.nib');
  let nodes = [];

  // The head bootstrap normally sets this before paint; keep standalone use safe too.
  if (!root.hasAttribute('data-theme')) {
    let saved;
    try { saved = localStorage.getItem('theme'); } catch {}
    root.setAttribute('data-theme', saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  }
  // The site layout owns its own toggle. Only standalone headers bind here.
  document.querySelectorAll('.paper-head .theme-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
      try { localStorage.setItem('theme', theme); } catch {}
    });
  });

  // Keep the rhythm: anything of free height is padded to whole rules.
  function snap(sel) {
    const els = [...document.querySelectorAll(sel)];
    els.forEach(el => { el.style.minHeight = ''; });
    const hs = els.map(el => el.offsetHeight);
    els.forEach((el, i) => { el.style.minHeight = Math.ceil(hs[i] / R - 0.02) * R + 'px'; });
  }

  let sheetTop = 0, sheetH = 0, nodeY = [], maxScroll = 0, tipAtMax = 0;
  function measure() {
    snap('.snap');
    snap('.row > *');
    nodes = [...document.querySelectorAll('.node')];
    reached = -1;
    if (sheet) {
      sheetTop = sheet.getBoundingClientRect().top + scrollY;
      sheetH = sheet.offsetHeight;
      nodeY = nodes.map(n => n.offsetTop + 14);
      maxScroll = Math.max(1, root.scrollHeight - innerHeight);
      tipAtMax = maxScroll + innerHeight * 0.62 - sheetTop;
    }
    observeReveals();
  }

  let ticking = false, reached = -1;
  function frame() {
    ticking = false;
    if (!sheet || !sheetH) return;
    let tip = sheetH;
    if (!still) {
      tip = scrollY + innerHeight * 0.62 - sheetTop;
      const tail = Math.max(0, scrollY - (maxScroll - innerHeight * 0.5)) / (innerHeight * 0.5);
      tip += Math.min(1, tail) * Math.max(0, sheetH - tipAtMax);
      tip = Math.min(sheetH, Math.max(0, tip));
    }
    if (ink) ink.style.transform = `scaleY(${tip / sheetH})`;
    if (nib) nib.style.transform = `translateY(${tip}px)`;
    const n = nodeY.filter(y => y <= tip).length;
    if (n !== reached) { reached = n; nodes.forEach((el, i) => el.classList.toggle('reached', i < n)); }
  }
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };

  const io = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' })
    : null;
  function observeReveals() {
    document.querySelectorAll('.reveal:not(.in)').forEach(el => {
      if (io) io.observe(el);
      else el.classList.add('in');
    });
  }

  window.Paper = { measure() { measure(); request(); } };
  measure();
  if (!still) {
    ink?.classList.add('settle');
    nib?.classList.add('settle');
    setTimeout(() => { ink?.classList.remove('settle'); nib?.classList.remove('settle'); }, 1200);
  }
  requestAnimationFrame(frame);
  document.fonts && document.fonts.ready.then(() => { measure(); request(); });
  addEventListener('scroll', request, { passive: true });
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); request(); }, 120); });
})();
    if (motion) Object.assign(window.Paper, motion);
  };
  if (document.readyState === 'loading') {
    const parsed = () => {
      if (document.readyState === 'loading') return;
      document.removeEventListener('readystatechange', parsed);
      initialize();
    };
    document.addEventListener('readystatechange', parsed);
  } else initialize();
})();

/* A separate motion layer: no layout, theme, ink or scroll changes at rest. */
(() => {
  const root = document.documentElement;
  const volume = root.dataset.volume;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => location.search.includes('static') || reduced.matches;
  const read = key => { try { return sessionStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { sessionStorage.setItem(key, value); } catch {} };
  const forget = key => { try { sessionStorage.removeItem(key); } catch {} };
  const seenKey = `paper:opened:${volume}`;
  let active = null, opening = null, leaves = null;
  let interrupted = false, revealed = false;
  const sheet = () => document.querySelector('.sheet');
  const navigationType = performance.getEntriesByType('navigation')[0]?.type;

  function page(url) {
    if (!url) return null;
    try {
      const parsed = new URL(url, location.href);
      if (parsed.origin !== location.origin) return null;
      const path = parsed.pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
      if (path === '/') return { kind: 'front', url: parsed };
      if (path === '/medication-origin') return { kind: 'tome', url: parsed };
      if (path === '/hairloss' || path === '/hairloss/vi') return { kind: 'booklet', url: parsed };
    } catch {}
    return null;
  }
  function journey(fromURL, toURL) {
    const from = page(fromURL), to = page(toURL);
    if (!from || !to || from.url.search.includes('static') || to.url.search.includes('static')) return null;
    if (from.kind === 'front' && to.kind !== 'front') return { direction: 'forward', weight: to.kind };
    if (from.kind !== 'front' && to.kind === 'front') return { direction: 'back', weight: from.kind };
    if (from.kind === 'booklet' && to.kind === 'booklet' && from.url.pathname !== to.url.pathname)
      return { direction: 'language', weight: 'booklet' };
    return null;
  }
  function receipt() {
    try {
      const item = JSON.parse(read('paper:arrival'));
      if (item && Date.now() - item.time < 15000 && item.to === location.href) return item;
    } catch {}
    return null;
  }
  function setMotion(info, local = false) {
    root.dataset.paperMotion = info.direction;
    root.dataset.paperWeight = info.weight;
    if (local) root.dataset.paperLocal = '';
  }
  function clearMotion() {
    delete root.dataset.paperMotion;
    delete root.dataset.paperWeight;
    delete root.dataset.paperLocal;
    delete root.dataset.paperPhase;
    root.style.removeProperty('--paper-old-hinge');
    root.style.removeProperty('--paper-new-hinge');
    leaves?.remove(); leaves = null;
  }
  const hinge = () => `${innerHeight / 2 - (sheet()?.getBoundingClientRect().top || 0)}px`;
  // The page under a turn is already printed: what is in view shows at once, without the reveal fade.
  function printed() {
    for (const element of document.querySelectorAll('.reveal:not(.in)')) {
      const box = element.getBoundingClientRect();
      if (box.bottom <= 0 || box.top >= innerHeight) continue;
      element.style.transition = 'none'; element.classList.add('in');
      void getComputedStyle(element).opacity; element.style.removeProperty('transition');
    }
  }
  function geometry(element) {
    const bounds = sheet()?.getBoundingClientRect();
    if (!bounds) return;
    element.style.setProperty('--paper-top', `${Math.max(0, bounds.top)}px`);
    element.style.setProperty('--paper-left', `${bounds.left}px`);
    element.style.setProperty('--paper-width', `${bounds.width}px`);
  }
  function addLeaves(host, snapshots = false) {
    const count = Number.parseInt(getComputedStyle(root).getPropertyValue('--paper-leaves'), 10) || 0;
    for (let i = 1; i <= count; i++) {
      const leaf = document.createElement('div');
      leaf.className = 'paper-leaf';
      leaf.style.setProperty('--paper-leaf', i);
      leaf.style.zIndex = String(count - i);
      if (snapshots) leaf.style.viewTransitionName = `paper-leaf-${i}`;
      host.append(leaf);
    }
  }
  function makeLeaves() {
    leaves?.remove();
    leaves = document.createElement('div');
    leaves.className = 'paper-leaves';
    leaves.setAttribute('aria-hidden', 'true');
    geometry(leaves); addLeaves(leaves, true);
    document.body.append(leaves);
  }
  function removeCover() {
    if (opening) {
      opening.getAnimations?.({ subtree: true }).forEach(animation => { try { animation.finish(); } catch {} });
      opening.remove(); opening = null;
    }
  }
  function finish() {
    interrupted = true;
    removeCover();
    active?.skipTransition();
    // A cold front-page reveal can precede its deferred script. The CSS animation
    // still finishes on the very first input, even without a ViewTransition handle.
    document.getAnimations?.().forEach(animation => {
      if (/^paper-/.test(animation.animationName || '')) { try { animation.finish(); } catch {} }
    });
  }
  function watch(transition, info, local = false) {
    active = transition;
    setMotion(info, local);
    transition.types?.clear();
    transition.types?.add(`paper-${info.direction}`);
    // A slow next page makes the browser abort the turn and navigate plainly; that is the fallback, not an error.
    transition.ready.catch(() => {});
    transition.updateCallbackDone?.catch(() => {});
    const cleanup = () => {
      if (active !== transition) return;
      active = null; clearMotion();
    };
    transition.finished.then(cleanup, cleanup);
  }

  // Construct a separate, noninteractive cover before first paint. No page is
  // hidden or made inert; the original reading/focus tree remains available.
  function createCover() {
    if (!volume || still() || navigationType === 'reload' || navigationType === 'back_forward' || read(seenKey)) return;
    const from = page(document.referrer);
    if (from?.kind === volume) { write(seenKey, '1'); return; }
    opening = document.createElement('div');
    opening.className = 'paper-opening';
    opening.setAttribute('aria-hidden', 'true');
    const cover = document.createElement('div');
    cover.className = 'paper-cover';
    for (const [className, text] of [
      ['paper-cover-label', root.dataset.coverLabel],
      ['paper-cover-title', root.dataset.coverTitle],
      ['paper-cover-author', root.dataset.coverAuthor]
    ]) {
      const line = document.createElement('div'); line.className = className;
      line.textContent = text || ''; cover.append(line);
    }
    opening.append(cover); addLeaves(opening);
    root.append(opening);
    write(seenKey, '1');
  }
  function coverText() {
    if (!opening) return;
    const cover = opening.querySelector('.paper-cover');
    const stationery = [...document.querySelectorAll('.stationery > span')];
    const counts = document.createElement('div'); counts.className = 'paper-cover-counts';
    // A value still loading keeps its printed line, so a late count is inked in place
    // instead of pushing the title up mid-turn.
    for (const source of stationery) {
      if (source.textContent.trim() === root.dataset.coverLabel) continue;
      const line = document.createElement('span');
      // Stationery contains text and b only; rebuild it, never clone content or IDs.
      for (const child of source.childNodes) {
        if (child.nodeType === 3) line.append(document.createTextNode(child.textContent));
        else if (child.nodeName === 'B') { const value = document.createElement('b'); value.textContent = child.textContent; line.append(value); }
      }
      counts.append(line);
    }
    cover.querySelector('.paper-cover-counts')?.remove();
    cover.insertBefore(counts, cover.querySelector('.paper-cover-author'));
  }
  function openCover() {
    // Opens once: moving an opening cover cancels its animations, which would read as finished.
    if (!opening || interrupted || opening.classList.contains('is-opening')) return;
    if (still()) { removeCover(); return; }
    document.body.append(opening); geometry(opening); coverText();
    opening.classList.add('is-opening');
    const host = opening;
    const animations = host.getAnimations?.({ subtree: true }) || [];
    if (!animations.length) { removeCover(); return; }
    Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (opening === host) removeCover();
    });
  }

  createCover();
  // Receipt supplies the arriving front page's weight even when pagereveal ran
  // before its deferred script. It never changes the document's history entries.
  const incoming = receipt();
  if (!volume && incoming?.info && !still()) {
    root.dataset.paperWeight = incoming.info.weight;
    root.style.setProperty('--paper-new-hinge', hinge());
  }
  addEventListener('pageswap', event => {
    removeCover();
    const info = journey(location.href, event.activation?.entry?.url);
    if (event.activation?.entry?.url) write('paper:arrival', JSON.stringify({
      from: location.href, to: event.activation.entry.url, info, oldHinge: hinge(), time: Date.now()
    }));
    if (!event.viewTransition) return;
    if (!info || still()) { event.viewTransition.skipTransition(); return; }
    root.style.setProperty('--paper-old-hinge', hinge());
    watch(event.viewTransition, info);
  });
  addEventListener('pagereveal', event => {
    revealed = true; interrupted = false;
    const arrival = receipt();
    const from = window.navigation?.activation?.from?.url || arrival?.from || document.referrer;
    const info = journey(from, location.href);
    forget('paper:arrival');
    if (event.viewTransition) {
      removeCover();
      if (volume) write(seenKey, '1');
      if (!info || still()) { event.viewTransition.skipTransition(); return; }
      root.style.setProperty('--paper-old-hinge', arrival?.oldHinge || hinge());
      root.style.setProperty('--paper-new-hinge', hinge());
      watch(event.viewTransition, info);
      if (info.direction !== 'language' && document.body) makeLeaves();
    } else if (document.readyState !== 'loading') openCover();
  });
  const ready = () => {
    coverText();
    // Allow the navigation's reveal to choose between a front page and this
    // cover. A missing API simply opens the cover on the next rendering frame.
    requestAnimationFrame(() => { if (!active) openCover(); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
  for (const type of ['keydown', 'pointerdown', 'wheel'])
    addEventListener(type, finish, { capture: true, passive: true });
  reduced.addEventListener?.('change', () => { if (reduced.matches) finish(); });
  addEventListener('pagehide', () => { removeCover(); });
  addEventListener('pageshow', event => {
    if (event.persisted && !active) clearMotion();
    if (!volume && !revealed) {
      // No persistent selector/name or extra element remains after a cold return.
      setTimeout(() => { if (!active) clearMotion(); }, 1100);
    }
  });

  Object.assign(window.Paper ||= {}, {
    finish,
    coverReady: coverText,
    turn(update, { direction = 'forward' } = {}) {
      finish(); interrupted = false;
      // A booklet never enters a snapshot that can rotate, even if called later.
      if (still() || !document.startViewTransition || volume === 'booklet' || sheet()?.querySelector('img')) {
        update(); return null;
      }
      const info = { direction: direction === 'back' ? 'back' : 'forward', weight: volume || 'tome' };
      setMotion(info, true);
      root.dataset.paperPhase = 'old';
      root.style.setProperty('--paper-old-hinge', hinge());
      let updated = false;
      const apply = () => { if (!updated) { updated = true; update(); } };
      try {
        const transition = document.startViewTransition(() => {
          apply(); root.dataset.paperPhase = 'new';
          root.style.setProperty('--paper-new-hinge', hinge()); printed(); makeLeaves();
        });
        watch(transition, info, true);
        // No caller waits for ready/finished; update, focus and scroll occur in
        // the capture callback, never after the page-turn animation.
        return transition;
      } catch {
        clearMotion(); apply(); return null;
      }
    }
  });
})();
