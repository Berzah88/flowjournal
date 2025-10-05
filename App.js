import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from 'react-native';
import WelcomeScreen from './screens/WelcomeScreen';
import TutorialScreen from './screens/TutorialScreen';
import MainScreen from './screens/MainScreen';
import AddProjectScreen from './screens/AddProjectScreen';
import ActiveProject from './screens/ActiveProject';
import JournalDetailScreen from './screens/JournalDetailScreen';
import CompletedProjectsScreen from './screens/CompletedProjectsScreen';
import EmotionalJournalScreen from './screens/EmotionalJournalScreen';
import { TaskProvider } from './context/TaskContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { useHasAnyTasks, useTaskLoading } from './hooks/useTaskContext';
import { useTheme } from './context/ThemeContext';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalErrorHandler from './utils/GlobalErrorHandler';
import notificationService from './services/NotificationService';
import { useFonts, Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';

const Stack = createNativeStackNavigator();

// Themed App component that wraps everything with theme
function ThemedApp() {
  const { theme } = useTheme();
  
  return (
    <>
      <StatusBar 
        barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background} 
      />
      <TaskProvider>
        <AppNavigator />
      </TaskProvider>
    </>
  );
}

// Navigation component that uses TaskContext and Theme
function AppNavigator() {
  const hasAnyTasks = useHasAnyTasks();
  const isLoading = useTaskLoading();
  const { theme, isLoading: themeLoading } = useTheme();
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    if (!isLoading) {
      // Tasks yüklendikten sonra initial route'u belirle
      setInitialRoute(hasAnyTasks ? "Main" : "Welcome");
    }
  }, [hasAnyTasks, isLoading]);

  // Loading state - tasks ve theme yüklenirken
  if (isLoading || themeLoading || !initialRoute) {
    return <LoadingSpinner message="Loading app..." />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Tutorial" component={TutorialScreen} />
        <Stack.Screen name="Main" component={MainScreen} />
        <Stack.Screen name="AddProject" component={AddProjectScreen} />
        <Stack.Screen 
          name="ActiveProject" 
          component={ActiveProject} 
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false
          }}
        />
        <Stack.Screen name="JournalDetail" component={JournalDetailScreen} />
        <Stack.Screen name="CompletedProjects" component={CompletedProjectsScreen} />
        <Stack.Screen name="EmotionalJournal" component={EmotionalJournalScreen} />
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

  // Global error handler'ı ve bildirim servisini initialize et
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 App başlatılıyor...');
        
        // Global error handler'ı başlat
        GlobalErrorHandler.init();
        
        // Bildirim servisini başlat
               console.log('🔔 Bildirim servisi başlatılıyor...');
               await notificationService.initialize();
               console.log('✅ Bildirim servisi başlatıldı');
        
        // Global AI feedback reload fonksiyonu
        global.forceReloadAIFeedback = () => {
          // Bu fonksiyon MainScreen'de override edilecek
        };
        
        console.log('✅ App başarıyla başlatıldı');
      } catch (error) {
        console.error('❌ App initialization hatası:', error);
        GlobalErrorHandler.reportError(error, { context: 'app_initialization' });
      }
    };

    if (fontsLoaded) {
      initializeApp();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    // fontlar yüklenene kadar tek bir render, App sürekli yeniden render olmuyor
    return <LoadingSpinner message="Loading fonts..." />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LanguageProvider>
          <ThemeProvider>
            <ThemedApp />
          </ThemeProvider>
        </LanguageProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
