import React, { useState, useEffect } from 'react';
import { getQuickContentTypeTips } from '@/app/lib/contentTypeBestPractices';

interface ContentTypeBestPracticesProps {
  contentType: string;
  topic?: string;
  audience?: string;
}

const ContentTypeBestPractices: React.FC<ContentTypeBestPracticesProps> = ({ 
  contentType, 
  topic = 'your content',
  audience = 'your audience'
}) => {
  const [expanded, setExpanded] = useState(false);
  const [actualContentType, setActualContentType] = useState(contentType);
  
  // Detect if this is likely a cold outreach email based on content type and audience
  useEffect(() => {
    if (contentType.toLowerCase().includes('email') && 
        (audience.toLowerCase().includes('cold') || 
         audience.toLowerCase().includes('outreach') || 
         audience.toLowerCase().includes('prospect'))) {
      setActualContentType('cold-outreach-email');
    } else {
      setActualContentType(contentType);
    }
  }, [contentType, audience]);
  
  const quickTips = getQuickContentTypeTips(actualContentType);
  
  // Clean up content type for display
  let displayContentType = actualContentType
    .split(/[- ]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
    
  // Special case for cold outreach
  if (actualContentType === 'cold-outreach-email') {
    displayContentType = 'Cold Outreach Email';
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-emerald-700">
          {displayContentType} Best Practices
        </h3>
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-emerald-600 hover:text-emerald-800"
        >
          {expanded ? 'Show Less' : 'Show More'}
        </button>
      </div>
      
      {!expanded ? (
        <div className="text-sm text-gray-600">
          <p className="mb-2">Quick tips for creating effective {displayContentType.toLowerCase()}:</p>
          <ul className="list-disc pl-5 space-y-1">
            {quickTips.slice(0, 3).map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-sm text-gray-600">
          <p className="mb-2">Comprehensive best practices for {displayContentType.toLowerCase()}:</p>
          
          <div className="mb-3">
            <h4 className="font-medium text-emerald-600">Structure</h4>
            <ul className="list-disc pl-5 space-y-1">
              {quickTips.slice(0, 1).map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
          
          <div className="mb-3">
            <h4 className="font-medium text-emerald-600">Optimization</h4>
            <ul className="list-disc pl-5 space-y-1">
              {quickTips.slice(1, 2).map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
          
          <div className="mb-3">
            <h4 className="font-medium text-emerald-600">Engagement</h4>
            <ul className="list-disc pl-5 space-y-1">
              {quickTips.slice(2, 3).map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
          
          <div className="mb-3">
            <h4 className="font-medium text-emerald-600">Technical Aspects</h4>
            <ul className="list-disc pl-5 space-y-1">
              {quickTips.slice(3, 4).map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
          
          <div className="mb-3">
            <h4 className="font-medium text-emerald-600">Trending Approaches</h4>
            <ul className="list-disc pl-5 space-y-1">
              {quickTips.slice(4, 5).map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
          
          <div className="mt-4 p-3 bg-emerald-50 rounded-md">
            <h4 className="font-medium text-emerald-700">Application for {topic}</h4>
            <p>When creating {displayContentType.toLowerCase()} about <span className="font-medium">{topic}</span>, focus on:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Using a clear structure that guides readers through your information</li>
              <li>Including specific examples and data points relevant to {topic}</li>
              <li>Maintaining a consistent voice that resonates with your target audience</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentTypeBestPractices; 