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
  ActivityIndicator,
  Alert,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, moderateScale } from '../utils/dimensions';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db, auth } from '../config/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, runTransaction, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { formatCurrency } from '../utils/formatters';
import ModernGradient from '../components/ModernGradient';

export function NewGroupDebt() {
  const { colors, textStyles } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { selectedGroup } = route.params;

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [useAllMembers, setUseAllMembers] = useState(true);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadGroupMembers();
    fetchCurrentUser();
  }, []);

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

  const loadGroupMembers = async () => {
    try {
      const membersData = [];
      const currentUserId = auth.currentUser.uid;
      
      for (const memberId of selectedGroup.members) {
        const memberDoc = await getDoc(doc(db, 'users', memberId));
        if (memberDoc.exists()) {
          membersData.push({
            id: memberDoc.id,
            ...memberDoc.data()
          });
        }
      }
      
      setGroupMembers(membersData);
      // Initialize with all members except current user
      setSelectedMembers(membersData
        .filter(member => member.id !== currentUserId)
        .map(member => member.id)
      );
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
      Alert.alert('Erro', 'Não foi possível carregar os membros do grupo');
    }
  };

  const toggleMemberSelection = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleCreateDebt = async () => {
    if (!description.trim()) {
      Alert.alert('Erro', 'Por favor, insira uma descrição');
      return;
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      Alert.alert('Erro', 'Por favor, insira um valor válido');
      return;
    }

    if (selectedMembers.length === 0) {
      Alert.alert('Erro', 'Selecione pelo menos um membro');
      return;
    }

    setLoading(true);

    try {
      const totalAmount = parseFloat(amount);
      const currentUserId = auth.currentUser.uid;
      const totalMembers = selectedMembers.length + 1; // Include current user
      const amountPerPerson = totalAmount / totalMembers;

      console.log('Criando dívida em grupo:', {
        totalAmount,
        amountPerPerson,
        totalMembers,
        selectedMembers
      });

      // Create a group debt record
      const groupDebtRef = await addDoc(collection(db, 'groupDebts'), {
        description: description.trim(),
        totalAmount: totalAmount,
        amountPerPerson: amountPerPerson,
        groupId: selectedGroup.id,
        createdBy: currentUserId,
        createdAt: serverTimestamp(),
        status: 'pending',
        members: [...selectedMembers, currentUserId]
      });

      console.log('Grupo de dívida criado:', groupDebtRef.id);

      // Update current user's totalToReceive
      const currentUserRef = doc(db, 'users', currentUserId);
      const currentUserDoc = await getDoc(currentUserRef);
      
      if (currentUserDoc.exists()) {
        const currentTotalToReceive = currentUserDoc.data().totalToReceive || 0;
        await updateDoc(currentUserRef, {
          totalToReceive: currentTotalToReceive + (amountPerPerson * selectedMembers.length)
        });
        console.log(`Atualizado totalToReceive do usuário atual: ${currentTotalToReceive} -> ${currentTotalToReceive + (amountPerPerson * selectedMembers.length)}`);
      }

      // Criar dívidas individuais para cada membro selecionado
      for (const memberId of selectedMembers) {
        // Pular o usuário atual se ele estiver na lista
        if (memberId === currentUser.uid) continue;

        // Criar dívida individual
        const debtRef = await addDoc(collection(db, 'debts'), {
          description,
          amount: amountPerPerson,
          groupId: selectedGroup.id,
          groupDebtId: groupDebtRef.id,
          payerId: memberId,
          receiverId: currentUser.uid,
          paid: false,
          createdAt: serverTimestamp(),
          type: 'group',
          amountPerPerson,
          totalAmount: amount
        });

        // Atualizar totalToPay do membro
        const memberRef = doc(db, 'users', memberId);
        const memberDoc = await getDoc(memberRef);
        if (memberDoc.exists()) {
          const currentTotal = memberDoc.data().totalToPay || 0;
          await updateDoc(memberRef, {
            totalToPay: currentTotal + amountPerPerson
          });
        }

        // Atualizar ou criar registro na coleção friends
        const friendId = memberId < currentUser.uid 
          ? `${memberId}_${currentUser.uid}`
          : `${currentUser.uid}_${memberId}`;

        const friendRef = doc(db, 'friends', friendId);
        const friendDoc = await getDoc(friendRef);

        if (friendDoc.exists()) {
          const currentAmount = friendDoc.data().amount || 0;
          await updateDoc(friendRef, {
            amount: currentAmount + amountPerPerson,
            lastUpdated: serverTimestamp()
          });
        } else {
          await setDoc(friendRef, {
            user1Id: memberId < currentUser.uid ? memberId : currentUser.uid,
            user2Id: memberId < currentUser.uid ? currentUser.uid : memberId,
            amount: amountPerPerson,
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp()
          });
        }

        // Adicionar referência da dívida ao usuário
        const userDebtsRef = doc(db, 'userDebts', memberId);
        const userDebtsDoc = await getDoc(userDebtsRef);
        
        if (userDebtsDoc.exists()) {
          await updateDoc(userDebtsRef, {
            debts: arrayUnion(debtRef.id)
          });
        } else {
          await setDoc(userDebtsRef, {
            debts: [debtRef.id]
          });
        }
      }

      // Create a self-debt for the current user
      try {
        const selfDebtRef = await addDoc(collection(db, 'debts'), {
          description: description.trim(),
          amount: amountPerPerson,
          groupId: selectedGroup.id,
          groupDebtId: groupDebtRef.id,
          payerId: currentUserId,
          receiverId: currentUserId,
          createdAt: serverTimestamp(),
          status: 'pending',
          type: 'group',
          isSelfDebt: true
        });
        
        console.log('Dívida própria criada para o usuário atual:', selfDebtRef.id);
        
        // Não atualizar o totalToPay do usuário atual para a dívida própria
        // Isso evita que o valor seja adicionado ao totalToPay do usuário atual
        
        // Add a reference to this debt in the user's debts array
        const userDebtsRef = doc(db, 'userDebts', currentUserId);
        const userDebtsDoc = await getDoc(userDebtsRef);
        
        if (userDebtsDoc.exists()) {
          const debts = userDebtsDoc.data().debts || [];
          await updateDoc(userDebtsRef, {
            debts: [...debts, selfDebtRef.id]
          });
        } else {
          await setDoc(userDebtsRef, {
            debts: [selfDebtRef.id]
          });
        }
      } catch (selfDebtError) {
        console.error('Erro ao criar dívida própria:', selfDebtError);
      }

      console.log('Processo de criação de dívida concluído com sucesso');
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao criar dívida:', error);
      Alert.alert('Erro', 'Não foi possível criar a dívida: ' + error.message);
    } finally {
      setLoading(false);
    }
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

  const renderMemberModal = () => {
    const currentUserId = auth.currentUser.uid;
    const filteredMembers = groupMembers.filter(member => member.id !== currentUserId);

    return (
      <Modal
        visible={showMemberModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMemberModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[textStyles.h3, { color: colors.text }]}>Selecionar Membros</Text>
              <TouchableOpacity onPress={() => setShowMemberModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              {filteredMembers.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[styles.modalMemberItem, { 
                    backgroundColor: selectedMembers.includes(member.id) ? colors.primary + '20' : 'transparent'
                  }]}
                  onPress={() => toggleMemberSelection(member.id)}
                >
                  <View style={styles.modalMemberPhotoContainer}>
                    {member.photoURL ? (
                      <Image
                        source={{ uri: member.photoURL }}
                        style={styles.modalMemberPhoto}
                      />
                    ) : (
                      <View style={[styles.modalMemberPhotoPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[textStyles.h4, { color: colors.primary }]}>
                          {member.username ? member.username.charAt(0).toUpperCase() : '?'}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.modalMemberInfo}>
                    <Text style={[textStyles.body, { color: colors.text }]}>
                      {member.username || member.email.split('@')[0]}
                    </Text>
                    {member.id === selectedGroup.admin && (
                      <View style={[styles.adminBadge, { backgroundColor: colors.primary }]}>
                        <Ionicons name="star" size={10} color={colors.background} />
                      </View>
                    )}
                  </View>
                  
                  <View style={[styles.checkbox, { 
                    borderColor: colors.primary,
                    backgroundColor: selectedMembers.includes(member.id) ? colors.primary : 'transparent'
                  }]}>
                    {selectedMembers.includes(member.id) && (
                      <Ionicons name="checkmark" size={16} color={colors.background} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowMemberModal(false)}
              >
                <Text style={[textStyles.button, { color: colors.white }]}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderSelectedMembers = () => {
    const currentUserId = auth.currentUser.uid;
    const currentUserData = {
      id: currentUserId,
      username: currentUser?.username || 'Você',
      photoURL: currentUser?.photoURL,
      email: currentUser?.email
    };

    const allSelectedMembers = [currentUserData, ...groupMembers.filter(member => selectedMembers.includes(member.id))];

    return (
      <View style={styles.selectedMembersContainer}>
        <Text style={[textStyles.caption, { color: colors.text2, marginBottom: SPACING.xs }]}>
          Membros Selecionados ({allSelectedMembers.length})
        </Text>
        <View style={styles.selectedMembersList}>
          {allSelectedMembers.map(member => (
            <View key={member.id} style={[styles.selectedMemberItem, { backgroundColor: colors.surface }]}>
              {member.photoURL ? (
                <Image
                  source={{ uri: member.photoURL }}
                  style={styles.selectedMemberPhoto}
                />
              ) : (
                <View style={[styles.selectedMemberPhotoPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[textStyles.caption, { color: colors.primary }]}>
                    {member.username ? member.username.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              <Text style={[textStyles.body, { color: colors.text }]}>
                {member.username || member.email.split('@')[0]}
              </Text>
              {member.id !== currentUserId && (
                <TouchableOpacity onPress={() => toggleMemberSelection(member.id)}>
                  <Ionicons name="close-circle" size={20} color={colors.text2} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ModernGradient fullScreen />
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
                    <View style={[styles.groupAvatar, { 
                      backgroundColor: colors.primary + '20',
                      borderColor: colors.primary,
                      borderWidth: moderateScale(2),
                      width: moderateScale(80),
                      height: moderateScale(80),
                      borderRadius: moderateScale(40),
                      justifyContent: 'center',
                      alignItems: 'center'
                    }]}>
                      {selectedGroup.photoURL ? (
                        <Image
                          source={{ uri: selectedGroup.photoURL }}
                          style={styles.avatar}
                        />
                      ) : (
                        <Ionicons
                          name="people"
                          size={moderateScale(40)}
                          color={colors.primary}
                        />
                      )}
                    </View>
                    
                    <View style={styles.nameSection}>
                      <Text style={[textStyles.h2, { color: colors.text }]}>
                        {selectedGroup.name}
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
                      <Text style={[textStyles.caption, { color: colors.text2 }]}>Valor Total</Text>
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
                            styles.debtorButton,
                            { 
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
                            useAllMembers && {
                              backgroundColor: colors.primary + '15',
                              borderColor: colors.primary + '40',
                              elevation: 4,
                              shadowOpacity: 0.15,
                              shadowRadius: 6,
                            }
                          ]}
                          onPress={() => {
                            setUseAllMembers(true);
                            setSelectedMembers(groupMembers.map(member => member.id));
                          }}
                        >
                          <View style={[
                            styles.debtorIcon,
                            { 
                              marginBottom: SPACING.sm,
                              width: moderateScale(50),
                              height: moderateScale(50),
                              justifyContent: 'center',
                              alignItems: 'center',
                              borderRadius: 12,
                              backgroundColor: colors.background,
                            },
                            useAllMembers && {
                              backgroundColor: colors.primary + '20',
                            }
                          ]}>
                            <Ionicons 
                              name="people" 
                              size={moderateScale(28)} 
                              color={useAllMembers ? colors.primary : colors.text} 
                            />
                          </View>
                          <Text style={[
                            styles.debtorText,
                            { 
                              fontSize: moderateScale(16),
                              color: colors.text,
                              textAlign: 'center',
                            },
                            useAllMembers && {
                              fontWeight: 'bold',
                              color: colors.primary,
                            }
                          ]}>
                            Todos do Grupo
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.debtorButton,
                            { 
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
                            !useAllMembers && {
                              backgroundColor: colors.primary + '15',
                              borderColor: colors.primary + '40',
                              elevation: 4,
                              shadowOpacity: 0.15,
                              shadowRadius: 6,
                            }
                          ]}
                          onPress={() => {
                            setUseAllMembers(false);
                            setShowMemberModal(true);
                          }}
                        >
                          <View style={[
                            styles.debtorIcon,
                            { 
                              marginBottom: SPACING.sm,
                              width: moderateScale(50),
                              height: moderateScale(50),
                              justifyContent: 'center',
                              alignItems: 'center',
                              borderRadius: 12,
                              backgroundColor: colors.background,
                            },
                            !useAllMembers && {
                              backgroundColor: colors.primary + '20',
                            }
                          ]}>
                            <Ionicons 
                              name="person-add" 
                              size={moderateScale(28)} 
                              color={!useAllMembers ? colors.primary : colors.text} 
                            />
                          </View>
                          <Text style={[
                            styles.debtorText,
                            { 
                              fontSize: moderateScale(16),
                              color: colors.text,
                              textAlign: 'center',
                            },
                            !useAllMembers && {
                              fontWeight: 'bold',
                              color: colors.primary,
                            }
                          ]}>
                            Selecionar Membros
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {!useAllMembers && selectedMembers.length > 0 && renderSelectedMembers()}

                    {amount && selectedMembers.length > 0 && (
                      <View style={[styles.summaryContainer, { 
                        backgroundColor: colors.surface,
                        borderRadius: moderateScale(12),
                        padding: SPACING.md,
                        marginTop: SPACING.md,
                        alignItems: 'center'
                      }]}>
                        <Text style={[textStyles.body, { color: colors.text2 }]}>
                          Valor por pessoa:
                        </Text>
                        <Text style={[textStyles.h3, { color: colors.primary }]}>
                          {formatCurrency((parseFloat(amount) / (selectedMembers.length + 1)).toString())}
                        </Text>
                      </View>
                    )}
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
                    onPress={handleCreateDebt}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.background} />
                    ) : (
                      <Text style={[textStyles.button, { color: colors.white }]}>
                        Criar Dívida
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {renderMemberModal()}
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
  groupAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
  },
  nameSection: {
    marginLeft: SPACING.lg,
    flex: 1,
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
  debtorButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    height: moderateScale(100),
    width: '48%',
  },
  debtorIcon: {
    marginBottom: SPACING.sm,
    width: moderateScale(50),
    height: moderateScale(50),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  debtorText: {
    fontSize: moderateScale(16),
    textAlign: 'center',
  },
  selectedMembersContainer: {
    marginTop: SPACING.md,
  },
  selectedMembersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  selectedMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: moderateScale(16),
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  summaryContainer: {
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
    alignSelf: 'flex-end',
    borderRadius: moderateScale(12),
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: moderateScale(16),
    padding: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalScroll: {
    maxHeight: '80%',
  },
  modalMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: moderateScale(12),
    marginBottom: SPACING.xs,
  },
  modalMemberPhotoContainer: {
    width: moderateScale(50),
    height: moderateScale(50),
    marginRight: SPACING.md,
  },
  modalMemberPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(25),
  },
  modalMemberPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(25),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalMemberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedMemberPhoto: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
  },
  selectedMemberPhotoPlaceholder: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminBadge: {
    width: moderateScale(16),
    height: moderateScale(16),
    borderRadius: moderateScale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  modalButton: {
    padding: SPACING.md,
    borderRadius: moderateScale(12),
    width: '100%',
    alignItems: 'center',
  },
}); 