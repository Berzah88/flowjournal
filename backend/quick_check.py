#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Hızlı Firestore durumu kontrol scripti
"""

import firebase_admin
from firebase_admin import credentials, firestore
import os
from datetime import datetime, timezone

# Firebase Admin SDK başlat
cred = credentials.Certificate(os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json'))
firebase_admin.initialize_app(cred)
db = firestore.client()

print("🔍 Firestore Durumu Kontrol Ediliyor...")
print("=" * 60)

# Tüm kullanıcıları kontrol et
users_ref = db.collection('users')
users = users_ref.stream()

total_users = 0
total_projects = 0

for user in users:
    total_users += 1
    user_data = user.to_dict()
    print(f"\n👤 Kullanıcı: {user.id}")
    print(f"   FCM Token: {user_data.get('fcmToken', 'N/A')[:30]}...")
    
    # Bu kullanıcının projelerini kontrol et
    projects_ref = db.collection('users').document(user.id).collection('projects')
    projects = projects_ref.stream()
    
    for project in projects:
        total_projects += 1
        project_data = project.to_dict()
        print(f"\n   📋 Proje: {project_data.get('title', 'N/A')}")
        print(f"      Start: {project_data.get('startDate')}")
        print(f"      End: {project_data.get('endDate')}")
        print(f"      Done: {project_data.get('done', False)}")

print("\n" + "=" * 60)
print(f"📊 Toplam: {total_users} kullanıcı, {total_projects} proje")
print("=" * 60)

