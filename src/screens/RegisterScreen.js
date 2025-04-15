import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  SafeAreaView, 
  TextInput, 
  Text, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity,
  Dimensions,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Logo } from '../components/Logo';
import { Button } from '../components/Button';
import { auth, storage, db } from '../config/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const SPACING = 20;
const { height } = Dimensions.get('window');
const DEFAULT_PROFILE_IMAGE = require('../assets/images/Logo SplitPay.png');

export default function RegisterScreen() {
  const { colors, textStyles } = useTheme();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Desculpe, precisamos de permissão para acessar suas fotos!');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      } else {
        console.log('Nenhuma imagem foi selecionada ou houve um cancelamento.');
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem. Por favor, tente novamente.');
    }
  };

  const uploadImage = async (uri) => {
    try {
      console.log('Fazendo fetch da imagem para upload:', uri);
      let response;
      let blob;
      
      if (uri === DEFAULT_PROFILE_IMAGE) {
        // Se for a imagem padrão, carrega do arquivo local
        const imageResponse = await fetch(Image.resolveAssetSource(DEFAULT_PROFILE_IMAGE).uri);
        blob = await imageResponse.blob();
      } else {
        // Se for uma imagem selecionada pelo usuário
        response = await fetch(uri);
        blob = await response.blob();
      }
      
      const filename = `profile_${Date.now()}.jpg`;
      const storageRef = ref(storage, `profile_images/${filename}`);
      console.log('Upload da imagem para o Firebase Storage...');
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Imagem carregada com sucesso:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      throw error;
    }
  };

  const checkUsernameAvailability = async (username) => {
    try {
      const usernameDoc = await getDoc(doc(db, 'usernames', username));
      return !usernameDoc.exists();
    } catch (error) {
      console.error('Erro ao verificar disponibilidade do username:', error);
      throw error;
    }
  };

  const validateUsername = (username) => {
    // Verifica se tem entre 3 e 20 caracteres e só contém letras, números e underscores
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const handleRegister = async () => {
    console.group('Processo de Registro');
    console.log('Iniciando processo de registro...');
    setHasAttemptedSubmit(true);
    setEmailError('');
    setPasswordError('');
    setUsernameError('');

    // Validações
    if (!email) {
      setEmailError('O e-mail é obrigatório. Por favor, insira um e-mail válido.');
      console.error('Erro: Email não fornecido.');
      console.groupEnd();
      return;
    }

    if (!username) {
      setUsernameError('O nome de usuário é obrigatório.');
      console.error('Erro: Nome de usuário não fornecido.');
      console.groupEnd();
      return;
    }

    if (!validateUsername(username)) {
      setUsernameError('O nome de usuário deve ter entre 3 e 20 caracteres e conter apenas letras, números e underscores.');
      console.error('Erro: Formato de username inválido');
      console.groupEnd();
      return;
    }

    if (!password) {
      setPasswordError('A senha é obrigatória. Por favor, insira sua senha.');
      console.error('Erro: Senha não fornecida.');
      console.groupEnd();
      return;
    }

    let user = null;

    try {
      setLoading(true);
      
      // Verifica se o username já está em uso
      console.log('Verificando disponibilidade do username...');
      const isUsernameAvailable = await checkUsernameAvailability(username);
      if (!isUsernameAvailable) {
        setUsernameError('Este nome de usuário já está em uso. Por favor, escolha outro.');
        console.error('Erro: Username já em uso');
        console.groupEnd();
        setLoading(false);
        return;
      }
      console.log('Username disponível, continuando com o registro...');

      // 1. Criar o usuário na autenticação
      console.log('Tentando criar usuário com email:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
      console.log('Usuário criado com sucesso:', user.uid);

      // 2. Upload da imagem (se houver)
      let photoURL = null;
      try {
        setUploading(true);
        if (image) {
          console.log('Iniciando upload da imagem selecionada...');
          photoURL = await uploadImage(image);
        } else {
          console.log('Usando imagem padrão como foto de perfil...');
          photoURL = await uploadImage(DEFAULT_PROFILE_IMAGE);
        }
        console.log('Imagem carregada com sucesso:', photoURL);
      } catch (imageError) {
        console.error('Erro ao fazer upload da imagem:', imageError);
        // Continuar mesmo se houver erro no upload da imagem
      }

      // 3. Atualizar o perfil do usuário com a foto
      try {
        console.log('Atualizando perfil do usuário com a foto...');
        await updateProfile(user, { 
          photoURL,
          displayName: username 
        });
        console.log('Perfil do usuário atualizado com a foto.');
      } catch (profileError) {
        console.error('Erro ao atualizar perfil:', profileError);
        // Continuar mesmo se houver erro na atualização do perfil
      }

      // Pequena pausa para garantir que a autenticação está completa
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 4. Criar documento do usuário no Firestore
      try {
        console.log('Criando documento do usuário no Firestore...');
        const userData = {
          uid: user.uid,
          email,
          username,
          photoURL,
          friends: [],
          debtsAsCreditor: [],
          debtsAsDebtor: [],
          totalToReceive: 0,
          totalToPay: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, userData);
        console.log('Documento do usuário criado no Firestore.');

        // 5. Salvar username para verificação futura
        console.log('Salvando nome de usuário para verificação futura...');
        const usernameRef = doc(db, 'usernames', username);
        await setDoc(usernameRef, { uid: user.uid });
        console.log('Nome de usuário salvo para verificação futura.');

        // 6. Navegar para a tela de confirmação
        navigation.navigate('AccountConfirmation');
      } catch (firestoreError) {
        console.error('Erro ao criar documentos no Firestore:', firestoreError);
        // Se houver erro ao criar os documentos, tentar limpar o usuário
        if (user) {
          try {
            await user.delete();
          } catch (deleteError) {
            console.error('Erro ao deletar usuário após falha:', deleteError);
          }
        }
        throw firestoreError;
      }
      
    } catch (error) {
      console.error('Erro durante o registro:', error);
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          setEmailError('Este e-mail já está em uso. Por favor, use outro e-mail ou faça login.');
          break;
        case 'auth/invalid-email':
          setEmailError('O formato do e-mail é inválido.');
          break;
        case 'auth/operation-not-allowed':
          setEmailError('O registro com e-mail e senha não está habilitado.');
          break;
        case 'auth/weak-password':
          setPasswordError('A senha é muito fraca. Use uma senha mais forte.');
          break;
        default:
          Alert.alert(
            'Erro no registro',
            'Ocorreu um erro ao criar sua conta. Por favor, tente novamente.'
          );
      }
    } finally {
      setLoading(false);
      setUploading(false);
      console.groupEnd();
    }
  };

  const getInputBorderColor = (hasError, isEmpty) => {
    if (hasAttemptedSubmit) {
      if (isEmpty) return colors.warning;
      if (hasError) return colors.error;
    }
    return colors.gray[300];
  };

  const getUsernameErrorColor = (error) => {
    if (!error) return null;
    if (error === 'O nome de usuário é obrigatório.') {
      return colors.warning;
    }
    return colors.error;
  };

  const getEmailErrorColor = (error) => {
    if (!error) return null;
    if (error === 'O e-mail é obrigatório. Por favor, insira um e-mail válido.') {
      return colors.warning;
    }
    return colors.error;
  };

  const getPasswordErrorColor = (error) => {
    if (!error) return null;
    if (error === 'A senha é obrigatória. Por favor, insira sua senha.') {
      return colors.warning;
    }
    return colors.error;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    keyboardView: {
      flex: 1,
    },
    content: {
      flex: 1,
      padding: SPACING,
      justifyContent: 'center',
    },
    logoContainer: {
      alignItems: 'flex-start',
      marginBottom: height * 0.01,
      minHeight: height * 0.15,
      justifyContent: 'center',
    },
    mainContent: {
      flex: 1,
      justifyContent: 'flex-start',
    },
    formContainer: {
      width: '100%',
    },
    inputContainer: {
      marginBottom: SPACING,
    },
    input: {
      height: 48,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: SPACING,
      marginTop: SPACING / 2,
      fontSize: 16,
    },
    errorText: {
      fontSize: 12,
      marginTop: 4,
    },
    loginContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: SPACING,
    },
    imageContainer: {
      alignItems: 'center',
      marginBottom: SPACING,
    },
    imageButton: {
      width: 100,
      height: 100,
      borderRadius: 50,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    profileImage: {
      width: '100%',
      height: '100%',
    },
    imagePlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.gray[400],
    },
    imageHelpText: {
      marginTop: SPACING / 2,
      textAlign: 'center',
      fontSize: 12,
    },
    titleContainer: {
      alignItems: 'flex-start',
      marginBottom: SPACING * 2,
    },
    title: {
      marginBottom: SPACING / 2,
      textAlign: 'left',
    },
    subtitle: {
      textAlign: 'left',
      opacity: 0.7,
    },
    scrollContent: {
      flexGrow: 1,
    },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <Logo size={height * 0.1} />
            </View>

            <View style={styles.mainContent}>
              <View style={styles.titleContainer}>
                <Text style={[textStyles.h4, styles.title, { color: colors.text }]}>
                  Crie sua conta
                </Text>
                <Text style={[textStyles.bodySmall, styles.subtitle, { color: colors.text }]}>
                  Preencha seus dados para começar
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.imageContainer}>
                  <TouchableOpacity onPress={pickImage} style={styles.imageButton} activeOpacity={0.7}>
                    {image ? (
                      <Image source={{ uri: image }} style={styles.profileImage} />
                    ) : (
                      <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
                        <Ionicons name="camera" size={32} color={colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                  <Text style={[styles.imageHelpText, { color: colors.text }]}>
                    Clique para adicionar uma foto de perfil
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[textStyles.bodySmall, { color: colors.text }]}>Email</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { 
                        backgroundColor: colors.surface,
                        color: colors.text,
                        borderColor: getInputBorderColor(emailError, !email),
                      }
                    ]}
                    placeholder="Seu email"
                    placeholderTextColor={colors.gray[400]}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setEmailError('');
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  {emailError ? (
                    <Text style={[styles.errorText, { color: getEmailErrorColor(emailError) }]}>{emailError}</Text>
                  ) : null}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[textStyles.bodySmall, { color: colors.text }]}>Nome de Usuário</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { 
                        backgroundColor: colors.surface,
                        color: colors.text,
                        borderColor: getInputBorderColor(usernameError, !username),
                      }
                    ]}
                    placeholder="Seu nome de usuário"
                    placeholderTextColor={colors.gray[400]}
                    value={username}
                    onChangeText={(text) => {
                      setUsername(text);
                      setUsernameError('');
                    }}
                    autoCapitalize="none"
                  />
                  {usernameError ? (
                    <Text style={[styles.errorText, { color: getUsernameErrorColor(usernameError) }]}>{usernameError}</Text>
                  ) : null}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[textStyles.bodySmall, { color: colors.text }]}>Senha</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { 
                        backgroundColor: colors.surface,
                        color: colors.text,
                        borderColor: getInputBorderColor(passwordError, !password),
                      }
                    ]}
                    placeholder="Sua senha"
                    placeholderTextColor={colors.gray[400]}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setPasswordError('');
                    }}
                    secureTextEntry
                  />
                  {passwordError ? (
                    <Text style={[styles.errorText, { color: getPasswordErrorColor(passwordError) }]}>{passwordError}</Text>
                  ) : null}
                </View>

                <Button
                  title={uploading ? "Enviando..." : "Criar conta"}
                  onPress={handleRegister}
                  style={{ marginTop: SPACING }}
                  loading={loading || uploading}
                  disabled={loading || uploading}
                />

                <View style={styles.loginContainer}>
                  <Text style={[textStyles.bodySmall, { color: colors.text }]}>
                    Já tem uma conta?
                  </Text>
                  <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={[textStyles.bodySmall, { color: colors.primary, marginLeft: SPACING / 4 }]}>
                      Faça login
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 