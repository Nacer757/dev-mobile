import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types/models';

type RoleOption = {
  value: UserRole;
  label: string;
  icon: string;
  color: string;
};

const roleOptions: RoleOption[] = [
  { value: 'student', label: 'Étudiant', icon: 'school', color: '#22c55e' },
  { value: 'professor', label: 'Professeur', icon: 'briefcase', color: '#3b82f6' },
  { value: 'admin', label: 'Admin', icon: 'shield-checkmark', color: '#f59e0b' },
];

const LoginScreen = () => {
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const animateValue = (value: Animated.Value) =>
    Animated.timing(value, {
      toValue: 1,
      duration: 750,
      delay: 150,
      useNativeDriver: true,
    });

  useEffect(() => {
    Animated.stagger(250, [animateValue(heroAnim), animateValue(cardAnim)]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [heroAnim, cardAnim, pulseAnim]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(email.trim(), password);
      // Navigation is handled by App.js based on user role
    } catch (error: any) {
      let message = 'Une erreur est survenue lors de la connexion.';
      if (error.code === 'auth/user-not-found') {
        message = 'Aucun compte trouvé avec cet email.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Mot de passe incorrect.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Format d\'email invalide.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Trop de tentatives. Réessayez plus tard.';
      }
      Alert.alert('Erreur de connexion', message);
    } finally {
      setIsLoading(false);
    }
  };

  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] });

  if (loading) {
    return (
      <LinearGradient colors={['#070b17', '#0e1629', '#111f3c']} style={[styles.gradient, styles.centered]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#070b17', '#0e1629', '#111f3c']} style={styles.gradient}>
      <Animated.View
        style={[
          styles.glow,
          {
            transform: [{ scale: pulseScale }],
            opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.65] }),
          },
        ]}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: heroAnim,
              transform: [
                {
                  translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.badge}>Attendify v2</Text>
          <Text style={styles.title}>Bienvenue</Text>
          <Text style={styles.subtitle}>Connectez-vous pour gérer vos présences</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardAnim,
              transform: [
                {
                  translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.cardTitle}>Connexion</Text>

          {/* Role Selector */}
          <Text style={styles.roleLabel}>Choisissez votre rôle :</Text>
          <View style={styles.roleSelector}>
            {roleOptions.map((role) => (
              <TouchableOpacity
                key={role.value}
                style={[
                  styles.roleOption,
                  selectedRole === role.value && styles.roleOptionSelected,
                  selectedRole === role.value && { borderColor: role.color },
                ]}
                onPress={() => setSelectedRole(role.value)}
                disabled={isLoading}
              >
                <Ionicons
                  name={role.icon as any}
                  size={24}
                  color={selectedRole === role.value ? role.color : '#64748b'}
                />
                <Text
                  style={[
                    styles.roleOptionText,
                    selectedRole === role.value && { color: role.color },
                  ]}
                >
                  {role.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TextInput
            style={[styles.input, focusedField === 'email' && styles.inputFocused]}
            placeholder="Email"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            editable={!isLoading}
          />
          <TextInput
            style={[styles.input, focusedField === 'password' && styles.inputFocused]}
            placeholder="Mot de passe"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            editable={!isLoading}
          />
          <TouchableOpacity 
            activeOpacity={0.85} 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#f8fafc" />
            ) : (
              <Text style={styles.buttonText}>Se connecter</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#2563eb',
    alignSelf: 'center',
    top: 80,
    shadowColor: '#2563eb',
    shadowOpacity: 0.6,
    shadowRadius: 60,
  },
  hero: {
    marginBottom: 32,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#cbd5f5',
    fontSize: 12,
    marginBottom: 16,
    letterSpacing: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 16,
    color: '#cbd5f5',
    marginTop: 8,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 20,
  },
  loadingText: {
    color: '#cbd5f5',
    marginTop: 16,
    fontSize: 16,
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    color: '#f8fafc',
  },
  inputFocused: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(8, 47, 73, 0.75)',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#2563eb',
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  roleLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 12,
  },
  roleSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  roleOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 2,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  roleOptionSelected: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
  },
  roleOptionText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
});

export default LoginScreen;
