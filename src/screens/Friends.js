import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Image,
  FlatList,
  Modal,
  Animated,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, moderateScale } from '../utils/dimensions';
import { db, auth } from '../config/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useDebts } from '../hooks/useDebts';
import { formatCurrency } from '../utils/formatters';
import { useNavigation } from '@react-navigation/native';
import { AnimatedValue } from './Activity';

export function Friends() {
  const { colors, textStyles } = useTheme();
  const { debtsAsCreditor, debtsAsDebtor } = useDebts();
  const [searchUsername, setSearchUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const navigation = useNavigation();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setFriends([]);
      setLoadingFriends(false);
      return;
    }

    initializeUserData();
    fetchFriends();

    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        if (userData.friends) {
          fetchFriends();
        }
      }
    });

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        Animated.spring(keyboardAnimation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }).start();
      }
    );

    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.spring(keyboardAnimation, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }).start(() => {
          setKeyboardHeight(0);
        });
      }
    );

    return () => {
      unsubscribe();
      setFriends([]);
      setLoadingFriends(false);
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const calculateBalanceWithFriend = (friendId) => {
    const debtsAsCreditorToFriend = debtsAsCreditor
      .filter(debt => debt.debtorId === friendId)
      .reduce((sum, debt) => sum + (debt.paid ? 0 : debt.amount), 0);

    const debtsAsDebtorToFriend = debtsAsDebtor
      .filter(debt => debt.creditorId === friendId)
      .reduce((sum, debt) => sum + (debt.paid ? 0 : debt.amount), 0);

    return debtsAsCreditorToFriend - debtsAsDebtorToFriend;
  };

  const initializeUserData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      if (!userDoc.exists()) {
        // Se o documento não existe, cria com dados básicos
        await setDoc(doc(db, 'users', currentUser.uid), {
          uid: currentUser.uid,
          email: currentUser.email,
          username: currentUser.email.split('@')[0].toLowerCase(), // Username básico do email
          photoURL: currentUser.photoURL,
          friends: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Se existe mas falta algum campo, atualiza
        const userData = userDoc.data();
        const updates = {};

        if (!userData.friends) updates.friends = [];
        if (!userData.username) updates.username = currentUser.email.split('@')[0].toLowerCase();
        if (!userData.createdAt) updates.createdAt = serverTimestamp();
        if (!userData.updatedAt) updates.updatedAt = serverTimestamp();
        if (!userData.photoURL && currentUser.photoURL) updates.photoURL = currentUser.photoURL;

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, 'users', currentUser.uid), updates);
        }

        // Se o username não está registrado na coleção usernames, registra
        if (userData.username) {
          const usernameDoc = await getDoc(doc(db, 'usernames', userData.username));
          if (!usernameDoc.exists()) {
            await setDoc(doc(db, 'usernames', userData.username), {
              uid: currentUser.uid
            });
          }
        }
      }
    } catch (error) {
      console.error('Erro ao inicializar dados do usuário:', error);
    }
  };

  const fetchFriends = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setFriends([]);
        setLoadingFriends(false);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        setFriends([]);
        setLoadingFriends(false);
        return;
      }

      const userData = userDoc.data();
      
      if (!userData?.friends?.length) {
        setFriends([]);
        setLoadingFriends(false);
        return;
      }

      const friendsData = [];
      for (const friendId of userData.friends) {
        const friendDoc = await getDoc(doc(db, 'users', friendId));
        if (friendDoc.exists()) {
          const friendData = friendDoc.data();
          friendsData.push({
            id: friendDoc.id,
            ...friendData,
            photoURL: friendData.photoURL || null,
            username: friendData.username || friendData.email?.split('@')[0] || 'Usuário',
            email: friendData.email || ''
          });
        }
      }

      setFriends(friendsData);
    } catch (error) {
      console.error('Erro ao buscar amigos:', error);
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  const searchUser = async (username) => {
    if (!username.trim()) {
      setSearchResults(null);
      setSearchError('');
      return;
    }

    setLoading(true);
    setSearchError('');
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setSearchError('Você precisa estar logado');
        return;
      }

      const usersRef = collection(db, 'users');
      const searchTerm = username.trim().toLowerCase();
      
      // Busca todos os usuários para fazer filtragem local
      const querySnapshot = await getDocs(usersRef);

      if (querySnapshot.empty) {
        setSearchResults(null);
        setSearchError('Nenhum usuário encontrado');
        return;
      }

      const foundUsers = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(user => 
          // Filtra usuários que contêm o termo de busca no username
          user.username?.toLowerCase().includes(searchTerm) &&
          // Não mostra o usuário atual
          user.id !== currentUser.uid && 
          // Não mostra usuários que já são amigos
          !friends.some(friend => friend.id === user.id)
        );

      if (foundUsers.length === 0) {
        setSearchResults(null);
        setSearchError('Usuário não encontrado ou já é seu amigo');
        return;
      }

      setSearchResults(foundUsers);
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      setSearchError('Erro ao buscar usuário');
    } finally {
      setLoading(false);
    }
  };

  const showCustomAlert = () => {
    setShowSuccessAlert(true);
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.3);
    
    Animated.parallel([
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        })
      ]),
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(scaleAnim, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        })
      ])
    ]).start(() => {
      setShowSuccessAlert(false);
    });
  };

  const addFriend = async (user) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      await updateDoc(doc(db, 'users', currentUser.uid), {
        friends: arrayUnion(user.id)
      });

      await updateDoc(doc(db, 'users', user.id), {
        friends: arrayUnion(currentUser.uid)
      });

      setSearchUsername('');
      setSearchResults(null);
      setIsSearchModalVisible(false);
      fetchFriends();
      showCustomAlert();
    } catch (error) {
      console.error('Erro ao adicionar amigo:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o amigo');
    }
  };

  const removeFriend = async (friendId) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Remove friend from current user's friends list
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      const updatedFriends = userDoc.data().friends.filter(id => id !== friendId);
      await updateDoc(userRef, { friends: updatedFriends });

      // Remove current user from friend's friends list
      const friendRef = doc(db, 'users', friendId);
      const friendDoc = await getDoc(friendRef);
      const updatedFriendFriends = friendDoc.data().friends.filter(id => id !== currentUser.uid);
      await updateDoc(friendRef, { friends: updatedFriendFriends });

      // Refresh friends list
      fetchFriends();
    } catch (error) {
      console.error('Erro ao remover amigo:', error);
      Alert.alert('Erro', 'Não foi possível remover o amigo');
    }
  };

  const handleRemoveFriend = (friend) => {
    Alert.alert(
      'Remover amigo',
      `Tem certeza que deseja remover ${friend.username} da sua lista de amigos?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => removeFriend(friend.id)
        }
      ]
    );
  };

  const renderFriendItem = ({ item: friend, index }) => {
    const balance = calculateBalanceWithFriend(friend.id);
    const isPositive = balance > 0;
    const isNegative = balance < 0;

    return (
      <>
        <TouchableOpacity
          style={[styles.friendItem, { backgroundColor: colors.cardBackground }]}
          onPress={() => navigation.navigate('FriendProfile', { friend })}
        >
          <View style={styles.friendInfo}>
            <View style={styles.photoContainer}>
              <Image
                source={{ uri: friend.photoURL || 'https://via.placeholder.com/50' }}
                style={styles.friendPhoto}
              />
            </View>
            <View style={styles.friendTextContainer}>
              <View style={styles.nameContainer}>
                <Text style={[textStyles.body, { color: colors.text }]}>
                  {friend.username || friend.email}
                </Text>
                {friend.isVerified && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={16} 
                    color={colors.primary} 
                    style={styles.verifiedIcon}
                  />
                )}
              </View>
              <Text 
                style={[textStyles.bodySmall, { color: colors.text2 }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {friend.email}
              </Text>
            </View>
          </View>
          <AnimatedValue 
            value={balance}
            style={[
              textStyles.body,
              {
                color: isPositive ? colors.success : isNegative ? colors.error : colors.text,
              }
            ]}
          />
        </TouchableOpacity>
        {index !== friends.length - 1 && (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
      </>
    );
  };

  const renderSeparator = () => (
    <View style={[styles.separator, { backgroundColor: colors.border }]} />
  );

  const renderSearchResult = ({ item }) => (
    <View style={[styles.searchResultItem, { backgroundColor: colors.card }]}>
      <Image 
        source={{ uri: item.photoURL }} 
        style={styles.friendPhoto}
        defaultSource={require('../assets/images/logoPequena.png')}
      />
      <View style={styles.searchResultInfo}>
        <View style={styles.nameContainer}>
          <Text style={[textStyles.bodyLarge, { color: colors.text }]}>
            {item.username}
          </Text>
        </View>
        <Text 
          style={[textStyles.bodySmall, { color: colors.text2 }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.email}
        </Text>
      </View>
      <TouchableOpacity 
        style={[styles.addFriendButton, { backgroundColor: colors.primary }]}
        onPress={() => addFriend(item)}
      >
        <Ionicons name="person-add" size={15} color={colors.background} />
      </TouchableOpacity>
    </View>
  );

  const onRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchFriends();
    } catch (error) {
      console.error('Friends - onRefresh - Erro ao atualizar amigos:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleBackgroundPress = () => {
    console.log('Background pressed - This should not happen');
  };

  const handleInputFocus = () => {
    console.log('Input focused');
  };

  const handleInputBlur = () => {
    console.log('Input blurred - Keyboard losing focus');
  };

  const handleModalPress = (event) => {
    event.stopPropagation();
    console.log('Modal pressed at:', event.nativeEvent.locationX, event.nativeEvent.locationY);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[textStyles.h2, { color: colors.text }]}>Amigos</Text>
      </View>

      {loadingFriends ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : friends.length > 0 ? (
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
          {friends.map((friend, index) => (
            <React.Fragment key={friend.id || index}>
              {renderFriendItem({ item: friend, index })}
            </React.Fragment>
          ))}
          <View style={[styles.footerContainer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setIsSearchModalVisible(true)}
              style={[styles.addButton, { 
                backgroundColor: colors.primary,
                borderColor: colors.primary,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: SPACING.xs,
                paddingVertical: SPACING.md,
                paddingHorizontal: SPACING.xl,
                borderRadius: moderateScale(20),
                elevation: 3,
                shadowColor: colors.primary,
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.25,
                shadowRadius: 3,
                alignSelf: 'center',
                width: '100%',
              }]}
            >
              <Ionicons name="person-add" size={20} color={colors.background} />
              <Text style={[textStyles.button, { 
                color: colors.background,
                fontSize: moderateScale(15),
                fontWeight: '600',
                letterSpacing: 0.5,
              }]}>
                Adicionar Amigo
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyStateContainer}>
          <View style={[styles.emptyStateIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="people" size={60} color={colors.primary} />
          </View>
          <Text style={[textStyles.h3, { color: colors.text, textAlign: 'center', marginTop: SPACING.lg }]}>
            Você não tem amigos adicionados
          </Text>
          <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center', marginTop: SPACING.sm, marginBottom: SPACING.xl }]}>
            Adicione amigos para compartilhar despesas e gerenciar dívidas juntos
          </Text>
          <TouchableOpacity
            onPress={() => setIsSearchModalVisible(true)}
            style={[styles.addFriendButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="person-add" size={20} color={colors.background} />
            <Text style={[textStyles.button, { color: colors.background, marginLeft: SPACING.xs }]}>
              Adicionar Amigo
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={isSearchModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          console.log('Modal onRequestClose triggered');
          setIsSearchModalVisible(false);
          setSearchUsername('');
          setSearchResults(null);
          setSearchError('');
        }}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View 
            style={[styles.modalOverlay]}
            pointerEvents="box-none"
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              <View style={{ flex: 1 }}>
                <Animated.View 
                  style={[
                    styles.modalContainer,
                    { 
                      backgroundColor: colors.background,
                    }
                  ]}
                >
                  <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[textStyles.h3, { color: colors.text }]}>
                      Adicionar Amigo
                    </Text>
                    <TouchableOpacity 
                      onPress={() => {
                        console.log('Close button pressed');
                        setIsSearchModalVisible(false);
                        setSearchUsername('');
                        setSearchResults(null);
                        setSearchError('');
                      }}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.searchContainer}>
                    <TextInput
                      style={[styles.searchInput, { 
                        backgroundColor: colors.card,
                        color: colors.text,
                        borderColor: colors.border,
                      }]}
                      placeholder="Buscar amigo por apelido..."
                      placeholderTextColor={colors.text2}
                      value={searchUsername}
                      onChangeText={(text) => {
                        console.log('Input text changed:', text);
                        setSearchUsername(text);
                        searchUser(text);
                      }}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus={true}
                    />
                  </View>

                  {loading ? (
                    <View style={styles.searchContent}>
                      <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                  ) : searchError ? (
                    <View style={styles.searchContent}>
                      <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center' }]}>
                        {searchError}
                      </Text>
                    </View>
                  ) : searchResults ? (
                    <ScrollView
                      contentContainerStyle={styles.searchResultsList}
                      showsVerticalScrollIndicator={false}
                    >
                      {searchResults.map((item) => (
                        <View key={item.id || `search-${item.username}`}>
                          {renderSearchResult({ item })}
                        </View>
                      ))}
                    </ScrollView>
                  ) : null}
                </Animated.View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {showSuccessAlert && (
        <Animated.View 
          style={[
            styles.fullScreenAlert,
            { 
              backgroundColor: colors.background,
              opacity: fadeAnim,
            }
          ]}
        >
          <Animated.View 
            style={[
              styles.alertContent,
              {
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark" size={32} color={colors.background} />
            </View>
            <Text style={[textStyles.h3, { color: colors.text, marginTop: SPACING.md, textAlign: 'center' }]}>
              Amigo adicionado{'\n'}com sucesso!
            </Text>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  searchInput: {
    flex: 1,
    height: moderateScale(48),
    borderWidth: 1,
    borderRadius: moderateScale(10),
    paddingHorizontal: SPACING.md,
    fontSize: moderateScale(16),
    marginRight: SPACING.sm,
  },
  searchButton: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: moderateScale(15),
    padding: SPACING.lg,
  },
  mainContent: {
    flex: 0.9,
    marginBottom: SPACING.md,
  },
  friendsList: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    borderRadius: moderateScale(10),
    marginBottom: SPACING.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        shadowColor: '#000',
      },
    }),
    minHeight: moderateScale(60),
  },
  friendPhoto: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendDetails: {
    marginLeft: SPACING.sm,
    flex: 1,
    justifyContent: 'center',
  },
  footerContainer: {
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xxl * 2,
    alignItems: 'center',
    borderTopWidth: 1,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
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
  searchContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  searchResultsList: {
    padding: SPACING.md,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: moderateScale(10),
    marginBottom: SPACING.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        shadowColor: '#000',
      },
    }),
  },
  searchResultInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: moderateScale(25),
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  fullScreenAlert: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  alertContent: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  checkCircle: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        shadowColor: '#000',
      },
    }),
  },
  removeButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  balanceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  avatar: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  listContent: {
    paddingBottom: SPACING.md,
  },
  separator: {
    height: 1,
    opacity: 0.5,
    marginVertical: SPACING.xs,
  },
  friendTextContainer: {
    marginLeft: SPACING.xs,
    flex: 1,
    justifyContent: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedIcon: {
    marginLeft: SPACING.xs,
  },
  friendAvatar: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    marginRight: SPACING.md,
  },
  friendName: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: 'black',
  },
  friendEmail: {
    fontSize: moderateScale(14),
    color: 'gray',
  },
  balanceText: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
  },
  positiveBalance: {
    color: 'green',
  },
  negativeBalance: {
    color: 'red',
  },
  firstFriendItem: {
    borderTopWidth: 1,
    borderTopColor: 'gray',
  },
  lastFriendItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'gray',
  },
  photoContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },

  verifiedBadgeContainer: {
    marginLeft: SPACING.xs,
    borderRadius: moderateScale(12),
    padding: moderateScale(2),
  },
  keyboardView: {
    flex: 1,
  },
  customScrollContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollIndicatorContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    zIndex: 10,
  },
  scrollIndicator: {
    position: 'absolute',
    width: '100%',
    borderRadius: 1,
    height: 40,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyStateIcon: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
}); 