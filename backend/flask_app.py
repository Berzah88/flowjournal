from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import credentials, messaging, firestore
import os
import sys
import subprocess
from datetime import datetime, timedelta
import logging

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Secret key - mberzah için özel
SECRET_KEY = os.environ.get('NOTIFICATION_SECRET_KEY', 'mB7zH9kL3pQ8vW2nR5tX4jY1cF6gD0sA9uM3eK7hN2wP5qZ8')

# Firebase başlatma flag
firebase_initialized = False

def initialize_firebase():
    """Firebase Admin SDK'yı başlatır (singleton)"""
    global firebase_initialized
    
    if firebase_initialized:
        return True
    
    try:
        # serviceAccountKey.json path'i - mberzah için
        cred_path = '/home/mberzah/mysite/serviceAccountKey.json'
        
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

def verify_secret_key():
    """Secret key doğrulama"""
    key = request.args.get('secret') or request.args.get('key') or request.headers.get('X-API-Key')
    expected_key = 'py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1'
    if key != expected_key:
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
        ],
        'recommended': {
            'daily_reminder': '/trigger-daily-reminder',
            'deadline_check': '/send-deadline-notifications'
        },
        'note': 'Use send-deadline-notifications for cron (inline, no timeout)'
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
    if not verify_secret_key():
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
    if not verify_secret_key():
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

@app.route('/check-project-deadlines', methods=['GET', 'POST'])
def check_project_deadlines():
    """Tüm kullanıcıların proje deadline'larını kontrol et ve bildirim gönder"""
    
    # Secret key kontrolü
    if not verify_secret_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    # Firebase'i başlat
    if not initialize_firebase():
        return jsonify({'error': 'Firebase initialization failed'}), 500
    
    try:
        logger.info('🔍 Proje deadline kontrolleri başlıyor...')
        
        # check_project_deadlines script'ini çalıştır
        import subprocess
        
        result = subprocess.run(
            ['python3', '/home/mberzah/mysite/check_project_deadlines.py'],
            capture_output=True,
            text=True,
            timeout=120  # 2 dakika timeout
        )
        
        logger.info(f'Script output: {result.stdout}')
        
        if result.returncode == 0:
            return jsonify({
                'success': True,
                'message': 'Project deadlines checked successfully',
                'output': result.stdout,
                'timestamp': datetime.now().isoformat()
            }), 200
        else:
            logger.error(f'Script error: {result.stderr}')
            return jsonify({
                'success': False,
                'error': 'Script execution failed',
                'output': result.stderr
            }), 500
        
    except Exception as e:
        logger.error(f'❌ Deadline check hatası: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/trigger-project-deadline-reminder', methods=['GET'])
def trigger_project_deadline_reminder():
    """Proje son günü hatırlatıcısını tetikle"""
    if not verify_secret_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        logger.info('🎯 Proje son günü hatırlatıcısı tetikleniyor...')
        
        # send_project_deadline_reminder.py script'ini çalıştır
        result = subprocess.run([
            'python3', 
            os.path.join(os.path.dirname(__file__), 'send_project_deadline_reminder.py')
        ], capture_output=True, text=True, cwd=os.path.dirname(__file__))
        
        if result.returncode == 0:
            logger.info('✅ Proje son günü hatırlatıcısı başarılı')
            return jsonify({
                'message': 'Project deadline reminder sent successfully',
                'output': result.stdout,
                'success': True,
                'timestamp': datetime.now().isoformat()
            })
        else:
            logger.error(f'❌ Proje son günü hatırlatıcısı başarısız: {result.stderr}')
            return jsonify({
                'message': 'Project deadline reminder failed',
                'error': result.stderr,
                'success': False,
                'timestamp': datetime.now().isoformat()
            }), 500
            
    except Exception as e:
        logger.error(f'❌ Proje son günü hatırlatıcısı hatası: {e}')
        return jsonify({
            'message': 'Project deadline reminder error',
            'error': str(e),
            'success': False,
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/trigger-project-deadline', methods=['POST'])
def trigger_project_deadline():
    """Proje bitiş tarihi hatırlatması gönder (Token bazlı)"""
    
    # Secret key kontrolü
    if not verify_secret_key():
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

@app.route('/send-deadline-notifications', methods=['GET', 'POST'])
def send_deadline_notifications_endpoint():
    """
    INLINE deadline notification sender (no subprocess!)
    Fast and lightweight - won't timeout
    """
    
    # Secret key kontrolü
    if not verify_secret_key():
        return jsonify({'error': 'Unauthorized'}), 401
    
    # Firebase'i başlat
    if not initialize_firebase():
        return jsonify({'error': 'Firebase initialization failed'}), 500
    
    try:
        logger.info('🚀 Inline deadline notifications starting...')
        
        db = firestore.client()
        now = datetime.now()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        notifications_sent = 0
        users_checked = 0
        
        # Kullanıcıları al (limit 100)
        users = db.collection('users').limit(100).stream()
        
        for user in users:
            users_checked += 1
            user_data = user.to_dict()
            fcm_token = user_data.get('fcmToken')
            
            if not fcm_token:
                continue
            
            # Aktif projeleri al
            projects = db.collection('users').document(user.id).collection('projects').where('status', '==', 'active').limit(50).stream()
            
            for project in projects:
                project_data = project.to_dict()
                end_date = project_data.get('endDate')
                
                if not end_date or not hasattr(end_date, 'timestamp'):
                    continue
                
                # Deadline hesapla
                end_datetime = datetime.fromtimestamp(end_date.timestamp())
                deadline_date = end_datetime.replace(hour=0, minute=0, second=0, microsecond=0)
                days_left = (deadline_date - today).days
                
                # 0, 1, 3 gün kala bildirim
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
                    data={'type': 'project_deadline', 'project_id': str(project.id), 'days_left': str(days_left)},
                    token=fcm_token,
                    android=messaging.AndroidConfig(
                        priority='high',
                        notification=messaging.AndroidNotification(sound='default', priority='high')
                    )
                )
                
                messaging.send(message)
                notifications_sent += 1
                logger.info(f'✅ Sent to {user.id}: {title} ({days_left} days)')
        
        logger.info(f'✅ Complete: {notifications_sent} notifications sent to {users_checked} users')
        
        return jsonify({
            'success': True,
            'users_checked': users_checked,
            'notifications_sent': notifications_sent,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f'❌ Deadline notification error: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Development mode
    app.run(debug=True, host='0.0.0.0', port=5000)

