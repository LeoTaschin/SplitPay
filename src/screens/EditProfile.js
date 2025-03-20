import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, moderateScale } from '../utils/dimensions';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { auth, storage, db } from '../config/firebase';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc, writeBatch } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';

export function EditProfile({ navigation }) {
  const { colors, textStyles } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');

  useEffect(() => {
    loadUserData();
  }, [user?.uid]);

  const loadUserData = async () => {
    try {
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const usernameValue = userData.username || '';
          setCurrentUsername(usernameValue);
          setUsername(usernameValue);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleUpdateUsername = async () => {
    try {
      if (!username.trim()) {
        Alert.alert('Erro', 'O nome de usuário não pode estar vazio.');
        return;
      }

      if (username === currentUsername) {
        return;
      }

      setLoading(true);

      // Check if username is available
      const usernameDoc = await getDoc(doc(db, 'usernames', username));
      if (usernameDoc.exists()) {
        Alert.alert('Erro', 'Este nome de usuário já está em uso.');
        return;
      }

      // Start a batch write to update both collections
      const batch = writeBatch(db);
      
      // Remove old username from usernames collection
      if (currentUsername) {
        batch.delete(doc(db, 'usernames', currentUsername));
      }
      
      // Add new username to usernames collection
      batch.set(doc(db, 'usernames', username), {
        uid: user.uid,
        updatedAt: new Date()
      });
      
      // Update username in users collection
      batch.update(doc(db, 'users', user.uid), {
        username: username,
        updatedAt: new Date()
      });

      // Commit all changes
      await batch.commit();
      
      Alert.alert('Sucesso', 'Nome de usuário atualizado com sucesso!');
      setCurrentUsername(username);
    } catch (error) {
      console.error('Error updating username:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o nome de usuário.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectImage = async () => {
    try {
      if (!user) {
        Alert.alert('Erro', 'Você precisa estar logado para atualizar sua foto de perfil.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0].uri) {
        setLoading(true);
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        
        const imageRef = ref(storage, `profile_pictures/${user.uid}`);
        await uploadBytes(imageRef, blob);
        
        const downloadURL = await getDownloadURL(imageRef);
        
        // Get the current user to ensure we have the latest auth state
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('Usuário não autenticado');
        }

        await updateProfile(currentUser, { photoURL: downloadURL });
        
        Alert.alert('Sucesso', 'Foto de perfil atualizada com sucesso!');
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      let errorMessage = 'Não foi possível atualizar a foto de perfil.';
      
      if (error.message === 'Usuário não autenticado') {
        errorMessage = 'Você precisa estar logado para atualizar sua foto de perfil.';
      }
      
      Alert.alert('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[textStyles.h4, { color: colors.text }]}>Editar Perfil</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.photoSection}>
          <Image
            source={{ uri: user?.photoURL || 'default_profile_pic_url' }}
            style={[styles.profilePhoto, { borderColor: colors.primary }]}
          />
          <TouchableOpacity
            onPress={handleSelectImage}
            style={[styles.changePhotoButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[textStyles.button, { color: colors.surface }]}>
              Alterar foto
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
          <Text style={[textStyles.body, { color: colors.text, marginBottom: SPACING.xs }]}>
            Nome de usuário
          </Text>
          <TextInput
            style={[styles.input, { 
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.card
            }]}
            value={username}
            onChangeText={setUsername}
            placeholder="Digite seu nome de usuário"
            placeholderTextColor={colors.text2}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={handleUpdateUsername}
            style={[styles.updateButton, { backgroundColor: colors.primary }]}
            disabled={loading || username === currentUsername}
          >
            <Text style={[textStyles.button, { color: colors.surface }]}>
              {loading ? 'Atualizando...' : 'Atualizar nome de usuário'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  profilePhoto: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    borderWidth: 2,
    marginBottom: SPACING.md,
  },
  changePhotoButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: moderateScale(20),
  },
  formSection: {
    padding: SPACING.lg,
    borderRadius: moderateScale(12),
    marginTop: SPACING.xl,
  },
  input: {
    height: moderateScale(48),
    borderWidth: 1,
    borderRadius: moderateScale(8),
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    fontSize: moderateScale(16),
  },
  updateButton: {
    padding: SPACING.md,
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
}); 