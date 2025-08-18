import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';

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
  userRole: string;
}

const StatisticsScreen = () => {
const { user } = useUser();
const [selectedPeriod, setSelectedPeriod] = useState('week');
const [showCustomModal, setShowCustomModal] = useState(false);
const [customStartDate, setCustomStartDate] = useState('');
const [customEndDate, setCustomEndDate] = useState('');
const [customPeriodLabel, setCustomPeriodLabel] = useState('Janvier - Juin 2025');
const [startDateError, setStartDateError] = useState('');
const [endDateError, setEndDateError] = useState('');
const [dateRangeError, setDateRangeError] = useState('');
const [voyages, setVoyages] = useState<Voyage[]>([]);
const [filteredVoyages, setFilteredVoyages] = useState<Voyage[]>([]);
const [isAdmin, setIsAdmin] = useState(false);
const [loading, setLoading] = useState(true);
const screenWidth = Dimensions.get('window').width;

const periods = [
  { id: 'day', label: 'Jour', icon: 'today' },
  { id: 'week', label: 'Semaine', icon: 'calendar' },
  { id: 'month', label: 'Mois', icon: 'calendar-outline' },
  { id: 'custom', label: 'Personnalisé', icon: 'options' },
];

useEffect(() => {
  checkUserRole();
  loadVoyages();
}, [user]);

useEffect(() => {
  filterVoyagesByPeriod();
}, [selectedPeriod, voyages, customStartDate, customEndDate]);

const checkUserRole = () => {
  if (user?.email === 'admin@gmail.com') {
    setIsAdmin(true);
  } else {
    setIsAdmin(false);
  }
};

const loadVoyages = async () => {
  try {
    setLoading(true);
    const storedVoyages = await AsyncStorage.getItem('voyages');
    let allVoyages: Voyage[] = [];
    
    if (storedVoyages) {
      allVoyages = JSON.parse(storedVoyages);
    }

    // Filter voyages based on user role
    let userVoyages = allVoyages;
    if (!isAdmin && user) {
      userVoyages = allVoyages.filter(voyage =>
        voyage.createdBy === user.email ||
        voyage.agentEmail === user.email
      );
    }

    setVoyages(userVoyages);
  } catch (error) {
    console.error('Error loading voyages:', error);
    Alert.alert('Erreur', 'Impossible de charger les données');
  } finally {
    setLoading(false);
  }
};

const filterVoyagesByPeriod = () => {
  const now = new Date();
  let filtered = [...voyages];

  switch (selectedPeriod) {
    case 'day':
      filtered = voyages.filter(voyage => {
        const voyageDate = new Date(voyage.date);
        return voyageDate.toDateString() === now.toDateString();
      });
      break;
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      filtered = voyages.filter(voyage => {
        const voyageDate = new Date(voyage.date);
        return voyageDate >= weekStart && voyageDate <= weekEnd;
      });
      break;
    case 'month':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      
      filtered = voyages.filter(voyage => {
        const voyageDate = new Date(voyage.date);
        return voyageDate >= monthStart && voyageDate <= monthEnd;
      });
      break;
    case 'custom':
      if (customStartDate && customEndDate) {
        const start = parseDate(customStartDate);
        const end = parseDate(customEndDate);
        
        if (start && end) {
          end.setHours(23, 59, 59, 999);
          filtered = voyages.filter(voyage => {
            const voyageDate = new Date(voyage.date);
            return voyageDate >= start && voyageDate <= end;
          });
        }
      }
      break;
  }

  setFilteredVoyages(filtered);
};

const parseDate = (dateString: string): Date | null => {
  const parts = dateString.split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  
  return new Date(year, month, day);
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('fr-FR');
};

const getChartData = () => {
  const data = calculateChartData();
  return {
    labels: data.labels,
    datasets: [
      {
        data: data.values,
        color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };
};

const calculateChartData = () => {
  switch (selectedPeriod) {
    case 'day':
      return calculateHourlyData();
    case 'week':
      return calculateWeeklyData();
    case 'month':
      return calculateMonthlyData();
    case 'custom':
      return calculateCustomData();
    default:
      return calculateWeeklyData();
  }
};

const calculateHourlyData = () => {
  const hourlyData = Array(24).fill(0);
  const hourlyLabels = Array.from({ length: 24 }, (_, i) => `${i}h`);
  
  filteredVoyages.forEach(voyage => {
    const date = new Date(voyage.date);
    const hour = date.getHours();
    hourlyData[hour] += voyage.recetteBrute;
  });
  
  return { labels: hourlyLabels, values: hourlyData };
};

const calculateWeeklyData = () => {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const dailyData = Array(7).fill(0);
  
  filteredVoyages.forEach(voyage => {
    const date = new Date(voyage.date);
    const dayOfWeek = (date.getDay() + 6) % 7; // Monday = 0
    dailyData[dayOfWeek] += voyage.recetteBrute;
  });
  
  return { labels: days, values: dailyData };
};

const calculateMonthlyData = () => {
  const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
  const weeklyData = Array(4).fill(0);
  
  filteredVoyages.forEach(voyage => {
    const date = new Date(voyage.date);
    const weekOfMonth = Math.min(Math.floor(date.getDate() / 7), 3);
    weeklyData[weekOfMonth] += voyage.recetteBrute;
  });
  
  return { labels: weeks, values: weeklyData };
};

const calculateCustomData = () => {
  if (!customStartDate || !customEndDate) {
    return { labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'], values: [0, 0, 0, 0, 0, 0] };
  }
  
  const start = parseDate(customStartDate);
  const end = parseDate(customEndDate);
  
  if (!start || !end) {
    return { labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'], values: [0, 0, 0, 0, 0, 0] };
  }
  
  const months = [];
  const monthlyData = [];
  
  let current = new Date(start);
  while (current <= end) {
    months.push(current.toLocaleDateString('fr-FR', { month: 'short' }));
    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    
    const monthTotal = filteredVoyages
      .filter(voyage => {
        const voyageDate = new Date(voyage.date);
        return voyageDate >= monthStart && voyageDate <= monthEnd;
      })
      .reduce((sum, voyage) => sum + voyage.recetteBrute, 0);
    
    monthlyData.push(monthTotal);
    current.setMonth(current.getMonth() + 1);
  }
  
  return { labels: months, values: monthlyData };
};

const getStats = () => {
  const totalVoyages = filteredVoyages.length;
  const totalRecettes = filteredVoyages.reduce((sum, voyage) => sum + voyage.recetteBrute, 0);
  const totalPassagers = filteredVoyages.reduce((sum, voyage) => sum + voyage.nombrePlaces, 0);

  return [
    { title: 'Voyages', value: totalVoyages.toString(), icon: 'bus', color: '#007bff' },
    { title: 'Recettes', value: `${totalRecettes.toLocaleString()} FCFA`, icon: 'cash', color: '#28a745' },
    { title: 'Passagers', value: totalPassagers.toString(), icon: 'people', color: '#ffc107' },
  ];
};

const getSummary = () => {
  const totalRecettes = filteredVoyages.reduce((sum, voyage) => sum + voyage.recetteBrute, 0);
  const averageDaily = filteredVoyages.length > 0 ? totalRecettes / filteredVoyages.length : 0;
  
  let bestVoyage = null;
  let bestAmount = 0;
  
  filteredVoyages.forEach(voyage => {
    if (voyage.recetteBrute > bestAmount) {
      bestAmount = voyage.recetteBrute;
      bestVoyage = voyage;
    }
  });

  let periodLabel = '';
  switch (selectedPeriod) {
    case 'day':
      periodLabel = `Aujourd'hui, ${formatDate(new Date())}`;
      break;
    case 'week':
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      periodLabel = `Semaine du ${formatDate(weekStart)}`;
      break;
    case 'month':
      periodLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      break;
    case 'custom':
      periodLabel = customPeriodLabel;
      break;
  }

  return {
    period: periodLabel,
    best: bestVoyage ? `${formatDate(new Date(bestVoyage.date))} (${bestAmount.toLocaleString()} FCFA)` : 'Aucune donnée',
    average: `${Math.round(averageDaily).toLocaleString()} FCFA`,
  };
};

  const handlePeriodChange = (period: string) => {
    if (period === 'custom') {
      setShowCustomModal(true);
    } else {
      setSelectedPeriod(period);
    }
  };

  const validateDate = (date: string): boolean => {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(date)) {
      return false;
    }
    const [day, month, year] = date.split('/').map(Number);
    const testDate = new Date(year, month - 1, day);
    return testDate.getFullYear() === year &&
           testDate.getMonth() === month - 1 &&
           testDate.getDate() === day;
  };

  const handleCustomDateConfirm = () => {
    // Reset errors
    setStartDateError('');
    setEndDateError('');
    setDateRangeError('');

    let hasError = false;

    // Validate start date
    if (!customStartDate) {
      setStartDateError('La date de début est requise');
      hasError = true;
    } else if (!validateDate(customStartDate)) {
      setStartDateError('Format invalide (JJ/MM/AAAA)');
      hasError = true;
    }

    // Validate end date
    if (!customEndDate) {
      setEndDateError('La date de fin est requise');
      hasError = true;
    } else if (!validateDate(customEndDate)) {
      setEndDateError('Format invalide (JJ/MM/AAAA)');
      hasError = true;
    }

    // Validate date range
    if (customStartDate && customEndDate && !hasError) {
      const [startDay, startMonth, startYear] = customStartDate.split('/').map(Number);
      const [endDay, endMonth, endYear] = customEndDate.split('/').map(Number);
      
      const startDate = new Date(startYear, startMonth - 1, startDay);
      const endDate = new Date(endYear, endMonth - 1, endDay);
      
      if (endDate < startDate) {
        setDateRangeError('La date de fin doit être après la date de début');
        hasError = true;
      } else if (endDate.getTime() - startDate.getTime() > 365 * 24 * 60 * 60 * 1000) {
        setDateRangeError('La période ne peut dépasser 1 an');
        hasError = true;
      }
    }

    if (!hasError) {
      const formattedStartDate = formatDateForDisplay(customStartDate);
      const formattedEndDate = formatDateForDisplay(customEndDate);
      setCustomPeriodLabel(`${formattedStartDate} - ${formattedEndDate}`);
      setSelectedPeriod('custom');
      setShowCustomModal(false);
    }
  };

  const formatDateForDisplay = (date: string): string => {
    const [day, month, year] = date.split('/');
    const months = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
    return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
  };

  const handleDateInput = (text: string, type: 'start' | 'end') => {
    // Auto-format date as user types
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    
    if (cleaned.length >= 2) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    if (cleaned.length >= 4) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
    }

    if (type === 'start') {
      setCustomStartDate(formatted);
      setStartDateError('');
    } else {
      setCustomEndDate(formatted);
      setEndDateError('');
    }
    setDateRangeError('');
  };

  const chartData = getChartData();
  const stats = getStats();
  const summary = getSummary();

  const generatePDF = async () => {
    try {
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Rapport de Statistiques - Transport Express</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
              .title { color: #007bff; font-size: 24px; font-weight: bold; }
              .subtitle { color: #666; font-size: 16px; margin-top: 5px; }
              .section { margin-bottom: 25px; }
              .section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 15px; border-left: 4px solid #007bff; padding-left: 10px; }
              .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
              .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid; }
              .stat-value { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 5px; }
              .stat-label { font-size: 14px; color: #666; }
              .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .summary-table th, .summary-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              .summary-table th { background-color: #f8f9fa; font-weight: bold; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
              .date { color: #007bff; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Rapport de Statistiques</div>
              <div class="subtitle">Original Express - ${summary.period}</div>
              <div class="date">Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
            </div>

            <div class="section">
              <div class="section-title">Statistiques Principales</div>
              <div class="stats-grid">
                ${stats.map(stat => `
                  <div class="stat-card" style="border-left-color: ${stat.color};">
                    <div class="stat-value">${stat.value}</div>
                    <div class="stat-label">${stat.title}</div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="section">
              <div class="section-title">Résumé de la Période</div>
              <table class="summary-table">
                <tr>
                  <th>Période sélectionnée</th>
                  <td>${summary.period}</td>
                </tr>
                <tr>
                  <th>Meilleur période</th>
                  <td>${summary.best}</td>
                </tr>
                <tr>
                  <th>Moyenne journalière</th>
                  <td>${summary.average}</td>
                </tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Données Graphiques</div>
              <p><strong>Période:</strong> ${selectedPeriod === 'day' ? 'Journée' :
                selectedPeriod === 'week' ? 'Semaine' :
                selectedPeriod === 'month' ? 'Mois' : 'Période personnalisée'}</p>
              <p><strong>Données:</strong> ${chartData.datasets[0].data.join(', ')} ${selectedPeriod === 'day' ? 'FCFA' : 'FCFA'}</p>
            </div>

            <div class="footer">
              <p>Ce rapport a été généré automatiquement par l'application Transport Express</p>
              <p>Pour toute question, contactez le support technique</p>
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
        Alert.alert(
          'Succès',
          `Le rapport PDF a été généré avec succès: ${uri}`
        );
      }
    } catch (error) {
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.'
      );
      console.error('PDF Generation Error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Statistiques</Text>
            <TouchableOpacity style={styles.exportButton} onPress={generatePDF}>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.exportButtonText}>Exporter PDF</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.periodSelector}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.id}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.id && styles.periodButtonActive,
                ]}
                onPress={() => handlePeriodChange(period.id)}
              >
                <Ionicons
                  name={period.icon as any}
                  size={16}
                  color={selectedPeriod === period.id ? '#fff' : '#007bff'}
                />
                <Text
                  style={[
                    styles.periodText,
                    selectedPeriod === period.id && styles.periodTextActive,
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Modal
            visible={showCustomModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowCustomModal(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Période personnalisée</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowCustomModal(false)}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.modalDescription}>
                  Sélectionnez une plage de dates personnalisée pour vos statistiques
                </Text>
                
                <View style={styles.dateInputsContainer}>
                  <View style={styles.dateInputWrapper}>
                    <Text style={styles.inputLabel}>Date de début</Text>
                    <View style={styles.inputWithIcon}>
                      <Ionicons name="calendar-outline" size={20} color="#007bff" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, startDateError && styles.inputError]}
                        placeholder="JJ/MM/AAAA"
                        value={customStartDate}
                        onChangeText={(text) => handleDateInput(text, 'start')}
                        keyboardType="numeric"
                        maxLength={10}
                      />
                    </View>
                    {startDateError ? (
                      <Text style={styles.errorText}>{startDateError}</Text>
                    ) : null}
                  </View>
                  
                  <View style={styles.dateSeparator}>
                    <Ionicons name="arrow-forward" size={20} color="#666" />
                  </View>
                  
                  <View style={styles.dateInputWrapper}>
                    <Text style={styles.inputLabel}>Date de fin</Text>
                    <View style={styles.inputWithIcon}>
                      <Ionicons name="calendar-outline" size={20} color="#007bff" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, endDateError && styles.inputError]}
                        placeholder="JJ/MM/AAAA"
                        value={customEndDate}
                        onChangeText={(text) => handleDateInput(text, 'end')}
                        keyboardType="numeric"
                        maxLength={10}
                      />
                    </View>
                    {endDateError ? (
                      <Text style={styles.errorText}>{endDateError}</Text>
                    ) : null}
                  </View>
                </View>
                
                {dateRangeError ? (
                  <View style={styles.rangeErrorContainer}>
                    <Ionicons name="alert-circle-outline" size={16} color="#dc3545" />
                    <Text style={styles.rangeErrorText}>{dateRangeError}</Text>
                  </View>
                ) : null}
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowCustomModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleCustomDateConfirm}
                  >
                    <Text style={styles.confirmButtonText}>Appliquer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Recettes par jour</Text>
            <LineChart
              data={chartData}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#007bff',
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>

          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <View key={index} style={[styles.statCard, { borderLeftColor: stat.color }]}>
                <View style={styles.statIcon}>
                  <Ionicons name={stat.icon as any} size={24} color={stat.color} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statTitle}>{stat.title}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Résumé de la période</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Période sélectionnée:</Text>
                <Text style={styles.summaryValue}>{summary.period}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Meilleur période:</Text>
                <Text style={styles.summaryValue}>{summary.best}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Moyenne journalière:</Text>
                <Text style={styles.summaryValue}>{summary.average}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 20,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  periodButtonActive: {
    backgroundColor: '#007bff',
  },
  periodText: {
    fontSize: 12,
    color: '#007bff',
    marginLeft: 4,
  },
  periodTextActive: {
    color: '#fff',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
  },
  summaryContainer: {
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  dateInputsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  dateInputWrapper: {
    flex: 1,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 10,
    zIndex: 1,
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 4,
  },
  dateSeparator: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 25,
  },
  rangeErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8d7da',
    borderRadius: 8,
  },
  rangeErrorText: {
    fontSize: 14,
    color: '#721c24',
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    paddingLeft: 40,
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
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: '#007bff',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default StatisticsScreen;