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

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        throw new Error('Failed to parse API response. Please try again later.');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.image) {
        throw new Error('No image data returned from API');
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