"use client";

import React from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-5 text-center">
      <h1 className="text-3xl font-bold mb-6">Something went wrong!</h1>
      <p className="text-lg mb-8 max-w-md">
        We apologize for the inconvenience. An error occurred while trying to display this page.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
        <Link href="/" className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
          Return to Home
        </Link>
      </div>
    </div>
  );
} 