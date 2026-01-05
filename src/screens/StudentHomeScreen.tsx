import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { AttendanceService, CourseService, GroupService, SessionService } from '../services';
import { AttendanceRecord, Course, Group, Session } from '../types/models';

type StudentNavigationProp = StackNavigationProp<RootStackParamList, 'StudentHome'>;

const StudentHomeScreen = () => {
  const navigation = useNavigation<StudentNavigationProp>();
  const { user, logOut } = useAuth();
  const heroAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myGroup, setMyGroup] = useState<Group | null>(null);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      // Get all courses first (needed for attendance history)
      const coursesData = await CourseService.getAllCourses();
      setAllCourses(coursesData);
      
      // Get student's group
      const groups = await GroupService.getAllGroups();
      const studentGroup = groups.find(g => g.studentIds?.includes(user.uid));
      setMyGroup(studentGroup || null);
      
      // Récupérer les sessions pour les cours
      let sessionsData: Session[] = [];
      if (studentGroup) {
        // Get courses for this group
        const groupCourses = coursesData.filter(c => c.groupIds?.includes(studentGroup.id!));
        setMyCourses(groupCourses);
        
        // Récupérer les sessions de tous les cours du groupe
        const sessionsPromises = groupCourses.map(c => SessionService.getSessionsByCourseId(c.id!));
        const sessionsArrays = await Promise.all(sessionsPromises);
        sessionsData = sessionsArrays.flat();
      }
      setAllSessions(sessionsData);
      
      // Get attendance records
      const attendance = await AttendanceService.getAttendanceByStudentId(user.uid);
      setMyAttendance(attendance);
    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: 1,
      duration: 800,
      delay: 150,
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ]),
    ).start();
  }, [heroAnim, glowAnim]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.1] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });

  const handleScanPress = () => {
    navigation.navigate('ScanQr');
  };

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getCourseName = (sessionId: string, courseIdDirect?: string) => {
    // Essayer d'abord avec le courseId direct s'il existe
    if (courseIdDirect) {
      const course = allCourses.find(c => c.id === courseIdDirect);
      if (course) return course.name;
    }
    
    // Sinon, trouver le cours via la session
    const session = allSessions.find(s => s.id === sessionId);
    if (session) {
      const course = allCourses.find(c => c.id === session.courseId);
      if (course) return course.name;
    }
    
    return 'Cours inconnu';
  };
  
  const getAttendanceDate = (item: AttendanceRecord): Date | null => {
    // Prendre scannedAt, sinon createdAt, sinon timestamp
    if (item.scannedAt) return new Date(item.scannedAt);
    if (item.createdAt) return new Date(item.createdAt);
    if (item.timestamp) return new Date(item.timestamp);
    return null;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderAttendanceItem = ({ item }: { item: AttendanceRecord }) => {
    const normalizedStatus = item.status?.toLowerCase() || 'absent';
    const isPresent = normalizedStatus === 'present';
    const isLate = normalizedStatus === 'late';
    
    const getStatusLabel = () => {
      if (isPresent) return 'Présent';
      if (isLate) return 'Retard';
      return 'Absent';
    };
    
    const getStatusStyle = () => {
      if (isPresent) return styles.presentBadge;
      if (isLate) return styles.lateBadge;
      return styles.absentBadge;
    };
    
    const attendanceDate = getAttendanceDate(item);
    const formattedDate = attendanceDate ? formatDate(attendanceDate) : 'Date inconnue';
    
    return (
      <View style={styles.attendanceCard}>
        <View style={styles.attendanceIcon}>
          <Text style={styles.attendanceIconText}>{isPresent ? '✓' : isLate ? '⏰' : '✗'}</Text>
        </View>
        <View style={styles.attendanceInfo}>
          <Text style={styles.attendanceCourseName}>{getCourseName(item.sessionId, item.courseId)}</Text>
          <Text style={styles.attendanceDate}>{formattedDate}</Text>
        </View>
        <View style={[styles.statusBadge, getStatusStyle()]}>
          <Text style={styles.statusBadgeText}>{getStatusLabel()}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#05060f', '#0d1224', '#141f3c']} style={[styles.gradient, styles.centered]}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#05060f', '#0d1224', '#141f3c']} style={styles.gradient}>
      <FlatList
        data={myAttendance.slice(0, 10)}
        keyExtractor={(item) => item.id!}
        renderItem={renderAttendanceItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
        }
        ListHeaderComponent={
          <>
            <Animated.View
              style={[
                styles.hero,
                {
                  opacity: heroAnim,
                  transform: [
                    {
                      translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [25, 0] }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.topBar}>
                <View style={styles.badgeRow}>
                  <Text style={styles.badge}>Espace étudiant</Text>
                  {myGroup && (
                    <>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>{myGroup.name}</Text>
                    </>
                  )}
                </View>
                <TouchableOpacity style={styles.logoutButton} activeOpacity={0.85} onPress={handleLogout}>
                  <Ionicons name="log-out-outline" size={16} color="#f8fafc" />
                  <Text style={styles.logoutText}>Déconnexion</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.title}>Bonjour, {user?.displayName?.split(' ')[0] || 'Étudiant'} !</Text>
              <Text style={styles.subtitle}>
                Scanne le QR code de ton professeur pour enregistrer ta présence.
              </Text>
            </Animated.View>

            <View style={styles.card}>
              <Animated.View
                style={[
                  styles.glow,
                  {
                    opacity: glowOpacity,
                    transform: [{ scale: glowScale }],
                  },
                ]}
              />
              <View style={styles.cardContent}>
                <View style={styles.iconCircle}>
                  <Ionicons name="scan-outline" size={32} color="#38bdf8" />
                </View>
                <Text style={styles.cardTitle}>Scanner un QR</Text>
                <Text style={styles.cardText}>Ouvre la caméra et cadre le QR code partagé par ton enseignant.</Text>
                <TouchableOpacity style={styles.scanButton} activeOpacity={0.9} onPress={handleScanPress}>
                  <Ionicons name="camera" size={18} color="#0f172a" />
                  <Text style={styles.scanText}>Lancer le scanner</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{myCourses.length}</Text>
                <Text style={styles.statLabel}>Cours</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{myAttendance.length}</Text>
                <Text style={styles.statLabel}>Présences</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Historique récent</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Aucune présence enregistrée</Text>
            <Text style={styles.emptySubtext}>Scanne un QR code pour commencer</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
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
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 40,
  },
  hero: {
    marginBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: '#cbd5f5',
    fontSize: 12,
    letterSpacing: 1,
    overflow: 'hidden',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 8,
    backgroundColor: '#34d399',
  },
  statusText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.25)',
  },
  logoutText: {
    color: '#f8fafc',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 13,
  },
  title: {
    fontSize: 28,
    color: '#f8fafc',
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#cbd5f5',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: 'rgba(9, 13, 27, 0.9)',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    overflow: 'hidden',
    marginBottom: 24,
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#38bdf8',
    alignSelf: 'center',
    top: -40,
  },
  cardContent: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: '#38bdf8',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  scanText: {
    color: '#0f172a',
    fontWeight: '700',
    marginLeft: 10,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 24,
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
    fontSize: 28,
    fontWeight: '700',
    color: '#38bdf8',
  },
  statLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 16,
  },
  attendanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  attendanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attendanceIconText: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '700',
  },
  attendanceInfo: {
    flex: 1,
  },
  attendanceCourseName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
  },
  attendanceDate: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  presentBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  lateBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  absentBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6ee7b7',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
});

export default StudentHomeScreen;
