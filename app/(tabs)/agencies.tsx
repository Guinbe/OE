import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useUser } from '../../contexts/UserContext';
import { supabase, Agency } from '@/lib/supabase';


export default function AgenciesScreen() {
  const { user } = useUser();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    manager: '',
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadAgencies();
  }, []);

  const loadAgencies = async () => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading agencies:', error);
        return;
      }
      
      setAgencies(data || []);
    } catch (error) {
      console.error('Error loading agencies:', error);
    }
  };

  const handleSaveAgency = async () => {
    if (!formData.name || !formData.address || !formData.phone) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      if (editingAgency) {
        // Update existing agency
        const { error } = await supabase
          .from('agencies')
          .update(formData)
          .eq('id', editingAgency.id);
        
        if (error) {
          console.error('Error updating agency:', error);
          Alert.alert('Erreur', 'Impossible de modifier l\'agence');
          return;
        }
      } else {
        // Add new agency
        const { error } = await supabase
          .from('agencies')
          .insert(formData);
        
        if (error) {
          console.error('Error creating agency:', error);
          Alert.alert('Erreur', 'Impossible de créer l\'agence');
          return;
        }
      }

      setModalVisible(false);
      loadAgencies(); // Reload agencies
    } catch (error) {
      console.error('Error saving agency:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleAddAgency = () => {
    setEditingAgency(null);
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      manager: '',
    });
    setModalVisible(true);
  };

  const handleEditAgency = (agency: Agency) => {
    setEditingAgency(agency);
    setFormData({
      name: agency.name,
      address: agency.address,
      phone: agency.phone,
      email: agency.email,
      manager: agency.manager,
    });
    setModalVisible(true);
  };

  const handleDeleteAgency = (agencyId: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cette agence ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('agencies')
                .delete()
                .eq('id', agencyId);
              
              if (error) {
                console.error('Error deleting agency:', error);
                Alert.alert('Erreur', 'Impossible de supprimer l\'agence');
                return;
              }
              
              loadAgencies(); // Reload agencies
            } catch (error) {
              console.error('Error deleting agency:', error);
              Alert.alert('Erreur', 'Une erreur est survenue');
            }
          },
        },
      ]
    );
  };


  const renderAgency = ({ item }: { item: Agency }) => (
    <View style={styles.agencyCard}>
      <View style={styles.agencyHeader}>
        <Text style={styles.agencyName}>{item.name}</Text>
        {isAdmin && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEditAgency(item)}
            >
              <Text style={styles.editButtonText}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteAgency(item.id)}
            >
              <Text style={styles.deleteButtonText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      <View style={styles.agencyDetails}>
        <Text style={styles.detailText}>📍 {item.address}</Text>
        <Text style={styles.detailText}>📞 {item.phone}</Text>
        <Text style={styles.detailText}>📧 {item.email}</Text>
        <Text style={styles.detailText}>👤 Gestionnaire: {item.manager}</Text>
      </View>
    </View>
  );

  if (!isAdmin) {
    return (
      <View style={styles.accessDenied}>
        <Text style={styles.accessDeniedTitle}>Accès Refusé</Text>
        <Text style={styles.accessDeniedText}>
          Cette fonctionnalité est réservée aux administrateurs uniquement.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestion des Agences</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddAgency}>
          <Text style={styles.addButtonText}>+ Ajouter une agence</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={agencies}
        renderItem={renderAgency}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune agence enregistrée</Text>
            <Text style={styles.emptySubtext}>
              Cliquez sur "Ajouter une agence" pour commencer
            </Text>
          </View>
        }
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingAgency ? 'Modifier l\'agence' : 'Ajouter une agence'}
            </Text>
            
            <ScrollView>
              <TextInput
                style={styles.input}
                placeholder="Nom de l'agence *"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Adresse *"
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                multiline
              />
              
              <TextInput
                style={styles.input}
                placeholder="Téléphone *"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
              />
              
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
              />
              
              <TextInput
                style={styles.input}
                placeholder="Nom du gestionnaire"
                value={formData.manager}
                onChangeText={(text) => setFormData({ ...formData, manager: text })}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveAgency}
              >
                <Text style={styles.saveButtonText}>
                  {editingAgency ? 'Modifier' : 'Ajouter'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  agencyCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  agencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  agencyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButton: {
    backgroundColor: '#28a745',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  agencyDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 16,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    maxHeight: '80%',
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
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007bff',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});