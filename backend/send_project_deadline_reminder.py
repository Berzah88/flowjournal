#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Proje Son Günü Hatırlatıcısı
PythonAnywhere'den çalıştırılacak
"""

import os
import sys
import logging
from datetime import datetime, timezone
from firebase_admin import credentials, messaging, initialize_app

# Logging ayarları
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    try:
        logger.info('🚀 PythonAnywhere Proje Son Günü Hatırlatıcısı başlatılıyor...')
        logger.info('=' * 60)
        
        # Firebase Admin SDK başlat
        cred_path = '/home/mberzah/serviceAccountKey.json'
        if not os.path.exists(cred_path):
            logger.error(f'❌ Service account key bulunamadı: {cred_path}')
            return False
        
        # Firebase'i başlat (zaten başlatılmışsa hata vermez)
        try:
            initialize_app(credentials.Certificate(cred_path))
            logger.info('✅ Firebase Admin SDK başlatıldı')
        except Exception as e:
            if 'already exists' in str(e):
                logger.info('✅ Firebase Admin SDK zaten başlatılmış')
            else:
                raise e
        
        # Proje son günü bildirimi gönder
        logger.info('📅 Proje son günü hatırlatıcısı gönderiliyor...')
        logger.info(f'⏰ Zaman: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}')
        
        # FCM mesajı gönder
        message = messaging.Message(
            notification=messaging.Notification(
                title='🎯 Proje Son Günü!',
                body='Bugün projenizin son günü! Son düzenlemelerinizi yapın ve proje yolculuğunuz hakkında günlüğünüze yazın. Başarılar! 🚀'
            ),
            topic='project_deadlines',
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    sound='default',
                    channel_id='project_deadlines'
                )
            )
        )
        
        # Mesajı gönder
        response = messaging.send(message)
        logger.info(f'✅ Proje son günü bildirimi gönderildi! Message ID: {response}')
        
        logger.info('=' * 60)
        logger.info('✅ Script başarıyla tamamlandı!')
        return True
        
    except Exception as error:
        logger.error(f'❌ Script hata ile sonlandı: {error}')
        logger.info('=' * 60)
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
