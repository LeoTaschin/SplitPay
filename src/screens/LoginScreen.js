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
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/Logo';
import { Button } from '../components/Button';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import AccountConfirmation from '../screens/AccountConfirmation';


const SPACING = 20;
const { height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const { colors, textStyles } = useTheme();
  const { saveCredentials } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);

  const handleLogin = async () => {
    // Set hasAttemptedLogin to true on first attempt
    setHasAttemptedLogin(true);
    
    // Reset errors
    setEmailError('');
    setPasswordError('');

    if (!email) {
      setEmailError('O e-mail é obrigatório. Por favor, insira um e-mail válido.');
      return;
    }

    if (!password) {
      setPasswordError('A senha é obrigatória. Por favor, insira sua senha.');
      return;
    }

    try {
      setLoading(true);
      console.log('Tentando fazer login com:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login bem-sucedido:', userCredential.user.email);
      
      // Primeiro salvamos as credenciais
      await saveCredentials(email, password);
      console.log('Credenciais salvas com sucesso');
      
      // Depois fazemos a navegação
      navigation.reset({
        index: 0,
        routes: [{ name: 'AccountConfirmation' }],
      });
      
    } catch (error) {
      console.log('Erro completo:', error);
      console.log('Código do erro:', error.code);
      console.log('Mensagem do erro:', error.message);
      
      switch (error.code) {
        case 'auth/invalid-email':
          setEmailError('Email inválido');
          break;
        case 'auth/user-disabled':
          setEmailError('Usuário desativado');
          break;
        case 'auth/wrong-password':
          setPasswordError('Senha incorreta');
          break;
        case 'auth/user-not-found':
          setEmailError('Usuário não encontrado');
          break;
        case 'auth/invalid-credential':
          setEmailError('Credenciais inválidas');
          setPasswordError('Credenciais inválidas');
          break;
        default:
          Alert.alert('Erro', `Erro ao fazer login: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getInputBorderColor = (hasError, isEmpty) => {
    if (hasAttemptedLogin) {
      if (isEmpty) return colors.warning;
      if (hasError) return colors.error;
    }
    return colors.gray[300];
  };

  const getEmailErrorColor = (error) => {
    if (!error) return null;
    // Check if it's the empty field warning
    if (error === 'O e-mail é obrigatório. Por favor, insira um e-mail válido.') {
      return colors.warning;
    }
    // For all other errors (validation errors), use red
    return colors.error;
  };

  const getPasswordErrorColor = (error) => {
    if (!error) return null;
    // Check if it's the empty field warning
    if (error === 'A senha é obrigatória. Por favor, insira sua senha.') {
      return colors.warning;
    }
    // For all other errors (validation errors), use red
    return colors.error;
  };

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
              <Text style={[textStyles.h4, { color: colors.text, marginBottom: SPACING }]}>
                Acesse sua conta
              </Text>

              <View style={styles.formContainer}>
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

                <TouchableOpacity 
                  onPress={() => navigation.navigate('ForgotPassword')}
                  style={styles.forgotPassword}
                >
                  <Text style={[textStyles.bodySmall, { color: colors.primary }]}>
                    Esqueceu sua senha?
                  </Text>
                </TouchableOpacity>

                <Button
                  title="Entrar"
                  onPress={handleLogin}
                  style={{ marginTop: SPACING }}
                  loading={loading}
                />

                <View style={styles.registerContainer}>
                  <Text style={[textStyles.bodySmall, { color: colors.text }]}>
                    Ainda não tem conta?
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={[textStyles.bodySmall, { color: colors.primary, marginLeft: SPACING / 4 }]}>
                      Cadastre-se
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: height,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: SPACING / 2,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING,
  },
}); 