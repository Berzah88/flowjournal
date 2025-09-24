import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from 'react-native';
import WelcomeScreen from './screens/WelcomeScreen';
import MainScreen from './screens/MainScreen';
import AddProjectScreen from './screens/AddProjectScreen';
import ActiveProject from './screens/ActiveProject';
import ActiveMilestone from './screens/ActiveMilestone';
import { TaskProvider } from './context/TaskContext';
import LoadingSpinner from './components/LoadingSpinner';
import { useFonts, Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  if (!fontsLoaded) {
    // fontlar yüklenene kadar tek bir render, App sürekli yeniden render olmuyor
    return <LoadingSpinner message="Loading fonts..." />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <TaskProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Main" component={MainScreen} />
            <Stack.Screen name="AddProject" component={AddProjectScreen} />
            <Stack.Screen name="ActiveProject" component={ActiveProject} />
            <Stack.Screen name="ActiveMilestone" component={ActiveMilestone} />
          </Stack.Navigator>
        </NavigationContainer>
      </TaskProvider>
    </GestureHandlerRootView>
  );
}
