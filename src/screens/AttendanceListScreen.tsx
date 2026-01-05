import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../navigation/types';
import { AttendanceService, SessionService, UserService, CourseService } from '../services';
import type { AttendanceRecord, User, Session, Course } from '../types/models';

type FilterStatus = 'ALL' | 'PRESENT' | 'ABSENT' | 'LATE';
const statusFilters: FilterStatus[] = ['ALL', 'PRESENT', 'ABSENT', 'LATE'];
const statusLabels: Record<Exclude<FilterStatus, 'ALL'>, string> = {
  PRESENT: 'Présent',
  ABSENT: 'Absent',
  LATE: 'Retard',
};

type AttendanceNavigationProp = StackNavigationProp<RootStackParamList, 'AttendanceList'>;
type AttendanceRouteProp = RouteProp<RootStackParamList, 'AttendanceList'>;

interface AttendanceWithStudent extends AttendanceRecord {
  student?: User;
}

const AttendanceListScreen = () => {
  const navigation = useNavigation<AttendanceNavigationProp>();
  const route = useRoute<AttendanceRouteProp>();
  const { courseId } = route.params;
  
  const heroAnim = useRef(new Animated.Value(0)).current;
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [records, setRecords] = useState<AttendanceWithStudent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: 1,
      duration: 600,
      delay: 120,
      useNativeDriver: true,
    }).start();
  }, [heroAnim]);

  const loadData = useCallback(async () => {
    try {
      // Load course info
      const courseData = await CourseService.getCourseById(courseId);
      setCourse(courseData);

      // Load sessions for this course
      const sessionsData = await SessionService.getSessionsByCourseId(courseId);
      setSessions(sessionsData.sort((a, b) => 
        (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0)
      ));

      // Select the most recent session by default
      if (sessionsData.length > 0) {
        const latestSession = sessionsData[0];
        setSelectedSession(latestSession);
        await loadAttendance(latestSession.id!);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setErrorMessage('Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId]);

  const loadAttendance = async (sessionId: string) => {
    try {
      const attendanceData = await AttendanceService.getAttendanceBySessionId(sessionId);
      
      // Load student info for each attendance record
      const studentIds = [...new Set(attendanceData.map(r => r.studentId).filter(Boolean))];
      
      console.log('Loading students for IDs:', studentIds);
      
      const studentsResults = await Promise.all(
        studentIds.map(async (id) => {
          try {
            const student = await UserService.getUserById(id);
            console.log(`Student ${id}:`, student?.displayName || 'NOT FOUND');
            return student;
          } catch (e) {
            console.error(`Error loading student ${id}:`, e);
            return null;
          }
        })
      );
      
      const studentMap = new Map(
        studentsResults
          .filter((s): s is NonNullable<typeof s> => s !== null)
          .map(s => [s.uid, s])
      );
      
      console.log('Student map size:', studentMap.size);
      
      const recordsWithStudents: AttendanceWithStudent[] = attendanceData.map(record => {
        const student = studentMap.get(record.studentId);
        return {
          ...record,
          student: student || undefined,
        };
      });
      
      setRecords(recordsWithStudents);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error loading attendance:', error);
      setErrorMessage('Erreur lors du chargement des présences.');
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleSessionSelect = async (session: Session) => {
    setSelectedSession(session);
    setLoading(true);
    await loadAttendance(session.id!);
    setLoading(false);
  };

  const filteredRecords = records.filter(record => {
    if (statusFilter === 'ALL') return true;
    const normalizedStatus = record.status.toUpperCase();
    return normalizedStatus === statusFilter;
  });

  const stats = {
    total: records.length,
    present: records.filter(r => r.status.toUpperCase() === 'PRESENT').length,
    late: records.filter(r => r.status.toUpperCase() === 'LATE').length,
    absent: records.filter(r => r.status.toUpperCase() === 'ABSENT').length,
  };

  const getStatusColor = (status: string): string => {
    switch (status.toUpperCase()) {
      case 'PRESENT':
        return '#22c55e';
      case 'LATE':
        return '#f59e0b';
      case 'ABSENT':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const renderAttendanceItem = ({ item }: { item: AttendanceWithStudent }) => {
    const studentName = item.student?.displayName || 
                        item.student?.email?.split('@')[0] || 
                        `Étudiant (${item.studentId?.slice(0, 8)}...)`;
    const studentEmail = item.student?.email || '';
    
    return (
      <View style={styles.attendanceCard}>
        <View style={styles.studentInfo}>
          <View style={[styles.avatar, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Ionicons name="person" size={24} color={getStatusColor(item.status)} />
          </View>
          <View style={styles.studentDetails}>
            <Text style={styles.studentName}>{studentName}</Text>
            <Text style={styles.studentEmail}>{studentEmail}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {statusLabels[item.status.toUpperCase() as keyof typeof statusLabels] || item.status}
          </Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <LinearGradient colors={['#05060f', '#0d1224', '#141f3c']} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#05060f', '#0d1224', '#141f3c']} style={styles.gradient}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: heroAnim,
            transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ProfessorHome' as any)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>{course?.name || 'Présences'}</Text>
          <Text style={styles.subtitle}>Liste des présences</Text>
        </View>
      </Animated.View>

      {/* Session Selector */}
      {sessions.length > 0 && (
        <View style={styles.sessionSelector}>
          <Text style={styles.sectionLabel}>Session</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={sessions}
            keyExtractor={(item) => item.id!}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.sessionChip,
                  selectedSession?.id === item.id && styles.sessionChipActive,
                ]}
                onPress={() => handleSessionSelect(item)}
              >
                <Text
                  style={[
                    styles.sessionChipText,
                    selectedSession?.id === item.id && styles.sessionChipTextActive,
                  ]}
                >
                  {item.startTime?.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                {item.isActive && (
                  <View style={styles.activeDot} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#22c55e20' }]}>
          <Text style={[styles.statValue, { color: '#22c55e' }]}>{stats.present}</Text>
          <Text style={styles.statLabel}>Présents</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#f59e0b20' }]}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.late}</Text>
          <Text style={styles.statLabel}>Retards</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#ef444420' }]}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.absent}</Text>
          <Text style={styles.statLabel}>Absents</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {statusFilters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, statusFilter === filter && styles.filterTabActive]}
            onPress={() => setStatusFilter(filter)}
          >
            <Text
              style={[styles.filterTabText, statusFilter === filter && styles.filterTabTextActive]}
            >
              {filter === 'ALL' ? 'Tous' : statusLabels[filter]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Error Message */}
      {errorMessage && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={24} color="#ef4444" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Attendance List */}
      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id || item.studentId}
        renderItem={renderAttendanceItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#4b5563" />
            <Text style={styles.emptyText}>Aucune présence enregistrée</Text>
          </View>
        }
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#9ca3af',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  sessionSelector: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sessionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sessionChipActive: {
    backgroundColor: 'rgba(59,130,246,0.2)',
    borderColor: '#3b82f6',
  },
  sessionChipText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  sessionChipTextActive: {
    color: '#3b82f6',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
  },
  filterTabText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  filterTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    marginLeft: 8,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  attendanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  studentEmail: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
});

export default AttendanceListScreen;
