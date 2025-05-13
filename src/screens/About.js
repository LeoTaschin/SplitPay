import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, moderateScale } from '../utils/dimensions';
import { Ionicons } from '@expo/vector-icons';
import { Logo } from '../components/Logo';

export function About({ navigation }) {
  const { colors, textStyles } = useTheme();
  const appVersion = '1.0.0';
  const buildNumber = '1';

  const handleOpenWebsite = () => {
    Linking.openURL('https://apptapago.com');
  };

  const handleOpenInstagram = () => {
    Linking.openURL('https://instagram.com/appsplitpay');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[textStyles.h4, { color: colors.text }]}>Sobre</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.logoSection}>
          <Logo size={moderateScale(80)} />
          <Text style={[textStyles.caption, { color: colors.text2 }]}>
            Versão {appVersion} ({buildNumber})
          </Text>
        </View>

        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[textStyles.h4, { color: colors.text, marginBottom: SPACING.md }]}>
            Sobre o SplitPay
          </Text>
          <Text style={[textStyles.body, { color: colors.text2, textAlign: 'justify' }]}>
            O SplitPay é um aplicativo de divisão de contas que torna mais fácil 
            gerenciar despesas compartilhadas com amigos, família ou colegas de trabalho. 
            Com uma interface intuitiva e recursos poderosos, o SplitPay ajuda você a 
            manter suas finanças organizadas e seus relacionamentos saudáveis.
          </Text>
        </View>

        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[textStyles.h4, { color: colors.text, marginBottom: SPACING.md }]}>
            Redes Sociais
          </Text>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={handleOpenInstagram}
          >
            <View style={styles.socialInfo}>
              <Ionicons name="logo-instagram" size={24} color={colors.primary} />
              <Text style={[textStyles.body, { color: colors.text, marginLeft: SPACING.md }]}>
                @appsplitpay
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text2} />
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[textStyles.h4, { color: colors.text, marginBottom: SPACING.md }]}>
            Website
          </Text>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={handleOpenWebsite}
          >
            <View style={styles.socialInfo}>
              <Ionicons name="globe-outline" size={24} color={colors.primary} />
              <Text style={[textStyles.body, { color: colors.text, marginLeft: SPACING.md }]}>
                apptapago.com
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text2} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[textStyles.caption, { color: colors.text2, textAlign: 'center' }]}>
            © 2024 SplitPay. Todos os direitos reservados.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  section: {
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  socialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 