'use client';

import { useEffect } from 'react';

export default function StyleDropdownFix() {
  useEffect(() => {
    // More comprehensive approach to fix style dropdowns
    const fixStyleDropdowns = () => {
      // Define persona values to match
      const personaValues = [
        'ariastar', 'specialist_mentor', 'ai_collaborator', 'sustainable_advocate',
        'ecoessence', 'data_visualizer', 'multiverse_curator', 'ethical_tech',
        'niche_community', 'synthesis_maker'
      ];

      // Find select elements that might be style dropdowns
      const selects = document.querySelectorAll('select');
      
      selects.forEach(select => {
        // Check if this select has any of our persona values
        let isPersonaSelect = false;
        
        // Check options
        const options = Array.from(select.querySelectorAll('option'));
        for (const option of options) {
          const value = option.value.toLowerCase();
          const text = option.textContent?.toLowerCase() || '';
          
          // Check if option value or text contains any persona identifier
          if (personaValues.some(persona => value.includes(persona) || text.includes(persona))) {
            isPersonaSelect = true;
            break;
          }
          
          // Additional checks for text content
          if (
            text.includes('ariastar') || 
            text.includes('trusted') ||
            text.includes('mentor') || 
            text.includes('sustainable') ||
            text.includes('advocate') ||
            text.includes('specialist') || 
            text.includes('ecoessence')
          ) {
            isPersonaSelect = true;
            break;
          }
        }
        
        // Apply aggressive styling to persona selects
        if (isPersonaSelect) {
          // Apply our custom class
          select.classList.add('style-dropdown');
          
          // Add explicit inline styles to ensure styling
          select.style.minWidth = '300px';
          select.style.width = '100%';
          select.style.appearance = 'none';
          select.style.setProperty('-webkit-appearance', 'none');
          select.style.setProperty('-moz-appearance', 'none');
          select.style.paddingRight = '2.5rem';
          select.style.backgroundPosition = 'right 0.75rem center';
          select.style.backgroundRepeat = 'no-repeat';
          select.style.backgroundSize = '16px 16px';
          
          // Set specific SVG background image for the dropdown arrow
          const arrowSvg = `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`;
          select.style.backgroundImage = arrowSvg;
          
          // Style parent container
          if (select.parentElement) {
            select.parentElement.classList.add('style-dropdown-container');
            select.parentElement.style.position = 'relative';
            select.parentElement.style.minWidth = '300px';
            select.parentElement.style.width = '100%';
          }
        }
      });
    };
    
    // Apply fixes immediately and after a delay to catch dynamically rendered content
    fixStyleDropdowns();
    setTimeout(fixStyleDropdowns, 100);
    setTimeout(fixStyleDropdowns, 500);
    
    // Set up MutationObserver to apply fixes when DOM changes
    const observer = new MutationObserver((mutations) => {
      fixStyleDropdowns();
    });
    
    // Start observing document with all the subtree modifications
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    // Clean up function
    return () => {
      observer.disconnect();
    };
  }, []);
  
  // Component doesn't render anything visible
  return null;
} 