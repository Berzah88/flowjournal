#!/usr/bin/env python3
"""
Yeni user ID için test projesi oluştur
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta

if not firebase_admin._apps:
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Yeni user ID
user_id = 'user_dJAXp5PIRZGaaijVHYBp'

print(f"\n🎯 Creating test projects for: {user_id}\n")

# Yarın biten proje
tomorrow = datetime.now() + timedelta(days=1)
tomorrow_end = tomorrow.replace(hour=23, minute=59, second=0)

project_tomorrow = {
    'id': f'deadline-tomorrow-{int(datetime.now().timestamp())}',
    'title': '📱 Mobile App Release',
    'startDate': firestore.SERVER_TIMESTAMP,
    'endDate': tomorrow_end,
    'status': 'active',
    'milestones': [
        {'title': 'UI Design', 'done': True},
        {'title': 'Backend Integration', 'done': True},
        {'title': 'Testing', 'done': False},
        {'title': 'Release', 'done': False}
    ],
    'journals': [],
    'color': '#FF5722',
    'icon': '📱',
    'notificationsSent': {
        'projectDeadlines': False,
        'milestoneReminders': False
    },
    'createdAt': firestore.SERVER_TIMESTAMP,
    'updatedAt': firestore.SERVER_TIMESTAMP
}

# Bugün biten proje
today = datetime.now()
today_end = today.replace(hour=23, minute=59, second=0)

project_today = {
    'id': f'deadline-today-{int(datetime.now().timestamp())}',
    'title': '🎨 Design Sprint',
    'startDate': firestore.SERVER_TIMESTAMP,
    'endDate': today_end,
    'status': 'active',
    'milestones': [],
    'journals': [],
    'color': '#9C27B0',
    'icon': '🎨',
    'notificationsSent': {
        'projectDeadlines': False,
        'milestoneReminders': False
    },
    'createdAt': firestore.SERVER_TIMESTAMP,
    'updatedAt': firestore.SERVER_TIMESTAMP
}

# 3 gün sonra biten proje
next_week = datetime.now() + timedelta(days=3)
next_week_end = next_week.replace(hour=23, minute=59, second=0)

project_next_week = {
    'id': f'deadline-3days-{int(datetime.now().timestamp())}',
    'title': '🚀 Product Launch',
    'startDate': firestore.SERVER_TIMESTAMP,
    'endDate': next_week_end,
    'status': 'active',
    'milestones': [],
    'journals': [],
    'color': '#4CAF50',
    'icon': '🚀',
    'notificationsSent': {
        'projectDeadlines': False,
        'milestoneReminders': False
    },
    'createdAt': firestore.SERVER_TIMESTAMP,
    'updatedAt': firestore.SERVER_TIMESTAMP
}

# Projeleri kaydet
try:
    db.collection('users').document(user_id).collection('projects').document(project_today['id']).set(project_today)
    print(f"✅ Created: {project_today['title']} (Deadline: TODAY)")
    
    db.collection('users').document(user_id).collection('projects').document(project_tomorrow['id']).set(project_tomorrow)
    print(f"✅ Created: {project_tomorrow['title']} (Deadline: TOMORROW)")
    
    db.collection('users').document(user_id).collection('projects').document(project_next_week['id']).set(project_next_week)
    print(f"✅ Created: {project_next_week['title']} (Deadline: 3 DAYS)")
    
    print(f"\n🎉 Test projects created successfully!")
    print(f"\nExpected notifications:")
    print(f"  🟡 TODAY: 1 project")
    print(f"  🟢 TOMORROW: 1 project")
    print(f"  Total: 2 notifications should be sent\n")
    
except Exception as e:
    print(f"❌ Error: {e}")

