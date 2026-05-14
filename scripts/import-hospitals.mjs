/**
 * Import real Cameroonian hospitals from OpenStreetMap via the Overpass API.
 * Data: OpenStreetMap contributors (ODbL license) - https://www.openstreetmap.org
 *
 * Run: node scripts/import-hospitals.mjs
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CITY_MAP = {
  "Douala": "Douala",
  "Yaoundé": "Yaoundé",
  "Yaounde": "Yaoundé",
  "Bafoussam": "Bafoussam",
  "Bamenda": "Bamenda",
  "Garoua": "Garoua",
  "Maroua": "Maroua",
  "Ngaoundéré": "Ngaoundéré",
  "Ngaoundere": "Ngaoundéré",
  "Bertoua": "Bertoua",
  "Ebolowa": "Ebolowa",
  "Kribi": "Kribi",
  "Buea": "Buea",
  "Limbe": "Limbe",
  "Kumba": "Kumba",
  "Edéa": "Edéa",
  "Edea": "Edéa",
  "Nkongsamba": "Nkongsamba",
};

function normalizeCity(raw) {
  if (!raw) return "Other";
  for (const [key, val] of Object.entries(CITY_MAP)) {
    if (raw.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return raw.trim() || "Other";
}

async function fetchHospitals() {
  const query = `[out:json][timeout:30];area["ISO3166-1"="CM"]->.cm;(node["amenity"="hospital"](area.cm);way["amenity"="hospital"](area.cm);node["amenity"="clinic"](area.cm);way["amenity"="clinic"](area.cm););out center 300;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  console.log("📡 Fetching hospitals from OpenStreetMap...");
  const res = await fetch(url, {
    headers: { "User-Agent": "FlowMed-Hospital-Import/1.0" },
    signal: AbortSignal.timeout(35000),
  });

  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
  const data = await res.json();
  return data.elements ?? [];
}

async function main() {
  console.log("🏥 Starting hospital import from OpenStreetMap...\n");

  const elements = await fetchHospitals();
  const hospitals = elements.filter((el) => el.tags?.name?.trim().length > 2);
  console.log(`✅ ${hospitals.length} named hospitals/clinics found\n`);

  const passwordHash = await bcrypt.hash("FlowMed2026!", 12);
  let created = 0;
  let skipped = 0;

  for (const hospital of hospitals) {
    const tags = hospital.tags;
    const name = tags.name.trim();
    const city = normalizeCity(
      tags["addr:city"] || tags["addr:town"] || tags["is_in:city"] || tags["is_in"]
    );
    const address = [
      tags["addr:street"],
      tags["addr:housenumber"],
      tags["addr:quarter"],
      tags["addr:suburb"],
    ].filter(Boolean).join(", ") || city;

    const phone = tags.phone || tags["contact:phone"] || "+237 000 000 000";
    const email = `osm-${hospital.id}@flowmed-import.cm`;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { skipped++; continue; }

    try {
      await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          role: "MEDICAL_CENTER",
          emailVerified: true,
          medicalCenter: {
            create: {
              name,
              city,
              address,
              phone,
              verificationStatus: "APPROVED",
              verificationDocs: JSON.stringify([`osm:${hospital.id}`, "Source: OpenStreetMap (ODbL)"]),
            },
          },
        },
      });
      created++;
      process.stdout.write(`  ✓ ${name} (${city})\n`);
    } catch {
      skipped++;
    }
  }

  console.log(`\n🎉 Import complete!`);
  console.log(`   Created : ${created} hospitals`);
  console.log(`   Skipped : ${skipped} (duplicates or unnamed)`);
  console.log(`\n   Data: OpenStreetMap contributors (ODbL license)`);
}

main()
  .catch((e) => { console.error("❌ Import failed:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
