#!/usr/bin/env python3
"""
Project Deadline Detailed Test
Detaylı proje deadline testi ve problem analizi
"""

import firebase_admin
from firebase_admin import credentials, firestore, messaging
from datetime import datetime, timedelta
import traceback

# Firebase Admin SDK başlat
if not firebase_admin._apps:
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred)

db = firestore.client()

def analyze_project_deadlines():
    """Proje deadline'larını detaylı analiz et"""
    print("\n" + "="*70)
    print("🔍 PROJECT DEADLINE DETAILED ANALYSIS")
    print("="*70 + "\n")
    
    try:
        # Tüm kullanıcıları al
        users_ref = db.collection('users')
        users = list(users_ref.stream())
        
        print(f"📊 Total Users Found: {len(users)}\n")
        
        if not users:
            print("❌ No users found in Firestore!")
            return
        
        total_projects = 0
        projects_with_deadlines = 0
        projects_tomorrow = 0
        projects_today = 0
        projects_past = 0
        projects_future = 0
        
        for user in users:
            user_id = user.id
            user_data = user.to_dict()
            fcm_token = user_data.get('fcmToken', 'N/A')
            
            print(f"👤 User: {user_id}")
            print(f"   FCM Token: {fcm_token[:30]}..." if fcm_token != 'N/A' else "   FCM Token: MISSING ❌")
            print(f"   Timezone: {user_data.get('timezone', 'N/A')}")
            
            # Bu kullanıcının projelerini al
            projects_ref = db.collection('users').document(user_id).collection('projects')
            projects = list(projects_ref.stream())
            
            print(f"   📋 Projects: {len(projects)}")
            
            if not projects:
                print("   ⚠️  No projects found for this user\n")
                continue
            
            total_projects += len(projects)
            
            for project in projects:
                project_data = project.to_dict()
                project_id = project.id
                title = project_data.get('title', 'N/A')
                status = project_data.get('status', 'unknown')
                end_date = project_data.get('endDate')
                
                print(f"\n   📁 Project: {title}")
                print(f"      ID: {project_id}")
                print(f"      Status: {status}")
                
                if not end_date:
                    print(f"      Deadline: ❌ MISSING")
                    continue
                
                projects_with_deadlines += 1
                
                # Timestamp'ten datetime'a çevir
                if hasattr(end_date, 'timestamp'):
                    end_datetime = datetime.fromtimestamp(end_date.timestamp())
                else:
                    print(f"      Deadline: ⚠️  Invalid format: {type(end_date)}")
                    continue
                
                # Bugünün tarihi
                now = datetime.now()
                today = now.replace(hour=0, minute=0, second=0, microsecond=0)
                tomorrow = today + timedelta(days=1)
                
                # Deadline tarihi (saat olmadan)
                deadline_date = end_datetime.replace(hour=0, minute=0, second=0, microsecond=0)
                
                # Gün farkını hesapla
                days_until_deadline = (deadline_date - today).days
                
                print(f"      Deadline: {end_datetime.strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"      Days until deadline: {days_until_deadline}")
                
                # Deadline durumunu analiz et
                if deadline_date < today:
                    print(f"      Status: 🔴 PAST (Geçmiş)")
                    projects_past += 1
                elif deadline_date == today:
                    print(f"      Status: 🟡 TODAY (Bugün bitiyor!)")
                    projects_today += 1
                    print(f"      ✅ SHOULD SEND NOTIFICATION!")
                elif deadline_date == tomorrow:
                    print(f"      Status: 🟢 TOMORROW (Yarın bitiyor!)")
                    projects_tomorrow += 1
                    print(f"      ✅ SHOULD SEND NOTIFICATION!")
                elif days_until_deadline <= 7:
                    print(f"      Status: 🔵 THIS WEEK ({days_until_deadline} days left)")
                    projects_future += 1
                else:
                    print(f"      Status: ⚪ FUTURE ({days_until_deadline} days left)")
                    projects_future += 1
                
                # Proje tamamlandıysa uyar
                if status == 'completed':
                    print(f"      ⚠️  Project is COMPLETED - should not send notification")
            
            print()
        
        # Özet
        print("="*70)
        print("📊 SUMMARY:")
        print("="*70)
        print(f"Total Users: {len(users)}")
        print(f"Total Projects: {total_projects}")
        print(f"Projects with Deadlines: {projects_with_deadlines}")
        print(f"\nDeadline Distribution:")
        print(f"  🔴 Past Deadlines: {projects_past}")
        print(f"  🟡 Today: {projects_today} ← SHOULD NOTIFY")
        print(f"  🟢 Tomorrow: {projects_tomorrow} ← SHOULD NOTIFY")
        print(f"  🔵 This Week: {projects_future}")
        print()
        print(f"✅ Expected Notifications: {projects_today + projects_tomorrow}")
        print("="*70 + "\n")
        
    except Exception as e:
        print(f"❌ Error during analysis: {e}")
        traceback.print_exc()

def test_single_notification(user_id='test-user'):
    """Tek bir kullanıcıya test bildirimi gönder"""
    print("\n" + "="*70)
    print("🧪 TESTING SINGLE NOTIFICATION")
    print("="*70 + "\n")
    
    try:
        # Kullanıcıyı al
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            print(f"❌ User not found: {user_id}")
            return False
        
        user_data = user_doc.to_dict()
        fcm_token = user_data.get('fcmToken')
        
        if not fcm_token:
            print(f"❌ FCM token not found for user: {user_id}")
            return False
        
        print(f"✅ User found: {user_id}")
        print(f"🔑 FCM Token: {fcm_token[:30]}...")
        
        # Yarın biten bir proje bul
        projects_ref = db.collection('users').document(user_id).collection('projects')
        projects = list(projects_ref.stream())
        
        tomorrow_projects = []
        now = datetime.now()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        for project in projects:
            project_data = project.to_dict()
            end_date = project_data.get('endDate')
            status = project_data.get('status', 'unknown')
            
            if end_date and status != 'completed':
                if hasattr(end_date, 'timestamp'):
                    end_datetime = datetime.fromtimestamp(end_date.timestamp())
                    deadline_date = end_datetime.replace(hour=0, minute=0, second=0, microsecond=0)
                    
                    if deadline_date == tomorrow or deadline_date == today:
                        tomorrow_projects.append({
                            'id': project.id,
                            'title': project_data.get('title', 'Unnamed Project'),
                            'deadline': end_datetime,
                            'days_left': (deadline_date - today).days
                        })
        
        if not tomorrow_projects:
            print("\n⚠️  No projects with tomorrow's deadline found")
            print("   Creating a test project...")
            
            # Test projesi oluştur
            test_project_data = {
                'id': 'test-deadline-' + str(int(datetime.now().timestamp())),
                'title': 'Test Deadline Project',
                'startDate': firestore.SERVER_TIMESTAMP,
                'endDate': tomorrow + timedelta(hours=23, minutes=59),
                'status': 'active',
                'milestones': [],
                'journals': [],
                'color': '#FF5722',
                'icon': '🎯',
                'notificationsSent': {
                    'projectDeadlines': False,
                    'milestoneReminders': False
                },
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            }
            
            # Projeyi kaydet
            db.collection('users').document(user_id).collection('projects').document(test_project_data['id']).set(test_project_data)
            print(f"✅ Test project created: {test_project_data['title']}")
            
            tomorrow_projects = [{
                'id': test_project_data['id'],
                'title': test_project_data['title'],
                'deadline': tomorrow + timedelta(hours=23, minutes=59),
                'days_left': 1
            }]
        
        # Bildirimi gönder
        project = tomorrow_projects[0]
        print(f"\n📤 Sending notification for project:")
        print(f"   Title: {project['title']}")
        print(f"   Deadline: {project['deadline'].strftime('%Y-%m-%d')}")
        print(f"   Days left: {project['days_left']}")
        
        # Mesaj içeriğini hazırla
        if project['days_left'] == 0:
            body = f'"{project["title"]}" projeniz bugün bitiyor!'
        elif project['days_left'] == 1:
            body = f'"{project["title"]}" projeniz yarın bitiyor! 1 gün kaldı.'
        else:
            body = f'"{project["title"]}" projenize {project["days_left"]} gün kaldı!'
        
        message = messaging.Message(
            notification=messaging.Notification(
                title='⏰ Proje Deadline Yaklaşıyor!',
                body=body
            ),
            data={
                'type': 'project_deadline',
                'project_id': project['id'],
                'project_title': project['title'],
                'days_left': str(project['days_left']),
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
        
        # Gönder
        response = messaging.send(message)
        print(f"\n✅ Notification sent successfully!")
        print(f"📨 Message ID: {response}")
        print(f"\n📱 Check your device for notification!")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error sending notification: {e}")
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("\n" + "🔥"*35)
    print("PROJECT DEADLINE COMPREHENSIVE TEST")
    print("🔥"*35)
    
    # 1. Firestore'daki tüm projeleri analiz et
    analyze_project_deadlines()
    
    # 2. Tek bir test bildirimi gönder
    print("\n" + "─"*70 + "\n")
    test_single_notification('test-user')
    
    print("\n" + "🔥"*35)
    print("TEST COMPLETE")
    print("🔥"*35 + "\n")

