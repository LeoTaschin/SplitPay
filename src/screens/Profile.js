import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, moderateScale } from '../utils/dimensions';
import { formatCurrency } from '../utils/formatters';

export function Profile({ user, userTotals, onEditProfile, onLogout }) {
  const { colors, textStyles } = useTheme();

  const menuItems = [
    {
      icon: 'person-outline',
      title: 'Editar Perfil',
      onPress: onEditProfile,
    },
    {
      icon: 'notifications-outline',
      title: 'Notificações',
      onPress: () => {},
    },
    {
      icon: 'lock-closed-outline',
      title: 'Privacidade',
      onPress: () => {},
    },
    {
      icon: 'help-circle-outline',
      title: 'Ajuda',
      onPress: () => {},
    },
    {
      icon: 'information-circle-outline',
      title: 'Sobre',
      onPress: () => {},
    },
    {
      icon: 'log-out-outline',
      title: 'Sair',
      onPress: onLogout,
      color: colors.error,
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: user?.photoURL || 'https://via.placeholder.com/150' }}
            style={styles.photo}
          />
          <TouchableOpacity style={styles.editPhotoButton}>
            <Ionicons name="camera" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={[textStyles.h4, { color: colors.text, marginTop: SPACING.sm }]}>
          {user?.username || 'Usuário'}
        </Text>
        <Text style={[textStyles.body, { color: colors.text2 }]}>
          {user?.email}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[textStyles.caption, { color: colors.text2 }]}>
            A receber
          </Text>
          <Text style={[textStyles.h4, { color: colors.success, marginTop: 4 }]}>
            {formatCurrency(userTotals?.totalToReceive || 0)}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[textStyles.caption, { color: colors.text2 }]}>
            A pagar
          </Text>
          <Text style={[textStyles.h4, { color: colors.error, marginTop: 4 }]}>
            {formatCurrency(userTotals?.totalToPay || 0)}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[textStyles.caption, { color: colors.text2 }]}>
            Saldo
          </Text>
          <Text style={[
            textStyles.h4,
            { color: (userTotals?.totalToReceive - userTotals?.totalToPay) >= 0 ? colors.success : colors.error, marginTop: 4 }
          ]}>
            {formatCurrency((userTotals?.totalToReceive || 0) - (userTotals?.totalToPay || 0))}
          </Text>
        </View>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, { backgroundColor: colors.cardBackground }]}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons
                name={item.icon}
                size={24}
                color={item.color || colors.text}
              />
              <Text style={[textStyles.body, { color: item.color || colors.text, marginLeft: SPACING.md }]}>
                {item.title}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.text2}
            />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  photo: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    backgroundColor: '#f0f0f0',
  },
  editPhotoButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderRadius: moderateScale(20),
    padding: moderateScale(8),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: moderateScale(12),
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  menuContainer: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  menuItem: {
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
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 