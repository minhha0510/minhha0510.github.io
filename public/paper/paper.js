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
