import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';

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

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 500,
          contentStyle: {
            backgroundColor: 'transparent',
          },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="AccountConfirmation" component={AccountConfirmation} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen 
          name="Friends" 
          component={Friends}
          options={{
            animation: 'slide_from_right',
            animationDuration: 300,
          }}
        />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
} 