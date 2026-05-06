import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';

/**
 * POST /api/contact
 * 
 * Handle contact form submissions from visitors/users
 * Sends the message to the admin/support email
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body;

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Get admin email from environment variable
    // You can set this to YOUR email address where you want to receive messages
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@flowmed.cm';

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Contact Form Submission</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #0d9488 0%, #10b981 100%); padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">📧 New Contact Message</h1>
                      <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">FlowMed Contact Form</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 20px;">Contact Details</h2>
                      
                      <!-- Sender Info -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                        <tr>
                          <td>
                            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">From</p>
                            <p style="margin: 0 0 16px 0; color: #111827; font-size: 16px; font-weight: 600;">${name}</p>
                            
                            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Email</p>
                            <p style="margin: 0 0 16px 0;">
                              <a href="mailto:${email}" style="color: #0d9488; text-decoration: none; font-size: 16px;">${email}</a>
                            </p>
                            
                            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Subject</p>
                            <p style="margin: 0; color: #111827; font-size: 16px;">${subject}</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Message -->
                      <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px; font-weight: 600;">Message:</h3>
                      <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 20px; border-radius: 4px;">
                        <p style="margin: 0; color: #111827; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                      </div>
                      
                      <!-- Reply Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px;">
                        <tr>
                          <td align="center">
                            <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject)}" 
                               style="display: inline-block; padding: 12px 32px; background-color: #0d9488; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                              Reply to ${name}
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #6b7280; font-size: 12px;">
                        This message was sent via FlowMed contact form
                      </p>
                      <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px;">
                        © 2026 FlowMed Cameroon
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Send email to admin
    const result = await sendEmail({
      to: adminEmail,
      subject: `[FlowMed Contact] ${subject}`,
      html: emailHtml,
      // Reply-to will be the user's email so you can reply directly
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Message sent successfully! We will get back to you soon.',
      });
    } else {
      console.error('[Contact Form Error]', result.error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send message. Please try again later.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Contact API Error]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
