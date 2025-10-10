#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Optimized Flask App - Inline deadline checking (no subprocess)
"""

from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import credentials, messaging, firestore
import os
from datetime import datetime, timedelta
import logging

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Secret key
SECRET_KEY = 'py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1'

# Firebase başlatma flag
firebase_initialized = False
db = None

def initialize_firebase():
    """Firebase Admin SDK'yı başlatır (singleton)"""
    global firebase_initialized, db
    
    if firebase_initialized:
        return True
    
    try:
        cred_path = '/home/mberzah/mysite/serviceAccountKey.json'
        
        if not os.path.exists(cred_path):
            logger.error(f'serviceAccountKey.json bulunamadı: {cred_path}')
            return False
        
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            logger.info('✅ Firebase Admin SDK başlatıldı')
        
        db = firestore.client()
        firebase_initialized = True
        return True
        
    except Exception as e:
        logger.error(f'❌ Firebase başlatma hatası: {str(e)}')
        return False

def verify_secret_key():
    """Secret key doğrulama"""
    key = request.args.get('secret') or request.headers.get('X-API-Key')
    if key != SECRET_KEY:
        logger.warning(f'⚠️ Unauthorized request from {request.remote_addr}')
        return False
    return True

@app.route('/')
def index():
    """Ana sayfa"""
    return jsonify({
        'status': 'active',
        'service': 'Flow Journal Notification API',
        'version': '2.0.0',
        'endpoints': [
            '/trigger-daily-reminder',
            '/send-deadline-notifications',
            '/health'
        ]
    })

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'firebase': 'initialized' if firebase_initialized else 'not_initialized'
    })

@app.route('/trigger-daily-reminder', methods=['GET', 'POST'])
def trigger_daily_reminder():
    """Günlük hatırlatma gönder (Topic bazlı)"""
    
    if not verify_secret_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    if not initialize_firebase():
        return jsonify({'error': 'Firebase initialization failed'}), 500
    
    try:
        logger.info(f'📅 Günlük hatırlatma gönderiliyor... ({datetime.now().isoformat()})')
        
        message = messaging.Message(
            notification=messaging.Notification(
                title='📖 Günlük Hatırlatma',
                body='Bugün neler hissettin? Günlüğüne birkaç satır ekle 💭',
            ),
            topic='daily_reminders',
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    sound='default',
                    priority='high',
                    channel_id='default'
                )
            )
        )
        
        response = messaging.send(message)
        logger.info(f'✅ Bildirim gönderildi! Message ID: {response}')
        
        return jsonify({
            'success': True,
            'message': 'Daily reminder sent successfully',
            'message_id': response,
            'timestamp': datetime.now().isoformat(),
            'topic': 'daily_reminders'
        }), 200
        
    except Exception as e:
        logger.error(f'❌ Günlük hatırlatma hatası: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/send-deadline-notifications', methods=['GET', 'POST'])
def send_deadline_notifications():
    """
    INLINE deadline notification sender (no subprocess)
    Optimized for PythonAnywhere timeout
    """
    
    if not verify_secret_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    if not initialize_firebase():
        return jsonify({'error': 'Firebase initialization failed'}), 500
    
    try:
        logger.info('🚀 Deadline notifications starting...')
        
        # Bugün ve yarın
        now = datetime.now()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        notifications_sent = 0
        users_checked = 0
        errors = []
        
        # Tüm kullanıcıları al (limit for timeout prevention)
        users_ref = db.collection('users').limit(100)
        users = users_ref.stream()
        
        for user in users:
            users_checked += 1
            user_data = user.to_dict()
            fcm_token = user_data.get('fcmToken')
            
            if not fcm_token:
                continue
            
            # Aktif projeleri al
            projects_ref = db.collection('users').document(user.id).collection('projects')
            projects_query = projects_ref.where('status', '==', 'active').limit(50)
            projects = projects_query.stream()
            
            for project in projects:
                try:
                    project_data = project.to_dict()
                    end_date = project_data.get('endDate')
                    
                    if not end_date or not hasattr(end_date, 'timestamp'):
                        continue
                    
                    # Deadline hesapla
                    end_datetime = datetime.fromtimestamp(end_date.timestamp())
                    deadline_date = end_datetime.replace(hour=0, minute=0, second=0, microsecond=0)
                    days_left = (deadline_date - today).days
                    
                    # 0, 1, 3 gün kala bildirim gönder
                    if days_left not in [0, 1, 3]:
                        continue
                    
                    title = project_data.get('title', 'Unnamed Project')
                    
                    if days_left == 0:
                        body = f'"{title}" projeniz bugün bitiyor!'
                    elif days_left == 1:
                        body = f'"{title}" projeniz yarın bitiyor! 1 gün kaldı.'
                    else:
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
                    
                    messaging.send(message)
                    notifications_sent += 1
                    logger.info(f'✅ Sent to {user.id}: {title} ({days_left} days)')
                    
                except Exception as e:
                    error_msg = f'Error for {user.id}: {str(e)}'
                    errors.append(error_msg)
                    logger.error(f'❌ {error_msg}')
        
        result = {
            'success': True,
            'users_checked': users_checked,
            'notifications_sent': notifications_sent,
            'errors': errors if errors else None,
            'timestamp': datetime.now().isoformat()
        }
        
        logger.info(f'✅ Deadline check complete: {notifications_sent} notifications sent')
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f'❌ Deadline check error: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

