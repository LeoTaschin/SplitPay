import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, moderateScale } from '../utils/dimensions';
import { useNavigation } from '@react-navigation/native';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDebts } from '../hooks/useDebts';
import { formatCurrency } from '../utils/formatters';

export function FriendProfile({ route }) {
  const { colors, textStyles } = useTheme();
  const navigation = useNavigation();
  const { friend } = route.params;
  const [friendData, setFriendData] = useState(null);
  const { debtsAsCreditor, debtsAsDebtor } = useDebts();

  useEffect(() => {
    const fetchFriendData = async () => {
      try {
        const friendDoc = await getDoc(doc(db, 'users', friend.id));
        if (friendDoc.exists()) {
          setFriendData(friendDoc.data());
        }
      } catch (error) {
        console.error('FriendProfile - fetchFriendData - Erro:', error);
      }
    };

    if (friend?.id) {
      fetchFriendData();
    }
  }, [friend]);

  const calculateBalance = () => {
    const debtsAsCreditorToFriend = debtsAsCreditor
      .filter(debt => debt.debtorId === friend.id)
      .reduce((sum, debt) => sum + (debt.paid ? 0 : debt.amount), 0);

    const debtsAsDebtorToFriend = debtsAsDebtor
      .filter(debt => debt.creditorId === friend.id)
      .reduce((sum, debt) => sum + (debt.paid ? 0 : debt.amount), 0);

    return debtsAsCreditorToFriend - debtsAsDebtorToFriend;
  };

  const balance = calculateBalance();
  const isPositive = balance > 0;
  const isNegative = balance < 0;

  const menuItems = [
    {
      icon: 'cash-outline',
      title: 'Criar Nova Dívida',
      onPress: () => navigation.navigate('NewDebt', { selectedFriend: friend }),
    },
    {
      icon: 'time-outline',
      title: 'Histórico de Transações',
      onPress: () => navigation.navigate('Activity', { friendId: friend.id }),
    },
    {
      icon: 'chatbubble-outline',
      title: 'Enviar Mensagem',
      onPress: () => {
        // Implementar chat
      },
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[textStyles.h3, { color: colors.text }]}>Perfil do Amigo</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.headerContent}>
          <View style={styles.photoContainer}>
            <Image
              source={{ uri: friend.photoURL || 'https://via.placeholder.com/150' }}
              style={[styles.photo, { 
                borderColor: colors.primary,
                backgroundColor: colors.surface 
              }]}
            />
            {friendData?.isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.background }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            <View style={styles.nameContainer}>
              <Text style={[textStyles.h3, { color: colors.text }]}>
                {friend.username || 'Usuário'}
              </Text>
              {friendData?.isVerified && (
                <View style={styles.verifiedBadgeContainer}>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color={colors.primary} 
                    style={styles.verifiedIcon}
                  />
                </View>
              )}
            </View>
            <Text style={[textStyles.body, { color: colors.text2 }]}>
              {friend.email}
            </Text>
            {friendData?.createdAt && (
              <Text style={[textStyles.bodySmall, { color: colors.text2 }]}>
                Membro desde {format(friendData.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR })}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.balanceCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[textStyles.body, { color: colors.text2 }]}>Saldo com {friend.username}</Text>
          <Text style={[
            textStyles.h2,
            {
              color: isPositive ? colors.success : isNegative ? colors.error : colors.text,
            }
          ]}>
            {isPositive ? '+' : ''}{formatCurrency(balance.toString())}
          </Text>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <React.Fragment key={index}>
              <TouchableOpacity
                style={[styles.menuItem]}
                onPress={item.onPress}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={[textStyles.body, { color: colors.text, marginLeft: SPACING.md }]}>
                    {item.title}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.text2}
                />
              </TouchableOpacity>
              {index !== menuItems.length - 1 && (
                <View style={[styles.separator, { backgroundColor: colors.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.md,
  },
  content: {
    flex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  photoContainer: {
    position: 'relative',
    marginRight: SPACING.lg,
  },
  photo: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    borderWidth: moderateScale(2),
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: moderateScale(12),
    padding: moderateScale(2),
  },
  userInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceCard: {
    margin: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: moderateScale(12),
    alignItems: 'center',
  },
  menuContainer: {
    paddingHorizontal: SPACING.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    opacity: 0.5,
    marginVertical: SPACING.xs,
  },
  verifiedBadgeContainer: {
    marginLeft: SPACING.xs,
    borderRadius: moderateScale(12),
    padding: moderateScale(2),
  },
  verifiedIcon: {
    marginLeft: 0,
  },
}); 