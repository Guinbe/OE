import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import OriginalExpressLogo from '../../assets/images/logo';
import { useUser } from '../../contexts/UserContext';
import { supabase } from '@/lib/supabase';


const DashboardScreen = () => {
  const router = useRouter();
  const { user } = useUser();
  const [voyages, setVoyages] = useState<any[]>([]);
  const [statsData, setStatsData] = useState({
    voyagesToday: 0,
    totalRevenue: 0,
    activeDrivers: new Set<string>(),
    activeVehicles: new Set<string>(),
  });

  useEffect(() => {
    if (user) {
      loadVoyages();
      // ---- DÉBUT DU NOUVEAU CODE ----
      
          // 1. On crée un "canal" de communication unique pour cet écran.
          const channel = supabase
            .channel('realtime-voyages')
            .on(
              'postgres_changes', // On écoute les changements de la base de données
              {
                event: '*',       // '*' signifie INSERT, UPDATE, ou DELETE
                schema: 'public',
                table: 'voyages'  // On écoute spécifiquement la table 'voyages'
              },
              (payload) => {
                // 2. Quand un changement est détecté, on affiche un log et on recharge les données.
                console.log('Changement détecté dans les voyages !', payload);
                loadVoyages();
              }
            )
            .subscribe();
      
          // 3. Très important : on se désabonne quand l'écran est quitté.
          return () => {
            supabase.removeChannel(channel);
          };
      
          // ---- FIN DU NOUVEAU CODE ----
    }
  }, [user]);

  const loadVoyages = async () => {
    try {
      let query = supabase.from('voyages').select('*');
      
      // Filter based on user role
      if (user?.role !== 'admin') {
        query = query.eq('agent_id', user?.id);
      }
      
      const { data: voyagesData, error } = await query;
      
      if (error) {
        console.error('Error loading voyages:', error);
        return;
      }
      
      const allVoyages = voyagesData || [];
      
      // Calculate today's date
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate stats
      const todayVoyages = allVoyages.filter(voyage =>
        voyage.date === today
      );

      const activeDrivers = new Set<string>();
      const activeVehicles = new Set<string>();
      let totalRevenue = 0;

      todayVoyages.forEach(voyage => {
        activeDrivers.add(voyage.nom_chauffeur);
        activeVehicles.add(voyage.numero_vehicule);
        totalRevenue += voyage.recette_brute || 0;
      });

      setStatsData({
        voyagesToday: todayVoyages.length,
        totalRevenue,
        activeDrivers,
        activeVehicles,
      });
      
      setVoyages(allVoyages);
    } catch (error) {
      console.error('Error loading voyages:', error);
    }
  };

  const quickActions = [
    { title: 'Nouveau voyage', icon: 'add-circle', screen: '/(tabs)/inventory' },
    { title: 'Statistiques', icon: 'stats-chart', screen: '/(tabs)/statistics' },
    { title: 'Messages', icon: 'chatbubbles', screen: '/(tabs)/messages' },
    { title: 'Personnel', icon: 'people', screen: '/(tabs)/personnel' },
  ];

  const dashboardStats = [
    {
      title: 'Voyages aujourd\'hui',
      value: statsData.voyagesToday.toString(),
      icon: 'bus',
      color: '#007bff'
    },
    {
      title: 'Recette totale',
      value: `${statsData.totalRevenue.toLocaleString()} FCFA`,
      icon: 'cash',
      color: '#28a745'
    },
    {
      title: 'Chauffeurs actifs',
      value: statsData.activeDrivers.size.toString(),
      icon: 'people',
      color: '#ffc107'
    },
    {
      title: 'Véhicules en service',
      value: statsData.activeVehicles.size.toString(),
      icon: 'car',
      color: '#dc3545'
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <OriginalExpressLogo size="medium" showSubtitle={true} />
        </View>

        <View style={styles.content}>
          <Text style={styles.welcomeText}>Tableau de bord</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>

          <View style={styles.statsContainer}>
            {dashboardStats.map((stat, index) => (
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

          <View style={styles.actionsContainer}>
            <Text style={styles.sectionTitle}>Actions rapides</Text>
            <View style={styles.actionsGrid}>
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.actionCard}
                  onPress={() => router.push(action.screen as any)}
                >
                  <Ionicons name={action.icon as any} size={32} color="#007bff" />
                  <Text style={styles.actionTitle}>{action.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Informations de l'entreprise</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="business" size={20} color="#007bff" />
                <Text style={styles.infoText}>ORIGINAL EXPRESS</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color="#007bff" />
                <Text style={styles.infoText}>Meidougou, Cameroun</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="call" size={20} color="#007bff" />
                <Text style={styles.infoText}>+237 6 00 00 00 00</Text>
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
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  content: {
    padding: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  statsContainer: {
    marginBottom: 30,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  infoContainer: {
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
});

export default DashboardScreen;