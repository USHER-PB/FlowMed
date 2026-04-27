'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type ProviderTier = 'TIER_1_DOCTOR' | 'TIER_2_NURSE' | 'TIER_3_CERTIFIED_WORKER' | 'TIER_4_STUDENT' | 'TIER_5_VOLUNTEER';

export default function ProviderRegisterPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  
  const [tier, setTier] = useState<ProviderTier | ''>('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    specialty: '',
    licenseNumber: '',
    consultationFee: '',
    supervisorId: '',
    studentYear: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const content = {
    fr: {
      title: "Inscription Professionnel",
      subtitle: "Créez votre compte professionnel de santé",
      selectTier: "Sélectionnez votre catégorie",
      tiers: {
        TIER_1_DOCTOR: "Médecin (Tier 1)",
        TIER_2_NURSE: "Infirmier(ère) (Tier 2)",
        TIER_3_CERTIFIED_WORKER: "Travailleur Certifié (Tier 3)",
        TIER_4_STUDENT: "Étudiant en Médecine (Tier 4)",
        TIER_5_VOLUNTEER: "Volontaire (Tier 5)"
      },
      firstName: "Prénom",
      lastName: "Nom",
      email: "Adresse e-mail",
      phone: "Téléphone",
      password: "Mot de passe",
      confirmPassword: "Confirmer le mot de passe",
      passwordHint: "Min. 8 caractères, 1 majuscule, 1 chiffre",
      specialty: "Spécialité",
      licenseNumber: "Numéro de licence",
      consultationFee: "Frais de consultation (optionnel)",
      supervisorId: "ID du superviseur",
      studentYear: "Année d'études (1-7)",
      register: "S'inscrire",
      registering: "Inscription en cours...",
      haveAccount: "Vous avez déjà un compte ?",
      login: "Se connecter",
      switchRole: "Vous êtes patient ?",
      switchLink: "Inscription Patient",
      backHome: "Retour à l'accueil"
    },
    en: {
      title: "Professional Registration",
      subtitle: "Create your healthcare professional account",
      selectTier: "Select your category",
      tiers: {
        TIER_1_DOCTOR: "Doctor (Tier 1)",
        TIER_2_NURSE: "Nurse (Tier 2)",
        TIER_3_CERTIFIED_WORKER: "Certified Worker (Tier 3)",
        TIER_4_STUDENT: "Medical Student (Tier 4)",
        TIER_5_VOLUNTEER: "Volunteer (Tier 5)"
      },
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email address",
      phone: "Phone",
      password: "Password",
      confirmPassword: "Confirm Password",
      passwordHint: "Min. 8 characters, 1 uppercase, 1 number",
      specialty: "Specialty",
      licenseNumber: "License Number",
      consultationFee: "Consultation Fee (optional)",
      supervisorId: "Supervisor ID",
      studentYear: "Year of Study (1-7)",
      register: "Register",
      registering: "Registering...",
      haveAccount: "Already have an account?",
      login: "Login",
      switchRole: "Are you a patient?",
      switchLink: "Patient Registration",
      backHome: "Back to home"
    }
  };

  const t = content[locale as keyof typeof content] || content.en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!tier) {
      setError(locale === 'fr' ? 'Veuillez sélectionner une catégorie' : 'Please select a category');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(locale === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match');
      setIsLoading(false);
      return;
    }
    
    try {
      const payload: any = {
        tier,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        specialty: formData.specialty || undefined,
        consultationFee: formData.consultationFee ? parseFloat(formData.consultationFee) : undefined,
      };

      // Add tier-specific fields
      if (tier === 'TIER_1_DOCTOR' || tier === 'TIER_2_NURSE') {
        payload.licenseNumber = formData.licenseNumber;
      }
      if (tier === 'TIER_3_CERTIFIED_WORKER') {
        payload.licenseNumber = formData.licenseNumber || undefined;
      }
      if (tier === 'TIER_4_STUDENT') {
        payload.supervisorId = formData.supervisorId;
        payload.studentYear = parseInt(formData.studentYear);
      }

      const response = await fetch('/api/auth/register/provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push(`/${locale}/auth/login`);
      } else {
        const errorData = await response.json();
        if (errorData.details) {
          const errorMessages = Object.entries(errorData.details)
            .map(([field, messages]: [string, any]) => `${field}: ${messages.join(', ')}`)
            .join('\n');
          setError(errorMessages);
        } else {
          setError(errorData.error || errorData.message || 'Registration failed');
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const requiresLicense = tier === 'TIER_1_DOCTOR' || tier === 'TIER_2_NURSE';
  const requiresSupervisor = tier === 'TIER_4_STUDENT';
  const showSpecialty = tier && tier !== 'TIER_5_VOLUNTEER';

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center justify-center space-x-3 mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-xl blur opacity-75"></div>
            <div className="relative w-12 h-12 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center rotate-45">
              <svg className="w-7 h-7 text-white -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-gray-800">FlowMed</span>
            <span className="block text-xs text-gray-500">Cameroon</span>
          </div>
        </Link>

        {/* Registration Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {t.title}
            </h2>
            <p className="text-gray-600">
              {t.subtitle}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm whitespace-pre-line">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tier Selection */}
            <div>
              <label htmlFor="tier" className="block text-sm font-medium text-gray-700 mb-2">
                {t.selectTier} *
              </label>
              <select
                id="tier"
                value={tier}
                onChange={(e) => setTier(e.target.value as ProviderTier)}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              >
                <option value="">{locale === 'fr' ? 'Sélectionnez...' : 'Select...'}</option>
                {Object.entries(t.tiers).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.firstName} *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.lastName} *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t.email} *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder="vous@exemple.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                {t.phone}
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder="+237 6XX XXX XXX"
              />
            </div>

            {/* Tier-specific fields */}
            {showSpecialty && (
              <div>
                <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.specialty} {tier === 'TIER_1_DOCTOR' && '*'}
                </label>
                <input
                  id="specialty"
                  name="specialty"
                  type="text"
                  required={tier === 'TIER_1_DOCTOR'}
                  value={formData.specialty}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            {requiresLicense && (
              <div>
                <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.licenseNumber} *
                </label>
                <input
                  id="licenseNumber"
                  name="licenseNumber"
                  type="text"
                  required
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            {tier === 'TIER_3_CERTIFIED_WORKER' && (
              <div>
                <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.licenseNumber}
                </label>
                <input
                  id="licenseNumber"
                  name="licenseNumber"
                  type="text"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            {requiresSupervisor && (
              <>
                <div>
                  <label htmlFor="supervisorId" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.supervisorId} *
                  </label>
                  <input
                    id="supervisorId"
                    name="supervisorId"
                    type="text"
                    required
                    value={formData.supervisorId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="studentYear" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.studentYear} *
                  </label>
                  <input
                    id="studentYear"
                    name="studentYear"
                    type="number"
                    min="1"
                    max="7"
                    required
                    value={formData.studentYear}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
              </>
            )}

            {tier && tier !== 'TIER_5_VOLUNTEER' && (
              <div>
                <label htmlFor="consultationFee" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.consultationFee}
                </label>
                <input
                  id="consultationFee"
                  name="consultationFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.consultationFee}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  placeholder="5000"
                />
              </div>
            )}

            {/* Password fields */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t.password} *
              </label>
              <p className="text-xs text-gray-500 mb-2">{t.passwordHint}</p>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                {t.confirmPassword} *
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? t.registering : t.register}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <p className="text-gray-600 text-sm">
              {t.haveAccount}{' '}
              <Link
                href={`/${locale}/auth/login`}
                className="font-semibold text-teal-600 hover:text-teal-700 transition-colors"
              >
                {t.login}
              </Link>
            </p>
            <p className="text-gray-600 text-sm">
              {t.switchRole}{' '}
              <Link
                href={`/${locale}/auth/register?role=patient`}
                className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                {t.switchLink}
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link
            href={`/${locale}`}
            className="text-gray-600 hover:text-gray-900 transition-colors text-sm inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
