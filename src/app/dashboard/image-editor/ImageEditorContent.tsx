'use client';

import { useLanguage } from '@/app/components/LanguageProvider';

export default function ImageEditorContent() {
  const { t, locale } = useLanguage();
  
  // Determine the messages based on language
  const title = locale === 'es' ? 'Editor de Imágenes AI' : 'AI Image Editor';
  const comingSoonText = locale === 'es' ? '¡Próximamente!' : 'Coming Soon!';
  const messageText = locale === 'es' 
    ? 'Estamos trabajando para brindarte nuestro avanzado Editor de Imágenes AI. Esta función estará disponible en un futuro próximo.'
    : 'We\'re working hard to bring you our advanced AI Image Editor. This feature will be available in the near future.';

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