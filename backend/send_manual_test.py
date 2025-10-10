#!/usr/bin/env python3
"""
Manuel Test Notification Sender
Sends a test notification to verify FCM is working
"""

import firebase_admin
from firebase_admin import credentials, firestore, messaging
from datetime import datetime

# Firebase Admin SDK başlat
if not firebase_admin._apps:
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred)

db = firestore.client()

def send_manual_test_notification():
    """Manuel test bildirimi gönder"""
    print("🧪 Manuel Test Notification Gönderiliyor...")
    print(f"⏰ Tarih/Saat: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 60)
    
    # Test kullanıcısını al
    user_id = 'test-user'
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        print(f"❌ Kullanıcı bulunamadı: {user_id}")
        return
    
    user_data = user_doc.to_dict()
    fcm_token = user_data.get('fcmToken')
    
    if not fcm_token:
        print(f"❌ FCM token bulunamadı: {user_id}")
        return
    
    print(f"✅ Kullanıcı bulundu: {user_id}")
    print(f"🔑 FCM Token: {fcm_token[:20]}...")
    print()
    
    # Test bildirimi oluştur
    message = messaging.Message(
        notification=messaging.Notification(
            title='🧪 Test Bildirimi',
            body=f'Manuel test başarılı! {datetime.now().strftime("%H:%M:%S")}'
        ),
        data={
            'type': 'manual_test',
            'timestamp': str(int(datetime.now().timestamp())),
            'test_id': 'manual-test-001'
        },
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
        print("✅ Test bildirimi başarıyla gönderildi!")
        print(f"📨 Response: {response}")
        print()
        print("📱 Cihazınızı kontrol edin - bildirim geldi mi?")
        print()
        
        return True
        
    except Exception as e:
        print(f"❌ Bildirim gönderilirken hata: {e}")
        return False

if __name__ == '__main__':
    print()
    print("=" * 60)
    print("🔥 Firebase Cloud Messaging - Manuel Test")
    print("=" * 60)
    print()
    
    success = send_manual_test_notification()
    
    print()
    print("=" * 60)
    if success:
        print("✅ Test tamamlandı - BAŞARILI")
    else:
        print("❌ Test tamamlandı - BAŞARISIZ")
    print("=" * 60)
    print()

