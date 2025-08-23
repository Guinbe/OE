import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

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
  agency?: string;
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
  agence: string;
  ville: string;
  agent_id: string;
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

export interface Personnel {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  agency: string;
  status: 'active' | 'inactive' | 'pending';
  join_date: string;
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