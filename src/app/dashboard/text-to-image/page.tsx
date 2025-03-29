import { Metadata } from 'next';
import TextToImageGenerator from '@/components/TextToImageGenerator';

export const metadata: Metadata = {
  title: 'AI Text-to-Image Generator',
  description: 'Create brand new images from text descriptions',
};

export default function TextToImagePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">
        AI Text-to-Image Generator
      </h1>
      <p className="text-center mb-8 text-gray-600 max-w-2xl mx-auto">
        Create brand new images from your text descriptions. 
        Unlike the Image Editor which modifies existing images, this tool creates entirely new images from scratch.
      </p>
      
      <TextToImageGenerator />
    </div>
  );
} 