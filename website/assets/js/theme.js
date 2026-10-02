/* Theme: dark by default, light on request. The choice is stored and shared by every page.
   Each page also applies the stored theme with a one-line script in its <head>, before the
   stylesheet loads, so there is no flash of the wrong theme; this file handles the toggle
   and keeps already-open pages in step. */
(function initTheme() {
  const STORAGE_KEY = 'cage-sports-theme';
  const THEME_COLORS = { dark: '#111111', light: '#f3f3f0' };
  const root = document.documentElement;

  function stored() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
    } catch (error) {
      // Storage can be blocked (private mode, strict settings): fall back to what is showing.
      return root.dataset.theme === 'light' ? 'light' : 'dark';
    }
  }

  function apply(theme) {
    if (theme === 'light') root.dataset.theme = 'light';
    else delete root.dataset.theme;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLORS[theme]);

    // The label names the theme the button switches to.
    const label = theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
    document.querySelectorAll('.theme-toggle').forEach((button) => {
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
    });
  }

  document.querySelectorAll('.theme-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const next = root.dataset.theme === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (error) {
        // Still switch for this page view even if the choice cannot be saved.
      }
      apply(next);
    });
  });

  // Changed in another tab, or returning to this page through the back button.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === null) apply(stored());
  });
  window.addEventListener('pageshow', () => apply(stored()));

  apply(stored());
})();
