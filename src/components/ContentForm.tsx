"use client";

import React, { useState } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface ContentFormProps {
  onSuccess?: (content: any) => void;
  onResearch?: (details: any) => void;
  isLoadingRedirect?: boolean;
}

export function ContentForm({ onSuccess, onResearch, isLoadingRedirect = false }: ContentFormProps) {
  const { t } = useTranslation();
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [platform, setPlatform] = useState('blog');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topic.trim()) {
      alert('Please enter a topic');
      return;
    }
    
    setLoading(true);
    
    try {
      const contentDetails = {
        topic,
        audience,
        platform,
        timestamp: new Date().toISOString(),
      };
      
      if (onResearch) {
        onResearch(contentDetails);
      }
      
    } catch (error) {
      console.error('Error creating content:', error);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Topic *
        </label>
        <input
          type="text"
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="What would you like to create content about?"
          required
        />
      </div>
      
      <div>
        <label htmlFor="audience" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Target Audience
        </label>
        <input
          type="text"
          id="audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Who is your target audience?"
        />
      </div>
      
      <div>
        <label htmlFor="platform" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Platform
        </label>
        <select
          id="platform"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="blog">Blog Post</option>
          <option value="social">Social Media</option>
          <option value="email">Email Newsletter</option>
          <option value="article">Article</option>
          <option value="website">Website Copy</option>
        </select>
      </div>
      
      <div className="pt-4">
        <button
          type="submit"
          disabled={loading || isLoadingRedirect}
          className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors ${
            (loading || isLoadingRedirect) ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {loading || isLoadingRedirect ? 'Processing...' : 'Create Content'}
        </button>
      </div>
    </form>
  );
} 