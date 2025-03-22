import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, moderateScale } from '../utils/dimensions';
import { formatCurrency } from '../utils/formatters';

// Componente para animar valores numéricos
const AnimatedValue = ({ value, style }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    // Anima o valor numérico
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    // Anima o efeito de "pulse"
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Atualiza o valor mostrado durante a animação
    const listener = animatedValue.addListener(({ value }) => {
      setDisplayValue(value.toFixed(2));
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value]);

  return (
    <Animated.Text 
      style={[
        style,
        {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      R$ {displayValue}
    </Animated.Text>
  );
};

export function Activity({ userTotals, debtsAsCreditor, debtsAsDebtor, loading, onRefresh }) {
  const { colors, textStyles } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  
  // Calcula os totais reais baseados nas dívidas individuais
  const calculatedTotalToReceive = debtsAsCreditor.reduce((sum, debt) => sum + (debt.amount || 0), 0);
  const calculatedTotalToPay = debtsAsDebtor.reduce((sum, debt) => sum + (debt.amount || 0), 0);
  
  // Usa os valores calculados se os totais do usuário estiverem zerados
  const totalToReceive = userTotals.totalToReceive || calculatedTotalToReceive;
  const totalToPay = userTotals.totalToPay || calculatedTotalToPay;
  
  const balance = totalToReceive - totalToPay;

  // Calcula o total de amigos com dívidas reais
  const calculateFriendsWithDebts = () => {
    const friendDebts = {};

    // Processa dívidas a receber
    debtsAsCreditor.forEach(debt => {
      const friendId = debt.debtorId;
      if (!friendDebts[friendId]) {
        friendDebts[friendId] = {
          friend: debt.debtor,
          balance: 0
        };
      }
      friendDebts[friendId].balance += Number(debt.amount) || 0;
    });

    // Processa dívidas a pagar
    debtsAsDebtor.forEach(debt => {
      const friendId = debt.creditorId;
      if (!friendDebts[friendId]) {
        friendDebts[friendId] = {
          friend: debt.creditor,
          balance: 0
        };
      }
      friendDebts[friendId].balance -= Number(debt.amount) || 0;
    });

    // Conta apenas amigos com dívidas não zeradas
    return Object.values(friendDebts).filter(friendDebt => friendDebt.balance !== 0).length;
  };

  const totalFriendsWithDebts = calculateFriendsWithDebts();

  // Calcula o total de dívidas por amigo
  const calculateDebtsByFriend = () => {
    const friendDebts = {};

    // Processa dívidas a receber
    debtsAsCreditor.forEach(debt => {
      const friendId = debt.debtorId;
      if (!friendDebts[friendId]) {
        friendDebts[friendId] = {
          friend: debt.debtor,
          balance: 0
        };
      }
      friendDebts[friendId].balance += Number(debt.amount) || 0;
    });

    // Processa dívidas a pagar
    debtsAsDebtor.forEach(debt => {
      const friendId = debt.creditorId;
      if (!friendDebts[friendId]) {
        friendDebts[friendId] = {
          friend: debt.creditor,
          balance: 0
        };
      }
      friendDebts[friendId].balance -= Number(debt.amount) || 0;
    });

    return Object.values(friendDebts);
  };

  const debtsByFriend = calculateDebtsByFriend();

  // Encontra o amigo com a maior dívida total
  const findLargestDebt = () => {
    let largestAmount = 0;
    let largestDebtInfo = null;

    debtsByFriend.forEach(friendDebt => {
      const balance = Math.abs(friendDebt.balance);

      if (balance > largestAmount) {
        largestAmount = balance;
        largestDebtInfo = {
          amount: balance,
          type: friendDebt.balance > 0 ? 'receive' : 'pay',
          friend: friendDebt.friend
        };
      }
    });

    return largestDebtInfo || { amount: 0, type: null, friend: null };
  };

  const largestDebtInfo = findLargestDebt();

  // Determina o texto a ser exibido baseado no tipo da maior dívida
  const getLargestDebtText = () => {
    if (largestDebtInfo.amount === 0) return 'Sem dívidas';
    if (largestDebtInfo.type === 'receive') return 'Maior valor a receber';
    if (largestDebtInfo.type === 'pay') return 'Maior valor a pagar';
    return 'Maior dívida';
  };

  // Combine and sort all transactions
  const recentTransactions = [
    ...debtsAsCreditor.map(debt => ({
      ...debt,
      type: 'receive',
      amount: debt.amount,
      date: debt.createdAt?.toDate() || new Date(),
    })),
    ...debtsAsDebtor.map(debt => ({
      ...debt,
      type: 'pay',
      amount: -debt.amount,
      date: debt.createdAt?.toDate() || new Date(),
    })),
  ].sort((a, b) => b.date - a.date).slice(0, 10);

  const renderTransaction = ({ item }) => {
    const isReceive = item.type === 'receive';
    const date = item.date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const time = item.date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const otherUser = isReceive ? item.debtor : item.creditor;
    const userProfilePic = otherUser?.photoURL || 'default_profile_pic_url';

    return (
      <View style={[styles.transactionCard, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.transactionIconContainer}>
          <Image 
            source={{ uri: userProfilePic }} 
            style={[styles.transactionProfilePic, { borderColor: colors.primary }]} 
          />
          <View style={[
            styles.transactionIndicator,
            { backgroundColor: isReceive ? colors.success : colors.error }
          ]}>
            <Ionicons 
              name={isReceive ? "arrow-down" : "arrow-up"} 
              size={12} 
              color={colors.background} 
            />
          </View>
        </View>
        <View style={styles.transactionInfo}>
          <View style={styles.transactionMainInfo}>
            <View style={styles.transactionUserInfo}>
              <Text style={[textStyles.body, { color: colors.text, fontWeight: '600' }]}>
                {otherUser?.username || 'Usuário'}
              </Text>
              {item.description && (
                <Text 
                  style={[textStyles.caption, { color: colors.text2, marginTop: 2 }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.description}
                </Text>
              )}
            </View>
            <View style={[
              styles.transactionAmount,
              { backgroundColor: isReceive ? colors.success + '10' : colors.error + '10' }
            ]}>
              <Text style={[
                textStyles.bodyLarge,
                { color: isReceive ? colors.success : colors.error, fontWeight: '600' }
              ]}>
                {isReceive ? '+' : ''}{formatCurrency(item.amount)}
              </Text>
            </View>
          </View>
          <View style={styles.transactionDateInfo}>
            <Text style={[textStyles.caption, { color: colors.text2 }]}>
              {date} às {time}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const onRefreshHandler = async () => {
    try {
      setRefreshing(true);
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[textStyles.h4, { color: colors.text, marginBottom: SPACING.md }]}>
        Atividade
      </Text>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="people" size={14} color={colors.primary} />
          </View>
          <Text style={[textStyles.caption, { color: colors.text2, marginTop: 4 }]}>
            Amigos com dívidas
          </Text>
          <Text style={[textStyles.body, { color: colors.text, marginTop: 2 }]}>
            {totalFriendsWithDebts}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="trending-up" size={14} color={colors.primary} />
          </View>
          <Text style={[textStyles.caption, { color: colors.text2, marginTop: 4 }]}>
            {getLargestDebtText()}
          </Text>
          <Text style={[textStyles.body, { color: colors.text, marginTop: 2 }]}>
            {largestDebtInfo.amount === 0 ? '-' : formatCurrency(largestDebtInfo.amount)}
          </Text>
          {largestDebtInfo.amount > 0 && (
            <Text style={[textStyles.caption, { color: colors.text2, marginTop: 2 }]}>
              {largestDebtInfo.type === 'receive' ? 'de' : 'para'} {largestDebtInfo.friend?.username || 'Usuário'}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.transactionsContainer}>
        <Text style={[textStyles.h5, { color: colors.text, marginBottom: SPACING.md }]}>
          Transações Recentes
        </Text>
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : recentTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={48} color={colors.text2} />
            <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center', marginTop: SPACING.md }]}>
              Nenhuma transação recente
            </Text>
          </View>
        ) : (
          <FlatList
            data={recentTransactions}
            renderItem={renderTransaction}
            keyExtractor={(item, index) => `${item.id || index}-${item.date}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.transactionsList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefreshHandler}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={colors.cardBackground}
              />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: moderateScale(10),
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        shadowColor: '#000',
      },
    }),
  },
  statIconContainer: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionsContainer: {
    flex: 1,
  },
  transactionsList: {
    paddingBottom: SPACING.xl,
  },
  transactionCard: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: moderateScale(12),
    marginBottom: SPACING.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        shadowColor: '#000',
      },
    }),
  },
  transactionIconContainer: {
    marginRight: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  transactionProfilePic: {
    width: moderateScale(45),
    height: moderateScale(45),
    borderRadius: moderateScale(22.5),
  },
  transactionIndicator: {
    position: 'absolute',
    bottom: 10,
    right: -2,
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: moderateScale(1),
    borderColor: 'white',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  transactionUserInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  transactionAmount: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: moderateScale(8),
  },
  transactionDateInfo: {
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: moderateScale(12),
    marginBottom: SPACING.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        shadowColor: '#000',
      },
    }),
  },
  successCircle: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        shadowColor: '#000',
      },
    }),
  },
}); 