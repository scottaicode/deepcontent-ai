import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* Include a debugging script for route issues */}
          {process.env.NODE_ENV !== 'production' && (
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  (function() {
                    window.routeDebug = true;
                    console.log('[DEBUG] Document initialized');
                    const originalPushState = history.pushState;
                    history.pushState = function() {
                      console.log('[DEBUG] pushState:', arguments);
                      return originalPushState.apply(this, arguments);
                    };
                    window.addEventListener('load', function() {
                      console.log('[DEBUG] Window loaded. Current pathname:', window.location.pathname);
                    });
                  })();
                `,
              }}
            />
          )}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument; 