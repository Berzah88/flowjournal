// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar, View, Button, Text } from 'react-native';
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
import { EducationProvider } from './context/EducationContext';
import { useHasAnyTasks, useTaskLoading } from './hooks/useTaskContext';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalErrorHandler from './utils/GlobalErrorHandler';
import fcmService from './services/FCMService';
import firestoreService from './services/FirestoreService';
import permissionManager from './services/PermissionManager';
// import projectDeadlineService from './services/ProjectDeadlineService'; // ⚠️ KALDIRILDI - Firestore token sistemi kullanılıyor
import { useFonts, Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
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
      setInitialRoute(hasAnyTasks ? "Main" : "Tutorial");
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

        // Firebase kontrol et (@react-native-firebase otomatik başlar google-services.json ile)
        try {
          console.log('🔥 Firebase durumu kontrol ediliyor...');
          // app zaten default olarak başlatılmış, kontrol gerekmez
          console.log('✅ Firebase otomatik başlatıldı (google-services.json)');
          
          // FCM servisini başlat (sadece FCM, local notifications YOK)
          console.log('🔥 FCM servisi başlatılıyor...');
          const fcmInitialized = await fcmService.init();

          if (fcmInitialized) {
            // FCM token'ı al
            const fcmToken = await fcmService.getToken();
            
            // ℹ️ Firestore servisi kendi başlatılıyor (constructor'da)
            // User ID ve FCM token zaten FirestoreService.initializeService() içinde ayarlanıyor
            // Burada tekrar ayarlamaya gerek yok
            
            // Otomatik olarak daily reminders topic'ine subscribe ol
            console.log('📖 Daily reminders topic\'ine subscribe olunuyor...');
            const subscribed = await fcmService.subscribeToDailyReminders();
            if (subscribed) {
              console.log('✅ Daily reminders topic\'ine subscribe olundu!');
              console.log('✅ Bildirimler PythonAnywhere + FCM ile gelecek');
              
              // ⚠️ Last_day topic sistemi KALDIRILDI
              // Artık Firestore token-based sistem kullanılıyor
              // Backend check_project_deadlines.py kişiselleştirilmiş bildirimler gönderiyor
            }
          }
        } catch (firebaseError) {
          console.error('🔥 Firebase başlatma hatası:', firebaseError.message);
        }

        global.forceReloadAIFeedback = () => { /* override edilecek */ };
        
        // İzinleri iste (ilk açılışta)
        console.log('🔐 İzinler kontrol ediliyor...');
        await permissionManager.requestAllPermissions();
        
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
            <EducationProvider>
              <ThemedApp />
            </EducationProvider>
          </ThemeProvider>
        </LanguageProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
