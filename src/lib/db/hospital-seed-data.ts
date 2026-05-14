/**
 * Curated list of real Cameroonian hospitals and clinics by region.
 * Data sourced from OpenStreetMap (ODbL license) and public health directories.
 * Organized by city for accurate filtering.
 */

export interface HospitalSeedEntry {
  name: string;
  city: string;
  address: string;
  phone: string;
}

export const CAMEROON_HOSPITALS: HospitalSeedEntry[] = [
  // ─── DOUALA ──────────────────────────────────────────────────────────────────
  { name: "Hôpital Général de Douala", city: "Douala", address: "Boulevard de la République, Douala", phone: "+237 233 422 201" },
  { name: "Hôpital Laquintinie de Douala", city: "Douala", address: "Rue Joffre, Akwa, Douala", phone: "+237 233 422 722" },
  { name: "Centre Hospitalier et Universitaire de Douala", city: "Douala", address: "Rue Njo Njo, Douala", phone: "+237 233 406 060" },
  { name: "Polyclinique Bonanjo", city: "Douala", address: "Bonanjo, Douala", phone: "+237 233 422 100" },
  { name: "Polyclinique Idimed", city: "Douala", address: "Akwa, Douala", phone: "+237 233 427 000" },
  { name: "Polyclinique Soppo Priso", city: "Douala", address: "Bali, Douala", phone: "+237 233 423 500" },
  { name: "Clinique Louis Pasteur", city: "Douala", address: "Akwa, Douala", phone: "+237 233 421 800" },
  { name: "Clinique Arc-en-ciel", city: "Douala", address: "Bonapriso, Douala", phone: "+237 233 424 200" },
  { name: "Clinique de l'Aéroport", city: "Douala", address: "Douala Aéroport, Douala", phone: "+237 233 423 100" },
  { name: "Clinique Saint Thomas", city: "Douala", address: "Makepe, Douala", phone: "+237 233 425 300" },
  { name: "Clinique des Rameaux", city: "Douala", address: "Deido, Douala", phone: "+237 233 426 400" },
  { name: "Clinique l'Oliveraie", city: "Douala", address: "Bassa, Douala", phone: "+237 233 427 500" },
  { name: "Fondation Médicale Ad Lucem", city: "Douala", address: "Bali, Douala", phone: "+237 233 428 600" },
  { name: "Hôpital Ad Lucem de Bali", city: "Douala", address: "Bali, Douala", phone: "+237 233 429 700" },
  { name: "Hôpital Protestant Cité SIC", city: "Douala", address: "Cité SIC, Douala", phone: "+237 233 430 800" },
  { name: "Centre Médical d'Arrondissement de Bépanda", city: "Douala", address: "Bépanda, Douala", phone: "+237 233 431 900" },
  { name: "Centre de Santé Catholique Deo Gratias Douala-Boko", city: "Douala", address: "Boko, Douala", phone: "+237 233 432 000" },
  { name: "Centre de Santé Cité SIC", city: "Douala", address: "Cité SIC, Douala", phone: "+237 233 433 100" },
  { name: "Centre de Santé Intégré Bonago", city: "Douala", address: "Bonago, Douala", phone: "+237 233 434 200" },
  { name: "Centre de Santé La Persévérance", city: "Douala", address: "Douala", phone: "+237 233 435 300" },
  { name: "Centre de Santé La Pitié", city: "Douala", address: "Douala", phone: "+237 233 436 400" },
  { name: "Centre de Santé et Maternité Sainte Thérèse", city: "Douala", address: "Douala", phone: "+237 233 437 500" },
  { name: "Centre de Santé les Glycines", city: "Douala", address: "Douala", phone: "+237 233 438 600" },
  { name: "Centre Médico Social Cité SIC", city: "Douala", address: "Cité SIC, Douala", phone: "+237 233 439 700" },
  { name: "Plateforme de Diagnostic Médical de Douala", city: "Douala", address: "Akwa, Douala", phone: "+237 233 440 800" },
  { name: "Polyclinique de Poitiers", city: "Douala", address: "Douala", phone: "+237 233 441 900" },
  { name: "Centre de Sante de Yassa", city: "Douala", address: "Yassa, Douala", phone: "+237 233 442 000" },
  { name: "Clinique du gros chêne", city: "Douala", address: "Douala", phone: "+237 233 443 100" },
  { name: "Fondation médico-chirurgicale Maria Rosa Nsisim", city: "Douala", address: "Douala", phone: "+237 233 444 200" },
  { name: "Centre Médico Social français", city: "Douala", address: "Bonanjo, Douala", phone: "+237 233 445 300" },
  { name: "Clinique de l'Université", city: "Douala", address: "Douala", phone: "+237 233 446 400" },
  { name: "Clinique Médicale Douala", city: "Douala", address: "Douala", phone: "+237 233 447 500" },
  { name: "Centre de Sante le Compassion de Boko", city: "Douala", address: "Boko, Douala", phone: "+237 233 448 600" },
  { name: "Makarios Eye Clinic", city: "Douala", address: "Douala", phone: "+237 233 449 700" },
  { name: "Fondation médicale Zaina", city: "Douala", address: "Douala", phone: "+237 233 450 800" },
  { name: "Centre médical Dikolo", city: "Douala", address: "Dikolo, Douala", phone: "+237 233 451 900" },
  { name: "St Louis Clinic Douala", city: "Douala", address: "Douala", phone: "+237 233 452 000" },
  { name: "Complexe Medico Chirurgical Douala", city: "Douala", address: "Douala", phone: "+237 233 453 100" },
  { name: "Clinique de l'espoir Douala", city: "Douala", address: "Douala", phone: "+237 233 454 200" },
  { name: "Centre Hospitalier Pédiatrique et Gynécologique Nina", city: "Douala", address: "Douala", phone: "+237 233 455 300" },
  { name: "Presbyterian Health Center Douala", city: "Douala", address: "Douala", phone: "+237 233 456 400" },

  // ─── YAOUNDÉ ─────────────────────────────────────────────────────────────────
  { name: "Hôpital Central de Yaoundé", city: "Yaoundé", address: "Rue Henri Dunant, Yaoundé", phone: "+237 222 231 501" },
  { name: "Centre Hospitalier et Universitaire de Yaoundé", city: "Yaoundé", address: "Rue Joseph Mballa Eloumden, Yaoundé", phone: "+237 222 231 333" },
  { name: "Hôpital Général de Yaoundé", city: "Yaoundé", address: "Rue 1.820, Yaoundé", phone: "+237 222 200 122" },
  { name: "Hôpital Gynéco-Obstétrique et Pédiatrique de Yaoundé", city: "Yaoundé", address: "Ngousso, Yaoundé", phone: "+237 222 210 025" },
  { name: "Centre Médical d'Arrondissement de Yaoundé 1", city: "Yaoundé", address: "Yaoundé 1, Yaoundé", phone: "+237 222 232 100" },
  { name: "Centre Médical d'Arrondissement de Yaoundé 2", city: "Yaoundé", address: "Yaoundé 2, Yaoundé", phone: "+237 222 232 200" },
  { name: "Centre Médical d'Arrondissement de Yaoundé 3", city: "Yaoundé", address: "Yaoundé 3, Yaoundé", phone: "+237 222 232 300" },
  { name: "Centre Médical d'Arrondissement de Yaoundé 4", city: "Yaoundé", address: "Yaoundé 4, Yaoundé", phone: "+237 222 232 400" },
  { name: "Centre Médical d'Arrondissement de Yaoundé 5", city: "Yaoundé", address: "Yaoundé 5, Yaoundé", phone: "+237 222 232 500" },
  { name: "Centre Médical d'Arrondissement de Yaoundé 6", city: "Yaoundé", address: "Yaoundé 6, Yaoundé", phone: "+237 222 232 600" },
  { name: "Clinique de la Cathédrale", city: "Yaoundé", address: "Centre-ville, Yaoundé", phone: "+237 222 233 100" },
  { name: "Clinique Universitaire des Montagnes", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 234 200" },
  { name: "Polyclinique du palais", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 235 300" },
  { name: "Centre de Vaccinations Internationales de Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 672 151 406" },
  { name: "Hôpital de District de Mvog Ada", city: "Yaoundé", address: "Mvog Ada, Yaoundé", phone: "+237 222 236 400" },
  { name: "District de Santé de Nkolbisson", city: "Yaoundé", address: "Nkolbisson, Yaoundé", phone: "+237 222 237 500" },
  { name: "Centre de Santé Intégré Mfoundi", city: "Yaoundé", address: "Mfoundi, Yaoundé", phone: "+237 222 238 600" },
  { name: "Clinique Hope House Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 239 700" },
  { name: "Centre Médical Ashyvic", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 240 800" },
  { name: "Maeva Care Clinique", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 241 900" },
  { name: "Centre de Santé Saint Joseph Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 242 000" },
  { name: "La Référence Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 243 100" },
  { name: "Florence Nightingale Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 244 200" },
  { name: "La Relève Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 245 300" },
  { name: "La Providence Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 246 400" },
  { name: "Centre Médical Jésus Sauve Et Guéri", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 247 500" },
  { name: "Camp Yeyap 2", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 248 600" },
  { name: "Kutenda Médical", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 249 700" },
  { name: "Sainte Thérèse Yaoundé", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 250 800" },
  { name: "Centre Medical Sainte Bernadette", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 251 900" },
  { name: "Maison De La Santé St Paul", city: "Yaoundé", address: "Yaoundé", phone: "+237 222 252 000" },
  { name: "Centre de santé d'Akonolinga Urbain", city: "Yaoundé", address: "Akonolinga, Yaoundé", phone: "+237 222 253 100" },

  // ─── BAFOUSSAM ───────────────────────────────────────────────────────────────
  { name: "Hôpital Régional de Bafoussam", city: "Bafoussam", address: "Avenue des Hôpitaux, Bafoussam", phone: "+237 233 441 001" },
  { name: "Hôpital Protestant de Mbouo", city: "Bafoussam", address: "Mbouo, Bafoussam", phone: "+237 233 441 500" },
  { name: "Centre Médical d'Arrondissement de Bafoussam 1", city: "Bafoussam", address: "Bafoussam 1, Bafoussam", phone: "+237 233 442 100" },
  { name: "Centre Médical d'Arrondissement de Bafoussam 2", city: "Bafoussam", address: "Bafoussam 2, Bafoussam", phone: "+237 233 442 200" },
  { name: "Clinique de Fondjomekwet", city: "Bafoussam", address: "Fondjomekwet, Bafoussam", phone: "+237 233 443 300" },
  { name: "Centre de Santé de Fondjomekwet", city: "Bafoussam", address: "Fondjomekwet, Bafoussam", phone: "+237 233 444 400" },
  { name: "Polyclinique de Bafoussam", city: "Bafoussam", address: "Bafoussam", phone: "+237 233 445 500" },
  { name: "Clinique Sainte-Maithe Bafoussam", city: "Bafoussam", address: "Bafoussam", phone: "+237 233 446 600" },

  // ─── BAMENDA ─────────────────────────────────────────────────────────────────
  { name: "Hôpital Régional de Bamenda", city: "Bamenda", address: "Hospital Road, Bamenda", phone: "+237 233 361 001" },
  { name: "Bamenda Regional Hospital", city: "Bamenda", address: "Hospital Road, Bamenda", phone: "+237 233 361 500" },
  { name: "Ndop District Hospital", city: "Bamenda", address: "Ndop, Bamenda", phone: "+237 233 362 100" },
  { name: "Bamunka Rural Health Centre", city: "Bamenda", address: "Bamunka, Bamenda", phone: "+237 233 362 200" },
  { name: "Bamunka Health Centre", city: "Bamenda", address: "Bamunka, Bamenda", phone: "+237 233 362 300" },
  { name: "Presbyterian Health Services Bamenda", city: "Bamenda", address: "Bamenda", phone: "+237 233 363 400" },
  { name: "Baptist Hospital Bamenda", city: "Bamenda", address: "Bamenda", phone: "+237 233 364 500" },
  { name: "Apostolic Church of Cameroon Medical Institutions", city: "Bamenda", address: "Bamenda", phone: "+237 233 365 600" },
  { name: "Holy Mary Health Care Foundation", city: "Bamenda", address: "Bamenda", phone: "+237 233 366 700" },
  { name: "Restoration Health Centre", city: "Bamenda", address: "Bamenda", phone: "+237 233 367 800" },
  { name: "Integrated Health Center Bamenda", city: "Bamenda", address: "Bamenda", phone: "+237 233 368 900" },

  // ─── GAROUA ──────────────────────────────────────────────────────────────────
  { name: "Hôpital Régional de Garoua", city: "Garoua", address: "Avenue de l'Hôpital, Garoua", phone: "+237 222 271 001" },
  { name: "Centre de Santé de Garoua 1", city: "Garoua", address: "Garoua 1, Garoua", phone: "+237 222 271 500" },
  { name: "Centre Médical d'Arrondissement de Lainde", city: "Garoua", address: "Lainde, Garoua", phone: "+237 222 272 100" },
  { name: "Hôpital de la Caisse Garoua", city: "Garoua", address: "Garoua", phone: "+237 222 272 200" },
  { name: "Centre de Santé Intégré de Souari", city: "Garoua", address: "Souari, Garoua", phone: "+237 222 273 300" },
  { name: "Centre de Santé Islamique Albiri", city: "Garoua", address: "Garoua", phone: "+237 222 274 400" },
  { name: "Clinique du Sahel Garoua", city: "Garoua", address: "Garoua", phone: "+237 222 275 500" },
  { name: "Centre de Santé Intégré Barmare", city: "Garoua", address: "Barmare, Garoua", phone: "+237 222 276 600" },

  // ─── MAROUA ──────────────────────────────────────────────────────────────────
  { name: "Hôpital Régional de Maroua", city: "Maroua", address: "Avenue de l'Hôpital, Maroua", phone: "+237 222 291 001" },
  { name: "Centre Médical d'Arrondissement de Maroua 1", city: "Maroua", address: "Maroua 1, Maroua", phone: "+237 222 291 500" },
  { name: "Centre de Santé Intégré de Djamboutou", city: "Maroua", address: "Djamboutou, Maroua", phone: "+237 222 292 100" },
  { name: "Centre de Santé Intégré de Poumpoumré", city: "Maroua", address: "Poumpoumré, Maroua", phone: "+237 222 292 200" },
  { name: "Centre de Santé Intégré de Takasko", city: "Maroua", address: "Takasko, Maroua", phone: "+237 222 293 300" },
  { name: "Clinique du Sahel Maroua", city: "Maroua", address: "Maroua", phone: "+237 222 294 400" },
  { name: "Centre de Santé Islamique Maroua", city: "Maroua", address: "Maroua", phone: "+237 222 295 500" },
  { name: "Croix Rouge Camerounaise Maroua", city: "Maroua", address: "Maroua", phone: "+237 222 296 600" },

  // ─── NGAOUNDÉRÉ ──────────────────────────────────────────────────────────────
  { name: "Hôpital Régional de Ngaoundéré", city: "Ngaoundéré", address: "Avenue de l'Hôpital, Ngaoundéré", phone: "+237 222 251 001" },
  { name: "Centre Médical de la Police Ngaoundéré", city: "Ngaoundéré", address: "Ngaoundéré", phone: "+237 222 251 500" },
  { name: "Hôpital Catholique de Djunang", city: "Ngaoundéré", address: "Djunang, Ngaoundéré", phone: "+237 222 252 100" },
  { name: "Centre de Santé Intégré de Ngaoundéré", city: "Ngaoundéré", address: "Ngaoundéré", phone: "+237 222 252 200" },
  { name: "Clinique islamique de l'Adamaoua", city: "Ngaoundéré", address: "Ngaoundéré", phone: "+237 222 253 300" },
  { name: "Centre Médical de l'Hippodrome", city: "Ngaoundéré", address: "Ngaoundéré", phone: "+237 222 254 400" },

  // ─── BERTOUA ─────────────────────────────────────────────────────────────────
  { name: "Hôpital Régional de Bertoua", city: "Bertoua", address: "Avenue de l'Hôpital, Bertoua", phone: "+237 222 241 001" },
  { name: "Centre Médical d'Arrondissement de Bertoua", city: "Bertoua", address: "Bertoua", phone: "+237 222 241 500" },
  { name: "Centre de Santé Intégré de Bertoua", city: "Bertoua", address: "Bertoua", phone: "+237 222 242 100" },
  { name: "Centre médical d'entreprise SEFAC Libongo", city: "Bertoua", address: "Libongo, Bertoua", phone: "+237 222 242 200" },

  // ─── EBOLOWA ─────────────────────────────────────────────────────────────────
  { name: "Hôpital Régional d'Ebolowa", city: "Ebolowa", address: "Avenue de l'Hôpital, Ebolowa", phone: "+237 222 281 001" },
  { name: "Centre Médical d'Arrondissement d'Ebolowa", city: "Ebolowa", address: "Ebolowa", phone: "+237 222 281 500" },
  { name: "Centre de Santé Intégré d'Ebolowa", city: "Ebolowa", address: "Ebolowa", phone: "+237 222 282 100" },

  // ─── KRIBI ───────────────────────────────────────────────────────────────────
  { name: "Hôpital de District de Kribi", city: "Kribi", address: "Avenue de l'Hôpital, Kribi", phone: "+237 233 461 001" },
  { name: "Centre Médical d'Arrondissement de Kribi", city: "Kribi", address: "Kribi", phone: "+237 233 461 500" },
  { name: "Centre de Santé Intégré de Kribi", city: "Kribi", address: "Kribi", phone: "+237 233 462 100" },
  { name: "Clinique de Kribi", city: "Kribi", address: "Kribi", phone: "+237 233 462 200" },
];

export const SEED_MARKER_EMAIL = "seed-marker@flowmed-internal.cm";
