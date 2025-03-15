import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, moderateScale } from '../utils/dimensions';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function NewCharge({ route }) {
  const { colors, textStyles } = useTheme();
  const navigation = useNavigation();
  const { selectedTarget } = route.params || {};
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [debtor, setDebtor] = useState('me'); // 'me' or 'other'
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  const handleSubmit = async () => {
    if (!amount.trim() || !description.trim()) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    const numericAmount = parseFloat(amount.replace(/[^0-9,-]/g, '').replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Erro', 'Por favor, insira um valor válido');
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      const numericAmount = parseFloat(amount.replace(/[^0-9,-]/g, '').replace(',', '.'));

      await addDoc(collection(db, 'debts'), {
        amount: numericAmount,
        description: description.trim(),
        creditorId: debtor === 'me' ? selectedTarget.id : currentUser.uid,
        debtorId: debtor === 'me' ? currentUser.uid : selectedTarget.id,
        paid: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setShowSuccess(true);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      setTimeout(() => {
        navigation.navigate('Home');
      }, 2000);
    } catch (error) {
      console.error('Erro ao criar cobrança:', error);
      Alert.alert('Erro', 'Não foi possível criar a cobrança');
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View 
          style={[
            styles.successContainer,
            {
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          <View style={[styles.successIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={40} color={colors.white} />
          </View>
          <Text style={[textStyles.h2, { color: colors.text, marginTop: SPACING.lg }]}>
            Cobrança criada!
          </Text>
          <Text style={[textStyles.bodyLarge, { color: colors.text2, textAlign: 'center', marginTop: SPACING.sm }]}>
            A cobrança foi registrada com sucesso
          </Text>
        </Animated.View>
      </View>
    );
  }

  if (showConfirmation) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            onPress={() => setShowConfirmation(false)}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[textStyles.h2, { color: colors.text }]}>Confirmar Cobrança</Text>
        </View>

        <View style={styles.confirmationContent}>
          <View style={[styles.confirmationCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.confirmationHeader}>
              <Image
                source={{ uri: selectedTarget?.photoURL || 'https://via.placeholder.com/50' }}
                style={styles.confirmationAvatar}
              />
              <View style={styles.confirmationInfo}>
                <Text style={[textStyles.h2, { color: colors.text }]}>
                  {selectedTarget?.username}
                </Text>
                <Text style={[textStyles.h4, { color: colors.text2 }]}>
                  {selectedTarget?.email}
                </Text>
              </View>
            </View>

            <View style={[styles.confirmationDivider, { backgroundColor: colors.border }]} />

            <View style={styles.confirmationDetails}>
              <View style={styles.confirmationRow}>
                <Text style={[textStyles.bodyLarge, { color: colors.text2 }]}>Quem vai pagar:</Text>
                <Text style={[textStyles.bodyLarge, { color: colors.text }]}>
                  {debtor === 'me' ? 'Você' : selectedTarget?.username}
                </Text>
              </View>

              <View style={styles.confirmationRow}>
                <Text style={[textStyles.bodyLarge, { color: colors.text2 }]}>Valor:</Text>
                <Text style={[textStyles.h2, { color: colors.text }]}>
                  R$ {amount}
                </Text>
              </View>

              <View style={styles.confirmationRow}>
                <Text style={[textStyles.bodyLarge, { color: colors.text2 }]}>Descrição:</Text>
                <Text style={[textStyles.bodyLarge, { color: colors.text }]}>
                  {description}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: colors.primary }]}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[textStyles.button, { color: colors.white }]}>
                Confirmar Cobrança
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[textStyles.h2, { color: colors.text }]}>Nova Cobrança</Text>
      </View>

      <ScrollView 
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.targetContainer, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.targetInfo}>
            <Image
              source={{ uri: selectedTarget?.photoURL || 'https://via.placeholder.com/50' }}
              style={styles.avatar}
            />
            <View style={styles.targetTextContainer}>
              <Text style={[textStyles.h2, { color: colors.text, marginBottom: SPACING.xs }]}>
                {selectedTarget?.username || 'Usuário não selecionado'}
              </Text>
              <Text style={[textStyles.h4, { color: colors.text2 }]}>
                {selectedTarget?.email}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.formContainer, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.inputContainer}>
            <Text style={[textStyles.caption, { color: colors.text2, marginBottom: SPACING.xs }]}>
              Quem vai pagar?
            </Text>
            <View style={styles.debtorSelector}>
              <TouchableOpacity
                style={[
                  styles.debtorOption,
                  { 
                    backgroundColor: debtor === 'me' ? colors.primary : colors.card,
                    borderColor: debtor === 'me' ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => setDebtor('me')}
              >
                <View style={styles.debtorOptionContent}>
                  <Text style={[
                    textStyles.bodyLarge,
                    { color: debtor === 'me' ? colors.white : colors.text }
                  ]}>
                    Eu vou pagar
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.debtorOption,
                  { 
                    backgroundColor: debtor === 'other' ? colors.primary : colors.card,
                    borderColor: debtor === 'other' ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => setDebtor('other')}
              >
                <View style={styles.debtorOptionContent}>
                  <Text style={[
                    textStyles.bodyLarge,
                    { color: debtor === 'other' ? colors.white : colors.text }
                  ]}>
                    {selectedTarget?.username || 'Outro'} vai pagar
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[
            styles.inputContainer, 
            {
              position: 'sticky',
              top: 0,
              zIndex: 1,
              backgroundColor: colors.cardBackground,
              paddingTop: SPACING.sm,
              paddingBottom: SPACING.sm,
            }
          ]}>
            <Text style={[textStyles.caption, { color: colors.text2, marginBottom: SPACING.xs }]}>
              Valor
            </Text>
            <View style={[styles.amountInputContainer, { backgroundColor: colors.card }]}>
              <Text style={[textStyles.h2, { color: colors.text }]}>R$</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0,00"
                placeholderTextColor={colors.text2}
                keyboardType="numeric"
                autoFocus
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[textStyles.caption, { color: colors.text2, marginBottom: SPACING.xs }]}>
              Descrição
            </Text>
            <TextInput
              style={[styles.descriptionInput, { 
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Almoço, Uber, etc."
              placeholderTextColor={colors.text2}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={[textStyles.button, { color: colors.white }]}>
              Criar Cobrança
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  targetContainer: {
    padding: SPACING.md,
    borderRadius: moderateScale(12),
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  targetInfo: {
    alignItems: 'center',
  },
  avatar: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    marginBottom: SPACING.md,
  },
  targetTextContainer: {
    alignItems: 'center',
  },
  formContainer: {
    padding: SPACING.md,
    borderRadius: moderateScale(12),
    marginBottom: SPACING.xl,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: moderateScale(8),
  },
  amountInput: {
    flex: 1,
    fontSize: moderateScale(32),
    marginLeft: SPACING.sm,
    padding: 0,
  },
  descriptionInput: {
    height: moderateScale(80),
    borderWidth: 1,
    borderRadius: moderateScale(8),
    padding: SPACING.md,
    textAlignVertical: 'top',
    fontSize: moderateScale(16),
  },
  submitButton: {
    height: moderateScale(56),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  debtorSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    height: moderateScale(56),
  },
  debtorOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: moderateScale(12),
    justifyContent: 'center',
  },
  debtorOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  confirmationContent: {
    flex: 1,
    padding: SPACING.md,
  },
  confirmationCard: {
    padding: SPACING.lg,
    borderRadius: moderateScale(12),
    marginBottom: SPACING.xl,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  confirmationAvatar: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    marginRight: SPACING.md,
  },
  confirmationInfo: {
    flex: 1,
  },
  confirmationDivider: {
    height: 1,
    marginBottom: SPACING.lg,
  },
  confirmationDetails: {
    gap: SPACING.md,
  },
  confirmationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmButton: {
    height: moderateScale(56),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  successIcon: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 