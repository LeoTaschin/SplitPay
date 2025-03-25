import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, SafeAreaView, Dimensions, Keyboard, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/Button';
import { db } from '../config/firebase';
import { Logo } from '../components/Logo';
import { doc, getDoc } from 'firebase/firestore';
import { SPACING, moderateScale } from '../utils/dimensions';
import { useAuth } from '../hooks/useAuth';

const { height } = Dimensions.get('window');

export default function AccountConfirmation({ navigation }) {
  const { colors, textStyles } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    console.log('AccountConfirmation - useEffect - Montando componente');
    console.log('AccountConfirmation - useEffect - Estado:', {
      uid: user?.uid,
      email: user?.email,
      authLoading,
      isNavigating
    });

    // Se estiver carregando, não faz nada
    if (authLoading) {
      console.log('AccountConfirmation - useEffect - Carregando autenticação, aguardando...');
      return;
    }

    // Se não estiver autenticado, redirecionar para login
    if (!user?.uid) {
      console.log('AccountConfirmation - useEffect - Usuário não autenticado, redirecionando para login');
      navigation.replace('Login');
      return;
    }
    
    // Desativa o teclado quando a tela é montada
    Keyboard.dismiss();
    
    const fetchUsername = async () => {
      if (user?.uid) {
        try {
          console.log('AccountConfirmation - fetchUsername - Buscando username para:', user.uid);
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const username = userDoc.data().username;
            console.log('AccountConfirmation - fetchUsername - Username encontrado:', username);
            setUsername(username);
          } else {
            console.log('AccountConfirmation - fetchUsername - Documento do usuário não encontrado');
          }
        } catch (error) {
          console.error('AccountConfirmation - fetchUsername - Erro:', error);
        }
      } else {
        console.log('AccountConfirmation - fetchUsername - Usuário não autenticado');
      }
    };

    if (user?.uid) {
      fetchUsername();
    }

    // Adiciona listeners para garantir que o teclado permaneça fechado
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        Keyboard.dismiss();
      }
    );

    return () => {
      console.log('AccountConfirmation - useEffect - Desmontando componente');
      keyboardDidShowListener.remove();
    };
  }, [user, authLoading]);

  const handleStartApp = async () => {
    try {
      // Previne múltiplos cliques
      if (isNavigating) {
        console.log('AccountConfirmation - handleStartApp - Já está navegando, ignorando clique');
        return;
      }

      setIsNavigating(true);
      console.log('AccountConfirmation - handleStartApp - INÍCIO');
      console.log('AccountConfirmation - handleStartApp - Estado:', {
        uid: user?.uid,
        email: user?.email,
        username,
        photoURL: user?.photoURL,
        isAuthenticated: !!user,
        authLoading
      });

      // Verifica se ainda está autenticado antes de navegar
      if (!user?.uid) {
        console.error('AccountConfirmation - handleStartApp - ERRO: Usuário não está autenticado');
        Alert.alert(
          'Erro',
          'Você foi desconectado. Por favor, faça login novamente.'
        );
        navigation.replace('Login');
        return;
      }

      // Se estiver carregando, espera
      if (authLoading) {
        console.log('AccountConfirmation - handleStartApp - Aguardando carregamento da autenticação');
        return;
      }

      console.log('AccountConfirmation - handleStartApp - Navegando para Home');
      navigation.navigate('Home');
      console.log('AccountConfirmation - handleStartApp - Navegação para Home concluída');
    } catch (error) {
      console.error('AccountConfirmation - handleStartApp - ERRO:', error);
      Alert.alert(
        'Erro',
        'Ocorreu um erro ao iniciar o app. Por favor, tente novamente.'
      );
    } finally {
      setIsNavigating(false);
    }
  };

  const userProfilePic = user?.photoURL || 'default_profile_pic_url';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.logoContainer}>
        <Logo size={height * 0.1} />
      </View>
      
      <View style={styles.mainContent}>
        <View style={styles.content}>
          <View style={styles.welcomeContainer}>
            <Text style={[textStyles.h3, { color: colors.text }]}>
              Bem-vindo ao SplitPay!
            </Text>
            <Text style={[textStyles.subText, { color: colors.text, textAlign: 'center', marginTop: SPACING.sm }]}>
              Divida contas e faça pagamentos com amigos de forma simples.
            </Text>
          </View>

          <View style={styles.profileContainer}>
            <Image 
              source={{ uri: userProfilePic }} 
              style={[styles.profilePic, { borderColor: colors.primary }]} 
            />
            <Text style={[textStyles.body, { color: colors.text, marginTop: SPACING.sm }]}>
              Olá, {username || 'Usuário'}
            </Text>
            <Text style={[textStyles.bodySmall, { color: colors.primary, marginTop: SPACING.xs }]}>
              Comece a usar o SplitPay agora!
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button 
              title="Vamos começar!" 
              onPress={handleStartApp}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    minHeight: height * 0.08,
    justifyContent: 'center',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    marginTop: -SPACING.xxl * 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  welcomeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  profileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  profilePic: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    borderWidth: moderateScale(2),
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
}); 