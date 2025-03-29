'use client';

import { useState } from 'react';

interface UseGeminiImageEditProps {
  language?: 'en' | 'es';
}

interface ImageEditResponse {
  image: string;
  textResponse?: string;
  prompt?: string;
  modelUsed?: string;
  apiLimited?: boolean;
}

interface UseGeminiImageEditReturn {
  editImage: (sourceImage: string, targetImage: string | null, prompt: string) => Promise<ImageEditResponse>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useGeminiImageEdit({ language = 'en' }: UseGeminiImageEditProps = {}): UseGeminiImageEditReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editImage = async (sourceImage: string, targetImage: string | null, prompt: string): Promise<ImageEditResponse> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("Sending API request to /api/gemini/edit-image with image and prompt");
      
      const response = await fetch('/api/gemini/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sourceImage, 
          targetImage, 
          prompt,
          language
        }),
      });

      const data = await response.json();
      
      console.log("API response received", { 
        status: response.status, 
        hasError: !!data.error, 
        hasImage: !!data.image 
      });

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.image) {
        throw new Error('No image received from API');
      }

      return {
        image: data.image,
        textResponse: data.textResponse,
        prompt: data.prompt,
        modelUsed: data.modelUsed,
        apiLimited: data.apiLimited
      };
    } catch (err: any) {
      console.error("Error in useGeminiImageEdit:", err);
      
      const errorMessage = language === 'es'
        ? 'Error al editar la imagen: ' + (err.message || 'Error desconocido')
        : 'Error editing image: ' + (err.message || 'Unknown error');
      
      setError(errorMessage);
      
      // Return the source image with error info
      return {
        image: `data:image/jpeg;base64,${sourceImage}`,
        textResponse: errorMessage,
        apiLimited: err.message?.includes('permission') || 
                   err.message?.includes('access') || 
                   err.message?.includes('API key') ||
                   err.message?.includes('limit')
      };
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    editImage,
    isLoading,
    error,
    clearError,
  };
} 