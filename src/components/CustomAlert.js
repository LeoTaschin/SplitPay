import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Pressable,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, moderateScale } from '../utils/dimensions';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export const CustomAlert = ({
  visible,
  title,
  message,
  type = 'info', // 'info', 'success', 'warning', 'error'
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancelar',
  showCancel = true,
  icon,
  customIcon,
  buttons = [],
  dismissOnOverlayPress = true,
  showCloseButton = false,
  closeOnConfirm = true,
}) => {
  const { colors, textStyles } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getIconName = () => {
    if (icon) return icon;
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'alert-circle';
      default:
        return 'information-circle';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.error;
      case 'error':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const handleOverlayPress = () => {
    if (dismissOnOverlayPress) {
      onCancel?.();
    }
  };

  const handleConfirm = () => {
    onConfirm?.();
    if (closeOnConfirm) {
      onCancel?.();
    }
  };

  const renderButtons = () => {
    if (buttons.length > 0) {
      return (
        <View style={styles.buttonContainer}>
          {buttons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.button,
                button.style,
                button.type === 'cancel' && styles.cancelButton,
                { borderColor: colors.border }
              ]}
              onPress={button.onPress}
            >
              <Text style={[
                textStyles.button,
                { color: button.type === 'cancel' ? colors.text : colors.surface }
              ]}>
                {button.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    return (
      <View style={styles.buttonContainer}>
        {showCancel && (
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
            onPress={onCancel}
          >
            <Text style={[textStyles.button, { color: colors.text }]}>
              {cancelText}
            </Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.button, styles.confirmButton, { backgroundColor: getIconColor() }]}
          onPress={handleConfirm}
        >
          <Text style={[textStyles.button, { color: colors.surface }]}>
            {confirmText}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.modalOverlay} onPress={handleOverlayPress}>
        <Animated.View 
          style={[
            styles.alertContainer,
            { 
              backgroundColor: colors.surface,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {showCloseButton && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onCancel}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          )}

          <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '20' }]}>
            {customIcon || (
              <Ionicons name={getIconName()} size={moderateScale(32)} color={getIconColor()} />
            )}
          </View>
          
          <Text style={[textStyles.h4, styles.title, { color: colors.text }]}>
            {title}
          </Text>
          
          <Text style={[textStyles.body, styles.message, { color: colors.text2 }]}>
            {message}
          </Text>

          {renderButtons()}
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    width: width * 0.85,
    maxWidth: 400,
    padding: SPACING.xl,
    borderRadius: moderateScale(16),
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    padding: SPACING.xs,
  },
  iconContainer: {
    width: moderateScale(64),
    height: moderateScale(64),
    borderRadius: moderateScale(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
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
    justifyContent: 'center',
    gap: SPACING.md,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
    minWidth: 0,
  },
}); 