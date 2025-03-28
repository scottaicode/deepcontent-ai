export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          DeepContent AI
        </h1>
        <p className="mt-6 text-xl text-gray-600 dark:text-gray-300">
          An AI-powered content creation and management platform
        </p>
        <div className="mt-10 flex justify-center">
          <a 
            href="/create"
            className="rounded-md bg-indigo-600 px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
}