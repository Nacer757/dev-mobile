import 'react-native-gesture-handler';
import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Auth Context
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Auth Screen
import LoginScreen from './src/screens/LoginScreen';

// Admin Screens
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import UserManagementScreen from './src/screens/UserManagementScreen';
import GroupManagementScreen from './src/screens/GroupManagementScreen';
import CourseManagementScreen from './src/screens/CourseManagementScreen';

// Professor Screens
import ProfessorDashboardScreen from './src/screens/ProfessorDashboardScreen';
import GenerateQrScreen from './src/screens/GenerateQrScreen';
import AttendanceListScreen from './src/screens/AttendanceListScreen';

// Student Screens
import StudentHomeScreen from './src/screens/StudentHomeScreen';
import ScanQrScreen from './src/screens/ScanQrScreen';

const Stack = createStackNavigator();

// Auth Stack (for non-authenticated users)
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

// Admin Stack
const AdminStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    <Stack.Screen name="UserManagement" component={UserManagementScreen} />
    <Stack.Screen name="GroupManagement" component={GroupManagementScreen} />
    <Stack.Screen name="CourseManagement" component={CourseManagementScreen} />
  </Stack.Navigator>
);

// Professor Stack
const ProfessorStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfessorDashboard" component={ProfessorDashboardScreen} />
    <Stack.Screen name="GenerateQr" component={GenerateQrScreen} />
    <Stack.Screen name="AttendanceList" component={AttendanceListScreen} />
  </Stack.Navigator>
);

// Student Stack
const StudentStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="StudentHome" component={StudentHomeScreen} />
    <Stack.Screen name="ScanQr" component={ScanQrScreen} />
  </Stack.Navigator>
);

// Root Navigator - chooses stack based on auth state and user role
const RootNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!user) {
    return <AuthStack />;
  }

  // Route based on user role
  switch (user.role) {
    case 'admin':
      return <AdminStack />;
    case 'professor':
      return <ProfessorStack />;
    case 'student':
      return <StudentStack />;
    default:
      return <AuthStack />;
  }
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#070b17',
  },
});
