# Transport Management App - Original Express

Application mobile de gestion des transports et inventaire développée avec React Native, Expo et Supabase.

## 🚀 Fonctionnalités

### 🔐 Authentification
- **Connexion sécurisée** avec email et mot de passe via Supabase Auth
- **Inscription** avec validation des champs et **vérification d'email obligatoire**
- **Gestion des rôles** : Admin, Chef d'agence, Agent comptable
- **Statuts utilisateur** : Actif, Inactif, En attente
- **Navigation fluide** entre les écrans d'authentification

### 📊 Dashboard Principal
- **Statistiques en temps réel** avec filtres (jour/semaine/mois)
- **Revenus totaux** et **bénéfices nets**
- **Nombre de places vendues**
- **Activité récente** des conducteurs

### 📋 Gestion d'Inventaire
- **Formulaire complet** d'enregistrement des transports
- **Informations détaillées** : conducteur, véhicule, revenus, déductions
- **Interface intuitive** avec validation des données
- **Export PDF** des rapports d'inventaire

### 💬 Messagerie avec Stockage Supabase
- **Chat de groupe** entre utilisateurs
- **Partage de fichiers** (images, documents, messages vocaux)
- **Stockage sécurisé** des fichiers sur **Supabase Storage**
- **Interface moderne** avec bulles de chat
- **Upload automatique** vers le bucket `message-files`

### 👤 Gestion du Personnel (Unifiée avec Users)
- **Table unique `users`** pour tous les utilisateurs/personnel
- **Gestion des statuts** (actif, inactif, en attente)
- **Relations avec agences** via UUID
- **Filtrage** par statut et recherche
- **Accès restreint** aux administrateurs

### 🏢 Gestion des Agences
- **CRUD complet** des agences
- **Relations** avec utilisateurs via foreign key
- **Informations détaillées** : nom, adresse, téléphone, gestionnaire
- **Interface d'administration** sécurisée

### 📈 Statistiques Avancées
- **Graphiques interactifs** avec React Native Chart Kit
- **Périodes personnalisables**
- **Export PDF** des rapports statistiques
- **Filtrage par rôle utilisateur**

## 🛠 Technologies Utilisées

- **React Native** avec Expo SDK 53
- **TypeScript** pour la sécurité des types
- **Supabase** pour la base de données et l'authentification
- **Supabase Storage** pour le stockage des fichiers
- **Expo Router** pour la navigation
- **React Native Chart Kit** pour les graphiques
- **Expo Print** pour la génération de PDF

## 📦 Installation et Configuration

### Prérequis
- Node.js (v16 ou supérieur)
- Expo CLI
- Compte Supabase

### 🔧 Configuration Supabase

#### 1. Créer un projet Supabase
1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Noter l'URL et la clé API

#### 2. Configuration des Variables d'Environnement
Les variables sont déjà configurées dans `.env` :
```env
EXPO_PUBLIC_SUPABASE_URL=https://cyaijjxkssppdyxbrtxo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5YWlqanhrc3NwcGR5eGJydHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDI3NjAsImV4cCI6MjA3MTExODc2MH0.3WUokgoqTjagy4WS4lD68Ly9CAzahSgL3-bzdU71a0c
```

#### 3. Exécuter les Migrations SQL
**IMPORTANT** : Exécutez les migrations dans l'ordre suivant dans l'éditeur SQL de Supabase :

1. **Première migration** : `supabase/migrations/create_tables.sql`
2. **Deuxième migration** : `supabase/migrations/unify_users_personnel.sql`

```sql
-- 1. Copier et exécuter le contenu de create_tables.sql
-- 2. Puis copier et exécuter le contenu de unify_users_personnel.sql
```

#### 4. Configuration du Storage pour la Messagerie

**Étape 1 : Créer le bucket**
```sql
-- Dans l'éditeur SQL de Supabase
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-files', 'message-files', false)
ON CONFLICT (id) DO NOTHING;
```

**Étape 2 : Configurer les politiques de sécurité**
```sql
-- Politique pour upload
CREATE POLICY "Users can upload message files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-files');

-- Politique pour lecture
CREATE POLICY "Users can read message files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'message-files');

-- Politique pour suppression
CREATE POLICY "Users can delete own message files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'message-files' AND owner = auth.uid());
```

**Étape 3 : Vérification dans l'interface Supabase**
1. Aller dans **Storage** > **Buckets**
2. Vérifier que le bucket `message-files` existe
3. Configurer les politiques si nécessaire

### 📱 Installation des Dépendances

```bash
# Cloner le projet
git clone [url-du-repo]
cd transport-app

# Installer les dépendances
npm install

# Démarrer le projet
npm start
```

## 🗄️ Structure de la Base de Données (Unifiée)

### Tables principales

```sql
users (utilisateurs/personnel unifié)
├── id (uuid, primary key)
├── email (text, unique)
├── full_name (text)
├── role ('admin' | 'agent_comptable' | 'chef_agence')
├── phone (text)
├── agency (uuid, foreign key → agencies.id)
├── status ('active' | 'inactive' | 'pending')
├── join_date (date)
└── timestamps

agencies (agences de transport)
├── id (uuid, primary key)
├── name (text)
├── address (text)
├── phone (text)
├── email (text, optional)
├── manager (text)
└── timestamps

voyages (enregistrements des voyages)
├── id (uuid, primary key)
├── nom_chauffeur (text)
├── numero_vehicule (text)
├── numero_bordereau (text, unique)
├── recette_brute (numeric)
├── retenue (numeric)
├── nombre_places (integer)
├── date (date)
├── agence (uuid, foreign key → agencies.id)
├── ville (text)
├── agent_id (uuid, foreign key → users.id)
└── timestamps

messages (messagerie)
├── id (uuid, primary key)
├── sender_id (uuid, foreign key → users.id)
├── group_id (uuid, foreign key → chat_groups.id)
├── content (text)
├── message_type ('text' | 'image' | 'file' | 'voice')
├── file_url (text, pour Supabase Storage)
└── timestamps

chat_groups (groupes de discussion)
├── id (uuid, primary key)
├── name (text)
├── description (text, optional)
├── created_by (uuid, foreign key → users.id)
└── timestamps

group_members (membres des groupes)
├── id (uuid, primary key)
├── group_id (uuid, foreign key → chat_groups.id)
├── user_id (uuid, foreign key → users.id)
└── joined_at (timestamp)
```

### 🔗 Relations Simplifiées

- **users.agency** → **agencies.id** (Un utilisateur appartient à une agence)
- **voyages.agence** → **agencies.id** (Un voyage est lié à une agence)
- **voyages.agent_id** → **users.id** (Un voyage est enregistré par un agent)
- **messages.sender_id** → **users.id** (Un message a un expéditeur)
- **group_members.user_id** → **users.id** (Liaison utilisateur-groupe)

## 🔐 Sécurité (RLS)

Toutes les tables utilisent **Row Level Security (RLS)** avec des politiques appropriées :

### Politiques Users
- Les utilisateurs peuvent voir leurs propres données
- Les administrateurs ont accès à tous les utilisateurs
- Insertion sécurisée avec vérification d'identité

### Politiques Voyages
- Les agents voient leurs propres voyages
- Les administrateurs voient tous les voyages
- Insertion liée à l'agent connecté

### Politiques Messages
- Accès aux messages des groupes dont l'utilisateur est membre
- Envoi sécurisé avec vérification d'identité

### Politiques Storage
- Upload sécurisé dans le bucket `message-files`
- Lecture autorisée pour tous les utilisateurs authentifiés
- Suppression limitée au propriétaire du fichier

## 👨‍💼 Comptes par Défaut

### Administrateur
- **Email** : `admin@gmail.com`
- **Mot de passe** : `admin1234`
- **Rôle** : Admin (accès complet)
- **Statut** : Actif

## 📱 Guide d'Utilisation

### 🔑 Première Connexion
1. Lancer l'application
2. Utiliser les identifiants admin : `admin@gmail.com` / `admin1234`
3. Ou créer un nouveau compte (vérification email requise)

### 👥 Gestion du Personnel
1. **Connexion admin** requise
2. Aller dans l'onglet "Personnel"
3. Ajouter un employé avec le bouton "+"
4. **Vérification email automatique** envoyée
5. Gérer les statuts (En attente → Actif/Inactif)

### 🚌 Gestion des Voyages
1. Aller dans l'onglet "Inventaire"
2. Cliquer sur "+" pour ajouter un voyage
3. Sélectionner l'agence dans la liste
4. Remplir le formulaire et enregistrer
5. Exporter en PDF si nécessaire

### 💬 Messagerie avec Fichiers
1. Aller dans l'onglet "Messages"
2. Créer un nouveau groupe avec "+"
3. Sélectionner les membres actifs
4. **Partager des fichiers** :
   - 📷 **Images** : Bouton appareil photo
   - 📄 **Documents** : Bouton document
   - 🎤 **Messages vocaux** : Bouton microphone
5. **Stockage automatique** sur Supabase Storage

### 🏢 Gestion des Agences
1. **Accès admin** uniquement
2. Aller dans l'onglet "Agences"
3. Ajouter/modifier/supprimer des agences
4. **Liaison automatique** avec les utilisateurs

### 📊 Statistiques
1. Aller dans l'onglet "Stats"
2. Sélectionner la période (jour, semaine, mois, personnalisé)
3. Consulter les graphiques basés sur les données Supabase
4. Exporter en PDF

## 🔧 Intégration Application-Supabase

### 📤 Upload de Fichiers (Messagerie)

```typescript
// Fonction d'upload dans lib/supabase.ts
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
```

### 🔗 Utilisation dans l'Application

```typescript
// Exemple d'upload d'image dans la messagerie
const handleImagePicker = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    const asset = result.assets[0];
    const fileName = `image_${Date.now()}.jpg`;
    
    // Upload vers Supabase Storage
    const fileUrl = await uploadFile(asset, fileName);
    
    if (fileUrl) {
      // Sauvegarder le message avec l'URL du fichier
      await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          group_id: selectedGroup?.id,
          content: 'Image partagée',
          message_type: 'image',
          file_url: fileUrl, // URL Supabase Storage
        });
    }
  }
};
```

### 🔄 Synchronisation en Temps Réel

```typescript
// Écoute des nouveaux messages en temps réel
const subscribeToMessages = () => {
  return supabase
    .channel(`messages:${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        loadMessages(); // Recharger les messages
      }
    )
    .subscribe();
};
```

## 🗂️ Structure des Fichiers Supabase Storage

```
message-files/
├── image_1640995200000.jpg
├── file_1640995300000_document.pdf
├── voice_1640995400000.m4a
└── ...
```

### 📋 Politiques de Sécurité Storage

```sql
-- Upload autorisé pour tous les utilisateurs authentifiés
CREATE POLICY "Users can upload message files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-files');

-- Lecture autorisée pour tous les utilisateurs authentifiés
CREATE POLICY "Users can read message files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'message-files');

-- Suppression limitée au propriétaire
CREATE POLICY "Users can delete own message files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'message-files' AND owner = auth.uid());
```

## 🔄 Processus de Vérification Email

### Configuration Supabase Auth
1. Dans le dashboard Supabase, aller dans **Authentication** > **Settings**
2. **Activer** "Enable email confirmations"
3. Configurer les templates d'email si nécessaire

### Processus d'Inscription
1. L'utilisateur remplit le formulaire d'inscription
2. **Email de vérification** envoyé automatiquement
3. L'utilisateur clique sur le lien dans l'email
4. **Statut** passe de "pending" à "active" (géré manuellement par l'admin)
5. L'utilisateur peut se connecter

## 🐛 Dépannage

### Problèmes Courants

#### 1. Erreur de Connexion Supabase
```bash
# Vérifier les variables d'environnement
echo $EXPO_PUBLIC_SUPABASE_URL
echo $EXPO_PUBLIC_SUPABASE_ANON_KEY
```

#### 2. Problème d'Upload de Fichiers
- Vérifier que le bucket `message-files` existe
- Contrôler les politiques RLS du storage
- Vérifier les permissions de l'application

#### 3. Erreur d'Authentification
- Vérifier que l'utilisateur admin existe
- Contrôler les politiques RLS des tables
- Vérifier la configuration de vérification d'email

#### 4. Relations entre Tables
- Vérifier que les UUID des agences existent
- Contrôler les foreign keys
- Vérifier les données de test

### 🔍 Debug et Logs

```typescript
// Debug Supabase
console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('User:', user);

// Debug Storage
const { data: buckets } = await supabase.storage.listBuckets();
console.log('Available buckets:', buckets);
```

## 📊 Données de Test

### Agences par Défaut
- **ORIGINAL EXPRESS - Siège** (Douala)
- **Agence Yaoundé**
- **Agence Maroua**
- **Agence Kribi**
- **Agence Bafoussam**

### Utilisateur Admin
- **Email** : admin@gmail.com
- **Mot de passe** : admin1234
- **Agence** : ORIGINAL EXPRESS - Siège
- **Statut** : Actif

## 🚀 Déploiement

### Développement
```bash
npm start          # Démarrer Expo
npm run android    # Android
npm run ios        # iOS
npm run web        # Web
```

### Production
1. Configurer les variables d'environnement de production
2. Mettre à jour l'URL Supabase si nécessaire
3. Tester toutes les fonctionnalités
4. Déployer via EAS Build ou autre plateforme

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Contacter l'équipe de développement
- Consulter la documentation Supabase et Expo

---

**Original Express** - Application de gestion de transport moderne et sécurisée avec intégration Supabase complète.

### 🎯 Points Clés de l'Intégration

1. **Table unifiée** : `users` remplace `personnel`
2. **Relations UUID** : `users.agency` → `agencies.id`
3. **Storage intégré** : Fichiers de messagerie sur Supabase
4. **Vérification email** : Obligatoire à l'inscription
5. **Sécurité RLS** : Politiques complètes sur toutes les tables
6. **Données cohérentes** : Relations simplifiées et efficaces