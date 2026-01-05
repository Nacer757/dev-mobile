import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

type AdminDashboardScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'AdminDashboard'>;
};

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  color: string;
  index: number;
  animatedValue: Animated.Value;
}

const MenuItem = ({ icon, title, subtitle, onPress, color, index, animatedValue }: MenuItemProps) => {
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const scale = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 1.05, 1],
  });

  return (
    <Animated.View style={{ transform: [{ translateY }, { scale }], opacity }}>
      <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.85}>
        <View style={[styles.menuIcon, { backgroundColor: color }]}>
          <Text style={styles.menuIconText}>{icon}</Text>
        </View>
        <View style={styles.menuContent}>
          <Text style={styles.menuTitle}>{title}</Text>
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.menuArrow}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const AdminDashboardScreen = ({ navigation }: AdminDashboardScreenProps) => {
  const { user, logOut } = useAuth();
  
  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const menuAnim1 = useRef(new Animated.Value(0)).current;
  const menuAnim2 = useRef(new Animated.Value(0)).current;
  const menuAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Header fade in
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Staggered menu items
    Animated.stagger(150, [
      Animated.spring(menuAnim1, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.spring(menuAnim2, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.spring(menuAnim3, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <LinearGradient colors={['#070b17', '#0e1629', '#111f3c']} style={styles.gradient}>
      {/* Animated glow background */}
      <Animated.View style={[styles.glowCircle, { transform: [{ scale: glowScale }], opacity: glowOpacity }]} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] }]}>
          <View>
            <Text style={styles.badge}>Admin Panel</Text>
            <Text style={styles.title}>Tableau de bord</Text>
            <Text style={styles.subtitle}>
              Bienvenue, {user?.displayName || 'Administrateur'}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Menu Cards */}
        <View style={styles.menuContainer}>
          <Animated.Text style={[styles.sectionTitle, { opacity: headerAnim }]}>Gestion</Animated.Text>
          
          <MenuItem
            icon="👥"
            title="Utilisateurs"
            subtitle="Créer et gérer professeurs et étudiants"
            onPress={() => navigation.navigate('UserManagement')}
            color="#3b82f6"
            index={0}
            animatedValue={menuAnim1}
          />
          
          <MenuItem
            icon="📚"
            title="Groupes"
            subtitle="Organiser les étudiants par classe"
            onPress={() => navigation.navigate('GroupManagement')}
            color="#10b981"
            index={1}
            animatedValue={menuAnim2}
          />
          
          <MenuItem
            icon="📖"
            title="Cours"
            subtitle="Créer et assigner des cours"
            onPress={() => navigation.navigate('CourseManagement')}
            color="#f59e0b"
            index={2}
            animatedValue={menuAnim3}
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  glowCircle: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
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
    marginBottom: 32,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
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
  menuContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  menuIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconText: {
    fontSize: 24,
  },
  menuContent: {
    flex: 1,
    marginLeft: 16,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f8fafc',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 24,
    color: '#64748b',
    fontWeight: '300',
  },
});

export default AdminDashboardScreen;
