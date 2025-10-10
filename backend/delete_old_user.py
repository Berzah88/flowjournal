#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Delete Old User ID from Firestore
Removes the old FCM token-based user ID
"""

import firebase_admin
from firebase_admin import credentials, firestore

# Firebase başlat
if not firebase_admin._apps:
    cred = credentials.Certificate('flow-journal-firebase-adminsdk.json')
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ESKİ user ID (FCM token'ın kendisi)
old_user_id = 'eExyBGCmRMG1KjEFwTszUl:APA91'

print('🔍 Eski user ID siliniyor...\n')

# User'ı bul
user_ref = db.collection('users').document(old_user_id)
user_doc = user_ref.get()

if user_doc.exists:
    user_data = user_doc.to_dict()
    print(f'👤 Bulunan User: {old_user_id}')
    print(f'📱 FCM Token: {user_data.get("fcmToken", "")[:50]}...')
    print(f'📋 Projects: {len(user_data.get("activeProjects", []))} active')
    
    # Projeleri kontrol et
    active_projects = user_data.get('activeProjects', [])
    if active_projects:
        print(f'\n⚠️ DİKKAT: Bu user\'ın {len(active_projects)} aktif projesi var!')
        print('   Projeler:')
        for project in active_projects:
            print(f'      - {project.get("title", "?")}')
        
        confirm = input('\n❓ Yine de silmek istiyor musun? (y/N): ')
        if confirm.lower() != 'y':
            print('❌ Silme iptal edildi.')
            exit(0)
    
    # Sil
    user_ref.delete()
    print(f'\n✅ Eski user ID silindi: {old_user_id}')
    print('✅ Artık sadece 1 user ID var!')
    
    # Kontrol
    print('\n🔍 Kalan kullanıcılar:')
    all_users = db.collection('users').stream()
    for user in all_users:
        u_data = user.to_dict()
        print(f'   ✅ {user.id}')
        
else:
    print(f'❌ User bulunamadı: {old_user_id}')

