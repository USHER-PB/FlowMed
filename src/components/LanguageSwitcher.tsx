'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

const LOCALE_COOKIE = 'NEXT_LOCALE';
const SUPPORTED_LOCALES = ['fr', 'en'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

function getLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return 'fr';
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : 'fr';
  return SUPPORTED_LOCALES.includes(value as Locale) ? (value as Locale) : 'fr';
}

function setLocaleCookie(locale: Locale) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

interface LanguageSwitcherProps {
  currentLocale?: Locale;
}

export default function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  const activeLocale = currentLocale ?? getLocaleFromCookie();

  const switchLocale = useCallback(
    (locale: Locale) => {
      setLocaleCookie(locale);
      // Reload the current page so the new locale takes effect via the middleware/cookie
      router.refresh();
      // If the path already contains a locale prefix, replace it
      const localePrefix = new RegExp(`^/(fr|en)(/|$)`);
      if (localePrefix.test(pathname)) {
        const newPath = pathname.replace(localePrefix, `/${locale}$2`);
        router.push(newPath);
      } else {
        router.push(pathname);
      }
    },
    [pathname, router],
  );

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Language switcher">
      {SUPPORTED_LOCALES.map((locale) => (
        <button
          key={locale}
          onClick={() => switchLocale(locale)}
          aria-pressed={activeLocale === locale}
          className={[
            'rounded px-2 py-1 text-sm font-medium uppercase transition-colors',
            activeLocale === locale
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-gray-600 hover:bg-gray-100',
          ].join(' ')}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
