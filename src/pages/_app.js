import React, { useEffect } from 'react';
import '../app/globals.css';

function MyApp({ Component, pageProps, router }) {
  useEffect(() => {
    console.log('[DEBUG] _app.js mounted');
    console.log('[DEBUG] Current route:', router.pathname);

    // Add debugging for route changes
    const handleRouteChange = (url) => {
      console.log('[DEBUG] Route changed to:', url);
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
      console.log('[DEBUG] _app.js unmounted');
    };
  }, [router]);

  return (
    <>
      {/* Debug info */}
      {process.env.NODE_ENV !== 'production' && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '3px 6px',
            fontSize: '10px',
            zIndex: 1000,
          }}
        >
          Route: {router.pathname}
        </div>
      )}
      <Component {...pageProps} />
    </>
  );
}

export default MyApp; 