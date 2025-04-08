import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Text-to-Image Generator - Coming Soon',
  description: 'Create brand new images from text descriptions - Coming Soon',
};

// Import the placeholder component
import TextToImageComingSoon from './TextToImageComingSoon';

export default function TextToImagePage() {
  // Render the placeholder component
  return <TextToImageComingSoon />;
} 