#!/usr/bin/env python3
"""
Manuel Test Notification Sender
Sends a test notification to verify FCM is working
"""

import firebase_admin
from firebase_admin import credentials, firestore, messaging
from datetime import datetime
import argparse
import sys

# Firebase Admin SDK başlat
import os

def _resolve_service_account_path():
    """Return a service account path:
    1) backend/serviceAccountKey.json next to this script
    2) value of GOOGLE_APPLICATION_CREDENTIALS env var (if exists and file present)
    Otherwise return None
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    local_path = os.path.join(base_dir, 'serviceAccountKey.json')
    env_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')

    if os.path.exists(local_path):
        return local_path
    if env_path and os.path.exists(env_path):
        return env_path
    return None


if not firebase_admin._apps:
    sa_path = _resolve_service_account_path()
    if not sa_path:
        print('[ERROR] serviceAccountKey.json bulunamadı. Lütfen `backend/serviceAccountKey.json` dosyasını koyun veya environment değişkeni GOOGLE_APPLICATION_CREDENTIALS ile service account JSON yolunu verin.')
        exit(2)
    cred = credentials.Certificate(sa_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Debug: print resolved service account path and initialized app options
try:
    import json
    sa_debug = _resolve_service_account_path()
    print('DEBUG: Resolved service account path ->', sa_debug)
    try:
        app = firebase_admin.get_app()
        print('DEBUG: Firebase app name:', app.name)
        # app.options is a Mapping of options including projectId
        print('DEBUG: Firebase app options:', app.options)
    except Exception as _e:
        print('DEBUG: Could not read firebase app info:', _e)

    # Compare with google-services.json in repo root (if present)
    gs_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'google-services.json')
    if os.path.exists(gs_path):
        try:
            with open(gs_path, 'r', encoding='utf-8') as f:
                gs = json.load(f)
            proj = gs.get('project_info', {}).get('project_id') or gs.get('project_id')
            print('DEBUG: google-services.json project_id ->', proj)
        except Exception as _e:
            print('DEBUG: Failed to read google-services.json:', _e)
    else:
        print('DEBUG: google-services.json not found at', gs_path)
except Exception:
    pass

def send_manual_test_notification(target_token=None, user_id='test-user', data_only=False, title=None, body=None):
    """Manuel test bildirimi gönder"""
    print("[TEST] Manuel Test Notification Gönderiliyor...")
    print(f"[TIME] Tarih/Saat: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 60)
    
    # Eğer doğrudan token verildiyse Firestore'dan kullanıcı okumaya gerek yok
    if target_token:
        fcm_token = target_token
        print('[INFO] Doğrudan token ile test gönderiliyor (Firestore kullanıcı sorgulanmıyor)')
    else:
        # Test kullanıcısını al
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            print(f"[ERROR] Kullanıcı bulunamadı: {user_id}")
            return
        
        user_data = user_doc.to_dict()
        fcm_token = user_data.get('fcmToken')
    
    if not fcm_token:
        print(f"[ERROR] FCM token bulunamadı: {user_id}")
        return
    
    print(f"[OK] Kullanıcı bulundu: {user_id}")
    print(f"[TOKEN] FCM Token: {fcm_token[:20]}...")
    print()
    
    # Data payload (her iki durumda da gönderilecek)
    data_payload = {
        'type': 'manual_test',
        'timestamp': str(int(datetime.now().timestamp())),
        'test_id': 'manual-test-001'
    }

    # Eğer title/body sağlandıysa data payload'a ekle (arka plan handler bu alanları kullanır)
    if title:
        data_payload['title'] = title
    if body:
        data_payload['body'] = body

    # Eğer --data-only istendiyse sadece data gönder (bildirim alanı yok)
    if data_only:
        print('[INFO] Data-only mesaj gönderiliyor (notification alanı yok). Bu mesaj React Native JS tarafında onMessage ile yakalanır (foreground) veya background handler ile işlenir.')
        message = messaging.Message(
            data=data_payload,
            token=fcm_token,
            android=messaging.AndroidConfig(
                priority='high'
            )
        )
    else:
        # Test bildirimi oluştur (notification + data)
        notif_title = title or 'Test Bildirimi'
        notif_body = body or f'Manuel test başarılı! {datetime.now().strftime("%H:%M:%S")}'
        message = messaging.Message(
            notification=messaging.Notification(
                title=notif_title,
                body=notif_body
            ),
            data=data_payload,
            token=fcm_token,
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    sound='default',
                    priority='high',
                    channel_id='default'
                )
            )
        )
    
    # Bildirimi gönder
    try:
        response = messaging.send(message)
        print("[OK] Test bildirimi başarıyla gönderildi!")
        print(f"[RESPONSE] Response: {response}")
        print()
        print("[DEVICE] Cihazınızı kontrol edin - bildirim geldi mi?")
        print()

        return True

    except Exception as e:
        print(f"[ERROR] Bildirim gönderilirken hata: {e}")
        return False

def create_test_user(user_id, token):
    """Create or update a test user document in Firestore with the given token"""
    try:
        user_ref = db.collection('users').document(user_id)
        user_ref.set({
            'fcmToken': token,
            'createdAt': datetime.utcnow()
        }, merge=True)
        print(f"[OK] Firestore: Kullanıcı oluşturuldu/güncellendi: {user_id}")
        return True
    except Exception as e:
        print(f"[ERROR] Firestore kullanıcı oluşturulurken hata: {e}")
        return False

if __name__ == '__main__':
    print()
    print("=" * 60)
    print("[FCM] Firebase Cloud Messaging - Manuel Test")
    print("=" * 60)
    print()
    
    parser = argparse.ArgumentParser(description='Send a manual FCM test notification')
    parser.add_argument('--token', help='Send directly to this FCM token (overrides --user-id)')
    parser.add_argument('--user-id', help='Firestore user id to look up (default: test-user)', default='test-user')
    parser.add_argument('--create-user', action='store_true', help='Create/update the Firestore user with --user-id using --token and then send the test')
    parser.add_argument('--data-only', action='store_true', help='Send a data-only FCM message (no notification field). Use this to trigger JS onMessage handlers.')
    parser.add_argument('--title', help='Optional title to include in data or notification payload')
    parser.add_argument('--body', help='Optional body text to include in data or notification payload')
    args = parser.parse_args()

    try:
        if args.create_user:
            if not args.token:
                print('[ERROR] --create-user kullanırken --token gereklidir')
                success = False
            else:
                created = create_test_user(args.user_id, args.token)
                if not created:
                    success = False
                else:
                    success = send_manual_test_notification(target_token=args.token, user_id=args.user_id, data_only=args.data_only, title=args.title, body=args.body)
        else:
            success = send_manual_test_notification(target_token=args.token, user_id=args.user_id, data_only=args.data_only, title=args.title, body=args.body)
    except Exception as e:
        print(f"[ERROR] Beklenmeyen hata: {e}", file=sys.stderr)
        success = False
    
    print()
    print("=" * 60)
    if success:
        print("[OK] Test tamamlandı - BAŞARILI")
    else:
        print("[ERROR] Test tamamlandı - BAŞARISIZ")
    print("=" * 60)
    print()

