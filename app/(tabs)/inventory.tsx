import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Voyage {
  id: string;
  nomChauffeur: string;
  numeroVehicule: string;
  numeroBordereau: string;
  recetteBrute: number;
  retenue: number;
  nombrePlaces: number;
  date: string;
  agence: string;
  ville: string;
  agentNom: string;
  agentPrenom: string;
  agentEmail: string;
  createdBy: string;
  userRole: 'admin' | 'user';
}

const InventoryScreen = () => {
const { user } = useUser();
const [voyages, setVoyages] = useState<Voyage[]>([]);
const [allVoyages, setAllVoyages] = useState<Voyage[]>([]);
const [isAdmin, setIsAdmin] = useState(false);
const [formData, setFormData] = useState({
  nomChauffeur: '',
  numeroVehicule: '',
  numeroBordereau: '',
  recetteBrute: '',
  retenue: '',
  nombrePlaces: '',
});

useEffect(() => {
  if (user) {
    setIsAdmin(user.role === 'admin');
    loadVoyages();
  }
}, [user]);

const loadVoyages = async () => {
  try {
    const voyagesData = await AsyncStorage.getItem('voyages');
    if (voyagesData) {
      const allVoyagesData: Voyage[] = JSON.parse(voyagesData);
      setAllVoyages(allVoyagesData);
      
      // Filter voyages based on user role
      if (user?.role === 'admin') {
        // Admin sees all voyages
        setVoyages(allVoyagesData);
      } else {
        // Regular users only see their own voyages
        const userVoyages = allVoyagesData.filter(
          voyage => voyage.createdBy === user?.id
        );
        setVoyages(userVoyages);
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement des voyages:', error);
  }
};

  // Informations automatiques
  const dateActuelle = new Date().toLocaleDateString('fr-FR');
  const agence = 'ORIGINAL EXPRESS';
  const ville = 'Douala';
  const agentNom = user?.name?.split(' ')[1] || 'System';
  const agentPrenom = user?.name?.split(' ')[0] || 'User';
  const agentEmail = user?.email || 'unknown@original-express.com';

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = () => {
    if (!formData.nomChauffeur || !formData.numeroVehicule || !formData.numeroBordereau ||
        !formData.recetteBrute || !formData.retenue || !formData.nombrePlaces) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const nouveauVoyage: Voyage = {
      id: Date.now().toString(),
      nomChauffeur: formData.nomChauffeur,
      numeroVehicule: formData.numeroVehicule,
      numeroBordereau: formData.numeroBordereau,
      recetteBrute: parseFloat(formData.recetteBrute),
      retenue: parseFloat(formData.retenue),
      nombrePlaces: parseInt(formData.nombrePlaces),
      date: dateActuelle,
      agence: agence,
      ville: ville,
      agentNom: agentNom,
      agentPrenom: agentPrenom,
      agentEmail: agentEmail,
      createdBy: user?.id || 'unknown',
      userRole: user?.role || 'user',
    };

    const updatedVoyages = [...allVoyages, nouveauVoyage];
    setAllVoyages(updatedVoyages);
    
    // Filter voyages based on user role
    if (user?.role === 'admin') {
      setVoyages(updatedVoyages);
    } else {
      const userVoyages = updatedVoyages.filter(
        voyage => voyage.createdBy === user?.id
      );
      setVoyages(userVoyages);
    }
    
    // Save to AsyncStorage
    saveVoyages(updatedVoyages);
    
    // Réinitialiser le formulaire
    setFormData({
      nomChauffeur: '',
      numeroVehicule: '',
      numeroBordereau: '',
      recetteBrute: '',
      retenue: '',
      nombrePlaces: '',
    });

    Alert.alert('Succès', 'Voyage enregistré avec succès');
  };

  const saveVoyages = async (voyagesToSave: Voyage[]) => {
    try {
      await AsyncStorage.setItem('voyages', JSON.stringify(voyagesToSave));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des voyages:', error);
    }
  };

  const [showForm, setShowForm] = useState(false);

  const generateInventoryPDF = async () => {
    if (voyages.length === 0) {
      Alert.alert('Erreur', 'Aucun inventaire à exporter');
      return;
    }

    try {
      const totalRecette = voyages.reduce((sum, voyage) => sum + voyage.recetteBrute, 0);
      const totalRetenue = voyages.reduce((sum, voyage) => sum + voyage.retenue, 0);
      const totalNet = totalRecette - totalRetenue;

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                padding: 20px;
                background-color: #007bff;
                color: white;
                border-radius: 10px;
              }
              .logo-container {
                width: 80px;
                height: 80px;
                margin: 0 auto 10px;
                background-color: #fff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                overflow: hidden;
              }
              .logo-img {
                width: 60px;
                height: 60px;
                object-fit: contain;
              }
              .company-name {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .report-title {
                font-size: 18px;
                margin-bottom: 10px;
              }
              .summary {
                background-color: white;
                padding: 20px;
                border-radius: 10px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .summary-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                font-size: 16px;
              }
              .summary-label {
                font-weight: bold;
                color: #333;
              }
              .summary-value {
                color: #007bff;
                font-weight: bold;
              }
              .voyage-table {
                width: 100%;
                border-collapse: collapse;
                background-color: white;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .voyage-table th {
                background-color: #007bff;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: bold;
              }
              .voyage-table td {
                padding: 10px;
                border-bottom: 1px solid #eee;
              }
              .voyage-table tr:last-child td {
                border-bottom: none;
              }
              .net-amount {
                color: #4caf50;
                font-weight: bold;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo-container">
                <div class="logo-text">OE</div>
              </div>
              <div class="company-name">ORIGINAL EXPRESS</div>
              <div class="report-title">Rapport d'Inventaire des Voyages</div>
              <div>Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
            </div>

            <div class="summary">
              <h3>Résumé des Voyages</h3>
              <div class="summary-item">
                <span class="summary-label">Nombre total de voyages:</span>
                <span class="summary-value">${voyages.length}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Recette totale brute:</span>
                <span class="summary-value">${totalRecette.toLocaleString()} FCFA</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Total des retenues:</span>
                <span class="summary-value">${totalRetenue.toLocaleString()} FCFA</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Recette nette totale:</span>
                <span class="summary-value net-amount">${totalNet.toLocaleString()} FCFA</span>
              </div>
            </div>

            <table class="voyage-table">
              <thead>
                <tr>
                  <th>N° Bordereau</th>
                  <th>Date</th>
                  <th>Chauffeur</th>
                  <th>Véhicule</th>
                  <th>Places</th>
                  <th>Recette Brute</th>
                  <th>Retenue</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                ${voyages.map(voyage => `
                  <tr>
                    <td>${voyage.numeroBordereau}</td>
                    <td>${voyage.date}</td>
                    <td>${voyage.nomChauffeur}</td>
                    <td>${voyage.numeroVehicule}</td>
                    <td>${voyage.nombrePlaces}</td>
                    <td>${voyage.recetteBrute.toLocaleString()} FCFA</td>
                    <td>${voyage.retenue.toLocaleString()} FCFA</td>
                    <td class="net-amount">${(voyage.recetteBrute - voyage.retenue).toLocaleString()} FCFA</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer">
              <p>ORIGINAL EXPRESS - Douala, Cameroun</p>
              <p>Rapport généré automatiquement par le système de gestion</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Exporter le rapport d\'inventaire',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Succès', `PDF généré: ${uri}`);
      }
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    }
  };

  const groupVoyagesByDate = (voyages: Voyage[]) => {
    const grouped: { [key: string]: Voyage[] } = {};
    
    voyages.forEach(voyage => {
      const dateKey = voyage.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(voyage);
    });
    
    // Sort dates in descending order (most recent first)
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      const dateA = new Date(a.split('/').reverse().join('-'));
      const dateB = new Date(b.split('/').reverse().join('-'));
      return dateB.getTime() - dateA.getTime();
    });
    
    return sortedDates.map(date => ({
      date,
      voyages: grouped[date]
    }));
  };

  const renderVoyageItem = ({ item }: { item: Voyage }) => (
    <View style={styles.voyageCard}>
      <View style={styles.voyageHeader}>
        <Text style={styles.voyageTitle}>Voyage #{item.numeroBordereau}</Text>
        <Text style={styles.voyageTime}>{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
      <View style={styles.voyageDetails}>
        <Text style={styles.voyageText}>Chauffeur: {item.nomChauffeur}</Text>
        <Text style={styles.voyageText}>Véhicule: {item.numeroVehicule}</Text>
        <Text style={styles.voyageText}>Places: {item.nombrePlaces}</Text>
        <Text style={styles.voyageText}>Recette: {item.recetteBrute.toLocaleString()} FCFA</Text>
        <Text style={styles.voyageText}>Retenue: {item.retenue.toLocaleString()} FCFA</Text>
        <Text style={[styles.voyageText, styles.netAmount]}>
          Net: {(item.recetteBrute - item.retenue).toLocaleString()} FCFA
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ORIGINAL EXPRESS</Text>
        <Text style={styles.headerSubtitle}>Gestion des Voyages</Text>
      </View>

      {!showForm ? (
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              Inventaires enregistrés ({voyages.length})
            </Text>
            <View style={styles.headerActions}>
              <Text style={styles.totalText}>
                Total voyages: {voyages.length}
              </Text>
              {voyages.length > 0 && (
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={generateInventoryPDF}
                >
                  <Ionicons name="download-outline" size={16} color="#fff" />
                  <Text style={styles.exportButtonText}>Exporter PDF</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {voyages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>Aucun inventaire enregistré</Text>
              <Text style={styles.emptyStateSubtext}>
                Appuyez sur le bouton + pour ajouter un nouvel inventaire
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {groupVoyagesByDate(voyages).map((group) => (
                <View key={group.date} style={styles.dateSection}>
                  <View style={styles.dateHeader}>
                    <Text style={styles.dateHeaderText}>{group.date}</Text>
                    <Text style={styles.dateCountText}>
                      {group.voyages.length} voyage{group.voyages.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                  {group.voyages.map((voyage) => (
                    <View key={voyage.id} style={styles.voyageCard}>
                      <View style={styles.voyageHeader}>
                        <Text style={styles.voyageTitle}>Voyage #{voyage.numeroBordereau}</Text>
                        <Text style={styles.voyageTime}>{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                      <View style={styles.voyageDetails}>
                        <Text style={styles.voyageText}>Chauffeur: {voyage.nomChauffeur}</Text>
                        <Text style={styles.voyageText}>Véhicule: {voyage.numeroVehicule}</Text>
                        <Text style={styles.voyageText}>Places: {voyage.nombrePlaces}</Text>
                        <Text style={styles.voyageText}>Recette: {voyage.recetteBrute.toLocaleString()} FCFA</Text>
                        <Text style={styles.voyageText}>Retenue: {voyage.retenue.toLocaleString()} FCFA</Text>
                        <Text style={[styles.voyageText, styles.netAmount]}>
                          Net: {(voyage.recetteBrute - voyage.retenue).toLocaleString()} FCFA
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="arrow-back" size={24} color="#007bff" />
              </TouchableOpacity>
              <Text style={styles.formTitle}>Nouvel inventaire</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom du chauffeur *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Jean Dupont"
                value={formData.nomChauffeur}
                onChangeText={(text) => handleInputChange('nomChauffeur', text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Numéro du véhicule *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: CE-1234-XY"
                value={formData.numeroVehicule}
                onChangeText={(text) => handleInputChange('numeroVehicule', text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Numéro de bordereau *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: BD-2024-001"
                value={formData.numeroBordereau}
                onChangeText={(text) => handleInputChange('numeroBordereau', text)}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Recette brute *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={formData.recetteBrute}
                  onChangeText={(text) => handleInputChange('recetteBrute', text)}
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Retenue *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={formData.retenue}
                  onChangeText={(text) => handleInputChange('retenue', text)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre de places *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 70"
                keyboardType="numeric"
                value={formData.nombrePlaces}
                onChangeText={(text) => handleInputChange('nombrePlaces', text)}
              />
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Informations automatiques</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>{dateActuelle}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Agence:</Text>
                <Text style={styles.infoValue}>{agence}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ville:</Text>
                <Text style={styles.infoValue}>{ville}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Agent:</Text>
                <Text style={styles.infoValue}>{agentPrenom} {agentNom}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Enregistrer le voyage</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {!showForm && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowForm(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
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
    padding: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  formContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  infoSection: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  voyageCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
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
    marginBottom: 8,
  },
  voyageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
  },
  voyageDate: {
    fontSize: 14,
    color: '#666',
  },
  voyageTime: {
    fontSize: 14,
    color: '#666',
  },
  voyageDetails: {
    marginTop: 8,
  },
  voyageText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  netAmount: {
    fontWeight: 'bold',
    color: '#4caf50',
    fontSize: 16,
  },
  listHeader: {
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  totalText: {
    fontSize: 14,
    color: '#666',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#333',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  dateSection: {
    marginBottom: 20,
  },
  dateHeader: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  dateCountText: {
    fontSize: 14,
    color: '#666',
  },
});

export default InventoryScreen;