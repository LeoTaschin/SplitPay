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
  Dimensions,
  Alert,
  Modal,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, moderateScale } from '../utils/dimensions';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDebts } from '../hooks/useDebts';
import { formatCurrency } from '../utils/formatters';
import ModernGradient from '../components/ModernGradient';
import { removeFriend } from '../services/userService';
import { DebtDetails } from './DebtDetails';

const { width, height } = Dimensions.get('window');

// Componente para animação do valor
const AnimatedBalance = ({ value, style, colors }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [displayValue, setDisplayValue] = useState(formatCurrency("0.00"));
  
  useEffect(() => {
    const absValue = Math.abs(value);
    
    // Configura a animação para o valor
    Animated.spring(animatedValue, {
      toValue: absValue,
      useNativeDriver: false,
      friction: 8,
      tension: 40
    }).start();
    
    // Adiciona o efeito de "pulse" quando o valor é atualizado
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
    
    // Atualiza o valor exibido durante a animação
    const listener = animatedValue.addListener(({ value: v }) => {
      setDisplayValue(formatCurrency(v.toFixed(2)));
    });
    
    // Limpa o listener quando o componente for desmontado
    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value]);
  
  return (
    <Animated.Text 
      style={[
        style, 
        { 
          color: value > 0 ? colors.success : value < 0 ? colors.error : colors.text,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      {displayValue}
    </Animated.Text>
  );
};

export function FriendProfile({ route }) {
  const { colors, textStyles } = useTheme();
  const navigation = useNavigation();
  const { friend } = route.params;
  const [friendData, setFriendData] = useState(null);
  const { debtsAsCreditor, debtsAsDebtor } = useDebts();
  const [isLoading, setIsLoading] = useState(true);
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  
  // Estados para os modais
  const [showRemoveFriendModal, setShowRemoveFriendModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [modalAnimation] = useState(new Animated.Value(0));
  const [checkAnimation] = useState(new Animated.Value(0));
  const [fadeAnimation] = useState(new Animated.Value(0));
  const [reminderTransition] = useState(new Animated.Value(0));
  
  // Animações para o gradiente
  const gradientAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const horizontalAnimation = useRef(new Animated.Value(0)).current;
  
  // Estado para controlar a visibilidade do histórico de transações
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const transactionListAnim = useRef(new Animated.Value(0)).current;
  
  // Estado para controlar a visibilidade do DebtDetails
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [showDebtDetails, setShowDebtDetails] = useState(false);
  
  // Referência para o ScrollView e seu indicador
  const scrollViewRef = useRef(null);
  const indicatorHeight = 40; // Altura do indicador de scroll
  
  // Animação para o efeito atrás da foto do perfil
  const profileEffectAnim = useRef(new Animated.Value(0)).current;
  const profileScaleAnim = useRef(new Animated.Value(1)).current;
  
  // Animações para o efeito shockwave
  const [rings, setRings] = useState([
    { id: 1, animation: new Animated.Value(0), opacity: new Animated.Value(0.3) },
    { id: 2, animation: new Animated.Value(0), opacity: new Animated.Value(0.3) },
    { id: 3, animation: new Animated.Value(0), opacity: new Animated.Value(0.3) }
  ]);
  
  useEffect(() => {
    const animateGradient = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(gradientAnimation, {
            toValue: 1,
            duration: 6000,
            useNativeDriver: true,
          }),
          Animated.timing(gradientAnimation, {
            toValue: 0,
            duration: 6000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scaleAnimation, {
            toValue: 1.05,
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnimation, {
            toValue: 1,
            duration: 8000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(horizontalAnimation, {
            toValue: 1,
            duration: 10000,
            useNativeDriver: true,
          }),
          Animated.timing(horizontalAnimation, {
            toValue: 0,
            duration: 10000,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => animateGradient());
    };

    animateGradient();
  }, []);
  
  const translateY = gradientAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });
  
  const translateX = horizontalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 10],
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (friend?.id) {
          const friendDoc = await getDoc(doc(db, 'users', friend.id));
          if (friendDoc.exists()) {
            setFriendData(friendDoc.data());
          }
        }
      } catch (error) {
        console.error('FriendProfile - fetchFriendData - Erro:', error);
      } finally {
        // Após os dados serem carregados, desativar o estado de carregamento
        // e iniciar a animação de fade-in
        setIsLoading(false);
        Animated.timing(fadeInAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
    };

    fetchData();
  }, [friend]);

  // Função para calcular o saldo
  const calculateBalance = () => {
    const debtsAsCreditorToFriend = debtsAsCreditor
      .filter(debt => debt.debtorId === friend.id)
      .reduce((sum, debt) => sum + (debt.paid ? 0 : debt.amount), 0);

    const debtsAsDebtorToFriend = debtsAsDebtor
      .filter(debt => debt.creditorId === friend.id)
      .reduce((sum, debt) => sum + (debt.paid ? 0 : debt.amount), 0);

    return debtsAsCreditorToFriend - debtsAsDebtorToFriend;
  };

  // Calcular o saldo mas NÃO usar durante o carregamento
  // Não definir a variável balance durante o carregamento
  let balance;
  let isPositive;
  let isNegative;
  
  if (!isLoading) {
    balance = calculateBalance();
    isPositive = balance > 0;
    isNegative = balance < 0;
  }

  // Função para animar a entrada do modal
  const animateModalIn = () => {
    // Reset animations
    fadeAnimation.setValue(0);
    
    Animated.parallel([
      Animated.spring(modalAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  // Função para animar a saída do modal
  const animateModalOut = (callback) => {
    Animated.parallel([
      Animated.timing(modalAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(callback);
  };

  // Função para animar o ícone de check
  const animateCheckIcon = () => {
    Animated.sequence([
      Animated.timing(checkAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(checkAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  // Função para abrir o modal de remover amigo
  const openRemoveFriendModal = () => {
    setShowRemoveFriendModal(true);
    animateModalIn();
  };

  // Função para abrir o modal de dívida
  const openDebtModal = () => {
    setShowDebtModal(true);
    animateModalIn();
  };

  // Função para abrir o modal de lembrete
  const openReminderModal = () => {
    setShowReminderModal(true);
    animateModalIn();
  };

  // Função para fechar todos os modais
  const closeAllModals = () => {
    animateModalOut(() => {
      setShowRemoveFriendModal(false);
      setShowDebtModal(false);
      setShowReminderModal(false);
    });
  };

  // Função para enviar lembrete
  const sendReminder = async () => {
    try {
      // Aqui você implementaria a lógica para enviar um lembrete
      // Por exemplo, enviar uma notificação ou mensagem para o amigo
      
      // Animar a transição para o modal de confirmação
      Animated.timing(reminderTransition, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Animar o ícone de check após a transição
      setTimeout(() => {
        animateCheckIcon();
      }, 300);
      
      // Fechar o modal após 2 segundos
      setTimeout(() => {
        animateModalOut(() => {
          setShowReminderModal(false);
          setShowConfirmationModal(false);
          reminderTransition.setValue(0);
        });
      }, 2000);
    } catch (error) {
      console.error('Erro ao enviar lembrete:', error);
      Alert.alert('Erro', 'Não foi possível enviar o lembrete');
    }
  };

  // Função para caducar dívida
  const cancelDebt = async () => {
    try {
      // Aqui você implementaria a lógica para caducar a dívida
      // Por exemplo, marcar todas as dívidas como pagas
      Alert.alert('Dívida caducada', `A dívida com ${friend.username} foi caducada`);
      closeAllModals();
    } catch (error) {
      console.error('Erro ao caducar dívida:', error);
      Alert.alert('Erro', 'Não foi possível caducar a dívida');
    }
  };

  // Função para remover amigo
  const removeFriend = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Remove friend from current user's friends list
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      const updatedFriends = userDoc.data().friends.filter(id => id !== friend.id);
      await updateDoc(userRef, { friends: updatedFriends });

      // Remove current user from friend's friends list
      const friendRef = doc(db, 'users', friend.id);
      const friendDoc = await getDoc(friendRef);
      const updatedFriendFriends = friendDoc.data().friends.filter(id => id !== currentUser.uid);
      await updateDoc(friendRef, { friends: updatedFriendFriends });

      // Fechar modal e voltar para a tela anterior
      closeAllModals();
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao remover amigo:', error);
      Alert.alert('Erro', 'Não foi possível remover o amigo');
    }
  };

  // Função para pagar dívida
  const navigateToPayDebt = () => {
    closeAllModals();
    navigation.navigate('NewDebt', { 
      friend: {
        id: friend.id,
        username: friend.username,
        photoURL: friend.photoURL,
        isVerified: friendData?.isVerified
      },
      prefillAmount: balance !== undefined ? Math.abs(balance).toString() : "0",
      prefillDescription: 'Pagamento de dívida',
      forceDebtor: 'me'
    });
  };

  // Função para verificar o saldo e abrir o modal apropriado
  const handleFriendAction = () => {
    if (balance === 0) {
      // Saldo zerado - Abrir modal para remover amigo
      openRemoveFriendModal();
    } else if (balance < 0) {
      // Dívidas pendentes - Abrir modal com opções para pagar ou caducar dívida
      openDebtModal();
    } else {
      // A receber - Abrir modal com opção de enviar lembrete
      openReminderModal();
    }
  };

  // Função para obter as transações com este amigo
  const getTransactionsWithFriend = () => {
    // Filtrar dívidas onde o amigo é o devedor
    const asCreditor = debtsAsCreditor
      .filter(debt => debt.debtorId === friend.id)
      .map(debt => ({
        ...debt,
        type: 'credit', // Amigo deve para você
        debtor: { 
          id: debt.debtorId, 
          username: friend.username,
          photoURL: friend.photoURL 
        },
        creditor: { 
          id: auth.currentUser.uid, 
          username: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
          photoURL: auth.currentUser.photoURL 
        }
      }));
    
    // Filtrar dívidas onde o amigo é o credor
    const asDebtor = debtsAsDebtor
      .filter(debt => debt.creditorId === friend.id)
      .map(debt => ({
        ...debt,
        type: 'debit', // Você deve para o amigo
        creditor: { 
          id: debt.creditorId, 
          username: friend.username,
          photoURL: friend.photoURL 
        },
        debtor: { 
          id: auth.currentUser.uid, 
          username: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
          photoURL: auth.currentUser.photoURL 
        }
      }));
    
    // Combinar e ordenar por data
    return [...asCreditor, ...asDebtor]
      .sort((a, b) => {
        const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
        const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
        return dateB - dateA;
      });
  };
  
  // Função para alternar a visibilidade do histórico de transações
  const toggleTransactionHistory = () => {
    const newValue = !showTransactionHistory;
    setShowTransactionHistory(newValue);
    
    Animated.timing(transactionListAnim, {
      toValue: newValue ? 1 : 0,
      duration: 300,
      useNativeDriver: false
    }).start();
  };
  
  // Obter transações com este amigo
  const transactions = getTransactionsWithFriend();

  // Função para abrir o modal de detalhes da dívida
  const openDebtDetails = (debt) => {
    setSelectedDebt(debt);
    setShowDebtDetails(true);
  };
  
  // Função para fechar o modal de detalhes da dívida
  const closeDebtDetails = () => {
    setShowDebtDetails(false);
    setSelectedDebt(null);
  };

  // Iniciar animação do efeito do perfil
  useEffect(() => {
    const animateProfileEffect = () => {
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(profileEffectAnim, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(profileEffectAnim, {
              toValue: 0,
              duration: 3000,
              useNativeDriver: true,
            })
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(profileScaleAnim, {
              toValue: 1.15,
              duration: 4000,
              useNativeDriver: true,
            }),
            Animated.timing(profileScaleAnim, {
              toValue: 1,
              duration: 4000,
              useNativeDriver: true,
            })
          ])
        )
      ]).start();
    };
    
    animateProfileEffect();
  }, []);
  
  // Rotação para o efeito do perfil
  const profileRotate = profileEffectAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  // Iniciar animação do efeito shockwave
  useEffect(() => {
    const startShockwaveAnimation = (index, delay = 0) => {
      const ring = rings[index];
      
      // Reset values
      ring.animation.setValue(0);
      ring.opacity.setValue(0.2);
      
      // Start animation sequence
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(ring.animation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease)
          }),
          Animated.timing(ring.opacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          })
        ])
      ]).start(() => {
        // Restart animation
        startShockwaveAnimation(index, index * 600);
      });
    };
    
    // Start animations with delays
    rings.forEach((_, index) => {
      startShockwaveAnimation(index, index * 600);
    });
  }, []);

  const menuItems = [
    {
      icon: 'trash-outline',
      title: 'Remover Amigo',
      onPress: () => {
        handleFriendAction();
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
      {/* Camada de fundo sólida para evitar transparência durante transições */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      
      {/* Camada do gradiente com cor baseada no status do saldo - apenas no topo */}
      <ModernGradient 
        fullScreen={false}
        topOnly={true}
        baseColor={
          balance < 0 ? colors.error :  // Vermelho quando o usuário deve
          balance > 0 ? colors.success : // Verde quando o amigo deve
          colors.text2                   // Cinza quando neutro
        }
      />
      
      <StatusBar barStyle={colors.statusBar} />
      
      {/* Botão de voltar fixo no topo, fora do ScrollView */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.backButton, { backgroundColor: colors.surface }]}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.profileSection}>
                {/* Container unificado para foto e efeito */}
                <View style={styles.profileImageContainer}>
                  {/* Efeito Shockwave - mostrado apenas quando os dados estiverem carregados */}
                  {!isLoading && (
                    <>
                      {rings.map((ring) => (
                        <Animated.View 
                          key={ring.id}
                          style={[
                            styles.shockwaveRing,
                            {
                              borderColor: balance < 0 ? colors.error : 
                                          balance > 0 ? colors.success : 
                                          colors.text2,
                              opacity: ring.opacity,
                              transform: [
                                { 
                                  scale: ring.animation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.8, 2.2]
                                  }) 
                                }
                              ]
                            }
                          ]}
                        />
                      ))}
                    </>
                  )}
                  
                  <Image
                    source={{ uri: friend.photoURL || 'https://via.placeholder.com/150' }}
                    style={styles.profileImage}
                  />
                </View>
                
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
                  <Text style={[textStyles.body, { color: colors.text2, marginTop: SPACING.xs }]}>
                    {friend.email}
                  </Text>
                  {friendData?.createdAt && (
                    <Text style={[textStyles.caption, { color: colors.text2, marginTop: SPACING.xs }]}>
                      Membro desde {format(friendData.createdAt.toDate(), "MMMM yyyy", { locale: ptBR })}
                    </Text>
                  )}
                </View>
              </View>

              {/* Balance Card - com animação de fade-in */}
              <Animated.View 
                style={[
                  styles.balanceCard, 
                  { 
                    backgroundColor: colors.surface,
                    opacity: fadeInAnim
                  }
                ]}
              >
                {!isLoading && (
                  <>
                    <Text style={[textStyles.bodySmall, { color: colors.text2 }]}>
                      {Math.abs(balance) === 0 ? 'Sem dívidas pendentes' : 
                        balance > 0 ? `${friend.username} te deve` : `Você deve para ${friend.username}`}
                    </Text>
                    <AnimatedBalance 
                      value={balance} 
                      style={textStyles.h1} 
                      colors={colors} 
                    />
                  </>
                )}
              </Animated.View>
            </View>

            <View style={[styles.actionsContainer, { backgroundColor: colors.surface }]}>
              <Text style={[textStyles.subtitle, { color: colors.text, marginBottom: SPACING.md }]}>
                Ações Rápidas
              </Text>
              
              {/* Botão de Remover Amigo - Sempre visível */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.background }
                ]}
                onPress={openRemoveFriendModal}
              >
                <View style={styles.actionContent}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="person-remove" size={24} color={colors.primary} />
                  </View>
                  <Text style={[textStyles.body, { color: colors.text, flex: 1 }]}>
                    Remover Amigo
                  </Text>
                  <Ionicons name="chevron-forward" size={24} color={colors.text2} />
                </View>
              </TouchableOpacity>
              
              {/* Botão de Gerenciar Dívida - Sempre visível */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.background }
                ]}
                onPress={balance < 0 ? openDebtModal : openReminderModal}
              >
                <View style={styles.actionContent}>
                  <View style={[styles.iconContainer, { backgroundColor: balance < 0 ? colors.error + '20' : colors.primary + '20' }]}>
                    <Ionicons 
                      name={balance < 0 ? "cash" : "notifications"} 
                      size={24} 
                      color={balance < 0 ? colors.error : colors.primary} 
                    />
                  </View>
                  <Text style={[textStyles.body, { color: colors.text, flex: 1 }]}>
                    {balance < 0 ? 'Pagar Dívida' : 'Enviar Lembrete'}
                  </Text>
                  <Ionicons name="chevron-forward" size={24} color={colors.text2} />
                </View>
              </TouchableOpacity>
              
              {/* Botão para mostrar histórico de transações */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.background }
                ]}
                onPress={toggleTransactionHistory}
              >
                <View style={styles.actionContent}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="time-outline" size={24} color={colors.primary} />
                  </View>
                  <Text style={[textStyles.body, { color: colors.text, flex: 1 }]}>
                    Histórico de Transações
                  </Text>
                  <Ionicons 
                    name={showTransactionHistory ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={colors.text2} 
                  />
                </View>
              </TouchableOpacity>
              
              {/* Lista de transações recentes */}
              <Animated.View 
                style={{
                  height: transactionListAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.min(transactions.length * 80, 300)]
                  }),
                  opacity: transactionListAnim,
                  overflow: 'hidden',
                  marginTop: SPACING.sm
                }}
              >
                {transactions.length > 0 ? (
                  <View style={styles.transactionListContainer}>
                    <ScrollView 
                      style={styles.transactionScrollView}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={false}
                      onScroll={(event) => {
                        const scrollY = event.nativeEvent.contentOffset.y;
                        const contentHeight = event.nativeEvent.contentSize.height;
                        const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
                        
                        // Calcular a posição relativa do indicador
                        if (scrollViewRef.current) {
                          const scrollPosition = scrollY / (contentHeight - scrollViewHeight);
                          const maxScrollIndicatorPosition = scrollViewHeight - indicatorHeight;
                          const indicatorPosition = scrollPosition * maxScrollIndicatorPosition;
                          scrollViewRef.current.indicatorPosition.setValue(indicatorPosition);
                        }
                      }}
                      scrollEventThrottle={16}
                      ref={(ref) => {
                        if (ref && !scrollViewRef.current) {
                          scrollViewRef.current = {
                            ref,
                            indicatorPosition: new Animated.Value(0)
                          };
                        }
                      }}
                    >
                      {transactions.map((transaction, index) => (
                        <TouchableOpacity 
                          key={transaction.id || index}
                          style={[
                            styles.transactionItem, 
                            { 
                              backgroundColor: colors.background,
                              borderBottomColor: colors.border,
                              borderBottomWidth: index < transactions.length - 1 ? 1 : 0
                            }
                          ]}
                          onPress={() => openDebtDetails(transaction)}
                        >
                          <View style={styles.transactionIcon}>
                            <Ionicons 
                              name={transaction.type === 'credit' ? "arrow-up" : "arrow-down"} 
                              size={20} 
                              color={transaction.type === 'credit' ? colors.success : colors.error} 
                            />
                          </View>
                          <View style={styles.transactionInfo}>
                            <Text style={[textStyles.body, { color: colors.text }]}>
                              {transaction.description || 'Sem descrição'}
                            </Text>
                            <Text style={[textStyles.caption, { color: colors.text2 }]}>
                              {transaction.createdAt ? 
                                (transaction.createdAt.toDate ? 
                                  format(transaction.createdAt.toDate(), "dd/MM/yyyy") : 
                                  format(new Date(transaction.createdAt), "dd/MM/yyyy")
                                ) : 
                                'Data desconhecida'}
                            </Text>
                          </View>
                          <Text 
                            style={[
                              textStyles.body, 
                              { 
                                color: transaction.type === 'credit' ? 
                                  colors.success : colors.error 
                            }
                          ]}
                        >
                          {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount.toString())}
                        </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    
                    {/* Indicador de scroll personalizado */}
                    {scrollViewRef.current && (
                      <View style={[styles.scrollIndicatorContainer, { backgroundColor: colors.border + '30' }]}>
                        <Animated.View 
                          style={[
                            styles.scrollIndicator, 
                            { 
                              backgroundColor: colors.text2 + '33',
                              transform: [{ translateY: scrollViewRef.current.indicatorPosition }] 
                            }
                          ]}
                        />
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={[styles.emptyTransactions, { backgroundColor: colors.background }]}>
                    <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center' }]}>
                      Não há transações para mostrar
                    </Text>
                  </View>
                )}
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Modal para remover amigo (sempre disponível) */}
      <Modal
        visible={showRemoveFriendModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeAllModals}
      >
        <TouchableWithoutFeedback onPress={closeAllModals}>
          <View style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.customModalContainer,
                { 
                  backgroundColor: colors.background,
                  opacity: fadeAnimation,
                  transform: [
                    { scale: modalAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1]
                      })
                    }
                  ]
                }
              ]}
            >
              <TouchableWithoutFeedback>
                <View style={styles.customModalContent}>
                  <View style={styles.modalIconContainer}>
                    <View style={[styles.modalIconCircle, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="person-remove" size={32} color={colors.primary} />
                    </View>
                  </View>
                  
                  <Text style={[textStyles.h3, { color: colors.text, textAlign: 'center', marginTop: SPACING.md }]}>
                    Remover Amigo
                  </Text>
                  
                  {balance === 0 ? (
                    <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center', marginTop: SPACING.sm }]}>
                      Você tem certeza que deseja remover {friend.username} da sua lista de amigos?
                    </Text>
                  ) : (
                    <>
                      <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center', marginTop: SPACING.sm }]}>
                        Não é possível remover um amigo com dívidas pendentes.
                      </Text>
                      <Text style={[textStyles.caption, { color: colors.error, textAlign: 'center', marginTop: SPACING.sm }]}>
                        {balance > 0 
                          ? `${friend.username} deve ${formatCurrency(balance !== undefined ? balance.toString() : "0")} para você.` 
                          : `Você deve ${formatCurrency(balance !== undefined ? Math.abs(balance).toString() : "0")} para ${friend.username}.`}
                      </Text>
                    </>
                  )}
                  
                  <View style={styles.modalButtonsContainer}>
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={closeAllModals}
                    >
                      <Text style={[textStyles.button, { color: colors.text }]}>Cancelar</Text>
                    </TouchableOpacity>
                    
                    {balance === 0 && (
                      <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: colors.error + 'CC', borderWidth: 0 }]}
                        onPress={removeFriend}
                      >
                        <Text style={[textStyles.button, { color: colors.white, fontWeight: '600' }]}>Remover</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal para pagar dívida (quando o usuário deve) */}
      <Modal
        visible={showDebtModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeAllModals}
      >
        <TouchableWithoutFeedback onPress={closeAllModals}>
          <View style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.customModalContainer,
                { 
                  backgroundColor: colors.background,
                  opacity: fadeAnimation,
                  transform: [
                    { scale: modalAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1]
                      })
                    }
                  ]
                }
              ]}
            >
              <TouchableWithoutFeedback>
                <View style={styles.customModalContent}>
                  <View style={styles.modalIconContainer}>
                    <View style={[styles.modalIconCircle, { backgroundColor: colors.error + '20' }]}>
                      <Ionicons name="cash" size={32} color={colors.error} />
                    </View>
                  </View>
                  
                  <Text style={[textStyles.h3, { color: colors.text, textAlign: 'center', marginTop: SPACING.md }]}>
                    Pagar Dívida
                  </Text>
                  
                  <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center', marginTop: SPACING.sm }]}>
                    Você deve {formatCurrency(balance !== undefined ? Math.abs(balance).toString() : "0")} para {friend.username}.
                  </Text>
                  
                  <View style={styles.modalButtonsContainer}>
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: colors.error + 'CC', borderWidth: 0 }]}
                      onPress={navigateToPayDebt}
                    >
                      <Text style={[textStyles.button, { color: colors.white, fontWeight: '600' }]}>Pagar Dívida</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={closeAllModals}
                    >
                      <Text style={[textStyles.button, { color: colors.text }]}>Fechar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal para enviar lembrete (quando o amigo deve) */}
      <Modal
        visible={showReminderModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeAllModals}
      >
        <TouchableWithoutFeedback onPress={closeAllModals}>
          <View style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.customModalContainer,
                { 
                  backgroundColor: colors.background,
                  transform: [
                    { scale: modalAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1]
                      })
                    }
                  ]
                }
              ]}
            >
              <TouchableWithoutFeedback>
                <View style={styles.customModalContent}>
                  {/* Conteúdo do modal de enviar lembrete */}
                  <Animated.View 
                    style={[
                      { opacity: reminderTransition.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0]
                        })
                      }
                    ]}
                  >
                    <View style={styles.modalIconContainer}>
                      <View style={[styles.modalIconCircle, { backgroundColor: colors.success + '20' }]}>
                        <Ionicons name="notifications" size={32} color={colors.success} />
                      </View>
                    </View>
                    
                    <Text style={[textStyles.body, { color: colors.text, textAlign: 'center', marginTop: SPACING.md, fontSize: 18 }]}>
                      Enviar Lembrete
                    </Text>
                    
                    <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center', marginTop: SPACING.sm, fontWeight: 'normal' }]}>
                      {friend.username} deve {formatCurrency(balance !== undefined ? balance.toString() : "0")} para você.
                    </Text>
                    
                    <View style={styles.modalButtonsContainer}>
                      <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: colors.success, borderWidth: 0 }]}
                        onPress={sendReminder}
                      >
                        <Text style={[textStyles.button, { color: colors.white }]}>Enviar</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={closeAllModals}
                      >
                        <Text style={[textStyles.button, { color: colors.text }]}>Fechar</Text>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                  
                  {/* Conteúdo do modal de confirmação (inicialmente invisível) */}
                  <Animated.View 
                    style={[
                      { 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        opacity: reminderTransition,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }
                    ]}
                  >
                    <View style={styles.modalIconContainer}>
                      <Animated.View 
                        style={[
                          styles.modalIconCircle, 
                          { 
                            backgroundColor: colors.success + '20',
                            transform: [
                              { 
                                scale: checkAnimation.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [1, 1.2]
                                })
                              }
                            ]
                          }
                        ]}
                      >
                        <Ionicons name="checkmark" size={40} color={colors.success} />
                      </Animated.View>
                    </View>
                    
                    <Text style={[textStyles.body, { color: colors.text, textAlign: 'center', marginTop: SPACING.md, fontSize: 18 }]}>
                      Lembrete Enviado
                    </Text>
                    
                    <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center', marginTop: SPACING.sm, fontWeight: 'normal' }]}>
                      Um lembrete foi enviado para {friend.username}
                    </Text>
                  </Animated.View>
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal de Detalhes da Dívida */}
      <DebtDetails 
        visible={showDebtDetails}
        onClose={closeDebtDetails}
        debt={selectedDebt}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: moderateScale(60),
  },
  header: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: SPACING.lg,
  },
  profileImageContainer: {
    position: 'relative',
    width: moderateScale(120),
    height: moderateScale(120),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  shockwaveRing: {
    position: 'absolute',
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  profileImage: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    borderWidth: 0,
  },
  nameSection: {
    alignItems: 'center',
    width: '100%',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedIcon: {
    marginLeft: SPACING.xs,
  },
  balanceCard: {
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    borderRadius: moderateScale(16),
    alignItems: 'center',
    width: '100%',
    marginHorizontal: 0,
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
    top: Platform.OS === 'ios' ? SPACING.xxl + SPACING.lg : SPACING.xl,
    left: SPACING.lg,
    padding: SPACING.sm,
    borderRadius: moderateScale(12),
    zIndex: 10,
    elevation: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  customModalContainer: {
    width: '80%',
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  customModalContent: {
    padding: SPACING.lg,
  },
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalIconCircle: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollView: {
    flex: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: moderateScale(12),
    marginVertical: SPACING.xs,
    marginHorizontal: SPACING.xs,
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
        elevation: 2,
      },
    }),
  },
  transactionIcon: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  transactionInfo: {
    flex: 1,
  },
  emptyTransactions: {
    padding: SPACING.lg,
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.sm,
    marginTop: SPACING.md,
  },
  transactionScrollView: {
    flex: 1,
    maxHeight: 300,
  },
  transactionListContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollIndicatorContainer: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: 2,
  },
  scrollIndicator: {
    position: 'absolute',
    width: '100%',
    height: 40,
    borderRadius: 2,
  },
  gradient: {
    flex: 1,
  },
}); 