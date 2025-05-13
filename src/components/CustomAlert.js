import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, moderateScale } from '../utils/dimensions';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export function CustomAlert({ visible, onClose, title, message, icon = 'alert-circle' }) {
  const { colors, textStyles } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name={icon} size={moderateScale(32)} color={colors.primary} />
          </View>
          
          <Text style={[textStyles.h2, styles.title, { color: colors.text }]}>
            {title}
          </Text>
          
          <Text style={[textStyles.body, styles.message, { color: colors.text2 }]}>
            {message}
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={[textStyles.button, { color: colors.white }]}>
              Entendi
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    borderRadius: moderateScale(16),
    padding: SPACING.xl,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  iconContainer: {
    width: moderateScale(64),
    height: moderateScale(64),
    borderRadius: moderateScale(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  button: {
    width: '100%',
    padding: SPACING.md,
    borderRadius: moderateScale(12),
    alignItems: 'center',
  },
}); 