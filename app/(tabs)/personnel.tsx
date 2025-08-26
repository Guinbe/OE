import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../contexts/UserContext';
import { supabase, User, getAgencies, Agency } from '@/lib/supabase';

const ROLES = [
  { value: 'chef_agence', label: 'Chef d\'agence' },
  { value: 'agent_comptable', label: 'Agent comptable' }
];

const PersonnelScreen = () => {
  const { user } = useUser();
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [newPersonnel, setNewPersonnel] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: '',
    agency: '',
    password: '',
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadPersonnel();
      loadAgencies();
    }
  }, [isAdmin]);

  const loadAgencies = async () => {
    try {
      const agenciesData = await getAgencies();
      setAgencies(agenciesData);
    } catch (error) {
      console.error('Error loading agencies:', error);
    }
  };

  const loadPersonnel = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          agency_info:agencies(name, address)
        `)
        .neq('role', 'admin')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading personnel:', error);
        return;
      }
      
      setPersonnel(data || []);
    } catch (error) {
      console.error('Error loading personnel:', error);
    }
  };

  const filteredPersonnel = personnel.filter(
    (person) => {
      const matchesSearch =
        person.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.role.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || person.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    }
  );

  const pendingPersonnelCount = personnel.filter(p => p.status === 'pending').length;

  const handleAddPersonnel = async () => {
    if (!newPersonnel.full_name || !newPersonnel.email || !newPersonnel.phone || 
        !newPersonnel.role || !newPersonnel.agency || !newPersonnel.password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      // Créer l'utilisateur dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newPersonnel.email,
        password: newPersonnel.password,
        options: {
          data: {
            full_name: newPersonnel.full_name,
          }
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        Alert.alert('Erreur', 'Impossible de créer le compte utilisateur');
        return;
      }

      if (authData.user) {
        // Créer le profil dans la table users
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: newPersonnel.email,
            full_name: newPersonnel.full_name,
            role: newPersonnel.role as 'agent_comptable' | 'chef_agence',
            phone: newPersonnel.phone,
            agency: newPersonnel.agency,
            status: 'pending',
            join_date: new Date().toISOString().split('T')[0],
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          Alert.alert('Erreur', 'Impossible de créer le profil utilisateur');
          return;
        }
      }
      
      setNewPersonnel({ 
        full_name: '', 
        email: '', 
        phone: '', 
        role: '', 
        agency: '',
        password: ''
      });
      setModalVisible(false);
      loadPersonnel();
      
      Alert.alert('Succès', 'Le personnel a été ajouté avec succès. Un email de vérification a été envoyé.');
    } catch (error) {
      console.error('Error adding personnel:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    const person = personnel.find(p => p.id === userId);
    if (!person) return;
    
    let newStatus: 'active' | 'inactive' | 'pending';
    if (person.status === 'pending') {
      newStatus = 'active';
    } else if (person.status === 'active') {
      newStatus = 'inactive';
    } else {
      newStatus = 'active';
    }
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);
        
      if (error) {
        console.error('Error updating user status:', error);
        Alert.alert('Erreur', 'Impossible de modifier le statut');
      } else {
        loadPersonnel();
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleDeletePersonnel = (userId: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer ce personnel ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);
              
              if (error) {
                console.error('Error deleting personnel:', error);
                Alert.alert('Erreur', 'Impossible de supprimer le personnel');
                return;
              }
              
              loadPersonnel();
            } catch (error) {
              console.error('Error deleting personnel:', error);
              Alert.alert('Erreur', 'Une erreur est survenue');
            }
          },
        },
      ]
    );
  };

  const getAgencyName = (agencyId: string) => {
    const agency = agencies.find(a => a.id === agencyId);
    return agency ? agency.name : 'Agence inconnue';
  };

  const getRoleLabel = (role: string) => {
    const roleObj = ROLES.find(r => r.value === role);
    return roleObj ? roleObj.label : role;
  };

  const renderPersonnelItem = ({ item }: { item: User }) => (
    <View style={styles.personnelCard}>
      <View style={styles.personnelInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.full_name.charAt(0)}</Text>
        </View>
        <View style={styles.personnelDetails}>
          <Text style={styles.personnelName}>{item.full_name}</Text>
          <Text style={styles.personnelEmail}>{item.email}</Text>
          <Text style={styles.personnelPhone}>{item.phone}</Text>
          <Text style={styles.personnelRole}>{getRoleLabel(item.role)}</Text>
          <Text style={styles.personnelAgency}>
            {item.agency ? getAgencyName(item.agency) : 'Aucune agence'}
          </Text>
        </View>
      </View>
      {isAdmin && (
        <View style={styles.personnelActions}>
          <TouchableOpacity
            style={[
              styles.statusButton,
              {
                backgroundColor: item.status === 'active' ? '#4CAF50' :
                                item.status === 'pending' ? '#FF9800' : '#dc3545'
              },
            ]}
            onPress={() => handleToggleStatus(item.id)}
          >
            <Text style={styles.statusButtonText}>
              {item.status === 'active' ? 'Actif' :
               item.status === 'pending' ? 'En attente' : 'Inactif'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeletePersonnel(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (!isAdmin) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Ionicons name="lock-closed" size={64} color="#dc3545" />
        <Text style={styles.accessDeniedTitle}>Accès Restreint</Text>
        <Text style={styles.accessDeniedText}>
          Cette section est réservée aux administrateurs uniquement.
        </Text>
        <Text style={styles.accessDeniedSubtext}>
          Veuillez contacter votre administrateur pour obtenir l'accès.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestion du Personnel</Text>
        <Text style={styles.headerSubtitle}>ORIGINAL EXPRESS</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un employé..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Trier par statut:</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'all' && styles.activeFilter]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[styles.filterButtonText, statusFilter === 'all' && styles.activeFilterText]}>
              Tous
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'active' && styles.activeFilter]}
            onPress={() => setStatusFilter('active')}
          >
            <Text style={[styles.filterButtonText, statusFilter === 'active' && styles.activeFilterText]}>
              Actifs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'inactive' && styles.activeFilter]}
            onPress={() => setStatusFilter('inactive')}
          >
            <Text style={[styles.filterButtonText, statusFilter === 'inactive' && styles.activeFilterText]}>
              Inactifs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'pending' && styles.activeFilter]}
            onPress={() => setStatusFilter('pending')}
          >
            <Text style={[styles.filterButtonText, statusFilter === 'pending' && styles.activeFilterText]}>
              En attente
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {pendingPersonnelCount > 0 && (
        <View style={styles.pendingBanner}>
          <Ionicons name="warning" size={20} color="#FF9800" />
          <Text style={styles.pendingText}>
            {pendingPersonnelCount} personnel en attente de validation
          </Text>
        </View>
      )}

      <FlatList
        data={filteredPersonnel}
        renderItem={renderPersonnelItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Ajouter un employé</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Nom complet"
                value={newPersonnel.full_name}
                onChangeText={(text) => setNewPersonnel({ ...newPersonnel, full_name: text })}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Email"
                keyboardType="email-address"
                value={newPersonnel.email}
                onChangeText={(text) => setNewPersonnel({ ...newPersonnel, email: text })}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Téléphone"
                keyboardType="phone-pad"
                value={newPersonnel.phone}
                onChangeText={(text) => setNewPersonnel({ ...newPersonnel, phone: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Mot de passe temporaire"
                secureTextEntry
                value={newPersonnel.password}
                onChangeText={(text) => setNewPersonnel({ ...newPersonnel, password: text })}
              />
              
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Poste</Text>
                <View style={styles.pickerWrapper}>
                  {ROLES.map((role) => (
                    <TouchableOpacity
                      key={role.value}
                      style={[
                        styles.roleOption,
                        newPersonnel.role === role.value && styles.selectedRole
                      ]}
                      onPress={() => setNewPersonnel({ ...newPersonnel, role: role.value })}
                    >
                      <Text style={[
                        styles.roleText,
                        newPersonnel.role === role.value && styles.selectedRoleText
                      ]}>{role.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Agence</Text>
                <View style={styles.pickerWrapper}>
                  {agencies.map((agency) => (
                    <TouchableOpacity
                      key={agency.id}
                      style={[
                        styles.agencyOption,
                        newPersonnel.agency === agency.id && styles.selectedAgency
                      ]}
                      onPress={() => setNewPersonnel({ ...newPersonnel, agency: agency.id })}
                    >
                      <Text style={[
                        styles.agencyText,
                        newPersonnel.agency === agency.id && styles.selectedAgencyText
                      ]}>{agency.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleAddPersonnel}
                >
                  <Text style={styles.saveButtonText}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 0,
  },
  header: {
    backgroundColor: '#007bff',
    padding: 50,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  personnelCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  personnelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  personnelDetails: {
    flex: 1,
  },
  personnelName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  personnelEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  personnelPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  personnelRole: {
    fontSize: 14,
    color: '#007bff',
    marginTop: 4,
    fontWeight: '600',
  },
  personnelAgency: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  personnelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    padding: 8,
    borderRadius: 20,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007bff',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
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
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
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
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    backgroundColor: '#007bff',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedRole: {
    backgroundColor: '#007bff',
  },
  roleText: {
    fontSize: 14,
    color: '#666',
  },
  selectedRoleText: {
    color: '#fff',
    fontWeight: '600',
  },
  agencyOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedAgency: {
    backgroundColor: '#28a745',
  },
  agencyText: {
    fontSize: 14,
    color: '#666',
  },
  selectedAgencyText: {
    color: '#fff',
    fontWeight: '600',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginTop: 20,
    marginBottom: 10,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  accessDeniedSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  pendingBanner: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 8,
    fontWeight: '600',
  },
  filterContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 4,
  },
  activeFilter: {
    backgroundColor: '#007bff',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default PersonnelScreen;