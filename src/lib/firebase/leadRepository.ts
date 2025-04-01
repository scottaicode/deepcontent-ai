import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  Timestamp,
  limit as firestoreLimit
} from 'firebase/firestore';

export interface LeadSource {
  contentId?: string;
  source: string;
  campaign?: string;
  medium?: string;
  referrer?: string;
}

export interface Lead {
  id?: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  notes?: string;
  tags?: string[];
  source: LeadSource;
  associatedContent?: string[]; // Content IDs associated with this lead
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  lastContactedAt?: Timestamp;
}

// Save a new lead to Firestore
export const saveLead = async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const leadData = {
      ...lead,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'leads'), leadData);
    return docRef.id;
  } catch (error) {
    console.error('Error saving lead:', error);
    throw new Error('Failed to save lead');
  }
};

// Get a lead by ID
export const getLeadById = async (leadId: string): Promise<Lead | null> => {
  try {
    const docRef = doc(db, 'leads', leadId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Lead;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting lead:', error);
    throw new Error('Failed to fetch lead');
  }
};

// Get leads for a specific user
export const getUserLeads = async (
  userId: string, 
  status?: Lead['status'], 
  tag?: string,
  limit?: number
): Promise<Lead[]> => {
  try {
    let q = query(
      collection(db, 'leads'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    if (status) {
      q = query(q, where('status', '==', status));
    }
    
    if (tag) {
      q = query(q, where('tags', 'array-contains', tag));
    }
    
    if (limit) {
      q = query(q, firestoreLimit(limit));
    }
    
    const querySnapshot = await getDocs(q);
    const leads: Lead[] = [];
    
    querySnapshot.forEach((doc) => {
      leads.push({ id: doc.id, ...doc.data() } as Lead);
    });
    
    return leads;
  } catch (error) {
    console.error('Error getting leads:', error);
    throw new Error('Failed to fetch leads');
  }
};

// Get leads associated with a specific content
export const getLeadsByContent = async (
  userId: string,
  contentId: string
): Promise<Lead[]> => {
  try {
    const q = query(
      collection(db, 'leads'),
      where('userId', '==', userId),
      where('associatedContent', 'array-contains', contentId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const leads: Lead[] = [];
    
    querySnapshot.forEach((doc) => {
      leads.push({ id: doc.id, ...doc.data() } as Lead);
    });
    
    return leads;
  } catch (error) {
    console.error('Error getting leads by content:', error);
    throw new Error('Failed to fetch leads by content');
  }
};

// Update an existing lead
export const updateLead = async (
  leadId: string,
  data: Partial<Omit<Lead, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  try {
    const leadRef = doc(db, 'leads', leadId);
    
    await updateDoc(leadRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    throw new Error('Failed to update lead');
  }
};

// Delete a lead
export const deleteLead = async (leadId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'leads', leadId));
  } catch (error) {
    console.error('Error deleting lead:', error);
    throw new Error('Failed to delete lead');
  }
};

// Mark lead as contacted
export const markLeadAsContacted = async (leadId: string, notes?: string): Promise<void> => {
  try {
    const leadRef = doc(db, 'leads', leadId);
    
    await updateDoc(leadRef, {
      status: 'contacted',
      lastContactedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      notes: notes ? notes : null
    });
  } catch (error) {
    console.error('Error marking lead as contacted:', error);
    throw new Error('Failed to update lead status');
  }
};

// Update lead status
export const updateLeadStatus = async (
  leadId: string, 
  status: Lead['status'],
  notes?: string
): Promise<void> => {
  try {
    const leadRef = doc(db, 'leads', leadId);
    
    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    };
    
    if (status === 'contacted') {
      updateData.lastContactedAt = serverTimestamp();
    }
    
    if (notes) {
      updateData.notes = notes;
    }
    
    await updateDoc(leadRef, updateData);
  } catch (error) {
    console.error('Error updating lead status:', error);
    throw new Error('Failed to update lead status');
  }
};

// Add a tag to a lead
export const addTagToLead = async (leadId: string, tag: string): Promise<void> => {
  try {
    const leadRef = doc(db, 'leads', leadId);
    const leadDoc = await getDoc(leadRef);
    
    if (!leadDoc.exists()) {
      throw new Error('Lead not found');
    }
    
    const leadData = leadDoc.data();
    const currentTags = leadData.tags || [];
    
    if (!currentTags.includes(tag)) {
      await updateDoc(leadRef, {
        tags: [...currentTags, tag],
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error adding tag to lead:', error);
    throw new Error('Failed to add tag to lead');
  }
};

// Remove a tag from a lead
export const removeTagFromLead = async (leadId: string, tag: string): Promise<void> => {
  try {
    const leadRef = doc(db, 'leads', leadId);
    const leadDoc = await getDoc(leadRef);
    
    if (!leadDoc.exists()) {
      throw new Error('Lead not found');
    }
    
    const leadData = leadDoc.data();
    const currentTags = leadData.tags || [];
    
    await updateDoc(leadRef, {
      tags: currentTags.filter((t: string) => t !== tag),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error removing tag from lead:', error);
    throw new Error('Failed to remove tag from lead');
  }
};

// Associate a lead with content
export const associateLeadWithContent = async (leadId: string, contentId: string): Promise<void> => {
  try {
    const leadRef = doc(db, 'leads', leadId);
    const leadDoc = await getDoc(leadRef);
    
    if (!leadDoc.exists()) {
      throw new Error('Lead not found');
    }
    
    const leadData = leadDoc.data();
    const associatedContent = leadData.associatedContent || [];
    
    if (!associatedContent.includes(contentId)) {
      await updateDoc(leadRef, {
        associatedContent: [...associatedContent, contentId],
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error associating lead with content:', error);
    throw new Error('Failed to associate lead with content');
  }
}; 