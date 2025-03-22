import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, moderateScale } from '../utils/dimensions';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useDebts } from '../hooks/useDebts';
import { createDebt } from '../services/debtService';

export function NewDebt({ route, navigation }) {
  const { colors, textStyles } = useTheme();
  const { refreshDebts } = useDebts();
  const { selectedTarget } = route.params || {};
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [debtor, setDebtor] = useState('other');

  const handleSubmit = async () => {
    if (!amount || !description) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const currentUserId = auth.currentUser.id;
      
      // If "Eu vou pagar" is selected (debtor === 'me'), then:
      // - I am the creditor (I will receive the money later)
      // - The friend is the debtor (they will pay me)
      const result = await createDebt(
        debtor === 'me' ? auth.currentUser.uid : selectedTarget.id, // creditorId (who will receive)
        debtor === 'me' ? selectedTarget.id : auth.currentUser.uid, // debtorId (who will pay)
        parseFloat(amount),
        description
      );

      if (result.success) {
        await refreshDebts();
        navigation.goBack();
      } else {
        alert('Erro ao criar dívida: ' + result.error);
      }
    } catch (error) {
      alert('Erro ao criar dívida: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={() => navigation.goBack()}
      keyboardShouldPersistTaps="handled"
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[textStyles.h3, { color: colors.text }]}>
              Nova Dívida
            </Text>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}>
              <Text style={[textStyles.body, { color: colors.text2 }]}>Valor</Text>
              <TextInput
                style={[styles.input, { 
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="R$ 0,00"
                placeholderTextColor={colors.text2}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}>
              <Text style={[textStyles.body, { color: colors.text2 }]}>Descrição</Text>
              <TextInput
                style={[styles.input, { 
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Digite uma descrição"
                placeholderTextColor={colors.text2}
              />
            </View>

            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}>
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

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                loading && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={[textStyles.body, { color: colors.white }]}>
                {loading ? 'Criando...' : 'Criar Dívida'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    marginTop: moderateScale(100),
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        shadowColor: '#000',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  inputContainer: {
    padding: SPACING.md,
    borderRadius: moderateScale(10),
    marginBottom: SPACING.md,
  },
  input: {
    height: moderateScale(48),
    borderWidth: 1,
    borderRadius: moderateScale(8),
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.xs,
    fontSize: moderateScale(16),
  },
  submitButton: {
    padding: SPACING.md,
    borderRadius: moderateScale(10),
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  debtorOption: {
    padding: SPACING.md,
    borderWidth: 2,
    borderRadius: moderateScale(10),
    marginBottom: SPACING.md,
  },
  debtorOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debtorSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
}); 