import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../utils/dimensions';
import { Ionicons } from '@expo/vector-icons';

export function Privacy({ navigation }) {
  const { colors, textStyles } = useTheme();
  const [locationSharing, setLocationSharing] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [activitySharing, setActivitySharing] = useState(true);
  const [dataCollection, setDataCollection] = useState(true);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[textStyles.h4, { color: colors.text }]}>Privacidade</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[textStyles.h4, { color: colors.text, marginBottom: SPACING.md }]}>
            Visibilidade
          </Text>
          <View style={styles.settingItem}>
            <View>
              <Text style={[textStyles.body, { color: colors.text }]}>Perfil público</Text>
              <Text style={[textStyles.caption, { color: colors.text2 }]}>
                Permitir que outros usuários vejam seu perfil
              </Text>
            </View>
            <Switch
              value={profileVisibility}
              onValueChange={setProfileVisibility}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <View style={styles.settingItem}>
            <View>
              <Text style={[textStyles.body, { color: colors.text }]}>Compartilhar atividade</Text>
              <Text style={[textStyles.caption, { color: colors.text2 }]}>
                Mostrar suas atividades para amigos
              </Text>
            </View>
            <Switch
              value={activitySharing}
              onValueChange={setActivitySharing}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[textStyles.h4, { color: colors.text, marginBottom: SPACING.md }]}>
            Localização
          </Text>
          <View style={styles.settingItem}>
            <View>
              <Text style={[textStyles.body, { color: colors.text }]}>Compartilhar localização</Text>
              <Text style={[textStyles.caption, { color: colors.text2 }]}>
                Permitir acesso à sua localização
              </Text>
            </View>
            <Switch
              value={locationSharing}
              onValueChange={setLocationSharing}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[textStyles.h4, { color: colors.text, marginBottom: SPACING.md }]}>
            Dados
          </Text>
          <View style={styles.settingItem}>
            <View>
              <Text style={[textStyles.body, { color: colors.text }]}>Coleta de dados</Text>
              <Text style={[textStyles.caption, { color: colors.text2 }]}>
                Permitir coleta de dados para melhorar o serviço
              </Text>
            </View>
            <Switch
              value={dataCollection}
              onValueChange={setDataCollection}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.linkButton, { borderBottomColor: colors.border }]}
          onPress={() => {}}
        >
          <Text style={[textStyles.body, { color: colors.primary }]}>
            Política de Privacidade
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.linkButton, { borderBottomColor: colors.border }]}
          onPress={() => {}}
        >
          <Text style={[textStyles.body, { color: colors.primary }]}>
            Termos de Uso
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>
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
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  linkButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
  },
}); 