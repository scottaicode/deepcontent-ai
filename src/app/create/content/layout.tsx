import { Metadata } from 'next'
import StyleDropdownFix from '@/components/StyleDropdownFix'
import ProductionModeFixes from '@/components/ProductionModeFixes'

export const metadata: Metadata = {
  title: 'Create Content | DeepContent',
  description: 'Generate high-quality content using AI based on research',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3B82F6'
}

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <StyleDropdownFix />
      <ProductionModeFixes />
      {children}
    </>
  );
} 