import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://cyaijjxkssppdyxbrtxo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5YWlqanhrc3NwcGR5eGJydHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDI3NjAsImV4cCI6MjA3MTExODc2MH0.3WUokgoqTjagy4WS4lD68Ly9CAzahSgL3-bzdU71a0c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types pour la base de données
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'agent_comptable' | 'chef_agence';
  phone?: string;
  agency?: string; // UUID référençant agencies.id
  status: 'active' | 'inactive' | 'pending';
  join_date: string;
  created_at: string;
  updated_at: string;
}

export interface Voyage {
  id: string;
  nom_chauffeur: string;
  numero_vehicule: string;
  numero_bordereau: string;
  recette_brute: number;
  retenue: number;
  nombre_places: number;
  date: string;
  agence: string; // UUID référençant agencies.id
  ville: string;
  agent_id: string; // UUID référençant users.id
  created_at: string;
  updated_at: string;
}

export interface Agency {
  id: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  manager: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string;
  group_id?: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'voice';
  file_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
}

// Fonction utilitaire pour uploader des fichiers vers Supabase Storage
export const uploadFile = async (file: any, fileName: string, bucket: string = 'message-files') => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
};

// Fonction utilitaire pour récupérer les agences
export const getAgencies = async () => {
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching agencies:', error);
    return [];
  }
  
  return data || [];
};