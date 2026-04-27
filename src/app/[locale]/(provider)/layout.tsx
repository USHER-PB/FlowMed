"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${locale}/auth/login`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href={`/${locale}/provider-dashboard`} className="text-lg font-semibold text-teal-700">
            FlowMed — Provider
          </Link>
          <div className="flex gap-4 text-sm items-center">
            <Link href={`/${locale}/provider-dashboard`} className="text-gray-600 hover:text-teal-700">
              Dashboard
            </Link>
            <Link href={`/${locale}/availability`} className="text-gray-600 hover:text-teal-700">
              Availability
            </Link>
            <Link href={`/${locale}/diagnoses/new`} className="text-gray-600 hover:text-teal-700">
              Diagnoses
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
