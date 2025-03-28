"use client";

import React, { useState } from 'react';
import { useLeads } from '@/lib/hooks/useLeads';
import { useToast } from '@/lib/hooks/useToast';
import { Lead } from '@/lib/firebase/leadRepository';
import Link from 'next/link';

interface LeadManagementDashboardProps {
  contentId?: string; // Optional: filter leads by content
}

const LeadManagementDashboard: React.FC<LeadManagementDashboardProps> = ({ contentId }) => {
  const [statusFilter, setStatusFilter] = useState<Lead['status'] | 'all'>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [notes, setNotes] = useState('');
  
  const { leads, isLoading, error, updateStatus, addTag, removeTag, refreshLeads } = useLeads({ 
    contentId, 
    status: statusFilter !== 'all' ? statusFilter : undefined
  });
  
  const { toast } = useToast();
  
  const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    try {
      setIsUpdating(true);
      await updateStatus(leadId, newStatus, selectedLead?.notes);
      toast({
        title: 'Status Updated',
        description: `Lead status successfully changed to ${newStatus}`,
        variant: 'success'
      });
      
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update lead status',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleTagAdd = async (leadId: string, tag: string) => {
    if (!tag.trim()) return;
    
    try {
      setIsUpdating(true);
      await addTag(leadId, tag.trim().toLowerCase().replace(/\s+/g, '-'));
      toast({
        title: 'Tag Added',
        description: `Tag "${tag}" added to lead`,
        variant: 'success'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add tag',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleTagRemove = async (leadId: string, tag: string) => {
    try {
      setIsUpdating(true);
      await removeTag(leadId, tag);
      toast({
        title: 'Tag Removed',
        description: `Tag "${tag}" removed from lead`,
        variant: 'success'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove tag',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
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
  
  // Return different layouts based on loading/error states
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading leads...</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="p-4 mb-4 text-red-800 bg-red-100 rounded-lg dark:text-red-200 dark:bg-red-900">
          <p>{error}</p>
        </div>
        <button 
          className="mt-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded" 
          onClick={() => refreshLeads()}
        >
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Leads Management</h3>
            
            {/* Status filter */}
            <div className="mt-3 md:mt-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {contentId 
              ? 'Leads generated from this content' 
              : 'Manage and track your leads through the sales process'}
          </p>
          
          {/* Lead count */}
          <div className="flex items-center mb-2">
            <span className="text-gray-600 dark:text-gray-400 text-sm mr-2">Total:</span>
            <span className="bg-primary-100 text-primary-800 text-xs font-semibold px-2.5 py-0.5 rounded-full dark:bg-primary-900 dark:text-primary-300">
              {leads.length} {leads.length === 1 ? 'Lead' : 'Leads'}
            </span>
          </div>
        </div>
        
        {/* Leads table */}
        <div className="overflow-x-auto">
          {leads.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No leads found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {statusFilter !== 'all'
                  ? `You don't have any leads with ${statusFilter} status.`
                  : contentId
                    ? 'No leads have been generated from this content yet.'
                    : 'Start capturing leads to see them appear here.'}
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Lead Info
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Source
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {leads.map((lead) => (
                  <tr 
                    key={lead.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedLead?.id === lead.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {lead.firstName} {lead.lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {lead.email}
                          </div>
                          {lead.phone && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white capitalize">
                        {lead.source.source}
                      </div>
                      {lead.source.campaign && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Campaign: {lead.source.campaign}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(lead.status)}`}>
                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        {selectedLead?.id === lead.id ? 'Close' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Lead details panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {selectedLead ? (
          <div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lead Details</h3>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 -mx-6 px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Contact Information</h4>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedLead.firstName} {selectedLead.lastName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{selectedLead.email}</p>
                  {selectedLead.phone && <p className="text-sm text-gray-600 dark:text-gray-300">{selectedLead.phone}</p>}
                  {selectedLead.company && <p className="text-sm text-gray-600 dark:text-gray-300">{selectedLead.company}</p>}
                  {selectedLead.jobTitle && <p className="text-sm text-gray-600 dark:text-gray-300">{selectedLead.jobTitle}</p>}
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Lead Source</h4>
                  <p className="text-sm text-gray-900 dark:text-white font-medium capitalize">{selectedLead.source.source}</p>
                  {selectedLead.source.campaign && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">Campaign: {selectedLead.source.campaign}</p>
                  )}
                  {selectedLead.source.medium && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">Medium: {selectedLead.source.medium}</p>
                  )}
                  {selectedLead.source.referrer && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">Referrer: {selectedLead.source.referrer}</p>
                  )}
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Status</h4>
                <select
                  value={selectedLead.status}
                  onChange={(e) => handleStatusChange(selectedLead.id!, e.target.value as Lead['status'])}
                  disabled={isUpdating}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Tags</h4>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedLead.tags && selectedLead.tags.length > 0 ? (
                    selectedLead.tags.map((tag) => (
                      <span 
                        key={tag} 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleTagRemove(selectedLead.id!, tag)}
                          disabled={isUpdating}
                          className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">No tags</span>
                  )}
                </div>
                
                <div className="mt-2 flex">
                  <input
                    type="text"
                    placeholder="Add a tag"
                    className="flex-1 focus:ring-primary-500 focus:border-primary-500 block w-full min-w-0 rounded-l-md sm:text-sm border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const target = e.target as HTMLInputElement;
                        handleTagAdd(selectedLead.id!, target.value);
                        target.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      const input = (e.target as HTMLButtonElement).previousElementSibling as HTMLInputElement;
                      handleTagAdd(selectedLead.id!, input.value);
                      input.value = '';
                    }}
                    disabled={isUpdating}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Notes</h4>
                <textarea
                  value={notes || selectedLead.notes || ''}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Add notes about this lead..."
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsUpdating(true);
                      await updateStatus(selectedLead.id!, selectedLead.status, notes);
                      toast({
                        title: 'Notes Updated',
                        description: 'Lead notes saved successfully',
                        variant: 'success'
                      });
                      setNotes('');
                    } catch (error) {
                      toast({
                        title: 'Error',
                        description: 'Failed to update notes',
                        variant: 'destructive'
                      });
                    } finally {
                      setIsUpdating(false);
                    }
                  }}
                  disabled={isUpdating || (!notes && !selectedLead.notes)}
                  className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-700"
                >
                  Save Notes
                </button>
              </div>
              
              {selectedLead.associatedContent && selectedLead.associatedContent.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Associated Content</h4>
                  <ul className="space-y-1">
                    {selectedLead.associatedContent.map((contentId) => (
                      <li key={contentId}>
                        <Link 
                          href={`/content/${contentId}`}
                          className="text-sm text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          View Content ({contentId.substring(0, 8)}...)
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No lead selected</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select a lead from the table to view details and manage it
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadManagementDashboard; 