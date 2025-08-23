/*
  # Création des tables pour Original Express

  1. Nouvelles Tables
    - `users` - Utilisateurs de l'application
    - `voyages` - Enregistrements des voyages
    - `agencies` - Agences de transport
    - `personnel` - Personnel de l'entreprise
    - `messages` - Messages de la messagerie
    - `chat_groups` - Groupes de discussion
    - `group_members` - Membres des groupes

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques d'accès appropriées pour chaque rôle
*/

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'agent_comptable', 'chef_agence')),
  phone text,
  agency text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des voyages
CREATE TABLE IF NOT EXISTS voyages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_chauffeur text NOT NULL,
  numero_vehicule text NOT NULL,
  numero_bordereau text NOT NULL UNIQUE,
  recette_brute numeric NOT NULL DEFAULT 0,
  retenue numeric NOT NULL DEFAULT 0,
  nombre_places integer NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  agence text NOT NULL,
  ville text NOT NULL,
  agent_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des agences
CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  email text,
  manager text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table du personnel
CREATE TABLE IF NOT EXISTS personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  role text NOT NULL,
  agency text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
  join_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des groupes de discussion
CREATE TABLE IF NOT EXISTS chat_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des membres des groupes
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Table des messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES users(id),
  receiver_id uuid REFERENCES users(id),
  group_id uuid REFERENCES chat_groups(id),
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice')),
  file_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (
    (receiver_id IS NOT NULL AND group_id IS NULL) OR 
    (receiver_id IS NULL AND group_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE voyages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour users
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users" ON users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Politiques RLS pour voyages
CREATE POLICY "Users can read own voyages" ON voyages
  FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Admins can read all voyages" ON voyages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can insert own voyages" ON voyages
  FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Users can update own voyages" ON voyages
  FOR UPDATE TO authenticated
  USING (agent_id = auth.uid());

-- Politiques RLS pour agencies (admin seulement)
CREATE POLICY "Admins can manage agencies" ON agencies
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Politiques RLS pour personnel (admin seulement)
CREATE POLICY "Admins can manage personnel" ON personnel
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Politiques RLS pour messages
CREATE POLICY "Users can read their messages" ON messages
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid() OR 
    receiver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = messages.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Politiques RLS pour chat_groups
CREATE POLICY "Users can read groups they belong to" ON chat_groups
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = chat_groups.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups" ON chat_groups
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Politiques RLS pour group_members
CREATE POLICY "Users can read group memberships" ON group_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM chat_groups 
      WHERE id = group_members.group_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Group creators can manage members" ON group_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_groups 
      WHERE id = group_members.group_id AND created_by = auth.uid()
    )
  );

-- Insérer l'utilisateur admin par défaut
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  'admin@gmail.com',
  crypt('admin1234', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Administrateur"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Insérer l'utilisateur admin dans la table users
INSERT INTO users (
  email,
  full_name,
  role,
  agency
) VALUES (
  'admin@gmail.com',
  'Administrateur',
  'admin',
  'ORIGINAL EXPRESS'
) ON CONFLICT (email) DO NOTHING;

-- Créer un bucket pour les fichiers de messagerie
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-files', 'message-files', false)
ON CONFLICT (id) DO NOTHING;

-- Politique pour le storage des fichiers de messagerie
CREATE POLICY "Users can upload message files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-files');

CREATE POLICY "Users can read message files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'message-files');

CREATE POLICY "Users can delete own message files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'message-files' AND owner = auth.uid());