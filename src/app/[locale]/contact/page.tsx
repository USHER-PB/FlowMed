'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function ContactPage() {
  const params = useParams();
  const locale = params.locale as string;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const content = {
    en: {
      title: 'Contact Us',
      subtitle: 'Have a question? Send us a message and we\'ll get back to you soon.',
      name: 'Your Name',
      email: 'Your Email',
      subject: 'Subject',
      message: 'Message',
      send: 'Send Message',
      sending: 'Sending...',
      successTitle: 'Message Sent!',
      successMessage: 'Thank you for contacting us. We\'ll respond to your email shortly.',
      errorTitle: 'Error',
      namePlaceholder: 'John Doe',
      emailPlaceholder: 'your-email@example.com',
      subjectPlaceholder: 'How can we help you?',
      messagePlaceholder: 'Tell us more about your question or concern...',
    },
    fr: {
      title: 'Contactez-nous',
      subtitle: 'Vous avez une question? Envoyez-nous un message et nous vous répondrons bientôt.',
      name: 'Votre Nom',
      email: 'Votre Email',
      subject: 'Sujet',
      message: 'Message',
      send: 'Envoyer le Message',
      sending: 'Envoi...',
      successTitle: 'Message Envoyé!',
      successMessage: 'Merci de nous avoir contactés. Nous répondrons à votre email sous peu.',
      errorTitle: 'Erreur',
      namePlaceholder: 'Jean Dupont',
      emailPlaceholder: 'votre-email@exemple.com',
      subjectPlaceholder: 'Comment pouvons-nous vous aider?',
      messagePlaceholder: 'Parlez-nous de votre question ou préoccupation...',
    },
  };

  const t = content[locale as 'en' | 'fr'] || content.en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setResult({ success: true, message: t.successMessage });
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setResult({ success: false, message: data.error || 'Failed to send message' });
      }
    } catch (error) {
      setResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t.title}
          </h1>
          <p className="text-lg text-gray-600">
            {t.subtitle}
          </p>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                {t.name}
              </label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t.namePlaceholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 bg-white"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                {t.email}
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t.emailPlaceholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 bg-white"
              />
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                {t.subject}
              </label>
              <input
                id="subject"
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder={t.subjectPlaceholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 bg-white"
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                {t.message}
              </label>
              <textarea
                id="message"
                required
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={t.messagePlaceholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 bg-white resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? t.sending : t.send}
            </button>
          </form>

          {/* Result Message */}
          {result && (
            <div className={`mt-6 p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className={`font-semibold mb-1 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? '✓ ' + t.successTitle : '✗ ' + t.errorTitle}
              </h3>
              <p className={result.success ? 'text-green-700' : 'text-red-700'}>
                {result.message}
              </p>
            </div>
          )}
        </div>

        {/* Contact Info */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            📧 You can also email us directly at:{' '}
            <a href="mailto:support@flowmed.cm" className="text-teal-600 hover:text-teal-700 font-semibold">
              support@flowmed.cm
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
