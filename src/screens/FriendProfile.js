import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
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
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const WaveBackground = ({ colors }) => {
  return (
    <View style={styles.waveContainer}>
      <Svg
        height="100%"
        width="100%"
        viewBox={`0 0 ${width} ${height * 0.3}`}
        preserveAspectRatio="none"
        style={styles.waveSvg}
      >
        <Path
          fill={colors.primary + '30'}
          d={`M0,${height * 0.2}C${width * 0.25},${height * 0.15},${width * 0.75},${height * 0.25},${width},${height * 0.2}V0H0Z`}
        />
        <Path
          fill={colors.primary + '50'}
          d={`M0,${height * 0.15}C${width * 0.25},${height * 0.2},${width * 0.75},${height * 0.1},${width},${height * 0.15}V0H0Z`}
        />
        <Path
          fill={colors.primary + '80'}
          d={`M0,${height * 0.1}C${width * 0.25},${height * 0.05},${width * 0.75},${height * 0.15},${width},${height * 0.1}V0H0Z`}
        />
      </Svg>
    </View>
  );
};

export function FriendProfile({ route }) {
  const { colors, textStyles } = useTheme();
  const navigation = useNavigation();
  const { friend } = route.params;
  const [friendData, setFriendData] = useState(null);
  const { debtsAsCreditor, debtsAsDebtor } = useDebts();
  const waveAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    const startWaveAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startWaveAnimation();
  }, []);

  const waveStyle = {
    position: 'absolute',
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    borderWidth: moderateScale(2),
    borderColor: colors.primary + '50',
    backgroundColor: colors.primary + '10',
    transform: [
      {
        scale: waveAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.4],
        }),
      },
    ],
    opacity: waveAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 0],
    }),
  };

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />
      <WaveBackground colors={colors} />
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: colors.background + '80' }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ScrollView style={styles.content}>
          <View style={styles.headerContent}>
            <View style={styles.photoContainer}>
              <Animated.View style={[styles.waveContainer, waveStyle]} />
              <Image
                source={{ uri: friend.photoURL || 'https://via.placeholder.com/150' }}
                style={[styles.photo, { 
                  borderColor: colors.primary,
                  backgroundColor: colors.surface,
                  zIndex: 1,
                }]}
              />
            </View>
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
            <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center', marginTop: SPACING.xs }]}>
              {friend.email}
            </Text>
            {friendData?.createdAt && (
              <Text style={[textStyles.bodySmall, { color: colors.text2, textAlign: 'center', marginTop: SPACING.xs }]}>
                Membro desde {format(friendData.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR })}
              </Text>
            )}
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
  content: {
    flex: 1,
  },
  headerContent: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  photoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: moderateScale(120),
    height: moderateScale(120),
    marginBottom: SPACING.md,
  },
  waveContainer: {
    position: 'absolute',
    width: '100%',
    height: '50%',
    top: 0,
    overflow: 'hidden',
  },
  waveSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  photo: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    borderWidth: moderateScale(2),
    position: 'relative',
  },
  userInfo: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  backButton: {
    position: 'absolute',
    bottom: SPACING,
    top: SPACING.xxl * 2,
    left: SPACING.md,
    padding: SPACING.xs,
    zIndex: 2,
    borderRadius: moderateScale(20),
  },
}); 