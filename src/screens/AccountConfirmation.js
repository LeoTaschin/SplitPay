import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, SafeAreaView, Dimensions, Keyboard, Alert, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/Button';
import { db, auth } from '../config/firebase';
import { Logo } from '../components/Logo';
import { doc, getDoc } from 'firebase/firestore';
import { SPACING, moderateScale } from '../utils/dimensions';
import { useAuth } from '../hooks/useAuth';
import { signOut } from 'firebase/auth';
import { CustomAlert } from '../components/CustomAlert';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CommonActions } from '@react-navigation/native';

const { height } = Dimensions.get('window');

const TypingUsername = ({ username }) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    if (!username || isTyping) return;
    
    setIsTyping(true);
    let currentIndex = 0;
    
    const typeNextChar = () => {
      if (currentIndex < username.length) {
        setDisplayText(username.substring(0, currentIndex + 1));
        currentIndex++;
        setTimeout(typeNextChar, 100);
      }
    };

    typeNextChar();
  }, [username]);

  return <Text style={{ color: colors.primary, fontWeight: '700' }}>{displayText}</Text>;
};

const TypingUsername2 = ({ username }) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    if (!username || isTyping) return;
    
    setIsTyping(true);
    let currentIndex = 0;
    
    const typeNextChar = () => {
      if (currentIndex < username.length) {
        setDisplayText(username.substring(0, currentIndex + 1));
        currentIndex++;
        setTimeout(typeNextChar, 100);
      }
    };

    typeNextChar();
  }, [username]);

  return <Text style={{ color: colors.text2 }}>{displayText}</Text>;
};

export default function AccountConfirmation({ navigation }) {
  const { colors, textStyles } = useTheme();
  const { user, loading: authLoading, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!user?.uid) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUsername(userDoc.data().username);
        }
      } catch (error) {
        console.error('Erro ao buscar username:', error);
      }
    };

    fetchUsername();
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.uid) {
      navigation.replace('Login');
    }
  }, [user, authLoading, navigation]);

  const handleStartApp = async () => {
    try {
      if (isNavigating) return;

      setIsNavigating(true);

      if (!user?.uid) {
        Alert.alert(
          'Erro',
          'Você foi desconectado. Por favor, faça login novamente.'
        );
        navigation.replace('Login');
        return;
      }

      if (authLoading) return;

      navigation.navigate('Home');
    } catch (error) {
      console.error('Erro ao iniciar app:', error);
      Alert.alert(
        'Erro',
        'Ocorreu um erro ao iniciar o app. Por favor, tente novamente.'
      );
    } finally {
      setIsNavigating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setShowLogoutModal(false);
      navigation.replace('Login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
    }
  };

  const userProfilePic = user?.photoURL || 'default_profile_pic_url';

  const LogoutModal = () => (
    <Modal
      visible={showLogoutModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowLogoutModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
              <Icon name="logout" size={moderateScale(32)} color={colors.error} />
            </View>
            <Text style={[textStyles.h3, { color: colors.text, marginTop: SPACING.md }]}>
              Sair da conta
            </Text>
          </View>
          
          <View style={styles.modalBody}>
            <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center' }]}>
              Tem certeza que deseja sair da sua conta? Você precisará fazer login novamente para acessar o SplitPay.
            </Text>
          </View>

          <View style={styles.modalFooter}>
            <Button 
              title="Sair da conta"
              onPress={handleLogout}
              variant="danger"
            />
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowLogoutModal(false)}
            >
              <Text style={[textStyles.body, { color: colors.text2 }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.logoContainer}>
        <Logo size={height * 0.08} />
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
              Olá, <TypingUsername username={username} />
            </Text>
            <Text style={[textStyles.bodySmall, { color: colors.text, marginTop: SPACING.xs }]}>
              Comece a usar o SplitPay agora!
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button 
              title="Vamos começar!" 
              onPress={handleStartApp}
            />
            
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={() => setShowLogoutModal(true)}
            >
              <Text style={[textStyles.bodySmall, { color: colors.text2 }]}>
                Não é <TypingUsername2 username={username} />? <Text style={{ color: colors.primary }}>Sair</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <LogoutModal />
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
  logoutButton: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: moderateScale(16),
    padding: SPACING.lg,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    width: moderateScale(64),
    height: moderateScale(64),
    borderRadius: moderateScale(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    marginBottom: SPACING.xl,
  },
  modalFooter: {
    gap: SPACING.md,
  },
  cancelButton: {
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 