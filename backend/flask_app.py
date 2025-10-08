#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
PythonAnywhere Flask Web App - Notification API
------------------------------------------------
Bu Flask app, dışarıdan HTTP request ile bildirim gönderme imkanı sağlar.
Cron-job.org gibi external cronjob servislerinden çağrılabilir.

Endpoints:
1. /trigger-daily-reminder - Günlük hatırlatma gönder
2. /trigger-milestone-reminder - Milestone hatırlatması gönder
3. /trigger-project-deadline - Proje bitiş tarihi hatırlatması

Setup:
1. PythonAnywhere → Web → Add a new web app → Flask
2. Bu dosyayı WSGI configuration'da tanımla
3. SECRET_KEY environment variable ayarla
"""

from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import credentials, messaging
import os
import sys
from datetime import datetime
import logging

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Secret key - ⚠️ BUNU DEĞİŞTİR!
SECRET_KEY = os.environ.get('NOTIFICATION_SECRET_KEY', 'CHANGE_THIS_SECRET_KEY_123')

# Firebase başlatma flag
firebase_initialized = False

def initialize_firebase():
    """Firebase Admin SDK'yı başlatır (singleton)"""
    global firebase_initialized
    
    if firebase_initialized:
        return True
    
    try:
        # serviceAccountKey.json path'i
        # ⚠️ KULLANICI_ADIN'i değiştir!
        cred_path = '/home/KULLANICI_ADIN/mysite/serviceAccountKey.json'
        
        if not os.path.exists(cred_path):
            logger.error(f'serviceAccountKey.json bulunamadı: {cred_path}')
            return False
        
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            logger.info('✅ Firebase Admin SDK başlatıldı')
        
        firebase_initialized = True
        return True
        
    except Exception as e:
        logger.error(f'❌ Firebase başlatma hatası: {str(e)}')
        return False

def verify_secret_key(request):
    """Secret key doğrulama"""
    key = request.args.get('key') or request.headers.get('X-API-Key')
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
        'version': '1.0.0',
        'endpoints': [
            '/trigger-daily-reminder',
            '/trigger-milestone-reminder',
            '/trigger-project-deadline',
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
    
    # Secret key kontrolü
    if not verify_secret_key(request):
        return jsonify({'error': 'Unauthorized', 'message': 'Invalid API key'}), 401
    
    # Firebase'i başlat
    if not initialize_firebase():
        return jsonify({'error': 'Firebase initialization failed'}), 500
    
    try:
        logger.info(f'📅 Günlük hatırlatma gönderiliyor... ({datetime.now().isoformat()})')
        
        # FCM Message oluştur
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
                    channel_id='daily-journal-reminder',
                )
            )
        )
        
        # Bildirimi gönder
        response = messaging.send(message)
        logger.info(f'✅ Bildirim gönderildi! Message ID: {response}')
        
        return jsonify({
            'success': True,
            'message': 'Daily reminder sent successfully',
            'message_id': response,
            'topic': 'daily_reminders',
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f'❌ Bildirim gönderme hatası: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/trigger-milestone-reminder', methods=['POST'])
def trigger_milestone_reminder():
    """Milestone hatırlatması gönder (Token bazlı)"""
    
    # Secret key kontrolü
    if not verify_secret_key(request):
        return jsonify({'error': 'Unauthorized'}), 401
    
    # Firebase'i başlat
    if not initialize_firebase():
        return jsonify({'error': 'Firebase initialization failed'}), 500
    
    try:
        # Request body'den bilgileri al
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        fcm_token = data.get('fcm_token')
        milestone_name = data.get('milestone_name', 'Milestone')
        project_name = data.get('project_name', 'Proje')
        
        if not fcm_token:
            return jsonify({'error': 'fcm_token required'}), 400
        
        logger.info(f'📍 Milestone hatırlatması gönderiliyor: {milestone_name}')
        
        # FCM Message oluştur
        message = messaging.Message(
            notification=messaging.Notification(
                title=f'🎯 {milestone_name}',
                body=f'{project_name} için bu milestone\'u tamamlamayı unutma!',
            ),
            token=fcm_token,
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    sound='default',
                    channel_id='milestone-reminders',
                )
            )
        )
        
        # Bildirimi gönder
        response = messaging.send(message)
        logger.info(f'✅ Milestone hatırlatması gönderildi! Message ID: {response}')
        
        return jsonify({
            'success': True,
            'message': 'Milestone reminder sent successfully',
            'message_id': response,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f'❌ Milestone hatırlatma hatası: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/trigger-project-deadline', methods=['POST'])
def trigger_project_deadline():
    """Proje bitiş tarihi hatırlatması gönder (Token bazlı)"""
    
    # Secret key kontrolü
    if not verify_secret_key(request):
        return jsonify({'error': 'Unauthorized'}), 401
    
    # Firebase'i başlat
    if not initialize_firebase():
        return jsonify({'error': 'Firebase initialization failed'}), 500
    
    try:
        # Request body'den bilgileri al
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        fcm_token = data.get('fcm_token')
        project_name = data.get('project_name', 'Proje')
        days_left = data.get('days_left', 0)
        
        if not fcm_token:
            return jsonify({'error': 'fcm_token required'}), 400
        
        logger.info(f'⏰ Proje deadline hatırlatması: {project_name} ({days_left} gün kaldı)')
        
        # Mesaj içeriği
        if days_left == 0:
            body = f'{project_name} bugün bitiyor! Son kontrollerini yap! 🚀'
        elif days_left == 1:
            body = f'{project_name} yarın bitiyor! Hazır mısın? 💪'
        else:
            body = f'{project_name} bitmesine {days_left} gün kaldı! 📅'
        
        # FCM Message oluştur
        message = messaging.Message(
            notification=messaging.Notification(
                title=f'⏰ Proje Deadline: {project_name}',
                body=body,
            ),
            token=fcm_token,
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    sound='default',
                    channel_id='project-deadlines',
                )
            ),
            data={
                'type': 'project_deadline',
                'project_name': project_name,
                'days_left': str(days_left)
            }
        )
        
        # Bildirimi gönder
        response = messaging.send(message)
        logger.info(f'✅ Deadline hatırlatması gönderildi! Message ID: {response}')
        
        return jsonify({
            'success': True,
            'message': 'Project deadline reminder sent successfully',
            'message_id': response,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f'❌ Deadline hatırlatma hatası: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Development mode
    app.run(debug=True, host='0.0.0.0', port=5000)

