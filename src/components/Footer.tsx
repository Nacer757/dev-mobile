import React from 'react';
import { View, StyleSheet } from 'react-native';
import Button from './Button';

interface FooterProps {
  onQrPress: () => void;
  onNotificationsPress: () => void;
  onListPress: () => void;
}

const Footer: React.FC<FooterProps> = ({ onQrPress, onNotificationsPress, onListPress }) => {
  return (
    <View style={styles.footer}>
    
      {/* Notifications Button */}
      <Button
        emoji="🔔" // Bell icon for notifications
        onPress={onNotificationsPress}
        circular={true}
        style={styles.button}
      />
        {/* QR Code Button */}
      <Button
        emoji="📱" // Using a mobile icon as QR code representation
        onPress={onQrPress}
        circular={true}
        style={styles.button}
      />
      {/* List Button */}
      <Button
        emoji="📋" // Clipboard icon for list/menu
        onPress={onListPress}
        circular={true}
        style={styles.button}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
    backgroundColor: '#f8f9fa', // Light background similar to header
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  button: {
    marginHorizontal: 10,
  },
});

export default Footer;
