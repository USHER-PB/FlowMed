/**
 * Comprehensive list of Cameroonian cities and towns, organized by region.
 * Covers all 10 regions with major towns and smaller localities.
 */

export interface CityEntry {
  value: string;
  label: string;
  region: string;
}

export const CAMEROON_CITIES: CityEntry[] = [
  // ── Littoral Region ──────────────────────────────────────────────────────────
  { value: "Douala", label: "Douala", region: "Littoral" },
  { value: "Bonabéri", label: "Bonabéri", region: "Littoral" },
  { value: "Bonassama", label: "Bonassama", region: "Littoral" },
  { value: "Edéa", label: "Edéa", region: "Littoral" },
  { value: "Nkongsamba", label: "Nkongsamba", region: "Littoral" },
  { value: "Manjo", label: "Manjo", region: "Littoral" },
  { value: "Yabassi", label: "Yabassi", region: "Littoral" },
  { value: "Nkondjock", label: "Nkondjock", region: "Littoral" },
  { value: "Loum", label: "Loum", region: "Littoral" },
  { value: "Mbanga", label: "Mbanga", region: "Littoral" },
  { value: "Penja", label: "Penja", region: "Littoral" },
  { value: "Melong", label: "Melong", region: "Littoral" },
  { value: "Ndom", label: "Ndom", region: "Littoral" },
  { value: "Dibombari", label: "Dibombari", region: "Littoral" },
  { value: "Mouanko", label: "Mouanko", region: "Littoral" },

  // ── Centre Region ────────────────────────────────────────────────────────────
  { value: "Yaoundé", label: "Yaoundé", region: "Centre" },
  { value: "Mbalmayo", label: "Mbalmayo", region: "Centre" },
  { value: "Bafia", label: "Bafia", region: "Centre" },
  { value: "Obala", label: "Obala", region: "Centre" },
  { value: "Nanga Eboko", label: "Nanga Eboko", region: "Centre" },
  { value: "Akonolinga", label: "Akonolinga", region: "Centre" },
  { value: "Mfou", label: "Mfou", region: "Centre" },
  { value: "Eseka", label: "Eseka", region: "Centre" },
  { value: "Monatélé", label: "Monatélé", region: "Centre" },
  { value: "Ntui", label: "Ntui", region: "Centre" },
  { value: "Saa", label: "Saa", region: "Centre" },
  { value: "Ngoumou", label: "Ngoumou", region: "Centre" },
  { value: "Ayos", label: "Ayos", region: "Centre" },
  { value: "Okola", label: "Okola", region: "Centre" },
  { value: "Nkolafamba", label: "Nkolafamba", region: "Centre" },

  // ── Ouest (West) Region ──────────────────────────────────────────────────────
  { value: "Bafoussam", label: "Bafoussam", region: "Ouest" },
  { value: "Baganté", label: "Baganté", region: "Ouest" },
  { value: "Bangangté", label: "Bangangté", region: "Ouest" },
  { value: "Foumban", label: "Foumban", region: "Ouest" },
  { value: "Foumbot", label: "Foumbot", region: "Ouest" },
  { value: "Mbouda", label: "Mbouda", region: "Ouest" },
  { value: "Dschang", label: "Dschang", region: "Ouest" },
  { value: "Baham", label: "Baham", region: "Ouest" },
  { value: "Bafang", label: "Bafang", region: "Ouest" },
  { value: "Bandjoun", label: "Bandjoun", region: "Ouest" },
  { value: "Bamendjou", label: "Bamendjou", region: "Ouest" },
  { value: "Baleveng", label: "Baleveng", region: "Ouest" },
  { value: "Penka-Michel", label: "Penka-Michel", region: "Ouest" },
  { value: "Tonga", label: "Tonga", region: "Ouest" },
  { value: "Koutaba", label: "Koutaba", region: "Ouest" },
  { value: "Galim", label: "Galim", region: "Ouest" },
  { value: "Massangam", label: "Massangam", region: "Ouest" },

  // ── Nord-Ouest (Northwest) Region ────────────────────────────────────────────
  { value: "Bamenda", label: "Bamenda", region: "Nord-Ouest" },
  { value: "Kumbo", label: "Kumbo", region: "Nord-Ouest" },
  { value: "Wum", label: "Wum", region: "Nord-Ouest" },
  { value: "Ndop", label: "Ndop", region: "Nord-Ouest" },
  { value: "Nkambe", label: "Nkambe", region: "Nord-Ouest" },
  { value: "Fundong", label: "Fundong", region: "Nord-Ouest" },
  { value: "Mbengwi", label: "Mbengwi", region: "Nord-Ouest" },
  { value: "Batibo", label: "Batibo", region: "Nord-Ouest" },
  { value: "Bali", label: "Bali", region: "Nord-Ouest" },
  { value: "Bafut", label: "Bafut", region: "Nord-Ouest" },
  { value: "Santa", label: "Santa", region: "Nord-Ouest" },
  { value: "Tubah", label: "Tubah", region: "Nord-Ouest" },

  // ── Sud-Ouest (Southwest) Region ─────────────────────────────────────────────
  { value: "Buea", label: "Buea", region: "Sud-Ouest" },
  { value: "Limbe", label: "Limbe", region: "Sud-Ouest" },
  { value: "Kumba", label: "Kumba", region: "Sud-Ouest" },
  { value: "Mamfe", label: "Mamfe", region: "Sud-Ouest" },
  { value: "Mundemba", label: "Mundemba", region: "Sud-Ouest" },
  { value: "Tiko", label: "Tiko", region: "Sud-Ouest" },
  { value: "Muyuka", label: "Muyuka", region: "Sud-Ouest" },
  { value: "Ekondo Titi", label: "Ekondo Titi", region: "Sud-Ouest" },
  { value: "Bangem", label: "Bangem", region: "Sud-Ouest" },
  { value: "Tombel", label: "Tombel", region: "Sud-Ouest" },
  { value: "Nguti", label: "Nguti", region: "Sud-Ouest" },

  // ── Nord (North) Region ──────────────────────────────────────────────────────
  { value: "Garoua", label: "Garoua", region: "Nord" },
  { value: "Guider", label: "Guider", region: "Nord" },
  { value: "Poli", label: "Poli", region: "Nord" },
  { value: "Figuil", label: "Figuil", region: "Nord" },
  { value: "Pitoa", label: "Pitoa", region: "Nord" },
  { value: "Lagdo", label: "Lagdo", region: "Nord" },
  { value: "Ngong", label: "Ngong", region: "Nord" },
  { value: "Tchéboa", label: "Tchéboa", region: "Nord" },
  { value: "Rey Bouba", label: "Rey Bouba", region: "Nord" },
  { value: "Touboro", label: "Touboro", region: "Nord" },

  // ── Extrême-Nord (Far North) Region ──────────────────────────────────────────
  { value: "Maroua", label: "Maroua", region: "Extrême-Nord" },
  { value: "Kousseri", label: "Kousseri", region: "Extrême-Nord" },
  { value: "Mora", label: "Mora", region: "Extrême-Nord" },
  { value: "Yagoua", label: "Yagoua", region: "Extrême-Nord" },
  { value: "Kaélé", label: "Kaélé", region: "Extrême-Nord" },
  { value: "Mokolo", label: "Mokolo", region: "Extrême-Nord" },
  { value: "Mindif", label: "Mindif", region: "Extrême-Nord" },
  { value: "Meri", label: "Meri", region: "Extrême-Nord" },
  { value: "Bogo", label: "Bogo", region: "Extrême-Nord" },
  { value: "Waza", label: "Waza", region: "Extrême-Nord" },
  { value: "Fotokol", label: "Fotokol", region: "Extrême-Nord" },
  { value: "Kolofata", label: "Kolofata", region: "Extrême-Nord" },

  // ── Adamaoua Region ──────────────────────────────────────────────────────────
  { value: "Ngaoundéré", label: "Ngaoundéré", region: "Adamaoua" },
  { value: "Meiganga", label: "Meiganga", region: "Adamaoua" },
  { value: "Tibati", label: "Tibati", region: "Adamaoua" },
  { value: "Banyo", label: "Banyo", region: "Adamaoua" },
  { value: "Tignère", label: "Tignère", region: "Adamaoua" },
  { value: "Ngaoundal", label: "Ngaoundal", region: "Adamaoua" },
  { value: "Belel", label: "Belel", region: "Adamaoua" },
  { value: "Kontcha", label: "Kontcha", region: "Adamaoua" },

  // ── Est (East) Region ────────────────────────────────────────────────────────
  { value: "Bertoua", label: "Bertoua", region: "Est" },
  { value: "Batouri", label: "Batouri", region: "Est" },
  { value: "Abong-Mbang", label: "Abong-Mbang", region: "Est" },
  { value: "Yokadouma", label: "Yokadouma", region: "Est" },
  { value: "Doumé", label: "Doumé", region: "Est" },
  { value: "Lomié", label: "Lomié", region: "Est" },
  { value: "Ndelele", label: "Ndelele", region: "Est" },
  { value: "Mbang", label: "Mbang", region: "Est" },

  // ── Sud (South) Region ───────────────────────────────────────────────────────
  { value: "Ebolowa", label: "Ebolowa", region: "Sud" },
  { value: "Kribi", label: "Kribi", region: "Sud" },
  { value: "Sangmélima", label: "Sangmélima", region: "Sud" },
  { value: "Ambam", label: "Ambam", region: "Sud" },
  { value: "Lolodorf", label: "Lolodorf", region: "Sud" },
  { value: "Djoum", label: "Djoum", region: "Sud" },
  { value: "Mvangué", label: "Mvangué", region: "Sud" },
  { value: "Meyomessala", label: "Meyomessala", region: "Sud" },
  { value: "Bengbis", label: "Bengbis", region: "Sud" },
  { value: "Ma'an", label: "Ma'an", region: "Sud" },
];

// Flat list of city values for dropdowns
export const CITY_VALUES = CAMEROON_CITIES.map(c => c.value);

// Grouped by region for grouped dropdowns
export const CITIES_BY_REGION = CAMEROON_CITIES.reduce<Record<string, CityEntry[]>>(
  (acc, city) => {
    if (!acc[city.region]) acc[city.region] = [];
    acc[city.region].push(city);
    return acc;
  },
  {}
);
