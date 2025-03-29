"use client";

import React from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import Link from 'next/link';

export default function AppBenefitsPage() {
  const { t } = useTranslation();
  
  return (
    <div className="container mx-auto pt-8 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t('appBenefits.title', { defaultValue: 'DeepContent App Benefits' })}
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t('appBenefits.subtitle', { defaultValue: 'Discover what makes our AI-powered content creation platform special' })}
          </p>
        </div>
        
        {/* Key Benefits Overview */}
        <div className="mb-12">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 shadow-sm border border-blue-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              {t('appBenefits.keyBenefits', { defaultValue: 'Key Benefits at a Glance' })}
            </h2>
            
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t('appBenefits.benefit1.title', { defaultValue: 'AI-Powered Speed' })}
                </h3>
                <p className="text-gray-700">
                  {t('appBenefits.benefit1.description', { defaultValue: 'Create high-quality content in minutes, not hours' })}
                </p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t('appBenefits.benefit2.title', { defaultValue: 'Research-Driven Content' })}
                </h3>
                <p className="text-gray-700">
                  {t('appBenefits.benefit2.description', { defaultValue: 'Leverage AI research capabilities for accurate, up-to-date content' })}
                </p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t('appBenefits.benefit3.title', { defaultValue: 'Multi-Platform Optimization' })}
                </h3>
                <p className="text-gray-700">
                  {t('appBenefits.benefit3.description', { defaultValue: 'Content specifically optimized for each platform\'s unique requirements' })}
                </p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Complete Visual Tools
                </h3>
                <p className="text-gray-700">
                  Powerful visual creation tools that elevate your written content
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Special Features Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
            {t('appBenefits.features.title', { defaultValue: 'What Makes DeepContent Special' })}
          </h2>
          
          <div className="space-y-8">
            {/* Feature 1 - Claude */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 bg-blue-100 p-4 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('appBenefits.features.feature1.title', { defaultValue: 'Claude 3.7 Sonnet AI Integration' })}
                </h3>
                <p className="text-gray-600 mb-3">
                  {t('appBenefits.features.feature1.description', { defaultValue: 'Powered by Anthropic\'s advanced Claude 3.7 Sonnet model, DeepContent leverages one of the most capable AI systems available today to generate human-quality content.' })}
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>{t('appBenefits.features.feature1.point1', { defaultValue: 'Advanced understanding of content needs and context' })}</li>
                  <li>{t('appBenefits.features.feature1.point2', { defaultValue: 'Natural, flowing text that reads like human-written content' })}</li>
                  <li>{t('appBenefits.features.feature1.point3', { defaultValue: 'Adaptable to different tones, styles, and brand voices' })}</li>
                </ul>
              </div>
            </div>
            
            {/* Feature 2 - Multimedia Analysis */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 bg-blue-100 p-4 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('appBenefits.features.feature2.title', { defaultValue: 'Multimedia Analysis Tools' })}
                </h3>
                <p className="text-gray-600 mb-3">
                  {t('appBenefits.features.feature2.description', { defaultValue: 'Unlike basic AI content tools, DeepContent integrates multimedia analysis capabilities to enrich your content creation process.' })}
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>{t('appBenefits.features.feature2.point1', { defaultValue: 'YouTube Transcript Analysis: Extract insights from video content' })}</li>
                  <li>{t('appBenefits.features.feature2.point2', { defaultValue: 'Image Analysis: Leverage Claude\'s vision capabilities to analyze images for content inspiration' })}</li>
                  <li>{t('websiteAnalysis.title', { defaultValue: 'Website Analysis: Extract key information from websites to enhance your research' })}</li>
                  <li>{t('appBenefits.features.feature2.point3', { defaultValue: 'Cross-reference multiple sources for more comprehensive content' })}</li>
                </ul>
              </div>
            </div>
            
            {/* Feature 3 - Real-time Trend Analysis */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 bg-blue-100 p-4 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('appBenefits.features.featureRealTime.title', { defaultValue: 'Real-Time Trend Research & Analysis' })}
                </h3>
                <p className="text-gray-600 mb-3">
                  {t('appBenefits.features.featureRealTime.description', { defaultValue: 'DeepContent doesn\'t rely on outdated techniques or static models. For every content creation task, it performs fresh research to identify what\'s actually working now.' })}
                </p>
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-4 mb-3 border border-amber-100">
                  <p className="text-amber-800 font-medium">
                    {t('appBenefits.features.featureRealTime.highlight', { defaultValue: 'What worked 6 months ago often fails today. DeepContent ensures your content uses techniques and approaches that are effective in the current digital environment.' })}
                  </p>
                </div>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>{t('appBenefits.features.featureRealTime.point1', { defaultValue: 'Analyzes current trends in digital communication for each platform' })}</li>
                  <li>{t('appBenefits.features.featureRealTime.point2', { defaultValue: 'Identifies persuasion and attention-grabbing techniques that are working now' })}</li>
                  <li>{t('appBenefits.features.featureRealTime.point3', { defaultValue: 'Adapts content strategies to break through today\'s digital noise' })}</li>
                </ul>
              </div>
            </div>
            
            {/* Feature 4 - AI Personas */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 bg-blue-100 p-4 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('appBenefits.features.feature3.title', { defaultValue: 'AI Personas & Writing Styles' })}
                </h3>
                <p className="text-gray-600 mb-3">
                  {t('appBenefits.features.feature3.description', { defaultValue: 'Choose from a variety of AI personas, each with their own distinct writing style and tone, to match your brand voice perfectly.' })}
                </p>
                <p className="text-gray-600 mb-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                  {t('appBenefits.features.feature3.researchNote', { defaultValue: 'Our 9 customer personas were created by DeepContent itself through comprehensive trend analysis and audience research. These personas represent the most effective communication styles that break through the noise in today\'s crowded digital landscape.' })}
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>{t('appBenefits.features.feature3.point1', { defaultValue: 'AriaStar: Friendly, conversational tone ideal for social content' })}</li>
                  <li>{t('appBenefits.features.feature3.point2', { defaultValue: 'TechExpert: Professional, detailed style for technical content' })}</li>
                  <li>{t('appBenefits.features.feature3.point3', { defaultValue: 'Adjustable intensity settings to fine-tune your preferred style' })}</li>
                </ul>
              </div>
            </div>
            
            {/* Feature 5 - Platform Optimization */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 bg-blue-100 p-4 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('appBenefits.features.feature4.title', { defaultValue: 'Platform-Specific Optimization' })}
                </h3>
                <p className="text-gray-600 mb-3">
                  {t('appBenefits.features.feature4.description', { defaultValue: 'DeepContent is more than a generic content generator. It understands the unique requirements of different platforms and content types.' })}
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>{t('appBenefits.features.feature4.point1', { defaultValue: 'Automatically formats content based on platform best practices' })}</li>
                  <li>{t('appBenefits.features.feature4.point2', { defaultValue: 'Incorporates platform-specific elements like hashtags, emojis, and CTAs' })}</li>
                  <li>{t('appBenefits.features.feature4.point3', { defaultValue: 'Optimized for specific platforms including Facebook, Instagram, LinkedIn, TikTok, and more' })}</li>
                </ul>
              </div>
            </div>
            
            {/* Feature 6 - Complete Content Workflow */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 bg-blue-100 p-4 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Complete Content Workflow
                </h3>
                <p className="text-gray-600 mb-3">
                  DeepContent provides a comprehensive end-to-end content creation workflow - from research to writing to visualizing - all in one platform.
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Research and analyze your topic with AI-powered tools</li>
                  <li>Generate high-quality text content with Claude 3.7 Sonnet</li>
                  <li>Create eye-catching visuals to enhance your text content</li>
                  <li>Export complete content packages ready for publication</li>
                  <li>Add your own media assets to enhance your content presentation</li>
                </ul>
                <div className="bg-blue-50 rounded-lg p-4 mt-3 text-sm text-blue-800">
                  <strong>Pro Tip:</strong> The most effective content combines quality writing with engaging visuals. Use DeepContent's complete workflow to create both elements in perfect harmony.
                </div>
              </div>
            </div>
            
            {/* Feature 7 - Visual Content Creation Tools (moved to end) */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 bg-blue-100 p-4 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Visual Content Creation Tools
                </h3>
                <p className="text-gray-600 mb-3">
                  After creating high-quality text content, elevate your messaging with powerful visual tools that help you create and enhance images to complement your text.
                </p>
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 mb-3 border border-indigo-100">
                  <p className="text-indigo-800 font-medium">
                    Research shows content with relevant visuals gets up to 94% more views than content without. Our visual tools enable you to create eye-catching imagery that dramatically enhances your content's impact.
                  </p>
                </div>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>
                    <span className="font-medium">AI Image Editor:</span> Transform existing images with AI assistance to create unique visuals that complement your content
                  </li>
                  <li>
                    <span className="font-medium">Text-to-Image:</span> Generate striking custom imagery based on text descriptions to bring your content concepts to life
                  </li>
                  <li>Seamlessly integrate with your text content to create a complete multimedia package</li>
                  <li>Create visuals that powerfully convey your content's message and emotional tone</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Value Proposition Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            {t('appBenefits.valueProposition.title', { defaultValue: 'Why Choose DeepContent?' })}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('appBenefits.valueProposition.time.title', { defaultValue: 'Save Time & Resources' })}
              </h3>
              <p className="text-gray-700">
                {t('appBenefits.valueProposition.time.description', { defaultValue: 'Create content in minutes that would normally take hours. DeepContent handles the research and writing, allowing you to focus on strategy and refinement.' })}
              </p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('appBenefits.valueProposition.quality.title', { defaultValue: 'Professional-Quality Content' })}
              </h3>
              <p className="text-gray-700">
                {t('appBenefits.valueProposition.quality.description', { defaultValue: 'Access professional-level content creation capabilities without hiring expensive writers or agencies. Our AI produces polished, engaging content every time.' })}
              </p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('appBenefits.valueProposition.versatility.title', { defaultValue: 'Versatile Content Types' })}
              </h3>
              <p className="text-gray-700">
                {t('appBenefits.valueProposition.versatility.description', { defaultValue: 'From social media posts to detailed blog articles, YouTube scripts to email newsletters, DeepContent handles virtually any content format you need.' })}
              </p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('appBenefits.valueProposition.consistency.title', { defaultValue: 'Consistent Brand Voice' })}
              </h3>
              <p className="text-gray-700">
                {t('appBenefits.valueProposition.consistency.description', { defaultValue: 'Maintain a consistent tone and style across all your content with our AI personas. Once you find your preferred style, you can apply it to all your content.' })}
              </p>
            </div>
          </div>
        </div>
        
        {/* AI Personas Showcase Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            {t('personasShowcase.title', { defaultValue: 'AI Personas for Every Use Case' })}
          </h2>
          
          <div className="mb-6 text-center">
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {t('personasShowcase.subtitle', { defaultValue: 'DeepContent is designed for everyone. Our AI personas are versatile and can be used for both business and personal content creation.' })}
            </p>
          </div>
          
          {/* Personas Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* TechExpert */}
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-lg p-5 border border-blue-100 dark:border-blue-900/30">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t('personasShowcase.techExpert', { defaultValue: 'TechExpert' })}</h4>
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300">
                  {t('personasShowcase.versatile', { defaultValue: 'Versatile' })}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                {t('personasShowcase.techExpertDesc', { defaultValue: 'Precise, detailed, and analytically-focused. Ideal for technical documentation, product specs, and industry analysis.' })}
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                  <span className="font-medium">🏢</span> {t('personasShowcase.techExpertBusiness', { defaultValue: 'Documentation, White papers' })}
                </div>
                <div className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-800">
                  <span className="font-medium">👤</span> {t('personasShowcase.techExpertPersonal', { defaultValue: 'DIY guides, Technical blogs' })}
                </div>
              </div>
            </div>
            
            {/* ExecutiveBrief */}
            <div className="bg-gradient-to-br from-gray-50 to-green-50 dark:from-gray-800 dark:to-green-900/20 rounded-lg p-5 border border-green-100 dark:border-green-900/30">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t('personasShowcase.executiveBrief', { defaultValue: 'ExecutiveBrief' })}</h4>
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300">
                  {t('personasShowcase.businessFocused', { defaultValue: 'Business-focused' })}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                {t('personasShowcase.executiveBriefDesc', { defaultValue: 'Concise, strategic, and outcome-focused. Communicates high-level insights with clarity and impact.' })}
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                  <span className="font-medium">🏢</span> {t('personasShowcase.executiveBriefBusiness', { defaultValue: 'Executive summaries, Proposals' })}
                </div>
                <div className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-800">
                  <span className="font-medium">👤</span> {t('personasShowcase.executiveBriefPersonal', { defaultValue: 'Project plans, Event briefs' })}
                </div>
              </div>
            </div>
            
            {/* MarketPro */}
            <div className="bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-800 dark:to-purple-900/20 rounded-lg p-5 border border-purple-100 dark:border-purple-900/30">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t('personasShowcase.marketPro', { defaultValue: 'MarketPro' })}</h4>
                <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-800/30 dark:text-purple-300">
                  {t('personasShowcase.businessFocused', { defaultValue: 'Business-focused' })}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                {t('personasShowcase.marketProDesc', { defaultValue: 'Persuasive, benefit-focused, and conversion-oriented. Creates compelling marketing content that drives action.' })}
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                  <span className="font-medium">🏢</span> {t('personasShowcase.marketProBusiness', { defaultValue: 'Sales emails, Landing pages' })}
                </div>
                <div className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-800">
                  <span className="font-medium">👤</span> {t('personasShowcase.marketProPersonal', { defaultValue: 'Marketplace listings, Fundraisers' })}
                </div>
              </div>
            </div>
            
            {/* AriaStar */}
            <div className="bg-gradient-to-br from-gray-50 to-pink-50 dark:from-gray-800 dark:to-pink-900/20 rounded-lg p-5 border border-pink-100 dark:border-pink-900/30">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t('personasShowcase.ariaStar', { defaultValue: 'AriaStar' })}</h4>
                <span className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-800 dark:bg-pink-800/30 dark:text-pink-300">
                  {t('personasShowcase.versatile', { defaultValue: 'Versatile' })}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                {t('personasShowcase.ariaStarDesc', { defaultValue: 'Friendly, conversational, and engaging. Creates content that feels personal and connects emotionally with the audience.' })}
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                  <span className="font-medium">🏢</span> {t('personasShowcase.ariaStarBusiness', { defaultValue: 'Lead gen emails, Social media' })}
                </div>
                <div className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-800">
                  <span className="font-medium">👤</span> {t('personasShowcase.ariaStarPersonal', { defaultValue: 'Personal blogs, Newsletters' })}
                </div>
              </div>
            </div>
            
            {/* CreativeSpirit */}
            <div className="bg-gradient-to-br from-gray-50 to-yellow-50 dark:from-gray-800 dark:to-yellow-900/20 rounded-lg p-5 border border-yellow-100 dark:border-yellow-900/30">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t('personasShowcase.creativeSpirit', { defaultValue: 'CreativeSpirit' })}</h4>
                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300">
                  {t('personasShowcase.versatile', { defaultValue: 'Versatile' })}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                {t('personasShowcase.creativeSpiritDesc', { defaultValue: 'Imaginative, expressive, and vibrant. Brings a creative flair to content with rich descriptions and engaging narratives.' })}
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                  <span className="font-medium">🏢</span> {t('personasShowcase.creativeSpiritBusiness', { defaultValue: 'Brand stories, Product descriptions' })}
                </div>
                <div className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-800">
                  <span className="font-medium">👤</span> {t('personasShowcase.creativeSpiritPersonal', { defaultValue: 'Travel blogs, Creative writing' })}
                </div>
              </div>
            </div>
            
            {/* ContentCoach */}
            <div className="bg-gradient-to-br from-gray-50 to-red-50 dark:from-gray-800 dark:to-red-900/20 rounded-lg p-5 border border-red-100 dark:border-red-900/30">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t('personasShowcase.contentCoach', { defaultValue: 'ContentCoach' })}</h4>
                <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300">
                  {t('personasShowcase.versatile', { defaultValue: 'Versatile' })}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                {t('personasShowcase.contentCoachDesc', { defaultValue: 'Supportive, instructional, and motivational. Creates content that guides, teaches, and inspires action.' })}
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                  <span className="font-medium">🏢</span> {t('personasShowcase.contentCoachBusiness', { defaultValue: 'Training materials, User guides' })}
                </div>
                <div className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-800">
                  <span className="font-medium">👤</span> {t('personasShowcase.contentCoachPersonal', { defaultValue: 'How-to guides, Tutorials' })}
                </div>
              </div>
            </div>
            
            {/* DataNarratorPro */}
            <div className="bg-gradient-to-br from-gray-50 to-cyan-50 dark:from-gray-800 dark:to-cyan-900/20 rounded-lg p-5 border border-cyan-100 dark:border-cyan-900/30">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t('personasShowcase.dataNarratorPro', { defaultValue: 'DataNarratorPro' })}</h4>
                <span className="px-2 py-1 text-xs rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-800/30 dark:text-cyan-300">
                  {t('personasShowcase.businessFocused', { defaultValue: 'Business-focused' })}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                {t('personasShowcase.dataNarratorProDesc', { defaultValue: 'Analytical, insightful, and evidence-based. Transforms complex data into clear, actionable narratives.' })}
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                  <span className="font-medium">🏢</span> {t('personasShowcase.dataNarratorProBusiness', { defaultValue: 'Data reports, Market analysis' })}
                </div>
                <div className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-800">
                  <span className="font-medium">👤</span> {t('personasShowcase.dataNarratorProPersonal', { defaultValue: 'Research summaries, Trend analysis' })}
                </div>
              </div>
            </div>
            
            {/* StoryWeaver */}
            <div className="bg-gradient-to-br from-gray-50 to-orange-50 dark:from-gray-800 dark:to-orange-900/20 rounded-lg p-5 border border-orange-100 dark:border-orange-900/30">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t('personasShowcase.storyWeaver', { defaultValue: 'StoryWeaver' })}</h4>
                <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-300">
                  {t('personasShowcase.versatile', { defaultValue: 'Versatile' })}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                {t('personasShowcase.storyWeaverDesc', { defaultValue: 'Narrative-focused, emotionally resonant, and memorable. Crafts compelling stories that capture attention and stay with the audience.' })}
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                  <span className="font-medium">🏢</span> {t('personasShowcase.storyWeaverBusiness', { defaultValue: 'Brand storytelling, Case studies' })}
                </div>
                <div className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-800">
                  <span className="font-medium">👤</span> {t('personasShowcase.storyWeaverPersonal', { defaultValue: 'Personal stories, Creative fiction' })}
                </div>
              </div>
            </div>
            
            {/* TrendSpotter */}
            <div className="bg-gradient-to-br from-gray-50 to-emerald-50 dark:from-gray-800 dark:to-emerald-900/20 rounded-lg p-5 border border-emerald-100 dark:border-emerald-900/30">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t('personasShowcase.trendSpotter', { defaultValue: 'TrendSpotter' })}</h4>
                <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-800/30 dark:text-emerald-300">
                  {t('personasShowcase.versatile', { defaultValue: 'Versatile' })}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                {t('personasShowcase.trendSpotterDesc', { defaultValue: 'Current, relevant, and culturally aware. Creates content that connects with the latest trends while maintaining authenticity.' })}
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                  <span className="font-medium">🏢</span> {t('personasShowcase.trendSpotterBusiness', { defaultValue: 'Trend reports, Social campaigns' })}
                </div>
                <div className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-800">
                  <span className="font-medium">👤</span> {t('personasShowcase.trendSpotterPersonal', { defaultValue: 'Lifestyle content, Commentary' })}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <div className="inline-block px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg border border-blue-100 dark:border-blue-900/20">
              <p className="text-gray-700 dark:text-gray-300">
                {t('personasShowcase.customNote', { defaultValue: 'Each persona adapts to both business and personal contexts. Choose based on your content goals rather than use case. Feel free to experiment with different personas to find your perfect match.' })}
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
            {t('appBenefits.startCreating', { defaultValue: 'Start Creating Now' })}
          </Link>
          <p className="mt-4 text-sm text-gray-500">
            {t('appBenefits.learnMore', { defaultValue: 'Want to learn how to use these features? Check out our ' })}
            <Link href="/how-it-works" className="text-blue-600 hover:text-blue-800">
              {t('appBenefits.howItWorks', { defaultValue: 'How It Works' })}
            </Link> 
            {t('appBenefits.guide', { defaultValue: ' guide.' })}
          </p>
        </div>
      </div>
    </div>
  );
} 