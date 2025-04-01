import { Metadata } from 'next';
import TextToImageContent from './TextToImageContent';

export const metadata: Metadata = {
  title: 'AI Text-to-Image Generator - Coming Soon',
  description: 'Create brand new images from text descriptions - Coming Soon',
};

export default function TextToImagePage() {
  return <TextToImageContent />;
} 