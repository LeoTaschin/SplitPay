import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { moderateScale } from '../utils/dimensions';

const { width, height } = Dimensions.get('window');

export default function ModernGradient() {
  const { colors } = useTheme();
  const animation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const horizontalAnimation = useRef(new Animated.Value(0)).current;
  
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
    outputRange: [0, -20],
  });
  
  const translateX = horizontalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 10],
  });
  
  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.gradientContainer, 
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
            colors.primary + '70',
            colors.primary + '60',
            colors.primary + '50',
            colors.primary + '40',
            colors.primary + '30',
            colors.primary + '20',
            colors.primary + '10',
            colors.primary + '05',
            colors.background
          ]}
          locations={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 1]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 0.6 }}
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
  gradientContainer: {
    position: 'absolute',
    left: -width * 0.1,
    right: -width * 0.1,
    top: -height * 0.1,
    bottom: -height * 0.1,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
}); 