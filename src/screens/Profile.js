import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, moderateScale } from '../utils/dimensions';
import { Logo } from '../components/Logo';
import { useNavigation } from '@react-navigation/native';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Profile({ onEditProfile }) {
  const { colors, textStyles } = useTheme();
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [joinDate, setJoinDate] = useState(null);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsername(userData.username);
            setIsVerified(userData.isVerified || false);
            if (userData.createdAt) {
              setJoinDate(userData.createdAt.toDate());
            }
          }
        } catch (error) {
          console.error('Profile - fetchUserData - Erro:', error);
        }
      }
    };

    if (user?.uid) {
      fetchUserData();
    }
  }, [user]);

  const userProfilePic = user?.photoURL || 'default_profile_pic_url';

  const menuItems = [
    {
      icon: 'person-outline',
      title: 'Editar Perfil',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      icon: 'settings-outline',
      title: 'Configurações',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      icon: 'help-circle-outline',
      title: 'Ajuda',
      onPress: () => navigation.navigate('Help'),
    },
    {
      icon: 'information-circle-outline',
      title: 'Sobre',
      onPress: () => navigation.navigate('About'),
    },
    {
      icon: 'log-out-outline',
      title: 'Sair',
      onPress: async () => {
        try {
          await signOut();
          navigation.navigate('Login');
        } catch (error) {
          console.error('Erro ao fazer logout:', error);
          Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
        }
      },
      color: colors.error,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />
      <View style={[styles.header, { backgroundColor: colors.background }]}>  
        <Logo size={moderateScale(48)} />
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          style={styles.homeButton}
        >
          <Ionicons name="home-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>  
        <View style={styles.headerContent}>
          <View style={styles.photoContainer}>
            <Image
              source={{ uri: userProfilePic }}
              style={[styles.photo, { 
                borderColor: colors.primary,
                backgroundColor: colors.surface 
              }]}
            />
          </View>
          <View style={styles.userInfo}>
            <View style={styles.nameContainer}>
              <Text style={[textStyles.h3, { 
                color: colors.text,
                marginBottom: SPACING.xs 
              }]}>
                {username || 'Usuário'}
              </Text>
              {isVerified && (
                <Ionicons 
                  name="checkmark-circle" 
                  size={20} 
                  color={colors.primary} 
                  style={styles.verifiedIcon}
                />
              )}
            </View>
            <Text style={[textStyles.body, { 
              color: colors.text2,
              marginBottom: SPACING.xs
            }]}>
              {user?.email}
            </Text>
            {joinDate && (
              <Text style={[textStyles.bodySmall, { 
                color: colors.text2
              }]}>
                Membro desde {format(joinDate, "dd/MM/yyyy")}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.menuContainer}>  
          {menuItems.map((item, index) => (
            <React.Fragment key={index}>
              <TouchableOpacity
                style={[styles.menuItem]}
                onPress={item.onPress}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={item.color || colors.primary}
                  />
                  <Text style={[
                    textStyles.body, 
                    { 
                      color: item.color || colors.text,
                      marginLeft: SPACING.md 
                    }
                  ]}>  
                    {item.title}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.text2}
                />
              </TouchableOpacity>
              {index !== menuItems.length - 1 && (
                <View style={[styles.separator, { backgroundColor: colors.border }]} />
              )}
            </React.Fragment>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  content: {
    flex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  photoContainer: {
    marginRight: SPACING.lg,
  },
  photo: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    borderWidth: moderateScale(2),
  },
  userInfo: {
    flex: 1,
  },
  menuContainer: {
    paddingHorizontal: SPACING.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    opacity: 0.5,
    marginVertical: SPACING.xs,
  },
  homeButton: {
    padding: SPACING.xs,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedIcon: {
    marginLeft: SPACING.xs,
  },
}); 