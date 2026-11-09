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
})();
