import { BarChart3, Home, Map, Settings, Target, User } from 'lucide-react';
import { usePath } from '../lib/router.ts';

const ITEMS = [
  { href: '/today', label: 'Hari Ini', icon: Home },
  { href: '/plan', label: 'Rencana', icon: Map },
  { href: '/practice', label: 'Latihan', icon: Target },
  { href: '/progress', label: 'Progres', icon: BarChart3 },
  { href: '/profile', label: 'Profil', icon: User },
];

export function BottomNav() {
  const path = usePath();
  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = path === item.href || path.startsWith(`${item.href}/`);
        return (
          <a
            key={item.href}
            href={`#${item.href}`}
            className="bottom-nav__item"
            aria-current={active ? 'page' : undefined}
          >
            <Icon aria-hidden />
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

export function TopBar({ meta, action }: { meta?: string; action?: React.ReactNode }) {
  return (
    <header className="top-bar">
      <a className="wordmark" href="#/today">
        <span className="wordmark__mark" aria-hidden>
          N4
        </span>
        N4 Pilot
      </a>
      {meta ? <span className="top-bar__meta">{meta}</span> : null}
      {action ?? (
        <a className="icon-btn" href="#/profile" aria-label="Profil dan pengaturan">
          <Settings size={20} aria-hidden />
        </a>
      )}
    </header>
  );
}
