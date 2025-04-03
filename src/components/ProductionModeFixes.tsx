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
      console.log('[ProductionModeFixes] Applying targeted fixes for UI elements');
      
      // APPROACH 1: Fix specific translation keys in elements with specific classes
      // Target only elements likely to have translation issues, not all text on the page
      
      // Fix UI elements in content generation section
      const contentGenKeys = {
        'contentGeneration.pageTitle': 'Content Generation',
        'contentGeneration.parameters': 'Content Parameters',
        'contentGeneration.settings': 'Content Settings',
        'contentGeneration.waitingMessageImproved': 'Analyzing research data...',
        'contentGeneration.choosePersona': 'Choose an AI Persona',
        'contentGeneration.versionHistory': 'Version History',
        'contentGeneration.copyToClipboard': 'Copy to Clipboard',
        'contentGeneration.exportAsText': 'Export as Text',
        'contentGeneration.saveToPanel': 'Save to Dashboard',
        'contentGeneration.showHistory': 'Show History'
      };
      
      // Fix UI elements in refine content section
      const refineContentKeys = {
        'refineContent.title': 'Refine Your Content',
        'refineContent.promptInstructions': 'Provide feedback or specific changes',
        'refineContent.placeholder': 'Enter your feedback...',
        'refineContent.refineButton': 'Refine Content'
      };
      
      // APPROACH 2: Fix persona descriptions
      // More targeted approach to only fix persona descriptions
      const personaDescriptions = {
        'personas.ariastar.description': 'Friendly, relatable tone perfect for social media and blogs',
        'personas.specialist_mentor.description': 'Professional, authoritative voice for technical content',
        'personas.ai_collaborator.description': 'Balanced, analytical tone for research and reports',
        'personas.sustainable_advocate.description': 'Passionate voice for sustainability and social impact',
        'personas.data_visualizer.description': 'Clear, data-driven narrative style',
        'personas.multiverse_curator.description': 'Creative, engaging tone for multimedia content',
        'personas.ethical_tech.description': 'Balanced voice for explaining complex technical concepts',
        'personas.niche_community.description': 'Engaging tone for building community and connection',
        'personas.synthesis_maker.description': 'Insightful tone for connecting ideas across domains'
      };
      
      // Only fix elements that EXACTLY match our translation keys - not partial matches
      const fixExactTranslationKeys = () => {
        // For exact matches, we can more safely replace content
        document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, button, a, label').forEach(el => {
          // Skip complex elements that might contain multiple items
          if (el.children.length > 0) return;
          
          const content = el.textContent?.trim();
          if (!content) return;
          
          // Fix content generation keys
          if (contentGenKeys[content as keyof typeof contentGenKeys]) {
            el.textContent = contentGenKeys[content as keyof typeof contentGenKeys];
            console.log(`[ProductionModeFixes] Fixed exact match: ${content}`);
          }
          
          // Fix refine content keys
          if (refineContentKeys[content as keyof typeof refineContentKeys]) {
            el.textContent = refineContentKeys[content as keyof typeof refineContentKeys];
            console.log(`[ProductionModeFixes] Fixed exact match: ${content}`);
          }
          
          // Fix persona descriptions
          if (personaDescriptions[content as keyof typeof personaDescriptions]) {
            el.textContent = personaDescriptions[content as keyof typeof personaDescriptions];
            console.log(`[ProductionModeFixes] Fixed persona description: ${content}`);
          }
        });
      };
      
      // Fix placeholder texts separately - these are safer to fix
      const fixPlaceholders = () => {
        const allTextareas = document.querySelectorAll('textarea');
        allTextareas.forEach(el => {
          if (el.placeholder === 'refineContent.placeholder') {
            el.placeholder = 'Enter your feedback or instructions for content refinement...';
          }
        });
      };
      
      // Fix action buttons specifically - these have a consistent pattern
      const fixActionButtons = () => {
        // These buttons often contain icons and other elements, so we need a different approach
        const buttons = document.querySelectorAll('button, a');
        buttons.forEach(button => {
          // Check if the button contains any of our action button translation keys
          const buttonText = button.textContent || '';
          
          if (buttonText.includes('contentGeneration.copyToClipboard')) {
            // Find the text node and replace just that part
            replaceTextInElement(button, 'contentGeneration.copyToClipboard', 'Copy to Clipboard');
          } else if (buttonText.includes('contentGeneration.exportAsText')) {
            replaceTextInElement(button, 'contentGeneration.exportAsText', 'Export as Text');
          } else if (buttonText.includes('contentGeneration.saveToPanel')) {
            replaceTextInElement(button, 'contentGeneration.saveToPanel', 'Save to Dashboard');
          }
        });
      };
      
      // Helper to replace text in a specific element without affecting child elements
      const replaceTextInElement = (element: Element, searchText: string, replaceText: string) => {
        // Handle elements with childNodes by only changing text nodes
        for (let i = 0; i < element.childNodes.length; i++) {
          const node = element.childNodes[i];
          if (node.nodeType === Node.TEXT_NODE && node.textContent?.includes(searchText)) {
            node.textContent = node.textContent.replace(searchText, replaceText);
            console.log(`[ProductionModeFixes] Fixed button text: ${searchText}`);
          }
        }
        
        // If element has no childNodes but contains the text directly
        if (element.childNodes.length === 0 && element.textContent?.includes(searchText)) {
          element.textContent = element.textContent.replace(searchText, replaceText);
          console.log(`[ProductionModeFixes] Fixed simple button text: ${searchText}`);
        }
      };
      
      // Run the targeted fixes
      fixExactTranslationKeys();
      fixPlaceholders();
      fixActionButtons();
    };
    
    // Apply fixes immediately
    applyProductionFixes();
    
    // Also apply after a short delay to catch dynamically rendered content
    setTimeout(applyProductionFixes, 200);
    setTimeout(applyProductionFixes, 1000);
    
    // Set up MutationObserver to watch for future DOM changes
    // IMPORTANT: Use a less aggressive callback to avoid breaking page
    const observer = new MutationObserver((mutations) => {
      // Only run fixes if we see text nodes with our target keys
      const shouldFix = mutations.some(mutation => {
        // Only look at text content changes or new nodes
        return (
          mutation.type === 'characterData' || 
          (mutation.type === 'childList' && mutation.addedNodes.length > 0)
        );
      });
      
      if (shouldFix) {
        applyProductionFixes();
      }
    });
    
    // Start observing document body for changes - with more targeted options
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