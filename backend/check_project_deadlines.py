#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
PythonAnywhere Project Deadline Checker
-----------------------------------------
Bu script, Firestore'daki tüm kullanıcıların projelerini kontrol eder
ve deadline'ı yaklaşan projeler için bildirim gönderir.

Deadline Kuralları:
- Son gün (deadline = bugün): "Bugün bitiyor!" ⏰
- 3 gün önce: "3 gün sonra bitiyor!" 📅
- 7 gün önce: "1 hafta sonra bitiyor!" 🚀

Kullanım:
1. Firestore credentials ayarla (serviceAccountKey.json)
2. Script'i çalıştır: python3 check_project_deadlines.py
3. Cron-job.org ile günlük tetikle (Flask endpoint üzerinden)
"""

import firebase_admin
from firebase_admin import credentials, messaging, firestore
import os
import sys
from datetime import datetime, timedelta, timezone
import logging

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Firebase başlatma flag
firebase_initialized = False

def initialize_firebase():
    """Firebase Admin SDK'yı başlatır (Firestore + Messaging)"""
    global firebase_initialized
    
    if firebase_initialized:
        return True
    
    try:
        # serviceAccountKey.json path'i - local development için
        cred_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
        
        if not os.path.exists(cred_path):
            logger.error(f'❌ serviceAccountKey.json bulunamadı: {cred_path}')
            return False
        
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            logger.info('✅ Firebase Admin SDK başlatıldı')
        
        firebase_initialized = True
        return True
        
    except Exception as e:
        logger.error(f'❌ Firebase başlatma hatası: {str(e)}')
        return False

def get_deadline_message(project_name, days_left):
    """Deadline mesajını oluşturur"""
    
    messages = {
        0: {
            'title': f'⏰ {project_name} - SON GÜN!',
            'body': f'{project_name} bugün bitiyor! Son düzenlemelerini yap ve duygularını yaz! 💪✨',
            'emoji': '⏰'
        },
        1: {
            'title': f'📢 {project_name} - 1 Gün Kaldı!',
            'body': f'{project_name} yarın bitiyor! Hazırlıklarını tamamla! 🚀',
            'emoji': '📢'
        },
        3: {
            'title': f'📅 {project_name} - 3 Gün Kaldı',
            'body': f'{project_name} 3 gün sonra bitiyor! Hazır mısın? Son kontroller zamanı! 💼',
            'emoji': '📅'
        },
        7: {
            'title': f'🚀 {project_name} - 1 Hafta Kaldı',
            'body': f'{project_name} 1 hafta sonra bitiyor! Sprint zamanı! Hadi başla! 🎯',
            'emoji': '🚀'
        }
    }
    
    return messages.get(days_left, {
        'title': f'📌 {project_name} Hatırlatması',
        'body': f'{project_name} {days_left} gün sonra bitiyor!',
        'emoji': '📌'
    })

def send_deadline_notification(fcm_token, project_name, project_id, days_left):
    """Kullanıcıya deadline bildirimi gönderir"""
    
    try:
        message_data = get_deadline_message(project_name, days_left)
        
        logger.info(f'📤 Bildirim gönderiliyor: {project_name} ({days_left} gün kaldı)')
        
        # FCM Message oluştur
        message = messaging.Message(
            notification=messaging.Notification(
                title=message_data['title'],
                body=message_data['body'],
            ),
            token=fcm_token,
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    sound='default',
                    channel_id='project-deadlines',
                    color='#FF5722',
                )
            ),
            data={
                'type': 'project_deadline',
                'project_id': project_id,
                'project_name': project_name,
                'days_left': str(days_left),
                'emoji': message_data['emoji']
            }
        )
        
        # Bildirimi gönder
        response = messaging.send(message)
        logger.info(f'✅ Bildirim gönderildi! Message ID: {response}')
        
        return True
        
    except Exception as e:
        logger.error(f'❌ Bildirim gönderme hatası: {str(e)}')
        return False

def check_project_deadlines():
    """Tüm kullanıcıların projelerini kontrol eder ve deadline bildirimleri gönderir"""
    
    try:
        # Firebase'i başlat
        if not initialize_firebase():
            logger.error('❌ Firebase başlatılamadı!')
            return False
        
        logger.info('🔍 Proje deadline kontrolleri yapılıyor...')
        logger.info(f'📅 Bugün: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}')
        
        # Firestore client
        db = firestore.client()
        
        # Bugünün tarihini al (UTC)
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Bildirim sayacı
        notifications_sent = 0
        users_checked = 0
        projects_checked = 0
        
        # Tüm kullanıcıları çek
        users_ref = db.collection('users')
        users = users_ref.stream()
        
        for user_doc in users:
            users_checked += 1
            user_id = user_doc.id
            user_data = user_doc.to_dict()
            
            # FCM token kontrolü
            fcm_token = user_data.get('fcmToken')
            if not fcm_token:
                logger.warning(f'⚠️ Kullanıcı {user_id} - FCM token yok, atlanıyor')
                continue
            
            logger.info(f'👤 Kullanıcı kontrol ediliyor: {user_id}')
            
            # Kullanıcının projelerini çek
            projects_ref = users_ref.document(user_id).collection('projects')
            projects = projects_ref.where('status', '==', 'active').stream()
            
            for project_doc in projects:
                projects_checked += 1
                project_id = project_doc.id
                project_data = project_doc.to_dict()
                
                project_name = project_data.get('title', 'Projen')
                deadline = project_data.get('endDate')
                notifications_enabled = project_data.get('notificationsSent', {}).get('projectDeadlines', True)
                
                # Bildirimler kapalıysa atla
                if not notifications_enabled:
                    logger.info(f'  📋 {project_name} - Bildirimler kapalı, atlanıyor')
                    continue
                
                # Deadline yoksa atla
                if not deadline:
                    logger.warning(f'  ⚠️ {project_name} - Deadline yok, atlanıyor')
                    continue
                
                # Deadline'ı datetime'a çevir
                if isinstance(deadline, str):
                    deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                else:
                    # Firestore timestamp
                    deadline_dt = deadline
                
                # UTC'ye çevir ve saat bilgisini sıfırla
                if deadline_dt.tzinfo is None:
                    deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
                deadline_date = deadline_dt.replace(hour=0, minute=0, second=0, microsecond=0)
                
                # Kalan gün sayısını hesapla
                days_left = (deadline_date - today).days
                
                logger.info(f'  📋 {project_name} - Deadline: {deadline_date.strftime("%Y-%m-%d")}, Kalan: {days_left} gün')
                
                # Bildirim gönderilmesi gereken günler: 0, 1, 3, 7
                notification_days = [0, 1, 3, 7]
                
                if days_left in notification_days:
                    logger.info(f'  🔔 Bildirim gönderme zamanı! ({days_left} gün kaldı)')
                    
                    # Bildirimi gönder
                    success = send_deadline_notification(
                        fcm_token=fcm_token,
                        project_name=project_name,
                        project_id=project_id,
                        days_left=days_left
                    )
                    
                    if success:
                        notifications_sent += 1
                elif days_left < 0:
                    logger.info(f'  ⏰ Deadline geçmiş ({abs(days_left)} gün önce bitti)')
                else:
                    logger.info(f'  ℹ️ Bildirim günü değil (kalan: {days_left} gün)')
        
        # Özet
        logger.info('=' * 60)
        logger.info(f'✅ Kontrol tamamlandı!')
        logger.info(f'👥 Kontrol edilen kullanıcı: {users_checked}')
        logger.info(f'📋 Kontrol edilen proje: {projects_checked}')
        logger.info(f'📤 Gönderilen bildirim: {notifications_sent}')
        logger.info('=' * 60)
        
        return True
        
    except Exception as e:
        logger.error(f'❌ Deadline kontrol hatası: {str(e)}')
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == '__main__':
    logger.info('🚀 Project Deadline Checker başlatılıyor...')
    logger.info('=' * 60)
    
    success = check_project_deadlines()
    
    if success:
        logger.info('✅ Script başarıyla tamamlandı!')
        sys.exit(0)
    else:
        logger.error('❌ Script hata ile sonlandı!')
        sys.exit(1)

