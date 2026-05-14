/**
 * Import real Cameroonian hospitals from OpenStreetMap via the Overpass API.
 * 
 * Data source: OpenStreetMap contributors (ODbL license)
 * https://www.openstreetmap.org
 * 
 * Run with: npx ts-node --project tsconfig.json scripts/import-hospitals.ts
 */

import { PrismaClient, VerificationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

// Map OSM city/town names to our standard city names
const CITY_MAP: Record<string, string> = {
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
  "Sangmélima": "Sangmélima",
};

function normalizeCity(raw: string | undefined): string {
  if (!raw) return "Other";
  for (const [key, val] of Object.entries(CITY_MAP)) {
    if (raw.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return raw.trim() || "Other";
}

interface OSMElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function fetchHospitalsFromOSM(): Promise<OSMElement[]> {
  const query = `
    [out:json][timeout:30];
    area["ISO3166-1"="CM"]->.cm;
    (
      node["amenity"="hospital"](area.cm);
      way["amenity"="hospital"](area.cm);
      node["amenity"="clinic"](area.cm);
      way["amenity"="clinic"](area.cm);
    );
    out center 200;
  `.trim();

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

  const elements = await fetchHospitalsFromOSM();
  console.log(`✅ Fetched ${elements.length} elements from OSM\n`);

  // Filter to elements with a name
  const hospitals = elements.filter(
    (el) => el.tags?.name && el.tags.name.trim().length > 2
  );
  console.log(`📋 ${hospitals.length} named hospitals/clinics found\n`);

  const passwordHash = await bcrypt.hash("FlowMed2026!", 12);
  let created = 0;
  let skipped = 0;

  for (const hospital of hospitals) {
    const tags = hospital.tags!;
    const name = tags.name.trim();
    const city = normalizeCity(
      tags["addr:city"] || tags["addr:town"] || tags["is_in:city"] || tags["is_in"]
    );
    const address = [
      tags["addr:street"],
      tags["addr:housenumber"],
      tags["addr:quarter"],
      tags["addr:suburb"],
    ]
      .filter(Boolean)
      .join(", ") || city;

    const phone = tags.phone || tags["contact:phone"] || "+237 000 000 000";
    const email = `hospital-${hospital.id}@flowmed-import.cm`;

    // Skip if already imported (by checking email)
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      skipped++;
      continue;
    }

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
              verificationStatus: VerificationStatus.APPROVED,
              verificationDocs: JSON.stringify([
                `osm:${hospital.id}`,
                "Source: OpenStreetMap contributors (ODbL)",
              ]),
            },
          },
        },
      });
      created++;
      console.log(`  ✓ ${name} (${city})`);
    } catch (err) {
      // Skip duplicates or constraint errors silently
      skipped++;
    }
  }

  console.log(`\n🎉 Import complete!`);
  console.log(`   Created: ${created} hospitals`);
  console.log(`   Skipped: ${skipped} (already exist or no name)`);
  console.log(`\n📝 Note: These hospitals are pre-approved from OpenStreetMap data.`);
  console.log(`   Hospital admins can claim their listing by registering with the same name.`);
  console.log(`   Data source: OpenStreetMap contributors (ODbL license)`);
}

main()
  .catch((e) => {
    console.error("❌ Import failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
