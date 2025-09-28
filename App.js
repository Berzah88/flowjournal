import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from 'react-native';
import WelcomeScreen from './screens/WelcomeScreen';
import MainScreen from './screens/MainScreen';
import AddProjectScreen from './screens/AddProjectScreen';
import ActiveProject from './screens/ActiveProject';
import ActiveMilestone from './screens/ActiveMilestone';
import JournalDetailScreen from './screens/JournalDetailScreen';
import CompletedProjectsScreen from './screens/CompletedProjectsScreen';
import { TaskProvider } from './context/TaskContext';
import { useHasAnyTasks, useTaskLoading } from './hooks/useTaskContext';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { useFonts, Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';

const Stack = createNativeStackNavigator();

// Navigation component that uses TaskContext
function AppNavigator() {
  const hasAnyTasks = useHasAnyTasks();
  const isLoading = useTaskLoading();
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    if (!isLoading) {
      // Tasks yüklendikten sonra initial route'u belirle
      setInitialRoute(hasAnyTasks ? "Main" : "Welcome");
    }
  }, [hasAnyTasks, isLoading]);

  // Loading state - tasks yüklenirken
  if (isLoading || !initialRoute) {
    return <LoadingSpinner message="Loading app..." />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Main" component={MainScreen} />
        <Stack.Screen name="AddProject" component={AddProjectScreen} />
        <Stack.Screen name="ActiveProject" component={ActiveProject} />
        <Stack.Screen name="ActiveMilestone" component={ActiveMilestone} />
        <Stack.Screen name="JournalDetail" component={JournalDetailScreen} />
        <Stack.Screen name="CompletedProjects" component={CompletedProjectsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

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
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <TaskProvider>
          <AppNavigator />
        </TaskProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
