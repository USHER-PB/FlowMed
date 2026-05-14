/**
 * Auto-seed service — runs once at application startup.
 * Inserts the curated list of Cameroonian hospitals if they haven't been seeded yet.
 * Uses a marker record to detect whether seeding has already run.
 */

import { prisma } from "@/lib/prisma";
import { CAMEROON_HOSPITALS, SEED_MARKER_EMAIL } from "./hospital-seed-data";
import bcrypt from "bcryptjs";

let seeded = false; // in-process guard to avoid running twice in dev hot-reload

export async function autoSeedHospitals(): Promise<void> {
  if (seeded) return;
  seeded = true;

  try {
    // Check if the seed marker already exists
    const marker = await prisma.user.findUnique({
      where: { email: SEED_MARKER_EMAIL },
    });

    if (marker) {
      // Already seeded — nothing to do
      return;
    }

    console.log("[auto-seed] Seeding Cameroonian hospitals...");

    const passwordHash = await bcrypt.hash("FlowMed-Internal-2026!", 12);

    // Create the seed marker first
    await prisma.user.create({
      data: {
        email: SEED_MARKER_EMAIL,
        password: passwordHash,
        role: "ADMIN",
        emailVerified: true,
      },
    });

    // Clear any previously imported OSM hospitals (the ones with osm- emails)
    // so we replace them with our curated, city-correct data
    const osmUsers = await prisma.user.findMany({
      where: { email: { startsWith: "osm-" } },
      select: { id: true },
    });

    if (osmUsers.length > 0) {
      await prisma.user.deleteMany({
        where: { email: { startsWith: "osm-" } },
      });
      console.log(`[auto-seed] Removed ${osmUsers.length} raw OSM imports`);
    }

    // Insert curated hospitals in batches
    let created = 0;
    for (const hospital of CAMEROON_HOSPITALS) {
      // Use a deterministic email based on name to avoid duplicates on re-run
      const slug = hospital.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 50);
      const email = `hospital-${slug}@flowmed-seed.cm`;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) continue;

      try {
        await prisma.user.create({
          data: {
            email,
            password: passwordHash,
            role: "MEDICAL_CENTER",
            emailVerified: true,
            medicalCenter: {
              create: {
                name: hospital.name,
                city: hospital.city,
                address: hospital.address,
                phone: hospital.phone,
                verificationStatus: "APPROVED",
                verificationDocs: JSON.stringify(["Source: FlowMed curated dataset"]),
              },
            },
          },
        });
        created++;
      } catch {
        // Skip duplicates silently
      }
    }

    console.log(`[auto-seed] ✅ Seeded ${created} hospitals across Cameroon`);
  } catch (error) {
    // Never crash the app due to seeding failure
    console.error("[auto-seed] Seeding failed (non-fatal):", error);
    seeded = false; // allow retry on next request
  }
}
