import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Animated,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, moderateScale } from '../utils/dimensions';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db, auth } from '../config/firebase';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';

export function GroupDetail() {
  const { colors, textStyles } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params;
  const currentUser = auth.currentUser;
  
  const [group, setGroup] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);
  const [leaveModalAnim] = useState(new Animated.Value(0));
  const [leaveModalFade] = useState(new Animated.Value(0));
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveAnim] = useState(new Animated.Value(0));
  const [isAdminModalVisible, setIsAdminModalVisible] = useState(false);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState(null);
  const [isRemoveMemberModalVisible, setIsRemoveMemberModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [removeMemberModalAnim] = useState(new Animated.Value(0));
  const [removeMemberModalFade] = useState(new Animated.Value(0));

  useEffect(() => {
    const unsubscribe = subscribeToGroup();
    return () => unsubscribe();
  }, [groupId]);

  useEffect(() => {
    if (group) {
      console.log('Group data:', {
        groupId: group.id,
        admin: group.admin,
        currentUser: currentUser?.uid,
        isAdmin: group.admin === currentUser?.uid,
        showLeaveButton: true,
        members: group.members?.length || 0
      });
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [group]);

  useEffect(() => {
    if (isLeaveModalVisible) {
      Animated.parallel([
        Animated.spring(leaveModalAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          mass: 1,
          stiffness: 150,
        }),
        Animated.timing(leaveModalFade, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(leaveModalAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(leaveModalFade, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLeaveModalVisible]);

  useEffect(() => {
    if (isRemoveMemberModalVisible) {
      Animated.parallel([
        Animated.spring(removeMemberModalAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          mass: 1,
          stiffness: 150,
        }),
        Animated.timing(removeMemberModalFade, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(removeMemberModalAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(removeMemberModalFade, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isRemoveMemberModalVisible]);

  const subscribeToGroup = () => {
    const groupDocRef = doc(db, 'groups', groupId);
    
    const unsubscribe = onSnapshot(groupDocRef, async (groupDoc) => {
      if (groupDoc.exists()) {
        const groupData = {
          id: groupDoc.id,
          ...groupDoc.data(),
          memberCount: groupDoc.data().members?.length || 0
        };
        
        // Buscar informações dos membros
        const membersData = [];
        for (const memberId of groupData.members) {
          try {
            const memberDoc = await getDoc(doc(db, 'users', memberId));
            if (memberDoc.exists()) {
              membersData.push({
                id: memberDoc.id,
                ...memberDoc.data()
              });
            }
          } catch (error) {
            console.error('Erro ao buscar membro:', error);
          }
        }
        
        setMembers(membersData);
        setGroup(groupData);
      }
    }, (error) => {
      console.error('Erro ao observar grupo:', error);
    });
    
    return unsubscribe;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const unsubscribe = subscribeToGroup();
    setRefreshing(false);
    return () => unsubscribe();
  };

  const handleLeaveGroup = async (newAdminId = null) => {
    try {
      // Iniciar animação de saída
      setIsLeaving(true);
      Animated.parallel([
        Animated.timing(leaveAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(leaveModalFade, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      // Aguardar a animação terminar
      await new Promise(resolve => setTimeout(resolve, 500));

      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (groupDoc.exists()) {
        const groupData = groupDoc.data();
        
        // Log para diagnóstico
        console.log('Dados do grupo:', {
          groupId,
          members: groupData.members,
          membersLength: groupData.members?.length,
          admin: groupData.admin,
          currentUser: currentUser?.uid,
          isAdmin: groupData.admin === currentUser?.uid
        });
        
        // Verificar se o usuário é o único membro do grupo e administrador
        let isOnlyMember = false;
        
        // Verificar se members é um número ou um array
        if (typeof groupData.members === 'number' && groupData.members === 1) {
          // Se members for um número e for 1, então o usuário é o único membro
          isOnlyMember = true;
        } else if (Array.isArray(groupData.members) && groupData.members.length === 1) {
          // Se members for um array com apenas um elemento
          if (typeof groupData.members[0] === 'string') {
            // Se for um array de IDs
            isOnlyMember = groupData.members[0] === currentUser.uid;
          } else if (typeof groupData.members[0] === 'object') {
            // Se for um array de objetos
            isOnlyMember = groupData.members[0].id === currentUser.uid;
          }
        }
        
        const isAdmin = groupData.admin === currentUser.uid;
        
        console.log('Verificação de saída:', {
          isOnlyMember,
          isAdmin,
          shouldDeleteGroup: isOnlyMember && isAdmin
        });
        
        if (isOnlyMember && isAdmin) {
          // Se for o único membro e administrador, apagar o grupo
          console.log('Apagando grupo pois o usuário é o único membro e administrador');
          
          // Atualizar a referência do grupo no documento do usuário
          const userRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.groups && userData.groups.includes(groupId)) {
              await updateDoc(userRef, {
                groups: userData.groups.filter(id => id !== groupId)
              });
            }
          }
          
          // Apagar o grupo do Firestore
          await deleteDoc(groupRef);
          
          setIsLeaveModalVisible(false);
          setIsAdminModalVisible(false);
          navigation.goBack();
          return;
        }
        
        // Verificar a estrutura dos membros e remover o usuário atual
        let updatedMembers;
        
        // Verificar se members é um array de IDs ou objetos
        if (groupData.members && groupData.members.length > 0) {
          if (typeof groupData.members[0] === 'string') {
            // Se for um array de IDs
            updatedMembers = groupData.members.filter(id => id !== currentUser.uid);
          } else {
            // Se for um array de objetos
            updatedMembers = groupData.members.filter(member => member.id !== currentUser.uid);
          }
        } else {
          updatedMembers = [];
        }
        
        // Se o usuário atual é o administrador e ainda existem outros membros,
        // transferir a administração para outro membro
        let newAdmin = groupData.admin;
        if (groupData.admin === currentUser.uid) {
          if (newAdminId) {
            // Usar o administrador selecionado pelo usuário
            newAdmin = newAdminId;
          } else if (updatedMembers.length > 0) {
            // Escolher o primeiro membro disponível como novo administrador
            if (typeof updatedMembers[0] === 'string') {
              newAdmin = updatedMembers[0];
            } else {
              newAdmin = updatedMembers[0].id;
            }
          }
        }
        
        // Atualizar o grupo
        await updateDoc(groupRef, {
          members: updatedMembers,
          memberCount: updatedMembers.length,
          admin: newAdmin,
          updatedAt: serverTimestamp(),
        });
        
        // Atualizar a referência do grupo no documento do usuário
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.groups && userData.groups.includes(groupId)) {
            await updateDoc(userRef, {
              groups: userData.groups.filter(id => id !== groupId)
            });
          }
        }

        setIsLeaveModalVisible(false);
        setIsAdminModalVisible(false);
        navigation.goBack();
      }
    } catch (error) {
      console.error('Erro ao sair do grupo:', error);
      Alert.alert('Erro', 'Não foi possível sair do grupo. Tente novamente.');
      setIsLeaving(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;
    
    try {
      setIsRemovingMember(true);
      
      // Iniciar animação de remoção
      Animated.parallel([
        Animated.timing(removeMemberModalAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(removeMemberModalFade, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Aguardar a animação terminar
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (groupDoc.exists()) {
        const groupData = groupDoc.data();
        
        // Verificar a estrutura dos membros e remover o membro selecionado
        let updatedMembers;
        
        // Verificar se members é um array de IDs ou objetos
        if (groupData.members && groupData.members.length > 0) {
          if (typeof groupData.members[0] === 'string') {
            // Se for um array de IDs
            updatedMembers = groupData.members.filter(id => id !== selectedMember.id);
          } else {
            // Se for um array de objetos
            updatedMembers = groupData.members.filter(member => member.id !== selectedMember.id);
          }
        } else {
          updatedMembers = [];
        }
        
        // Atualizar o grupo
        await updateDoc(groupRef, {
          members: updatedMembers,
          memberCount: updatedMembers.length,
          updatedAt: serverTimestamp(),
        });
        
        // Atualizar a referência do grupo no documento do usuário removido
        const userRef = doc(db, 'users', selectedMember.id);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.groups && userData.groups.includes(groupId)) {
            await updateDoc(userRef, {
              groups: userData.groups.filter(id => id !== groupId)
            });
          }
        }
        
        // Atualizar a lista de membros localmente
        setMembers(prevMembers => prevMembers.filter(member => member.id !== selectedMember.id));
        
        setIsRemoveMemberModalVisible(false);
        setSelectedMember(null);
      }
    } catch (error) {
      console.error('Erro ao remover membro do grupo:', error);
      Alert.alert('Erro', 'Não foi possível remover o membro do grupo. Tente novamente.');
    } finally {
      setIsRemovingMember(false);
    }
  };

  const renderSkeleton = () => (
    <View style={styles.content}>
      <View style={[styles.photoContainer, { backgroundColor: colors.border }]} />
      
      <View style={[styles.skeletonText, { backgroundColor: colors.border, width: '60%', height: moderateScale(24), alignSelf: 'center', marginTop: SPACING.md }]} />
      
      <View style={[styles.skeletonText, { backgroundColor: colors.border, width: '40%', height: moderateScale(16), alignSelf: 'center', marginTop: SPACING.xs }]} />
      
      <View style={[styles.infoContainer, { backgroundColor: colors.card }]}>
        <View style={styles.infoRow}>
          <View style={[styles.skeletonText, { backgroundColor: colors.border, width: '40%', height: moderateScale(16) }]} />
          <View style={[styles.skeletonText, { backgroundColor: colors.border, width: '20%', height: moderateScale(16) }]} />
        </View>
      </View>
      
      <View style={[styles.membersContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.skeletonText, { backgroundColor: colors.border, width: '50%', height: moderateScale(20), marginBottom: SPACING.md }]} />
        
        <View style={styles.membersGrid}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <View key={item} style={styles.memberItem}>
              <View style={[styles.skeletonPhoto, { backgroundColor: colors.border }]} />
              <View style={[styles.skeletonText, { backgroundColor: colors.border, width: '80%', height: moderateScale(14), marginTop: SPACING.xs }]} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  if (!group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[textStyles.h2, { color: colors.text }]}>Detalhes do Grupo</Text>
          <View style={{ width: 24 }} />
        </View>
        {renderSkeleton()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[textStyles.h2, { color: colors.text }]}>Detalhes do Grupo</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={[styles.photoContainer, { backgroundColor: colors.primary + '20' }]}>
            {group.photoURL ? (
              <Image
                source={{ uri: group.photoURL }}
                style={styles.groupPhoto}
                defaultSource={require('../assets/images/Logo SplitPay.png')}
                onError={() => {
                  console.log('Error loading group photo:', group.photoURL);
                }}
              />
            ) : (
              <View style={[styles.groupPhoto, { 
                backgroundColor: colors.primary + '20',
                justifyContent: 'center',
                alignItems: 'center'
              }]}>
                <Ionicons name="people" size={moderateScale(48)} color={colors.primary} />
              </View>
            )}
          </View>

          <Text style={[textStyles.h3, { color: colors.text, textAlign: 'center', marginTop: SPACING.md }]}>
            {group.name}
          </Text>

          <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center', marginTop: SPACING.xs }]}>
            Criado em {new Date(group.createdAt?.toDate()).toLocaleDateString()}
          </Text>

          <View style={[styles.infoContainer, { backgroundColor: colors.card }]}>
            <View style={styles.infoRow}>
              <Text style={[textStyles.body, { color: colors.text2 }]}>Total de Membros</Text>
              <Text style={[textStyles.body, { color: colors.text }]}>{group.memberCount}</Text>
            </View>
          </View>

          <View style={[styles.membersContainer, { backgroundColor: colors.card }]}>
            <Text style={[textStyles.h4, { color: colors.text, marginBottom: SPACING.md }]}>
              Membros do Grupo
            </Text>
            
            <View style={styles.membersGrid}>
              {members.map((member, index) => (
                <View key={member.id} style={[
                  styles.memberItem,
                  (index + 1) % 3 === 0 ? { marginRight: 0 } : {}
                ]}>
                  <TouchableOpacity 
                    onPress={() => {
                      if (group.admin === currentUser?.uid && member.id !== currentUser.uid) {
                        setSelectedMember(member);
                        setIsRemoveMemberModalVisible(true);
                      }
                    }}
                    activeOpacity={group.admin === currentUser?.uid && member.id !== currentUser.uid ? 0.7 : 1}
                    style={styles.memberTouchable}
                  >
                    <View style={styles.memberPhotoContainer}>
                      <Image
                        source={{ uri: member.photoURL || 'https://via.placeholder.com/50' }}
                        style={styles.memberPhoto}
                      />
                      {member.id === group.admin && (
                        <View style={[styles.adminBadge, { backgroundColor: colors.primary }]}>
                          <Ionicons name="star" size={10} color={colors.background} />
                        </View>
                      )}
                      {group.admin === currentUser?.uid && member.id !== currentUser.uid && (
                        <View style={[styles.removeIcon, { backgroundColor: colors.error }]}>
                          <Ionicons name="close" size={10} color={colors.background} />
                        </View>
                      )}
                    </View>
                    <Text 
                      style={[textStyles.bodySmall, { color: colors.text, textAlign: 'center' }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {member.username || member.email}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Botão de sair do grupo - sempre visível */}
            <TouchableOpacity
              style={[styles.leaveButton, { backgroundColor: colors.error }]}
              onPress={() => {
                if (group.admin === currentUser?.uid) {
                  // Verificar se o usuário é o único membro do grupo
                  const isOnlyMember = group.members.length === 1 && 
                    (typeof group.members[0] === 'string' ? 
                      group.members[0] === currentUser.uid : 
                      group.members[0].id === currentUser.uid);
                  
                  if (isOnlyMember) {
                    // Se for o único membro, mostrar o modal de confirmação de apagar grupo
                    setIsLeaveModalVisible(true);
                  } else {
                    // Se houver outros membros, mostrar o modal de seleção de novo administrador
                    setIsAdminModalVisible(true);
                  }
                } else {
                  // Se for membro comum, mostrar o modal de confirmação normal
                  setIsLeaveModalVisible(true);
                }
              }}
            >
              <Ionicons name="exit-outline" size={20} color={colors.background} />
              <Text style={[textStyles.button, { color: colors.background, marginLeft: SPACING.xs }]}>
                Sair do Grupo
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Modal de seleção de novo administrador */}
      <Modal
        visible={isAdminModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAdminModalVisible(false)}
      >
        <View style={[modalStyles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[modalStyles.modalContent, { 
            backgroundColor: colors.background,
            borderRadius: moderateScale(20),
            padding: SPACING.lg,
            width: '80%',
            maxWidth: moderateScale(320),
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }]}>
            <View style={[modalStyles.modalBody, { backgroundColor: colors.card }]}>
              <View style={[modalStyles.iconContainer, { backgroundColor: colors.error + '15' }]}>
                <Ionicons name="people" size={40} color={colors.error} />
              </View>
              <Text style={[textStyles.h4, { color: colors.text, textAlign: 'center', marginTop: SPACING.lg }]}>
                Transferir Administração
              </Text>
              <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center', marginTop: SPACING.sm }]}>
                Selecione um membro para ser o novo administrador do grupo
              </Text>
            </View>

            <ScrollView 
              style={[modalStyles.membersList, { maxHeight: moderateScale(200) }]}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: SPACING.md }}
            >
              {members
                .filter(member => member.id !== currentUser.uid)
                .map(member => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      modalStyles.memberItem,
                      { backgroundColor: colors.card },
                      selectedNewAdmin === member.id && { backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => setSelectedNewAdmin(member.id)}
                  >
                    <View style={modalStyles.memberPhotoContainer}>
                      <Image
                        source={{ uri: member.photoURL || 'https://via.placeholder.com/50' }}
                        style={modalStyles.memberPhoto}
                      />
                    </View>
                    <View style={modalStyles.memberInfo}>
                      <Text style={[textStyles.body, { color: colors.text }]}>
                        {member.username || member.email}
                      </Text>
                      <Text style={[textStyles.bodySmall, { color: colors.text2 }]}>
                        {member.email}
                      </Text>
                    </View>
                    {selectedNewAdmin === member.id && (
                      <View style={[modalStyles.checkmark, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={16} color={colors.background} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={[modalStyles.buttonContainer, { 
              flexDirection: 'column',
              alignItems: 'center',
              gap: SPACING.md,
              marginTop: 'auto',
              paddingHorizontal: SPACING.md,
              paddingBottom: SPACING.xl,
              paddingTop: SPACING.xl,
              backgroundColor: colors.card,
            }]}>
              <TouchableOpacity
                style={[modalStyles.button, { 
                  backgroundColor: colors.error,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: SPACING.xs,
                  paddingVertical: SPACING.md,
                  paddingHorizontal: SPACING.xl,
                  borderRadius: moderateScale(20),
                  elevation: 3,
                  shadowColor: colors.error,
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: 0.25,
                  shadowRadius: 3,
                  width: '100%',
                  opacity: selectedNewAdmin ? 1 : 0.5,
                }]}
                onPress={() => handleLeaveGroup(selectedNewAdmin)}
                activeOpacity={0.7}
                disabled={!selectedNewAdmin || isLeaving}
              >
                <Text style={[textStyles.button, { 
                  color: colors.background,
                  fontSize: moderateScale(15),
                  fontWeight: '600',
                  letterSpacing: 0.5,
                }]}>Sair e Transferir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[modalStyles.button, { 
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: SPACING.xs,
                  paddingVertical: SPACING.md,
                  paddingHorizontal: SPACING.xl,
                  borderRadius: moderateScale(20),
                  width: '100%',
                }]}
                onPress={() => setIsAdminModalVisible(false)}
                activeOpacity={0.7}
                disabled={isLeaving}
              >
                <Text style={[textStyles.button, { 
                  color: colors.text,
                  fontSize: moderateScale(15),
                  fontWeight: '600',
                  letterSpacing: 0.5,
                }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmação de saída */}
      <Modal
        visible={isLeaveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLeaveModalVisible(false)}
      >
        <View style={modalStyles.modalContainer}>
          <View style={modalStyles.modalOverlay}>
            <View style={modalStyles.modalContent}>
              <View style={modalStyles.modalBody}>
                <View style={[modalStyles.iconContainer, { backgroundColor: colors.error + '15' }]}>
                  <Ionicons name="exit-outline" size={40} color={colors.error} />
                </View>
                <Text style={[textStyles.h4, { color: colors.text, textAlign: 'center', marginTop: SPACING.lg }]}>
                  {group.admin === currentUser?.uid && 
                   group.members.length === 1 && 
                   (typeof group.members[0] === 'string' ? 
                    group.members[0] === currentUser.uid : 
                    group.members[0].id === currentUser.uid) ? 
                    "Apagar Grupo" : 
                    "Sair do Grupo"}
                </Text>
                <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center', marginTop: SPACING.sm }]}>
                  {group.admin === currentUser?.uid && 
                   group.members.length === 1 && 
                   (typeof group.members[0] === 'string' ? 
                    group.members[0] === currentUser.uid : 
                    group.members[0].id === currentUser.uid) ? 
                    "Tem certeza que deseja apagar este grupo? Esta ação não pode ser desfeita." : 
                    "Tem certeza que deseja sair deste grupo?"}
                </Text>
              </View>

              <View style={[modalStyles.buttonContainer, { 
                flexDirection: 'column',
                alignItems: 'center',
                gap: SPACING.md,
                marginTop: 'auto',
                paddingHorizontal: SPACING.md,
                paddingBottom: SPACING.xl,
                paddingTop: SPACING.xl,
              }]}>
                <TouchableOpacity
                  style={[modalStyles.button, { 
                    backgroundColor: colors.error,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: SPACING.xs,
                    paddingVertical: SPACING.md,
                    paddingHorizontal: SPACING.xl,
                    borderRadius: moderateScale(20),
                    elevation: 3,
                    shadowColor: colors.error,
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 3,
                    width: '100%',
                  }]}
                  onPress={() => handleLeaveGroup()}
                  activeOpacity={0.7}
                  disabled={isLeaving}
                >
                  <Text style={[textStyles.button, { 
                    color: colors.background,
                    fontSize: moderateScale(15),
                    fontWeight: '600',
                    letterSpacing: 0.5,
                  }]}>
                    {group.admin === currentUser?.uid && 
                     group.members.length === 1 && 
                     (typeof group.members[0] === 'string' ? 
                      group.members[0] === currentUser.uid : 
                      group.members[0].id === currentUser.uid) ? 
                      "Apagar Grupo" : 
                      "Sair do Grupo"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[modalStyles.button, { 
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: SPACING.xs,
                    paddingVertical: SPACING.md,
                    paddingHorizontal: SPACING.xl,
                    borderRadius: moderateScale(20),
                    width: '100%',
                  }]}
                  onPress={() => setIsLeaveModalVisible(false)}
                  activeOpacity={0.7}
                  disabled={isLeaving}
                >
                  <Text style={[textStyles.button, { 
                    color: colors.text,
                    fontSize: moderateScale(15),
                    fontWeight: '600',
                    letterSpacing: 0.5,
                  }]}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmação de remoção de membro */}
      <Modal
        visible={isRemoveMemberModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRemoveMemberModalVisible(false)}
      >
        <View style={[modalStyles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[modalStyles.modalContent, { 
            backgroundColor: colors.background,
            borderRadius: moderateScale(20),
            padding: SPACING.lg,
            width: '80%',
            maxWidth: moderateScale(320),
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }]}>
            <View style={[modalStyles.modalBody, { backgroundColor: colors.card }]}>
              <View style={[modalStyles.iconContainer, { backgroundColor: colors.error + '15' }]}>
                <Ionicons name="person-remove" size={40} color={colors.error} />
              </View>
              <Text style={[textStyles.h4, { color: colors.text, textAlign: 'center', marginTop: SPACING.lg }]}>
                Remover Membro
              </Text>
              <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center', marginTop: SPACING.sm }]}>
                Tem certeza que deseja remover {selectedMember?.username || selectedMember?.email} deste grupo?
              </Text>
            </View>

            <View style={[modalStyles.buttonContainer, { 
              flexDirection: 'column',
              alignItems: 'center',
              gap: SPACING.md,
              marginTop: 'auto',
              paddingHorizontal: SPACING.md,
              paddingBottom: SPACING.xl,
              paddingTop: SPACING.xl,
              backgroundColor: colors.card,
            }]}>
              <TouchableOpacity
                style={[modalStyles.button, { 
                  backgroundColor: colors.error,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: SPACING.xs,
                  paddingVertical: SPACING.md,
                  paddingHorizontal: SPACING.xl,
                  borderRadius: moderateScale(20),
                  elevation: 3,
                  shadowColor: colors.error,
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: 0.25,
                  shadowRadius: 3,
                  width: '100%',
                }]}
                onPress={handleRemoveMember}
                activeOpacity={0.7}
                disabled={isRemovingMember}
              >
                <Text style={[textStyles.button, { 
                  color: colors.background,
                  fontSize: moderateScale(15),
                  fontWeight: '600',
                  letterSpacing: 0.5,
                }]}>Remover Membro</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[modalStyles.button, { 
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: SPACING.xs,
                  paddingVertical: SPACING.md,
                  paddingHorizontal: SPACING.xl,
                  borderRadius: moderateScale(20),
                  width: '100%',
                }]}
                onPress={() => setIsRemoveMemberModalVisible(false)}
                activeOpacity={0.7}
                disabled={isRemovingMember}
              >
                <Text style={[textStyles.button, { 
                  color: colors.text,
                  fontSize: moderateScale(15),
                  fontWeight: '600',
                  letterSpacing: 0.5,
                }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: SPACING.xs,
  },
  content: {
    padding: SPACING.md,
  },
  photoContainer: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  groupPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(50),
  },
  infoContainer: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: moderateScale(12),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  membersContainer: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: moderateScale(12),
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    width: '100%',
  },
  memberItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginRight: '5%',
  },
  memberTouchable: {
    width: '100%',
    alignItems: 'center',
  },
  memberPhoto: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    marginBottom: SPACING.xs,
  },
  memberPhotoContainer: {
    position: 'relative',
    marginBottom: SPACING.xs,
  },
  adminBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: moderateScale(16),
    height: moderateScale(16),
    borderRadius: moderateScale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: moderateScale(16),
    height: moderateScale(16),
    borderRadius: moderateScale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Estilos para o wireframe
  skeletonText: {
    borderRadius: moderateScale(4),
  },
  skeletonPhoto: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    marginBottom: SPACING.xs,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: moderateScale(12),
    marginTop: SPACING.xl,
  },
});

const modalStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: moderateScale(20),
    padding: SPACING.lg,
    width: '80%',
    maxWidth: moderateScale(320),
  },
  modalBody: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  iconContainer: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    marginTop: 'auto',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: moderateScale(12),
  },
  membersList: {
    width: '100%',
    marginTop: SPACING.lg,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: moderateScale(12),
    marginBottom: SPACING.sm,
  },
  memberInfo: {
    flex: 1,
  },
  checkmark: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 