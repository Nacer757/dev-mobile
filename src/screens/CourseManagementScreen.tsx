import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Course, CreateCoursePayload, User, Group } from '../types/models';
import { CourseService, UserService, GroupService } from '../services';
import FormModal from '../components/FormModal';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import FormMultiSelect from '../components/FormMultiSelect';
import FormButton from '../components/FormButton';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'CourseManagement'>;
};

const CourseManagementScreen = ({ navigation }: Props) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [professors, setProfessors] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formProfessorId, setFormProfessorId] = useState('');
  const [formGroupIds, setFormGroupIds] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [coursesData, usersData, groupsData] = await Promise.all([
        CourseService.getAllCourses(),
        UserService.getAllUsers(),
        GroupService.getAllGroups(),
      ]);
      setCourses(coursesData);
      setProfessors(usersData.filter(u => u.role === 'professor'));
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading courses:', error);
      Alert.alert('Erreur', 'Impossible de charger les cours.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormProfessorId('');
    setFormGroupIds([]);
    setEditingCourse(null);
  };

  const openCreateModal = () => { resetForm(); setModalVisible(true); };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setFormName(course.name);
    setFormDescription(course.description || '');
    setFormProfessorId(course.professorId);
    setFormGroupIds(course.groupIds || []);
    setModalVisible(true);
  };

  const handleSaveCourse = async () => {
    if (!formName.trim()) {
      Alert.alert('Erreur', 'Le nom du cours est requis.');
      return;
    }
    if (!formProfessorId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un professeur.');
      return;
    }

    setSaving(true);
    try {
      if (editingCourse) {
        await CourseService.updateCourse(editingCourse.id!, {
          name: formName.trim(),
          professorId: formProfessorId,
          groupIds: formGroupIds,
        });
        Alert.alert('Succès', 'Cours mis à jour.');
      } else {
        const payload: CreateCoursePayload = {
          name: formName.trim(),
          professorId: formProfessorId,
          groupIds: formGroupIds,
        };
        await CourseService.createCourse(payload);
        Alert.alert('Succès', 'Cours créé.');
      }
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving course:', error);
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = (course: Course) => {
    Alert.alert('Confirmer', `Supprimer le cours "${course.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await CourseService.deleteCourse(course.id!);
            Alert.alert('Succès', 'Cours supprimé.');
            loadData();
          } catch (error) {
            Alert.alert('Erreur', 'Impossible de supprimer.');
          }
        },
      },
    ]);
  };

  const getProfessorName = (professorId: string) => {
    const professor = professors.find(p => p.uid === professorId);
    return professor?.displayName || 'Non assigné';
  };

  const getGroupNames = (groupIds: string[]) => {
    if (!groupIds || groupIds.length === 0) return 'Aucun groupe';
    return groupIds.map(id => groups.find(g => g.id === id)?.name || '').filter(Boolean).join(', ');
  };

  const professorOptions = [
    { value: '', label: 'Sélectionner un professeur' },
    ...professors.map(p => ({ value: p.uid, label: p.displayName || p.email, icon: '👨‍🏫' })),
  ];

  const groupOptions = groups.map(g => ({ value: g.id!, label: g.name, icon: '📚' }));

  const renderCourseItem = ({ item }: { item: Course }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>📖</Text>
          <View style={styles.cardTitleBox}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            {item.description && <Text style={styles.cardDesc}>{item.description}</Text>}
          </View>
        </View>
        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>👨‍🏫</Text>
            <Text style={styles.detailText}>{getProfessorName(item.professorId)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📚</Text>
            <Text style={styles.detailText}>{getGroupNames(item.groupIds || [])}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.btnEdit} onPress={() => openEditModal(item)}>
          <Text>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnDelete} onPress={() => handleDeleteCourse(item)}>
          <Text>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#070b17', '#0e1629', '#111f3c']} style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#070b17', '#0e1629', '#111f3c']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminHome' as any)}><Text style={styles.back}>← Retour</Text></TouchableOpacity>
        <Text style={styles.title}>Cours</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}><Text style={styles.addBtnText}>+ Nouveau</Text></TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{courses.length}</Text>
          <Text style={styles.statLabel}>Cours</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{professors.length}</Text>
          <Text style={styles.statLabel}>Professeurs</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{groups.length}</Text>
          <Text style={styles.statLabel}>Groupes</Text>
        </View>
      </View>

      <FlatList
        data={courses}
        keyExtractor={(item) => item.id!}
        renderItem={renderCourseItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>📖</Text><Text style={styles.emptyText}>Aucun cours</Text><Text style={styles.emptySubtext}>Créez votre premier cours</Text></View>}
      />

      <FormModal visible={modalVisible} onClose={() => setModalVisible(false)} title={editingCourse ? 'Modifier le cours' : 'Nouveau cours'} accentColor="#f59e0b">
        <FormInput label="Nom du cours" placeholder="Ex: Mathématiques" icon="📖" value={formName} onChangeText={setFormName} autoCapitalize="words" />
        <FormInput label="Description (optionnel)" placeholder="Description du cours" icon="📝" value={formDescription} onChangeText={setFormDescription} multiline />
        <FormSelect
          label="Professeur"
          placeholder="Sélectionner un professeur"
          icon="👨‍🏫"
          options={professorOptions}
          value={formProfessorId}
          onChange={setFormProfessorId}
          accentColor="#f59e0b"
        />
        <FormMultiSelect
          label="Groupes"
          placeholder="Sélectionner les groupes"
          icon="📚"
          options={groupOptions}
          values={formGroupIds}
          onChange={setFormGroupIds}
          accentColor="#f59e0b"
        />
        <View style={styles.modalBtns}>
          <FormButton title="Annuler" onPress={() => setModalVisible(false)} variant="secondary" />
          <FormButton title={editingCourse ? 'Enregistrer' : 'Créer'} onPress={handleSaveCourse} loading={saving} icon={editingCourse ? '💾' : '✨'} colors={['#f59e0b', '#d97706']} />
        </View>
      </FormModal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16 },
  back: { color: '#f59e0b', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  addBtn: { backgroundColor: 'rgba(245,158,11,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#f59e0b', fontSize: 14, fontWeight: '600' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 12 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' },
  cardInfo: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIcon: { fontSize: 32, marginRight: 12 },
  cardTitleBox: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  cardDesc: { fontSize: 14, color: '#94a3b8', marginTop: 2 },
  detailsBox: { gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailIcon: { fontSize: 14, marginRight: 8 },
  detailText: { fontSize: 14, color: '#94a3b8', flex: 1 },
  cardActions: { justifyContent: 'center', gap: 8 },
  btnEdit: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(59,130,246,0.2)', justifyContent: 'center', alignItems: 'center' },
  btnDelete: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.2)', justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#64748b' },
  modalBtns: { marginTop: 24, gap: 8 },
});

export default CourseManagementScreen;
