'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from './LanguageProvider';

const Footer: React.FC = () => {
  const { t } = useLanguage();
  
  // Animation variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Footer column component for DRY code
  const FooterColumn = ({ title, links }: { title: string, links: { label: string, href: string }[] }) => (
    <motion.div variants={itemVariants} className="flex flex-col space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
        {title}
      </h3>
      <ul className="space-y-2">
        {links.map((link, index) => (
          <li key={index}>
            <span
              className="text-base text-gray-400 dark:text-gray-500 cursor-not-allowed"
            >
              {link.label}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-4 gap-10"
        >
          {/* Brand column */}
          <motion.div variants={itemVariants} className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L16 6L21 7L19 12L21 17L16 18L12 22L8 18L3 17L5 12L3 7L8 6L12 2Z" fill="white" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {t('common.appName')}
              </span>
            </Link>
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-xs">
              {t('homePage.footer.subtitle')}
            </p>
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-500">
              {t('homePage.footer.powered')}
            </p>
          </motion.div>

          {/* Link columns */}
          <FooterColumn 
            title={t('homePage.footer.product')} 
            links={[
              { label: t('homePage.footer.features'), href: '#features' },
              { label: t('homePage.footer.pricing'), href: '/pricing' },
              { label: t('homePage.footer.faq'), href: '/faq' }
            ]} 
          />
          
          <FooterColumn 
            title={t('homePage.footer.resources')} 
            links={[
              { label: t('homePage.footer.blog'), href: '/blog' },
              { label: t('homePage.footer.guides'), href: '/guides' },
              { label: t('homePage.footer.support'), href: '/support' }
            ]} 
          />
          
          <FooterColumn 
            title={t('homePage.footer.company')} 
            links={[
              { label: t('homePage.footer.about'), href: '/about' },
              { label: t('homePage.footer.careers'), href: '/careers' },
              { label: t('homePage.footer.privacy'), href: '/privacy' }
            ]} 
          />
        </motion.div>

        {/* Bottom section with copyright */}
        <motion.div 
          variants={itemVariants}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800"
        >
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} DeepContent. {t('homePage.footer.rights')}
            </p>
            
            <div className="flex space-x-6">
              <span className="text-gray-300 dark:text-gray-600 cursor-not-allowed">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </span>
              <span className="text-gray-300 dark:text-gray-600 cursor-not-allowed">
                <span className="sr-only">GitHub</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </span>
              <span className="text-gray-300 dark:text-gray-600 cursor-not-allowed">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm-3.5 8.5h-2v7h2v-7zm-1-5.828c-.616 0-1.116.5-1.116 1.117s.5 1.117 1.116 1.117c.617 0 1.117-.5 1.117-1.117s-.5-1.117-1.117-1.117zm8.5 5.828c-1.105 0-1.939.395-2.398 1.04h-.035v-.878h-2v7h2v-3.683c0-1.447.624-2.095 1.575-2.095 1.033 0 1.425.704 1.425 2.095v3.683h2v-4.348c0-2.488-1.304-3.814-3.5-3.814z" clipRule="evenodd" />
                </svg>
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer; 