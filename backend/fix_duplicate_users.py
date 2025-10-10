#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix Duplicate User IDs - Remove old FCM token-based user
"""

import firebase_admin
from firebase_admin import credentials, firestore

# Firebase başlat
if not firebase_admin._apps:
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred)

db = firestore.client()

print('🔍 Tüm kullanıcılar kontrol ediliyor...\n')

# Tüm kullanıcıları al
all_users = db.collection('users').stream()

users_to_delete = []
users_to_keep = []

for user in all_users:
    user_id = user.id
    user_data = user.to_dict()
    
    # Eğer user ID, FCM token formatındaysa (contains ':APA91'), ESKİDİR - SİL
    if ':APA91' in user_id:
        print(f'🗑️  ESKİ (SİLİNECEK): {user_id}')
        print(f'    FCM Token: {user_data.get("fcmToken", "")[:50]}...')
        users_to_delete.append(user_id)
    else:
        print(f'✅ YENİ (KALACAK): {user_id}')
        print(f'    FCM Token: {user_data.get("fcmToken", "")[:50]}...')
        users_to_keep.append(user_id)
    print()

print('=' * 60)
print(f'📊 ÖZET:')
print(f'   ✅ Kalacak: {len(users_to_keep)} user')
print(f'   🗑️  Silinecek: {len(users_to_delete)} user')
print('=' * 60)
print()

if users_to_delete:
    print('🗑️  ESKİ USER ID\'LER SİLİNİYOR...\n')
    
    for old_user_id in users_to_delete:
        try:
            db.collection('users').document(old_user_id).delete()
            print(f'   ✅ Silindi: {old_user_id}')
        except Exception as e:
            print(f'   ❌ Silinemedi: {old_user_id} - {e}')
    
    print()
    print('✅ TEMIZLEME TAMAMLANDI!')
    print()
    
    # Son kontrol
    print('🔍 SON DURUM:')
    all_users = db.collection('users').stream()
    for user in all_users:
        print(f'   ✅ {user.id}')
    
else:
    print('✅ Silinecek eski user yok - her şey temiz!')

print()
print('🎉 İŞLEM TAMAMLANDI!')
print()
print('💡 Artık sadece YENİ user ID formatı kullanılıyor:')
print('   ✅ user_[FCM_TOKEN_SUBSTRING]')
print()

