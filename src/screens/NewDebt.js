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
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, moderateScale } from '../utils/dimensions';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useDebts } from '../hooks/useDebts';

export function NewDebt({ navigation }) {
  const { colors, textStyles } = useTheme();
  const { refreshDebts } = useDebts();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !description) {
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      await addDoc(collection(db, 'debts'), {
        amount: parseFloat(amount),
        description,
        creditorId: currentUser.uid,
        paid: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await refreshDebts();
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao criar dívida:', error);
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
}); 