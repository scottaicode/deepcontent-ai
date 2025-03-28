/**
 * TranslationHelper.tsx
 * 
 * This utility provides standardized translation helpers to ensure consistent
 * translation usage across components. Using these helpers will ensure
 * consistent naming, proper fallbacks, and standardized component handling.
 */

import { useTranslation } from '@/lib/hooks/useTranslation';

/**
 * Creates a component-specific translation helper to ensure consistent
 * prefix usage and reduce redundancy in components
 * 
 * @param componentNamespace The component namespace prefix (e.g. 'websiteAnalysis')
 * @returns An object with translation helper functions
 */
export function useComponentTranslation(componentNamespace: string) {
  const { t } = useTranslation();
  
  /**
   * Get a translated string with the component namespace automatically applied
   * @param key The translation key (without the component prefix)
   * @param defaultValue The default value to show if translation is missing
   * @param replacements Optional replacements for template strings
   */
  const getTranslation = (key: string, defaultValue: string, replacements?: Record<string, string>) => {
    const fullKey = `${componentNamespace}.${key}`;
    return t(fullKey, { defaultValue, ...replacements });
  };
  
  /**
   * Get a translated string that might be nested several levels deep
   * @param keyPath An array of keys to traverse (first is the component prefix)
   * @param defaultValue The default value if translation is missing
   * @param replacements Optional replacements for template strings
   */
  const getNestedTranslation = (keyPath: string[], defaultValue: string, replacements?: Record<string, string>) => {
    const fullKey = [componentNamespace, ...keyPath].join('.');
    return t(fullKey, { defaultValue, ...replacements });
  };
  
  /**
   * Get a translation that's outside the component namespace
   * @param fullKey The complete translation key with namespace
   * @param defaultValue The default value to show if translation is missing
   * @param replacements Optional replacements for template strings
   */
  const getGlobalTranslation = (fullKey: string, defaultValue: string, replacements?: Record<string, string>) => {
    return t(fullKey, { defaultValue, ...replacements });
  };
  
  return {
    t: getTranslation,
    tNested: getNestedTranslation,
    tGlobal: getGlobalTranslation,
    componentNamespace
  };
}

/**
 * Example usage in a component:
 * 
 * ```tsx
 * // Inside your component:
 * const { t } = useComponentTranslation('websiteAnalysis');
 * 
 * // Then use it like:
 * <h2>{t('title', 'Website Analysis')}</h2>
 * <p>{t('description', 'Extract website content for research')}</p>
 * 
 * // For nested translations:
 * <p>{t('errors.invalidUrl', 'Please enter a valid URL')}</p>
 * 
 * // With replacements:
 * <p>{t('contentExtracted', 'Extracted {count} headings', { count: '5' })}</p>
 * ```
 */ 