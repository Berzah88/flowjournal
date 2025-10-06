// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar, View, Button, Text } from 'react-native';
import WelcomeScreen from './screens/WelcomeScreen';
import TutorialScreen from './screens/TutorialScreen';
import MainScreen from './screens/MainScreen';
import AddProjectScreen from './screens/AddProjectScreen';
import ActiveProject from './screens/ActiveProject';
import JournalDetailScreen from './screens/JournalDetailScreen';
import CompletedProjectsScreen from './screens/CompletedProjectsScreen';
import EmotionalJournalScreen from './screens/EmotionalJournalScreen';
import { TaskProvider } from './context/TaskContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { useHasAnyTasks, useTaskLoading } from './hooks/useTaskContext';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalErrorHandler from './utils/GlobalErrorHandler';
import notificationService from './services/NotificationService';
import fcmService from './services/FCMService';
import { useFonts, Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import firebase from '@react-native-firebase/app';

const Stack = createNativeStackNavigator();

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

function AppNavigator() {
  const hasAnyTasks = useHasAnyTasks();
  const isLoading = useTaskLoading();
  const { theme, isLoading: themeLoading } = useTheme();
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    if (!isLoading) {
      setInitialRoute(hasAnyTasks ? "Main" : "Welcome");
    }
  }, [hasAnyTasks, isLoading]);

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

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 App başlatılıyor...');
        
        GlobalErrorHandler.init();

        // Firebase'i google-services.json ile başlat
        try {
          if (!firebase.apps.length) {
            console.log('🔥 Firebase google-services.json ile başlatılıyor...');
            // google-services.json otomatik olarak yüklenecek
            // Manuel config gerekmez
            console.log('✅ Firebase google-services.json ile başlatıldı');
          } else {
            console.log('🔥 Firebase zaten başlatılmış');
          }
          
          // Firebase'in tamamen yüklenmesini bekle
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // FCM servisini başlat
          console.log('🔥 FCM servisi başlatılıyor...');
          const fcmInitialized = await fcmService.init({
            onNotificationReceived: notification => {
              console.log('📱 FCM bildirim alındı:', notification);
            },
            onNotificationResponse: response => {
              console.log('📱 FCM bildirim response:', response);
            },
          });

          if (fcmInitialized) {
            // FCM token'ı al
            const token = await fcmService.getToken();
            console.log('🔥 FCM TOKEN:', token ? token.substring(0, 20) + '...' : 'null');
          } else {
            console.log('❌ FCM servisi başlatılamadı');
          }
        } catch (firebaseError) {
          console.log('🔥 Firebase başlatma hatası:', firebaseError.message);
          console.log('📱 Expo Notifications fallback aktif');
          
          // Fallback: Expo Notifications
          await notificationService.init({
            onNotificationReceived: notification => {
              console.log('📱 Bildirim alındı:', notification);
            },
            onNotificationResponse: response => {
              console.log('📱 Bildirim response:', response);
            },
          });
        }

        // FCM topic sistemi kullanılıyor - local günlük bildirim gerekmez

        global.forceReloadAIFeedback = () => { /* override edilecek */ };
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
