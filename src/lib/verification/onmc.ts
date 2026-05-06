/**
 * ONMC License Verification Service
 * 
 * Uses the free public registry at https://onmc.app/tableau_de_lordre
 * to verify if a doctor's license number and name exist in the official register.
 * 
 * This is 100% free - it's a public registry maintained by ONMC.
 * 
 * VERIFICATION COVERAGE:
 * - Doctors (Tier 1): ONMC public registry ✅ FREE
 * - Nurses (Tier 2): No public registry — manual via MINSANTE ⚠️
 * - Medical Centers: No public registry — manual via regional health delegation ⚠️
 */

export interface ONMCVerificationResult {
  found: boolean;
  doctor?: {
    name: string;
    orderNumber: string;
    photoUrl?: string;
  };
  error?: string;
  source: 'onmc_registry';
}

export interface VerificationGuide {
  tier: string;
  hasOnlineRegistry: boolean;
  registryUrl?: string;
  registryName?: string;
  manualContacts: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  }[];
  requiredDocuments: string[];
  notes: string;
}

/**
 * Returns verification guidance for each provider type
 */
export function getVerificationGuide(tier: 'TIER_1_DOCTOR' | 'TIER_2_NURSE' | 'MEDICAL_CENTER'): VerificationGuide {
  switch (tier) {
    case 'TIER_1_DOCTOR':
      return {
        tier: 'TIER_1_DOCTOR',
        hasOnlineRegistry: true,
        registryUrl: 'https://onmc.app/tableau_de_lordre',
        registryName: 'Ordre National des Médecins du Cameroun (ONMC)',
        manualContacts: [
          { name: 'ONMC Yaoundé', phone: '+237 699 688 427', email: 'contact@onmc.cm', address: 'Rond-point Nlongkak, Yaoundé' },
          { name: 'ONMC Douala', phone: '+237 699 652 681', address: 'Bonapriso, derrière la Clinique Métropolitaine, Douala' },
        ],
        requiredDocuments: ['Photo of medical license', 'National ID card', 'ONMC membership card'],
        notes: 'Free public registry available. Search by name or order number (format: XXXX/YYYY).',
      };

    case 'TIER_2_NURSE':
      return {
        tier: 'TIER_2_NURSE',
        hasOnlineRegistry: false,
        manualContacts: [
          { name: 'MINSANTE (Ministry of Public Health)', phone: '+237 222 221 501', address: 'Yaoundé, Cameroun' },
          { name: 'Cameroon Nurses Association', email: 'info@cameroonnursesassociation.org' },
          { name: 'Regional Health Delegation (your region)', phone: 'Contact your regional office' },
        ],
        requiredDocuments: [
          'State Registered Nurse (SRN) certificate',
          'Graduation certificate from nursing school',
          'National ID card',
          'MINSANTE authorization to practice',
        ],
        notes: 'No public online registry exists for nurses in Cameroon. Verify by contacting MINSANTE or the regional health delegation. Require document uploads.',
      };

    case 'MEDICAL_CENTER':
      return {
        tier: 'MEDICAL_CENTER',
        hasOnlineRegistry: false,
        manualContacts: [
          { name: 'MINSANTE (Ministry of Public Health)', phone: '+237 222 221 501', address: 'Yaoundé, Cameroun' },
          { name: 'Regional Health Delegation', phone: 'Contact your regional office' },
          { name: 'District Medical Officer', phone: 'Contact your district office' },
        ],
        requiredDocuments: [
          'Autorisation d\'Ouverture (Opening Authorization) from MINSANTE',
          'Business registration certificate (RCCM)',
          'Tax registration number (NIU)',
          'Building compliance certificate',
          'List of qualified staff',
        ],
        notes: 'No public online registry for medical centers. Verify the "Autorisation d\'Ouverture" document issued by MINSANTE. Contact the regional health delegation for confirmation.',
      };
  }
}

/**
 * Search the ONMC public registry by name or order number.
 * The registry is at https://onmc.app/tableau_de_lordre
 * It supports search by name and by "Numéro d'Ordre".
 * ONLY works for doctors (Tier 1).
 */
export async function verifyONMCLicense(
  params: { name?: string; orderNumber?: string }
): Promise<ONMCVerificationResult> {
  try {
    const searchQuery = params.orderNumber || params.name || '';
    if (!searchQuery) {
      return { found: false, error: 'Provide a name or order number', source: 'onmc_registry' };
    }

    const url = `https://onmc.app/onmc_connect/api/tableau_de_lordre/?search=${encodeURIComponent(searchQuery)}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json, text/html',
        'User-Agent': 'FlowMed-Admin-Verification/1.0',
        'Referer': 'https://onmc.app/tableau_de_lordre',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        found: false,
        error: `ONMC registry returned ${response.status}. Please verify manually at onmc.app/tableau_de_lordre`,
        source: 'onmc_registry',
      };
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      const list = data.results || data.doctors || (Array.isArray(data) ? data : []);
      if (list.length > 0) {
        const first = list[0];
        return {
          found: true,
          doctor: {
            name: first.name || first.nom || first.full_name || '',
            orderNumber: first.order_number || first.numero_ordre || first.id || '',
            photoUrl: first.photo || first.avatar || undefined,
          },
          source: 'onmc_registry',
        };
      }
      return { found: false, source: 'onmc_registry' };
    }

    const html = await response.text();
    return parseONMCHtml(html, searchQuery);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      found: false,
      error: `Could not reach ONMC registry: ${message}. Please verify manually at onmc.app/tableau_de_lordre`,
      source: 'onmc_registry',
    };
  }
}

/**
 * Parse ONMC HTML response to extract doctor info
 */
function parseONMCHtml(html: string, query: string): ONMCVerificationResult {
  const doctorPattern = /##\s+([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÇ\s\-']+)\n+(\d+\/\d{4}|P\d+\/\d{4})/gi;
  const matches = [...html.matchAll(doctorPattern)];

  if (matches.length === 0) {
    return { found: false, source: 'onmc_registry' };
  }

  if (query.match(/^\d+\/\d{4}$|^P\d+\/\d{4}$/i)) {
    const exact = matches.find(m => m[2].toLowerCase() === query.toLowerCase());
    if (exact) {
      return {
        found: true,
        doctor: { name: exact[1].trim(), orderNumber: exact[2] },
        source: 'onmc_registry',
      };
    }
    return { found: false, source: 'onmc_registry' };
  }

  const queryUpper = query.toUpperCase();
  const nameMatch = matches.find(m => m[1].toUpperCase().includes(queryUpper));
  if (nameMatch) {
    return {
      found: true,
      doctor: { name: nameMatch[1].trim(), orderNumber: nameMatch[2] },
      source: 'onmc_registry',
    };
  }

  return { found: false, source: 'onmc_registry' };
}

/**
 * Get the direct ONMC registry URL for manual verification (doctors only)
 */
export function getONMCVerificationUrl(params: { name?: string; orderNumber?: string }): string {
  const base = 'https://onmc.app/tableau_de_lordre';
  const query = params.orderNumber || params.name || '';
  if (!query) return base;
  return `${base}?search=${encodeURIComponent(query)}`;
}
