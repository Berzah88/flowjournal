#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
PythonAnywhere Daily Reminder Script
-------------------------------------
Bu script PythonAnywhere'de scheduled task olarak çalışır.
Her gün belirlenen saatte FCM topic'ine bildirim gönderir.

Kurulum:
1. Firebase Admin SDK yükle: pip3 install --user firebase-admin
2. serviceAccountKey.json dosyasını PythonAnywhere'e yükle
3. Bu script'i PythonAnywhere'e yükle
4. Scheduled task oluştur (Hour: 16 UTC = 19:00 Türkiye)

Command:
python3 /home/KULLANICI_ADIN/mysite/send_daily_reminder.py
"""

import firebase_admin
from firebase_admin import credentials, messaging
import os
import sys
from datetime import datetime

# Firebase Admin SDK'yı başlat
def initialize_firebase():
    """Firebase Admin SDK'yı başlatır"""
    try:
        # serviceAccountKey.json path'ini ayarla
        # ⚠️ KULLANICI_ADIN'i kendi PythonAnywhere kullanıcı adınla değiştir!
        cred_path = '/home/KULLANICI_ADIN/mysite/serviceAccountKey.json'
        
        # Dosya var mı kontrol et
        if not os.path.exists(cred_path):
            print(f'❌ serviceAccountKey.json bulunamadı: {cred_path}')
            print('💡 Firebase Console → Project Settings → Service Accounts → Generate new private key')
            sys.exit(1)
        
        # Firebase zaten başlatılmış mı kontrol et
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print('✅ Firebase Admin SDK başlatıldı')
        else:
            print('ℹ️ Firebase Admin SDK zaten başlatılmış')
        
        return True
    except Exception as e:
        print(f'❌ Firebase başlatma hatası: {str(e)}')
        return False

# Topic'e bildirim gönder
def send_daily_reminder():
    """Daily reminders topic'ine bildirim gönderir"""
    try:
        print(f'📅 Günlük hatırlatma gönderiliyor... ({datetime.now().strftime("%Y-%m-%d %H:%M:%S")})')
        
        # FCM Message oluştur
        message = messaging.Message(
            notification=messaging.Notification(
                title='📖 Günlük Hatırlatma',
                body='Bugün neler hissettin? Günlüğüne birkaç satır ekle 💭',
            ),
            topic='daily_reminders',
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    sound='default',
                    channel_id='daily-journal-reminder',
                )
            )
        )
        
        # Bildirimi gönder
        response = messaging.send(message)
        print(f'✅ Bildirim başarıyla gönderildi!')
        print(f'📱 Message ID: {response}')
        print(f'🔥 Topic: daily_reminders')
        
        return True
        
    except Exception as e:
        print(f'❌ Bildirim gönderme hatası: {str(e)}')
        return False

# Script direkt çalıştırıldığında
if __name__ == '__main__':
    print('🚀 PythonAnywhere Daily Reminder Script başlatılıyor...')
    print('=' * 60)
    
    # Firebase'i başlat
    if initialize_firebase():
        # Bildirimi gönder
        success = send_daily_reminder()
        
        print('=' * 60)
        if success:
            print('✅ Script başarıyla tamamlandı!')
            sys.exit(0)
        else:
            print('❌ Script hata ile sonlandı!')
            sys.exit(1)
    else:
        print('❌ Firebase başlatılamadı!')
        sys.exit(1)

