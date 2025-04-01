"use client";

import React from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import Link from 'next/link';

export default function HowItWorksPage() {
  const { t } = useTranslation();
  
  return (
    <div className="container mx-auto pt-8 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t('howItWorks.title', { defaultValue: 'How DeepContent Works' })}
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t('howItWorks.subtitle', { defaultValue: 'Get the most out of our AI-powered content creation platform with this guide' })}
          </p>
        </div>
        
        {/* Workflow Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {t('howItWorks.workflow.title', { defaultValue: 'The Content Creation Workflow' })}
          </h2>
          
          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">1</div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('howItWorks.step1.title', { defaultValue: 'Select Your Content Type & Platform' })}
                </h3>
                <p className="text-gray-600 mb-3">
                  {t('howItWorks.step1.description', { defaultValue: 'Begin by choosing the type of content you want to create and the platform where you\'ll share it. This helps our AI format your content appropriately.' })}
                </p>
                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                  <strong>{t('howItWorks.tip', { defaultValue: 'Tip:' })}</strong> {t('howItWorks.step1.tip', { defaultValue: 'Be specific about your platform (like Instagram or LinkedIn) to get better-optimized content recommendations.' })}
                </div>
              </div>
            </div>
            
            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">2</div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('howItWorks.step2.title', { defaultValue: 'Define Your Audience & Topic' })}
                </h3>
                <p className="text-gray-600 mb-3">
                  {t('howItWorks.step2.description', { defaultValue: 'Provide details about your target audience and the specific topic you want to address. The more specific you are, the more tailored your content will be.' })}
                </p>
                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                  <strong>{t('howItWorks.tip', { defaultValue: 'Tip:' })}</strong> {t('howItWorks.step2.tip', { defaultValue: 'Include your audience\'s pain points or interests to make your content more relevant to their needs.' })}
                </div>
              </div>
            </div>
            
            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">3</div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('howItWorks.step3.title', { defaultValue: 'Enhance With Analysis Tools' })}
                </h3>
                <p className="text-gray-600 mb-3">
                  {t('howItWorks.step3.description', { defaultValue: 'Optionally use our analysis tools to enrich your content creation process:' })}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 mb-3">
                  <li>{t('howItWorks.step3.youtubeTranscript', { defaultValue: 'YouTube Transcript Analysis: Analyze existing videos on your topic for insights' })}</li>
                  <li>{t('howItWorks.step3.imageAnalysis', { defaultValue: 'Image Analysis: Get Claude to analyze images related to your content for additional context' })}</li>
                  <li>{t('websiteAnalysis.title', { defaultValue: 'Website Analysis: Extract information from company websites to enhance your research' })}</li>
                </ul>
                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                  <strong>{t('howItWorks.tip', { defaultValue: 'Tip:' })}</strong> {t('howItWorks.step3.tip', { defaultValue: 'These analysis tools provide deeper insights and make your content more comprehensive and relevant.' })}
                </div>
              </div>
            </div>
            
            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">4</div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('howItWorks.step4.title', { defaultValue: 'Generate & Refine Content' })}
                </h3>
                <p className="text-gray-600 mb-3">
                  {t('howItWorks.step4.description', { defaultValue: 'Our AI will generate high-quality content based on your inputs. You can then refine it to match your exact needs:' })}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 mb-3">
                  <li>{t('howItWorks.step4.regenerate', { defaultValue: 'Regenerate content if the first version doesn\'t meet your needs' })}</li>
                  <li>{t('howItWorks.step4.adjust', { defaultValue: 'Adjust the AI style intensity for more or less personality' })}</li>
                  <li>{t('howItWorks.step4.export', { defaultValue: 'Export or copy the final content for immediate use' })}</li>
                </ul>
                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                  <strong>{t('howItWorks.tip', { defaultValue: 'Tip:' })}</strong> {t('howItWorks.step4.tip', { defaultValue: 'Try different AI personas (like AriaStar for a friendly tone or TechExpert for a more professional style) to match your brand voice.' })}
                </div>
              </div>
            </div>
            
            {/* Step 5 - New Visual Content Creation Section */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">5</div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Create Visual Content
                </h3>
                <p className="text-gray-600 mb-3">
                  Complement your text content with engaging visuals using our powerful image creation tools:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 mb-3">
                  <li>Image Editor: Edit and enhance images for your content with AI assistance</li>
                  <li>Text-to-Image: Generate custom images from text descriptions to illustrate your content</li>
                </ul>
                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                  <strong>Tip:</strong> Visual content significantly increases engagement. Use these tools to create images that perfectly complement your written content.
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Best Practices Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {t('howItWorks.bestPractices.title', { defaultValue: 'Best Practices for Great Results' })}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('howItWorks.bestPractices.specific.title', { defaultValue: 'Be Specific With Your Inputs' })}
              </h3>
              <p className="text-gray-700">
                {t('howItWorks.bestPractices.specific.description', { defaultValue: 'The more specific your topic and audience details, the better your content will be. Vague inputs lead to generic content.' })}
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('howItWorks.bestPractices.analysis.title', { defaultValue: 'Use Analysis Tools' })}
              </h3>
              <p className="text-gray-700">
                {t('howItWorks.bestPractices.analysis.description', { defaultValue: 'The YouTube transcript and image analysis features can significantly enhance your content with additional insights and context.' })}
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('howItWorks.bestPractices.personas.title', { defaultValue: 'Experiment With Personas' })}
              </h3>
              <p className="text-gray-700">
                {t('howItWorks.bestPractices.personas.description', { defaultValue: 'Different AI personas create content with distinct voices. Try several to find the one that best matches your brand tone.' })}
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('howItWorks.bestPractices.iterate.title', { defaultValue: 'Iterate and Refine' })}
              </h3>
              <p className="text-gray-700">
                {t('howItWorks.bestPractices.iterate.description', { defaultValue: 'Don\'t settle for the first draft. Regenerate content with tweaked inputs until you get the perfect result for your needs.' })}
              </p>
            </div>
          </div>
        </div>
        
        {/* Call to Action */}
        <div className="text-center">
          <Link
            href="/create"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
          >
            {t('howItWorks.createNow', { defaultValue: 'Create Content Now' })}
          </Link>
          <p className="mt-4 text-sm text-gray-500">
            {t('howItWorks.needMoreHelp', { defaultValue: 'Need more help? Check out our ' })}
            <Link href="/app-benefits" className="text-blue-600 hover:text-blue-800">
              {t('howItWorks.appBenefits', { defaultValue: 'App Benefits' })}
            </Link> 
            {t('howItWorks.page', { defaultValue: ' page for more information.' })}
          </p>
        </div>
      </div>
    </div>
  );
} 