import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  try {
    // Use custom sender email from env, or default to Resend's testing domain
    const defaultFrom = process.env.RESEND_FROM_EMAIL || 'FlowMed <onboarding@resend.dev>';
    
    const data = await resend.emails.send({
      from: from || defaultFrom,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    return { success: true, data };
  } catch (error) {
    console.error('[Resend Email Error]', error);
    return { success: false, error };
  }
}

// Email verification template
export function getVerificationEmailTemplate(verificationLink: string, locale: 'en' | 'fr' = 'en') {
  const content = {
    en: {
      title: 'Verify Your Email',
      greeting: 'Hello!',
      message: 'Thank you for registering with FlowMed. Please verify your email address by clicking the button below:',
      button: 'Verify Email',
      footer: 'If you did not create an account, please ignore this email.',
      validity: 'This link will expire in 24 hours.',
    },
    fr: {
      title: 'Vérifiez Votre Email',
      greeting: 'Bonjour!',
      message: 'Merci de vous être inscrit sur FlowMed. Veuillez vérifier votre adresse e-mail en cliquant sur le bouton ci-dessous:',
      button: 'Vérifier l\'Email',
      footer: 'Si vous n\'avez pas créé de compte, veuillez ignorer cet e-mail.',
      validity: 'Ce lien expirera dans 24 heures.',
    },
  };

  const t = content[locale];

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t.title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0d9488 0%, #10b981 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">FlowMed</h1>
                    <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">Cameroon Healthcare Platform</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px;">${t.greeting}</h2>
                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      ${t.message}
                    </p>
                    
                    <!-- Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${verificationLink}" style="display: inline-block; padding: 14px 32px; background-color: #0d9488; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                            ${t.button}
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      ${t.validity}
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
                    
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                      ${t.footer}
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px; text-align: center;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px;">
                      © 2026 FlowMed Cameroon. All rights reserved.
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
}

// Password reset template
export function getPasswordResetEmailTemplate(resetLink: string, locale: 'en' | 'fr' = 'en') {
  const content = {
    en: {
      title: 'Reset Your Password',
      greeting: 'Hello!',
      message: 'We received a request to reset your password. Click the button below to create a new password:',
      button: 'Reset Password',
      footer: 'If you did not request a password reset, please ignore this email or contact support if you have concerns.',
      validity: 'This link will expire in 1 hour.',
    },
    fr: {
      title: 'Réinitialisez Votre Mot de Passe',
      greeting: 'Bonjour!',
      message: 'Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe:',
      button: 'Réinitialiser le Mot de Passe',
      footer: 'Si vous n\'avez pas demandé de réinitialisation de mot de passe, veuillez ignorer cet e-mail ou contacter le support si vous avez des préoccupations.',
      validity: 'Ce lien expirera dans 1 heure.',
    },
  };

  const t = content[locale];

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t.title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0d9488 0%, #10b981 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">FlowMed</h1>
                    <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">Cameroon Healthcare Platform</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px;">${t.greeting}</h2>
                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      ${t.message}
                    </p>
                    
                    <!-- Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background-color: #0d9488; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                            ${t.button}
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      ${t.validity}
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
                    
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                      ${t.footer}
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px; text-align: center;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px;">
                      © 2026 FlowMed Cameroon. All rights reserved.
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
}

// Appointment confirmation template
export function getAppointmentConfirmationTemplate(
  appointmentDetails: {
    patientName: string;
    providerName: string;
    dateTime: string;
    specialty?: string;
  },
  locale: 'en' | 'fr' = 'en'
) {
  const content = {
    en: {
      title: 'Appointment Confirmed',
      greeting: `Hello ${appointmentDetails.patientName}!`,
      message: 'Your appointment has been confirmed. Here are the details:',
      provider: 'Provider',
      dateTime: 'Date & Time',
      specialty: 'Specialty',
      footer: 'If you need to cancel or reschedule, please log in to your account.',
    },
    fr: {
      title: 'Rendez-vous Confirmé',
      greeting: `Bonjour ${appointmentDetails.patientName}!`,
      message: 'Votre rendez-vous a été confirmé. Voici les détails:',
      provider: 'Médecin',
      dateTime: 'Date et Heure',
      specialty: 'Spécialité',
      footer: 'Si vous devez annuler ou reporter, veuillez vous connecter à votre compte.',
    },
  };

  const t = content[locale];

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t.title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0d9488 0%, #10b981 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">FlowMed</h1>
                    <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">Cameroon Healthcare Platform</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px;">${t.greeting}</h2>
                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      ${t.message}
                    </p>
                    
                    <!-- Appointment Details -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdfa; border-radius: 8px; padding: 24px; margin: 24px 0;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 12px 0; color: #0f766e; font-size: 14px; font-weight: 600;">${t.provider}:</p>
                          <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px;">Dr. ${appointmentDetails.providerName}</p>
                          
                          ${appointmentDetails.specialty ? `
                            <p style="margin: 0 0 12px 0; color: #0f766e; font-size: 14px; font-weight: 600;">${t.specialty}:</p>
                            <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px;">${appointmentDetails.specialty}</p>
                          ` : ''}
                          
                          <p style="margin: 0 0 12px 0; color: #0f766e; font-size: 14px; font-weight: 600;">${t.dateTime}:</p>
                          <p style="margin: 0; color: #111827; font-size: 16px;">${appointmentDetails.dateTime}</p>
                        </td>
                      </tr>
                    </table>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
                    
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                      ${t.footer}
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px; text-align: center;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px;">
                      © 2026 FlowMed Cameroon. All rights reserved.
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
}
