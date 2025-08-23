# Transport Management App - Original Express

Application mobile de gestion des transports et inventaire développée avec React Native, Expo et Supabase.

## 🚀 Fonctionnalités

### 🔐 Authentification
- **Connexion sécurisée** avec email et mot de passe via Supabase Auth
- **Inscription** avec validation des champs et vérification d'email
- **Gestion des rôles** : Admin, Chef d'agence, Agent comptable
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

### 💬 Messagerie
- **Chat de groupe** entre utilisateurs
- **Partage de fichiers** (images, documents, messages vocaux)
- **Stockage sécurisé** des fichiers sur Supabase Storage
- **Interface moderne** avec bulles de chat

### 👤 Gestion du Personnel
- **Ajout/modification** du personnel
- **Gestion des statuts** (actif, inactif, en attente)
- **Filtrage** par statut et recherche
- **Accès restreint** aux administrateurs

### 🏢 Gestion des Agences
- **CRUD complet** des agences
- **Informations détaillées** : nom, adresse, téléphone, gestionnaire
- **Interface d'administration** sécurisée

### 📈 Statistiques Avancées
- **Graphiques interactifs** avec React Native Chart Kit
- **Périodes personnalisables**
- **Export PDF** des rapports statistiques
- **Filtrage par rôle utilisateur**

## 🛠 Technologies Utilisées

- **React Native** avec Expo SDK 52
- **TypeScript** pour la sécurité des types
- **Supabase** pour la base de données et l'authentification
- **Expo Router** pour la navigation
- **Supabase Storage** pour le stockage des fichiers
- **React Native Chart Kit** pour les graphiques
- **Expo Print** pour la génération de PDF

## 📦 Installation

### Prérequis
- Node.js (v16 ou supérieur)
- Expo CLI
- Compte Supabase

### Configuration Supabase

1. **Créer un projet Supabase** sur [supabase.com](https://supabase.com)

2. **Configurer les variables d'environnement** dans `.env` :
```env
EXPO_PUBLIC_SUPABASE_URL=https://cyaijjxkssppdyxbrtxo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5YWlqanhrc3NwcGR5eGJydHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDI3NjAsImV4cCI6MjA3MTExODc2MH0.3WUokgoqTjagy4WS4lD68Ly9CAzahSgL3-bzdU71a0c
```

3. **Exécuter les migrations** dans l'éditeur SQL de Supabase :
   - Copier le contenu de `supabase/migrations/create_tables.sql`
   - L'exécuter dans l'éditeur SQL de votre projet Supabase

4. **Configurer le Storage** :
   - Aller dans Storage > Buckets
   - Créer un bucket nommé `message-files`
   - Configurer les politiques d'accès selon vos besoins

### Installation des dépendances

```bash
# Cloner le projet
git clone [url-du-repo]
cd transport-app

# Installer les dépendances
npm install
```

### Lancement

```bash
# Démarrer le serveur de développement
npm start

# Lancer sur Android
npm run android

# Lancer sur iOS
npm run ios

# Lancer sur le web
npm run web
```

## 🗄️ Structure de la Base de Données

### Tables principales

- **users** : Utilisateurs de l'application
- **voyages** : Enregistrements des voyages
- **agencies** : Agences de transport
- **personnel** : Personnel de l'entreprise
- **messages** : Messages de la messagerie
- **chat_groups** : Groupes de discussion
- **group_members** : Membres des groupes

### Sécurité (RLS)

Toutes les tables utilisent Row Level Security (RLS) avec des politiques appropriées :
- Les utilisateurs ne peuvent voir que leurs propres données
- Les administrateurs ont accès à toutes les données
- Les groupes de chat sont sécurisés par appartenance

## 👨‍💼 Comptes par Défaut

### Administrateur
- **Email** : `admin@gmail.com`
- **Mot de passe** : `admin1234`
- **Rôle** : Admin (accès complet)

## 📱 Utilisation

### Connexion
1. Lancer l'application
2. Utiliser les identifiants admin ou créer un nouveau compte
3. Vérifier l'email si nécessaire (pour les nouveaux comptes)

### Gestion des Voyages
1. Aller dans l'onglet "Inventaire"
2. Cliquer sur le bouton "+" pour ajouter un voyage
3. Remplir le formulaire et enregistrer
4. Exporter en PDF si nécessaire

### Messagerie
1. Aller dans l'onglet "Messages"
2. Créer un nouveau groupe avec le bouton "+"
3. Sélectionner les membres et créer le groupe
4. Envoyer des messages, fichiers, images ou messages vocaux

### Statistiques
1. Aller dans l'onglet "Stats"
2. Sélectionner la période (jour, semaine, mois, personnalisé)
3. Consulter les graphiques et statistiques
4. Exporter en PDF si nécessaire

## 🔧 Configuration Avancée

### Stockage des Fichiers (Supabase Storage)

Les fichiers de messagerie sont stockés dans Supabase Storage :

1. **Configuration du bucket** :
```sql
-- Créer le bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-files', 'message-files', false);

-- Politiques d'accès
CREATE POLICY "Users can upload message files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-files');
```

2. **Upload de fichiers** :
```typescript
const { data, error } = await supabase.storage
  .from('message-files')
  .upload(filePath, file);
```

3. **Récupération d'URL publique** :
```typescript
const { data: { publicUrl } } = supabase.storage
  .from('message-files')
  .getPublicUrl(filePath);
```

### Authentification

L'authentification utilise Supabase Auth avec :
- Vérification d'email activée
- Politiques RLS pour la sécurité
- Gestion des rôles utilisateur

## 🐛 Dépannage

### Problèmes courants

1. **Erreur de connexion Supabase** :
   - Vérifier les variables d'environnement
   - S'assurer que les migrations sont appliquées

2. **Problème d'upload de fichiers** :
   - Vérifier que le bucket `message-files` existe
   - Contrôler les politiques RLS du storage

3. **Erreur d'authentification** :
   - Vérifier que l'utilisateur admin existe
   - Contrôler les politiques RLS des tables

### Logs et Debug

```bash
# Voir les logs Expo
npx expo start --clear

# Debug Supabase
console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Contacter l'équipe de développement
- Consulter la documentation Supabase et Expo

---

**Original Express** - Application de gestion de transport moderne et sécurisée.