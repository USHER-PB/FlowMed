"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MedicalCenterLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.replace(`/${locale}/auth/login`);
        } else if (data.user.role !== "MEDICAL_CENTER") {
          router.replace(`/${locale}/dashboard`);
        } else {
          setChecking(false);
        }
      })
      .catch(() => router.replace(`/${locale}/auth/login`));
  }, [locale, router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${locale}/auth/login`);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href={`/${locale}/medical-center-dashboard`} className="text-lg font-semibold text-teal-700">
            FlowMed
          </Link>
          <div className="flex gap-4 text-sm items-center">
            <Link href={`/${locale}/medical-center-dashboard`} className="text-gray-600 hover:text-teal-700">
              Dashboard
            </Link>
            <Link href={`/${locale}/medical-center-dashboard/invitations`} className="text-gray-600 hover:text-teal-700">
              Invite Doctors
            </Link>
            <Link href={`/${locale}/medical-center-dashboard/providers`} className="text-gray-600 hover:text-teal-700">
              Our Providers
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
