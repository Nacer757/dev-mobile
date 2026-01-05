import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { SessionService, CourseService, AttendanceService, GroupService, UserService } from '../services';
import { Course, Session, QrPayload, AttendanceRecord, User, Group } from '../types/models';

const quickDurations = [5, 10, 15, 20, 30, 45];

type GenerateQrScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'GenerateQr'>;
};

type GenerateQrRouteProp = RouteProp<RootStackParamList, 'GenerateQr'>;

interface StudentAttendanceRow {
  student: User;
  status: 'present' | 'absent' | 'late';
  scannedAt?: Date;
}

const GenerateQrScreen = ({ navigation }: GenerateQrScreenProps) => {
  const route = useRoute<GenerateQrRouteProp>();
  const { user } = useAuth();
  const { courseId } = route.params;

  const [course, setCourse] = useState<Course | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiryMinutes, setExpiryMinutes] = useState(10);
  const [qrToken, setQrToken] = useState<string>(Date.now().toString());

  // Countdown state
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Session ended state
  const [sessionEnded, setSessionEnded] = useState(false);
  const [lastSession, setLastSession] = useState<Session | null>(null);
  const [lastSessionRecords, setLastSessionRecords] = useState<AttendanceRecord[]>([]);
  const [lastGroupId, setLastGroupId] = useState<string>('');

  // Attendance list modal
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceList, setAttendanceList] = useState<StudentAttendanceRow[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const glowAnim = useRef(new Animated.Value(0)).current;

  // Glow animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ]),
    ).start();
  }, [glowAnim]);

  // Countdown logic
  useEffect(() => {
    if (activeSession && timeLeft > 0) {
      countdownRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleAutoEndSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }
      };
    }
  }, [activeSession?.id]);

  const handleAutoEndSession = async () => {
    if (!activeSession) return;
    
    try {
      setLastSession(activeSession);
      setLastSessionRecords(attendanceRecords);
      setLastGroupId(selectedGroupId);
      
      await SessionService.endSession(activeSession.id!);
      setActiveSession(null);
      setSessionEnded(true);
      
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      
      Alert.alert('Temps ecoul\u00E9 !', 'La session de pr\u00E9sence est termin\u00E9e automatiquement.');
    } catch (error) {
      console.error('Error auto-ending session:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const loadData = useCallback(async () => {
    try {
      const allCourses = await CourseService.getAllCourses();
      const foundCourse = allCourses.find(c => c.id === courseId);
      setCourse(foundCourse || null);

      if (foundCourse?.groupIds && foundCourse.groupIds.length > 0) {
        const allGroups = await GroupService.getAllGroups();
        const courseGroups = allGroups.filter(g => foundCourse.groupIds?.includes(g.id!));
        setGroups(courseGroups);
        if (courseGroups.length > 0 && !selectedGroupId) {
          setSelectedGroupId(courseGroups[0].id!);
        }
      }

      if (user) {
        const activeSessions = await SessionService.getActiveSessionsByProfessorId(user.uid);
        const courseSession = activeSessions.find(s => s.courseId === courseId);
        
        if (courseSession) {
          setActiveSession(courseSession);
          setQrToken(courseSession.currentQrToken || courseSession.qrSecret || Date.now().toString());
          
          if (courseSession.expiresAt) {
            const remaining = Math.max(0, Math.floor((courseSession.expiresAt.getTime() - Date.now()) / 1000));
            setTimeLeft(remaining);
          }
          
          const records = await AttendanceService.getAttendanceBySessionId(courseSession.id!);
          setAttendanceRecords(records);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Erreur', 'Impossible de charger les donn\u00E9es du cours.');
    } finally {
      setLoading(false);
    }
  }, [courseId, user, selectedGroupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(async () => {
      try {
        const records = await AttendanceService.getAttendanceBySessionId(activeSession.id!);
        setAttendanceRecords(records);
      } catch (error) {
        console.error('Error refreshing attendance:', error);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const handleStartSession = async () => {
    if (!user || !courseId) return;
    if (!selectedGroupId) {
      Alert.alert('Erreur', 'Veuillez s\u00E9lectionner un groupe.');
      return;
    }

    setLoading(true);
    try {
      const newToken = Date.now().toString();
      const session = await SessionService.createSession(
        selectedGroupId,
        expiryMinutes,
        user.uid,
        courseId
      );
      
      setActiveSession(session);
      setQrToken(session.qrSecret || newToken);
      setAttendanceRecords([]);
      setTimeLeft(expiryMinutes * 60);
      setSessionEnded(false);
      Alert.alert('Session d\u00E9marr\u00E9e', `Les \u00E9tudiants ont ${expiryMinutes} minutes pour scanner le QR code.`);
    } catch (error) {
      console.error('Error creating session:', error);
      Alert.alert('Erreur', 'Impossible de d\u00E9marrer la session.');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;

    Alert.alert(
      'Terminer la session',
      'Voulez-vous vraiment terminer cette session de pr\u00E9sence ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Terminer',
          style: 'destructive',
          onPress: async () => {
            try {
              setLastSession(activeSession);
              setLastSessionRecords(attendanceRecords);
              setLastGroupId(selectedGroupId);
              
              await SessionService.endSession(activeSession.id!);
              setActiveSession(null);
              setTimeLeft(0);
              setSessionEnded(true);
              
              if (countdownRef.current) {
                clearInterval(countdownRef.current);
              }
              
              Alert.alert('Session termin\u00E9e', 'La session de pr\u00E9sence est termin\u00E9e.');
            } catch (error) {
              console.error('Error ending session:', error);
              Alert.alert('Erreur', 'Impossible de terminer la session.');
            }
          },
        },
      ]
    );
  };

  const handleRegenerateQr = async () => {
    if (!activeSession) return;

    try {
      const newToken = Date.now().toString();
      await SessionService.updateQrToken(activeSession.id!, newToken);
      setQrToken(newToken);
    } catch (error) {
      console.error('Error regenerating QR:', error);
      Alert.alert('Erreur', 'Impossible de r\u00E9g\u00E9n\u00E9rer le QR code.');
    }
  };

  const handleShare = async () => {
    if (!activeSession || !course) return;

    try {
      await Share.share({
        message: `Session de pr\u00E9sence pour ${course.name}\n\nScannez le QR code affich\u00E9 par le professeur pour enregistrer votre pr\u00E9sence.\n\nSession ID: ${activeSession.id}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const loadAttendanceList = async () => {
    if (!lastSession && !activeSession) return;
    
    const session = lastSession || activeSession;
    const records = lastSessionRecords.length > 0 ? lastSessionRecords : attendanceRecords;
    const groupId = lastGroupId || selectedGroupId;
    
    if (!session) return;
    
    setLoadingAttendance(true);
    try {
      const group = groups.find(g => g.id === (session.groupId || groupId));
      const studentIds = group?.studentIds || [];
      
      const studentsPromises = studentIds.map(id => UserService.getUserById(id));
      const students = await Promise.all(studentsPromises);
      const validStudents = students.filter((s): s is User => s !== null);
      
      const attendanceRows: StudentAttendanceRow[] = validStudents.map(student => {
        const record = records.find(r => r.studentId === student.uid);
        let status: 'present' | 'absent' | 'late' = 'absent';
        if (record) {
          const recordStatus = record.status.toLowerCase();
          if (recordStatus === 'late') status = 'late';
          else status = 'present';
        }
        return {
          student,
          status,
          scannedAt: record?.timestamp || record?.scannedAt || undefined,
        };
      });
      
      attendanceRows.sort((a, b) => {
        const order = { present: 0, late: 1, absent: 2 };
        return order[a.status] - order[b.status];
      });
      
      setAttendanceList(attendanceRows);
      setShowAttendanceModal(true);
    } catch (error) {
      console.error('Error loading attendance list:', error);
      Alert.alert('Erreur', 'Impossible de charger la liste des pr\u00E9sences.');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const qrPayload: QrPayload = {
    sessionId: activeSession?.id || '',
    courseId,
    token: qrToken,
    timestamp: Date.now(),
  };

  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.7] });
  const progressPercent = activeSession && expiryMinutes > 0 ? (timeLeft / (expiryMinutes * 60)) : 0;

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'present': return '#22c55e';
      case 'late': return '#f59e0b';
      case 'absent': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'present': return 'Pr\u00E9sent';
      case 'late': return 'Retard';
      case 'absent': return 'Absent';
      default: return status;
    }
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const displayGroup = groups.find(g => g.id === (lastGroupId || selectedGroupId));

  if (loading && !course) {
    return (
      <LinearGradient colors={['#070b17', '#0e1629', '#111f3c']} style={[styles.gradient, styles.centered]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#070b17', '#0e1629', '#111f3c']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ProfessorHome' as any)} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#3b82f6" />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{course?.name || 'Cours'}</Text>
          <Text style={styles.subtitle}>G\u00E9n\u00E9ration QR code</Text>
        </View>

        <View style={styles.qrContainer}>
          {activeSession ? (
            <>
              <View style={styles.countdownContainer}>
                <Text style={[styles.countdownText, timeLeft <= 60 && styles.countdownDanger]}>
                  {formatTime(timeLeft)}
                </Text>
                <Text style={styles.countdownLabel}>Temps restant</Text>
              </View>

              <Animated.View style={[styles.glow, { transform: [{ scale: glowScale }], opacity: glowOpacity }]} />
              <View style={styles.qrWrapper}>
                <QRCode value={JSON.stringify(qrPayload)} size={200} backgroundColor="white" color="#0f172a" />
              </View>
              
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progressPercent * 100}%` }]} />
              </View>

              <View style={styles.sessionInfo}>
                <Text style={styles.sessionInfoText}>Groupe: {selectedGroup?.name || 'Non sp\u00E9cifi\u00E9'}</Text>
                <Text style={styles.sessionInfoText}>Pr\u00E9sents: {attendanceRecords.length}</Text>
              </View>

              <View style={styles.sessionActions}>
                <TouchableOpacity style={styles.regenerateButton} onPress={handleRegenerateQr}>
                  <Ionicons name="refresh" size={20} color="#3b82f6" />
                  <Text style={styles.regenerateText}>Nouveau QR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                  <Ionicons name="share-outline" size={20} color="#fff" />
                  <Text style={styles.shareText}>Partager</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.endButton} onPress={handleEndSession}>
                <Ionicons name="stop-circle-outline" size={20} color="#fca5a5" />
                <Text style={styles.endButtonText}>Terminer la session</Text>
              </TouchableOpacity>
            </>
          ) : sessionEnded ? (
            <View style={styles.sessionEndedContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
              <Text style={styles.sessionEndedTitle}>Session termin\u00E9e !</Text>
              <Text style={styles.sessionEndedText}>
                La session de pr\u00E9sence est termin\u00E9e.{'\n'}
                Vous pouvez consulter la liste des pr\u00E9sences.
              </Text>

              <TouchableOpacity style={styles.viewListButton} onPress={loadAttendanceList} disabled={loadingAttendance}>
                {loadingAttendance ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="list" size={22} color="#fff" />
                    <Text style={styles.viewListButtonText}>Consulter liste pr\u00E9sence</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.newSessionButton}
                onPress={() => {
                  setSessionEnded(false);
                  setLastSession(null);
                  setLastSessionRecords([]);
                  setLastGroupId('');
                }}
              >
                <Text style={styles.newSessionButtonText}>Nouvelle session</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noSessionContainer}>
              <Text style={styles.noSessionIcon}>??</Text>
              <Text style={styles.noSessionTitle}>Aucune session active</Text>
              <Text style={styles.noSessionText}>
                D\u00E9marrez une session pour g\u00E9n\u00E9rer un QR code que les \u00E9tudiants peuvent scanner.
              </Text>

              {groups.length > 0 && (
                <View style={styles.groupSection}>
                  <Text style={styles.sectionLabel}>Groupe</Text>
                  <View style={styles.groupChips}>
                    {groups.map((group) => (
                      <TouchableOpacity
                        key={group.id}
                        style={[styles.groupChip, selectedGroupId === group.id && styles.groupChipActive]}
                        onPress={() => setSelectedGroupId(group.id!)}
                      >
                        <Text style={[styles.groupChipText, selectedGroupId === group.id && styles.groupChipTextActive]}>
                          {group.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.durationSection}>
                <Text style={styles.durationLabel}>Dur\u00E9e: {expiryMinutes} minutes</Text>
                <View style={styles.quickDurations}>
                  {quickDurations.map((duration) => (
                    <TouchableOpacity
                      key={duration}
                      style={[styles.durationChip, expiryMinutes === duration && styles.durationChipActive]}
                      onPress={() => setExpiryMinutes(duration)}
                    >
                      <Text style={[styles.durationChipText, expiryMinutes === duration && styles.durationChipTextActive]}>
                        {duration}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={60}
                  step={1}
                  value={expiryMinutes}
                  onValueChange={setExpiryMinutes}
                  minimumTrackTintColor="#3b82f6"
                  maximumTrackTintColor="#334155"
                  thumbTintColor="#3b82f6"
                />
              </View>

              <TouchableOpacity
                style={[styles.startButton, loading && styles.startButtonDisabled]}
                onPress={handleStartSession}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="qr-code" size={20} color="#fff" />
                    <Text style={styles.startButtonText}>D\u00E9marrer ({expiryMinutes}:00)</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {activeSession && (
          <View style={styles.attendanceSection}>
            <Text style={styles.sectionTitle}>Pr\u00E9sences en direct ({attendanceRecords.length})</Text>
            {attendanceRecords.length === 0 ? (
              <View style={styles.emptyAttendance}>
                <Ionicons name="time-outline" size={32} color="#64748b" />
                <Text style={styles.emptyAttendanceText}>En attente des \u00E9tudiants...</Text>
              </View>
            ) : (
              attendanceRecords.slice(0, 5).map((record, index) => (
                <View key={record.id || index} style={styles.attendanceRow}>
                  <View style={styles.attendanceAvatar}>
                    <Ionicons name="checkmark" size={20} color="#22c55e" />
                  </View>
                  <View style={styles.attendanceInfo}>
                    <Text style={styles.attendanceName}>\u00C9tudiant #{index + 1}</Text>
                    <Text style={styles.attendanceTime}>
                      {record.timestamp ? new Date(record.timestamp).toLocaleTimeString('fr-FR') : '--:--'}
                    </Text>
                  </View>
                  <View style={styles.presentBadge}>
                    <Text style={styles.presentBadgeText}>Pr\u00E9sent</Text>
                  </View>
                </View>
              ))
            )}
            {attendanceRecords.length > 5 && (
              <Text style={styles.moreText}>+{attendanceRecords.length - 5} autres...</Text>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={showAttendanceModal} animationType="slide" transparent={true} onRequestClose={() => setShowAttendanceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Liste des pr\u00E9sences</Text>
                <Text style={styles.modalSubtitle}>{course?.name} \u2022 {displayGroup?.name || 'Groupe'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAttendanceModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalStats}>
              <View style={[styles.modalStatCard, { backgroundColor: '#22c55e20' }]}>
                <Text style={[styles.modalStatValue, { color: '#22c55e' }]}>{attendanceList.filter(a => a.status === 'present').length}</Text>
                <Text style={styles.modalStatLabel}>Pr\u00E9sents</Text>
              </View>
              <View style={[styles.modalStatCard, { backgroundColor: '#f59e0b20' }]}>
                <Text style={[styles.modalStatValue, { color: '#f59e0b' }]}>{attendanceList.filter(a => a.status === 'late').length}</Text>
                <Text style={styles.modalStatLabel}>Retards</Text>
              </View>
              <View style={[styles.modalStatCard, { backgroundColor: '#ef444420' }]}>
                <Text style={[styles.modalStatValue, { color: '#ef4444' }]}>{attendanceList.filter(a => a.status === 'absent').length}</Text>
                <Text style={styles.modalStatLabel}>Absents</Text>
              </View>
            </View>

            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Nom Pr\u00E9nom</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Statut</Text>
            </View>

            <FlatList
              data={attendanceList}
              keyExtractor={(item) => item.student.uid}
              renderItem={({ item }) => (
                <View style={styles.tableRow}>
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <Text style={styles.studentName}>{item.student.displayName}</Text>
                    <Text style={styles.studentEmail}>{item.student.email}</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1, alignItems: 'center' }]}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>{getStatusLabel(item.status)}</Text>
                    </View>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>Aucun \u00E9tudiant dans ce groupe</Text>
                </View>
              }
              contentContainerStyle={styles.tableContent}
            />

            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowAttendanceModal(false)}>
              <Text style={styles.modalCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 24 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backButtonText: { color: '#3b82f6', fontSize: 16, marginLeft: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#f8fafc' },
  subtitle: { fontSize: 16, color: '#94a3b8', marginTop: 4 },
  qrContainer: { backgroundColor: 'rgba(15, 23, 42, 0.85)', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)', marginBottom: 24, overflow: 'hidden' },
  countdownContainer: { alignItems: 'center', marginBottom: 20 },
  countdownText: { fontSize: 48, fontWeight: '700', color: '#22c55e', fontVariant: ['tabular-nums'] },
  countdownDanger: { color: '#ef4444' },
  countdownLabel: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#3b82f6', top: 50 },
  qrWrapper: { padding: 16, backgroundColor: '#fff', borderRadius: 16, marginBottom: 20 },
  progressContainer: { width: '100%', height: 6, backgroundColor: '#1e293b', borderRadius: 3, marginBottom: 12, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 3 },
  sessionInfo: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  sessionInfoText: { color: '#94a3b8', fontSize: 14 },
  sessionActions: { flexDirection: 'row', marginBottom: 16 },
  regenerateButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3b82f6', marginRight: 12 },
  regenerateText: { color: '#3b82f6', fontWeight: '600', marginLeft: 8 },
  shareButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#3b82f6' },
  shareText: { color: '#fff', fontWeight: '600', marginLeft: 8 },
  endButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.4)' },
  endButtonText: { color: '#fca5a5', fontWeight: '600', marginLeft: 8 },
  sessionEndedContainer: { alignItems: 'center', paddingVertical: 20 },
  sessionEndedTitle: { fontSize: 24, fontWeight: '700', color: '#22c55e', marginTop: 16, marginBottom: 8 },
  sessionEndedText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  viewListButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14, backgroundColor: '#3b82f6', marginBottom: 12, minWidth: 250 },
  viewListButtonText: { color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 10 },
  newSessionButton: { paddingHorizontal: 24, paddingVertical: 12 },
  newSessionButtonText: { color: '#3b82f6', fontWeight: '600', fontSize: 14 },
  noSessionContainer: { alignItems: 'center', paddingVertical: 20 },
  noSessionIcon: { fontSize: 48, marginBottom: 16 },
  noSessionTitle: { fontSize: 20, fontWeight: '600', color: '#f8fafc', marginBottom: 8 },
  noSessionText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  groupSection: { width: '100%', marginBottom: 20 },
  sectionLabel: { color: '#e2e8f0', fontSize: 15, fontWeight: '500', marginBottom: 12 },
  groupChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  groupChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(30, 41, 59, 0.8)', marginHorizontal: 4, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.3)' },
  groupChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  groupChipText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  groupChipTextActive: { color: '#fff' },
  durationSection: { width: '100%', marginBottom: 24 },
  durationLabel: { color: '#e2e8f0', fontSize: 15, fontWeight: '500', marginBottom: 12 },
  quickDurations: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 },
  durationChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(30, 41, 59, 0.8)', marginHorizontal: 4, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.3)' },
  durationChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  durationChipText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  durationChipTextActive: { color: '#fff' },
  slider: { width: '100%', height: 40 },
  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14, backgroundColor: '#3b82f6', shadowColor: '#3b82f6', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  startButtonDisabled: { opacity: 0.7 },
  startButtonText: { color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 10 },
  attendanceSection: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#e2e8f0', marginBottom: 16 },
  emptyAttendance: { backgroundColor: 'rgba(15, 23, 42, 0.85)', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.2)' },
  emptyAttendanceText: { color: '#64748b', fontSize: 14, marginTop: 8 },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.85)', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.2)' },
  attendanceAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(34, 197, 94, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  attendanceInfo: { flex: 1 },
  attendanceName: { color: '#f8fafc', fontSize: 15, fontWeight: '500' },
  attendanceTime: { color: '#64748b', fontSize: 13, marginTop: 2 },
  presentBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  presentBadgeText: { color: '#6ee7b7', fontSize: 12, fontWeight: '600' },
  moreText: { color: '#64748b', fontSize: 13, textAlign: 'center', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(148, 163, 184, 0.2)' },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#f8fafc' },
  modalSubtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  modalCloseBtn: { padding: 4 },
  modalStats: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  modalStatCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  modalStatValue: { fontSize: 24, fontWeight: '700' },
  modalStatLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'rgba(30, 41, 59, 0.5)', borderBottomWidth: 1, borderBottomColor: 'rgba(148, 163, 184, 0.2)' },
  tableHeaderText: { fontSize: 13, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' },
  tableContent: { paddingHorizontal: 20 },
  tableRow: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(148, 163, 184, 0.1)', alignItems: 'center' },
  tableCell: { justifyContent: 'center' },
  studentName: { fontSize: 15, fontWeight: '500', color: '#f8fafc' },
  studentEmail: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  emptyList: { padding: 40, alignItems: 'center' },
  emptyListText: { color: '#64748b', fontSize: 14 },
  modalCloseButton: { marginHorizontal: 20, marginTop: 16, backgroundColor: 'rgba(59, 130, 246, 0.2)', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.4)' },
  modalCloseButtonText: { color: '#3b82f6', fontWeight: '600', fontSize: 16 },
});

export default GenerateQrScreen;
