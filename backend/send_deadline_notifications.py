#!/usr/bin/env python3
"""
Lightweight Project Deadline Notification Sender
Optimized for PythonAnywhere timeout limits
"""

import firebase_admin
from firebase_admin import credentials, firestore, messaging
from datetime import datetime, timedelta
import sys

def initialize_firebase():
    """Initialize Firebase if not already initialized"""
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate('serviceAccountKey.json')
            firebase_admin.initialize_app(cred)
        return True
    except Exception as e:
        print(f"Firebase init error: {e}", file=sys.stderr)
        return False

def send_deadline_notifications():
    """Send deadline notifications - optimized for speed"""
    
    if not initialize_firebase():
        return {"success": False, "error": "Firebase init failed"}
    
    db = firestore.client()
    
    # Bugün ve yarın
    now = datetime.now()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    three_days = today + timedelta(days=3)
    
    notifications_sent = 0
    users_checked = 0
    
    try:
        # Tüm kullanıcıları al (limit 100 for timeout prevention)
        users_ref = db.collection('users').limit(100)
        users = users_ref.stream()
        
        for user in users:
            users_checked += 1
            user_data = user.to_dict()
            fcm_token = user_data.get('fcmToken')
            
            if not fcm_token:
                continue
            
            # Bu kullanıcının aktif projelerini al
            projects_ref = db.collection('users').document(user.id).collection('projects')
            projects_query = projects_ref.where('status', '==', 'active').limit(50)
            projects = projects_query.stream()
            
            for project in projects:
                project_data = project.to_dict()
                end_date = project_data.get('endDate')
                
                if not end_date or not hasattr(end_date, 'timestamp'):
                    continue
                
                # Deadline'ı hesapla
                end_datetime = datetime.fromtimestamp(end_date.timestamp())
                deadline_date = end_datetime.replace(hour=0, minute=0, second=0, microsecond=0)
                days_left = (deadline_date - today).days
                
                # Sadece bugün, yarın veya 3 gün kala bildirim gönder
                if days_left not in [0, 1, 3]:
                    continue
                
                # Mesajı hazırla
                title = project_data.get('title', 'Unnamed Project')
                
                if days_left == 0:
                    body = f'"{title}" projeniz bugün bitiyor!'
                elif days_left == 1:
                    body = f'"{title}" projeniz yarın bitiyor! 1 gün kaldı.'
                else:  # 3 days
                    body = f'"{title}" projenize 3 gün kaldı!'
                
                # Bildirim gönder
                message = messaging.Message(
                    notification=messaging.Notification(
                        title='⏰ Proje Deadline Yaklaşıyor!',
                        body=body
                    ),
                    data={
                        'type': 'project_deadline',
                        'project_id': str(project.id),
                        'project_title': title,
                        'days_left': str(days_left)
                    },
                    token=fcm_token,
                    android=messaging.AndroidConfig(
                        priority='high',
                        notification=messaging.AndroidNotification(
                            sound='default',
                            priority='high'
                        )
                    )
                )
                
                try:
                    messaging.send(message)
                    notifications_sent += 1
                    print(f"✅ Sent to {user.id}: {title} ({days_left} days)")
                except Exception as e:
                    print(f"❌ Failed to send to {user.id}: {e}", file=sys.stderr)
        
        result = {
            "success": True,
            "users_checked": users_checked,
            "notifications_sent": notifications_sent,
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"Summary: {result}")
        return result
        
    except Exception as e:
        error = {
            "success": False,
            "error": str(e),
            "users_checked": users_checked,
            "notifications_sent": notifications_sent
        }
        print(f"Error: {error}", file=sys.stderr)
        return error

if __name__ == '__main__':
    result = send_deadline_notifications()
    
    # Print JSON for API response
    import json
    print(json.dumps(result))
    
    # Exit with appropriate code
    sys.exit(0 if result.get('success') else 1)

