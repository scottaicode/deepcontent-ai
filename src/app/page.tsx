'use client';

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "./components/LanguageProvider";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Home() {
  const { t, locale } = useLanguage();
  const [scrollY, setScrollY] = useState(0);

  // Track scroll position for parallax effects
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950 pt-20">
      {/* Hero Section - redesigned with human-centered approach */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="md:flex md:items-center md:justify-between"
          >
            <div className="md:w-1/2 md:pr-12">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white"
              >
                <span className="text-blue-600 dark:text-blue-400">{t('homePage.hero.titleHighlight')}</span>{' '}
                {t('homePage.hero.title')}
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-6 text-xl text-gray-600 dark:text-gray-300 leading-relaxed"
              >
                {t('homePage.hero.subtitle')}
              </motion.p>
              
              {/* Language Selector */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="mt-6 flex items-center"
              >
                <span className="text-gray-700 dark:text-gray-300 mr-3 font-medium">{t('homePage.languageSelector.chooseLanguage')}:</span>
                <div className="flex space-x-3">
                  <button
                    onClick={() => window.location.href = '/?lang=en'}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      locale === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    🇺🇸 English
                  </button>
                  <button
                    onClick={() => window.location.href = '/?lang=es'}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      locale === 'es' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    🇪🇸 Español
                  </button>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-8 flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4"
              >
                <Link 
                  href="/create" 
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-500/30 transition-all duration-200"
                >
                  {t('homePage.hero.createButton')}
                </Link>
                <Link 
                  href="#features" 
                  className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-700 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  {t('homePage.hero.learnMoreButton')}
                </Link>
              </motion.div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-12 md:mt-0 md:w-1/2 lg:w-5/12"
            >
              <div className="relative">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                  <div className="px-6 py-6">
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('homePage.hero.demoTitle')}</h3>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-4">
                      {[1, 2, 3].map((step) => (
                        <div key={step} className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-semibold text-sm">
                              {step}
                            </div>
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{t(`homePage.steps.step${step}Title`)}</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t(`homePage.steps.step${step}`)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-200 dark:bg-blue-900 rounded-full opacity-30 blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-200 dark:bg-purple-900 rounded-full opacity-30 blur-3xl"></div>
              </div>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Background decorations */}
        <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-gradient-to-bl from-blue-100/40 dark:from-blue-900/30 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -z-10 w-[500px] h-[500px] bg-gradient-to-tr from-purple-100/40 dark:from-purple-900/30 to-transparent rounded-full blur-3xl"></div>
      </section>

      {/* Features Section - Redesigned with Contextual Prominence Allocation in mind */}
      <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl"
            >
              {t('homePage.features.title')}
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-4 text-xl text-gray-600 dark:text-gray-300"
            >
              {t('homePage.features.subtitle')}
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              'multiPlatform', 
              'aiPowered', 
              'research',
              'personas',
              'customizable',
              'export',
              'youtube'
            ].map((feature, index) => (
              <motion.div 
                key={feature}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md dark:shadow-gray-800/50 p-6 transition-all duration-200 border border-gray-100 dark:border-gray-700"
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-xl">{getFeatureIcon(feature)}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {t(`homePage.features.${feature}.title`)}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {t(`homePage.features.${feature}.description`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section - Redesigned with Transparent Partnership Design */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl"
            >
              {t('homePage.useCases.title')}
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-4 text-xl text-gray-600 dark:text-gray-300"
            >
              {t('homePage.useCases.subtitle')}
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              'marketers',
              'creators',
              'smallBusiness',
              'personal'
            ].map((useCase, index) => (
              <motion.div 
                key={useCase}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="bg-blue-50 dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 group"
              >
                <div className="p-6">
                  <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center mb-5 text-3xl shadow-sm group-hover:scale-110 transition-transform duration-200">
                    {getUserCaseIcon(useCase)}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {t(`homePage.useCases.${useCase}.title`)}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t(`homePage.useCases.${useCase}.description`)}
                  </p>
                </div>
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center">
                  <Link href="/create" className="text-sm font-medium hover:underline transition-all">
                    {t('homePage.useCases.getStarted')} &rarr;
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Human-AI Partnership Section - New section inspired by the research */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="md:flex md:items-center md:justify-between">
            <div className="md:w-1/2 md:pr-12">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl"
              >
                {t('homePage.partnership.title')}
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-4 text-xl text-gray-600 dark:text-gray-300"
              >
                {t('homePage.partnership.subtitle')}
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-8 space-y-4"
              >
                {[1, 2, 3].map((principle) => (
                  <div key={principle} className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {t(`homePage.partnership.principle${principle}.title`)}
                      </h3>
                      <p className="mt-2 text-gray-600 dark:text-gray-300">
                        {t(`homePage.partnership.principle${principle}.description`)}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-12 md:mt-0 md:w-1/2"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 dark:bg-gray-800">
                  <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-600 to-purple-600 p-8 text-white text-center">
                    <div>
                      <h3 className="text-2xl font-bold mb-4">{t('homePage.partnership.demo.title')}</h3>
                      <p className="mb-6">{t('homePage.partnership.demo.description')}</p>
                      <Link 
                        href="/create" 
                        className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                      >
                        {t('homePage.partnership.demo.button')}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Background decorations */}
        <div className="absolute top-1/4 right-0 -z-10 w-72 h-72 bg-blue-200 dark:bg-blue-900/30 rounded-full mix-blend-multiply blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute bottom-1/4 left-0 -z-10 w-72 h-72 bg-purple-200 dark:bg-purple-900/30 rounded-full mix-blend-multiply blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      </section>

      {/* Footer - Redesigned with clarity and accessibility */}
      <footer className="bg-gray-900 text-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">{t('common.appName')}</h2>
              <p className="text-gray-400 mb-4">{t('homePage.footer.subtitle')}</p>
              <div className="flex space-x-4">
                <span className="text-gray-600 cursor-not-allowed">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </span>
                <span className="text-gray-600 cursor-not-allowed">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </span>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('homePage.footer.product')}</h3>
              <ul className="space-y-2">
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.features')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.pricing')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.faq')}</span></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('homePage.footer.resources')}</h3>
              <ul className="space-y-2">
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.blog')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.guides')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.support')}</span></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('homePage.footer.company')}</h3>
              <ul className="space-y-2">
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.about')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.careers')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.privacy')}</span></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 mt-8 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} DeepContent. {t('homePage.footer.rights')}</p>
            <div className="mt-4 md:mt-0 text-sm text-gray-400">
              {t('homePage.footer.powered')}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

// Helper function to get feature icon
function getFeatureIcon(feature: string) {
  const icons: {[key: string]: string} = {
    multiPlatform: '🌐',
    aiPowered: '🧠',
    research: '🔍',
    personas: '👥',
    customizable: '⚙️',
    export: '📤',
    youtube: '▶️'
  };
  
  return icons[feature] || '✨';
}

// Helper function to get use case icon
function getUserCaseIcon(useCase: string) {
  const icons: {[key: string]: string} = {
    marketers: '🚀',
    creators: '✍️',
    smallBusiness: '💼',
    personal: '🎨'
  };
  
  return icons[useCase] || '✨';
}
