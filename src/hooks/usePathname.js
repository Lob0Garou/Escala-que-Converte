import { useCallback, useEffect, useState } from 'react';

const getCurrentPath = () => {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
};

const normalizePath = (path) => {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

export const usePathname = () => {
  const [pathname, setPathname] = useState(getCurrentPath);

  useEffect(() => {
    const handlePopState = () => setPathname(getCurrentPath());
    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((nextPath, { replace = false } = {}) => {
    if (typeof window === 'undefined') return;

    const normalizedPath = normalizePath(nextPath);
    const currentPath = getCurrentPath();
    if (normalizedPath === currentPath) return;

    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', normalizedPath);
    setPathname(normalizedPath);
  }, []);

  return {
    pathname,
    navigate,
    isAdminRoute: pathname === '/admin',
  };
};

export default usePathname;
