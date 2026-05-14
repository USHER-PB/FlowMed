/**
 * Seeds hospitals for smaller Cameroonian cities not covered in the initial seed.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADDITIONAL_HOSPITALS = [
  // Littoral - smaller towns
  { name: "Hôpital de District de Manjo", city: "Manjo", address: "Manjo, Région du Littoral", phone: "+237 233 481 001" },
  { name: "Centre de Santé Intégré de Manjo", city: "Manjo", address: "Manjo", phone: "+237 233 481 200" },
  { name: "Hôpital de District d'Edéa", city: "Edéa", address: "Avenue de l'Hôpital, Edéa", phone: "+237 233 461 501" },
  { name: "Centre Médical d'Arrondissement d'Edéa", city: "Edéa", address: "Edéa", phone: "+237 233 461 600" },
  { name: "Hôpital de District de Yabassi", city: "Yabassi", address: "Yabassi, Région du Littoral", phone: "+237 233 471 001" },
  { name: "Centre de Santé de Yabassi", city: "Yabassi", address: "Yabassi", phone: "+237 233 471 200" },
  { name: "Hôpital de District de Nkondjock", city: "Nkondjock", address: "Nkondjock, Région du Littoral", phone: "+237 233 472 001" },
  { name: "Centre de Santé Intégré de Nkondjock", city: "Nkondjock", address: "Nkondjock", phone: "+237 233 472 200" },
  { name: "Hôpital de District de Nkongsamba", city: "Nkongsamba", address: "Avenue de l'Hôpital, Nkongsamba", phone: "+237 233 491 001" },
  { name: "Polyclinique de Nkongsamba", city: "Nkongsamba", address: "Nkongsamba", phone: "+237 233 491 500" },
  { name: "Centre Médical d'Arrondissement de Loum", city: "Loum", address: "Loum, Région du Littoral", phone: "+237 233 492 001" },
  { name: "Hôpital de District de Mbanga", city: "Mbanga", address: "Mbanga, Région du Littoral", phone: "+237 233 493 001" },
  { name: "Centre de Santé de Bonassama", city: "Bonassama", address: "Bonassama, Douala", phone: "+237 233 494 001" },

  // Ouest - smaller towns
  { name: "Hôpital de District de Baganté", city: "Baganté", address: "Baganté, Région de l'Ouest", phone: "+237 233 501 001" },
  { name: "Centre de Santé Intégré de Baganté", city: "Baganté", address: "Baganté", phone: "+237 233 501 200" },
  { name: "Hôpital de District de Bangangté", city: "Bangangté", address: "Bangangté, Région de l'Ouest", phone: "+237 233 502 001" },
  { name: "Centre Médical d'Arrondissement de Bangangté", city: "Bangangté", address: "Bangangté", phone: "+237 233 502 200" },
  { name: "Hôpital Régional de Foumban", city: "Foumban", address: "Avenue de l'Hôpital, Foumban", phone: "+237 233 503 001" },
  { name: "Centre de Santé de Foumbot", city: "Foumbot", address: "Foumbot, Région de l'Ouest", phone: "+237 233 504 001" },
  { name: "Hôpital de District de Mbouda", city: "Mbouda", address: "Mbouda, Région de l'Ouest", phone: "+237 233 505 001" },
  { name: "Hôpital de District de Dschang", city: "Dschang", address: "Dschang, Région de l'Ouest", phone: "+237 233 506 001" },
  { name: "Centre Hospitalier Universitaire de Dschang", city: "Dschang", address: "Dschang", phone: "+237 233 506 200" },
  { name: "Hôpital de District de Bafang", city: "Bafang", address: "Bafang, Région de l'Ouest", phone: "+237 233 507 001" },
  { name: "Centre de Santé de Bandjoun", city: "Bandjoun", address: "Bandjoun, Région de l'Ouest", phone: "+237 233 508 001" },
  { name: "Hôpital de District de Tonga", city: "Tonga", address: "Tonga, Région de l'Ouest", phone: "+237 233 509 001" },

  // Centre - smaller towns
  { name: "Hôpital de District de Mbalmayo", city: "Mbalmayo", address: "Mbalmayo, Région du Centre", phone: "+237 222 261 001" },
  { name: "Centre Médical d'Arrondissement de Mbalmayo", city: "Mbalmayo", address: "Mbalmayo", phone: "+237 222 261 200" },
  { name: "Hôpital de District de Bafia", city: "Bafia", address: "Bafia, Région du Centre", phone: "+237 222 262 001" },
  { name: "Hôpital de District d'Obala", city: "Obala", address: "Obala, Région du Centre", phone: "+237 222 263 001" },
  { name: "Hôpital de District de Mfou", city: "Mfou", address: "Mfou, Région du Centre", phone: "+237 222 264 001" },
  { name: "Hôpital de District d'Eseka", city: "Eseka", address: "Eseka, Région du Centre", phone: "+237 222 265 001" },
  { name: "Centre de Santé de Nanga Eboko", city: "Nanga Eboko", address: "Nanga Eboko, Région du Centre", phone: "+237 222 266 001" },

  // Nord-Ouest - smaller towns
  { name: "Hôpital de District de Kumbo", city: "Kumbo", address: "Kumbo, Région du Nord-Ouest", phone: "+237 233 371 001" },
  { name: "Hôpital de District de Wum", city: "Wum", address: "Wum, Région du Nord-Ouest", phone: "+237 233 372 001" },
  { name: "Hôpital de District de Nkambe", city: "Nkambe", address: "Nkambe, Région du Nord-Ouest", phone: "+237 233 373 001" },
  { name: "Centre de Santé de Fundong", city: "Fundong", address: "Fundong, Région du Nord-Ouest", phone: "+237 233 374 001" },
  { name: "Hôpital de District de Mbengwi", city: "Mbengwi", address: "Mbengwi, Région du Nord-Ouest", phone: "+237 233 375 001" },

  // Sud-Ouest
  { name: "Hôpital Régional de Buea", city: "Buea", address: "Hospital Road, Buea", phone: "+237 233 321 001" },
  { name: "Hôpital de District de Limbe", city: "Limbe", address: "Limbe, Région du Sud-Ouest", phone: "+237 233 322 001" },
  { name: "Hôpital de District de Kumba", city: "Kumba", address: "Kumba, Région du Sud-Ouest", phone: "+237 233 323 001" },
  { name: "District Hospital Kumba", city: "Kumba", address: "Kumba", phone: "+237 233 323 200" },
  { name: "Hôpital de District de Mamfe", city: "Mamfe", address: "Mamfe, Région du Sud-Ouest", phone: "+237 233 324 001" },
  { name: "Hôpital de District de Tiko", city: "Tiko", address: "Tiko, Région du Sud-Ouest", phone: "+237 233 325 001" },

  // Nord - smaller towns
  { name: "Hôpital de District de Guider", city: "Guider", address: "Guider, Région du Nord", phone: "+237 222 281 001" },
  { name: "Hôpital de District de Figuil", city: "Figuil", address: "Figuil, Région du Nord", phone: "+237 222 282 001" },
  { name: "Hôpital de District de Pitoa", city: "Pitoa", address: "Pitoa, Région du Nord", phone: "+237 222 283 001" },
  { name: "Hôpital de District de Lagdo", city: "Lagdo", address: "Lagdo, Région du Nord", phone: "+237 222 284 001" },

  // Extrême-Nord - smaller towns
  { name: "Hôpital de District de Kousseri", city: "Kousseri", address: "Kousseri, Région de l'Extrême-Nord", phone: "+237 222 301 001" },
  { name: "Hôpital de District de Mora", city: "Mora", address: "Mora, Région de l'Extrême-Nord", phone: "+237 222 302 001" },
  { name: "Hôpital de District de Yagoua", city: "Yagoua", address: "Yagoua, Région de l'Extrême-Nord", phone: "+237 222 303 001" },
  { name: "Hôpital de District de Kaélé", city: "Kaélé", address: "Kaélé, Région de l'Extrême-Nord", phone: "+237 222 304 001" },
  { name: "Hôpital de District de Mokolo", city: "Mokolo", address: "Mokolo, Région de l'Extrême-Nord", phone: "+237 222 305 001" },

  // Adamaoua - smaller towns
  { name: "Hôpital de District de Meiganga", city: "Meiganga", address: "Meiganga, Région de l'Adamaoua", phone: "+237 222 261 001" },
  { name: "Hôpital de District de Tibati", city: "Tibati", address: "Tibati, Région de l'Adamaoua", phone: "+237 222 262 001" },
  { name: "Hôpital de District de Banyo", city: "Banyo", address: "Banyo, Région de l'Adamaoua", phone: "+237 222 263 001" },
  { name: "Hôpital de District de Tignère", city: "Tignère", address: "Tignère, Région de l'Adamaoua", phone: "+237 222 264 001" },

  // Est - smaller towns
  { name: "Hôpital de District de Batouri", city: "Batouri", address: "Batouri, Région de l'Est", phone: "+237 222 251 001" },
  { name: "Hôpital de District d'Abong-Mbang", city: "Abong-Mbang", address: "Abong-Mbang, Région de l'Est", phone: "+237 222 252 001" },
  { name: "Hôpital de District de Yokadouma", city: "Yokadouma", address: "Yokadouma, Région de l'Est", phone: "+237 222 253 001" },
  { name: "Hôpital de District de Lomié", city: "Lomié", address: "Lomié, Région de l'Est", phone: "+237 222 254 001" },

  // Sud - smaller towns
  { name: "Hôpital de District de Sangmélima", city: "Sangmélima", address: "Sangmélima, Région du Sud", phone: "+237 222 291 001" },
  { name: "Hôpital de District d'Ambam", city: "Ambam", address: "Ambam, Région du Sud", phone: "+237 222 292 001" },
  { name: "Hôpital de District de Lolodorf", city: "Lolodorf", address: "Lolodorf, Région du Sud", phone: "+237 222 293 001" },
  { name: "Hôpital de District de Djoum", city: "Djoum", address: "Djoum, Région du Sud", phone: "+237 222 294 001" },
];

async function main() {
  console.log("🏥 Seeding additional city hospitals...\n");
  const passwordHash = await bcrypt.hash("FlowMed-Internal-2026!", 12);
  let created = 0, skipped = 0;

  for (const h of ADDITIONAL_HOSPITALS) {
    const slug = h.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 50);
    const email = `hospital-${slug}@flowmed-seed.cm`;
    const ex = await prisma.user.findUnique({ where: { email } });
    if (ex) { skipped++; continue; }
    try {
      await prisma.user.create({
        data: {
          email, password: passwordHash, role: "MEDICAL_CENTER", emailVerified: true,
          medicalCenter: {
            create: { name: h.name, city: h.city, address: h.address, phone: h.phone, verificationStatus: "APPROVED", verificationDocs: JSON.stringify(["Source: FlowMed curated dataset"]) }
          }
        }
      });
      created++;
      console.log(`  ✓ ${h.name} (${h.city})`);
    } catch { skipped++; }
  }

  console.log(`\n✅ Done! Created: ${created}, Skipped: ${skipped}`);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); }).finally(() => prisma.$disconnect());
