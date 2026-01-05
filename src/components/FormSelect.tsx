import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface FormSelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  icon?: string;
  accentColor?: string;
}

const FormSelect: React.FC<FormSelectProps> = ({
  label,
  placeholder = 'Sélectionner...',
  options,
  value,
  onChange,
  icon,
  accentColor = '#3b82f6',
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={[styles.selectText, !selectedOption && styles.placeholder]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#1e293b', '#0f172a']}
              style={styles.modalGradient}
            >
              <Text style={styles.modalTitle}>{label || 'Sélectionner'}</Text>
              <FlatList
                data={options}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      item.value === value && { backgroundColor: `${accentColor}30` },
                    ]}
                    onPress={() => handleSelect(item.value)}
                  >
                    {item.icon && <Text style={styles.optionIcon}>{item.icon}</Text>}
                    <Text
                      style={[
                        styles.optionText,
                        item.value === value && { color: accentColor },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.value === value && (
                      <Text style={[styles.checkmark, { color: accentColor }]}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
                style={styles.optionsList}
              />
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  icon: {
    fontSize: 18,
    marginRight: 10,
  },
  selectText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
  },
  placeholder: {
    color: '#64748b',
  },
  arrow: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '70%',
  },
  modalGradient: {
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  optionIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#e2e8f0',
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
  },
});

export default FormSelect;
