import { Metadata } from 'next';
import AppShell from '@/components/AppShell';
import TextToImageGenerator from '@/components/TextToImageGenerator';
import ProductionModeFixes from '@/components/ProductionModeFixes';

export const metadata: Metadata = {
  title: 'AI Text-to-Image Generator',
  description: 'Create brand new images from text descriptions',
};

export default function TextToImagePage() {
  return (
    <AppShell hideHeader={true}>
      <ProductionModeFixes />
      <div className="container mx-auto px-4 py-8">
        <TextToImageGenerator />
      </div>
    </AppShell>
  );
} 