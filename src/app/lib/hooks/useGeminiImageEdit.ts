'use client';

import { useState } from 'react';

interface UseGeminiImageEditProps {
  language?: 'en' | 'es';
}

interface ImageEditResponse {
  image?: string;
  textResponse?: string;
  prompt?: string;
  modelUsed?: string;
  error?: string;
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

  const editImage = async (
    sourceImage: string,
    targetImage: string | null,
    prompt: string
  ): Promise<ImageEditResponse> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Validate source image
      if (!sourceImage) {
        throw new Error(language === 'es' 
          ? 'Se requiere una imagen de origen' 
          : 'Source image is required');
      }
      
      // Basic validation for base64 format
      if (!/^[A-Za-z0-9+/=]+$/.test(sourceImage)) {
        throw new Error(language === 'es'
          ? 'La imagen de origen no está en formato válido base64'
          : 'Source image is not in valid base64 format');
      }
      
      console.log("Sending API request to /api/gemini/edit-image with image and prompt");
      console.log(`Source image size: ${sourceImage.length} chars`);
      if (targetImage) {
        console.log(`Target image size: ${targetImage.length} chars`);
      }

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

      if (!response.ok) {
        throw new Error(data.error || 'Failed to edit image');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        image: data.image,
        textResponse: data.textResponse,
        prompt: data.prompt,
        modelUsed: data.modelUsed,
        apiLimited: data.apiLimited
      };
    } catch (err: any) {
      console.error('Error in useGeminiImageEdit hook:', err);
      const errorMessage = language === 'es'
        ? `Error al editar la imagen: ${err.message || 'Error desconocido'}`
        : `Error editing image: ${err.message || 'Unknown error'}`;
      setError(errorMessage);
      
      // Return a structured error response
      return {
        error: errorMessage,
        apiLimited: err.message?.includes('API key') || 
                   err.message?.includes('permission') ||
                   err.message?.includes('access') ||
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