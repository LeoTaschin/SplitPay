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
  Dimensions,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, moderateScale } from '../utils/dimensions';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDebts } from '../hooks/useDebts';
import { formatCurrency } from '../utils/formatters';
import { LinearGradient } from 'expo-linear-gradient';
import { removeFriend } from '../services/userService';

const { width } = Dimensions.get('window');

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

  const handleRemoveFriend = async () => {
    try {
      const result = await removeFriend(auth.currentUser.uid, friend.id);
      
      if (!result.success) {
        if (result.error === 'PENDING_DEBTS') {
          Alert.alert(
            'Dívidas Pendentes',
            `Existem dívidas pendentes com ${friend.username}:\n\n` +
            (result.totalToReceive > 0 ? `${friend.username} te deve ${formatCurrency(result.totalToReceive.toString())}\n` : '') +
            (result.totalToPay > 0 ? `Você deve ${formatCurrency(result.totalToPay.toString())} para ${friend.username}\n` : '') +
            '\nVocê precisa caducar ou resolver todas as dívidas antes de remover o amigo.',
            [
              {
                text: 'OK',
                style: 'cancel'
              }
            ]
          );
          return;
        }
        
        Alert.alert('Erro', 'Não foi possível remover o amigo. Tente novamente.');
        return;
      }

      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível remover o amigo. Tente novamente.');
    }
  };

  const menuItems = [
    {
      icon: 'trash-outline',
      title: 'Remover Amigo',
      onPress: () => {
        Alert.alert(
          'Remover Amigo',
          `Tem certeza que deseja remover ${friend.username} da sua lista de amigos?`,
          [
            {
              text: 'Cancelar',
              style: 'cancel'
            },
            {
              text: 'Remover',
              style: 'destructive',
              onPress: handleRemoveFriend
            }
          ]
        );
      },
    },
    {
      icon: 'time-outline',
      title: 'Caducar Dívida',
      onPress: () => {
        if (balance !== 0) {
          navigation.navigate('NewDebt', { 
            friend: {
              id: friend.id,
              username: friend.username,
              photoURL: friend.photoURL,
              isVerified: friendData?.isVerified
            },
            prefillAmount: Math.abs(balance).toString(),
            prefillDescription: 'Dívida caducada',
            forceDebtor: balance < 0 ? 'me' : 'other'
          });
        } else {
          alert('Não há dívidas para caducar');
        }
      },
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={[colors.primary + '30', colors.background]}
          style={styles.headerGradient}
        />
        
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.profileSection}>
              <Image
                source={{ uri: friend.photoURL || 'https://via.placeholder.com/150' }}
                style={[styles.profileImage, { borderColor: colors.primary }]}
              />
              
              <View style={styles.nameSection}>
                <View style={styles.nameContainer}>
                  <Text style={[textStyles.h2, { color: colors.text }]}>
                    {friend.username || 'Usuário'}
                  </Text>
                  {friendData?.isVerified && (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={24} 
                      color={colors.primary} 
                      style={styles.verifiedIcon}
                    />
                  )}
                </View>
                <Text style={[textStyles.body, { color: colors.text2 }]}>
                  {friend.email}
                </Text>
                {friendData?.createdAt && (
                  <Text style={[textStyles.caption, { color: colors.text2, marginTop: SPACING.xs }]}>
                    Membro desde {format(friendData.createdAt.toDate(), "MMMM yyyy", { locale: ptBR })}
                  </Text>
                )}
              </View>
            </View>

            <View style={[styles.balanceCard, { backgroundColor: colors.surface }]}>
              <Text style={[textStyles.bodySmall, { color: colors.text2 }]}>
                {Math.abs(balance) === 0 ? 'Sem dívidas pendentes' : 
                  balance > 0 ? `${friend.username} te deve` : `Você deve para ${friend.username}`}
              </Text>
              <Text style={[
                textStyles.h1,
                { color: balance > 0 ? colors.success : balance < 0 ? colors.error : colors.text }
              ]}>
                {formatCurrency(Math.abs(balance).toString())}
              </Text>
            </View>
          </View>

          <View style={[styles.actionsContainer, { backgroundColor: colors.surface }]}>
            <Text style={[textStyles.subtitle, { color: colors.text, marginBottom: SPACING.md }]}>
              Ações Rápidas
            </Text>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.background }
                ]}
                onPress={item.onPress}
              >
                <View style={styles.actionContent}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name={item.icon} size={24} color={colors.primary} />
                  </View>
                  <Text style={[textStyles.body, { color: colors.text, flex: 1 }]}>
                    {item.title}
                  </Text>
                  <Ionicons name="chevron-forward" size={24} color={colors.text2} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: moderateScale(220),
  },
  content: {
    flex: 1,
  },
  header: {
    padding: SPACING.lg,
  },
  profileSection: {
    marginTop: moderateScale(60),
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    borderWidth: moderateScale(2),
  },
  nameSection: {
    marginLeft: SPACING.lg,
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedIcon: {
    marginLeft: SPACING.xs,
  },
  balanceCard: {
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    borderRadius: moderateScale(16),
    alignItems: 'center',
  },
  actionsContainer: {
    margin: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: moderateScale(16),
  },
  actionButton: {
    borderRadius: moderateScale(12),
    marginBottom: SPACING.sm,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  iconContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  backButton: {
    position: 'absolute',
    top: SPACING.xxl * 2,
    left: SPACING.lg,
    padding: SPACING.sm,
    borderRadius: moderateScale(12),
    zIndex: 1,
  },
}); 