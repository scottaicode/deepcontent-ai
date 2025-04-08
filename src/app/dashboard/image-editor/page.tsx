import { Metadata } from 'next';
import ImageEditor from '@/components/ImageEditor';

export const metadata: Metadata = {
  title: 'AI Image Editor',
  description: 'Edit and transform images using AI',
};

export default function ImageEditorPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ImageEditor />
    </div>
  );
} 