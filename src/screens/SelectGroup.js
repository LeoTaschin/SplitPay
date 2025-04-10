import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  ActivityIndicator,
  SafeAreaView 
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, moderateScale } from '../utils/dimensions';
import { getUserGroups } from '../services/groupService';
import { useFocusEffect } from '@react-navigation/native';

export default function SelectGroup({ navigation }) {
  const { colors, textStyles } = useTheme();
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      const loadGroups = async () => {
        if (!user?.uid) return;
        
        try {
          setLoading(true);
          const groupsList = await getUserGroups(user.uid);
          setGroups(groupsList);
          setError(null);
        } catch (err) {
          console.error('Erro ao carregar grupos:', err);
          setError('Não foi possível carregar seus grupos');
        } finally {
          setLoading(false);
        }
      };

      loadGroups();
    }, [user?.uid])
  );

  const handleSelectGroup = (group) => {
    if (!group?.id) return;
    navigation.navigate('NewDebt', {
      selectedGroup: {
        id: group.id,
        name: group.name || '',
        photoURL: group.photoURL || null,
        members: group.members || []
      }
    });
  };

  const renderGroupItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.itemContainer, { backgroundColor: colors.cardBackground }]}
      onPress={() => handleSelectGroup(item)}
    >
      <View style={styles.avatarContainer}>
        {item.photoURL ? (
          <Image
            source={{ uri: item.photoURL }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="people" size={moderateScale(24)} color={colors.primary} />
          </View>
        )}
      </View>
      <View style={styles.itemInfo}>
        <View style={styles.nameContainer}>
          <Text style={[textStyles.body, { color: colors.text }]}>
            {item.name}
          </Text>
        </View>
        <Text style={[textStyles.caption, { color: colors.text2 }]}>
          {item.members?.length || 0} membros
        </Text>
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={moderateScale(20)} 
        color={colors.text2} 
      />
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={[textStyles.body, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => loadGroups()}
          >
            <Text style={[textStyles.button, { color: colors.white }]}>
              Tentar Novamente
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!user?.uid) {
      return (
        <View style={styles.centerContainer}>
          <Text style={[textStyles.body, { color: colors.textSecondary }]}>
            Faça login para continuar
          </Text>
        </View>
      );
    }

    if (groups.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={[textStyles.body, { color: colors.textSecondary }]}>
            Você ainda não tem grupos criados
          </Text>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Groups')}
          >
            <Text style={[textStyles.button, { color: colors.white }]}>
              Criar Grupo
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={groups}
        renderItem={renderGroupItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons 
            name="close" 
            size={moderateScale(24)} 
            color={colors.text} 
          />
        </TouchableOpacity>
        <Text style={[textStyles.h2, { color: colors.text }]}>
          Selecionar Grupo
        </Text>
        <View style={styles.placeholder} />
      </View>

      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  placeholder: {
    width: moderateScale(24),
  },
  list: {
    padding: SPACING.lg,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: moderateScale(8),
    marginBottom: SPACING.sm,
  },
  avatarContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(20),
  },
  itemInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  retryButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: moderateScale(8),
  },
  addButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: moderateScale(8),
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 