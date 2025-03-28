import React from 'react';
import Link from 'next/link';

function Error({ statusCode, err }) {
  // Log error information
  React.useEffect(() => {
    console.error('[DEBUG] Error page loaded with status:', statusCode);
    if (err) {
      console.error('[DEBUG] Error details:', err);
    }
  }, [statusCode, err]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-5 text-center">
      <h1 className="text-4xl font-bold mb-6">Something went wrong</h1>
      <p className="text-lg mb-8 max-w-md">
        {statusCode
          ? `An error ${statusCode} occurred on the server`
          : 'An error occurred on the client'}
      </p>
      <div className="mb-8 p-4 bg-gray-100 rounded-lg text-left max-w-md">
        <h3 className="text-md font-semibold mb-2">Debug Information:</h3>
        <p className="text-sm mb-2"><strong>Status:</strong> {statusCode || 'Unknown'}</p>
        {process.env.NODE_ENV !== 'production' && err && (
          <p className="text-sm overflow-auto max-h-64">
            <strong>Error:</strong> {JSON.stringify(err, null, 2)}
          </p>
        )}
      </div>
      <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        Return to Home
      </Link>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode, err };
};

export default Error; 