import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Content Generation - DeepContent',
  description: 'Generate AI-powered content with your chosen persona',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3B82F6'
}

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
} 