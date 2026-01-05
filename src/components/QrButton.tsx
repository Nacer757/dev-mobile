import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QrButtonProps {
  onPress: () => void;
  isVisible?: boolean;
  style?: ViewStyle;
}

const QrButton: React.FC<QrButtonProps> = ({ onPress, isVisible = true, style }) => {
  if (!isVisible) return null;

  return (
    <TouchableOpacity style={[styles.floatingButton, style]} onPress={onPress}>
      <Ionicons name="qr-code" size={24} color="#fff" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default QrButton;
