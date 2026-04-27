export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-green-600 mb-4">✅ Routing Works!</h1>
        <p className="text-gray-600">
          If you can see this page, your Next.js internationalization is working correctly.
        </p>
        <div className="mt-6 space-y-2 text-sm text-gray-500">
          <p>Current URL should be: /fr/test or /en/test</p>
          <p>Try changing the locale in the URL</p>
        </div>
      </div>
    </div>
  );
}