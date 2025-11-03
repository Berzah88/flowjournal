#!/usr/bin/env python3
"""
Real User Notification Test
Gerçek kullanıcı ID'sine test bildirimi gönder
"""

import firebase_admin
from firebase_admin import credentials, firestore, messaging
from datetime import datetime

import os

if not firebase_admin._apps:
    if not os.path.exists('serviceAccountKey.json'):
        print('❌ serviceAccountKey.json bulunamadı. Lütfen service account JSON dosyasını backend dizinine yükleyin.')
        exit(2)
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Gerçek user ID
user_id = 'user_dJAXp5PIRZGaaijVHYBp'

print("\n" + "="*70)
print("🧪 REAL USER DEADLINE NOTIFICATION TEST")
print("="*70 + "\n")

# Kullanıcıyı al
user_ref = db.collection('users').document(user_id)
user_doc = user_ref.get()

if not user_doc.exists:
    print(f"❌ User not found: {user_id}")
    exit(1)

user_data = user_doc.to_dict()
fcm_token = user_data.get('fcmToken')

print(f"✅ User found: {user_id}")
print(f"🔑 FCM Token: {fcm_token[:30]}...")

# Projelerini al
projects_ref = db.collection('users').document(user_id).collection('projects')
projects = list(projects_ref.stream())

print(f"\n📋 Projects found: {len(projects)}\n")

for project in projects:
    project_data = project.to_dict()
    title = project_data.get('title', 'N/A')
    status = project_data.get('status', 'active')
    end_date = project_data.get('endDate')
    
    print(f"  📁 {title}")
    print(f"     Status: {status}")
    
    if end_date:
        if hasattr(end_date, 'timestamp'):
            end_datetime = datetime.fromtimestamp(end_date.timestamp())
            print(f"     Deadline: {end_datetime.strftime('%Y-%m-%d')}")
            
            # Gün farkı
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            deadline_date = end_datetime.replace(hour=0, minute=0, second=0, microsecond=0)
            days_left = (deadline_date - today).days
            print(f"     Days left: {days_left}")
            
            if days_left <= 1 and status == 'active':
                print(f"     ✅ SHOULD SEND NOTIFICATION!")
    print()

# Test bildirimi gönder
print("\n📤 Sending test notification...\n")

message = messaging.Message(
    notification=messaging.Notification(
        title='⏰ Proje Deadline Yaklaşıyor!',
        body='"Testing" projeniz yarın bitiyor! 1 gün kaldı.'
    ),
    data={
        'type': 'project_deadline',
        'project_id': str(projects[0].id) if projects else 'test',
        'project_title': 'Testing',
        'days_left': '1',
        'timestamp': str(int(datetime.now().timestamp()))
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

try:
    response = messaging.send(message)
    print("✅ Notification sent successfully!")
    print(f"📨 Message ID: {response}")
    print(f"\n📱 Check your device for notification!")
except Exception as e:
    print(f"❌ Error sending notification: {e}")

print("\n" + "="*70 + "\n")

