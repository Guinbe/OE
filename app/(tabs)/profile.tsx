import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '../../contexts/UserContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Profile edit state
  const [companyName, setCompanyName] = useState('ORIGINAL EXPRESS');
  const [email, setEmail] = useState('contact@originalexpress.com');
  const [phone, setPhone] = useState('+237 6 00 00 00 00');
  const [siege, setSiege] = useState('Meidougou, Cameroun');
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          onPress: () => {
            // Clear any stored data
            router.replace('/login');
          },
          style: 'destructive'
        },
      ]
    );
  };

  const handleSaveProfile = () => {
    Alert.alert('Succès', 'Profil mis à jour avec succès');
    setShowEditModal(false);
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    
    Alert.alert('Succès', 'Mot de passe changé avec succès');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(false);
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Support',
      'Pour nous contacter:\n\nEmail: support@originalexpress.com\nTéléphone: +237 6 00 00 00 01\n\nNos équipes sont disponibles 24/7'
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Text style={styles.profileImageText}>OE</Text>
        </View>
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.userName}>Administrateur</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Informations de l'entreprise</Text>
          {isAdmin && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setShowEditModal(true)}
            >
              <Text style={styles.editButtonText}>Modifier</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Nom:</Text>
          <Text style={styles.value}>{companyName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Secteur:</Text>
          <Text style={styles.value}>Transport de voyageurs</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Téléphone:</Text>
          <Text style={styles.value}>{phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Siège:</Text>
          <Text style={styles.value}>{siege}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Statistiques générales</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>-</Text>
            <Text style={styles.statLabel}>Voyages</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>-</Text>
            <Text style={styles.statLabel}>Véhicules</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>-</Text>
            <Text style={styles.statLabel}>Chauffeurs</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Paramètres</Text>
        {isAdmin && (
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowEditModal(true)}
          >
            <Text style={styles.settingText}>Modifier le profil</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowPasswordModal(true)}
        >
          <Text style={styles.settingText}>Changer le mot de passe</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.notificationRow}>
            <Text style={styles.settingText}>Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#767577', true: '#007bff' }}
              thumbColor={notificationsEnabled ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowHelpModal(true)}
        >
          <Text style={styles.settingText}>Aide et support</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Déconnexion</Text>
      </TouchableOpacity>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier le profil</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nom de l'entreprise"
              value={companyName}
              onChangeText={setCompanyName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Téléphone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Siège social"
              value={siege}
              onChangeText={setSiege}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Changer le mot de passe</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Mot de passe actuel"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
            
            <TextInput
              style={styles.input}
              placeholder="Nouveau mot de passe"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            
            <TextInput
              style={styles.input}
              placeholder="Confirmer le nouveau mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleChangePassword}
              >
                <Text style={styles.saveButtonText}>Changer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Help & Support Modal */}
      <Modal
        visible={showHelpModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Aide et support</Text>
            
            <Text style={styles.helpText}>
              Bienvenue dans le centre d'aide ORIGINAL EXPRESS
            </Text>
            
            <Text style={styles.helpSection}>
              Questions fréquentes:
            </Text>
            
            <Text style={styles.helpItem}>• Comment créer un nouveau voyage ?</Text>
            <Text style={styles.helpItem}>• Comment gérer les chauffeurs ?</Text>
            <Text style={styles.helpItem}>• Comment consulter les statistiques ?</Text>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.contactButton]}
              onPress={handleContactSupport}
            >
              <Text style={styles.saveButtonText}>Contacter le support</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowHelpModal(false)}
            >
              <Text style={styles.cancelButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 0,
  },
  header: {
    backgroundColor: '#007bff',
    paddingVertical: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  profileImageText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007bff',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  userName: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontWeight: '600',
    color: '#666',
  },
  value: {
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  settingItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    marginHorizontal: 16,
    marginVertical: 20,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 8,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  saveButton: {
    backgroundColor: '#007bff',
  },
  contactButton: {
    backgroundColor: '#28a745',
    marginBottom: 10,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpText: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  helpSection: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  helpItem: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  editButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});