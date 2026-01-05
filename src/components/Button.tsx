import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  title?: string;
  emoji?: string;
  style?: ViewStyle;
  circular?: boolean; 
}

const Button: React.FC<ButtonProps> = ({ onPress, title, emoji, style, circular = false }) => {
  const buttonStyle = circular ? [styles.circular, style] : [styles.button, style];
  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress}> 
      {emoji && <Text style={circular ? styles.emojiCircular : styles.emoji}>{emoji}</Text>}
      {title && <Text style={circular ? styles.titleCircular : styles.title}>{title}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  circular: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007bff', // Professional blue color
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  emojiCircular: {
    fontSize: 24,
    color: '#fff', // White color for contrast on blue background
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  titleCircular: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff', // White color for contrast
  },
});

export default Button;

// Specific Button Components
export const ProfileButton: React.FC<{ onPress: () => void; style?: ViewStyle }> = ({ onPress, style }) => (
  <Button emoji="👤" onPress={onPress} style={style} />
);

export const AttendifyButton: React.FC<{ onPress: () => void; style?: ViewStyle }> = ({ onPress, style }) => (
  <Button title="Attendify" onPress={onPress} style={style} />
);

export const LogoutButton: React.FC<{ onPress: () => void; style?: ViewStyle }> = ({ onPress, style }) => (
  <Button title="Logout" onPress={onPress} style={style} />
);


