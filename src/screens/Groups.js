import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  ActionSheetIOS,
  Alert as RNAlert
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, moderateScale } from '../utils/dimensions';
import { useNavigation } from '@react-navigation/native';
import { db, auth, storage } from '../config/firebase';
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
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

const CreateGroupModal = ({ visible, onClose, onGroupCreated }) => {
  const { colors, textStyles } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [groupName, setGroupName] = useState('');
  const [groupPhotoURL, setGroupPhotoURL] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [uploadingImage, setUploadingImage] = useState(false);
  const [localImageUri, setLocalImageUri] = useState(null);
  const [progressAnim] = useState(new Animated.Value(0.05));
  const [isExpanded, setIsExpanded] = useState(false);
  const [groupCreated, setGroupCreated] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 20,
        mass: 1,
        stiffness: 100,
      }).start();
      fetchFriends();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        mass: 1,
        stiffness: 100,
      }).start(() => {
        setIsVisible(false);
      });
      
      setCurrentStep(1);
      progressAnim.setValue(0.05);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && currentStep === 1) {
      fetchFriends();
    }
  }, [visible, currentStep]);

  useEffect(() => {
    if (currentStep === 2) {
      Animated.timing(progressAnim, {
        toValue: 0.5,
        duration: 500,
        useNativeDriver: false,
      }).start();
    } else if (currentStep === 3) {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [currentStep]);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setFriends([]);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        setFriends([]);
        return;
      }

      const userData = userDoc.data();
      
      if (!userData?.friends?.length) {
        setFriends([]);
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
      setLoading(false);
    }
  };

  const searchUser = async (username) => {
    setSearchLoading(true);
    setSearchError('');
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setSearchError('Você precisa estar logado');
        return;
      }

      const searchTerm = username.trim().toLowerCase();
      
      const foundFriends = friends.filter(friend => 
        friend.username?.toLowerCase().includes(searchTerm) &&
        !selectedFriends.some(f => f.id === friend.id)
      );

      if (foundFriends.length === 0) {
        setSearchResults(null);
        setSearchError('Nenhum amigo encontrado');
        return;
      }

      setSearchResults(foundFriends);
    } catch (error) {
      console.error('Erro ao buscar amigos:', error);
      setSearchError('Erro ao buscar amigos');
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleFriendSelection = (friend) => {
    if (selectedFriends.some(f => f.id === friend.id)) {
      setSelectedFriends(selectedFriends.filter(f => f.id !== friend.id));
    } else {
      setSelectedFriends([...selectedFriends, friend]);
    }
  };

  const pickImage = async () => {
    try {
      // Solicitar permissão para acessar a galeria
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permissão necessária',
          'Precisamos de permissão para acessar suas fotos para selecionar uma imagem para o grupo.'
        );
        return;
      }
      
      // Abrir o seletor de imagens
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLocalImageUri(result.assets[0].uri);
        setGroupPhotoURL(''); // Limpar a URL anterior
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem. Tente novamente.');
    }
  };

  const takePhoto = async () => {
    try {
      // Solicitar permissão para acessar a câmera
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permissão necessária',
          'Precisamos de permissão para acessar sua câmera para tirar uma foto para o grupo.'
        );
        return;
      }
      
      // Abrir a câmera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLocalImageUri(result.assets[0].uri);
        setGroupPhotoURL(''); // Limpar a URL anterior
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto. Tente novamente.');
    }
  };

  const showImageOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Escolher da galeria', 'Tirar foto'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            pickImage();
          } else if (buttonIndex === 2) {
            takePhoto();
          }
        }
      );
    } else {
      RNAlert.alert(
        'Adicionar foto',
        'Escolha uma opção',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Escolher da galeria',
            onPress: pickImage,
          },
          {
            text: 'Tirar foto',
            onPress: takePhoto,
          },
        ]
      );
    }
  };

  const uploadImage = async () => {
    if (!localImageUri) return null;
    
    try {
      setUploadingImage(true);
      
      // Generate a unique filename using timestamp and random number instead of UUID
      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 10000);
      const fileExtension = localImageUri.split('.').pop();
      const fileName = `group_photo_${timestamp}_${randomNum}.${fileExtension}`;
      
      // Create a reference for the file in Storage
      const storageRef = ref(storage, `group_photos/${fileName}`);
      
      // Convert the local URI to a blob
      const response = await fetch(localImageUri);
      const blob = await response.blob();
      
      // Upload the blob to Storage
      await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      setUploadingImage(false);
      return downloadURL;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      setUploadingImage(false);
      Alert.alert('Erro', 'Não foi possível fazer upload da imagem. Tente novamente.');
      return null;
    }
  };

  const createGroup = async () => {
    try {
      if (!groupName.trim()) {
        Alert.alert('Erro', 'O nome do grupo não pode estar vazio');
        return;
      }
      
      if (selectedFriends.length === 0) {
        Alert.alert('Erro', 'Você precisa adicionar pelo menos um amigo ao grupo');
        return;
      }
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Erro', 'Você precisa estar logado para criar um grupo');
        return;
      }
      
      setLoading(true);
      
      // Fazer upload da imagem se houver uma selecionada
      let photoURL = null;
      if (localImageUri) {
        photoURL = await uploadImage();
        if (!photoURL) {
          setLoading(false);
          Alert.alert('Erro', 'Não foi possível fazer upload da foto. Tente novamente.');
          return;
        }
      }
      
      const newGroup = {
        name: groupName.trim(),
        photoURL: photoURL,
        description: groupDescription.trim(),
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        admin: currentUser.uid,
        members: [currentUser.uid, ...selectedFriends.map(f => f.id)],
        debts: []
      };
      
      const groupRef = await addDoc(collection(db, 'groups'), newGroup);
      
      await updateDoc(doc(db, 'users', currentUser.uid), {
        groups: arrayUnion(groupRef.id)
      });
      
      for (const friend of selectedFriends) {
        await updateDoc(doc(db, 'users', friend.id), {
          groups: arrayUnion(groupRef.id)
        });
      }
      
      setGroupCreated(true);
      setCurrentStep(3);
      
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      Alert.alert('Erro', 'Não foi possível criar o grupo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={modalStyles.stepIndicatorContainer}>
      <View style={modalStyles.progressBarContainer}>
        <Animated.View 
          style={[
            modalStyles.progressBar,
            { 
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%']
              }),
              backgroundColor: colors.primary
            }
          ]} 
        />
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={[modalStyles.modalContent, { flex: 1 }]}>
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[modalStyles.photoAndNameContainer, { 
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: moderateScale(12),
          padding: SPACING.md,
          marginBottom: SPACING.md
        }]}>
          <TouchableOpacity
            style={[modalStyles.photoIconButton, { backgroundColor: colors.primary + '30' }]}
            onPress={showImageOptions}
          >
            {localImageUri ? (
              <Image 
                source={{ uri: localImageUri }} 
                style={modalStyles.groupPhotoPreview}
              />
            ) : (
              <Ionicons name="camera" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
          <TextInput
            style={[modalStyles.searchInput, { 
              backgroundColor: 'transparent',
              color: colors.text,
              borderColor: 'transparent',
              flex: 1,
              marginLeft: SPACING.sm,
              minHeight: moderateScale(60),
              paddingVertical: SPACING.md,
              paddingHorizontal: SPACING.md,
              fontSize: moderateScale(16),
              textAlignVertical: 'center'
            }]}
            placeholder="Nome do grupo"
            placeholderTextColor={colors.text2}
            value={groupName}
            onChangeText={setGroupName}
            autoCapitalize="words"
            autoCorrect={false}
            multiline={false}
          />
        </View>

        <View style={[modalStyles.participantsContainer, { 
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: moderateScale(12),
          padding: SPACING.md,
          marginTop: SPACING.md,
          maxHeight: isExpanded ? undefined : moderateScale(300),
        }]}>
          <Text style={[textStyles.body, { color: colors.text, marginBottom: SPACING.sm }]}>
            Participantes
          </Text>
          <ScrollView 
            style={{ maxHeight: isExpanded ? undefined : moderateScale(250) }}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: SPACING.md }}
          >
            <View style={[modalStyles.participantsList, { 
              flexDirection: 'row', 
              flexWrap: 'wrap',
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
              paddingHorizontal: SPACING.sm,
              paddingVertical: SPACING.sm,
              gap: SPACING.md,
              maxHeight: isExpanded ? undefined : moderateScale(100),
              overflow: 'hidden',
            }]}>
              {selectedFriends.map((friend) => (
                <View key={friend.id} style={[modalStyles.participantItem, { 
                  width: '20%',
                  alignItems: 'flex-start',
                  marginBottom: SPACING.md,
                }]}>
                  <View style={{ position: 'relative' }}>
                    <Image 
                      source={{ uri: friend.photoURL || 'https://via.placeholder.com/50' }}
                      style={[modalStyles.participantPhoto, {
                        width: moderateScale(50),
                        height: moderateScale(50),
                        borderRadius: moderateScale(25),
                      }]}
                    />
                    <TouchableOpacity
                      style={[modalStyles.removeButton, {
                        position: 'absolute',
                        top: -5,
                        right: -5,
                        backgroundColor: colors.background,
                        borderRadius: moderateScale(12),
                      }]}
                      onPress={() => toggleFriendSelection(friend)}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.text2} />
                    </TouchableOpacity>
                  </View>
                  <Text 
                    style={[textStyles.bodySmall, { 
                      color: colors.text,
                      marginTop: SPACING.xs,
                      textAlign: 'center'
                    }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {friend.username || friend.email}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
          {selectedFriends.length > 4 && (
            <TouchableOpacity
              style={[modalStyles.expandButton, {
                backgroundColor: 'transparent',
                paddingVertical: SPACING.sm,
                alignItems: 'center',
                marginTop: SPACING.sm,
              }]}
              onPress={() => setIsExpanded(!isExpanded)}
            >
              <Text style={[textStyles.body, { 
                color: colors.primary,
                textAlign: 'center',
              }]}>
                {isExpanded ? 'Ver menos' : `Ver mais (${selectedFriends.length} participantes)`}
              </Text>
            </TouchableOpacity>
          )}
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
              backgroundColor: colors.primary,
              opacity: groupName.trim() && localImageUri ? 1 : 0.5,
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
              width: '100%',
            }]}
            onPress={createGroup}
            disabled={!groupName.trim() || !localImageUri}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={[textStyles.button, { 
                color: colors.background,
                fontSize: moderateScale(15),
                fontWeight: '600',
                letterSpacing: 0.5,
              }]}>Criar Grupo</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[modalStyles.button, { 
              backgroundColor: 'transparent',
              paddingVertical: SPACING.sm,
              width: '100%',
            }]}
            onPress={() => setCurrentStep(1)}
            activeOpacity={0.7}
          >
            <Text style={[textStyles.body, { 
              color: colors.text2,
              textAlign: 'center',
            }]}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  const renderStep2 = () => (
    <View style={modalStyles.modalContent}>
      <View style={modalStyles.searchContainer}>
        <TextInput
          style={[modalStyles.searchInput, { 
            backgroundColor: colors.card,
            color: colors.text,
            borderColor: colors.border,
          }]}
          placeholder="Buscar amigo..."
          placeholderTextColor={colors.text2}
          value={searchUsername}
          onChangeText={(text) => {
            setSearchUsername(text);
            if (text.trim()) {
              searchUser(text);
            } else {
              setSearchResults(null);
              setSearchError('');
            }
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {searchLoading ? (
        <View style={[modalStyles.searchContent, { height: moderateScale(320) }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : searchError ? (
        <View style={[modalStyles.searchContent, { height: moderateScale(320) }]}>
          <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center' }]}>
            {searchError}
          </Text>
        </View>
      ) : searchResults ? (
        <View style={modalStyles.searchResultsContainer}>
          <ScrollView
            contentContainerStyle={modalStyles.searchResultsList}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            {searchResults.map((friend, index) => (
              <React.Fragment key={friend.id}>
                <TouchableOpacity
                  style={[
                    modalStyles.memberItem,
                    { backgroundColor: colors.card },
                    selectedFriends.some(f => f.id === friend.id) && { backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => toggleFriendSelection(friend)}
                >
                  <View style={modalStyles.memberPhotoContainer}>
                    <Image
                      source={{ uri: friend.photoURL || 'https://via.placeholder.com/50' }}
                      style={modalStyles.memberPhoto}
                    />
                  </View>
                  <View style={modalStyles.memberInfo}>
                    <Text style={[textStyles.body, { color: colors.text }]}>
                      {friend.username || friend.email?.split('@')[0]}
                    </Text>
                  </View>
                  {selectedFriends.some(f => f.id === friend.id) && (
                    <View style={[modalStyles.checkmark, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={16} color={colors.background} />
                    </View>
                  )}
                </TouchableOpacity>
                {index < searchResults.length - 1 && (
                  <View style={[modalStyles.separator, { backgroundColor: colors.border }]} />
                )}
              </React.Fragment>
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={modalStyles.friendsListContainer}>
          <ScrollView
            contentContainerStyle={modalStyles.friendsList}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            {loading ? (
              <View style={[modalStyles.searchContent, { height: moderateScale(320) }]}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : friends.length > 0 ? (
              friends.map((friend, index) => (
                <React.Fragment key={friend.id}>
                  <TouchableOpacity
                    style={[
                      modalStyles.memberItem,
                      { backgroundColor: colors.card },
                      selectedFriends.some(f => f.id === friend.id) && { backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => toggleFriendSelection(friend)}
                  >
                    <View style={modalStyles.memberPhotoContainer}>
                      <Image
                        source={{ uri: friend.photoURL || 'https://via.placeholder.com/50' }}
                        style={modalStyles.memberPhoto}
                      />
                    </View>
                    <View style={modalStyles.memberInfo}>
                      <Text style={[textStyles.body, { 
                        color: colors.text,
                        fontWeight: '600',
                      }]}>
                        {friend.username || friend.email?.split('@')[0]}
                      </Text>
                    </View>
                    {selectedFriends.some(f => f.id === friend.id) && (
                      <View style={[modalStyles.checkmark, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={16} color={colors.background} />
                      </View>
                    )}
                  </TouchableOpacity>
                  {index < friends.length - 1 && (
                    <View style={[modalStyles.separator, { backgroundColor: colors.border }]} />
                  )}
                </React.Fragment>
              ))
            ) : (
              <View style={[modalStyles.emptyStateContainer, { height: moderateScale(320) }]}>
                <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center' }]}>
                  Você não tem amigos adicionados ainda.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      <View style={modalStyles.buttonContainer}>
        <TouchableOpacity
          style={[modalStyles.button, { 
            backgroundColor: colors.primary,
            opacity: selectedFriends.length > 0 ? 1 : 0.5,
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
          onPress={() => setCurrentStep(2)}
          disabled={selectedFriends.length === 0}
          activeOpacity={0.7}
        >
          <Text style={[textStyles.button, { 
            color: colors.background,
            fontSize: moderateScale(15),
            fontWeight: '600',
            letterSpacing: 0.5,
          }]}>Próximo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={[modalStyles.modalContent, { flex: 1 }]}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingBottom: SPACING.xl * 3,
          paddingHorizontal: SPACING.md,
          flexGrow: 1
        }}
        showsVerticalScrollIndicator={true}
        bounces={true}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[modalStyles.groupDetailsContainer, { 
          alignItems: 'center',
          padding: SPACING.md,
          flex: 1,
          minHeight: '100%'
        }]}>
          <View style={[modalStyles.groupPhotoLarge, { 
            width: moderateScale(120),
            height: moderateScale(120),
            borderRadius: moderateScale(60),
            overflow: 'hidden',
            marginBottom: SPACING.md,
            borderWidth: 3,
            borderColor: colors.primary,
          }]}>
            {localImageUri ? (
              <Image 
                source={{ uri: localImageUri }} 
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <View style={{ 
                width: '100%', 
                height: '100%', 
                backgroundColor: colors.primary + '30',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name="people" size={50} color={colors.primary} />
              </View>
            )}
          </View>
          
          <Text style={[textStyles.h3, { 
            color: colors.text,
            marginBottom: SPACING.xs,
            textAlign: 'center',
          }]}>
            {groupName || 'Novo Grupo'}
          </Text>
          
          <Text style={[textStyles.bodySmall, { 
            color: colors.text2,
            marginBottom: SPACING.md,
            textAlign: 'center',
          }]}>
            Criado em {new Date().toLocaleDateString()}
          </Text>
          
          <View style={[modalStyles.participantsCountContainer, { 
            backgroundColor: colors.primary + '20',
            paddingVertical: SPACING.sm,
            paddingHorizontal: SPACING.md,
            borderRadius: moderateScale(20),
            marginBottom: SPACING.lg,
          }]}>
            <Text style={[textStyles.body, { 
              color: colors.primary,
              fontWeight: '600',
            }]}>
              {selectedFriends.length + 1} Participantes
            </Text>
          </View>
          
          <View style={[modalStyles.participantsSection, {
            width: '100%',
            marginBottom: SPACING.lg,
          }]}>
            <Text style={[textStyles.body, { 
              color: colors.text,
              fontWeight: '600',
              marginBottom: SPACING.md,
              textAlign: 'center',
            }]}>
              Participantes do Grupo
            </Text>
            
            <View style={[modalStyles.adminContainer, {
              width: '100%',
              backgroundColor: colors.card,
              borderRadius: moderateScale(12),
              padding: SPACING.md,
              marginBottom: SPACING.md,
              borderWidth: 1,
              borderColor: colors.primary + '40',
            }]}>
              <View style={[modalStyles.adminHeader, {
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: SPACING.sm,
              }]}>
                <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                <Text style={[textStyles.bodySmall, { 
                  color: colors.primary,
                  fontWeight: '600',
                  marginLeft: SPACING.xs,
                }]}>
                  Administrador
                </Text>
              </View>
              
              <View style={[modalStyles.participantItemLarge, { 
                flexDirection: 'row',
                alignItems: 'center',
                width: '100%',
              }]}>
                <View style={[modalStyles.participantPhotoLarge, {
                  width: moderateScale(50),
                  height: moderateScale(50),
                  borderRadius: moderateScale(25),
                  marginBottom: 0,
                  marginRight: SPACING.md,
                  borderWidth: 2,
                  borderColor: colors.primary,
                }]}>
                  <Image
                    source={{ uri: auth.currentUser?.photoURL || 'https://via.placeholder.com/70' }}
                    style={{ width: '100%', height: '100%', borderRadius: moderateScale(25) }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[textStyles.body, { 
                    color: colors.text,
                    fontWeight: '600',
                  }]}>
                    Você
                  </Text>
                  <Text style={[textStyles.bodySmall, { 
                    color: colors.text2,
                    fontSize: moderateScale(12),
                  }]}>
                    {auth.currentUser?.email || 'Usuário'}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={[modalStyles.membersContainer, {
              width: '100%',
              backgroundColor: colors.card,
              borderRadius: moderateScale(12),
              padding: SPACING.md,
              borderWidth: 1,
              borderColor: colors.border,
            }]}>
              <View style={[modalStyles.membersHeader, {
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: SPACING.sm,
              }]}>
                <Ionicons name="people" size={18} color={colors.text} />
                <Text style={[textStyles.bodySmall, { 
                  color: colors.text,
                  fontWeight: '600',
                  marginLeft: SPACING.xs,
                }]}>
                  Membros ({selectedFriends.length})
                </Text>
              </View>
              
              {selectedFriends.map((friend) => (
                <View key={friend.id} style={[modalStyles.participantItemLarge, { 
                  flexDirection: 'row',
                  alignItems: 'center',
                  width: '100%',
                  marginBottom: SPACING.md,
                  paddingVertical: SPACING.xs,
                }]}>
                  <View style={[modalStyles.participantPhotoLarge, {
                    width: moderateScale(50),
                    height: moderateScale(50),
                    borderRadius: moderateScale(25),
                    marginBottom: 0,
                    marginRight: SPACING.md,
                  }]}>
                    <Image
                      source={{ uri: friend.photoURL || 'https://via.placeholder.com/70' }}
                      style={{ width: '100%', height: '100%', borderRadius: moderateScale(25) }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[textStyles.body, { 
                      color: colors.text,
                      fontWeight: '600',
                    }]}>
                      {friend.username || friend.email?.split('@')[0] || 'Usuário'}
                    </Text>
                    <Text style={[textStyles.bodySmall, { 
                      color: colors.text2,
                      fontSize: moderateScale(12),
                    }]}>
                      {friend.email || 'Membro do grupo'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={[modalStyles.buttonContainer, { 
          flexDirection: 'column',
          alignItems: 'center',
          gap: SPACING.md,
          paddingHorizontal: SPACING.md,
          paddingBottom: SPACING.xl,
          paddingTop: SPACING.xl,
          marginTop: 'auto',
          position: 'relative',
          bottom: 0,
          width: '100%',
        }]}>
          <TouchableOpacity
            style={[modalStyles.button, { 
              backgroundColor: colors.primary,
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
              width: '100%',
            }]}
            onPress={() => {
              if (onGroupCreated) {
                onGroupCreated();
              }
              onClose();
            }}
            activeOpacity={0.7}
          >
            <Text style={[textStyles.button, { 
              color: colors.background,
              fontSize: moderateScale(15),
              fontWeight: '600',
              letterSpacing: 0.5,
            }]}>Concluir</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  const renderSearchResult = ({ item }) => (
    <View style={[modalStyles.searchResultItem, { backgroundColor: colors.card }]}>
      <Image 
        source={{ uri: item.photoURL || 'https://via.placeholder.com/50' }} 
        style={modalStyles.friendPhoto}
        defaultSource={require('../assets/images/logoPequena.png')}
      />
      <View style={modalStyles.searchResultInfo}>
        <View style={modalStyles.nameContainer}>
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
        style={[modalStyles.addFriendButton, { backgroundColor: colors.primary }]}
        onPress={() => toggleFriendSelection(item)}
      >
        <Ionicons 
          name={selectedFriends.some(f => f.id === item.id) ? "checkmark" : "person-add"} 
          size={20} 
          color={colors.white} 
        />
      </TouchableOpacity>
    </View>
  );

  // Definindo os estilos dentro do componente para ter acesso ao colors
  const modalStyles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: moderateScale(24),
      borderTopRightRadius: moderateScale(24),
      paddingTop: moderateScale(16),
      paddingBottom: moderateScale(32),
      height: '85%',
      width: '100%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: moderateScale(16),
      paddingBottom: moderateScale(16),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeButton: {
      padding: moderateScale(8),
      width: moderateScale(40),
      height: moderateScale(40),
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalScrollContent: {
      paddingHorizontal: moderateScale(16),
      paddingTop: moderateScale(16),
      paddingBottom: moderateScale(32),
    },
    stepIndicatorContainer: {
      paddingHorizontal: moderateScale(16),
      paddingVertical: moderateScale(16),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    progressBarContainer: {
      height: moderateScale(4),
      backgroundColor: colors.border,
      borderRadius: moderateScale(2),
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: moderateScale(2),
    },
    searchContainer: {
      marginBottom: moderateScale(16),
    },
    searchInput: {
      backgroundColor: colors.card,
      borderRadius: moderateScale(12),
      paddingHorizontal: moderateScale(16),
      paddingVertical: moderateScale(12),
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      ...textStyles.body,
    },
    searchContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: moderateScale(32),
    },
    searchResultsList: {
      paddingBottom: moderateScale(16),
    },
    searchResultsContainer: {
      height: moderateScale(340),
    },
    friendsList: {
      paddingBottom: moderateScale(16),
    },
    friendsListContainer: {
      height: moderateScale(340),
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: moderateScale(32),
    },
    friendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: moderateScale(12),
      paddingHorizontal: moderateScale(16),
      borderRadius: moderateScale(12),
      marginBottom: moderateScale(8),
      height: moderateScale(72),
    },
    friendInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    friendPhoto: {
      width: moderateScale(40),
      height: moderateScale(40),
      borderRadius: moderateScale(20),
      marginRight: moderateScale(12),
    },
    friendTextContainer: {
      flex: 1,
    },
    nameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: moderateScale(2),
    },
    verifiedIcon: {
      marginLeft: moderateScale(4),
    },
    checkmarkContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingHorizontal: moderateScale(16),
      paddingTop: moderateScale(16),
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    button: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoAndNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    photoIconButton: {
      width: moderateScale(50),
      height: moderateScale(50),
      borderRadius: moderateScale(25),
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    groupPhotoPreview: {
      width: '100%',
      height: '100%',
      borderRadius: moderateScale(25),
    },
    searchResultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: moderateScale(12),
      paddingHorizontal: moderateScale(16),
      borderRadius: moderateScale(12),
      marginBottom: moderateScale(8),
      height: moderateScale(72),
    },
    searchResultInfo: {
      flex: 1,
      marginLeft: moderateScale(12),
    },
    addFriendButton: {
      width: moderateScale(32),
      height: moderateScale(32),
      borderRadius: moderateScale(16),
      justifyContent: 'center',
      alignItems: 'center',
    },
    participantsContainer: {
      marginTop: SPACING.md,
    },
    participantsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.sm,
      gap: SPACING.md,
    },
    participantItem: {
      width: '25%',
      alignItems: 'flex-start',
      marginBottom: SPACING.md,
    },
    participantPhoto: {
      marginRight: 0,
    },
    removeButton: {
      padding: 2,
    },
    expandButton: {
      paddingVertical: SPACING.sm,
      alignItems: 'center',
      marginTop: SPACING.sm,
    },
    groupDetailsContainer: {
      alignItems: 'center',
      padding: SPACING.md,
    },
    groupPhotoLarge: {
      width: moderateScale(120),
      height: moderateScale(120),
      borderRadius: moderateScale(60),
      overflow: 'hidden',
      marginBottom: SPACING.md,
      borderWidth: 3,
      borderColor: colors.primary,
    },
    participantsCountContainer: {
      backgroundColor: colors.primary + '20',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: moderateScale(20),
      marginBottom: SPACING.lg,
    },
    participantsSection: {
      width: '100%',
      marginBottom: SPACING.lg,
    },
    adminContainer: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: moderateScale(12),
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: colors.primary + '40',
    },
    adminHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    membersContainer: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: moderateScale(12),
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    membersHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    participantsGrid: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: SPACING.md,
    },
    participantItemLarge: {
      width: '30%',
      alignItems: 'center',
    },
    participantPhotoLarge: {
      width: moderateScale(70),
      height: moderateScale(70),
      borderRadius: moderateScale(35),
      marginBottom: SPACING.xs,
    },
    memberItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.md,
      borderRadius: moderateScale(12),
      marginBottom: SPACING.sm,
    },
    memberPhotoContainer: {
      width: moderateScale(40),
      height: moderateScale(40),
      borderRadius: moderateScale(20),
      overflow: 'hidden',
      marginRight: SPACING.md,
    },
    memberPhoto: {
      width: '100%',
      height: '100%',
    },
    memberInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    checkmark: {
      width: moderateScale(24),
      height: moderateScale(24),
      borderRadius: moderateScale(12),
      justifyContent: 'center',
      alignItems: 'center',
    },
    separator: {
      height: 1,
      opacity: 0.2,
      marginHorizontal: SPACING.md,
    },
  });

  const handleClose = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        mass: 1,
        stiffness: 100,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setIsVisible(false);
      onClose();
    });
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View style={[modalStyles.modalContainer, { 
          flex: 1,
          opacity: fadeAnim 
        }]}>
          <View style={[modalStyles.modalOverlay, { flex: 1 }]}>
            <Animated.View 
              style={[
                modalStyles.modalContent,
                {
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [800, 0]
                      })
                    }
                  ]
                }
              ]}
            >
              <View style={modalStyles.modalHeader}>
                <Text style={[textStyles.h4, { color: colors.text }]}>
                  {currentStep === 1 ? 'Selecionar Amigos' : currentStep === 2 ? 'Personalizar Grupo' : 'Detalhes do Grupo'}
                </Text>
                <TouchableOpacity
                  style={modalStyles.closeButton}
                  onPress={handleClose}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {renderStepIndicator()}

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={modalStyles.modalScrollContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                bounces={true}
              >
                {currentStep === 1 && renderStep2()}
                {currentStep === 2 && renderStep1()}
                {currentStep === 3 && renderStep3()}
              </ScrollView>
            </Animated.View>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

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

  const subscribeToUserGroups = () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return () => {};
    }

    const userDocRef = doc(db, 'users', currentUser.uid);
    
    const unsubscribe = onSnapshot(userDocRef, async (userDoc) => {
      if (userDoc.exists() && userDoc.data().groups && userDoc.data().groups.length > 0) {
        const groupsIds = userDoc.data().groups;
        const groupsData = [];
        
        for (const groupId of groupsIds) {
          try {
            const groupDoc = await getDoc(doc(db, 'groups', groupId));
            if (groupDoc.exists()) {
              const groupData = {
                id: groupDoc.id,
                ...groupDoc.data(),
                memberCount: groupDoc.data().members?.length || 0
              };
              
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
      
      const newGroup = {
        name: newGroupName.trim(),
        photoURL: groupPhotoURL || 'https://via.placeholder.com/150?text=' + encodeURIComponent(newGroupName.trim().charAt(0).toUpperCase()),
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        admin: currentUser.uid,
        members: [currentUser.uid],
        debts: []
      };
      
      const groupRef = await addDoc(collection(db, 'groups'), newGroup);
      
      await updateDoc(doc(db, 'users', currentUser.uid), {
        groups: arrayUnion(groupRef.id)
      });
      
      setNewGroupName('');
      setGroupPhotoURL('');
      setIsCreateModalVisible(false);
      
      Alert.alert('Sucesso', 'Grupo criado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      Alert.alert('Erro', 'Não foi possível criar o grupo. Tente novamente.');
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    const unsubscribe = subscribeToUserGroups();
    setRefreshing(false);
    return () => unsubscribe();
  };

  const navigateToGroupDetail = (group) => {
    navigation.navigate('GroupDetail', { groupId: group.id });
  };

  const renderGroupItem = ({ item, index }) => (
    <>
      <TouchableOpacity
        style={[styles.groupItem, { backgroundColor: colors.cardBackground }]}
        onPress={() => navigateToGroupDetail(item)}
      >
        <View style={styles.groupInfo}>
          <View style={styles.photoContainer}>
            {item.photoURL ? (
              <Image
                source={{ uri: item.photoURL }}
                style={styles.groupPhoto}
                defaultSource={require('../assets/images/logoPequena.png')}
                onError={(e) => {
                  console.log('Error loading group photo:', e.nativeEvent.error);
                }}
              />
            ) : (
              <View style={[styles.groupPhoto, { 
                backgroundColor: colors.primary + '20',
                justifyContent: 'center',
                alignItems: 'center'
              }]}>
                <Ionicons name="people" size={24} color={colors.primary} />
              </View>
            )}
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
      </TouchableOpacity>
      {index !== groups.length - 1 && (
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
      )}
    </>
  );

  const renderSeparator = () => (
    <View style={[styles.separator, { backgroundColor: colors.border }]} />
  );

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
                
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (!userDoc.exists() || !userDoc.data().groups) {
                  setLoading(false);
                  return;
                }
                
                const userGroups = userDoc.data().groups;
                
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

  const renderFriendItem = ({ item: friend, index }) => {
    const isSelected = selectedFriends.some(f => f.id === friend.id);
    
    return (
      <TouchableOpacity
        key={friend.id}
        style={[
          styles.friendItem, 
          { 
            backgroundColor: colors.cardBackground,
            borderColor: isSelected ? colors.primary : 'transparent',
            borderWidth: isSelected ? 2 : 0
          }
        ]}
        onPress={() => toggleFriendSelection(friend)}
      >
        <View style={styles.friendInfo}>
          <View style={styles.photoContainer}>
            <Image
              source={{ uri: friend.photoURL || 'https://via.placeholder.com/50' }}
              style={[styles.friendPhoto, {
                width: moderateScale(50),
                height: moderateScale(50),
                borderRadius: moderateScale(25),
              }]}
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
        {isSelected && (
          <View style={[styles.checkmarkContainer, { 
            backgroundColor: colors.primary,
            width: moderateScale(24),
            height: moderateScale(24),
            borderRadius: moderateScale(12),
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 3,
            shadowColor: colors.primary,
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3,
          }]}>
            <Ionicons name="checkmark" size={16} color={colors.background} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[textStyles.h2, { color: colors.text }]}>Grupos</Text>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
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
          {groups.map((group, index) => (
            <React.Fragment key={group.id || index}>
              {renderGroupItem({ item: group, index })}
            </React.Fragment>
          ))}
          <View style={[styles.footerContainer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setIsCreateModalVisible(true)}
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
                shadowColor: '#000000',
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
              <Ionicons name="add-circle-outline" size={20} color={colors.background} />
              <Text style={[textStyles.button, { 
                color: colors.background,
                fontSize: moderateScale(15),
                fontWeight: '600',
                letterSpacing: 0.5,
              }]}>
                Criar Grupo
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
            Você não faz parte de nenhum grupo
          </Text>
          <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center', marginTop: SPACING.sm, marginBottom: SPACING.xl }]}>
            Crie um grupo para compartilhar despesas com amigos e familiares
          </Text>
          <TouchableOpacity
            onPress={() => setIsCreateModalVisible(true)}
            style={[styles.createGroupButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.background} />
            <Text style={[textStyles.button, { color: colors.background, marginLeft: SPACING.xs }]}>
              Criar Grupo
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <CreateGroupModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onGroupCreated={() => {
          setIsCreateModalVisible(false);
          onRefresh();
        }}
      />
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
    opacity: 0.2,
    marginHorizontal: SPACING.md,
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
    marginBottom: SPACING.xxl,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: moderateScale(8),
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  removeButton: {
    padding: SPACING.xs,
    borderRadius: moderateScale(8),
    borderWidth: 1,
    marginLeft: SPACING.md
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
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
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    borderRadius: moderateScale(25),
    elevation: 3,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
}); 