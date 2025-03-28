import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

export default function CatchAllPage() {
  const router = useRouter();
  const { path } = router.query;

  useEffect(() => {
    if (path && path[0] === 'create') {
      // Special handling for create route
      router.push('/create');
    } else {
      // Redirect to home after 3 seconds for other routes
      const redirectTimer = setTimeout(() => {
        router.push('/');
      }, 3000);

      return () => clearTimeout(redirectTimer);
    }
  }, [path, router]);

  return (
    <>
      <Head>
        <title>Page Not Found - DeepContent AI</title>
      </Head>
      <div className="flex flex-col items-center justify-center min-h-screen p-5 text-center">
        <h1 className="text-6xl font-bold mb-6">404</h1>
        <h2 className="text-3xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-lg mb-8 max-w-md">
          The page you are looking for does not exist or might have been moved.
        </p>
        <p className="text-sm mb-8">Redirecting to the homepage in a few seconds...</p>
        <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Return to Home
        </Link>
      </div>
    </>
  );
} 