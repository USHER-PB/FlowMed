'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';

/**
 * Navigation links configuration
 */
interface NavLink {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

/**
 * Professional Navigation component with modern design
 * Features:
 * - Responsive design with mobile menu
 * - Active state highlighting
 * - Smooth transitions
 * - Accessible navigation
 */
export default function Navigation() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Check if a path is active
  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === path || pathname === '/';
    }
    return pathname.startsWith(path);
  };

  // Navigation links for authenticated users
  const mainLinks: NavLink[] = [
    { href: '/dashboard', label: t('dashboard') },
    { href: '/providers', label: t('findProvider') },
    { href: '/medical-centers', label: t('medicalCenters') },
    { href: '/history', label: t('history') },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-200/50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white transition-transform group-hover:scale-105">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <span className="text-xl font-bold text-surface-900">
            Flow<span className="text-brand-500">Med</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-1">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'relative px-3 py-2 text-sm font-medium transition-colors duration-200',
                'rounded-lg hover:bg-surface-100',
                isActive(link.href)
                  ? 'text-brand-600'
                  : 'text-surface-600 hover:text-surface-900'
              )}
            >
              {link.label}
              {isActive(link.href) && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-brand-500" />
              )}
            </Link>
          ))}
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex md:items-center md:gap-3">
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">
              {t('login')}
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button variant="primary" size="sm">
              {t('register')}
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-surface-600 hover:bg-surface-100 hover:text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500 md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-expanded={isMobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? (
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      <div
        className={cn(
          'md:hidden overflow-hidden transition-all duration-300 ease-in-out',
          isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="space-y-1 border-t border-surface-200 bg-white px-4 py-3">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive(link.href)
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          
          {/* Mobile Auth Buttons */}
          <div className="mt-4 flex flex-col gap-2 border-t border-surface-200 pt-4">
            <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="outline" fullWidth>
                {t('login')}
              </Button>
            </Link>
            <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="primary" fullWidth>
                {t('register')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}