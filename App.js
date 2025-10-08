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
import fcmService from './services/FCMService';
import { useFonts, Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import firebase from '@react-native-firebase/app';
import * as Notifications from 'expo-notifications';

// Expo Notifications sadece FCM mesajlarını göstermek için gerekli
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 320,
        }}
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

        // Firebase'i gerçek config ile başlat
        try {
          if (!firebase.apps.length) {
            console.log('🔥 Firebase gerçek config ile başlatılıyor...');
            // google-services.json'dan alınan gerçek config
            const firebaseConfig = {
              apiKey: "AIzaSyB0OqpZFtS57VqyJk4Mgw5MZj0hM4nInWU",
              authDomain: "flowjournal-731f7.firebaseapp.com",
              projectId: "flowjournal-731f7", 
              storageBucket: "flowjournal-731f7.firebasestorage.app",
              messagingSenderId: "601452542639",
              appId: "1:601452542639:android:53caff94d5e5660e6b725a",
              databaseURL: "https://flowjournal-731f7-default-rtdb.firebaseio.com/"
            };
            
            await firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase gerçek config ile başlatıldı');
          } else {
            console.log('🔥 Firebase zaten başlatılmış');
          }
          
          // Firebase'in tamamen yüklenmesini bekle
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // FCM servisini başlat (sadece FCM, local notifications YOK)
          console.log('🔥 FCM servisi başlatılıyor...');
          const fcmInitialized = await fcmService.init();

          if (fcmInitialized) {
            // FCM token'ı al
            await fcmService.getToken();
            
            // Otomatik olarak daily reminders topic'ine subscribe ol
            console.log('📖 Daily reminders topic\'ine subscribe olunuyor...');
            const subscribed = await fcmService.subscribeToDailyReminders();
            if (subscribed) {
              console.log('✅ Daily reminders topic\'ine subscribe olundu!');
              console.log('✅ Bildirimler PythonAnywhere + FCM ile gelecek');
            }
          }
        } catch (firebaseError) {
          console.error('🔥 Firebase başlatma hatası:', firebaseError.message);
        }

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
