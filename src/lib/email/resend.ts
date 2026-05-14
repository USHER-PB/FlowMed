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
// Appointment Confirmation Email
export function getAppointmentConfirmationTemplate(data: {
  patientName: string
  providerName?: string
  medicalCenterName: string
  medicalCenterEmail?: string
  medicalCenterPhone?: string
  dateTime: string
  reason: string
  locale: 'en' | 'fr'
}) {
  const { patientName, providerName, medicalCenterName, medicalCenterEmail, medicalCenterPhone, dateTime, reason, locale } = data
  
  const content = {
    en: {
      title: 'Appointment Confirmation',
      greeting: `Dear ${patientName}`,
      appointmentDetails: 'Your appointment details:',
      facility: 'Facility',
      provider: providerName ? 'Healthcare Provider' : 'Assigned Provider',
      dateTime: 'Date & Time',
      reason: 'Reason for Visit',
      message: 'Your appointment has been confirmed. Please arrive 15 minutes before your scheduled time.',
      footer: 'Thank you for choosing FlowMed for your healthcare needs.',
    },
    fr: {
      title: 'Confirmation de Rendez-vous',
      greeting: `Cher(e) ${patientName}`,
      appointmentDetails: 'Détails de votre rendez-vous:',
      facility: 'Établissement',
      provider: providerName ? 'Professionnel de santé' : 'Professionnel assigné',
      dateTime: 'Date et Heure',
      reason: 'Motif de la visite',
      message: 'Votre rendez-vous est confirmé. Veuillez arriver 15 minutes avant l heure prévue.',
      footer: 'Merci d avoir choisi FlowMed pour vos besoins de santé.',
    },
  }

  const t = content[locale]
  const formattedDate = new Date(dateTime).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset='utf-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>${t.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0d9488, #0f766e); color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; }
          .detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: 600; width: 40%; color: #6b7280; }
          .detail-value { flex: 1; color: #111827; }
          .message { margin-top: 20px; padding: 16px; background: white; border-radius: 8px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class='container'>
          <div class='header'>
            <h1>${t.title}</h1>
          </div>
          <div class='content'>
            <p>${t.greeting},</p>
            <p>${t.message}</p>
            
            <div class='message'>
              <h3 style='margin-top: 0;'>${t.appointmentDetails}</h3>
              <div class='detail-row'>
                <span class='detail-label'>${t.facility}:</span>
                <span class='detail-value'><strong>${medicalCenterName}</strong></span>
              </div>
              ${providerName ? `
              <div class='detail-row'>
                <span class='detail-label'>${t.provider}:</span>
                <span class='detail-value'>${providerName}</span>
              </div>
              ` : ''}
              <div class='detail-row'>
                <span class='detail-label'>${t.dateTime}:</span>
                <span class='detail-value'><strong>${formattedDate}</strong></span>
              </div>
              <div class='detail-row' style='border-bottom: none;'>
                <span class='detail-label'>${t.reason}:</span>
                <span class='detail-value'>${reason}</span>
              </div>
            </div>
            
            ${medicalCenterPhone ? `<p style='margin-top: 20px;'>Contact: ${medicalCenterPhone}</p>` : ''}
          </div>
          <div class='footer'>
            <p>${t.footer}</p>
            <p style='margin-top: 10px; font-size: 12px;'>FlowMed - Cameroon Healthcare Platform</p>
          </div>
        </div>
      </body>
    </html>
  `
}

// Doctor/Provider Invitation Email
export function getDoctorInvitationTemplate(data: {
  providerName: string
  medicalCenterName: string
  medicalCenterEmail?: string
  acceptUrl: string
  locale: 'en' | 'fr'
}) {
  const { providerName, medicalCenterName, acceptUrl, locale } = data
  
  const content = {
    en: {
      title: 'Healthcare Provider Invitation',
      greeting: `Hello Dr. ${providerName}`,
      message: `You have been invited to join ${medicalCenterName} on FlowMed. Click the button below to accept this invitation and start managing your appointments.`,
      button: 'Accept Invitation',
      expiryNote: 'This invitation will expire in 7 days.',
      footer: 'If you did not expect this invitation, please ignore this email.',
    },
    fr: {
      title: 'Invitation Professionnel de Sante',
      greeting: `Bonjour Dr. ${providerName}`,
      message: `Vous avez ete invite(e) a rejoindre ${medicalCenterName} sur FlowMed. Cliquez sur le bouton ci-dessous pour accepter cette invitation et commencer a gerer vos rendez-vous.`,
      button: 'Accepter l Invitation',
      expiryNote: 'Cette invitation expire dans 7 jours.',
      footer: 'Si vous n attendiez pas cette invitation, veuillez ignorer cet e-mail.',
    },
  }

  const t = content[locale]

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset='utf-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>${t.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0d9488, #0f766e); color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; }
          .cta-button { display: inline-block; background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class='container'>
          <div class='header'>
            <h1>${t.title}</h1>
          </div>
          <div class='content'>
            <p>${t.greeting},</p>
            <p>${t.message}</p>
            <div style='text-align: center;'>
              <a href='${acceptUrl}' class='cta-button'>${t.button}</a>
            </div>
            <p style='font-size: 14px; color: #6b7280;'>${t.expiryNote}</p>
          </div>
          <div class='footer'>
            <p>${t.footer}</p>
            <p style='margin-top: 10px;'>FlowMed - Cameroon Healthcare Platform</p>
          </div>
        </div>
      </body>
    </html>
  `
}
