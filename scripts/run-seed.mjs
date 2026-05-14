/**
 * One-time seed runner — inserts curated Cameroonian hospitals.
 * Run: node scripts/run-seed.mjs
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_MARKER_EMAIL = "seed-marker@flowmed-internal.cm";

const HOSPITALS = [
  // DOUALA
  { name: "Hôpital Général de Douala", city: "Douala", address: "Boulevard de la République, Douala", phone: "+237 233 422 201" },
  { name: "Hôpital Laquintinie de Douala", city: "Douala", address: "Rue Joffre, Akwa, Douala", phone: "+237 233 422 722" },
  { name: "Centre Hospitalier et Universitaire de Douala", city: "Douala", address: "Rue Njo Njo, Douala", phone: "+237 233 406 060" },
  { name: "Polyclinique Bonanjo", city: "Douala", address: "Bonanjo, Douala", phone: "+237 233 422 100" },
  { name: "Polyclinique Idimed", city: "Douala", address: "Akwa, Douala", phone: "+237 233 427 000" },
  { name: "Polyclinique Soppo Priso", city: "Douala", address: "Bali, Douala", phone: "+237 233 423 500" },
  { name: "Clinique Louis Pasteur Douala", city: "Douala", address: "Akwa, Douala", phone: "+237 233 421 800" },
  { name: "Clinique Arc-en-ciel Douala", city: "Douala", address: "Bonapriso, Douala", phone: "+237 233 424 200" },
  { name: "Clinique de l'Aéroport Douala", city: "Douala", address: "Douala Aéroport, Douala", phone: "+237 233 423 100" },
  { name: "Clinique Saint Thomas Douala", city: "Douala", address: "Makepe, Douala", phone: "+237 233 425 300" },
  { name: "Clinique des Rameaux Douala", city: "Douala", address: "Deido, Douala", phone: "+237 233 426 400" },
  { name: "Hôpital Protestant Cité SIC Douala", city: "Douala", address: "Cité SIC, Douala", phone: "+237 233 430 800" },
  { name: "Centre Médical d'Arrondissement de Bépanda", city: "Douala", address: "Bépanda, Douala", phone: "+237 233 431 900" },
  { name: "Centre de Santé Catholique Deo Gratias Douala-Boko", city: "Douala", address: "Boko, Douala", phone: "+237 233 432 000" },
  { name: "Centre de Santé Intégré Bonago", city: "Douala", address: "Bonago, Douala", phone: "+237 233 434 200" },
  { name: "Plateforme de Diagnostic Médical de Douala", city: "Douala", address: "Akwa, Douala", phone: "+237 233 440 800" },
  { name: "Centre de Sante de Yassa", city: "Douala", address: "Yassa, Douala", phone: "+237 233 442 000" },
  { name: "Fondation médico-chirurgicale Maria Rosa Nsisim", city: "Douala", address: "Douala", phone: "+237 233 444 200" },
  { name: "Centre Médico Social français Douala", city: "Douala", address: "Bonanjo, Douala", phone: "+237 233 445 300" },
  { name: "Centre Hospitalier Pédiatrique et Gynécologique Nina", city: "Douala", address: "Douala", phone: "+237 233 455 300" },
  { name: "Fondation Médicale Ad Lucem Douala", city: "Douala", address: "Bali, Douala", phone: "+237 233 428 600" },
  { name: "Hôpital Ad Lucem de Bali", city: "Douala", address: "Bali, Douala", phone: "+237 233 429 700" },
  { name: "Polyclinique de Poitiers Douala", city: "Douala", address: "Douala", phone: "+237 233 441 900" },
  { name: "Clinique du gros chêne Douala", city: "Douala", address: "Douala", phone: "+237 233 443 100" },
  { name: "Complexe Medico Chirurgical Douala", city: "Douala", address: "Douala", phone: "+237 233 453 100" },
  { name: "Centre médical Dikolo", city: "Douala", address: "Dikolo, Douala", phone: "+237 233 451 900" },
  { name: "Makarios Eye Clinic Douala", city: "Douala", address: "Douala", phone: "+237 233 449 700" },
  { name: "Fondation médicale Zaina Douala", city: "Douala", address: "Douala", phone: "+237 233 450 800" },
  { name: "St Louis Clinic Douala", city: "Douala", address: "Douala", phone: "+237 233 452 000" },
  { name: "Clinique de l'espoir Douala", city: "Douala", address: "Douala", phone: "+237 233 454 200" },
  // YAOUNDÉ
  { name: "Hôpital Central de Yaoundé", city: "Yaoundé", address: "Rue Henri Dunant, Yaoundé", phone: "+237 222 231 501" },
  { name: "Centre Hospitalier et Universitaire de Yaoundé", city: "Yaoundé", address: "Rue Joseph Mballa Eloumden, Yaoundé", phone: "+237 222 231 333" },
  { name: "Hôpital Général de Yaoundé", city: "Yaoundé", address: "Rue 1.820, Yaoundé", phone: "+237 222 200 122" },
  { name: "Hôpital Gynéco-Obstétrique et Pédiatrique de Yaoundé", city: "Yaoundé", address: "Ngousso, Yaoundé", phone: "+237 222 210 025" },
  { name: "Hôpital de District de Mvog Ada", city: "Yaoundé", address: "Mvog Ada, Yaoundé", phone: "+237 222 236 400" },
  { name: "District de Santé de Nkolbisson", city: "Yaoundé", address: "Nkolbisson, Yaoundé", phone: "+237 222 237 500" },
  { name: "Polyclinique du palais Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 235 300" },
  { name: "Centre de Vaccinations Internationales de Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 672 151 406" },
  { name: "Clinique de la Cathédrale Yaoundé", city: "Yaoundé", address: "Centre-ville, Yaoundé", phone: "+237 222 233 100" },
  { name: "Clinique Universitaire des Montagnes", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 234 200" },
  { name: "Centre Médical Ashyvic Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 240 800" },
  { name: "Maeva Care Clinique Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 241 900" },
  { name: "La Référence Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 243 100" },
  { name: "Florence Nightingale Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 244 200" },
  { name: "La Relève Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 245 300" },
  { name: "La Providence Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 246 400" },
  { name: "Centre Médical Jésus Sauve Et Guéri", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 247 500" },
  { name: "Kutenda Médical Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 249 700" },
  { name: "Centre Medical Sainte Bernadette Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 251 900" },
  { name: "Maison De La Santé St Paul Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 252 000" },
  { name: "Centre de santé d'Akonolinga Urbain", city: "Yaoundé", address: "Akonolinga, Yaoundé", phone: "+237 222 253 100" },
  // BAFOUSSAM
  { name: "Hôpital Régional de Bafoussam", city: "Bafoussam", address: "Avenue des Hôpitaux, Bafoussam", phone: "+237 233 441 001" },
  { name: "Hôpital Protestant de Mbouo", city: "Bafoussam", address: "Mbouo, Bafoussam", phone: "+237 233 441 500" },
  { name: "Centre Médical d'Arrondissement de Bafoussam 1", city: "Bafoussam", address: "Bafoussam 1, Bafoussam", phone: "+237 233 442 100" },
  { name: "Centre Médical d'Arrondissement de Bafoussam 2", city: "Bafoussam", address: "Bafoussam 2, Bafoussam", phone: "+237 233 442 200" },
  { name: "Polyclinique de Bafoussam", city: "Bafoussam", address: "Bafoussam", phone: "+237 233 445 500" },
  { name: "Centre de Santé de Fondjomekwet", city: "Bafoussam", address: "Fondjomekwet, Bafoussam", phone: "+237 233 444 400" },
  // BAMENDA
  { name: "Hôpital Régional de Bamenda", city: "Bamenda", address: "Hospital Road, Bamenda", phone: "+237 233 361 001" },
  { name: "Ndop District Hospital", city: "Bamenda", address: "Ndop, Bamenda", phone: "+237 233 362 100" },
  { name: "Bamunka Rural Health Centre", city: "Bamenda", address: "Bamunka, Bamenda", phone: "+237 233 362 200" },
  { name: "Presbyterian Health Services Bamenda", city: "Bamenda", address: "Bamenda", phone: "+237 233 363 400" },
  { name: "Baptist Hospital Bamenda", city: "Bamenda", address: "Bamenda", phone: "+237 233 364 500" },
  { name: "Holy Mary Health Care Foundation Bamenda", city: "Bamenda", address: "Bamenda", phone: "+237 233 366 700" },
  { name: "Integrated Health Center Bamenda", city: "Bamenda", address: "Bamenda", phone: "+237 233 368 900" },
  // GAROUA
  { name: "Hôpital Régional de Garoua", city: "Garoua", address: "Avenue de l'Hôpital, Garoua", phone: "+237 222 271 001" },
  { name: "Centre de Santé de Garoua 1", city: "Garoua", address: "Garoua 1, Garoua", phone: "+237 222 271 500" },
  { name: "Hôpital de la Caisse Garoua", city: "Garoua", address: "Garoua", phone: "+237 222 272 200" },
  { name: "Clinique du Sahel Garoua", city: "Garoua", address: "Garoua", phone: "+237 222 275 500" },
  { name: "Centre de Santé Islamique Albiri Garoua", city: "Garoua", address: "Garoua", phone: "+237 222 274 400" },
  // MAROUA
  { name: "Hôpital Régional de Maroua", city: "Maroua", address: "Avenue de l'Hôpital, Maroua", phone: "+237 222 291 001" },
  { name: "Centre de Santé Intégré de Djamboutou", city: "Maroua", address: "Djamboutou, Maroua", phone: "+237 222 292 100" },
  { name: "Clinique du Sahel Maroua", city: "Maroua", address: "Maroua", phone: "+237 222 294 400" },
  { name: "Croix Rouge Camerounaise Maroua", city: "Maroua", address: "Maroua", phone: "+237 222 296 600" },
  // NGAOUNDÉRÉ
  { name: "Hôpital Régional de Ngaoundéré", city: "Ngaoundéré", address: "Avenue de l'Hôpital, Ngaoundéré", phone: "+237 222 251 001" },
  { name: "Centre Médical de la Police Ngaoundéré", city: "Ngaoundéré", address: "Ngaoundéré", phone: "+237 222 251 500" },
  { name: "Hôpital Catholique de Djunang", city: "Ngaoundéré", address: "Djunang, Ngaoundéré", phone: "+237 222 252 100" },
  { name: "Clinique islamique de l'Adamaoua", city: "Ngaoundéré", address: "Ngaoundéré", phone: "+237 222 253 300" },
  // BERTOUA
  { name: "Hôpital Régional de Bertoua", city: "Bertoua", address: "Avenue de l'Hôpital, Bertoua", phone: "+237 222 241 001" },
  { name: "Centre Médical d'Arrondissement de Bertoua", city: "Bertoua", address: "Bertoua", phone: "+237 222 241 500" },
  // EBOLOWA
  { name: "Hôpital Régional d'Ebolowa", city: "Ebolowa", address: "Avenue de l'Hôpital, Ebolowa", phone: "+237 222 281 001" },
  { name: "Centre Médical d'Arrondissement d'Ebolowa", city: "Ebolowa", address: "Ebolowa", phone: "+237 222 281 500" },
  // KRIBI
  { name: "Hôpital de District de Kribi", city: "Kribi", address: "Avenue de l'Hôpital, Kribi", phone: "+237 233 461 001" },
  { name: "Centre Médical d'Arrondissement de Kribi", city: "Kribi", address: "Kribi", phone: "+237 233 461 500" },
  { name: "Clinique de Kribi", city: "Kribi", address: "Kribi", phone: "+237 233 462 200" },
];

async function main() {
  console.log("🏥 Seeding curated Cameroonian hospitals...\n");

  const passwordHash = await bcrypt.hash("FlowMed-Internal-2026!", 12);

  // Create seed marker
  const existing = await prisma.user.findUnique({ where: { email: SEED_MARKER_EMAIL } });
  if (!existing) {
    await prisma.user.create({
      data: { email: SEED_MARKER_EMAIL, password: passwordHash, role: "ADMIN", emailVerified: true },
    });
  }

  let created = 0;
  let skipped = 0;

  for (const h of HOSPITALS) {
    const slug = h.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 50);
    const email = `hospital-${slug}@flowmed-seed.cm`;

    const ex = await prisma.user.findUnique({ where: { email } });
    if (ex) { skipped++; continue; }

    try {
      await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          role: "MEDICAL_CENTER",
          emailVerified: true,
          medicalCenter: {
            create: {
              name: h.name,
              city: h.city,
              address: h.address,
              phone: h.phone,
              verificationStatus: "APPROVED",
              verificationDocs: JSON.stringify(["Source: FlowMed curated dataset"]),
            },
          },
        },
      });
      created++;
      console.log(`  ✓ ${h.name} (${h.city})`);
    } catch (e) {
      skipped++;
    }
  }

  console.log(`\n✅ Done! Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch(e => { console.error("❌", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
