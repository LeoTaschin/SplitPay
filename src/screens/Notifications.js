import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, moderateScale } from '../utils/dimensions';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function NotificationsScreen({ navigation }) {
  const { colors, textStyles } = useTheme();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [debtEnabled, setDebtEnabled] = useState(false);
  const [paymentEnabled, setPaymentEnabled] = useState(false);

  useEffect(() => {
    loadNotificationSettings();
    checkNotificationPermissions();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('notificationSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setPushEnabled(parsed.push);
        setDebtEnabled(parsed.debt);
        setPaymentEnabled(parsed.payment);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveNotificationSettings = async () => {
    try {
      const settings = {
        push: pushEnabled,
        debt: debtEnabled,
        payment: paymentEnabled,
      };
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const checkNotificationPermissions = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Permissão Necessária',
        'Para receber notificações, você precisa permitir o acesso nas configurações do seu dispositivo.',
        [
          { text: 'OK', onPress: () => setPushEnabled(false) }
        ]
      );
      return;
    }
  };

  const handlePushToggle = async (value) => {
    if (value) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert(
            'Permissão Negada',
            'Você precisa permitir notificações nas configurações do dispositivo para ativar esta função.'
          );
          return;
        }
      }
    }
    setPushEnabled(value);
    saveNotificationSettings();
  };

  const NotificationItem = ({ title, description, value, onValueChange }) => (
    <View style={[styles.notificationItem, { backgroundColor: colors.surface }]}>
      <View style={styles.notificationInfo}>
        <Text style={[textStyles.body, { color: colors.text }]}>{title}</Text>
        <Text style={[textStyles.caption, { color: colors.text2 }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : value ? colors.primary : colors.text2}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[textStyles.h4, { color: colors.text }]}>Notificações</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <NotificationItem
          title="Notificações Push"
          description="Receba notificações no seu dispositivo"
          value={pushEnabled}
          onValueChange={handlePushToggle}
        />

        <NotificationItem
          title="Novas Cobranças"
          description="Seja notificado quando receber uma nova cobrança"
          value={debtEnabled}
          onValueChange={(value) => {
            setDebtEnabled(value);
            saveNotificationSettings();
          }}
        />

        <NotificationItem
          title="Pagamentos"
          description="Receba confirmações de pagamentos"
          value={paymentEnabled}
          onValueChange={(value) => {
            setPaymentEnabled(value);
            saveNotificationSettings();
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
    width: moderateScale(40),
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: moderateScale(12),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  notificationInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
}); 