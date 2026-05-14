"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface ClaimableHospital {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
}

import { CITIES_BY_REGION } from "@/lib/db/cameroon-cities";

const inputCls = "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
const selectCls = "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500";

function CitySelect({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} required={required} className={selectCls}>
      <option value="">Select a city / town</option>
      {Object.entries(CITIES_BY_REGION).map(([region, cities]) => (
        <optgroup key={region} label={`── ${region} ──`}>
          {cities.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

export default function MedicalCenterRegisterPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  // Step: "choice" → "claim" or "new"
  const [step, setStep] = useState<"choice" | "claim" | "new">("choice");

  // Claim flow
  const [searchCity, setSearchCity] = useState("");
  const [searchName, setSearchName] = useState("");
  const [hospitals, setHospitals] = useState<ClaimableHospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<ClaimableHospital | null>(null);

  // Account fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [centerPhone, setCenterPhone] = useState("");
  const [address, setAddress] = useState("");

  // New hospital fields
  const [name, setName] = useState("");
  const [city, setCity] = useState("Douala");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchHospitals = useCallback(async () => {
    setLoadingHospitals(true);
    try {
      const q = new URLSearchParams();
      if (searchCity) q.set("city", searchCity);
      if (searchName) q.set("search", searchName);
      const res = await fetch(`/api/medical-centers/claim?${q.toString()}`);
      const data = await res.json();
      setHospitals(data.hospitals ?? []);
    } finally {
      setLoadingHospitals(false);
    }
  }, [searchCity, searchName]);

  useEffect(() => {
    if (step === "claim") searchHospitals();
  }, [step, searchHospitals]);

  const handleSelectHospital = (h: ClaimableHospital) => {
    setSelectedHospital(h);
    setCenterPhone(h.phone !== "+237 000 000 000" ? h.phone : "");
    setAddress(h.address !== h.city ? h.address : "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        email,
        password,
        phone: phone || undefined,
        centerPhone: centerPhone || "+237 000 000 000",
        address: address || "Cameroun",
      };

      if (step === "claim" && selectedHospital) {
        body.claimHospitalId = selectedHospital.id;
        body.name = selectedHospital.name;
        body.city = selectedHospital.city;
      } else {
        body.name = name;
        body.city = city;
      }

      const res = await fetch("/api/auth/register/medical-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }

      // If claiming, we get a JWT back — go straight to dashboard
      if (step === "claim") {
        router.push(`/${locale}/medical-center-dashboard`);
      } else {
        router.push(`/${locale}/auth/login?registered=1`);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step 1: Choice ──────────────────────────────────────────────────────────
  if (step === "choice") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-teal-700">FlowMed</h1>
            <p className="text-gray-500 text-sm mt-1">Healthcare Marketplace Cameroon</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Register your hospital</h2>
            <p className="text-sm text-gray-500 mb-6">
              Is your hospital already listed on FlowMed?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setStep("claim")}
                className="w-full text-left rounded-lg border-2 border-teal-200 bg-teal-50 p-4 hover:border-teal-400 transition-colors"
              >
                <div className="font-semibold text-teal-900 text-sm">✅ Yes — my hospital is already listed</div>
                <div className="text-xs text-teal-700 mt-1">
                  Search for your hospital and claim it as the administrator
                </div>
              </button>

              <button
                onClick={() => setStep("new")}
                className="w-full text-left rounded-lg border-2 border-gray-200 p-4 hover:border-teal-300 transition-colors"
              >
                <div className="font-semibold text-gray-900 text-sm">➕ No — register a new hospital</div>
                <div className="text-xs text-gray-500 mt-1">
                  Create a new listing for your facility
                </div>
              </button>
            </div>

            <p className="mt-5 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href={`/${locale}/auth/login`} className="text-teal-600 hover:text-teal-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2a: Claim existing hospital ───────────────────────────────────────
  if (step === "claim") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-teal-700">FlowMed</h1>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep("choice")} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
              <h2 className="text-lg font-semibold text-gray-900">Find your hospital</h2>
            </div>

            {/* Search */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by city</label>
                <CitySelect value={searchCity} onChange={setSearchCity} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search by name</label>
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchHospitals()}
                  placeholder="e.g. Hôpital Général"
                  className={inputCls}
                />
              </div>
            </div>
            <button onClick={searchHospitals} disabled={loadingHospitals} className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
              {loadingHospitals ? "Searching..." : "Search"}
            </button>

            {/* Hospital list */}
            {!selectedHospital && (
              <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-100 rounded-lg p-2">
                {hospitals.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">
                    {loadingHospitals ? "Loading..." : "No hospitals found. Try a different search."}
                  </p>
                ) : (
                  hospitals.map(h => (
                    <button
                      key={h.id}
                      onClick={() => handleSelectHospital(h)}
                      className="w-full text-left rounded-lg border border-gray-200 p-3 hover:border-teal-400 hover:bg-teal-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900 text-sm">{h.name}</div>
                      <div className="text-xs text-gray-500">{h.city} · {h.address}</div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Selected hospital + account form */}
            {selectedHospital && (
              <div className="space-y-4">
                <div className="rounded-lg border-2 border-teal-400 bg-teal-50 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-teal-900">{selectedHospital.name}</div>
                      <div className="text-xs text-teal-700">{selectedHospital.city} · {selectedHospital.address}</div>
                    </div>
                    <button onClick={() => setSelectedHospital(null)} className="text-xs text-gray-400 hover:text-gray-600">Change</button>
                  </div>
                </div>

                <p className="text-sm font-medium text-gray-700">Create your administrator account:</p>

                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your email address</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@hospital.cm" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters, 1 uppercase, 1 number" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your phone <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+237 6XX XXX XXX" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hospital phone</label>
                      <input type="tel" value={centerPhone} onChange={e => setCenterPhone(e.target.value)} placeholder="+237 233 XXX XXX" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hospital address</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address" className={inputCls} />
                  </div>

                  <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                    By claiming this hospital, you confirm you are an authorized administrator of <strong>{selectedHospital.name}</strong>.
                    False claims may result in account suspension.
                  </div>

                  <button type="submit" disabled={submitting} className="w-full rounded-md bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors">
                    {submitting ? "Claiming..." : `Claim ${selectedHospital.name}`}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2b: Register new hospital ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-teal-700">FlowMed</h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <button onClick={() => setStep("choice")} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
            <h2 className="text-lg font-semibold text-gray-900">Register new hospital</h2>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hospital name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Clinique de la Paix" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City / Town</label>
              <CitySelect value={city} onChange={setCity} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" required value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hospital phone</label>
              <input type="tel" required value={centerPhone} onChange={e => setCenterPhone(e.target.value)} placeholder="+237 233 XXX XXX" className={inputCls} />
            </div>
            <hr className="border-gray-100" />
            <p className="text-sm font-medium text-gray-700">Your administrator account:</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@hospital.cm" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters, 1 uppercase, 1 number" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your phone <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+237 6XX XXX XXX" className={inputCls} />
            </div>

            <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
              Your hospital will be reviewed by our team before going live. This usually takes 1–2 business days.
            </div>

            <button type="submit" disabled={submitting} className="w-full rounded-md bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors">
              {submitting ? "Registering..." : "Register hospital"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href={`/${locale}/auth/login`} className="text-teal-600 hover:text-teal-700 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
