import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Tenta recuperar do localStorage
    const savedTheme = localStorage.getItem('escala-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    // Caso contrário, prefere usar light como base, podendo ser os preferences se quiser.
    // O usuário preferiu o light como base atual:
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('escala-theme', theme);
    const htmlEl = document.documentElement;

    if (theme === 'dark') {
      htmlEl.classList.add('dark');
    } else {
      htmlEl.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return { theme, toggleTheme };
}
