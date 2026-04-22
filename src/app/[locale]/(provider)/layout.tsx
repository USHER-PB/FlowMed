import Link from "next/link";

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/provider-dashboard" className="text-lg font-semibold text-teal-700">
            HealthMarket — Provider
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/provider-dashboard" className="text-gray-600 hover:text-teal-700">
              Dashboard
            </Link>
            <Link href="/availability" className="text-gray-600 hover:text-teal-700">
              Availability
            </Link>
            <Link href="/diagnoses/new" className="text-gray-600 hover:text-teal-700">
              Diagnoses
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
