import React, { useState, useEffect } from 'react';
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
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, moderateScale } from '../utils/dimensions';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../config/firebase';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { useDebts } from '../hooks/useDebts';
import { createDebt } from '../services/debtService';
import ModernGradient from '../components/ModernGradient';
import { CustomAlert } from '../components/CustomAlert';

const { width } = Dimensions.get('window');

export function NewDebt({ route, navigation }) {
  const { colors, textStyles } = useTheme();
  const { debtsAsCreditor, debtsAsDebtor, fetchDebts } = useDebts();
  const { selectedTarget, prefillAmount, prefillDescription, friend, forceDebtor } = route.params || {};
  const [amount, setAmount] = useState(prefillAmount || '');
  const [description, setDescription] = useState(prefillDescription || '');
  const [loading, setLoading] = useState(false);
  const [debtor, setDebtor] = useState(forceDebtor || 'other');
  const [isCreditor, setIsCreditor] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const selectedFriend = friend || selectedTarget;
  
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setCurrentUser(userDoc.data());
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    fetchCurrentUser();
  }, []);

  // Estilos que dependem de colors
  const dynamicStyles = {
    debtorButton: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: SPACING.sm,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 2,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      height: moderateScale(100),
      width: '48%',
    },
    debtorButtonSelected: {
      backgroundColor: colors.primary + '15',
      borderColor: colors.primary + '40',
      elevation: 4,
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    debtorIcon: {
      marginBottom: SPACING.sm,
      width: moderateScale(50),
      height: moderateScale(50),
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor: colors.background,
    },
    debtorIconSelected: {
      backgroundColor: colors.primary + '20',
    },
    debtorText: {
      fontSize: moderateScale(16),
      color: colors.text,
      textAlign: 'center',
    },
    debtorTextSelected: {
      fontWeight: 'bold',
      color: colors.primary,
    },
  };

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
      setAlertMessage('Por favor, adicione uma descrição para a despesa');
      setShowAlert(true);
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
        setAlertMessage('Erro ao criar dívida: ' + result.error);
        setShowAlert(true);
      }
    } catch (error) {
      setAlertMessage('Erro ao criar dívida: ' + error.message);
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ModernGradient fullScreen />
      <CustomAlert
        visible={showAlert}
        onClose={() => setShowAlert(false)}
        title="Atenção"
        message={alertMessage}
        icon="alert-circle"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, { paddingTop: Platform.OS === 'ios' ? moderateScale(20) : moderateScale(10) }]}>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
              <View style={{ flex: 1 }}>
                <View style={styles.header}>
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[styles.backButton, { 
                      backgroundColor: colors.surface, 
                      position: 'absolute',
                      top: moderateScale(20),
                      right: moderateScale(20),
                      zIndex: 10
                    }]}
                  >
                    <Ionicons name="close-sharp" size={24} color={colors.text} />
                  </TouchableOpacity>
                  
                  <View style={[styles.profileSection, { marginTop: moderateScale(20) }]}>
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
                </View>

                <View style={[styles.formContainer, { 
                  backgroundColor: colors.background, 
                  padding: SPACING.md, 
                  margin: SPACING.md
                }]}>
                  <View style={[styles.inputSection, { 
                    padding: SPACING.md,
                    borderRadius: moderateScale(12)
                  }]}>
                    <View style={styles.amountContainer}>
                      <Text style={[textStyles.caption, { color: colors.text2 }]}>Valor</Text>
                      <View style={[styles.amountInputWrapper, { 
                        backgroundColor: colors.surface,
                        borderRadius: moderateScale(12),
                        padding: SPACING.md,
                        flexDirection: 'row',
                        alignItems: 'center',
                        shadowColor: colors.text,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 2
                      }]}>
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
                          backgroundColor: colors.surface,
                          color: colors.text,
                          borderRadius: moderateScale(12),
                          padding: SPACING.md,
                          height: moderateScale(80),
                          textAlignVertical: 'top',
                          shadowColor: colors.text,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.05,
                          shadowRadius: 4,
                          elevation: 2
                        }]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Ex: Almoço, Uber, etc."
                        placeholderTextColor={colors.text2}
                        multiline
                      />
                    </View>

                    <View style={styles.debtorContainer}>
                      <Text style={[textStyles.caption, { color: colors.text2, marginBottom: SPACING.xs }]}>
                        Quem vai pagar?
                      </Text>
                      <View style={[styles.debtorSelector, { 
                        flexDirection: 'row', 
                        justifyContent: 'space-between',
                        gap: SPACING.xs,
                        paddingHorizontal: 0,
                        marginBottom: SPACING.sm
                      }]}>
                        <TouchableOpacity
                          style={[
                            dynamicStyles.debtorButton,
                            debtor === 'me' && dynamicStyles.debtorButtonSelected
                          ]}
                          onPress={() => !forceDebtor && setDebtor('me')}
                          disabled={Boolean(forceDebtor)}
                        >
                          <View style={[
                            dynamicStyles.debtorIcon,
                            debtor === 'me' && dynamicStyles.debtorIconSelected
                          ]}>
                            <Ionicons 
                              name="wallet-outline" 
                              size={moderateScale(28)} 
                              color={debtor === 'me' ? colors.primary : colors.text} 
                            />
                          </View>
                          <Text style={[
                            dynamicStyles.debtorText,
                            debtor === 'me' && dynamicStyles.debtorTextSelected
                          ]}>
                            {currentUser?.username || 'Você'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            dynamicStyles.debtorButton,
                            debtor === 'other' && dynamicStyles.debtorButtonSelected
                          ]}
                          onPress={() => !forceDebtor && setDebtor('other')}
                          disabled={Boolean(forceDebtor)}
                        >
                          <View style={[
                            dynamicStyles.debtorIcon,
                            debtor === 'other' && dynamicStyles.debtorIconSelected
                          ]}>
                            <Ionicons 
                              name="wallet-outline" 
                              size={moderateScale(28)} 
                              color={debtor === 'other' ? colors.primary : colors.text} 
                            />
                          </View>
                          <Text style={[
                            dynamicStyles.debtorText,
                            debtor === 'other' && dynamicStyles.debtorTextSelected
                          ]}>
                            {selectedFriend?.username || 'Outro'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.divider, { 
                    height: 1, 
                    backgroundColor: colors.border, 
                    marginVertical: SPACING.sm,
                    marginHorizontal: SPACING.md
                  }]} />

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      { 
                        backgroundColor: colors.primary,
                        paddingVertical: SPACING.md,
                        marginHorizontal: SPACING.md,
                        marginBottom: SPACING.sm
                      },
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
            </TouchableWithoutFeedback>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    padding: SPACING.lg,
  },
  profileSection: {
    marginTop: moderateScale(40),
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
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
    marginTop: SPACING.md,
    padding: SPACING.lg,
    borderRadius: moderateScale(16),
  },
  inputSection: {
    padding: SPACING.md,
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
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  debtorSelector: {
    gap: SPACING.md,
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
    alignSelf: 'flex-end',
    borderRadius: moderateScale(12),
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 