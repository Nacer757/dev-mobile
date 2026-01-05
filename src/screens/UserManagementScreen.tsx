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
import { User, UserRole, CreateUserPayload, Group } from '../types/models';
import { UserService, GroupService, AuthService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import FormModal from '../components/FormModal';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import FormButton from '../components/FormButton';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'UserManagement'>;
};

type RoleFilter = 'all' | UserRole;

const UserManagementScreen = ({ navigation }: Props) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [saving, setSaving] = useState(false);

  const [formEmail, setFormEmail] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('student');
  const [formGroupId, setFormGroupId] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  
  // Password view & reset states
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetAdminPassword, setResetAdminPassword] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [usersData, groupsData] = await Promise.all([
        UserService.getAllUsers(),
        GroupService.getAllGroups(),
      ]);
      setUsers(usersData);
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Erreur', 'Impossible de charger les utilisateurs.');
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
    setFormEmail('');
    setFormDisplayName('');
    setFormPassword('');
    setFormRole('student');
    setFormGroupId('');
    setAdminPassword('');
    setEditingUser(null);
  };

  const openCreateModal = () => { resetForm(); setModalVisible(true); };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormEmail(user.email);
    setFormDisplayName(user.displayName || '');
    setFormPassword('');
    setFormRole(user.role);
    setFormGroupId(user.groupId || '');
    setModalVisible(true);
  };

  const handleSaveUser = async () => {
    if (!formEmail.trim() || !formDisplayName.trim()) {
      Alert.alert('Erreur', 'Email et nom sont requis.');
      return;
    }
    if (!editingUser && !formPassword.trim()) {
      Alert.alert('Erreur', 'Le mot de passe est requis.');
      return;
    }
    if (!editingUser && formPassword.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit avoir au moins 6 caractères.');
      return;
    }
    if (!editingUser && !adminPassword.trim()) {
      Alert.alert('Erreur', 'Votre mot de passe admin est requis pour créer un utilisateur.');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const updateData: Partial<User> = { displayName: formDisplayName.trim(), role: formRole };
        const oldGroupId = editingUser.groupId;
        const newGroupId = formRole === 'student' ? formGroupId : undefined;
        
        if (formRole === 'student' && formGroupId) {
          updateData.groupId = formGroupId;
        } else {
          // Si ce n'est plus un étudiant ou pas de groupe, supprimer le groupId
          updateData.groupId = undefined;
        }
        
        // Mettre à jour l'utilisateur
        await UserService.updateUser(editingUser.uid, updateData);
        
        // Synchroniser les groupes si le groupe a changé
        if (oldGroupId !== newGroupId) {
          // Retirer de l'ancien groupe
          if (oldGroupId) {
            await GroupService.removeStudentFromGroup(oldGroupId, editingUser.uid);
          }
          // Ajouter au nouveau groupe
          if (newGroupId) {
            await GroupService.addStudentToGroup(newGroupId, editingUser.uid);
          }
        }
        
        Alert.alert('Succès', 'Utilisateur mis à jour.');
      } else {
        const payload: CreateUserPayload = {
          email: formEmail.trim(),
          password: formPassword,
          displayName: formDisplayName.trim(),
          role: formRole,
        };
        if (formRole === 'student' && formGroupId) payload.groupId = formGroupId;
        // Pass admin credentials to stay logged in as admin
        await AuthService.createUser(payload, currentUser?.email, adminPassword);
        Alert.alert('Succès', 'Utilisateur créé.');
      }
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving user:', error);
      let message = 'Une erreur est survenue.';
      if (error.code === 'auth/email-already-in-use') message = 'Cet email est déjà utilisé.';
      else if (error.code === 'auth/weak-password') message = 'Mot de passe trop faible.';
      else if (error.code === 'auth/invalid-email') message = 'Email invalide.';
      Alert.alert('Erreur', message);
    } finally {
      setSaving(false);
    }
  };

  // Delete modal states
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteAdminPassword, setDeleteAdminPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteUser = (user: User) => {
    if (user.role === 'admin') {
      Alert.alert('Erreur', 'Impossible de supprimer un admin.');
      return;
    }
    setUserToDelete(user);
    setDeleteAdminPassword('');
    setDeleteModalVisible(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete || !currentUser?.email) return;
    
    if (!deleteAdminPassword.trim()) {
      Alert.alert('Erreur', 'Votre mot de passe admin est requis.');
      return;
    }

    setDeleting(true);
    try {
      // Retirer l'utilisateur de son groupe s'il en a un
      if (userToDelete.groupId) {
        await GroupService.removeStudentFromGroup(userToDelete.groupId, userToDelete.uid);
      }
      
      await AuthService.adminDeleteUser(
        userToDelete.uid,
        currentUser.email,
        deleteAdminPassword
      );
      Alert.alert('Succès', 'Utilisateur supprimé définitivement.');
      setDeleteModalVisible(false);
      setUserToDelete(null);
      loadData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      let message = 'Impossible de supprimer.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Mot de passe admin incorrect.';
      }
      Alert.alert('Erreur', message);
    } finally {
      setDeleting(false);
    }
  };

  const openPasswordModal = (user: User) => {
    setSelectedUserForPassword(user);
    setNewPassword('');
    setShowPassword(false);
    setResetAdminPassword('');
    setPasswordModalVisible(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUserForPassword) return;
    
    // Vérifier si le mot de passe initial existe et n'est pas vide
    const hasStoredPassword = selectedUserForPassword.initialPassword && 
                              selectedUserForPassword.initialPassword.trim() !== '';
    
    if (!hasStoredPassword) {
      Alert.alert(
        'Mot de passe non disponible', 
        'Le mot de passe de cet utilisateur n\'a pas été enregistré lors de sa création.\n\nUtilisez "Envoyer email" pour lui permettre de réinitialiser son mot de passe.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit avoir au moins 6 caractères.');
      return;
    }
    if (!resetAdminPassword.trim()) {
      Alert.alert('Erreur', 'Votre mot de passe admin est requis.');
      return;
    }

    setResetting(true);
    try {
      await AuthService.adminResetPassword(
        selectedUserForPassword.uid,
        newPassword,
        currentUser?.email || '',
        resetAdminPassword
      );
      Alert.alert('Succès', 'Mot de passe réinitialisé avec succès.');
      setPasswordModalVisible(false);
      loadData();
    } catch (error: any) {
      console.error('Error resetting password:', error);
      let message = 'Impossible de réinitialiser le mot de passe.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Mot de passe admin incorrect.';
      } else if (error.message === 'NO_STORED_PASSWORD') {
        message = 'Le mot de passe initial n\'est pas disponible. Utilisez l\'option "Envoyer email".';
      }
      Alert.alert('Erreur', message);
    } finally {
      setResetting(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!selectedUserForPassword) return;
    try {
      await AuthService.resetPasswordByEmail(selectedUserForPassword.email);
      Alert.alert('Succès', `Email de réinitialisation envoyé à ${selectedUserForPassword.email}`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'email.');
    }
  };

  const filteredUsers = roleFilter === 'all' ? users : users.filter(u => u.role === roleFilter);

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'admin': return { bg: 'rgba(239,68,68,0.2)', color: '#fca5a5' };
      case 'professor': return { bg: 'rgba(59,130,246,0.2)', color: '#93c5fd' };
      case 'student': return { bg: 'rgba(16,185,129,0.2)', color: '#6ee7b7' };
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'professor': return 'Professeur';
      case 'student': return 'Étudiant';
    }
  };

  const getGroupName = (groupId?: string) => {
    if (!groupId) return 'Aucun groupe';
    return groups.find(g => g.id === groupId)?.name || 'Inconnu';
  };

  const roleOptions = [
    { value: 'student', label: 'Étudiant', icon: '🎓' },
    { value: 'professor', label: 'Professeur', icon: '👨‍🏫' },
    { value: 'admin', label: 'Admin', icon: '👑' },
  ];

  const groupOptions = [{ value: '', label: 'Aucun groupe' }, ...groups.map(g => ({ value: g.id!, label: g.name }))];

  const renderUserItem = ({ item }: { item: User }) => {
    const badge = getRoleBadgeStyle(item.role);
    return (
      <View style={styles.card}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.displayName || 'Sans nom'}</Text>
          <Text style={styles.cardSubtitle}>{item.email}</Text>
          {item.role === 'student' && <Text style={styles.cardMeta}>{getGroupName(item.groupId)}</Text>}
        </View>
        <View style={styles.cardActions}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{getRoleLabel(item.role)}</Text>
          </View>
          <View style={styles.buttons}>
            {item.role !== 'admin' && (
              <TouchableOpacity style={styles.btnPassword} onPress={() => openPasswordModal(item)}>
                <Text>🔑</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.btnEdit} onPress={() => openEditModal(item)}>
              <Text>✏️</Text>
            </TouchableOpacity>
            {item.role !== 'admin' && (
              <TouchableOpacity style={styles.btnDelete} onPress={() => handleDeleteUser(item)}>
                <Text>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#070b17', '#0e1629', '#111f3c']} style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#070b17', '#0e1629', '#111f3c']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminHome' as any)}><Text style={styles.back}>← Retour</Text></TouchableOpacity>
        <Text style={styles.title}>Utilisateurs</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}><Text style={styles.addBtnText}>+ Nouveau</Text></TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {(['all', 'student', 'professor', 'admin'] as RoleFilter[]).map((f) => (
          <TouchableOpacity key={f} style={[styles.filterTab, roleFilter === f && styles.filterActive]} onPress={() => setRoleFilter(f)}>
            <Text style={[styles.filterText, roleFilter === f && styles.filterTextActive]}>{f === 'all' ? 'Tous' : getRoleLabel(f as UserRole)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.stats}>
        <View style={styles.statBox}><Text style={styles.statNum}>{users.filter(u => u.role === 'student').length}</Text><Text style={styles.statLabel}>Étudiants</Text></View>
        <View style={styles.statBox}><Text style={styles.statNum}>{users.filter(u => u.role === 'professor').length}</Text><Text style={styles.statLabel}>Profs</Text></View>
        <View style={styles.statBox}><Text style={styles.statNum}>{users.filter(u => u.role === 'admin').length}</Text><Text style={styles.statLabel}>Admins</Text></View>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.uid}
        renderItem={renderUserItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>👥</Text><Text style={styles.emptyText}>Aucun utilisateur</Text></View>}
      />

      <FormModal visible={modalVisible} onClose={() => setModalVisible(false)} title={editingUser ? 'Modifier' : 'Nouvel utilisateur'} accentColor="#3b82f6">
        <FormInput label="Nom complet" placeholder="Jean Dupont" icon="👤" value={formDisplayName} onChangeText={setFormDisplayName} autoCapitalize="words" />
        <FormInput label="Email" placeholder="jean@email.com" icon="📧" value={formEmail} onChangeText={setFormEmail} keyboardType="email-address" autoCapitalize="none" editable={!editingUser} />
        {!editingUser && <FormInput label="Mot de passe" placeholder="Min. 6 caractères" icon="🔒" value={formPassword} onChangeText={setFormPassword} secureTextEntry />}
        <FormSelect label="Rôle" icon="🎭" options={roleOptions} value={formRole} onChange={(v) => setFormRole(v as UserRole)} accentColor="#3b82f6" />
        {formRole === 'student' && <FormSelect label="Groupe" icon="📚" options={groupOptions} value={formGroupId} onChange={setFormGroupId} accentColor="#10b981" />}
        
        {!editingUser && (
          <FormInput 
            label="Votre mot de passe admin" 
            placeholder="Pour confirmer la création" 
            icon="🔐" 
            value={adminPassword} 
            onChangeText={setAdminPassword} 
            secureTextEntry 
          />
        )}
        
        <View style={styles.modalBtns}>
          <FormButton title="Annuler" onPress={() => setModalVisible(false)} variant="secondary" />
          <FormButton title={editingUser ? 'Enregistrer' : 'Créer'} onPress={handleSaveUser} loading={saving} icon={editingUser ? '💾' : '✨'} />
        </View>
      </FormModal>

      {/* Password View & Reset Modal */}
      <FormModal 
        visible={passwordModalVisible} 
        onClose={() => setPasswordModalVisible(false)} 
        title="🔐 Gestion mot de passe" 
        accentColor="#f59e0b"
      >
        {selectedUserForPassword && (
          <>
            <View style={styles.passwordUserInfo}>
              <Text style={styles.passwordUserName}>{selectedUserForPassword.displayName}</Text>
              <Text style={styles.passwordUserEmail}>{selectedUserForPassword.email}</Text>
            </View>

            {(() => {
              const hasPassword = selectedUserForPassword.initialPassword && 
                                  selectedUserForPassword.initialPassword.trim() !== '';
              return (
                <>
                  <View style={styles.passwordSection}>
                    <Text style={styles.passwordLabel}>🔑 Mot de passe actuel</Text>
                    <View style={[styles.passwordBox, !hasPassword && styles.passwordBoxUnavailable]}>
                      <Text style={[styles.passwordValue, !hasPassword && styles.passwordUnavailable]}>
                        {hasPassword 
                          ? (showPassword ? selectedUserForPassword.initialPassword : '••••••••')
                          : '⚠️ Non disponible'}
                      </Text>
                      {hasPassword && (
                        <TouchableOpacity 
                          style={styles.passwordToggle} 
                          onPress={() => setShowPassword(!showPassword)}
                        >
                          <Text>{showPassword ? '🙈' : '👁️'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {!hasPassword && (
                      <Text style={styles.passwordNote}>
                        Cet utilisateur a été créé avant l'enregistrement des mots de passe.{'\n'}
                        Utilisez "Envoyer email" pour lui permettre de réinitialiser.
                      </Text>
                    )}
                  </View>

                  <View style={styles.divider} />

            <Text style={styles.resetTitle}>🔄 Réinitialiser le mot de passe</Text>
            
            {selectedUserForPassword.initialPassword && selectedUserForPassword.initialPassword.trim() !== '' ? (
              <>
                <FormInput 
                  label="Nouveau mot de passe" 
                  placeholder="Min. 6 caractères" 
                  icon="🔒" 
                  value={newPassword} 
                  onChangeText={setNewPassword} 
                  secureTextEntry 
                />
                
                <FormInput 
                  label="Votre mot de passe admin" 
                  placeholder="Pour confirmer" 
                  icon="🔐" 
                  value={resetAdminPassword} 
                  onChangeText={setResetAdminPassword} 
                  secureTextEntry 
                />

                <View style={styles.modalBtns}>
                  <FormButton 
                    title="📧 Envoyer email" 
                    onPress={handleSendResetEmail} 
                    variant="secondary" 
                  />
                  <FormButton 
                    title="Réinitialiser" 
                    onPress={handleResetPassword} 
                    loading={resetting} 
                    icon="🔄"
                  />
                </View>
              </>
            ) : (
              <View style={styles.noPasswordSection}>
                <Text style={styles.noPasswordText}>
                  La réinitialisation directe n'est pas disponible pour cet utilisateur.
                </Text>
                <FormButton 
                  title="📧 Envoyer email de réinitialisation" 
                  onPress={handleSendResetEmail} 
                  icon="📧"
                />
              </View>
            )}
                </>
              );
            })()}
          </>
        )}
      </FormModal>

      {/* Delete User Modal */}
      <FormModal 
        visible={deleteModalVisible} 
        onClose={() => setDeleteModalVisible(false)} 
        title="🗑️ Supprimer l'utilisateur" 
        accentColor="#ef4444"
      >
        {userToDelete && (
          <>
            <View style={styles.deleteUserInfo}>
              <Text style={styles.deleteWarningIcon}>⚠️</Text>
              <Text style={styles.deleteUserName}>{userToDelete.displayName}</Text>
              <Text style={styles.deleteUserEmail}>{userToDelete.email}</Text>
            </View>

            <Text style={styles.deleteWarningText}>
              Cette action est irréversible. L'utilisateur sera supprimé définitivement de l'application et ne pourra plus se connecter.
            </Text>

            <FormInput 
              label="Votre mot de passe admin" 
              placeholder="Pour confirmer la suppression" 
              icon="🔐" 
              value={deleteAdminPassword} 
              onChangeText={setDeleteAdminPassword} 
              secureTextEntry 
            />

            <View style={styles.modalBtns}>
              <FormButton 
                title="Annuler" 
                onPress={() => setDeleteModalVisible(false)} 
                variant="secondary" 
              />
              <FormButton 
                title="Supprimer" 
                onPress={confirmDeleteUser} 
                loading={deleting} 
                variant="danger"
                icon="🗑️"
              />
            </View>
          </>
        )}
      </FormModal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16 },
  back: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  addBtn: { backgroundColor: 'rgba(59,130,246,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
  filters: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 },
  filterTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filterActive: { borderBottomColor: '#3b82f6' },
  filterText: { color: '#64748b', fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: '#3b82f6', fontWeight: '700' },
  stats: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 12 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 4 },
  cardMeta: { fontSize: 13, color: '#10b981' },
  cardActions: { alignItems: 'flex-end' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: 8 },
  btnEdit: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(59,130,246,0.2)', justifyContent: 'center', alignItems: 'center' },
  btnDelete: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.2)', justifyContent: 'center', alignItems: 'center' },
  btnPassword: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(245,158,11,0.2)', justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  modalBtns: { marginTop: 24, gap: 8 },
  // Password modal styles
  passwordUserInfo: { backgroundColor: 'rgba(245,158,11,0.1)', padding: 16, borderRadius: 12, marginBottom: 20, alignItems: 'center' },
  passwordUserName: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  passwordUserEmail: { fontSize: 14, color: '#94a3b8' },
  passwordSection: { marginBottom: 20 },
  passwordLabel: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  passwordBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 },
  passwordBoxUnavailable: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  passwordValue: { flex: 1, fontSize: 18, fontWeight: '600', color: '#f59e0b', fontFamily: 'monospace' },
  passwordUnavailable: { color: '#ef4444', fontSize: 14 },
  passwordToggle: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(245,158,11,0.2)', justifyContent: 'center', alignItems: 'center' },
  passwordNote: { fontSize: 12, color: '#94a3b8', marginTop: 8, fontStyle: 'italic', lineHeight: 18 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 20 },
  resetTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 16 },
  noPasswordSection: { backgroundColor: 'rgba(245,158,11,0.1)', padding: 16, borderRadius: 12 },
  noPasswordText: { fontSize: 14, color: '#94a3b8', marginBottom: 16, textAlign: 'center', lineHeight: 20 },
  // Delete modal styles
  deleteUserInfo: { backgroundColor: 'rgba(239,68,68,0.1)', padding: 20, borderRadius: 12, marginBottom: 20, alignItems: 'center' },
  deleteWarningIcon: { fontSize: 40, marginBottom: 12 },
  deleteUserName: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  deleteUserEmail: { fontSize: 14, color: '#94a3b8' },
  deleteWarningText: { fontSize: 14, color: '#fca5a5', textAlign: 'center', lineHeight: 20, marginBottom: 20, backgroundColor: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 8 },
});

export default UserManagementScreen;
