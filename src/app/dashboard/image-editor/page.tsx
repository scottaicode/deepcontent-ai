import { Metadata } from 'next';
import ImageEditor from '@/components/ImageEditor';

export const metadata: Metadata = {
  title: 'AI Image Editor - Gemini 2.0 Flash',
  description: 'Edit and transform images using AI',
};

export default function ImageEditorPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">
        AI Image Editor
      </h1>
      <p className="text-center mb-8 text-gray-600 max-w-2xl mx-auto">
        Edit your images using Gemini 2.0 Flash AI technology. Upload one or more images and 
        specify how you want them edited or combined.
      </p>
      
      <ImageEditor />
    </div>
  );
} 