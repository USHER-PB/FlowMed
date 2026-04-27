export default function DebugPage({ params }: { params: { locale: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-green-600 mb-6">✅ Debug Page Works!</h1>
        
        <div className="space-y-4">
          <div className="bg-gray-100 p-4 rounded">
            <p className="font-semibold text-gray-700">Current Locale:</p>
            <p className="text-2xl text-teal-600">{params.locale}</p>
          </div>
          
          <div className="bg-gray-100 p-4 rounded">
            <p className="font-semibold text-gray-700">Expected Locales:</p>
            <p className="text-gray-600">en, fr</p>
          </div>
          
          <div className="mt-6 space-y-2">
            <p className="font-semibold text-gray-700">Test these URLs:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><code className="bg-gray-200 px-2 py-1 rounded">/fr/debug</code></li>
              <li><code className="bg-gray-200 px-2 py-1 rounded">/en/debug</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}