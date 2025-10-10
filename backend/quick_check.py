#!/usr/bin/env python3
"""Quick Firestore Status Check"""

import firebase_admin
from firebase_admin import credentials, firestore

# Firebase Admin SDK başlat
if not firebase_admin._apps:
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred)

db = firestore.client()

print("\n" + "="*60)
print("🔥 FIRESTORE STATUS CHECK")
print("="*60 + "\n")

# Kullanıcıları listele
users_ref = db.collection('users')
users = users_ref.stream()

user_count = 0
total_projects = 0

for user in users:
    user_count += 1
    user_data = user.to_dict()
    print(f"👤 User ID: {user.id}")
    print(f"   FCM Token: {user_data.get('fcmToken', 'N/A')[:30]}...")
    print(f"   Timezone: {user_data.get('timezone', 'N/A')}")
    print(f"   Language: {user_data.get('language', 'N/A')}")
    
    # Bu kullanıcının projelerini al
    projects_ref = db.collection('users').document(user.id).collection('projects')
    projects = projects_ref.stream()
    
    project_list = list(projects)
    project_count = len(project_list)
    total_projects += project_count
    
    print(f"   📋 Projects: {project_count}")
    
    for project in project_list:
        project_data = project.to_dict()
        status = project_data.get('status', 'N/A')
        title = project_data.get('title', 'N/A')
        end_date = project_data.get('endDate')
        
        if end_date:
            end_date_str = end_date.strftime('%Y-%m-%d') if hasattr(end_date, 'strftime') else str(end_date)
        else:
            end_date_str = 'N/A'
        
        status_emoji = "✅" if status == "completed" else "🔄"
        print(f"      {status_emoji} {title[:30]} | Deadline: {end_date_str}")
    
    print()

print("="*60)
print(f"📊 SUMMARY:")
print(f"   Total Users: {user_count}")
print(f"   Total Projects: {total_projects}")
print("="*60 + "\n")

