import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const LOGO_SIZE = 80;
const FONT_SCALE = 0.35;

export function Logo({ size = LOGO_SIZE }) {
  const { textStyles, colors } = useTheme();
  const fontSize = Math.floor(size * FONT_SCALE);
  const iconSize = Math.floor(fontSize * 1.5);
  
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <View style={styles.iconContainer}>
          <Image 
            source={require('../assets/images/Logo SplitPay.png')}
            style={{
              width: iconSize,
              height: iconSize,
              resizeMode: 'contain'
            }}
          />
        </View>
        <View style={styles.textWrapper}>
          <Text 
            style={[
              styles.text,
              styles.splitText,
              { 
                fontSize, 
                color: colors.primary,
                lineHeight: Math.floor(fontSize * 1.2),
              }
            ]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            Split
          </Text>
          <Text 
            style={[
              styles.text,
              styles.payText,
              { 
                fontSize, 
                color: colors.text,
                lineHeight: Math.floor(fontSize * 1.2),
              }
            ]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            Pay
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  splitText: {
    fontWeight: '700',
  },
  payText: {
    fontWeight: '300',
  }
});