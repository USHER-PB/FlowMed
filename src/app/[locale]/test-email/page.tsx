'use client';

import { useState } from 'react';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [locale, setLocale] = useState<'en' | 'fr'>('en');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ 
        success: false, 
        error: 'Failed to send request',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Test Resend Email Service
          </h1>
          <p className="text-gray-600 mb-8">
            Send a test email to verify your Resend configuration is working
          </p>

          <div className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Your Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 bg-white"
              />
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Language
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="en"
                    checked={locale === 'en'}
                    onChange={(e) => setLocale(e.target.value as 'en' | 'fr')}
                    className="mr-2"
                  />
                  <span className="text-gray-700">English</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="fr"
                    checked={locale === 'fr'}
                    onChange={(e) => setLocale(e.target.value as 'en' | 'fr')}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Français</span>
                </label>
              </div>
            </div>

            {/* Send Button */}
            <button
              onClick={handleTest}
              disabled={!email || loading}
              className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending...' : 'Send Test Email'}
            </button>

            {/* Result Display */}
            {result && (
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h3 className={`font-semibold mb-2 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.success ? '✓ Success!' : '✗ Error'}
                </h3>
                <p className={result.success ? 'text-green-700' : 'text-red-700'}>
                  {result.message || result.error}
                </p>
                {result.details && (
                  <pre className="mt-2 text-xs overflow-auto p-2 bg-white rounded">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">📧 What to expect:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Check your inbox (and spam folder)</li>
              <li>• Email will come from FlowMed</li>
              <li>• Subject: "Verify Your Email - FlowMed"</li>
              <li>• If successful, you'll receive the email within 1-2 minutes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
