"use client";

import React, { useState, useEffect } from 'react';
import { useContent } from '@/lib/hooks/useContent';
import { ContentItem } from '@/lib/firebase/contentRepository';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler
);

// Define types for our analytics data
interface ContentMetrics {
  views: number;
  engagements: number;
  shares: number;
  comments: number;
  conversions: number;
}

interface ContentAnalytics {
  id: string;
  title: string;
  contentType: string;
  platform: string;
  persona: string;
  createdAt: Date;
  metrics: ContentMetrics;
}

const ContentAnalyticsDashboard: React.FC = () => {
  const { getAllContent } = useContent();
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<ContentAnalytics[]>([]);
  const [timeframe, setTimeframe] = useState<'7days' | '30days' | '90days' | 'all'>('30days');
  const [selectedMetric, setSelectedMetric] = useState<keyof ContentMetrics>('views');
  
  // Load analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);
      try {
        // In a real implementation, this would call an API to get analytics
        // For now, we'll generate mock data based on the user's content
        const contents = await getAllContent();
        
        // Generate mock analytics for each content
        const analytics: ContentAnalytics[] = contents
          .filter((content): content is ContentItem => !!content && !!content.id)
          .map((content) => {
            // Safely convert Firebase timestamp to Date
            let createdDate = new Date();
            try {
              if (content.createdAt) {
                if (typeof content.createdAt === 'object' && 'toDate' in content.createdAt) {
                  // It's a Firebase Timestamp
                  createdDate = content.createdAt.toDate();
                } else {
                  // It's a regular Date or timestamp number or string
                  createdDate = new Date(content.createdAt as any);
                }
              }
            } catch (e) {
              console.error('Error converting timestamp:', e);
            }
            
            return {
              id: content.id as string, // We've filtered out undefined ids
              title: content.title,
              contentType: content.contentType,
              platform: content.platform,
              persona: content.persona,
              createdAt: createdDate,
              metrics: generateMockMetrics(
                content.contentType,
                content.persona,
                createdDate
              )
            };
          });
        
        setAnalyticsData(analytics);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAnalytics();
  }, [getAllContent]);
  
  // Helper function to generate mock metrics
  const generateMockMetrics = (contentType: string, persona: string, createdAt: Date): ContentMetrics => {
    // Base metrics - slightly randomized
    let baseViews = Math.floor(Math.random() * 500) + 100;
    let baseEngagements = Math.floor(baseViews * (Math.random() * 0.3 + 0.1)); // 10-40% engagement rate
    let baseShares = Math.floor(baseEngagements * (Math.random() * 0.3 + 0.05)); // 5-35% share rate
    let baseComments = Math.floor(baseEngagements * (Math.random() * 0.2 + 0.02)); // 2-22% comment rate
    let baseConversions = Math.floor(baseViews * (Math.random() * 0.05 + 0.01)); // 1-6% conversion rate
    
    // Boost metrics for certain content types
    if (contentType === 'social-post') {
      baseViews *= 1.5;
      baseShares *= 2;
    } else if (contentType === 'blog-post') {
      baseViews *= 0.8;
      baseEngagements *= 1.2;
      baseConversions *= 1.5;
    } else if (contentType.includes('video') || contentType.includes('youtube')) {
      baseViews *= 2;
      baseEngagements *= 1.3;
      baseComments *= 1.8;
    }
    
    // Boost metrics for certain personas
    if (persona === 'ariastar') {
      baseEngagements *= 1.4;
      baseComments *= 1.5;
    } else if (persona === 'specialist_mentor') {
      baseConversions *= 1.7;
    } else if (persona === 'data_visualizer') {
      baseViews *= 1.2;
      baseShares *= 1.3;
    }
    
    // Recency bias - newer content gets fewer metrics
    const daysSinceCreation = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    const maturityFactor = Math.min(1, daysSinceCreation / 14); // Content takes up to 14 days to reach full potential
    
    return {
      views: Math.floor(baseViews * maturityFactor),
      engagements: Math.floor(baseEngagements * maturityFactor),
      shares: Math.floor(baseShares * maturityFactor),
      comments: Math.floor(baseComments * maturityFactor),
      conversions: Math.floor(baseConversions * maturityFactor)
    };
  };
  
  // Filter analytics data by timeframe
  const getFilteredData = (): ContentAnalytics[] => {
    if (timeframe === 'all') {
      return analyticsData;
    }
    
    const cutoffDate = new Date();
    if (timeframe === '7days') {
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else if (timeframe === '30days') {
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    } else if (timeframe === '90days') {
      cutoffDate.setDate(cutoffDate.getDate() - 90);
    }
    
    return analyticsData.filter(item => item.createdAt >= cutoffDate);
  };
  
  // Prepare data for content type comparison chart
  const prepareContentTypeChartData = () => {
    const filteredData = getFilteredData();
    const contentTypeSet = new Set<string>(filteredData.map(item => item.contentType));
    const contentTypes = Array.from(contentTypeSet);
    
    return {
      labels: contentTypes.map(type => type.replace('-', ' ')),
      datasets: [
        {
          label: `Average ${selectedMetric}`,
          data: contentTypes.map(type => {
            const typeItems = filteredData.filter(item => item.contentType === type);
            const sum = typeItems.reduce((acc, item) => acc + item.metrics[selectedMetric], 0);
            return typeItems.length ? Math.round(sum / typeItems.length) : 0;
          }),
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          borderColor: 'rgb(53, 162, 235)',
          borderWidth: 1
        }
      ]
    };
  };
  
  // Prepare data for persona comparison chart
  const preparePersonaChartData = () => {
    const filteredData = getFilteredData();
    const personaSet = new Set<string>(filteredData.map(item => item.persona));
    const personas = Array.from(personaSet);
    
    return {
      labels: personas.map(persona => {
        switch (persona) {
          case 'ariastar': return 'AriaStar';
          case 'specialist_mentor': return 'MentorPro';
          case 'data_visualizer': return 'DataStory';
          default: return persona.charAt(0).toUpperCase() + persona.slice(1);
        }
      }),
      datasets: [
        {
          label: `Average ${selectedMetric}`,
          data: personas.map(persona => {
            const personaItems = filteredData.filter(item => item.persona === persona);
            const sum = personaItems.reduce((acc, item) => acc + item.metrics[selectedMetric], 0);
            return personaItems.length ? Math.round(sum / personaItems.length) : 0;
          }),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(199, 199, 199, 0.6)',
            'rgba(83, 102, 255, 0.6)',
            'rgba(40, 159, 64, 0.6)',
            'rgba(210, 199, 199, 0.6)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(199, 199, 199, 1)',
            'rgba(83, 102, 255, 1)',
            'rgba(40, 159, 64, 1)',
            'rgba(210, 199, 199, 1)',
          ],
          borderWidth: 1
        }
      ]
    };
  };
  
  // Prepare data for engagement trend chart
  const prepareTrendChartData = () => {
    const filteredData = getFilteredData();
    
    // Create a date-based lookup for metrics
    const dateMap = new Map<string, { count: number, total: number }>();
    
    // Set up date range based on timeframe
    const endDate = new Date();
    const startDate = new Date();
    if (timeframe === '7days') {
      startDate.setDate(endDate.getDate() - 7);
    } else if (timeframe === '30days') {
      startDate.setDate(endDate.getDate() - 30);
    } else if (timeframe === '90days') {
      startDate.setDate(endDate.getDate() - 90);
    } else {
      // 'all' - use the earliest content date or 90 days, whichever is farther
      const earliest = new Date(Math.min(...filteredData.map(item => item.createdAt.getTime())));
      startDate.setDate(Math.min(earliest.getDate(), endDate.getDate() - 90));
    }
    
    // Populate the date range
    const labels: string[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      labels.push(dateKey);
      dateMap.set(dateKey, { count: 0, total: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Aggregate metrics by date
    filteredData.forEach(item => {
      const dateKey = item.createdAt.toISOString().split('T')[0];
      if (dateMap.has(dateKey)) {
        const current = dateMap.get(dateKey)!;
        dateMap.set(dateKey, {
          count: current.count + 1,
          total: current.total + item.metrics[selectedMetric]
        });
      }
    });
    
    // Convert to averages
    const data = labels.map(label => {
      const info = dateMap.get(label)!;
      return info.count ? info.total / info.count : 0;
    });
    
    return {
      labels,
      datasets: [
        {
          label: `Average ${selectedMetric} over time`,
          data,
          fill: true,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.4
        }
      ]
    };
  };
  
  // Calculate summary statistics
  const calculateSummaryStats = () => {
    const filteredData = getFilteredData();
    
    if (!filteredData.length) {
      return {
        totalViews: 0,
        totalEngagements: 0,
        engagementRate: 0,
        totalShares: 0,
        totalComments: 0,
        totalConversions: 0,
        conversionRate: 0
      };
    }
    
    const totalViews = filteredData.reduce((sum, item) => sum + item.metrics.views, 0);
    const totalEngagements = filteredData.reduce((sum, item) => sum + item.metrics.engagements, 0);
    const totalShares = filteredData.reduce((sum, item) => sum + item.metrics.shares, 0);
    const totalComments = filteredData.reduce((sum, item) => sum + item.metrics.comments, 0);
    const totalConversions = filteredData.reduce((sum, item) => sum + item.metrics.conversions, 0);
    
    return {
      totalViews,
      totalEngagements,
      engagementRate: totalViews ? (totalEngagements / totalViews) * 100 : 0,
      totalShares,
      totalComments,
      totalConversions,
      conversionRate: totalViews ? (totalConversions / totalViews) * 100 : 0
    };
  };
  
  const summaryStats = calculateSummaryStats();
  
  // Get top performing content
  const getTopPerformingContent = () => {
    const filteredData = getFilteredData();
    return [...filteredData].sort((a, b) => b.metrics[selectedMetric] - a.metrics[selectedMetric]).slice(0, 5);
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Content Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track performance metrics for your content across platforms and personas
          </p>
        </div>
        
        <div className="p-4">
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Timeframe
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as any)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Metric
              </label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as keyof ContentMetrics)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="views">Views</option>
                <option value="engagements">Engagements</option>
                <option value="shares">Shares</option>
                <option value="comments">Comments</option>
                <option value="conversions">Conversions</option>
              </select>
            </div>
          </div>
          
          {isLoading ? (
            <div className="py-20 text-center">
              <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600 dark:text-gray-400">Loading analytics data...</p>
            </div>
          ) : analyticsData.length === 0 ? (
            <div className="py-20 text-center">
              <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No analytics data yet</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Start creating and publishing content to see performance metrics and insights.
              </p>
            </div>
          ) : (
            <>
              {/* Summary metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Views</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.totalViews.toLocaleString()}</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Engagement Rate</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.engagementRate.toFixed(1)}%</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Shares</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.totalShares.toLocaleString()}</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Conversion Rate</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.conversionRate.toFixed(2)}%</p>
                </div>
              </div>
              
              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-md font-medium text-gray-800 dark:text-white mb-4">Performance by Content Type</h3>
                  <div className="h-64">
                    <Bar data={prepareContentTypeChartData()} options={{ maintainAspectRatio: false }} />
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-md font-medium text-gray-800 dark:text-white mb-4">Performance by Persona</h3>
                  <div className="h-64">
                    <Pie data={preparePersonaChartData()} options={{ maintainAspectRatio: false }} />
                  </div>
                </div>
              </div>
              
              {/* Trend chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-8">
                <h3 className="text-md font-medium text-gray-800 dark:text-white mb-4">Performance Trend</h3>
                <div className="h-64">
                  <Line data={prepareTrendChartData()} options={{ maintainAspectRatio: false }} />
                </div>
              </div>
              
              {/* Top performing content */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-md font-medium text-gray-800 dark:text-white mb-4">Top Performing Content</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Content</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Persona</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Views</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Engagements</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Conversions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {getTopPerformingContent().map((content) => (
                        <tr key={content.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{content.title}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(content.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {content.contentType.replace('-', ' ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {content.persona === 'ariastar' ? 'AriaStar' : 
                             content.persona === 'specialist_mentor' ? 'MentorPro' : 
                             content.persona.charAt(0).toUpperCase() + content.persona.slice(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {content.metrics.views.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {content.metrics.engagements.toLocaleString()} 
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                              ({((content.metrics.engagements / content.metrics.views) * 100).toFixed(1)}%)
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {content.metrics.conversions.toLocaleString()}
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                              ({((content.metrics.conversions / content.metrics.views) * 100).toFixed(2)}%)
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentAnalyticsDashboard; 