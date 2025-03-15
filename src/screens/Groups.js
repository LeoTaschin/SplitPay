import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, moderateScale } from '../utils/dimensions';

export function Groups() {
  const { colors, textStyles } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons 
            name="people" 
            size={moderateScale(48)} 
            color={colors.primary} 
          />
        </View>
        <Text style={[textStyles.h3, { color: colors.text, textAlign: 'center', marginTop: SPACING.lg }]}>
          Grupos em breve!
        </Text>
        <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center', marginTop: SPACING.md }]}>
          Estamos desenvolvendo essa funcionalidade para você poder dividir despesas em grupo de forma mais fácil.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
}); 