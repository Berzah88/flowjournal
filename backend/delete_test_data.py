#!/usr/bin/env python3
"""
Firebase Firestore Test Data Deletion Script
Bu script test kullanıcısını ve tüm projelerini siler.
"""

import firebase_admin
from firebase_admin import credentials, firestore
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

def delete_user_projects(user_id='test-user'):
    """Kullanıcının tüm projelerini sil"""
    print(f'🗑️  {user_id} kullanıcısının projeleri siliniyor...')
    
    projects_ref = db.collection('users').document(user_id).collection('projects')
    projects = projects_ref.stream()
    
    deleted_count = 0
    for project_doc in projects:
        project = project_doc.to_dict()
        project_title = project.get('title', 'Bilinmeyen')
        
        project_doc.reference.delete()
        deleted_count += 1
        print(f'   ✅ Proje silindi: {project_title} (ID: {project_doc.id})')
    
    if deleted_count == 0:
        print(f'   ℹ️  Silinecek proje bulunamadı')
    else:
        print(f'\n✅ Toplam {deleted_count} proje silindi')
    
    return deleted_count

def delete_user(user_id='test-user'):
    """Kullanıcıyı sil"""
    print(f'\n🗑️  {user_id} kullanıcısı siliniyor...')
    
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        print(f'   ℹ️  Kullanıcı bulunamadı: {user_id}')
        return False
    
    user_ref.delete()
    print(f'✅ Kullanıcı silindi: {user_id}')
    return True

def verify_deletion(user_id='test-user'):
    """Silme işlemini doğrula"""
    print(f'\n🔍 Silme işlemi doğrulanıyor...')
    
    # Kullanıcı kontrolü
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        print(f'✅ Kullanıcı silindi: {user_id}')
    else:
        print(f'❌ Kullanıcı hala mevcut: {user_id}')
        return False
    
    # Projeler kontrolü
    projects_ref = user_ref.collection('projects')
    projects = list(projects_ref.stream())
    
    if len(projects) == 0:
        print(f'✅ Tüm projeler silindi')
    else:
        print(f'❌ Hala {len(projects)} proje mevcut')
        return False
    
    return True

def main():
    """Ana fonksiyon"""
    print('🚨 UYARI: Bu script TÜM test verilerini silecek!\n')
    
    # Kullanıcıdan onay al
    confirm = input('Devam etmek istiyor musunuz? (evet/hayır): ').strip().lower()
    
    if confirm not in ['evet', 'yes', 'e', 'y']:
        print('❌ İşlem iptal edildi')
        sys.exit(0)
    
    print('\n🗑️  Test verileri siliniyor...\n')
    
    try:
        # Projeleri sil
        deleted_projects = delete_user_projects('test-user')
        
        # Kullanıcıyı sil
        deleted_user = delete_user('test-user')
        
        # Doğrula
        if verify_deletion('test-user'):
            print('\n✅ Tüm test verileri başarıyla silindi!')
            print('💡 Yeni test verisi oluşturmak için:')
            print('   python3 setup_firestore_test_data.py')
        else:
            print('\n⚠️  Bazı veriler silinmemiş olabilir')
            print('   Firebase Console\'dan manuel kontrol edin')
        
    except Exception as e:
        print(f'\n❌ Hata oluştu: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

