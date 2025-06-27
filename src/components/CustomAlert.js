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

export function CustomAlert({ 
  visible, 
  onClose, 
  title, 
  message, 
  icon = 'alert-circle',
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'info' // info, warning, error, success
}) {
  const { colors, textStyles } = useTheme();

  const getIconColor = () => {
    switch (type) {
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      case 'success':
        return colors.success;
      default:
        return colors.primary;
    }
  };

  const getIconBackgroundColor = () => {
    const iconColor = getIconColor();
    return iconColor + '15';
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    if (onClose) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    if (onClose) {
      onClose();
    }
  };

  const hasTwoButtons = onConfirm && onCancel;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.iconContainer, { backgroundColor: getIconBackgroundColor() }]}>
            <Ionicons name={icon} size={moderateScale(32)} color={getIconColor()} />
          </View>
          
          <Text style={[textStyles.h2, styles.title, { color: colors.text }]}>
            {title}
          </Text>
          
          <Text style={[textStyles.body, styles.message, { color: colors.text2 }]}>
            {message}
          </Text>

          {hasTwoButtons ? (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
                onPress={handleCancel}
              >
                <Text style={[textStyles.button, { color: colors.text2 }]}>
                  {cancelText}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.confirmButton, { backgroundColor: getIconColor() }]}
                onPress={handleConfirm}
              >
                <Text style={[textStyles.button, { color: colors.white }]}>
                  {confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.singleButton, { backgroundColor: getIconColor() }]}
              onPress={handleCancel}
            >
              <Text style={[textStyles.button, { color: colors.white }]}>
                Entendi
              </Text>
            </TouchableOpacity>
          )}
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
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  button: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  confirmButton: {
    // backgroundColor is set dynamically
  },
  singleButton: {
    width: '100%',
  },
}); 