import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  Lead,
  saveLead,
  getLeadById,
  getUserLeads,
  getLeadsByContent,
  updateLead,
  deleteLead,
  markLeadAsContacted,
  updateLeadStatus,
  addTagToLead,
  removeTagFromLead,
  associateLeadWithContent
} from '../firebase/leadRepository';

interface UseLeadsProps {
  leadId?: string;
  status?: Lead['status'];
  tag?: string;
  contentId?: string;
  limit?: number;
}

interface UseLeadsReturn {
  lead: Lead | null;
  leads: Lead[];
  isLoading: boolean;
  error: string | null;
  saveLead: (leadData: Omit<Lead, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
  updateLead: (id: string, data: Partial<Omit<Lead, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  markAsContacted: (id: string, notes?: string) => Promise<void>;
  updateStatus: (id: string, status: Lead['status'], notes?: string) => Promise<void>;
  addTag: (id: string, tag: string) => Promise<void>;
  removeTag: (id: string, tag: string) => Promise<void>;
  associateWithContent: (id: string, contentId: string) => Promise<void>;
  refreshLeads: () => Promise<void>;
}

export function useLeads({ leadId, status, tag, contentId, limit }: UseLeadsProps = {}): UseLeadsReturn {
  const { user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch a single lead by ID
  const fetchLeadById = useCallback(async () => {
    if (!leadId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const fetchedLead = await getLeadById(leadId);
      setLead(fetchedLead);
    } catch (err) {
      console.error('Error fetching lead by ID:', err);
      setError('Failed to fetch lead');
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  // Fetch leads list for the current user
  const fetchLeads = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      let fetchedLeads: Lead[] = [];
      
      if (contentId) {
        // Fetch leads associated with specific content
        fetchedLeads = await getLeadsByContent(user.uid, contentId);
      } else {
        // Fetch leads with optional filters
        fetchedLeads = await getUserLeads(user.uid, status, tag, limit);
      }
      
      setLeads(fetchedLeads);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError('Failed to fetch leads');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, status, tag, contentId, limit]);

  // Refresh lead data
  const refreshLeads = useCallback(async () => {
    if (leadId) {
      await fetchLeadById();
    } else {
      await fetchLeads();
    }
  }, [leadId, fetchLeadById, fetchLeads]);

  // Save new lead
  const saveNewLead = useCallback(async (leadData: Omit<Lead, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
    if (!user?.uid) {
      setError('User must be logged in to save lead');
      return null;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const newLeadId = await saveLead({
        ...leadData,
        userId: user.uid
      });
      
      // Refresh leads list after saving
      await refreshLeads();
      
      return newLeadId;
    } catch (err) {
      console.error('Error saving lead:', err);
      setError('Failed to save lead');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, refreshLeads]);

  // Update existing lead
  const updateExistingLead = useCallback(async (id: string, data: Partial<Omit<Lead, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await updateLead(id, data);
      
      // Refresh leads after updating
      await refreshLeads();
    } catch (err) {
      console.error('Error updating lead:', err);
      setError('Failed to update lead');
    } finally {
      setIsLoading(false);
    }
  }, [refreshLeads]);

  // Delete lead
  const deleteExistingLead = useCallback(async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await deleteLead(id);
      
      // Refresh leads list after deleting
      await refreshLeads();
    } catch (err) {
      console.error('Error deleting lead:', err);
      setError('Failed to delete lead');
    } finally {
      setIsLoading(false);
    }
  }, [refreshLeads]);

  // Mark lead as contacted
  const markAsContacted = useCallback(async (id: string, notes?: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await markLeadAsContacted(id, notes);
      
      // Refresh leads after updating
      await refreshLeads();
    } catch (err) {
      console.error('Error marking lead as contacted:', err);
      setError('Failed to update lead status');
    } finally {
      setIsLoading(false);
    }
  }, [refreshLeads]);

  // Update lead status
  const updateStatus = useCallback(async (id: string, status: Lead['status'], notes?: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await updateLeadStatus(id, status, notes);
      
      // Refresh leads after updating
      await refreshLeads();
    } catch (err) {
      console.error('Error updating lead status:', err);
      setError('Failed to update lead status');
    } finally {
      setIsLoading(false);
    }
  }, [refreshLeads]);

  // Add tag to lead
  const addTag = useCallback(async (id: string, tag: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await addTagToLead(id, tag);
      
      // Refresh leads after updating
      await refreshLeads();
    } catch (err) {
      console.error('Error adding tag to lead:', err);
      setError('Failed to add tag to lead');
    } finally {
      setIsLoading(false);
    }
  }, [refreshLeads]);

  // Remove tag from lead
  const removeTag = useCallback(async (id: string, tag: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await removeTagFromLead(id, tag);
      
      // Refresh leads after updating
      await refreshLeads();
    } catch (err) {
      console.error('Error removing tag from lead:', err);
      setError('Failed to remove tag from lead');
    } finally {
      setIsLoading(false);
    }
  }, [refreshLeads]);

  // Associate lead with content
  const associateWithContent = useCallback(async (id: string, contentId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await associateLeadWithContent(id, contentId);
      
      // Refresh leads after updating
      await refreshLeads();
    } catch (err) {
      console.error('Error associating lead with content:', err);
      setError('Failed to associate lead with content');
    } finally {
      setIsLoading(false);
    }
  }, [refreshLeads]);

  // Initial data loading
  useEffect(() => {
    if (leadId) {
      fetchLeadById();
    } else {
      fetchLeads();
    }
  }, [leadId, fetchLeadById, fetchLeads]);

  return {
    lead,
    leads,
    isLoading,
    error,
    saveLead: saveNewLead,
    updateLead: updateExistingLead,
    deleteLead: deleteExistingLead,
    markAsContacted,
    updateStatus,
    addTag,
    removeTag,
    associateWithContent,
    refreshLeads
  };
} 