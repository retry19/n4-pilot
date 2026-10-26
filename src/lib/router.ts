/**
 * Minimal hash router. Hash routing keeps deep links working on static hosting
 * and inside the service worker without server rewrites.
 */
import { useEffect, useState } from 'react';

export function normalizePath(hash: string): string {
  const raw = hash.replace(/^#/, '');
  if (!raw || raw === '/') return '/today';
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  const target = to.startsWith('/') ? to : `/${to}`;
  if (options.replace) {
    window.history.replaceState(null, '', `#${target}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  if (normalizePath(window.location.hash) === target) return;
  window.location.hash = target;
}

export function back(): void {
  if (window.history.length > 1) window.history.back();
  else navigate('/today');
}

export function usePath(): string {
  const [path, setPath] = useState(() => normalizePath(typeof window === 'undefined' ? '/today' : window.location.hash));

  useEffect(() => {
    const onChange = () => setPath(normalizePath(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [path]);

  return path;
}

export interface RouteMatch {
  pattern: string;
  params: Record<string, string>;
}

/** Match `/mock/:formId/report` against `/mock/form-a/report`. */
export function matchRoute(pattern: string, path: string): RouteMatch | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const expected = patternParts[i]!;
    const actual = pathParts[i]!;
    if (expected.startsWith(':')) params[expected.slice(1)] = decodeURIComponent(actual);
    else if (expected !== actual) return null;
  }
  return { pattern, params };
}

export function useNavigate(): (to: string, options?: { replace?: boolean }) => void {
  return navigate;
}
