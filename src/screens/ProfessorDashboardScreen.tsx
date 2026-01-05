import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Course, Session } from '../types/models';
import { CourseService, SessionService } from '../services';
import { useAuth } from '../contexts/AuthContext';

type ProfessorDashboardScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'ProfessorDashboard'>;
};

const ProfessorDashboardScreen = ({ navigation }: ProfessorDashboardScreenProps) => {
  const { user, logOut } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      const [coursesData, sessionsData] = await Promise.all([
        CourseService.getCoursesByProfessorId(user.uid),
        SessionService.getActiveSessionsByProfessorId(user.uid),
      ]);
      setCourses(coursesData);
      // Filter sessions for this professor's courses
      const courseIds = coursesData.map(c => c.id);
      const mySessions = sessionsData.filter(s => courseIds.includes(s.courseId));
      setActiveSessions(mySessions);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleStartSession = (course: Course) => {
    navigation.navigate('GenerateQr', { courseId: course.id! });
  };

  const handleViewAttendance = (course: Course) => {
    navigation.navigate('AttendanceList', { courseId: course.id! });
  };

  const renderCourseCard = ({ item }: { item: Course }) => {
    const hasActiveSession = activeSessions.some(s => s.courseId === item.id);
    
    return (
      <View style={styles.courseCard}>
        <View style={styles.courseHeader}>
          <Text style={styles.courseIcon}>📖</Text>
          <View style={styles.courseInfo}>
            <Text style={styles.courseName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.courseDescription}>{item.description}</Text>
            )}
          </View>
          {hasActiveSession && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>🟢 Actif</Text>
            </View>
          )}
        </View>
        
        <View style={styles.courseActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.qrButton]}
            onPress={() => handleStartSession(item)}
          >
            <Text style={styles.actionBtnIcon}>📲</Text>
            <Text style={styles.actionBtnText}>
              {hasActiveSession ? 'Voir QR' : 'Démarrer session'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionBtn, styles.listButton]}
            onPress={() => handleViewAttendance(item)}
          >
            <Text style={styles.actionBtnIcon}>📋</Text>
            <Text style={styles.actionBtnText}>Présences</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#070b17', '#0e1629', '#111f3c']} style={[styles.gradient, styles.centered]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#070b17', '#0e1629', '#111f3c']} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.badge}>Professeur</Text>
            <Text style={styles.title}>Mes cours</Text>
            <Text style={styles.subtitle}>
              Bienvenue, {user?.displayName || 'Professeur'}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{courses.length}</Text>
            <Text style={styles.statLabel}>Cours</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{activeSessions.length}</Text>
            <Text style={styles.statLabel}>Sessions actives</Text>
          </View>
        </View>

        {/* Courses List */}
        <Text style={styles.sectionTitle}>Mes cours</Text>
        
        {courses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyText}>Aucun cours assigné</Text>
            <Text style={styles.emptySubtext}>
              Contactez l'administrateur pour vous assigner des cours
            </Text>
          </View>
        ) : (
          <FlatList
            data={courses}
            keyExtractor={(item) => item.id!}
            renderItem={renderCourseCard}
            scrollEnabled={false}
            contentContainerStyle={styles.coursesList}
          />
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#93c5fd',
    fontSize: 12,
    marginBottom: 12,
    letterSpacing: 1,
    overflow: 'hidden',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 4,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 16,
  },
  coursesList: {
    paddingBottom: 20,
  },
  courseCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  courseIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
  },
  courseDescription: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  activeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '600',
  },
  courseActions: {
    flexDirection: 'row',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  qrButton: {
    backgroundColor: '#3b82f6',
  },
  listButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  actionBtnIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default ProfessorDashboardScreen;
