import { Metadata } from 'next';
import GoogleAdsCreator from './page';

export const metadata: Metadata = {
  title: 'Google Ads Creator',
  description: 'Create optimized Google Ads campaigns with AI assistance'
};

export default function GoogleAdsLayout() {
  return <GoogleAdsCreator />;
} 