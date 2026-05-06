"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.replace(`/${locale}/auth/login`);
        } else if (data.user.role === "PROVIDER") {
          // Provider accidentally on patient page — redirect to provider dashboard
          router.replace(`/${locale}/provider-dashboard`);
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        router.replace(`/${locale}/auth/login`);
      });
  }, [locale, router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${locale}/auth/login`);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={`/${locale}/dashboard`} className="text-lg font-semibold text-teal-700">
            FlowMed
          </Link>
          <div className="flex gap-4 text-sm items-center">
            <Link href={`/${locale}/dashboard`} className="text-gray-600 hover:text-teal-700">
              Dashboard
            </Link>
            <Link href={`/${locale}/providers`} className="text-gray-600 hover:text-teal-700">
              Find Provider
            </Link>
            <Link href={`/${locale}/medical-centers`} className="text-gray-600 hover:text-teal-700">
              Medical Centers
            </Link>
            <Link href={`/${locale}/history`} className="text-gray-600 hover:text-teal-700">
              History
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
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
