'use client';

import { useState } from 'react';

interface UseGeminiImageProps {
  language?: 'en' | 'es';
}

interface UseGeminiImageReturn {
  generateImage: (prompt: string) => Promise<string>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useGeminiImage({ language = 'en' }: UseGeminiImageProps = {}): UseGeminiImageReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async (prompt: string): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, language }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      return data.image;
    } catch (err: any) {
      const errorMessage = language === 'es'
        ? 'Error al generar la imagen: ' + (err.message || 'Error desconocido')
        : 'Error generating image: ' + (err.message || 'Unknown error');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    generateImage,
    isLoading,
    error,
    clearError,
  };
} 