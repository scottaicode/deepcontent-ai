import React from 'react';
import { analyzeResearchData } from '@/app/lib/contentTypeDetection';
import { useRouter } from 'next/navigation';
import { IconChevronRight, IconBulb } from '@tabler/icons-react';

interface ContentTypeRecommendationsProps {
  researchData: string;
  audience: string;
  onSelect?: (contentType: string, platform: string) => void;
}

/**
 * Component that displays content type recommendations based on research data
 */
const ContentTypeRecommendations: React.FC<ContentTypeRecommendationsProps> = ({ 
  researchData, 
  audience,
  onSelect
}) => {
  const router = useRouter();
  
  // Skip analysis if no research data is provided
  if (!researchData || !audience) {
    return null;
  }
  
  // Analyze the research data to get recommendations
  const recommendations = analyzeResearchData(researchData, audience);
  
  // Return null if no recommendations
  if (!recommendations || recommendations.length === 0) {
    return null;
  }
  
  // Helper function to get the appropriate content type icon
  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'social-media':
        return '📱';
      case 'blog-post':
        return '📝';
      case 'email':
        return '📧';
      case 'video-script':
        return '🎬';
      case 'youtube-script':
        return '▶️';
      case 'vlog-script':
        return '📹';
      default:
        return '📄';
    }
  };
  
  // Helper function to get the platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return '👍';
      case 'instagram':
        return '📸';
      case 'linkedin':
        return '💼';
      case 'twitter':
        return '🐦';
      case 'tiktok':
        return '🎵';
      case 'youtube':
        return '▶️';
      case 'company-blog':
      case 'medium':
      case 'wordpress':
        return '📰';
      case 'newsletter':
      case 'marketing':
      case 'sales':
      case 'welcome':
        return '📨';
      default:
        return '🔍';
    }
  };
  
  // Handle content type selection
  const handleSelect = (contentType: string, platform: string) => {
    if (onSelect) {
      onSelect(contentType, platform);
    } else {
      // Navigate to the content creation page with pre-selected content type and platform
      router.push(`/create/content?contentType=${contentType}&platform=${platform}`);
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-blue-100">
        <div className="flex items-center">
          <IconBulb className="text-blue-600 mr-2" size={20} />
          <h3 className="text-blue-800 font-medium">AI-Recommended Content Types</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Based on your research, here are the most effective content types for your audience.
        </p>
      </div>
      
      <div className="divide-y divide-gray-100">
        {recommendations.map((rec, index) => (
          <div 
            key={`${rec.contentType}-${rec.platform}`}
            className={`p-4 hover:bg-blue-50 transition-colors cursor-pointer ${
              index === 0 ? 'bg-blue-50' : ''
            }`}
            onClick={() => handleSelect(rec.contentType, rec.platform)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getContentTypeIcon(rec.contentType)}</span>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {rec.contentType.replace('-', ' ')}
                  </h4>
                  <div className="flex items-center mt-1">
                    <span className="text-sm mr-1">{getPlatformIcon(rec.platform)}</span>
                    <span className="text-sm text-gray-600">
                      {rec.platform.replace('-', ' ')}
                    </span>
                    <div className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                      {rec.confidence}% match
                    </div>
                  </div>
                </div>
              </div>
              <IconChevronRight size={18} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mt-2 ml-9">{rec.reasoning}</p>
          </div>
        ))}
      </div>
      
      <div className="bg-gray-50 p-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          Recommendations are based on target audience and research content analysis
        </p>
      </div>
    </div>
  );
};

export default ContentTypeRecommendations; 