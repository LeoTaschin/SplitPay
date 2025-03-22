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
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, moderateScale } from '../utils/dimensions';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useDebts } from '../hooks/useDebts';
import { createDebt } from '../services/debtService';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export function NewDebt({ route, navigation }) {
  const { colors, textStyles } = useTheme();
  const { debtsAsCreditor, debtsAsDebtor, fetchDebts } = useDebts();
  const { selectedTarget, prefillAmount, prefillDescription, friend, forceDebtor } = route.params || {};
  const [amount, setAmount] = useState(prefillAmount || '');
  const [description, setDescription] = useState(prefillDescription || '');
  const [loading, setLoading] = useState(false);
  const [debtor, setDebtor] = useState(forceDebtor || 'other');

  const selectedFriend = friend || selectedTarget;

  const handleAmountChange = (text) => {
    // Remove any non-numeric characters
    const numericValue = text.replace(/[^0-9]/g, '');
    
    if (numericValue === '') {
      setAmount('');
      return;
    }

    // Convert to cents (move decimal point 2 places to the left)
    const cents = parseInt(numericValue, 10);
    const formatted = (cents / 100).toFixed(2);
    setAmount(formatted);
  };

  const calculateBalance = () => {
    const debtsAsCreditorToFriend = debtsAsCreditor
      .filter(debt => debt.debtorId === selectedFriend?.id)
      .reduce((sum, debt) => sum + (debt.paid ? 0 : debt.amount), 0);

    const debtsAsDebtorToFriend = debtsAsDebtor
      .filter(debt => debt.creditorId === selectedFriend?.id)
      .reduce((sum, debt) => sum + (debt.paid ? 0 : debt.amount), 0);

    return debtsAsCreditorToFriend - debtsAsDebtorToFriend;
  };

  const balance = calculateBalance();
  const isPositive = balance > 0;
  const isNegative = balance < 0;

  const handleSubmit = async () => {
    if (!amount || !description) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const currentUserId = auth.currentUser.id;
      
      const result = await createDebt(
        debtor === 'me' ? auth.currentUser.uid : selectedFriend.id,
        debtor === 'me' ? selectedFriend.id : auth.currentUser.uid,
        parseFloat(amount),
        description
      );

      if (result.success) {
        await fetchDebts();
        navigation.navigate('Home');
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
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
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
            <Ionicons name="close-sharp" size={24} color={colors.text} />
          </TouchableOpacity>

          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          >
            <View style={styles.header}>
              <View style={styles.profileSection}>
                <Image
                  source={{ uri: selectedFriend?.photoURL || 'https://via.placeholder.com/150' }}
                  style={[styles.profileImage, { borderColor: colors.primary }]}
                />
                
                <View style={styles.nameSection}>
                  <View style={styles.nameContainer}>
                    <Text style={[textStyles.h2, { color: colors.text }]}>
                      {selectedFriend?.username || 'Usuário'}
                    </Text>
                    {selectedFriend?.isVerified && (
                      <Ionicons 
                        name="checkmark-circle" 
                        size={24} 
                        color={colors.primary} 
                        style={styles.verifiedIcon}
                      />
                    )}
                  </View>
                  <Text style={[textStyles.body, { color: colors.text }]}>
                    {isPositive ? (
                      <>
                        {`${selectedFriend?.username || 'Usuário'} te deve `}
                        <Text style={{ fontWeight: 'bold' }}>
                          {`R$ ${balance.toFixed(2)}`}
                        </Text>
                      </>
                    ) : isNegative ? (
                      <>
                        Você deve{' '}
                        <Text style={{ fontWeight: 'bold' }}>
                          {`R$ ${Math.abs(balance).toFixed(2)}`}
                        </Text>
                        {` para ${selectedFriend?.username || 'Usuário'}`}
                      </>
                    ) : (
                      'Vocês estão quites'
                    )}
                  </Text>
                </View>
              </View>

              <View style={[styles.formContainer, { backgroundColor: colors.surface }]}>
                <View style={styles.inputSection}>
                  <Text style={[textStyles.subtitle, { color: colors.text, marginBottom: SPACING.md }]}>
                    Detalhes da Dívida
                  </Text>

                  <View style={styles.amountContainer}>
                    <Text style={[textStyles.caption, { color: colors.text2 }]}>Valor</Text>
                    <View style={[styles.amountInputWrapper, { backgroundColor: colors.background }]}>
                      <Text style={[textStyles.h2, { color: colors.text }]}>R$</Text>
                      <TextInput
                        style={[styles.amountInput, { color: colors.text }]}
                        value={amount}
                        onChangeText={handleAmountChange}
                        placeholder="0,00"
                        placeholderTextColor={colors.text2}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.descriptionContainer}>
                    <Text style={[textStyles.caption, { color: colors.text2 }]}>Descrição</Text>
                    <TextInput
                      style={[styles.descriptionInput, { 
                        backgroundColor: colors.background,
                        color: colors.text,
                      }]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Ex: Almoço, Uber, etc."
                      placeholderTextColor={colors.text2}
                      multiline
                    />
                  </View>

                  <View style={styles.debtorContainer}>
                    <Text style={[textStyles.caption, { color: colors.text2, marginBottom: SPACING.sm }]}>
                      Quem vai pagar?
                    </Text>
                    <View style={styles.debtorSelector}>
                      <TouchableOpacity
                        style={[
                          styles.debtorOption,
                          { 
                            backgroundColor: debtor === 'me' ? colors.primary : colors.background,
                            opacity: forceDebtor ? 0.5 : 1
                          }
                        ]}
                        onPress={() => !forceDebtor && setDebtor('me')}
                        disabled={Boolean(forceDebtor)}
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
                            backgroundColor: debtor === 'other' ? colors.primary : colors.background,
                            opacity: forceDebtor ? 0.5 : 1
                          }
                        ]}
                        onPress={() => !forceDebtor && setDebtor('other')}
                        disabled={Boolean(forceDebtor)}
                      >
                        <View style={styles.debtorOptionContent}>
                          <Text style={[
                            textStyles.bodyLarge,
                            { color: debtor === 'other' ? colors.white : colors.text }
                          ]}>
                            {selectedFriend?.username || 'Outro'} vai pagar
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
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
                  <Text style={[textStyles.button, { color: colors.white }]}>
                    {loading ? 'Criando...' : 'Criar Dívida'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
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
  formContainer: {
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    borderRadius: moderateScale(16),
  },
  inputSection: {
    gap: SPACING.lg,
  },
  amountContainer: {
    marginBottom: SPACING.md,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: moderateScale(12),
    marginTop: SPACING.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: moderateScale(32),
    marginLeft: SPACING.sm,
    padding: 0,
  },
  descriptionContainer: {
    marginBottom: SPACING.md,
  },
  descriptionInput: {
    borderRadius: moderateScale(12),
    padding: SPACING.md,
    marginTop: SPACING.xs,
    height: moderateScale(80),
    textAlignVertical: 'top',
  },
  debtorContainer: {
    marginBottom: SPACING.xl,
  },
  debtorSelector: {
    gap: SPACING.md,
  },
  debtorOption: {
    padding: SPACING.md,
    borderRadius: moderateScale(12),
  },
  debtorOptionContent: {
    alignItems: 'center',
  },
  submitButton: {
    padding: SPACING.md,
    borderRadius: moderateScale(12),
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  backButton: {
    position: 'absolute',
    top: SPACING.md * 1.5,
    left: SPACING.lg,
    padding: SPACING.sm,
    borderRadius: moderateScale(12),
    zIndex: 1,
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 