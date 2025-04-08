'use client'; // Add use client because we use hooks like useLanguage

import { Metadata } from 'next';
import { useLanguage } from '@/app/components/LanguageProvider'; // Needed for translated text

export const metadata: Metadata = {
  title: 'AI Text-to-Image Generator',
  description: 'Create brand new images from text descriptions',
};

// Placeholder component
function ComingSoonPlaceholder() {
  const { t, locale } = useLanguage();

  const title = locale === 'es' ? 'Generador de Texto a Imagen AI' : 'AI Text-to-Image Generator';
  const comingSoonText = locale === 'es' ? '¡Próximamente!' : 'Coming Soon!';
  const messageText = locale === 'es' 
    ? 'Estamos trabajando en esta función. Estará disponible pronto.'
    : 'We\'re working on this feature. It will be available soon.';

  return (
    <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-3xl font-bold mb-6 text-center">
        {title}
      </h1>
      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg max-w-2xl mx-auto">
        <div className="flex items-center">
          <div className="mr-4">
            <svg className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-medium text-blue-800 mb-2">{comingSoonText}</p>
            <p className="text-blue-700">
              {messageText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TextToImagePage() {
  return <ComingSoonPlaceholder />;
} 