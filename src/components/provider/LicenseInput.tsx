'use client';

import { useState, useEffect } from 'react';
import { validateLicense, detectSuspiciousLicense, generateTestLicenseNumber } from '@/lib/validations/license';

interface LicenseInputProps {
  tier: 'TIER_1_DOCTOR' | 'TIER_2_NURSE' | 'TIER_3_CERTIFIED_WORKER';
  value: string;
  expiryDate?: string;
  onChange: (value: string) => void;
  onExpiryChange?: (value: string) => void;
  locale: 'en' | 'fr';
  required?: boolean;
}

export default function LicenseInput({
  tier,
  value,
  expiryDate,
  onChange,
  onExpiryChange,
  locale,
  required = false,
}: LicenseInputProps) {
  const [validation, setValidation] = useState<{
    isValid: boolean;
    error?: string;
    warnings?: string[];
  } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const content = {
    en: {
      licenseNumber: 'License Number',
      licenseExpiry: 'License Expiry Date',
      format: 'Format',
      example: 'Example',
      generateTest: 'Generate Test License',
      help: 'Help',
      formats: {
        TIER_1_DOCTOR: 'CMR-MED-YYYY-XXXX or CMR-DOC-YYYY-XXXX',
        TIER_2_NURSE: 'CMR-NRS-YYYY-XXXX or CMR-NURSE-YYYY-XXXX',
        TIER_3_CERTIFIED_WORKER: 'CMR-CRT-YYYY-XXXX or CMR-CERT-YYYY-XXXX',
      },
      helpText: {
        TIER_1_DOCTOR: 'Enter your medical license number issued by ONMC (Ordre National des Médecins du Cameroun)',
        TIER_2_NURSE: 'Enter your nursing license number issued by the Cameroon nursing council',
        TIER_3_CERTIFIED_WORKER: 'Enter your certification number or graduation certificate reference',
      },
    },
    fr: {
      licenseNumber: 'Numéro de Licence',
      licenseExpiry: 'Date d\'Expiration de la Licence',
      format: 'Format',
      example: 'Exemple',
      generateTest: 'Générer Licence Test',
      help: 'Aide',
      formats: {
        TIER_1_DOCTOR: 'CMR-MED-AAAA-XXXX ou CMR-DOC-AAAA-XXXX',
        TIER_2_NURSE: 'CMR-NRS-AAAA-XXXX ou CMR-NURSE-AAAA-XXXX',
        TIER_3_CERTIFIED_WORKER: 'CMR-CRT-AAAA-XXXX ou CMR-CERT-AAAA-XXXX',
      },
      helpText: {
        TIER_1_DOCTOR: 'Entrez votre numéro de licence médicale délivré par l\'ONMC (Ordre National des Médecins du Cameroun)',
        TIER_2_NURSE: 'Entrez votre numéro de licence d\'infirmier délivré par le conseil des infirmiers du Cameroun',
        TIER_3_CERTIFIED_WORKER: 'Entrez votre numéro de certification ou référence de certificat de graduation',
      },
    },
  };

  const t = content[locale];

  // Validate on change
  useEffect(() => {
    if (value) {
      const result = validateLicense(value, tier, expiryDate);
      setValidation(result);
    } else {
      setValidation(null);
    }
  }, [value, tier, expiryDate]);

  const handleGenerateTest = () => {
    const testLicense = generateTestLicenseNumber(tier);
    onChange(testLicense);
    
    // Set expiry date to 2 years from now
    if (onExpiryChange) {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      onExpiryChange(futureDate.toISOString().split('T')[0]);
    }
  };

  const minExpiryDate = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      {/* License Number Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700">
            {t.licenseNumber} {required && '*'}
          </label>
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs text-teal-600 hover:text-teal-700"
          >
            {showHelp ? '✕' : '?'} {t.help}
          </button>
        </div>

        {showHelp && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <p className="text-blue-900 mb-2">{t.helpText[tier]}</p>
            <p className="text-blue-700">
              <strong>{t.format}:</strong> {t.formats[tier]}
            </p>
            <p className="text-blue-700 mt-1">
              <strong>{t.example}:</strong> {generateTestLicenseNumber(tier)}
            </p>
            <button
              type="button"
              onClick={handleGenerateTest}
              className="mt-2 text-xs text-teal-600 hover:text-teal-700 underline"
            >
              {t.generateTest}
            </button>
          </div>
        )}

        <input
          id="licenseNumber"
          name="licenseNumber"
          type="text"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder={t.formats[tier].split(' ')[0]}
          className={`w-full px-4 py-3 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 transition-all ${
            validation?.isValid === false
              ? 'border-red-300 focus:ring-red-500'
              : validation?.warnings && validation.warnings.length > 0
              ? 'border-yellow-300 focus:ring-yellow-500'
              : validation?.isValid
              ? 'border-green-300 focus:ring-green-500'
              : 'border-gray-300 focus:ring-teal-500'
          }`}
        />

        {/* Validation Feedback */}
        {validation && (
          <div className="mt-2">
            {validation.error && (
              <p className="text-sm text-red-600 flex items-start gap-1">
                <span className="text-red-500">✗</span>
                <span>{validation.error}</span>
              </p>
            )}
            {validation.isValid && !validation.warnings && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <span className="text-green-500">✓</span>
                <span>{locale === 'en' ? 'Valid license format' : 'Format de licence valide'}</span>
              </p>
            )}
            {validation.warnings && validation.warnings.map((warning, idx) => (
              <p key={idx} className="text-sm text-yellow-600 flex items-start gap-1">
                <span className="text-yellow-500">⚠</span>
                <span>{warning}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* License Expiry Date Input */}
      {onExpiryChange && (
        <div>
          <label htmlFor="licenseExpiryDate" className="block text-sm font-medium text-gray-700 mb-2">
            {t.licenseExpiry}
          </label>
          <input
            id="licenseExpiryDate"
            name="licenseExpiryDate"
            type="date"
            min={minExpiryDate}
            value={expiryDate || ''}
            onChange={(e) => onExpiryChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            style={{ colorScheme: 'light' }}
          />
          <p className="mt-1 text-xs text-gray-500">
            {locale === 'en' 
              ? 'Optional: Enter the expiration date of your license' 
              : 'Optionnel: Entrez la date d\'expiration de votre licence'}
          </p>
        </div>
      )}
    </div>
  );
}
