import React, { useState } from 'react';
import { getQuickBestPracticesTips } from '@/app/lib/platformBestPractices';

interface PlatformBestPracticesProps {
  platform: string;
  topic?: string;
}

const PlatformBestPractices: React.FC<PlatformBestPracticesProps> = ({ platform, topic = 'your content' }) => {
  const [expanded, setExpanded] = useState(false);
  const quickTips = getQuickBestPracticesTips(platform);
  
  // Convert platform name to title case for display
  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-indigo-700">
          {platformName} Best Practices
        </h3>
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          {expanded ? 'Show Less' : 'Show More'}
        </button>
      </div>
      
      {!expanded ? (
        <div className="text-sm text-gray-600">
          <p className="mb-2">Quick tips for creating scroll-stopping content on {platformName}:</p>
          <ul className="list-disc pl-5 space-y-1">
            {quickTips.slice(0, 3).map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-sm text-gray-600">
          <p className="mb-2">Comprehensive best practices for {platformName}:</p>
          
          <div className="mb-3">
            <h4 className="font-medium text-indigo-600">Content Formats</h4>
            <ul className="list-disc pl-5 space-y-1">
              {quickTips.slice(0, 1).map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
          
          <div className="mb-3">
            <h4 className="font-medium text-indigo-600">Engagement Tactics</h4>
            <ul className="list-disc pl-5 space-y-1">
              {quickTips.slice(1, 2).map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
          
          <div className="mb-3">
            <h4 className="font-medium text-indigo-600">Algorithm Considerations</h4>
            <ul className="list-disc pl-5 space-y-1">
              {quickTips.slice(2, 3).map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
          
          <div className="mb-3">
            <h4 className="font-medium text-indigo-600">Optimal Timing</h4>
            <ul className="list-disc pl-5 space-y-1">
              {quickTips.slice(3, 4).map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
          
          <div className="mb-3">
            <h4 className="font-medium text-indigo-600">Visual Elements</h4>
            <ul className="list-disc pl-5 space-y-1">
              {quickTips.slice(4, 5).map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
          
          <div className="mb-3">
            <h4 className="font-medium text-indigo-600">Caption Structure</h4>
            <ul className="list-disc pl-5 space-y-1">
              {quickTips.slice(5, 6).map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
          
          <div className="mb-3">
            <h4 className="font-medium text-indigo-600">Trending Formats</h4>
            <ul className="list-disc pl-5 space-y-1">
              {quickTips.slice(6, 7).map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
          
          <div className="mt-4 p-3 bg-indigo-50 rounded-md">
            <h4 className="font-medium text-indigo-700">Application for {topic}</h4>
            <p>When creating content about <span className="font-medium">{topic}</span> for {platformName}, focus on:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Using {platform === 'instagram' ? 'carousel posts or Reels' : 
                  platform === 'facebook' ? 'short videos or carousels' :
                  platform === 'linkedin' ? 'document posts or thought leadership' :
                  platform === 'twitter' ? 'threads or visual tweets' :
                  platform === 'tiktok' ? 'short hooks and storytelling' :
                  'engaging visual content'} to showcase {topic}</li>
              <li>Including specific audience pain points or questions about {topic}</li>
              <li>Demonstrating authentic experience or expertise with {topic}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformBestPractices; 