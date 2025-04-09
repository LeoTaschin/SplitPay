import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { moderateScale } from '../utils/dimensions';

const { width, height } = Dimensions.get('window');

export default function ModernGradient({ fullScreen = false, baseColor = null, topOnly = false }) {
  const { colors } = useTheme();
  const animation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const horizontalAnimation = useRef(new Animated.Value(0)).current;
  
  // Determinar a cor base para o gradiente
  const gradientBaseColor = baseColor || colors.primary;
  
  useEffect(() => {
    const animate = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(animation, {
            toValue: 1,
            duration: 6000,
            useNativeDriver: true,
          }),
          Animated.timing(animation, {
            toValue: 0,
            duration: 6000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scaleAnimation, {
            toValue: 1.05,
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnimation, {
            toValue: 1,
            duration: 8000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(horizontalAnimation, {
            toValue: 1,
            duration: 10000,
            useNativeDriver: true,
          }),
          Animated.timing(horizontalAnimation, {
            toValue: 0,
            duration: 10000,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => animate());
    };

    animate();
  }, []);

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  
  const translateX = horizontalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-5, 5],
  });
  
  return (
    <View style={[
      styles.container, 
      fullScreen && styles.fullScreenContainer,
      topOnly && styles.topOnlyContainer
    ]}>
      <Animated.View 
        style={[
          styles.gradientContainer, 
          fullScreen && styles.fullScreenGradientContainer,
          topOnly && styles.topOnlyGradientContainer,
          { 
            transform: [
              { translateY },
              { translateX },
              { scale: scaleAnimation }
            ] 
          }
        ]}
      >
        <LinearGradient
          colors={[
            gradientBaseColor + '40',
            gradientBaseColor + '35',
            gradientBaseColor + '30',
            gradientBaseColor + '25',
            gradientBaseColor + '20',
            gradientBaseColor + '15',
            gradientBaseColor + '10',
            gradientBaseColor + '05',
            topOnly ? gradientBaseColor + '00' : colors.background
          ]}
          locations={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1]}
          style={styles.gradient}
          start={topOnly ? { x: 0.5, y: 0 } : { x: 0, y: 0 }}
          end={topOnly ? { x: 0.5, y: 1 } : { x: 1, y: 1 }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  topOnlyContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.2, // Reduzido de 30% para 20% da altura da tela
    overflow: 'hidden',
  },
  gradientContainer: {
    position: 'absolute',
    left: -width * 0.2,
    right: -width * 0.2,
    top: -height * 0.2,
    bottom: -height * 0.2,
  },
  fullScreenGradientContainer: {
    left: -width * 0.5,
    right: -width * 0.5,
    top: -height * 0.5,
    bottom: -height * 0.5,
  },
  topOnlyGradientContainer: {
    left: -width * 0.3,
    right: -width * 0.3,
    top: -height * 0.05,
    height: height * 0.3, // Reduzido para manter proporção
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
}); 