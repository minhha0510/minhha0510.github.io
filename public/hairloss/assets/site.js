/* The paper kit owns theme, ink, reveals, and rule measurement. */
(() => {
  const navToggle = document.querySelector('.nav-toggle');
  const navigation = document.querySelector('.site-nav');
  const closeNavigation = () => {
    navToggle?.setAttribute('aria-expanded', 'false');
    navigation?.classList.remove('is-open');
    window.Paper?.measure();
  };

  if (navToggle && navigation) {
    navToggle.addEventListener('click', () => {
      const open = navToggle.getAttribute('aria-expanded') !== 'true';
      navToggle.setAttribute('aria-expanded', String(open));
      navigation.classList.toggle('is-open', open);
      window.Paper?.measure();
    });
    navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeNavigation));
    document.querySelector('.wordmark')?.addEventListener('click', closeNavigation);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        closeNavigation();
        navToggle.focus();
      }
    });
    document.documentElement.classList.add('nav-ready');
    window.Paper?.measure();
  }

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  // Photographs stay lazy in the markup so the first screen paints first. Safari only fetches a lazy
  // image once it is about one screen away, so a jump to the cases met empty mounts: anything within
  // two screens is fetched at once, and after the page has loaded the rest follow in reading order.
  const photos = [...document.querySelectorAll('img[loading="lazy"]')];
  const fetchNow = img => { img.loading = 'eager'; };
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { fetchNow(entry.target); near.unobserve(entry.target); }
    }), { rootMargin: '200% 0px' });
    photos.forEach(img => near.observe(img));
  }
  const queue = photos.slice();
  const fetchNext = () => {
    const img = queue.shift();
    if (!img) return;
    if (img.complete) { fetchNext(); return; }
    img.addEventListener('load', fetchNext, { once: true });
    img.addEventListener('error', fetchNext, { once: true });
    fetchNow(img);
  };
  const fetchRest = () => { if (!navigator.connection?.saveData) for (let i = 0; i < 3; i++) fetchNext(); };
  if (document.readyState === 'complete') fetchRest(); else addEventListener('load', fetchRest, { once: true });
  window.Paper?.coverReady();
})();
