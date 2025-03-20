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
import { db, auth } from '../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';

// Configurar o comportamento das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function NotificationsScreen({ navigation }) {
  const { colors, textStyles } = useTheme();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const updateUserPushToken = async (token) => {
    const user = auth.currentUser;
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), {
        pushToken: token,
      });
    }
  };

  const loadNotificationSettings = async () => {
    try {
      setIsLoading(true);
      // Carregar configurações do AsyncStorage
      const settings = await AsyncStorage.getItem('notificationSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setPushEnabled(parsed.push);
        setPaymentEnabled(parsed.payment);
      }

      // Verificar permissões de notificação
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus === 'granted') {
        setPushEnabled(true);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotificationSettings = async () => {
    try {
      const settings = {
        push: pushEnabled,
        payment: paymentEnabled,
      };
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const registerForPushNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permissão necessária',
          'Para receber notificações, precisamos da sua permissão.'
        );
        return;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '111040a7-3e4b-418b-8c57-4c0908b83fc0',
      });

      if (token.data) {
        await updateUserPushToken(token.data);
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      Alert.alert(
        'Erro',
        'Não foi possível configurar as notificações. Tente novamente.'
      );
    }
  };

  const handlePushToggle = async (value) => {
    try {
      if (value) {
        await registerForPushNotifications();
      } else {
        // Remover o token do Firestore quando desativar
        const user = auth.currentUser;
        if (user) {
          await updateDoc(doc(db, 'users', user.uid), {
            pushToken: null,
          });
        }
      }

      setPushEnabled(value);
      await saveNotificationSettings();
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      Alert.alert('Erro', 'Não foi possível alterar as configurações de notificação');
    }
  };

  const handlePaymentToggle = async (value) => {
    try {
      setPaymentEnabled(value);
      await saveNotificationSettings();
    } catch (error) {
      console.error('Error toggling payment notifications:', error);
      Alert.alert('Erro', 'Não foi possível alterar as configurações de notificação');
    }
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

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[textStyles.body, { color: colors.text }]}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          description="Receba notificações quando alguém registrar uma dívida para você"
          value={pushEnabled}
          onValueChange={handlePushToggle}
        />

        <NotificationItem
          title="Pagamentos"
          description="Receba confirmações de pagamentos"
          value={paymentEnabled}
          onValueChange={handlePaymentToggle}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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