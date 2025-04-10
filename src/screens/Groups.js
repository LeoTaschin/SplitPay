import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, moderateScale } from '../utils/dimensions';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  arrayUnion, 
  serverTimestamp,
  onSnapshot,
  arrayRemove
} from 'firebase/firestore';
import { formatCurrency } from '../utils/formatters';

export function Groups() {
  const { colors, textStyles } = useTheme();
  const navigation = useNavigation();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupPhotoURL, setGroupPhotoURL] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToUserGroups();
    return () => unsubscribe();
  }, []);

  // Função para criar um listener em tempo real para os grupos do usuário
  const subscribeToUserGroups = () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return () => {};
    }

    const userDocRef = doc(db, 'users', currentUser.uid);
    
    // Criar um listener para o documento do usuário
    const unsubscribe = onSnapshot(userDocRef, async (userDoc) => {
      if (userDoc.exists() && userDoc.data().groups && userDoc.data().groups.length > 0) {
        const groupsIds = userDoc.data().groups;
        const groupsData = [];
        
        // Buscar informações detalhadas de cada grupo
        for (const groupId of groupsIds) {
          try {
            const groupDoc = await getDoc(doc(db, 'groups', groupId));
            if (groupDoc.exists()) {
              const groupData = {
                id: groupDoc.id,
                ...groupDoc.data(),
                // Calcular valores extras
                memberCount: groupDoc.data().members?.length || 0
              };
              
              // Calcular o valor total das dívidas do grupo (isso será implementado depois)
              groupData.totalDebt = await calculateGroupDebt(groupId);
              
              groupsData.push(groupData);
            }
          } catch (error) {
            console.error('Erro ao buscar detalhes do grupo:', error);
          }
        }
        
        setGroups(groupsData);
      } else {
        setGroups([]);
      }
      
      setLoading(false);
    }, (error) => {
      console.error('Erro ao observar grupos:', error);
      setLoading(false);
    });
    
    return unsubscribe;
  };

  // Função para criar um novo grupo
  const createGroup = async () => {
    try {
      if (!newGroupName.trim()) {
        Alert.alert('Erro', 'O nome do grupo não pode estar vazio');
        return;
      }
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Erro', 'Você precisa estar logado para criar um grupo');
        return;
      }
      
      // Dados do novo grupo
      const newGroup = {
        name: newGroupName.trim(),
        photoURL: groupPhotoURL || 'https://via.placeholder.com/150?text=' + encodeURIComponent(newGroupName.trim().charAt(0).toUpperCase()),
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        admin: currentUser.uid,
        members: [currentUser.uid],
        debts: []
      };
      
      // Adicionar o grupo à coleção de grupos
      const groupRef = await addDoc(collection(db, 'groups'), newGroup);
      
      // Adicionar o ID do grupo ao array de grupos do usuário
      await updateDoc(doc(db, 'users', currentUser.uid), {
        groups: arrayUnion(groupRef.id)
      });
      
      // Limpar o formulário e fechar o modal
      setNewGroupName('');
      setGroupPhotoURL('');
      setIsCreateModalVisible(false);
      
      // Exibir mensagem de sucesso
      Alert.alert('Sucesso', 'Grupo criado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      Alert.alert('Erro', 'Não foi possível criar o grupo. Tente novamente.');
    }
  };
  
  // Função para calcular a dívida total de um grupo (simplificada por enquanto)
  const calculateGroupDebt = async (groupId) => {
    try {
      // Aqui implementaríamos a lógica para calcular a dívida total do grupo
      // Isso envolveria buscar todas as dívidas associadas ao grupo
      // Por enquanto, retornaremos um valor aleatório para demonstração
      return Math.random() * 1000;
    } catch (error) {
      console.error('Erro ao calcular dívida do grupo:', error);
      return 0;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const unsubscribe = subscribeToUserGroups();
    setRefreshing(false);
    return () => unsubscribe();
  };

  const navigateToGroupDetail = (group) => {
    // Aqui navegaríamos para a tela de detalhes do grupo
    // Por enquanto, apenas exibiremos um alerta
    Alert.alert(
      'Detalhes do Grupo',
      `Nome: ${group.name}\nMembros: ${group.memberCount}\nValor Total: ${formatCurrency(group.totalDebt.toString())}`,
      [
        { text: 'OK' }
      ]
    );
  };

  const renderGroupItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.groupItem, { backgroundColor: colors.cardBackground }]}
      onPress={() => navigateToGroupDetail(item)}
    >
      <View style={styles.groupInfo}>
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: item.photoURL || 'https://via.placeholder.com/50' }}
            style={styles.groupPhoto}
          />
        </View>
        <View style={styles.groupTextContainer}>
          <Text style={[textStyles.body, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text 
            style={[textStyles.bodySmall, { color: colors.text2 }]}
          >
            {item.memberCount} membros
          </Text>
        </View>
      </View>
      <Text style={[textStyles.body, { color: colors.primary }]}>
        {formatCurrency(item.totalDebt.toString())}
      </Text>
    </TouchableOpacity>
  );

  const renderSeparator = () => (
    <View style={[styles.separator, { backgroundColor: colors.border }]} />
  );

  // Nova função para remover o usuário de todos os grupos
  const removeFromAllGroups = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Erro', 'Você precisa estar logado para executar esta ação');
        return;
      }

      Alert.alert(
        'Confirmar Remoção',
        'Você tem certeza que deseja sair de todos os grupos? Esta ação não pode ser desfeita.',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Confirmar',
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);
                
                // Buscar o documento do usuário
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (!userDoc.exists() || !userDoc.data().groups) {
                  setLoading(false);
                  return;
                }
                
                const userGroups = userDoc.data().groups;
                
                // Para cada grupo, remover o usuário da lista de membros
                for (const groupId of userGroups) {
                  try {
                    const groupRef = doc(db, 'groups', groupId);
                    await updateDoc(groupRef, {
                      members: arrayRemove(currentUser.uid)
                    });
                  } catch (err) {
                    console.error(`Erro ao remover usuário do grupo ${groupId}:`, err);
                  }
                }
                
                // Limpar a lista de grupos do usuário
                await updateDoc(doc(db, 'users', currentUser.uid), {
                  groups: []
                });
                
                setGroups([]);
                setLoading(false);
                Alert.alert('Sucesso', 'Você foi removido de todos os grupos.');
              } catch (error) {
                console.error('Erro ao remover dos grupos:', error);
                setLoading(false);
                Alert.alert('Erro', 'Não foi possível remover você dos grupos. Tente novamente.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao processar a remoção:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao tentar processar sua solicitação.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[textStyles.h2, { color: colors.text }]}>Grupos</Text>
        {groups.length > 0 && (
          <TouchableOpacity 
            onPress={removeFromAllGroups}
            style={[styles.removeButton, { borderColor: colors.error }]}
          >
            <Text style={{ color: colors.error }}>Limpar Grupos</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : groups.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.listContent}
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
          <FlatList
            data={groups}
            renderItem={renderGroupItem}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={renderSeparator}
            scrollEnabled={false}
          />

          <View style={[styles.footerContainer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setIsCreateModalVisible(true)}
              style={[styles.addButton, { borderColor: colors.primary }]}
            >
              <Ionicons name="add-circle" size={20} color={colors.primary} />
              <Text style={[textStyles.body, { color: colors.primary, marginLeft: SPACING.sm }]}>
                Criar Grupo
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons 
              name="people" 
              size={moderateScale(48)} 
              color={colors.primary} 
            />
          </View>
          <Text style={[textStyles.h3, { color: colors.text, textAlign: 'center', marginTop: SPACING.lg }]}>
            Nenhum grupo encontrado
          </Text>
          <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center', marginTop: SPACING.md }]}>
            Crie seu primeiro grupo para dividir despesas com amigos!
          </Text>
          <TouchableOpacity
            onPress={() => setIsCreateModalVisible(true)}
            style={[styles.createButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[textStyles.button, { color: colors.white }]}>
              Criar Grupo
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal para criar grupo */}
      <Modal
        visible={isCreateModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[textStyles.h3, { color: colors.text }]}>
                Criar Novo Grupo
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setIsCreateModalVisible(false);
                  setNewGroupName('');
                  setGroupPhotoURL('');
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={[textStyles.body, { color: colors.text, marginBottom: SPACING.sm }]}>
                Nome do grupo:
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                placeholder="Ex: Viagem para Praia"
                placeholderTextColor={colors.text2}
                value={newGroupName}
                onChangeText={setNewGroupName}
              />

              <Text style={[textStyles.body, { color: colors.text, marginBottom: SPACING.sm }]}>
                URL da imagem do grupo (opcional):
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                placeholder="https://exemplo.com/imagem.jpg"
                placeholderTextColor={colors.text2}
                value={groupPhotoURL}
                onChangeText={setGroupPhotoURL}
              />

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    setIsCreateModalVisible(false);
                    setNewGroupName('');
                    setGroupPhotoURL('');
                  }}
                >
                  <Text style={[textStyles.button, { color: colors.text }]}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.button, { 
                    backgroundColor: colors.primary,
                    opacity: newGroupName.trim() ? 1 : 0.5
                  }]}
                  onPress={createGroup}
                  disabled={!newGroupName.trim()}
                >
                  <Text style={[textStyles.button, { color: colors.white }]}>Criar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  iconContainer: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: SPACING.md,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: moderateScale(12),
    marginVertical: SPACING.xs,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  photoContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  groupPhoto: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
  },
  groupTextContainer: {
    marginLeft: SPACING.xs,
    flex: 1,
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    opacity: 0.5,
    marginVertical: SPACING.xs,
  },
  footerContainer: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: SPACING.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: moderateScale(8),
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  createButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: moderateScale(8),
    marginTop: SPACING.xl,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    borderRadius: moderateScale(16),
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  closeButton: {
    padding: SPACING.sm,
  },
  modalContent: {
    padding: SPACING.lg,
  },
  input: {
    height: moderateScale(48),
    borderWidth: 1,
    borderRadius: moderateScale(8),
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.xs,
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  removeButton: {
    padding: SPACING.xs,
    borderRadius: moderateScale(8),
    borderWidth: 1,
    marginLeft: SPACING.md
  },
}); 