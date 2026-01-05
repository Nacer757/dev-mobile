import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ProfileButton, AttendifyButton, LogoutButton } from './Button';

interface HeaderProps {
  onProfilePress: () => void;
  onHomePress: () => void;
  onLogoutPress: () => void;
}

const Header: React.FC<HeaderProps> = ({ onProfilePress, onHomePress, onLogoutPress }) => {
  return (
    <View style={styles.header}>
      <ProfileButton onPress={onProfilePress} style={styles.button} />
      <AttendifyButton onPress={onHomePress} style={styles.button} />
      <LogoutButton onPress={onLogoutPress} style={styles.button} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
  },
  button: {
    marginHorizontal: 10,
  },
});

export default Header;
