import { Metadata } from 'next';
import ImageEditorContent from './ImageEditorContent';
import AppShell from '@/components/AppShell';
import ImageEditor from '@/components/ImageEditor';
import ProductionModeFixes from '@/components/ProductionModeFixes';

export const metadata: Metadata = {
  title: 'AI Image Editor',
  description: 'Edit and transform images using AI',
};

export default function ImageEditorPage() {
  return (
    <AppShell hideHeader={true}>
      <ProductionModeFixes />
      <div className="container mx-auto px-4 py-8">
        <ImageEditor />
      </div>
    </AppShell>
  );
} 