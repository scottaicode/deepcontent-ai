'use client';

import { useEffect } from 'react';

/**
 * Component that applies fixes for production mode display issues
 * Particularly for issues that appear after a hard refresh
 */
export default function ProductionModeFixes() {
  useEffect(() => {
    // Function to apply fixes for UI elements that might not display correctly in production mode
    const applyProductionFixes = () => {
      console.log('[ProductionModeFixes] Applying fixes for UI elements');
      
      // Fix for contentGeneration.pageTitle display issues
      const allSpans = document.querySelectorAll('span');
      allSpans.forEach(el => {
        if (el.textContent?.includes('contentGeneration.pageTitle')) {
          console.log('[ProductionModeFixes] Found contentGeneration.pageTitle element to fix');
          el.textContent = 'Content Generation';
        }
      });
      
      // Fix for contentGeneration.parameters display issues
      const allH3s = document.querySelectorAll('h3');
      allH3s.forEach(el => {
        if (el.textContent?.includes('contentGeneration.parameters')) {
          console.log('[ProductionModeFixes] Found contentGeneration.parameters element to fix');
          el.textContent = 'Content Parameters';
        }
        else if (el.textContent?.includes('contentGeneration.settings')) {
          console.log('[ProductionModeFixes] Found contentGeneration.settings element to fix');
          el.textContent = 'Content Settings';
        }
        else if (el.textContent?.includes('contentGeneration.choosePersona')) {
          console.log('[ProductionModeFixes] Found contentGeneration.choosePersona element to fix');
          if (el.textContent?.includes('for Your Content')) {
            el.textContent = 'Choose an AI Persona for Your Content';
          } else {
            el.textContent = 'Choose an AI Persona';
          }
        }
      });
      
      // Apply missing styles to dropdowns that may not be caught by StyleDropdownFix
      const selectElements = document.querySelectorAll('select');
      selectElements.forEach(select => {
        // Only apply if it looks like a dropdown is missing styling
        if (!select.style.backgroundImage && !select.classList.contains('style-dropdown')) {
          select.style.appearance = 'auto';
          select.style.paddingRight = '2rem';
          select.style.backgroundSize = '16px 16px';
          select.style.backgroundPosition = 'right 0.5rem center';
          select.style.backgroundRepeat = 'no-repeat';
        }
      });
    };
    
    // Apply fixes immediately
    applyProductionFixes();
    
    // Also apply after a short delay to catch dynamically rendered content
    setTimeout(applyProductionFixes, 200);
    setTimeout(applyProductionFixes, 1000);
    
    // Set up MutationObserver to watch for future DOM changes
    const observer = new MutationObserver(() => {
      applyProductionFixes();
    });
    
    // Start observing document body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    
    // Clean up
    return () => {
      observer.disconnect();
    };
  }, []);

  // Component doesn't render any visible content
  return null;
} 