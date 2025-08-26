import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Personnel {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  agency: string;
  status: 'active' | 'inactive' | 'pending';
  joinDate: string;
  agencyId?: string;
  password?: string; // Only stored temporarily during signup
}

interface PersonnelContextType {
  personnel: Personnel[];
  addPersonnel: (person: Omit<Personnel, 'id' | 'status' | 'joinDate'>) => Promise<void>;
  updatePersonnelStatus: (id: string, status: 'active' | 'inactive' | 'pending') => Promise<void>;
  deletePersonnel: (id: string) => Promise<void>;
  getPersonnelByEmail: (email: string) => Personnel | undefined;
  loadPersonnel: () => Promise<void>;
}

const PersonnelContext = createContext<PersonnelContextType | undefined>(undefined);

export const usePersonnel = () => {
  const context = useContext(PersonnelContext);
  if (!context) {
    throw new Error('usePersonnel must be used within a PersonnelProvider');
  }
  return context;
};

export const PersonnelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);

  const loadPersonnel = async () => {
    try {
      // Fetch users from Supabase with their agency information
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          agencies (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading personnel:', error);
        return;
      }

      // Transform the data to match our Personnel interface
      const transformedPersonnel: Personnel[] = data.map(user => ({
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        agency: user.agencies?.name || 'Non assignée',
        agencyId: user.agency_id,
        status: user.status,
        joinDate: new Date(user.created_at).toISOString().split('T')[0],
      }));

      setPersonnel(transformedPersonnel);
    } catch (error) {
      console.error('Error loading personnel:', error);
    }
  };

  const addPersonnel = async (person: Omit<Personnel, 'id' | 'status' | 'joinDate'>) => {
    try {
      // Create user in Supabase
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: person.email,
          full_name: person.fullName,
          phone: person.phone,
          role: person.role as 'admin' | 'agent_comptable' | 'chef_agence',
          agency_id: person.agencyId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding personnel:', error);
        throw error;
      }

      // Reload personnel to get the updated list
      await loadPersonnel();
    } catch (error) {
      console.error('Error adding personnel:', error);
      throw error;
    }
  };

  const updatePersonnelStatus = async (id: string, status: 'active' | 'inactive' | 'pending') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status })
        .eq('id', id);

      if (error) {
        console.error('Error updating personnel status:', error);
        throw error;
      }

      // Update local state
      const updatedPersonnel = personnel.map(person =>
        person.id === id ? { ...person, status } : person
      );
      setPersonnel(updatedPersonnel);
    } catch (error) {
      console.error('Error updating personnel status:', error);
      throw error;
    }
  };

  const getPersonnelByEmail = (email: string) => {
    return personnel.find(person => person.email === email);
  };

  const deletePersonnel = async (id: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting personnel:', error);
        throw error;
      }

      // Update local state
      const updatedPersonnel = personnel.filter(person => person.id !== id);
      setPersonnel(updatedPersonnel);
    } catch (error) {
      console.error('Error deleting personnel:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadPersonnel();
  }, []);

  return (
    <PersonnelContext.Provider
      value={{
        personnel,
        addPersonnel,
        updatePersonnelStatus,
        deletePersonnel,
        getPersonnelByEmail,
        loadPersonnel,
      }}
    >
      {children}
    </PersonnelContext.Provider>
  );
};