// services/PermissionManager.js
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';

const STORAGE_KEY = 'permissions_requested_v1';

class PermissionManager {
  constructor() {
    this.permissionsRequested = false;
  }

  // Check if permissions have been requested before
  async hasRequestedPermissions() {
    try {
      const requested = await AsyncStorage.getItem(STORAGE_KEY);
      return requested === 'true';
    } catch (error) {
      console.error('Error checking permission status:', error);
      return false;
    }
  }

  // Mark permissions as requested
  async markPermissionsRequested() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
      this.permissionsRequested = true;
    } catch (error) {
      console.error('Error marking permissions:', error);
    }
  }

  // Request Notification Permission
  async requestNotificationPermission() {
    try {
      console.log('📢 Bildirim izni isteniyor...');
      
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === 'granted') {
        console.log('✅ Bildirim izni zaten verilmiş');
        return true;
      }
      
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ Bildirim izni verildi');
        return true;
      } else {
        console.log('❌ Bildirim izni reddedildi');
        return false;
      }
    } catch (error) {
      console.error('❌ Bildirim izni hatası:', error);
      return false;
    }
  }

  // Request Location Permission
  async requestLocationPermission() {
    try {
      console.log('📍 Konum izni isteniyor...');
      
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus === 'granted') {
        console.log('✅ Konum izni zaten verilmiş');
        return true;
      }
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ Konum izni verildi');
        return true;
      } else {
        console.log('❌ Konum izni reddedildi');
        return false;
      }
    } catch (error) {
      console.error('❌ Konum izni hatası:', error);
      return false;
    }
  }

  // Request Media Library Permission
  async requestMediaLibraryPermission() {
    try {
      console.log('📸 Galeri izni isteniyor...');
      
      const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      if (existingStatus === 'granted') {
        console.log('✅ Galeri izni zaten verilmiş');
        return true;
      }
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ Galeri izni verildi');
        return true;
      } else {
        console.log('❌ Galeri izni reddedildi');
        return false;
      }
    } catch (error) {
      console.error('❌ Galeri izni hatası:', error);
      return false;
    }
  }

  // Request all permissions at once (on first launch)
  async requestAllPermissions() {
    try {
      // Check if already requested
      const alreadyRequested = await this.hasRequestedPermissions();
      
      if (alreadyRequested) {
        console.log('ℹ️ İzinler daha önce istendi, tekrar sorulmayacak');
        return;
      }

      console.log('🎯 İlk açılış: Tüm izinler isteniyor...');
      
      // Small delay to let app fully load
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Request permissions one by one with small delays
      const notificationGranted = await this.requestNotificationPermission();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const locationGranted = await this.requestLocationPermission();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mediaGranted = await this.requestMediaLibraryPermission();
      
      // Mark as requested
      await this.markPermissionsRequested();
      
      console.log('✅ İzin isteme tamamlandı:', {
        notification: notificationGranted,
        location: locationGranted,
        media: mediaGranted
      });
      
      return {
        notification: notificationGranted,
        location: locationGranted,
        media: mediaGranted
      };
      
    } catch (error) {
      console.error('❌ İzin isteme hatası:', error);
      // Still mark as requested to avoid repeated prompts
      await this.markPermissionsRequested();
    }
  }

  // Get current permission status (for settings screen)
  async getPermissionStatus() {
    try {
      const notification = await Notifications.getPermissionsAsync();
      const location = await Location.getForegroundPermissionsAsync();
      const media = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      return {
        notification: notification.status === 'granted',
        location: location.status === 'granted',
        media: media.status === 'granted'
      };
    } catch (error) {
      console.error('Error getting permission status:', error);
      return {
        notification: false,
        location: false,
        media: false
      };
    }
  }

  // Reset permission request flag (for testing)
  async resetPermissionRequest() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      this.permissionsRequested = false;
      console.log('🔄 İzin isteme bayrağı sıfırlandı');
    } catch (error) {
      console.error('Error resetting permission flag:', error);
    }
  }
}

// Export singleton instance
const permissionManager = new PermissionManager();
export default permissionManager;

