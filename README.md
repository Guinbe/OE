# Transport Management App

Application mobile de gestion des transports et inventaire développée avec React Native et Expo.

## Fonctionnalités

### 🔐 Authentification
- **Connexion sécurisée** avec email et mot de passe
- **Inscription** avec validation des champs
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

### 💬 Messagerie
- **Chat privé** entre utilisateurs
- **Groupes de discussion** pour les équipes
- **Interface moderne** avec bulles de chat

### 👤 Profil Utilisateur
- **Informations personnelles**
- **Paramètres du compte**
- **Déconnexion sécurisée**

## Structure du Projet

```
app/
├── _layout.tsx          # Layout principal avec navigation
├── index.tsx           # Redirection vers login
├── login.tsx           # Page de connexion
├── signup.tsx          # Page d'inscription
├── (tabs)/             # Navigation par onglets
│   ├── _layout.tsx     # Configuration des tabs
│   ├── dashboard.tsx   # Dashboard principal avec statistiques
│   ├── inventory.tsx   # Gestion d'inventaire
│   ├── messages.tsx    # Messagerie
│   └── profile.tsx     # Profil utilisateur
```

## Installation et Lancement

### Prérequis
- Node.js (v16 ou supérieur)
- Expo CLI
- Android Studio ou Xcode (pour émulateur)

### Installation
```bash
# Cloner le projet
git clone [url-du-repo]

# Installer les dépendances
npm install

# ou avec yarn
yarn install
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

## Technologies Utilisées

- **React Native** avec Expo
- **TypeScript** pour la sécurité des types
- **Expo Router** pour la navigation
- **React Hook Form** pour la gestion des formulaires
- **Expo Vector Icons** pour les icônes
- **StyleSheet** pour le styling

## Fonctionnalités Détaillées

### Dashboard
- **Filtres temporels** : Jour, Semaine, Mois
- **Cartes de statistiques** avec indicateurs visuels
- **Liste d'activité récente** avec détails des transactions

### Inventaire
- **Formulaire complet** avec :
  - Nom du conducteur
  - Numéro de véhicule
  - Numéro de frontière
  - Revenu brut
  - Déductions
  - Nombre de places
  - Date
  - Nom de l'agent

### Messagerie
- **Interface de chat moderne**
- **Listes de conversations**
- **Indicateurs de messages non lus**

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## Licence

MIT License