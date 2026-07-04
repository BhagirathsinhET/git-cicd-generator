'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

export default function Header() {
  const pathname = usePathname();

  const isExtension = pathname?.startsWith('/extension');
  const isGuide = pathname?.startsWith('/guide');
  const isWebsite = !isExtension && !isGuide;

  return (
    <header>
      <Link className="logo" href="/website">
        <div className="logo-icon">⚡</div>
        CI/CD Pipeline Generator
      </Link>

      <nav className="header-nav">
        <Link
          href="/website"
          className={`header-nav-link ${isWebsite ? 'active' : ''}`}
        >
          🌐 Website CI/CD
        </Link>
        <Link
          href="/extension"
          className={`header-nav-link ${isExtension ? 'active' : ''}`}
        >
          🧩 Chrome Extension CI/CD
        </Link>
        <Link
          href="/guide"
          className={`header-nav-link ${isGuide ? 'active' : ''}`}
        >
          📘 How It Works
        </Link>
      </nav>

      <span className="logo-badge">GitHub Actions</span>
      <ThemeToggle />
    </header>
  );
}
