import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, moderateScale } from '../utils/dimensions';

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  error,
  ...props
}) {
  const { colors, textStyles } = useTheme();

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[textStyles.body, { color: colors.text, marginBottom: SPACING.xs }]}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: error ? colors.error : colors.border,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text2}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        {...props}
      />
      {error && (
        <Text style={[textStyles.caption, { color: colors.error, marginTop: SPACING.xs }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    width: '100%',
    height: moderateScale(48),
    borderWidth: 1,
    borderRadius: moderateScale(10),
    paddingHorizontal: SPACING.md,
    fontSize: moderateScale(16),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        shadowColor: '#000',
      },
    }),
  },
}); 