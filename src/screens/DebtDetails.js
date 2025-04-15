import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Modal,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, moderateScale } from '../utils/dimensions';
import { useNavigation } from '@react-navigation/native';
import { formatCurrency } from '../utils/formatters';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const { width, height } = Dimensions.get('window');
const CLOSE_THRESHOLD = height * 0.2; // 20% da altura da tela

export function DebtDetails({ visible, onClose, debt }) {
  const { colors, textStyles } = useTheme();
  const [slideAnim] = React.useState(new Animated.Value(height));
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [isClosing, setIsClosing] = React.useState(false);
  const [arrowSlideAnim] = React.useState(new Animated.Value(0));

  // Configuração do PanResponder para gestos de deslizar
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Só responde a gestos verticais
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        // Só permite deslizar para baixo
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > CLOSE_THRESHOLD) {
          // Se deslizou mais que o threshold, fecha o modal
          closeModal();
        } else {
          // Caso contrário, volta para a posição original
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 65,
            friction: 10,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const closeModal = () => {
    setIsClosing(true);
    
    // Anima o fundo escuro
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    // Anima o modal deslizando para baixo
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsClosing(false);
      onClose();
    });
  };

  React.useEffect(() => {
    if (visible) {
      // Anima o fundo escuro
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Anima o modal deslizando para cima
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }).start();

      // Efeito de deslize na seta
      Animated.loop(
        Animated.sequence([
          Animated.timing(arrowSlideAnim, {
            toValue: 10,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(arrowSlideAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible]);

  // Se não houver dívida, não renderize o modal
  if (!debt) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={closeModal}
    >
      <View style={styles.modalContainer}>
        <Animated.View 
          style={[
            styles.modalOverlay, 
            { 
              backgroundColor: 'rgba(0,0,0,0.5)',
              opacity: fadeAnim
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.modalOverlayTouchable} 
            activeOpacity={1} 
            onPress={closeModal}
          />
        </Animated.View>
        
        <Animated.View 
          {...panResponder.panHandlers}
          style={[
            styles.modalContent, 
            { 
              backgroundColor: colors.background,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <StatusBar barStyle={colors.statusBar} />
          <SafeAreaView style={styles.safeArea}>
            
            
            <TouchableOpacity
              onPress={closeModal}
              style={[styles.closeButton, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.content}>
              <View style={styles.header}>
                <View style={styles.debtSection}>
                  <View style={[styles.amountCard, { backgroundColor: colors.surface }]}>
                    <Text style={[textStyles.bodySmall, { color: colors.text2, marginBottom: SPACING.xs }]}>
                      Valor da Dívida
                    </Text>
                    <Text style={[textStyles.h1, { 
                      color: colors.text,
                      fontSize: moderateScale(36),
                      fontWeight: 'bold',
                      marginBottom: SPACING.sm
                    }]}>
                      {formatCurrency(Math.abs(debt.amount).toString())}
                    </Text>
                  </View>
                  
                  <View style={styles.participantsSection}>
                    <View style={styles.participant}>
                      <Image
                        source={{ uri: debt.creditor.photoURL || 'https://via.placeholder.com/150' }}
                        style={[styles.participantImage, { borderColor: colors.primary }]}
                      />
                      <Text style={[textStyles.body, { color: colors.text }]}>
                        {debt.creditor.username}
                      </Text>
                      <Text style={[textStyles.bodySmall, { color: colors.text2, marginTop: SPACING.xs }]}>
                        Credor
                      </Text>
                    </View>

                    <View style={styles.participantDivider}>
                      <Animated.View style={{ transform: [{ translateX: arrowSlideAnim }] }}>
                        <Ionicons name="arrow-forward" size={36} color={colors.primary} />
                      </Animated.View>
                    </View>

                    <View style={styles.participant}>
                      <Image
                        source={{ uri: debt.debtor.photoURL || 'https://via.placeholder.com/150' }}
                        style={[styles.participantImage, { borderColor: colors.error }]}
                      />
                      <Text style={[textStyles.body, { color: colors.text }]}>
                        {debt.debtor.username}
                      </Text>
                      <Text style={[textStyles.bodySmall, { color: colors.text2, marginTop: SPACING.xs }]}>
                        Devedor
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.detailsCard, { backgroundColor: colors.surface }]}>
                  <Text style={[textStyles.subtitle, { color: colors.text }]}>
                    Detalhes da Dívida
                  </Text>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={20} color={colors.text2} />
                    <Text style={[textStyles.body, { color: colors.text, marginLeft: SPACING.sm }]}>
                      Criada em {format(debt.createdAt.toDate(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} às {format(debt.createdAt.toDate(), "HH:mm", { locale: ptBR })}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="document-text-outline" size={20} color={colors.text2} />
                    <Text style={[textStyles.body, { color: colors.text, marginLeft: SPACING.sm }]}>
                      {debt.description || 'Sem descrição'}
                    </Text>
                  </View>

                  {debt.paid && (
                    <View style={styles.detailRow}>
                      <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                      <Text style={[textStyles.body, { color: colors.success, marginLeft: SPACING.sm }]}>
                        Pago em {format(debt.paidAt.toDate(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} às {format(debt.paidAt.toDate(), "HH:mm", { locale: ptBR })}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalOverlayTouchable: {
    flex: 1,
  },
  modalContent: {
    height: '90%',
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    overflow: 'hidden',
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
    paddingTop: moderateScale(60),
  },
  header: {
    padding: SPACING.lg,
  },
  debtSection: {
    alignItems: 'center',
  },
  amountCard: {
    width: '100%',
    padding: SPACING.lg,
    borderRadius: moderateScale(16),
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  participantsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.xl,
  },
  participant: {
    alignItems: 'center',
    flex: 1,
  },
  participantImage: {
    width: moderateScale(70),
    height: moderateScale(70),
    borderRadius: moderateScale(35),
    borderWidth: moderateScale(2),
    marginBottom: SPACING.sm,
  },
  participantDivider: {
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsCard: {
    padding: SPACING.lg,
    borderRadius: moderateScale(16),
    marginBottom: SPACING.xl,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    padding: SPACING.sm,
    borderRadius: moderateScale(12),
    zIndex: 1,
  },
}); 