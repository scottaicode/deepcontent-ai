import { Metadata } from 'next';
import ImageEditorContent from './ImageEditorContent';

export const metadata: Metadata = {
  title: 'AI Image Editor - Coming Soon',
  description: 'Edit and transform images using AI - Coming Soon',
};

export default function ImageEditorPage() {
  return <ImageEditorContent />;
} 