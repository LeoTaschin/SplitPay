import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { moderateScale } from '../utils/dimensions';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import AccountConfirmation from '../screens/AccountConfirmation';
import HomeScreen from '../screens/Home';
import { Friends } from '../screens/Friends';
import { Groups } from '../screens/Groups';
import NewCharge from '../screens/NewCharge';
import SelectFriends from '../screens/SelectFriends';
import SelectDebtTarget from '../screens/SelectDebtTarget';
import Home from '../screens/Home';
import { Profile } from '../screens/Profile';
import { NewDebt } from '../screens/NewDebt';
import { Activity } from '../screens/Activity';
import { EditProfile } from '../screens/EditProfile';
import { Settings } from '../screens/Settings';
import { NotificationsScreen } from '../screens/Notifications';
import { Privacy } from '../screens/Privacy';
import { Help } from '../screens/Help';
import { About } from '../screens/About';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Friends') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Activity') {
            iconName = focused ? 'pulse' : 'pulse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text2,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: moderateScale(8),
          paddingTop: moderateScale(8),
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Friends" component={Friends} />
      <Tab.Screen name="Activity" component={Activity} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // ou um componente de loading
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={user ? "AccountConfirmation" : "Splash"}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 500,
          contentStyle: {
            backgroundColor: 'transparent',
          },
        }}
      >
        {!user ? (
          // Rotas públicas
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : (
          // Rotas privadas
          <>
            <Stack.Screen name="AccountConfirmation" component={AccountConfirmation} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen 
              name="Groups" 
              component={Groups}
              options={{
                animation: 'slide_from_right',
                animationDuration: 300,
              }}
            />
            <Stack.Screen 
              name="SelectDebtTarget" 
              component={SelectDebtTarget}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                animationDuration: 300,
              }}
            />
            <Stack.Screen 
              name="NewCharge" 
              component={NewCharge}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                animationDuration: 300,
              }}
            />
            <Stack.Screen 
              name="SelectFriends" 
              component={SelectFriends}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                animationDuration: 300,
              }}
            />
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen 
              name="NewDebt" 
              component={NewDebt}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                animationDuration: 300,
              }}
            />
            <Stack.Screen 
              name="Profile" 
              component={Profile}
              options={{
                animation: 'slide_from_right',
                animationDuration: 300,
              }}
            />
            <Stack.Screen 
              name="EditProfile" 
              component={EditProfile}
              options={{
                animation: 'slide_from_right',
                animationDuration: 300,
              }}
            />
            <Stack.Screen 
              name="Settings" 
              component={Settings}
              options={{
                animation: 'slide_from_right',
                animationDuration: 300,
              }}
            />
            <Stack.Screen 
              name="NotificationsScreen" 
              component={NotificationsScreen}
              options={{
                animation: 'slide_from_right',
                animationDuration: 300,
              }}
            />
            <Stack.Screen 
              name="Privacy" 
              component={Privacy}
              options={{
                animation: 'slide_from_right',
                animationDuration: 300,
              }}
            />
            <Stack.Screen 
              name="Help" 
              component={Help}
              options={{
                animation: 'slide_from_right',
                animationDuration: 300,
              }}
            />
            <Stack.Screen 
              name="About" 
              component={About}
              options={{
                animation: 'slide_from_right',
                animationDuration: 300,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 