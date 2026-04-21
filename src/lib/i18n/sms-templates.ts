export type SupportedLocale = 'fr' | 'en';

export interface SmsTemplateVars {
  queueUpdate: { position: number; minutes: number };
  diagnosisReady: Record<string, never>;
  appointmentConfirmed: { date: string };
  appointmentCancelled: Record<string, never>;
}

type TemplateKey = keyof SmsTemplateVars;

type Templates = {
  [K in TemplateKey]: (vars: SmsTemplateVars[K]) => string;
};

const SMS_TEMPLATES: Record<SupportedLocale, Templates> = {
  fr: {
    queueUpdate: ({ position, minutes }) =>
      `Votre position : #${position}. Temps d'attente : ${minutes} min`,
    diagnosisReady: () => `Votre diagnostic est prêt. Consultez l'application.`,
    appointmentConfirmed: ({ date }) => `Rendez-vous confirmé pour le ${date}`,
    appointmentCancelled: () => `Votre rendez-vous a été annulé`,
  },
  en: {
    queueUpdate: ({ position, minutes }) =>
      `Your position: #${position}. Wait time: ${minutes} min`,
    diagnosisReady: () => `Your diagnosis is ready. Check the app.`,
    appointmentConfirmed: ({ date }) => `Appointment confirmed for ${date}`,
    appointmentCancelled: () => `Your appointment has been cancelled`,
  },
};

/**
 * Returns a localised SMS message for the given template key and variables.
 * Falls back to French if the requested locale is not supported.
 */
export function getSmsTemplate<K extends TemplateKey>(
  key: K,
  vars: SmsTemplateVars[K],
  locale: SupportedLocale = 'fr',
): string {
  const templates = SMS_TEMPLATES[locale] ?? SMS_TEMPLATES.fr;
  return (templates[key] as (v: SmsTemplateVars[K]) => string)(vars);
}

export { SMS_TEMPLATES };
