import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Logo } from '../components/Logo';
import { useAuth } from '../hooks/useAuth';

const { height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const { colors } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Anima o logo com fade-in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Sequência de animação e navegação
    const timer = setTimeout(() => {
      // Se estiver carregando a autenticação, espera
      if (authLoading) {
        return;
      }

      // Se o usuário estiver autenticado, vai para Home
      if (user) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        // Se não estiver autenticado, vai para Login
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    }, 2000); // 2 segundos de animação

    return () => clearTimeout(timer);
  }, [user, authLoading]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Logo size={height * 0.15} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 