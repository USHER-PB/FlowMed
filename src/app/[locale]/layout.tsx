import type { Metadata, Viewport } from "next";
import { notFound } from 'next/navigation';
import "../globals.css";

const locales = ['en', 'fr'];

export const metadata: Metadata = {
  title: "FlowMed Cameroon - Healthcare Marketplace Platform",
  description: "Connecting patients with healthcare providers across Cameroon. Book appointments, manage medical records, and access quality healthcare services.",
  keywords: ["healthcare", "Cameroon", "medical", "appointments", "telemedicine"],
  authors: [{ name: "FlowMed Cameroon" }],
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
      <body>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  );
}
