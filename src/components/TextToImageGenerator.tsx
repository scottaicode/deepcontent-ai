'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useGeminiImage } from '@/app/lib/hooks/useGeminiImage';
import { IconRefresh, IconDownload, IconPhoto } from '@tabler/icons-react';

interface TextToImageGeneratorProps {
  initialPrompt?: string;
  onImageGenerated?: (imageUrl: string, prompt: string) => void;
  className?: string;
}

export default function TextToImageGenerator({
  initialPrompt = '',
  onImageGenerated,
  className = '',
}: TextToImageGeneratorProps) {
  const { t } = useTranslation();
  const { generateImage, isLoading, error, clearError } = useGeminiImage();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  useEffect(() => {
    if (initialPrompt && !prompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt, prompt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    try {
      clearError();
      const imageUrl = await generateImage(prompt);
      setGeneratedImage(imageUrl);
      
      if (onImageGenerated) {
        onImageGenerated(imageUrl, prompt);
      }
    } catch (err) {
      console.error('Error in image generation:', err);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'generated-image.png';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info box explaining the feature */}
        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700 mb-4">
          <p className="font-medium">AI Text-to-Image Generator</p>
          <p>Enter a text description and our AI will generate an image based on your prompt.</p>
          <p className="mt-2 text-xs text-blue-800">
            <span className="font-medium">Note:</span> Image generation requires access to advanced AI capabilities.
          </p>
          <p className="mt-2 text-xs text-blue-900">
            <span className="font-medium">Best practices:</span>
          </p>
          <ul className="list-disc pl-5 text-xs text-blue-900">
            <li>Be specific and detailed in your descriptions</li>
            <li>Include information about style, lighting, and composition</li>
            <li>Mention what should be in the foreground and background</li>
            <li>Example: "A cozy rural cottage with a thatched roof surrounded by wildflowers, morning light, detailed, photorealistic"</li>
          </ul>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
            
            {/* Add info box about experimental model when relevant errors occur */}
            {(error.toLowerCase().includes('not found') || 
              error.toLowerCase().includes('rate limit') || 
              error.toLowerCase().includes('quota exceed') || 
              error.toLowerCase().includes('permission')) && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                <p className="font-medium text-amber-800">About Gemini Image Generation:</p>
                <ul className="list-disc list-inside text-amber-700 mt-2">
                  <li>The image generation feature uses the experimental model <code className="bg-white px-1 rounded">gemini-2.0-flash-exp-image-generation</code></li>
                  <li>This model requires a paid tier Gemini API key</li>
                  <li>Your account must have experimental model access enabled</li>
                  <li>The API has strict rate limits even with a valid paid account</li>
                  <li>Check the .env.local file to ensure your API key is correctly configured</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Prompt Input */}
        <div className="space-y-2">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
            Image Description
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-32 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Describe the image you want to generate in detail (e.g., 'A rustic country cottage with a thatched roof, surrounded by a garden of wildflowers, early morning light, mist in the background')"
            disabled={isLoading}
          />
        </div>

        {/* Generate Button */}
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className={`w-full py-3 px-6 rounded-lg text-white font-medium transition-all flex items-center justify-center space-x-2
            ${
              isLoading || !prompt.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
        >
          {isLoading ? (
            <>
              <IconRefresh className="w-5 h-5 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <IconPhoto className="w-5 h-5" />
              <span>Generate Image</span>
            </>
          )}
        </button>

        {/* Generated Image Display */}
        {generatedImage && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium">Generated Result</h3>
            </div>
            
            <div className="relative">
              <div className="aspect-square w-full bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={generatedImage}
                  alt="AI Generated Image"
                  className="object-contain w-full h-full"
                />
                <button
                  onClick={handleDownload}
                  className="absolute bottom-3 right-3 bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors"
                  title="Download"
                >
                  <IconDownload className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
} 