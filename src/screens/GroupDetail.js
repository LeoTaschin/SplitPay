import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, moderateScale } from '../utils/dimensions';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db } from '../config/firebase';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';

export function GroupDetail() {
  const { colors, textStyles } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params;
  
  const [group, setGroup] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const unsubscribe = subscribeToGroup();
    return () => unsubscribe();
  }, [groupId]);

  useEffect(() => {
    if (group) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [group]);

  const subscribeToGroup = () => {
    const groupDocRef = doc(db, 'groups', groupId);
    
    const unsubscribe = onSnapshot(groupDocRef, async (groupDoc) => {
      if (groupDoc.exists()) {
        const groupData = {
          id: groupDoc.id,
          ...groupDoc.data(),
          memberCount: groupDoc.data().members?.length || 0
        };
        
        // Buscar informações dos membros
        const membersData = [];
        for (const memberId of groupData.members) {
          try {
            const memberDoc = await getDoc(doc(db, 'users', memberId));
            if (memberDoc.exists()) {
              membersData.push({
                id: memberDoc.id,
                ...memberDoc.data()
              });
            }
          } catch (error) {
            console.error('Erro ao buscar membro:', error);
          }
        }
        
        setMembers(membersData);
        setGroup(groupData);
      }
    }, (error) => {
      console.error('Erro ao observar grupo:', error);
    });
    
    return unsubscribe;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const unsubscribe = subscribeToGroup();
    setRefreshing(false);
    return () => unsubscribe();
  };

  const renderSkeleton = () => (
    <View style={styles.content}>
      <View style={[styles.photoContainer, { backgroundColor: colors.border }]} />
      
      <View style={[styles.skeletonText, { backgroundColor: colors.border, width: '60%', height: moderateScale(24), alignSelf: 'center', marginTop: SPACING.md }]} />
      
      <View style={[styles.skeletonText, { backgroundColor: colors.border, width: '40%', height: moderateScale(16), alignSelf: 'center', marginTop: SPACING.xs }]} />
      
      <View style={[styles.infoContainer, { backgroundColor: colors.card }]}>
        <View style={styles.infoRow}>
          <View style={[styles.skeletonText, { backgroundColor: colors.border, width: '40%', height: moderateScale(16) }]} />
          <View style={[styles.skeletonText, { backgroundColor: colors.border, width: '20%', height: moderateScale(16) }]} />
        </View>
      </View>
      
      <View style={[styles.membersContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.skeletonText, { backgroundColor: colors.border, width: '50%', height: moderateScale(20), marginBottom: SPACING.md }]} />
        
        <View style={styles.membersGrid}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <View key={item} style={styles.memberItem}>
              <View style={[styles.skeletonPhoto, { backgroundColor: colors.border }]} />
              <View style={[styles.skeletonText, { backgroundColor: colors.border, width: '80%', height: moderateScale(14), marginTop: SPACING.xs }]} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  if (!group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[textStyles.h2, { color: colors.text }]}>Detalhes do Grupo</Text>
          <View style={{ width: 24 }} />
        </View>
        {renderSkeleton()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[textStyles.h2, { color: colors.text }]}>Detalhes do Grupo</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={[styles.photoContainer, { backgroundColor: colors.primary + '20' }]}>
            {group.photoURL ? (
              <Image
                source={{ uri: group.photoURL }}
                style={styles.groupPhoto}
              />
            ) : (
              <Ionicons
                name="people"
                size={moderateScale(48)}
                color={colors.primary}
              />
            )}
          </View>

          <Text style={[textStyles.h3, { color: colors.text, textAlign: 'center', marginTop: SPACING.md }]}>
            {group.name}
          </Text>

          <Text style={[textStyles.body, { color: colors.text2, textAlign: 'center', marginTop: SPACING.xs }]}>
            Criado em {new Date(group.createdAt?.toDate()).toLocaleDateString()}
          </Text>

          <View style={[styles.infoContainer, { backgroundColor: colors.card }]}>
            <View style={styles.infoRow}>
              <Text style={[textStyles.body, { color: colors.text2 }]}>Total de Membros</Text>
              <Text style={[textStyles.body, { color: colors.text }]}>{group.memberCount}</Text>
            </View>
          </View>

          <View style={[styles.membersContainer, { backgroundColor: colors.card }]}>
            <Text style={[textStyles.h4, { color: colors.text, marginBottom: SPACING.md }]}>
              Membros do Grupo
            </Text>
            
            <View style={styles.membersGrid}>
              {members.map((member) => (
                <View key={member.id} style={styles.memberItem}>
                  <View style={styles.memberPhotoContainer}>
                    <Image
                      source={{ uri: member.photoURL || 'https://via.placeholder.com/50' }}
                      style={styles.memberPhoto}
                    />
                    {member.id === group.admin && (
                      <View style={[styles.adminBadge, { backgroundColor: colors.primary }]}>
                        <Ionicons name="star" size={10} color={colors.background} />
                      </View>
                    )}
                  </View>
                  <Text 
                    style={[textStyles.bodySmall, { color: colors.text, textAlign: 'center' }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {member.username || member.email}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
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
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: SPACING.xs,
  },
  content: {
    padding: SPACING.md,
  },
  photoContainer: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  groupPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(50),
  },
  infoContainer: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: moderateScale(12),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  membersContainer: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: moderateScale(12),
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  memberItem: {
    width: '31%',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  memberPhoto: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    marginBottom: SPACING.xs,
  },
  memberPhotoContainer: {
    position: 'relative',
    marginBottom: SPACING.xs,
  },
  adminBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: moderateScale(16),
    height: moderateScale(16),
    borderRadius: moderateScale(8),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  // Estilos para o wireframe
  skeletonText: {
    borderRadius: moderateScale(4),
  },
  skeletonPhoto: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    marginBottom: SPACING.xs,
  },
}); 