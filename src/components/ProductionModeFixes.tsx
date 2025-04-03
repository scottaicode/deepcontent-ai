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
      const pageTitleElements = document.querySelectorAll('span:contains("contentGeneration.pageTitle")');
      if (pageTitleElements.length > 0) {
        console.log('[ProductionModeFixes] Found contentGeneration.pageTitle elements to fix:', pageTitleElements.length);
        pageTitleElements.forEach(el => {
          el.textContent = 'Content Generation';
        });
      }
      
      // Fix for contentGeneration.parameters display issues
      const parametersElements = document.querySelectorAll('h3:contains("contentGeneration.parameters")');
      if (parametersElements.length > 0) {
        console.log('[ProductionModeFixes] Found contentGeneration.parameters elements to fix:', parametersElements.length);
        parametersElements.forEach(el => {
          el.textContent = 'Content Parameters';
        });
      }
      
      // Fix for contentGeneration.settings display issues
      const settingsElements = document.querySelectorAll('h3:contains("contentGeneration.settings")');
      if (settingsElements.length > 0) {
        console.log('[ProductionModeFixes] Found contentGeneration.settings elements to fix:', settingsElements.length);
        settingsElements.forEach(el => {
          el.textContent = 'Content Settings';
        });
      }
      
      // Fix for contentGeneration.choosePersona display issues
      const personaElements = document.querySelectorAll('h3:contains("contentGeneration.choosePersona")');
      if (personaElements.length > 0) {
        console.log('[ProductionModeFixes] Found contentGeneration.choosePersona elements to fix:', personaElements.length);
        personaElements.forEach(el => {
          if (el.textContent?.includes('for Your Content')) {
            el.textContent = 'Choose an AI Persona for Your Content';
          } else {
            el.textContent = 'Choose an AI Persona';
          }
        });
      }
      
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
    
    // Polyfill for :contains selector if not available
    if (!Element.prototype.matches) {
      // Add contains matcher
      const originalMatches = Element.prototype.matches;
      Element.prototype.matches = function(selector: string) {
        if (selector.includes(':contains(') && this.textContent) {
          const containsMatch = selector.match(/:contains\(['"](.+?)['"]\)/);
          if (containsMatch && containsMatch[1]) {
            const containsText = containsMatch[1];
            const cleanSelector = selector.replace(/:contains\(['"].+?['"]\)/, '');
            return originalMatches.call(this, cleanSelector) && this.textContent.includes(containsText);
          }
        }
        return originalMatches.call(this, selector);
      };
    }
    
    // Add contains selector to querySelectorAll
    const originalQuerySelectorAll = Document.prototype.querySelectorAll;
    Document.prototype.querySelectorAll = function(selector: string) {
      if (selector.includes(':contains(')) {
        const containsMatch = selector.match(/:contains\(['"](.+?)['"]\)/);
        if (containsMatch && containsMatch[1]) {
          const containsText = containsMatch[1];
          const cleanSelector = selector.replace(/:contains\(['"].+?['"]\)/, '');
          
          const elements = originalQuerySelectorAll.call(this, cleanSelector);
          const result = Array.from(elements).filter(el => 
            el.textContent && el.textContent.includes(containsText)
          );
          
          // Create a NodeList-like object with the filtered results
          const nodeList = Object.create(NodeList.prototype);
          result.forEach((item, index) => {
            nodeList[index] = item;
          });
          nodeList.length = result.length;
          
          return nodeList;
        }
      }
      return originalQuerySelectorAll.call(this, selector);
    };
    
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