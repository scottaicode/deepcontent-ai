import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { getPersonaDisplayName } from '@/app/lib/personaUtils';
import ExpandCollapseButton from './ExpandCollapseButton';

interface PersonaStyledContentProps {
  content: string;
  persona: string;
  contentType: string;
  platform: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

/**
 * Component that renders content with persona-specific styling
 */
const PersonaStyledContent: React.FC<PersonaStyledContentProps> = ({
  content,
  persona,
  contentType,
  platform,
  isExpanded = false,
  onToggleExpand,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const personaName = getPersonaDisplayName(persona);

  // Check if content overflows when collapsed
  useEffect(() => {
    if (contentRef.current) {
      const element = contentRef.current;
      setHasOverflow(!isExpanded && element.scrollHeight > element.clientHeight);
    }
  }, [content, isExpanded]);

  // Get persona-specific color scheme
  const getPersonaColors = (): { 
    primary: string; 
    secondary: string; 
    accent: string; 
    bgClass: string;
    borderClass: string;
    textClass: string;
    hoverBgClass: string;
    buttonBgClass: string;
    buttonTextClass: string;
    buttonHoverClass: string;
    gradientClass: string;
  } => {
    switch (persona) {
      case 'ariastar':
        return { 
          primary: 'purple', 
          secondary: 'indigo', 
          accent: 'pink', 
          bgClass: 'bg-purple-50',
          borderClass: 'border-purple-100',
          textClass: 'text-purple-700',
          hoverBgClass: 'hover:bg-purple-100',
          buttonBgClass: 'bg-purple-100',
          buttonTextClass: 'text-purple-700',
          buttonHoverClass: 'hover:bg-purple-200',
          gradientClass: 'from-purple-50'
        };
      case 'specialist_mentor':
        return { 
          primary: 'blue', 
          secondary: 'sky', 
          accent: 'blue', 
          bgClass: 'bg-blue-50',
          borderClass: 'border-blue-100',
          textClass: 'text-blue-700',
          hoverBgClass: 'hover:bg-blue-100',
          buttonBgClass: 'bg-blue-100',
          buttonTextClass: 'text-blue-700',
          buttonHoverClass: 'hover:bg-blue-200',
          gradientClass: 'from-blue-50'
        };
      case 'ai_collaborator':
        return { 
          primary: 'teal', 
          secondary: 'emerald', 
          accent: 'cyan', 
          bgClass: 'bg-teal-50',
          borderClass: 'border-teal-100',
          textClass: 'text-teal-700',
          hoverBgClass: 'hover:bg-teal-100',
          buttonBgClass: 'bg-teal-100',
          buttonTextClass: 'text-teal-700',
          buttonHoverClass: 'hover:bg-teal-200',
          gradientClass: 'from-teal-50'
        };
      case 'data_visualizer':
        return { 
          primary: 'blue', 
          secondary: 'indigo', 
          accent: 'violet', 
          bgClass: 'bg-blue-50',
          borderClass: 'border-blue-100',
          textClass: 'text-blue-700',
          hoverBgClass: 'hover:bg-blue-100',
          buttonBgClass: 'bg-blue-100',
          buttonTextClass: 'text-blue-700',
          buttonHoverClass: 'hover:bg-blue-200',
          gradientClass: 'from-blue-50'
        };
      default:
        return { 
          primary: 'gray', 
          secondary: 'slate', 
          accent: 'blue', 
          bgClass: 'bg-gray-50',
          borderClass: 'border-gray-100',
          textClass: 'text-gray-700',
          hoverBgClass: 'hover:bg-gray-100',
          buttonBgClass: 'bg-gray-100',
          buttonTextClass: 'text-gray-700',
          buttonHoverClass: 'hover:bg-gray-200',
          gradientClass: 'from-gray-50'
        };
    }
  };

  // Get persona-specific icon
  const getPersonaIcon = (): string => {
    switch (persona) {
      case 'ariastar':
        return '✨';
      case 'specialist_mentor':
        return '🧠';
      case 'ai_collaborator':
        return '🤖';
      case 'sustainable_advocate':
        return '🌱';
      case 'data_visualizer':
        return '📊';
      case 'multiverse_curator':
        return '🌌';
      case 'ethical_tech':
        return '🛡️';
      case 'niche_community':
        return '👥';
      case 'synthesis_maker':
        return '🔄';
      default:
        return '📝';
    }
  };

  // Get content type icon
  const getContentTypeIcon = (): string => {
    if (contentType.includes('social-media')) {
      if (platform.includes('instagram')) return '📸';
      if (platform.includes('facebook')) return '👍';
      if (platform.includes('twitter') || platform.includes('x')) return '🐦';
      if (platform.includes('linkedin')) return '💼';
      if (platform.includes('tiktok')) return '🎵';
      return '📱';
    }
    if (contentType.includes('blog')) return '📝';
    if (contentType.includes('email')) return '📧';
    if (contentType.includes('video')) return '🎬';
    return '📄';
  };

  const colors = getPersonaColors();
  const iconClass = persona === 'ariastar' ? 'text-purple-600' : 
                   persona === 'specialist_mentor' ? 'text-blue-600' : 'text-gray-600';

  return (
    <div className={`bg-white border ${colors.borderClass} rounded-lg shadow-sm`}>
      {/* Content header with persona name and icons */}
      <div className={`flex items-center justify-between p-4 border-b ${colors.borderClass}`}>
        <div className="flex items-center">
          <span className={`text-2xl mr-2 ${iconClass}`}>{getPersonaIcon()}</span>
          <div>
            <h3 className={colors.textClass}>{personaName}</h3>
            <p className="text-sm text-gray-500 flex items-center">
              <span className="mr-1">{getContentTypeIcon()}</span>
              {contentType} {platform && `for ${platform}`}
            </p>
          </div>
        </div>
        {onToggleExpand && (
          <ExpandCollapseButton 
            isExpanded={isExpanded} 
            onClick={onToggleExpand} 
            variant="text"
          />
        )}
      </div>

      {/* Content body with persona-specific styling */}
      <div
        ref={contentRef}
        className={`prose max-w-none ${colors.bgClass} p-5 ${
          !isExpanded ? 'max-h-64 overflow-hidden relative' : ''
        }`}
      >
        <ReactMarkdown>{content}</ReactMarkdown>
        
        {/* Gradient overlay for collapsed content */}
        {hasOverflow && !isExpanded && (
          <div 
            className={`absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t ${colors.gradientClass} to-transparent pointer-events-none`}
          />
        )}
      </div>

      {/* Content footer with contextual actions */}
      <div className={`p-3 ${colors.bgClass} border-t ${colors.borderClass} flex items-center justify-between rounded-b-lg`}>
        <div className="text-xs text-gray-500">
          Generated using {personaName}
        </div>
        <div className="flex space-x-2">
          <button 
            className={`text-xs px-3 py-1 rounded-full ${colors.buttonBgClass} ${colors.buttonTextClass} ${colors.buttonHoverClass} transition-colors`}
            aria-label="Copy content"
          >
            Copy
          </button>
          {onToggleExpand && (
            <ExpandCollapseButton 
              isExpanded={isExpanded} 
              onClick={onToggleExpand} 
              variant="outline"
              className="text-xs rounded-full"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonaStyledContent; 