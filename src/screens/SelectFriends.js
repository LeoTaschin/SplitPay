import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, moderateScale } from '../utils/dimensions';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useFocusEffect } from '@react-navigation/native';

export default function SelectFriends({ navigation, route }) {
  const { colors, textStyles } = useTheme();
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState(route.params?.selectedFriends || []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      const loadFriends = async () => {
        if (!user?.uid) {
          setError('Faça login para continuar');
          setIsLoading(false);
          return;
        }

        try {
          setIsLoading(true);
          const userRef = collection(db, 'users');
          const userDoc = await getDocs(query(userRef, where('uid', '==', user.uid)));
          
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            const friendsList = userData.friends || [];
            
            if (friendsList.length > 0) {
              const friendsQuery = query(userRef, where('uid', 'in', friendsList));
              const friendsSnapshot = await getDocs(friendsQuery);
              const friendsData = friendsSnapshot.docs.map(doc => ({
                id: doc.data().uid,
                ...doc.data()
              }));
              setFriends(friendsData);
            } else {
              setFriends([]);
            }
            setError(null);
          }
        } catch (error) {
          console.error('Erro ao carregar amigos:', error);
          setError('Não foi possível carregar seus amigos');
        } finally {
          setIsLoading(false);
        }
      };

      loadFriends();
    }, [user?.uid])
  );

  const toggleFriendSelection = (friend) => {
    setSelectedFriends(prev => {
      const isSelected = prev.some(f => f.id === friend.id);
      if (isSelected) {
        return prev.filter(f => f.id !== friend.id);
      } else {
        return [...prev, friend];
      }
    });
  };

  const handleConfirm = () => {
    if (selectedFriends.length === 0) return;
    
    navigation.navigate('NewCharge', {
      selectedFriends,
      type: 'group'
    });
  };

  const renderFriend = ({ item }) => {
    const isSelected = selectedFriends.some(friend => friend.id === item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.friendItem,
          { backgroundColor: colors.card },
          isSelected && { backgroundColor: colors.primary + '20' }
        ]}
        onPress={() => toggleFriendSelection(item)}
      >
        <View style={styles.friendInfo}>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '40' }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {item.username?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.friendDetails}>
            <View style={styles.nameContainer}>
              <Text style={[textStyles.body, { color: colors.text }]}>
                {item.username || item.email}
              </Text>
              {item.isVerified && (
                <Ionicons 
                  name="checkmark-circle" 
                  size={16} 
                  color={colors.primary} 
                  style={styles.verifiedIcon}
                />
              )}
            </View>
            <Text style={[styles.friendEmail, { color: colors.text2 }]}>
              {item.email}
            </Text>
          </View>
        </View>
        
        <View style={[
          styles.checkbox,
          { borderColor: colors.primary },
          isSelected && { backgroundColor: colors.primary }
        ]}>
          {isSelected && (
            <Ionicons name="checkmark" size={16} color={colors.textInvert} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: colors.text }]}>
          Selecionar Amigos
        </Text>

        <TouchableOpacity 
          onPress={handleConfirm}
          disabled={selectedFriends.length === 0}
          style={[
            styles.confirmButton,
            { 
              backgroundColor: colors.primary,
              opacity: selectedFriends.length === 0 ? 0.5 : 1 
            }
          ]}
        >
          <Text style={[styles.confirmButtonText, { color: colors.textInvert }]}>
            Confirmar ({selectedFriends.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : friends.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text2 }]}>
            Você ainda não tem amigos adicionados
          </Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
    paddingHorizontal: SPACING.sm,
    height: Platform.OS === 'ios' ? moderateScale(44) : moderateScale(56),
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  title: {
    fontSize: moderateScale(17),
    fontWeight: '600',
  },
  confirmButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: moderateScale(8),
  },
  confirmButtonText: {
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: moderateScale(15),
    textAlign: 'center',
  },
  listContent: {
    padding: SPACING.md,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: moderateScale(10),
    marginBottom: SPACING.sm,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
  },
  avatarPlaceholder: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  friendDetails: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  friendName: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    marginBottom: SPACING.xs / 2,
  },
  friendEmail: {
    fontSize: moderateScale(13),
  },
  checkbox: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedIcon: {
    marginLeft: SPACING.xs,
  },
}); 