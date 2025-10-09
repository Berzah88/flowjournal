#!/usr/bin/env python3
"""
Firebase Firestore Test Data Setup Script
Bu script test kullanıcısı ve örnek projeler oluşturur.
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
import os
import sys

# Service Account Key
cred_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')

if not os.path.exists(cred_path):
    print(f'❌ Service Account Key bulunamadı: {cred_path}')
    print('📝 serviceAccountKey.json dosyasını backend/ klasörüne ekleyin')
    sys.exit(1)

cred = credentials.Certificate(cred_path)

# Firebase Admin SDK başlat
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

def setup_test_user(user_id='test-user'):
    """Test kullanıcısı oluştur"""
    print(f'📝 Test kullanıcısı oluşturuluyor: {user_id}')
    
    user_ref = db.collection('users').document(user_id)
    
    # Profile document
    user_ref.set({
        'fcmToken': '',  # Uygulama çalıştığında otomatik doldurulacak
        'timezone': 'Europe/Istanbul',
        'language': 'tr',
        'createdAt': firestore.SERVER_TIMESTAMP,
        'lastUpdated': firestore.SERVER_TIMESTAMP,
        'notificationPreferences': {
            'dailyReminder': True,
            'projectDeadlines': True,
            'milestoneReminders': True,
            'reminderTime': '08:00'
        }
    })
    
    print(f'✅ Test kullanıcısı oluşturuldu: {user_id}')
    return user_ref

def create_sample_projects(user_id='test-user'):
    """Örnek projeler oluştur"""
    print(f'📝 Örnek projeler oluşturuluyor...')
    
    projects_ref = db.collection('users').document(user_id).collection('projects')
    
    # Proje 1: Yaklaşan deadline (3 gün sonra)
    project1_id = '1734567890000'
    projects_ref.document(project1_id).set({
        'id': 1734567890000,
        'title': 'Mobil Uygulama Geliştirme',
        'description': 'React Native ile modern mobil uygulama',
        'startDate': datetime.now() - timedelta(days=30),
        'endDate': datetime.now() + timedelta(days=3),
        'status': 'active',
        'done': False,
        'createdAt': firestore.SERVER_TIMESTAMP,
        'updatedAt': firestore.SERVER_TIMESTAMP,
        'milestones': [
            {
                'id': 1,
                'text': 'UI/UX Tasarımı',
                'completed': True,
                'color': '#FF6B6B',
                'createdAt': datetime.now() - timedelta(days=25)
            },
            {
                'id': 2,
                'text': 'Backend API Entegrasyonu',
                'completed': True,
                'color': '#4ECDC4',
                'createdAt': datetime.now() - timedelta(days=20)
            },
            {
                'id': 3,
                'text': 'Testing ve Debug',
                'completed': False,
                'color': '#FFE66D',
                'createdAt': datetime.now() - timedelta(days=15)
            }
        ],
        'journals': [
            {
                'id': 1,
                'text': 'Harika bir gün! Tasarımları tamamladık.',
                'emoji': '😊',
                'date': datetime.now() - timedelta(days=25)
            },
            {
                'id': 2,
                'text': 'Backend entegrasyonu biraz zorlandı ama başardık.',
                'emoji': '💪',
                'date': datetime.now() - timedelta(days=20)
            }
        ],
        'notificationsSent': {
            'sevenDays': False,
            'threeDays': False,
            'lastDay': False,
            'overdue': False
        }
    })
    print(f'✅ Proje 1 oluşturuldu: {project1_id}')
    
    # Proje 2: Bugün son gün
    project2_id = '1734567891111'
    projects_ref.document(project2_id).set({
        'id': 1734567891111,
        'title': 'Kişisel Blog Sitesi',
        'description': 'Next.js ile modern blog platformu',
        'startDate': datetime.now() - timedelta(days=15),
        'endDate': datetime.now(),
        'status': 'active',
        'done': False,
        'createdAt': firestore.SERVER_TIMESTAMP,
        'updatedAt': firestore.SERVER_TIMESTAMP,
        'milestones': [
            {
                'id': 1,
                'text': 'CMS Entegrasyonu',
                'completed': True,
                'color': '#95E1D3',
                'createdAt': datetime.now() - timedelta(days=12)
            },
            {
                'id': 2,
                'text': 'SEO Optimizasyonu',
                'completed': False,
                'color': '#F38181',
                'createdAt': datetime.now() - timedelta(days=8)
            }
        ],
        'journals': [
            {
                'id': 1,
                'text': 'CMS entegrasyonu tamamlandı, çok heyecanlıyım!',
                'emoji': '🎉',
                'date': datetime.now() - timedelta(days=12)
            }
        ],
        'notificationsSent': {
            'sevenDays': False,
            'threeDays': False,
            'lastDay': False,
            'overdue': False
        }
    })
    print(f'✅ Proje 2 oluşturuldu: {project2_id}')
    
    # Proje 3: Tamamlanmış proje
    project3_id = '1734567892222'
    projects_ref.document(project3_id).set({
        'id': 1734567892222,
        'title': 'E-Ticaret Dashboard',
        'description': 'Admin paneli ve raporlama sistemi',
        'startDate': datetime.now() - timedelta(days=60),
        'endDate': datetime.now() - timedelta(days=10),
        'status': 'completed',
        'done': True,
        'createdAt': firestore.SERVER_TIMESTAMP,
        'updatedAt': firestore.SERVER_TIMESTAMP,
        'milestones': [
            {
                'id': 1,
                'text': 'Dashboard Tasarımı',
                'completed': True,
                'color': '#A8E6CF',
                'createdAt': datetime.now() - timedelta(days=55)
            },
            {
                'id': 2,
                'text': 'Grafik Entegrasyonu',
                'completed': True,
                'color': '#FFD3B6',
                'createdAt': datetime.now() - timedelta(days=50)
            },
            {
                'id': 3,
                'text': 'Deployment',
                'completed': True,
                'color': '#FFAAA5',
                'createdAt': datetime.now() - timedelta(days=40)
            }
        ],
        'journals': [
            {
                'id': 1,
                'text': 'Projeyi başarıyla tamamladık! Müşteri çok memnun.',
                'emoji': '🚀',
                'date': datetime.now() - timedelta(days=10)
            }
        ],
        'notificationsSent': {
            'sevenDays': True,
            'threeDays': True,
            'lastDay': True,
            'overdue': False
        }
    })
    print(f'✅ Proje 3 oluşturuldu: {project3_id}')
    
    # Proje 4: Gelecek proje (7 gün sonra)
    project4_id = '1734567893333'
    projects_ref.document(project4_id).set({
        'id': 1734567893333,
        'title': 'AI Chatbot Entegrasyonu',
        'description': 'GPT-4 ile akıllı müşteri desteği',
        'startDate': datetime.now(),
        'endDate': datetime.now() + timedelta(days=7),
        'status': 'active',
        'done': False,
        'createdAt': firestore.SERVER_TIMESTAMP,
        'updatedAt': firestore.SERVER_TIMESTAMP,
        'milestones': [
            {
                'id': 1,
                'text': 'API Araştırması',
                'completed': False,
                'color': '#B4A7D6',
                'createdAt': datetime.now()
            },
            {
                'id': 2,
                'text': 'Prototype Geliştirme',
                'completed': False,
                'color': '#D4A5A5',
                'createdAt': datetime.now()
            }
        ],
        'journals': [],
        'notificationsSent': {
            'sevenDays': False,
            'threeDays': False,
            'lastDay': False,
            'overdue': False
        }
    })
    print(f'✅ Proje 4 oluşturuldu: {project4_id}')

def verify_data(user_id='test-user'):
    """Oluşturulan verileri doğrula"""
    print(f'\n🔍 Veri doğrulama yapılıyor...')
    
    # Kullanıcı kontrolü
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    if user_doc.exists:
        print(f'✅ Kullanıcı bulundu: {user_id}')
        user_data = user_doc.to_dict()
        print(f'   - Timezone: {user_data.get("timezone")}')
        print(f'   - Language: {user_data.get("language")}')
    else:
        print(f'❌ Kullanıcı bulunamadı: {user_id}')
        return
    
    # Projeler kontrolü
    projects_ref = user_ref.collection('projects')
    projects = projects_ref.get()
    
    print(f'\n📊 Toplam {len(projects)} proje bulundu:')
    
    for project_doc in projects:
        project = project_doc.to_dict()
        print(f'\n   📁 {project.get("title")}')
        print(f'      - ID: {project.get("id")}')
        print(f'      - Status: {project.get("status")}')
        print(f'      - End Date: {project.get("endDate")}')
        print(f'      - Milestones: {len(project.get("milestones", []))}')
        print(f'      - Journals: {len(project.get("journals", []))}')

def main():
    """Ana fonksiyon"""
    print('🚀 Firestore test verisi oluşturuluyor...\n')
    
    try:
        # Test kullanıcısı oluştur
        setup_test_user('test-user')
        
        # Örnek projeler oluştur
        create_sample_projects('test-user')
        
        # Verileri doğrula
        verify_data('test-user')
        
        print('\n✅ Tüm test verileri başarıyla oluşturuldu!')
        print('📍 Firebase Console: https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore')
        print('🔍 Kullanıcı ID: test-user')
        print('🎯 4 adet örnek proje oluşturuldu')
        print('\n💡 Şimdi yapabilecekleriniz:')
        print('   1. Firebase Console\'dan verileri kontrol edin')
        print('   2. React Native uygulamasını çalıştırın')
        print('   3. check_project_deadlines.py script\'ini test edin')
        
    except Exception as e:
        print(f'\n❌ Hata oluştu: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

