/*
  # Unification des tables users et personnel

  1. Modifications des Tables
    - Suppression de la table `personnel` (redondante avec `users`)
    - Ajout du champ `status` à la table `users`
    - Modification du champ `agency` pour référencer l'ID de la table `agencies`
    - Ajout du champ `join_date` à la table `users`

  2. Relations
    - `users.agency` → `agencies.id` (foreign key)
    - Simplification des relations

  3. Sécurité
    - Mise à jour des politiques RLS
    - Suppression des politiques de la table `personnel`
*/

-- Supprimer la table personnel (redondante avec users)
DROP TABLE IF EXISTS personnel CASCADE;

-- Ajouter les champs manquants à la table users
DO $$
BEGIN
  -- Ajouter le champ status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'status'
  ) THEN
    ALTER TABLE users ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending'));
  END IF;

  -- Ajouter le champ join_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'join_date'
  ) THEN
    ALTER TABLE users ADD COLUMN join_date date NOT NULL DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Modifier le champ agency pour qu'il soit un UUID référençant agencies.id
-- D'abord, on sauvegarde les données existantes
CREATE TEMP TABLE temp_user_agencies AS
SELECT id, agency FROM users WHERE agency IS NOT NULL;

-- Modifier le type du champ agency
ALTER TABLE users DROP COLUMN IF EXISTS agency;
ALTER TABLE users ADD COLUMN agency uuid REFERENCES agencies(id);

-- Insérer quelques agences par défaut si elles n'existent pas
INSERT INTO agencies (id, name, address, phone, manager) VALUES
  ('11111111-1111-1111-1111-111111111111', 'ORIGINAL EXPRESS - Siège', 'Douala, Cameroun', '+237 6 90 12 34 56', 'Directeur Général'),
  ('22222222-2222-2222-2222-222222222222', 'Agence Yaoundé', 'Yaoundé, Cameroun', '+237 6 90 12 34 57', 'Chef Agence Yaoundé'),
  ('33333333-3333-3333-3333-333333333333', 'Agence Maroua', 'Maroua, Cameroun', '+237 6 90 12 34 58', 'Chef Agence Maroua'),
  ('44444444-4444-4444-4444-444444444444', 'Agence Kribi', 'Kribi, Cameroun', '+237 6 90 12 34 59', 'Chef Agence Kribi'),
  ('55555555-5555-5555-5555-555555555555', 'Agence Bafoussam', 'Bafoussam, Cameroun', '+237 6 90 12 34 60', 'Chef Agence Bafoussam')
ON CONFLICT (id) DO NOTHING;

-- Mettre à jour l'utilisateur admin avec l'agence siège
UPDATE users 
SET agency = '11111111-1111-1111-1111-111111111111',
    status = 'active'
WHERE email = 'admin@gmail.com';

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_agency ON users(agency);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Mettre à jour les politiques RLS pour inclure les nouvelles fonctionnalités
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Nouvelles politiques RLS pour users (incluant les fonctionnalités personnel)
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

CREATE POLICY "Admins can manage all users" ON users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can insert with verification" ON users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);