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
        } else if (el.textContent?.includes('contentGeneration.waitingMessageImproved')) {
          console.log('[ProductionModeFixes] Found waitingMessageImproved element to fix');
          el.textContent = 'Analyzing research data...';
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
        } else if (el.textContent?.includes('contentGeneration.versionHistory')) {
          console.log('[ProductionModeFixes] Found versionHistory element to fix');
          el.textContent = 'Version History';
        }
      });
      
      // Fix button translation issues
      const allButtons = document.querySelectorAll('button');
      allButtons.forEach(el => {
        if (el.textContent?.includes('refineContent.refineButton')) {
          console.log('[ProductionModeFixes] Found refineButton element to fix');
          el.textContent = 'Refine Content';
        }
      });
      
      // Fix all text nodes in buttons and other elements
      const fixButtonText = (selector: string, textReplacements: Record<string, string>) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          Object.entries(textReplacements).forEach(([key, value]) => {
            if (el.textContent?.includes(key)) {
              console.log(`[ProductionModeFixes] Replacing "${key}" with "${value}"`);
              el.textContent = el.textContent.replace(key, value);
            }
          });
        });
      };
      
      // Fix button texts
      fixButtonText('button, a, div, span', {
        'contentGeneration.copyToClipboard': 'Copy to Clipboard',
        'contentGeneration.exportAsText': 'Export as Text',
        'contentGeneration.saveToPanel': 'Save to Dashboard',
        'contentGeneration.showHistory': 'Show History',
        'refineContent.refineButton': 'Refine Content'
      });
      
      // Fix header and label texts
      fixButtonText('h1, h2, h3, h4, h5, h6, label, p', {
        'refineContent.title': 'Refine Your Content',
        'refineContent.promptInstructions': 'Provide feedback or specific changes you want to make to your content'
      });
      
      // Fix placeholder texts
      const allTextareas = document.querySelectorAll('textarea');
      allTextareas.forEach(el => {
        if (el.placeholder?.includes('refineContent.placeholder')) {
          console.log('[ProductionModeFixes] Found placeholder element to fix');
          el.placeholder = 'Enter your feedback or instructions for content refinement...';
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
    setTimeout(applyProductionFixes, 3000);
    
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