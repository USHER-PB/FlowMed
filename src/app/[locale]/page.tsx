'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Home() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactForm),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setContactForm({ name: '', email: '', phone: '', message: '' });
      } else {
        setSubmitStatus('error');
      }
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const content = {
    fr: {
      nav: {
        home: "Accueil",
        about: "À Propos",
        contact: "Contact"
      },
      hero: {
        welcome: "Bienvenue sur",
        title: "FlowMed Cameroun",
        tagline: "Votre santé, notre priorité",
        description: "Connectez-vous avec des médecins certifiés et gérez vos consultations médicales en toute sécurité. Une plateforme moderne pour faciliter l'accès aux soins de santé au Cameroun.",
        cta: "Commencer"
      },
      about: {
        title: "À Propos de FlowMed",
        subtitle: "Notre Mission",
        description: "FlowMed est une plateforme innovante qui connecte les patients avec des professionnels de santé certifiés au Cameroun. Nous facilitons la prise de rendez-vous, les consultations en ligne et la gestion sécurisée des dossiers médicaux.",
        features: [
          "Médecins certifiés et vérifiés",
          "Consultations en ligne sécurisées",
          "Gestion de dossiers médicaux",
          "File d'attente intelligente"
        ]
      },
      patient: {
        title: "Je suis Patient",
        desc: "Prendre rendez-vous avec un médecin"
      },
      provider: {
        title: "Je suis Médecin",
        desc: "Gérer mes consultations et patients"
      },
      login: "Connexion",
      alreadyAccount: "Vous avez déjà un compte ?",
      footer: "© 2026 FlowMed Cameroun - Plateforme médicale sécurisée",
      contact: {
        title: "Contactez-nous",
        subtitle: "Nous sommes là pour vous aider",
        description: "Vous avez des questions ou besoin d'assistance ? N'hésitez pas à nous contacter. Notre équipe est disponible 24/7 pour vous accompagner.",
        form: {
          name: "Nom complet",
          email: "Adresse e-mail",
          phone: "Numéro de téléphone",
          message: "Message",
          submit: "Envoyer",
          submitting: "Envoi en cours...",
          success: "Message envoyé avec succès !",
          error: "Une erreur s'est produite. Veuillez réessayer."
        },
        info: {
          address: "Douala, Cameroun",
          phone: "+237 690 290 961 / +237 677 317 976",
          email: "ushertchankoumi9@gmail.com",
          hours: "24h/24, 7j/7"
        }
      }
    },
    en: {
      nav: {
        home: "Home",
        about: "About",
        contact: "Contact"
      },
      hero: {
        welcome: "Welcome to",
        title: "FlowMed Cameroon",
        tagline: "Your health, our priority",
        description: "Connect with certified doctors and manage your medical consultations securely. A modern platform to facilitate access to healthcare in Cameroon.",
        cta: "Get Started"
      },
      about: {
        title: "About FlowMed",
        subtitle: "Our Mission",
        description: "FlowMed is an innovative platform that connects patients with certified healthcare professionals in Cameroon. We facilitate appointment booking, online consultations, and secure medical record management.",
        features: [
          "Certified and verified doctors",
          "Secure online consultations",
          "Medical records management",
          "Smart queue system"
        ]
      },
      patient: {
        title: "I'm a Patient",
        desc: "Book an appointment with a doctor"
      },
      provider: {
        title: "I'm a Doctor",
        desc: "Manage my consultations and patients"
      },
      login: "Login",
      alreadyAccount: "Already have an account?",
      footer: "© 2026 FlowMed Cameroon - Secure medical platform",
      contact: {
        title: "Contact Us",
        subtitle: "We're here to help you",
        description: "Have questions or need assistance? Don't hesitate to reach out. Our team is available 24/7 to support you.",
        form: {
          name: "Full Name",
          email: "Email Address",
          phone: "Phone Number",
          message: "Message",
          submit: "Send Message",
          submitting: "Sending...",
          success: "Message sent successfully!",
          error: "An error occurred. Please try again."
        },
        info: {
          address: "Douala, Cameroon",
          phone: "+237 690 290 961 / +237 677 317 976",
          email: "ushertchankoumi9@gmail.com",
          hours: "24/7 Available"
        }
      }
    }
  };

  const t = content[locale as keyof typeof content] || content.en;

  const switchLanguage = (newLocale: string) => {
    router.push(`/${newLocale}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-emerald-900 to-teal-950">
      {/* Diamond Pattern Background */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="diamonds" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M50 0 L100 50 L50 100 L0 50 Z" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
              <path d="M50 25 L75 50 L50 75 L25 50 Z" fill="rgba(255,255,255,0.05)"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diamonds)"/>
        </svg>
      </div>
      
      {/* Floating Diamond Accents */}
      <div className="absolute top-20 left-10 w-16 h-16 border-2 border-teal-400/30 rotate-45 animate-pulse"></div>
      <div className="absolute top-40 right-20 w-12 h-12 border-2 border-emerald-400/20 rotate-45"></div>
      <div className="absolute bottom-32 left-1/4 w-20 h-20 border border-teal-300/20 rotate-45"></div>
      <div className="absolute bottom-20 right-1/3 w-10 h-10 bg-teal-400/10 rotate-45"></div>

      {/* Top Navigation Bar */}
      <nav className="relative z-50 bg-teal-950/50 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Brand */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-xl blur opacity-75"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center rotate-45">
                  <svg className="w-7 h-7 text-white -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">FlowMed</h1>
                <p className="text-xs text-teal-300/70">Cameroon</p>
              </div>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#home" className="text-teal-100 hover:text-white transition-colors">{t.nav.home}</a>
              <a href="#about" className="text-teal-100 hover:text-white transition-colors">{t.nav.about}</a>
              <a href="#contact" className="text-teal-100 hover:text-white transition-colors">{t.nav.contact}</a>
            </div>

            {/* Right Side - Language & Login */}
            <div className="flex items-center gap-4">
              {/* Language Switcher */}
              <div className="flex gap-2 bg-white/5 rounded-lg p-1 border border-white/10">
                <button
                  onClick={() => switchLanguage('fr')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    locale === 'fr'
                      ? 'bg-teal-600 text-white'
                      : 'text-teal-200 hover:text-white'
                  }`}
                >
                  FR
                </button>
                <button
                  onClick={() => switchLanguage('en')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    locale === 'en'
                      ? 'bg-teal-600 text-white'
                      : 'text-teal-200 hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>

              <Link
                href={`/${locale}/auth/login`}
                className="px-5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg font-medium transition-all border border-white/20 text-white"
              >
                {t.login}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative z-10 py-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
            
            {/* Left Side - Hero Content */}
            <div className="space-y-8">
              <div>
                <p className="text-teal-300/70 text-sm mb-3 uppercase tracking-wider">{t.hero.welcome}</p>
                <h2 className="text-6xl lg:text-7xl font-bold mb-4 leading-tight">
                  <span className="bg-gradient-to-r from-white via-teal-100 to-emerald-100 bg-clip-text text-transparent">
                    {t.hero.title}
                  </span>
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-teal-400 to-emerald-400 mb-6"></div>
                <p className="text-3xl text-teal-50 font-semibold mb-6">{t.hero.tagline}</p>
                <p className="text-teal-200/80 text-lg leading-relaxed">
                  {t.hero.description}
                </p>
              </div>
            </div>

            {/* Right Side - Illustration/Image Placeholder */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500/30 to-emerald-500/30 rounded-3xl blur-3xl"></div>
              <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-12 flex items-center justify-center min-h-[400px]">
                {/* Medical Illustration SVG */}
                <svg className="w-full h-full max-w-md text-teal-300/30" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5"/>
                  <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="2"/>
                  <path d="M100 40 L100 160 M40 100 L160 100" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  <circle cx="100" cy="100" r="15" fill="currentColor"/>
                </svg>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative z-10 py-20 bg-teal-950/30">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h3 className="text-4xl font-bold text-white mb-4">{t.about.title}</h3>
              <p className="text-teal-300/80 text-xl">{t.about.subtitle}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-teal-100/80 text-lg leading-relaxed mb-6">
                  {t.about.description}
                </p>
                <ul className="space-y-3">
                  {t.about.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3 text-teal-200/80">
                      <div className="w-6 h-6 border-2 border-teal-400 rotate-45 flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 bg-teal-400 -rotate-45"></div>
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center">
                  <div className="text-4xl mb-2">👥</div>
                  <div className="text-3xl font-bold text-teal-300 mb-1">5,000+</div>
                  <div className="text-sm text-teal-200/70">{locale === 'fr' ? 'Patients' : 'Patients'}</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center">
                  <div className="text-4xl mb-2">⚕️</div>
                  <div className="text-3xl font-bold text-emerald-300 mb-1">500+</div>
                  <div className="text-sm text-teal-200/70">{locale === 'fr' ? 'Médecins' : 'Doctors'}</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center">
                  <div className="text-4xl mb-2">🏥</div>
                  <div className="text-3xl font-bold text-teal-300 mb-1">50+</div>
                  <div className="text-sm text-teal-200/70">{locale === 'fr' ? 'Centres' : 'Centers'}</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center">
                  <div className="text-4xl mb-2">🕐</div>
                  <div className="text-3xl font-bold text-emerald-300 mb-1">24/7</div>
                  <div className="text-sm text-teal-200/70">{locale === 'fr' ? 'Support' : 'Support'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Cards Section - Bottom */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h3 className="text-4xl font-bold text-white mb-4">
                {locale === 'fr' ? 'Commencez Maintenant' : 'Get Started Now'}
              </h3>
              <p className="text-teal-200/70 text-lg">
                {locale === 'fr' ? 'Choisissez votre profil pour continuer' : 'Choose your profile to continue'}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Patient Card */}
              <Link
                href={`/${locale}/auth/register?role=patient`}
                className="group relative block"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-all"></div>
                <div className="relative bg-gradient-to-br from-teal-600 to-emerald-600 rounded-2xl p-10 hover:scale-105 transition-all shadow-2xl border border-white/10">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-white/10 rounded-xl flex items-center justify-center text-5xl backdrop-blur-sm flex-shrink-0">
                      👤
                    </div>
                    <div className="flex-1">
                      <h4 className="text-3xl font-bold text-white mb-2">{t.patient.title}</h4>
                      <p className="text-teal-100/80 text-lg">{t.patient.desc}</p>
                    </div>
                    <svg className="w-8 h-8 text-white/50 group-hover:text-white group-hover:translate-x-2 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* Provider Card */}
              <Link
                href={`/${locale}/auth/register/provider`}
                className="group relative block"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-all"></div>
                <div className="relative bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-10 hover:scale-105 transition-all shadow-2xl border border-white/10">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-white/10 rounded-xl flex items-center justify-center text-5xl backdrop-blur-sm flex-shrink-0">
                      ⚕️
                    </div>
                    <div className="flex-1">
                      <h4 className="text-3xl font-bold text-white mb-2">{t.provider.title}</h4>
                      <p className="text-emerald-100/80 text-lg">{t.provider.desc}</p>
                    </div>
                    <svg className="w-8 h-8 text-white/50 group-hover:text-white group-hover:translate-x-2 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </Link>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <p className="text-teal-200/60 mb-4">{t.alreadyAccount}</p>
              <Link
                href={`/${locale}/auth/login`}
                className="inline-flex items-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl font-medium transition-all border border-white/20 text-white text-lg group"
              >
                {t.login}
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative z-10 py-20 bg-teal-950/30">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h3 className="text-4xl font-bold text-white mb-4">{t.contact.title}</h3>
              <p className="text-teal-300/80 text-xl">{t.contact.subtitle}</p>
              <p className="text-teal-200/70 mt-4 max-w-2xl mx-auto">{t.contact.description}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-teal-200 mb-2">{t.contact.form.name}</label>
                    <input
                      type="text"
                      id="name"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-teal-300/50 focus:outline-none focus:border-teal-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-teal-200 mb-2">{t.contact.form.email}</label>
                    <input
                      type="email"
                      id="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-teal-300/50 focus:outline-none focus:border-teal-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-teal-200 mb-2">{t.contact.form.phone}</label>
                    <input
                      type="tel"
                      id="phone"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-teal-300/50 focus:outline-none focus:border-teal-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-teal-200 mb-2">{t.contact.form.message}</label>
                    <textarea
                      id="message"
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-teal-300/50 focus:outline-none focus:border-teal-400 transition-colors resize-none"
                    />
                  </div>
                  
                  {submitStatus === 'success' && (
                    <div className="p-4 bg-emerald-500/20 border border-emerald-400/30 rounded-lg text-emerald-300">
                      {t.contact.form.success}
                    </div>
                  )}
                  {submitStatus === 'error' && (
                    <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-lg text-red-300">
                      {t.contact.form.error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 rounded-lg font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? t.contact.form.submitting : t.contact.form.submit}
                  </button>
                </form>
              </div>

              {/* Contact Info */}
              <div className="space-y-8">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{locale === 'fr' ? 'Adresse' : 'Address'}</h4>
                      <p className="text-teal-200/70">{t.contact.info.address}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{locale === 'fr' ? 'Téléphone' : 'Phone'}</h4>
                      <p className="text-teal-200/70">{t.contact.info.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{locale === 'fr' ? 'E-mail' : 'Email'}</h4>
                      <p className="text-teal-200/70">{t.contact.info.email}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{locale === 'fr' ? 'Disponibilité' : 'Availability'}</h4>
                      <p className="text-teal-200/70">{t.contact.info.hours}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-teal-950/50 backdrop-blur-md border-t border-white/10 py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-teal-200/70">{t.footer}</p>
        </div>
      </footer>
    </div>
  );
}
