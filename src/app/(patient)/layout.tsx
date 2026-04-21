import Link from "next/link";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold text-blue-700">
            HealthMarket
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/dashboard" className="text-gray-600 hover:text-blue-700">
              Dashboard
            </Link>
            <Link href="/providers" className="text-gray-600 hover:text-blue-700">
              Find Provider
            </Link>
            <Link href="/history" className="text-gray-600 hover:text-blue-700">
              History
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
