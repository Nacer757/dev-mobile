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

interface MultiSelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface FormMultiSelectProps {
  label?: string;
  placeholder?: string;
  options: MultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  icon?: string;
  accentColor?: string;
}

const FormMultiSelect: React.FC<FormMultiSelectProps> = ({
  label,
  placeholder = 'Sélectionner...',
  options,
  values,
  onChange,
  icon,
  accentColor = '#3b82f6',
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOptions = options.filter(opt => values.includes(opt.value));
  const displayText = selectedOptions.length > 0
    ? selectedOptions.map(o => o.label).join(', ')
    : placeholder;

  const toggleOption = (optionValue: string) => {
    if (values.includes(optionValue)) {
      onChange(values.filter(v => v !== optionValue));
    } else {
      onChange([...values, optionValue]);
    }
  };

  const handleDone = () => {
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
        <Text 
          style={[styles.selectText, selectedOptions.length === 0 && styles.placeholder]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        {values.length > 0 && (
          <View style={[styles.badge, { backgroundColor: accentColor }]}>
            <Text style={styles.badgeText}>{values.length}</Text>
          </View>
        )}
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
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{label || 'Sélectionner'}</Text>
                <TouchableOpacity onPress={handleDone}>
                  <Text style={[styles.doneButton, { color: accentColor }]}>Terminé</Text>
                </TouchableOpacity>
              </View>
              
              {values.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => onChange([])}
                >
                  <Text style={styles.clearButtonText}>Tout désélectionner</Text>
                </TouchableOpacity>
              )}

              <FlatList
                data={options}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => {
                  const isSelected = values.includes(item.value);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.optionItem,
                        isSelected && { backgroundColor: `${accentColor}20` },
                      ]}
                      onPress={() => toggleOption(item.value)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && { backgroundColor: accentColor, borderColor: accentColor },
                        ]}
                      >
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      {item.icon && <Text style={styles.optionIcon}>{item.icon}</Text>}
                      <Text style={styles.optionText}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                }}
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  arrow: {
    fontSize: 12,
    color: '#64748b',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    marginBottom: 12,
  },
  clearButtonText: {
    fontSize: 13,
    color: '#f87171',
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  optionIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#e2e8f0',
  },
});

export default FormMultiSelect;
