"use client";

import React, { useState, useEffect } from 'react';
import { useLeads } from '@/lib/hooks/useLeads';
import { Lead } from '@/lib/firebase/leadRepository';

interface ContentLeadStatsProps {
  contentId: string;
  className?: string;
}

interface LeadStats {
  total: number;
  byStatus: Record<Lead['status'], number>;
  conversionRate: number;
  recentLeads: Lead[];
}

const ContentLeadStats: React.FC<ContentLeadStatsProps> = ({ contentId, className = '' }) => {
  const { leads, isLoading, error } = useLeads({ contentId });
  const [stats, setStats] = useState<LeadStats>({
    total: 0,
    byStatus: {
      new: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
      lost: 0
    },
    conversionRate: 0,
    recentLeads: []
  });

  // Calculate stats when leads data changes
  useEffect(() => {
    if (leads.length === 0) return;
    
    const byStatus: Record<Lead['status'], number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
      lost: 0
    };
    
    // Count leads by status
    leads.forEach(lead => {
      byStatus[lead.status]++;
    });
    
    // Calculate conversion rate (converted leads / total leads)
    const conversionRate = (byStatus.converted / leads.length) * 100;
    
    // Get most recent 3 leads
    const recentLeads = [...leads]
      .sort((a, b) => {
        const dateA = a.createdAt ? (typeof a.createdAt === 'object' && 'toDate' in a.createdAt ? a.createdAt.toDate().getTime() : new Date(a.createdAt as any).getTime()) : 0;
        const dateB = b.createdAt ? (typeof b.createdAt === 'object' && 'toDate' in b.createdAt ? b.createdAt.toDate().getTime() : new Date(b.createdAt as any).getTime()) : 0;
        return dateB - dateA;
      })
      .slice(0, 3);
    
    setStats({
      total: leads.length,
      byStatus,
      conversionRate,
      recentLeads
    });
  }, [leads]);

  // Format date for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    try {
      // Handle Firebase timestamp
      if (typeof timestamp === 'object' && 'toDate' in timestamp) {
        return timestamp.toDate().toLocaleDateString();
      }
      // Handle regular date or timestamp
      return new Date(timestamp).toLocaleDateString();
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  // Get status badge color
  const getStatusBadgeClass = (status: Lead['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'contacted':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'qualified':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'converted':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case 'lost':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Handle loading and error states
  if (isLoading) {
    return (
      <div className={`p-4 border rounded-lg shadow-sm ${className}`}>
        <div className="flex items-center justify-center py-4">
          <svg className="animate-spin h-5 w-5 text-primary-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading lead statistics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 border rounded-lg shadow-sm ${className}`}>
        <div className="text-red-500 text-center py-2">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Lead Generation</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Statistics for this content</p>
      </div>

      <div className="p-4">
        {leads.length === 0 ? (
          <div className="text-center py-6">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No leads yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This content hasn't generated any leads yet.
            </p>
          </div>
        ) : (
          <>
            {/* Lead count and conversion rate */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Leads</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Conversion Rate</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.conversionRate.toFixed(1)}%</div>
              </div>
            </div>

            {/* Leads by status */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Leads by Status</h4>
              <div className="space-y-2">
                {Object.entries(stats.byStatus).map(([status, count]) => (
                  count > 0 && (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${getStatusBadgeClass(status as Lead['status'])}`}></span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{status}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                    </div>
                  )
                ))}
              </div>
            </div>

            {/* Recent leads */}
            {stats.recentLeads.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Leads</h4>
                <div className="space-y-3">
                  {stats.recentLeads.map((lead) => (
                    <div key={lead.id} className="bg-gray-50 dark:bg-gray-700 rounded-md p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {lead.firstName} {lead.lastName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {lead.email}
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(lead.status)}`}>
                          {lead.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {formatDate(lead.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ContentLeadStats; 