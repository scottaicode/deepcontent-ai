import React from 'react';
import { useComponentTranslation } from '@/lib/helpers/TranslationHelper';

interface TranslationExampleProps {
  count?: number;
}

/**
 * Example component showing the recommended approach for translations.
 * 
 * This component implements translation best practices:
 * 1. Uses useComponentTranslation helper
 * 2. Provides meaningful defaults for all translations 
 * 3. Follows consistent key structure
 * 4. Handles replacements properly
 */
const TranslationExample: React.FC<TranslationExampleProps> = ({ count = 0 }) => {
  // Initialize component translations with namespace
  const { t } = useComponentTranslation('translationExample');
  
  return (
    <div className="p-4 border rounded-md">
      <h2 className="text-lg font-medium mb-2">
        {t('title', 'Translation Example Component')}
      </h2>
      
      <p className="mb-2 text-sm text-gray-600">
        {t('description', 'This component demonstrates proper translation usage.')}
      </p>
      
      <div className="border-t pt-2 mt-2">
        <p className="text-sm">
          {t('itemsFound', 'Found {count} items', { count: count.toString() })}
        </p>
        
        {count > 0 ? (
          <p className="text-sm text-green-600">
            {t('hasItems', 'Items available')}
          </p>
        ) : (
          <p className="text-sm text-red-600">
            {t('noItems', 'No items available')}
          </p>
        )}
      </div>
      
      <div className="mt-4 text-xs bg-gray-100 p-2 rounded">
        <p>
          {t('footer.info', 'Translation keys are organized hierarchically')}
        </p>
        <p>
          {t('footer.help', 'This ensures consistent organization of translations')}
        </p>
      </div>
    </div>
  );
};

export default TranslationExample; 