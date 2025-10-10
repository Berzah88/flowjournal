#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Duplicate FCM Token Checker
Checks if the same FCM token is registered multiple times
"""

import firebase_admin
from firebase_admin import credentials, firestore

# Firebase başlat
if not firebase_admin._apps:
    cred = credentials.Certificate('flow-journal-firebase-adminsdk.json')
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Kullanıcı ID'ni bul
user_id = 'user_dJAXp5PIRZGaaijVHYBp'

print('🔍 Kullanıcı bilgileri kontrol ediliyor...\n')

# Kullanıcı dokümanını al
user_doc = db.collection('users').document(user_id).get()

if user_doc.exists:
    user_data = user_doc.to_dict()
    print(f'👤 User ID: {user_id}')
    
    fcm_token = user_data.get('fcmToken', 'YOK')
    if fcm_token != 'YOK':
        print(f'📱 FCM Token: {fcm_token[:50]}...')
    else:
        print('📱 FCM Token: YOK')
    
    print(f'⏰ Last Updated: {user_data.get("lastUpdated", "YOK")}')
    print(f'📊 Topic Subscriptions: {user_data.get("topicSubscriptions", [])}')
    
    # Token'ın kaç kez kayıtlı olduğunu kontrol et
    print(f'\n🔎 Token duplicate kontrolü...')
    
    # Tüm kullanıcıları tara, aynı token'ı ara
    all_users = db.collection('users').stream()
    same_token_count = 0
    current_token = user_data.get('fcmToken', '')
    duplicate_users = []
    
    for user in all_users:
        u_data = user.to_dict()
        if u_data.get('fcmToken') == current_token and current_token:
            same_token_count += 1
            token_preview = u_data.get('fcmToken', '')[:30]
            print(f'   ✅ {user.id}: {token_preview}...')
            duplicate_users.append(user.id)
    
    print(f'\n📊 Sonuç: Bu token {same_token_count} kez kayıtlı')
    
    if same_token_count > 1:
        print('⚠️ PROBLEM: Aynı token birden fazla user ID\'de!')
        print(f'   Duplicate users: {duplicate_users}')
        print('\n💡 Çözüm: Eski user ID\'leri sil veya token\'ları güncelle')
    elif same_token_count == 1:
        print('✅ İYİ: Token sadece bir kez kayıtlı')
    else:
        print('⚠️ Token bulunamadı')
        
    # Tüm kullanıcıları listele
    print('\n\n📋 TÜM KULLANICILAR:')
    all_users = db.collection('users').stream()
    for user in all_users:
        u_data = user.to_dict()
        token = u_data.get('fcmToken', 'YOK')
        if token != 'YOK':
            token = token[:30] + '...'
        print(f'   • {user.id}: {token}')
        
else:
    print('❌ Kullanıcı bulunamadı!')

print('\n\n🔍 PythonAnywhere Cron Job Kontrolü:')
print('   1. PythonAnywhere Dashboard → Tasks')
print('   2. Cron job sayısını kontrol et')
print('   3. Sadece ŞUNLAR olmalı:')
print('      - 09:00 UTC → /send-deadline-notifications')
print('      - 19:00 UTC → /send-daily-reminder')
print('   4. Başka cron varsa SİL!')

