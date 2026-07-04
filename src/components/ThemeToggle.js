'use client';

export default function ThemeToggle() {
  const toggleTheme = () => {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch (_) {
      // localStorage unavailable (e.g. private browsing) — theme just won't persist
    }
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label="Toggle light/dark theme"
      title="Toggle light/dark theme"
    >
      <span className="theme-toggle-icon icon-sun">☀️</span>
      <span className="theme-toggle-icon icon-moon">🌙</span>
    </button>
  );
}
