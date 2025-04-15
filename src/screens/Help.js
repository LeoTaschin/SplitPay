import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../utils/dimensions';
import { Ionicons } from '@expo/vector-icons';

export function Help({ navigation }) {
  const { colors, textStyles } = useTheme();
  const supportEmail = 'leoctaschin@gmail.com';
  const lastUpdate = new Date().toLocaleString();

  const handleEmailSupport = () => {
    Linking.openURL(`mailto:${supportEmail}`);
  };

  const faqItems = [
    {
      question: 'Como criar um novo grupo?',
      answer: 'Para criar um novo grupo, vá para a tela inicial e toque no botão "+" no canto inferior direito. Em seguida, selecione "Novo Grupo" e siga as instruções.'
    },
    {
      question: 'Como adicionar uma nova despesa?',
      answer: 'Dentro de um grupo, toque no botão "+" e selecione "Nova Despesa". Preencha os detalhes da despesa e selecione os participantes envolvidos.'
    },
    {
      question: 'Como dividir uma conta?',
      answer: 'Ao adicionar uma despesa, você pode escolher entre divisão igual ou personalizada. Selecione os participantes e ajuste os valores conforme necessário.'
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[textStyles.h4, { color: colors.text }]}>Ajuda</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[textStyles.h4, { color: colors.text, marginBottom: SPACING.md }]}>
            Contato
          </Text>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={handleEmailSupport}
          >
            <View style={styles.contactInfo}>
              <Ionicons name="mail-outline" size={24} color={colors.primary} />
              <View style={styles.contactText}>
                <Text style={[textStyles.body, { color: colors.text }]}>Email de suporte</Text>
                <Text style={[textStyles.caption, { color: colors.text2 }]}>{supportEmail}</Text>
                <Text style={[textStyles.caption, { color: colors.text2, marginTop: 4 }]}>Última atualização: {lastUpdate}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text2} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[textStyles.h4, { color: colors.text, marginBottom: SPACING.lg }]}>
            Perguntas frequentes
          </Text>
          {faqItems.map((item, index) => (
            <View 
              key={index} 
              style={[
                styles.faqItem, 
                { borderBottomColor: colors.border },
                index === faqItems.length - 1 && { borderBottomWidth: 0 }
              ]}
            >
              <Text style={[textStyles.bodyBold, { color: colors.text, marginBottom: SPACING.xs }]}>
                {item.question}
              </Text>
              <Text style={[textStyles.body, { color: colors.text2 }]}>
                {item.answer}
              </Text>
            </View>
          ))}
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
  section: {
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    marginLeft: SPACING.md,
  },
  faqItem: {
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
  },
}); 