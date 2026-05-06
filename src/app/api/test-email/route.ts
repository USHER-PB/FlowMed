import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, getVerificationEmailTemplate } from '@/lib/email/resend';

/**
 * POST /api/test-email
 * 
 * Test endpoint to verify Resend email service is working
 * Send a test email to verify configuration
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, locale = 'en' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Send test verification email
    const testLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/verify?token=test-token-123`;
    
    const result = await sendEmail({
      to: email,
      subject: locale === 'fr' ? 'Test Email - FlowMed' : 'Test Email - FlowMed',
      html: getVerificationEmailTemplate(testLink, locale as 'en' | 'fr'),
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully!',
        data: result.data,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email',
          details: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[test-email POST]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test-email
 * 
 * Check Resend configuration status
 */
export async function GET() {
  const hasApiKey = !!process.env.RESEND_API_KEY;
  const apiKeyPreview = process.env.RESEND_API_KEY 
    ? `${process.env.RESEND_API_KEY.substring(0, 8)}...` 
    : 'Not set';

  return NextResponse.json({
    configured: hasApiKey,
    apiKeyPreview,
    message: hasApiKey 
      ? 'Resend is configured. Use POST with { "email": "your@email.com" } to send a test email.' 
      : 'Resend API key is not configured. Please set RESEND_API_KEY in your .env.local file.',
  });
}
