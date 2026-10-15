// Share the homepage's theme preference across standalone project routes.
(() => {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const stored = () => {
    try { const value = localStorage.getItem('theme'); return value === 'dark' || value === 'light' ? value : null; }
    catch { return null; }
  };
  function apply(theme) {
    root.dataset.theme = theme;
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const dark = theme === 'dark';
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', root.lang === 'vi' ? (dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối') : (dark ? 'Switch to light theme' : 'Switch to dark theme'));
      button.textContent = dark ? '☀' : '☾';
    });
  }
  apply(stored() || (media.matches ? 'dark' : 'light'));
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => {
      const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('theme', theme); } catch {}
      apply(theme);
    }));
  });
  window.addEventListener('storage', event => {
    if (event.key === 'theme' || event.key === null) apply(stored() || (media.matches ? 'dark' : 'light'));
  });
  media.addEventListener('change', () => { if (!stored()) apply(media.matches ? 'dark' : 'light'); });
})();
