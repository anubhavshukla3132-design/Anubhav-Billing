import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('anubhav-dark-mode') === 'true';
    } catch { return false; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    try { localStorage.setItem('anubhav-dark-mode', dark); } catch {}
  }, [dark]);

  const toggle = () => setDark(d => !d);

  return { dark, toggle };
}
