"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface MedicalCenter {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  providerCount: number;
}

const CITY_OPTIONS = [
  { value: "", label: "All Cities" },
  { value: "Douala", label: "Douala" },
  { value: "Yaoundé", label: "Yaoundé" },
  { value: "Bafoussam", label: "Bafoussam" },
  { value: "Bamenda", label: "Bamenda" },
  { value: "Garoua", label: "Garoua" },
  { value: "Maroua", label: "Maroua" },
  { value: "Ngaoundéré", label: "Ngaoundéré" },
  { value: "Bertoua", label: "Bertoua" },
  { value: "Ebolowa", label: "Ebolowa" },
  { value: "Kribi", label: "Kribi" },
  { value: "Other", label: "Other" },
];

export default function MedicalCentersPage() {
  const params = useParams();
  const locale = params.locale as string;

  const [city, setCity] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [centers, setCenters] = useState<MedicalCenter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCenters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (city) queryParams.set("city", city);
      if (search) queryParams.set("search", search);

      const res = await fetch(`/api/medical-centers?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to load medical centers");
      const json = await res.json();
      setCenters(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load medical centers");
    } finally {
      setLoading(false);
    }
  }, [city, search]);

  // Fetch on mount and whenever city or search changes
  useEffect(() => {
    fetchCenters();
  }, [fetchCenters]);

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Medical Centers</h1>
        <p className="text-gray-500 text-sm mt-1">
          Browse verified healthcare facilities in Cameroon.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Filter by city
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by name or address..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full sm:w-auto rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm">{error}</div>
      )}

      {/* Results */}
      {!loading && !error && (
        <div>
          {centers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 text-sm">
              No medical centers found. Try adjusting your filters.
            </div>
          ) : (
            <div className="space-y-3">
              {centers.map((center) => (
                <div
                  key={center.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">{center.name}</div>
                    <div className="text-sm text-gray-500">{center.city}</div>
                    {center.address && (
                      <div className="text-sm text-gray-500">{center.address}</div>
                    )}
                    {center.phone && (
                      <div className="text-sm text-gray-500">{center.phone}</div>
                    )}
                    <div className="text-xs text-gray-400">
                      {center.providerCount}{" "}
                      {center.providerCount === 1 ? "provider" : "providers"}
                    </div>
                  </div>
                  <Link
                    href={`/${locale}/medical-centers/${center.id}`}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    View Center
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-400 text-sm">
          Loading...
        </div>
      )}
    </div>
  );
}
