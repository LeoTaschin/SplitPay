import React from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  Text,
  Platform,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, moderateScale } from '../utils/dimensions';
import { useNavigation } from '@react-navigation/native';

export function BottomToolbar({ activeTab, onTabChange }) {
  const { colors, textStyles } = useTheme();
  const navigation = useNavigation();

  const menuItems = [
    {
      name: 'Amigos',
      icon: 'person',
      tab: 'friends',
      onPress: () => onTabChange('friends'),
    },
    {
      name: 'Grupos',
      icon: 'people',
      tab: 'groups',
      onPress: () => onTabChange('groups'),
    },
    {
      name: 'Novo',
      icon: 'add-sharp',
      tab: 'new',
      isCenter: true,
      onPress: () => onTabChange('new'),
    },
    {
      name: 'Atividade',
      icon: 'pulse',
      tab: 'activity',
      onPress: () => onTabChange('activity'),
    },
    {
      name: 'Perfil',
      icon: 'person-circle',
      tab: 'profile',
      onPress: () => navigation.navigate('Profile'),
    },
  ];

  return (
    <View style={styles.mainContainer}>
      <View style={[
        styles.container,
        { 
          backgroundColor: colors.background,
          borderColor: Platform.OS === 'ios' ? 'rgba(150, 150, 150, 0.2)' : 'rgba(150, 150, 150, 0.3)',
        },
        Platform.OS === 'ios' && styles.iosShadow,
        Platform.OS === 'android' && styles.androidShadow,
      ]}>
        <View style={styles.content}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                item.isCenter && styles.centerMenuItem
              ]}
              onPress={item.onPress}
            >
              {item.isCenter ? (
                <View style={styles.centerButtonWrapper}>
                  <View style={[styles.centerButton, { backgroundColor: colors.primary }]}>
                    <Ionicons 
                      name={item.icon}
                      size={38} 
                      color={colors.white}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.iconContainer}>
                  {activeTab === item.tab && (
                    <View style={[styles.indicator, { backgroundColor: colors.primary }]} />
                  )}
                  <Ionicons 
                    name={item.icon} 
                    size={28}
                    color={activeTab === item.tab ? colors.primary : colors.text2}
                  />
                  <Text style={[
                    styles.menuText, 
                    { 
                      color: activeTab === item.tab ? colors.primary : colors.text2
                    }
                  ]}>
                    {item.name}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  container: {
    width: '100%',
    borderWidth: moderateScale(1),
    borderBottomWidth: 0,
    borderTopLeftRadius: moderateScale(30),
    borderTopRightRadius: moderateScale(30),
    paddingBottom: Platform.OS === 'ios' ? moderateScale(20) : 0,
    overflow: 'visible',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  menuItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: moderateScale(60),
  },
  centerMenuItem: {
    height: moderateScale(90),
    marginTop: moderateScale(-30),
  },
  centerButtonWrapper: {
    height: '100%',
    justifyContent: 'flex-start',
    paddingTop: moderateScale(5),
  },
  centerButton: {
    width: moderateScale(70),
    height: moderateScale(70),
    borderRadius: moderateScale(15),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: moderateScale(2),
    },
    shadowOpacity: 0.25,
    shadowRadius: moderateScale(3.84),
    elevation: 5,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    position: 'relative',
    height: '100%',
  },
  menuText: {
    fontSize: moderateScale(12),
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  indicator: {
    position: 'absolute',
    top: moderateScale(-15),
    width: moderateScale(30),
    height: moderateScale(4),
    borderRadius: moderateScale(2),
  },
  iosShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  androidShadow: {
    elevation: 5,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        shadowColor: '#000',
      },
    }),
  },
  modalContainer: {
    flex: 1,
    marginTop: moderateScale(100),
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        shadowColor: '#000',
      },
    }),
  },
}); 