import type { Metadata, Viewport } from "next";
import { notFound } from 'next/navigation';
import SessionProvider from "@/components/SessionProvider";
import "../globals.css";

const locales = ['en', 'fr'];

export const metadata: Metadata = {
  title: "FlowMed Cameroon - Healthcare Marketplace Platform",
  description: "Connecting patients with healthcare providers across Cameroon. Book appointments, manage medical records, and access quality healthcare services.",
  keywords: ["healthcare", "Cameroon", "medical", "appointments", "telemedicine"],
  authors: [{ name: "FlowMed Cameroon" }],
  icons: {
    icon: [
      { url: '/favicon.svg?v=3', type: 'image/svg+xml' },
      { url: '/favicon.ico?v=3', sizes: 'any' },
    ],
    apple: '/apple-touch-icon.png?v=3',
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
};

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  
  if (!locales.includes(locale)) {
    notFound();
  }

  return (
    <html lang={locale}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3" />
        <link rel="alternate icon" href="/favicon.ico?v=3" />
      </head>
      <body>
        <SessionProvider>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
