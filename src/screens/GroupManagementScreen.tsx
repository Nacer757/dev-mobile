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
import { Group, CreateGroupPayload, User } from '../types/models';
import { GroupService, UserService } from '../services';
import FormModal from '../components/FormModal';
import FormInput from '../components/FormInput';
import FormMultiSelect from '../components/FormMultiSelect';
import FormButton from '../components/FormButton';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'GroupManagement'>;
};

const GroupManagementScreen = ({ navigation }: Props) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStudentIds, setFormStudentIds] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [groupsData, usersData] = await Promise.all([
        GroupService.getAllGroups(),
        UserService.getAllUsers(),
      ]);
      setGroups(groupsData);
      setStudents(usersData.filter(u => u.role === 'student'));
    } catch (error) {
      console.error('Error loading groups:', error);
      Alert.alert('Erreur', 'Impossible de charger les groupes.');
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
    setFormStudentIds([]);
    setEditingGroup(null);
  };

  const openCreateModal = () => { resetForm(); setModalVisible(true); };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    setFormName(group.name);
    setFormDescription(group.description || '');
    setFormStudentIds(group.studentIds || []);
    setModalVisible(true);
  };

  const handleSaveGroup = async () => {
    if (!formName.trim()) {
      Alert.alert('Erreur', 'Le nom du groupe est requis.');
      return;
    }

    setSaving(true);
    try {
      if (editingGroup) {
        await GroupService.updateGroup(editingGroup.id!, {
          name: formName.trim(),
          studentIds: formStudentIds,
        });
        Alert.alert('Succès', 'Groupe mis à jour.');
      } else {
        const payload: CreateGroupPayload = {
          name: formName.trim(),
          studentIds: formStudentIds,
        };
        await GroupService.createGroup(payload, 'admin');
        Alert.alert('Succès', 'Groupe créé.');
      }
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving group:', error);
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = (group: Group) => {
    Alert.alert('Confirmer', `Supprimer le groupe "${group.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await GroupService.deleteGroup(group.id!);
            Alert.alert('Succès', 'Groupe supprimé.');
            loadData();
          } catch (error) {
            Alert.alert('Erreur', 'Impossible de supprimer.');
          }
        },
      },
    ]);
  };

  const studentOptions = students.map(s => ({
    value: s.uid,
    label: s.displayName || s.email,
    icon: '🎓',
  }));

  const renderGroupItem = ({ item }: { item: Group }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>📚</Text>
          <View style={styles.cardTitleBox}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            {item.description && <Text style={styles.cardDesc}>{item.description}</Text>}
          </View>
        </View>
        <View style={styles.statBadge}>
          <Text style={styles.statBadgeText}>👨‍🎓 {item.studentIds?.length || 0} étudiant{(item.studentIds?.length || 0) > 1 ? 's' : ''}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.btnEdit} onPress={() => openEditModal(item)}>
          <Text>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnDelete} onPress={() => handleDeleteGroup(item)}>
          <Text>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#070b17', '#0e1629', '#111f3c']} style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#10b981" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#070b17', '#0e1629', '#111f3c']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminHome' as any)}><Text style={styles.back}>← Retour</Text></TouchableOpacity>
        <Text style={styles.title}>Groupes</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}><Text style={styles.addBtnText}>+ Nouveau</Text></TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{groups.length}</Text>
          <Text style={styles.statLabel}>Groupes</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{students.length}</Text>
          <Text style={styles.statLabel}>Étudiants</Text>
        </View>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id!}
        renderItem={renderGroupItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>📚</Text><Text style={styles.emptyText}>Aucun groupe</Text><Text style={styles.emptySubtext}>Créez votre premier groupe</Text></View>}
      />

      <FormModal visible={modalVisible} onClose={() => setModalVisible(false)} title={editingGroup ? 'Modifier le groupe' : 'Nouveau groupe'} accentColor="#10b981">
        <FormInput label="Nom du groupe" placeholder="Ex: 2ITE G1" icon="📚" value={formName} onChangeText={setFormName} autoCapitalize="words" />
        <FormInput label="Description (optionnel)" placeholder="Description du groupe" icon="📝" value={formDescription} onChangeText={setFormDescription} multiline />
        <FormMultiSelect
          label="Étudiants"
          placeholder="Sélectionner les étudiants"
          icon="👨‍🎓"
          options={studentOptions}
          values={formStudentIds}
          onChange={setFormStudentIds}
          accentColor="#10b981"
        />
        <View style={styles.modalBtns}>
          <FormButton title="Annuler" onPress={() => setModalVisible(false)} variant="secondary" />
          <FormButton title={editingGroup ? 'Enregistrer' : 'Créer'} onPress={handleSaveGroup} loading={saving} icon={editingGroup ? '💾' : '✨'} colors={['#10b981', '#059669']} />
        </View>
      </FormModal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16 },
  back: { color: '#10b981', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  addBtn: { backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#10b981', fontSize: 14, fontWeight: '600' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 12 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' },
  cardInfo: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIcon: { fontSize: 32, marginRight: 12 },
  cardTitleBox: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  cardDesc: { fontSize: 14, color: '#94a3b8', marginTop: 2 },
  statBadge: { backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  statBadgeText: { color: '#6ee7b7', fontSize: 13, fontWeight: '600' },
  cardActions: { justifyContent: 'center', gap: 8 },
  btnEdit: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(59,130,246,0.2)', justifyContent: 'center', alignItems: 'center' },
  btnDelete: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.2)', justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#64748b' },
  modalBtns: { marginTop: 24, gap: 8 },
});

export default GroupManagementScreen;
