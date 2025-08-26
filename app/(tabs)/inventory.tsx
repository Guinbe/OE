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
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useUser } from '../../contexts/UserContext';
import { supabase, Voyage, getAgencies, Agency } from '@/lib/supabase';

const InventoryScreen = () => {
  const { user } = useUser();
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newVoyage, setNewVoyage] = useState({
    nom_chauffeur: '',
    numero_vehicule: '',
    numero_bordereau: '',
    recette_brute: '',
    retenue: '',
    nombre_places: '',
    date: new Date().toISOString().split('T')[0],
    agency: '', // <-- NOUVEAU NOM
    ville: '',
  });

  useEffect(() => {
    loadVoyages();
    loadAgencies();
  }, [user]);

  const loadAgencies = async () => {
    try {
      const agenciesData = await getAgencies();
      setAgencies(agenciesData);
    } catch (error) {
      console.error('Error loading agencies:', error);
    }
  };

  const loadVoyages = async () => {
    try {
      let query = supabase
        .from('voyages')
        .select(`
          *,
          agency_info:agencies(name),
          agent_info:users(full_name)
        `);
      
      // Filter based on user role
      if (user?.role !== 'admin') {
        query = query.eq('agent_id', user?.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading voyages:', error);
        return;
      }
      
      setVoyages(data || []);
    } catch (error) {
      console.error('Error loading voyages:', error);
    }
  };

  const filteredVoyages = voyages.filter(
    (voyage) =>
      voyage.nom_chauffeur.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voyage.numero_vehicule.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voyage.numero_bordereau.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voyage.ville.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddVoyage = async () => {
    if (!newVoyage.nom_chauffeur || !newVoyage.numero_vehicule || !newVoyage.numero_bordereau || 
        !newVoyage.recette_brute || !newVoyage.nombre_places || !newVoyage.agency || !newVoyage.ville) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const { error } = await supabase
        .from('voyages')
        .insert({
          ...newVoyage,
          recette_brute: parseFloat(newVoyage.recette_brute),
          retenue: parseFloat(newVoyage.retenue) || 0,
          nombre_places: parseInt(newVoyage.nombre_places),
          agent_id: user?.id,
        });
      
      if (error) {
        console.error('Error adding voyage:', error);
        if (error.code === '23505') {
          Alert.alert('Erreur', 'Ce numéro de bordereau existe déjà');
        } else {
          Alert.alert('Erreur', 'Impossible d\'ajouter le voyage');
        }
        return;
      }
      
      setNewVoyage({
        nom_chauffeur: '',
        numero_vehicule: '',
        numero_bordereau: '',
        recette_brute: '',
        retenue: '',
        nombre_places: '',
        date: new Date().toISOString().split('T')[0],
        agency: '',
        ville: '',
      });
      setModalVisible(false);
      loadVoyages();
      
      Alert.alert('Succès', 'Le voyage a été ajouté avec succès.');
    } catch (error) {
      console.error('Error adding voyage:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const getAgencyName = (agencyId: string) => {
    const agency = agencies.find(a => a.id === agencyId);
    return agency ? agency.name : 'Agence inconnue';
  };

  const generatePDF = async () => {
    try {
      const totalRecettes = filteredVoyages.reduce((sum, voyage) => sum + voyage.recette_brute, 0);
      const totalRetenues = filteredVoyages.reduce((sum, voyage) => sum + voyage.retenue, 0);
      const totalPassagers = filteredVoyages.reduce((sum, voyage) => sum + voyage.nombre_places, 0);

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Rapport d'Inventaire - Original Express</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
              .title { color: #007bff; font-size: 24px; font-weight: bold; }
              .subtitle { color: #666; font-size: 16px; margin-top: 5px; }
              .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
              .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
              .summary-item { text-align: center; }
              .summary-value { font-size: 18px; font-weight: bold; color: #007bff; }
              .summary-label { font-size: 14px; color: #666; margin-top: 5px; }
              .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .table th, .table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; font-size: 12px; }
              .table th { background-color: #f8f9fa; font-weight: bold; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Rapport d'Inventaire</div>
              <div class="subtitle">Original Express</div>
              <div>Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
            </div>

            <div class="summary">
              <h3>Résumé</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <div class="summary-value">${filteredVoyages.length}</div>
                  <div class="summary-label">Voyages</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value">${totalRecettes.toLocaleString()} FCFA</div>
                  <div class="summary-label">Recettes totales</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value">${totalPassagers}</div>
                  <div class="summary-label">Passagers</div>
                </div>
              </div>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Chauffeur</th>
                  <th>Véhicule</th>
                  <th>Bordereau</th>
                  <th>Agence</th>
                  <th>Ville</th>
                  <th>Places</th>
                  <th>Recette</th>
                  <th>Retenue</th>
                </tr>
              </thead>
              <tbody>
                ${filteredVoyages.map(voyage => `
                  <tr>
                    <td>${new Date(voyage.date).toLocaleDateString('fr-FR')}</td>
                    <td>${voyage.nom_chauffeur}</td>
                    <td>${voyage.numero_vehicule}</td>
                    <td>${voyage.numero_bordereau}</td>
                    <td>${getAgencyName(voyage.agency)}</td>
                    <td>${voyage.ville}</td>
                    <td>${voyage.nombre_places}</td>
                    <td>${voyage.recette_brute.toLocaleString()} FCFA</td>
                    <td>${voyage.retenue.toLocaleString()} FCFA</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer">
              <p>Ce rapport a été généré automatiquement par l'application Original Express</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Partager le rapport PDF',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Succès', `Le rapport PDF a été généré: ${uri}`);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
      console.error('PDF Generation Error:', error);
    }
  };

  const renderVoyageItem = ({ item }: { item: Voyage }) => (
    <View style={styles.voyageCard}>
      <View style={styles.voyageHeader}>
        <Text style={styles.voyageDate}>
          {new Date(item.date).toLocaleDateString('fr-FR')}
        </Text>
        <Text style={styles.voyageAmount}>
          {item.recette_brute.toLocaleString()} FCFA
        </Text>
      </View>
      
      <View style={styles.voyageDetails}>
        <Text style={styles.voyageInfo}>🚗 {item.numero_vehicule} - {item.nom_chauffeur}</Text>
        <Text style={styles.voyageInfo}>📋 Bordereau: {item.numero_bordereau}</Text>
        <Text style={styles.voyageInfo}>🏢 {getAgencyName(item.agency)}</Text>
        <Text style={styles.voyageInfo}>📍 {item.ville}</Text>
        <Text style={styles.voyageInfo}>👥 {item.nombre_places} places</Text>
        {item.retenue > 0 && (
          <Text style={styles.voyageInfo}>💰 Retenue: {item.retenue.toLocaleString()} FCFA</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventaire des Voyages</Text>
        <TouchableOpacity style={styles.exportButton} onPress={generatePDF}>
          <Ionicons name="download-outline" size={20} color="#fff" />
          <Text style={styles.exportButtonText}>PDF</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un voyage..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredVoyages}
        renderItem={renderVoyageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bus-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Aucun voyage enregistré</Text>
            <Text style={styles.emptySubtext}>
              Cliquez sur le bouton + pour ajouter un voyage
            </Text>
          </View>
        }
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
              <Text style={styles.modalTitle}>Nouveau Voyage</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Nom du chauffeur"
                value={newVoyage.nom_chauffeur}
                onChangeText={(text) => setNewVoyage({ ...newVoyage, nom_chauffeur: text })}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Numéro du véhicule"
                value={newVoyage.numero_vehicule}
                onChangeText={(text) => setNewVoyage({ ...newVoyage, numero_vehicule: text })}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Numéro de bordereau"
                value={newVoyage.numero_bordereau}
                onChangeText={(text) => setNewVoyage({ ...newVoyage, numero_bordereau: text })}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Recette brute (FCFA)"
                keyboardType="numeric"
                value={newVoyage.recette_brute}
                onChangeText={(text) => setNewVoyage({ ...newVoyage, recette_brute: text })}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Retenue (FCFA) - Optionnel"
                keyboardType="numeric"
                value={newVoyage.retenue}
                onChangeText={(text) => setNewVoyage({ ...newVoyage, retenue: text })}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Nombre de places"
                keyboardType="numeric"
                value={newVoyage.nombre_places}
                onChangeText={(text) => setNewVoyage({ ...newVoyage, nombre_places: text })}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Date (AAAA-MM-JJ)"
                value={newVoyage.date}
                onChangeText={(text) => setNewVoyage({ ...newVoyage, date: text })}
              />

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Agence</Text>
                <View style={styles.pickerWrapper}>
                  {agencies.map((agency) => (
                    <TouchableOpacity
                      key={agency.id}
                      style={[
                        styles.agencyOption,
                        newVoyage.agency === agency.id && styles.selectedAgency
                      ]}
                      onPress={() => setNewVoyage({ ...newVoyage, agency: agency.id })}
                    >
                      <Text style={[
                        styles.agencyText,
                        newVoyage.agency === agency.id && styles.selectedAgencyText
                      ]}>{agency.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <TextInput
                style={styles.input}
                placeholder="Ville de destination"
                value={newVoyage.ville}
                onChangeText={(text) => setNewVoyage({ ...newVoyage, ville: text })}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleAddVoyage}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
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
  voyageCard: {
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
  voyageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  voyageDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  voyageAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  voyageDetails: {
    gap: 4,
  },
  voyageInfo: {
    fontSize: 14,
    color: '#666',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
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
});

export default InventoryScreen;