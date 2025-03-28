import "./globals.css";
import type { Metadata } from "next";
import { headers } from 'next/headers';
import Header from "./components/Header";
import Footer from "./components/Footer";
import AIIndicator from "./components/AIIndicator";
import { LanguageProvider } from "./components/LanguageProvider";
import { TranslationManager } from "./components/TranslationManager";
import { ThemeProvider } from "./components/ThemeProvider";
import { ToastProvider } from "@/lib/contexts/ToastProvider";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import InfoBanner from "./components/InfoBanner";

// Load fonts
const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: '--font-plus-jakarta',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap'
});

export const metadata: Metadata = {
  title: "DeepContent - AI-Powered Content Research & Generation",
  description: "Create high-quality, research-backed content across multiple formats with the power of AI",
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#3B82F6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Try to get the language from the headers (set by middleware)
  const headersList = headers();
  const xLanguage = headersList.get('x-language') || 'en';
  
  return (
    <html lang={xLanguage} className="scroll-smooth">
      <head>
        <meta name="x-language" content={xLanguage} />
      </head>
      <body className={`${inter.variable} ${plusJakarta.variable} font-sans bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <LanguageProvider>
                <TranslationManager>
                  {/* Fixed AI indicator for transparency */}
                  <AIIndicator 
                    isActive={true} 
                    type="ready" 
                    position="bottom-right" 
                    showDetails={true}
                  />
                  
                  {/* Global Header */}
                  <Header />
                  
                  {/* Information Banner */}
                  <div className="pt-16 md:pt-20">
                    <InfoBanner />
                  </div>
                  
                  {/* Main Content */}
                  <main className="min-h-screen pt-0 relative z-0 overflow-hidden">
                    {children}
                  </main>
                  
                  {/* Global Footer */}
                  <Footer />
                  
                  {/* Background gradient effect */}
                  <div className="fixed inset-0 pointer-events-none z-[-1] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-50/20 via-transparent to-transparent dark:from-blue-900/10"></div>
                </TranslationManager>
              </LanguageProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
