import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text,
  Alert,
  Platform,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useDebts } from '../hooks/useDebts';
import { BottomToolbar } from '../components/BottomToolbar';
import { Ionicons } from '@expo/vector-icons';
import { Logo } from '../components/Logo';
import { MainTabs } from '../components/MainTabs';
import { SPACING, moderateScale } from '../utils/dimensions';
import { useFocusEffect } from '@react-navigation/native';

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

export default function HomeScreen({ navigation }) {
  const { colors, textStyles } = useTheme();
  const { user, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('friends');
  const { 
    debtsAsCreditor, 
    debtsAsDebtor, 
    userTotals, 
    loading, 
    error,
    fetchDebts 
  } = useDebts();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estilos que dependem do tema
  const dynamicStyles = {
    container: {
      ...styles.container,
      backgroundColor: colors.background
    },
    balanceCard: {
      ...styles.balanceCard,
      backgroundColor: colors.cardBackground
    },
    balanceDetails: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: SPACING.xl,
      width: '100%',
      marginTop: SPACING.md,
      paddingTop: SPACING.md,
      borderTopWidth: 1,
    },
  };

  // Atualiza quando a tela recebe foco
  useFocusEffect(
    React.useCallback(() => {
      console.log('Home - useFocusEffect - Tela recebeu foco');
      
      const updateData = async () => {
        if (user?.uid && !isRefreshing) {
          try {
            setIsRefreshing(true);
            console.log('Home - useFocusEffect - Atualizando dados');
            await fetchDebts();
            console.log('Home - useFocusEffect - Dados atualizados com sucesso');
          } catch (error) {
            console.error('Home - useFocusEffect - Erro ao atualizar dados:', error);
          } finally {
            setIsRefreshing(false);
          }
        }
      };

      updateData();
    }, [user?.uid, fetchDebts])
  );

  // Mantém o useEffect original para a primeira carga
  useEffect(() => {
    console.log('Home - useEffect - INÍCIO');
    console.log('Home - useEffect - Estado detalhado:', {
      userUid: user?.uid,
      userEmail: user?.email,
      userPhotoURL: user?.photoURL,
      isAuthenticated: !!user,
      authLoading,
      activeTab,
      loading,
      hasError: !!error
    });

    if (!user && !authLoading) {
      console.error('Home - useEffect - ERRO: Usuário não autenticado e não está carregando');
      console.log('Home - useEffect - Redirecionando para Login');
      navigation.replace('Login');
      return;
    }

    return () => {
      console.log('Home - useEffect - Desmontando componente');
    };
  }, [user, authLoading]);

  const handleTabChange = async (tab) => {
    try {
      console.log('Home - handleTabChange - INÍCIO');
      console.log('Home - handleTabChange - Estado detalhado:', {
        tab,
        userUid: user?.uid,
        userEmail: user?.email,
        isAuthenticated: !!user,
        authLoading
      });

      // Verifica autenticação antes de qualquer ação
      if (!user?.uid) {
        console.error('Home - handleTabChange - ERRO: Usuário não está autenticado');
        Alert.alert(
          'Erro',
          'Você foi desconectado. Por favor, faça login novamente.'
        );
        navigation.replace('Login');
        return;
      }

      if (tab === 'new') {
        console.log('Home - handleTabChange - Navegando para SelectDebtTarget');
        navigation.navigate('SelectDebtTarget');
        return;
      }
      
      console.log('Home - handleTabChange - Alterando tab para:', tab);
      setActiveTab(tab);
    } catch (error) {
      console.error('Home - handleTabChange - ERRO:', error);
      Alert.alert(
        'Erro',
        'Ocorreu um erro ao mudar de tela. Por favor, tente novamente.'
      );
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('Home - handleSignOut - Iniciando processo de logout');
      Alert.alert(
        'Sair',
        'Tem certeza que deseja sair?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => console.log('Home - handleSignOut - Logout cancelado'),
          },
          {
            text: 'Sair',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('Home - handleSignOut - Confirmado, iniciando logout');
                await signOut();
                console.log('Home - handleSignOut - Logout realizado com sucesso');
                
                console.log('Home - handleSignOut - Redirecionando para Login');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              } catch (error) {
                console.error('Home - handleSignOut - Erro ao fazer logout:', error);
                Alert.alert(
                  'Erro',
                  'Não foi possível fazer logout. Tente novamente.'
                );
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Home - handleSignOut - Erro ao mostrar diálogo de logout:', error);
    }
  };

  const renderDebtsSummary = () => {
    console.log('Home - renderDebtsSummary - Estado:', {
      loading,
      error,
      isRefreshing,
      totalToReceive: userTotals?.totalToReceive,
      totalToPay: userTotals?.totalToPay
    });

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={[textStyles.body, { color: colors.error }]}>{error}</Text>
        </View>
      );
    }

    const balance = userTotals.totalToReceive - userTotals.totalToPay;
    const isPositive = balance >= 0;

    return (
      <View style={styles.summaryContainer}>
        <View style={[styles.balanceCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.balanceHeader}>
            <View style={styles.balanceTitleContainer}>
              <Text style={[textStyles.caption, { color: colors.text, textTransform: 'uppercase' }]}>
                Balanço Geral
              </Text>
              <Ionicons 
                name={isPositive ? "trending-up" : "trending-down"} 
                size={16} 
                color={isPositive ? colors.success : colors.error} 
                style={styles.balanceIcon}
              />
            </View>
          </View>

          {(loading || isRefreshing) ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.cardLoader} />
          ) : (
            <View style={styles.balanceContent}>
              <AnimatedValue 
                value={Math.abs(balance)}
                style={[
                  textStyles.h3, 
                  { 
                    color: isPositive ? colors.success : colors.error,
                    alignSelf: 'flex-start',
                    marginTop: SPACING.xs,
                    fontWeight: '400'
                  }
                ]}
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />
      <View style={[styles.header, { 
        borderBottomColor: colors.border + '20',
        backgroundColor: colors.cardBackground 
      }]}>
        <Logo size={moderateScale(48)} />
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={moderateScale(24)} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {renderDebtsSummary()}
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <MainTabs 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          debtsAsCreditor={debtsAsCreditor}
          debtsAsDebtor={debtsAsDebtor}
          loading={loading}
          error={error}
          userTotals={userTotals}
        />
      </View>

      <BottomToolbar activeTab={activeTab} onTabChange={handleTabChange} />
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
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  logoutButton: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
  },
  summaryContainer: {
    paddingHorizontal: SPACING.lg,
  },
  balanceCard: {
    padding: SPACING.md,
    borderRadius: moderateScale(12),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceIcon: {
    marginLeft: SPACING.xs,
  },
  balanceContent: {
    alignItems: 'flex-start',
    width: '100%',
  },
  balanceDetailItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  cardLoader: {
    height: 30,
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
  },
  errorContainer: {
    padding: SPACING.lg,
    alignItems: 'flex-start',
  },
  separator: {
    height: 2,
    marginHorizontal: SPACING.lg,
    opacity: 1,
  },
}); 