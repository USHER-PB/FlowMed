import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { verifyONMCLicense, getONMCVerificationUrl, getVerificationGuide } from '@/lib/verification/onmc';

/**
 * POST /api/admin/verify-license
 * 
 * Admin tool to verify a provider's credentials.
 * 
 * - Doctors (Tier 1): Auto-checks free ONMC public registry (onmc.app)
 * - Nurses (Tier 2): Returns manual verification guide + required documents
 * - Medical Centers: Returns manual verification guide + required documents
 */
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['ADMIN']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { name, orderNumber, tier = 'TIER_1_DOCTOR' } = body;

    const guide = getVerificationGuide(tier);

    // For doctors: try automatic ONMC registry lookup
    if (tier === 'TIER_1_DOCTOR') {
      if (!name && !orderNumber) {
        return NextResponse.json(
          { error: 'Provide at least a name or order number to search' },
          { status: 400 }
        );
      }

      const result = await verifyONMCLicense({ name, orderNumber });
      const manualUrl = getONMCVerificationUrl({ name, orderNumber });

      return NextResponse.json({
        tier,
        autoVerification: result,
        manualVerificationUrl: manualUrl,
        guide,
        note: 'Doctors: Free ONMC public registry (onmc.app/tableau_de_lordre) — 12,578+ registered doctors',
      });
    }

    // For nurses and medical centers: return manual verification guide
    return NextResponse.json({
      tier,
      autoVerification: null,
      message: tier === 'TIER_2_NURSE'
        ? 'No public online registry exists for nurses in Cameroon. Use the manual verification guide below.'
        : 'No public online registry exists for medical centers in Cameroon. Use the manual verification guide below.',
      guide,
    });

  } catch (error) {
    console.error('[verify-license]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/verify-license?tier=TIER_1_DOCTOR|TIER_2_NURSE|MEDICAL_CENTER
 * Returns verification guide for the given provider type
 */
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['ADMIN']);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const tier = (searchParams.get('tier') || 'TIER_1_DOCTOR') as 'TIER_1_DOCTOR' | 'TIER_2_NURSE' | 'MEDICAL_CENTER';

  const guide = getVerificationGuide(tier);

  return NextResponse.json({
    guide,
    summary: {
      TIER_1_DOCTOR: { registry: 'ONMC — onmc.app/tableau_de_lordre', cost: 'FREE', automated: true },
      TIER_2_NURSE: { registry: 'None — contact MINSANTE manually', cost: 'Free (manual)', automated: false },
      MEDICAL_CENTER: { registry: 'None — contact Regional Health Delegation', cost: 'Free (manual)', automated: false },
    },
  });
}
