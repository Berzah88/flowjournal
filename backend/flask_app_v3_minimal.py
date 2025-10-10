#!/usr/bin/env python3
"""Minimal Flask App - Super Fast"""

from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import credentials, messaging, firestore
from datetime import datetime, timedelta

app = Flask(__name__)
SECRET_KEY = 'py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1'
firebase_initialized = False

def init_firebase():
    global firebase_initialized
    if firebase_initialized:
        return True
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate('/home/mberzah/mysite/serviceAccountKey.json')
            firebase_admin.initialize_app(cred)
        firebase_initialized = True
        return True
    except:
        return False

def verify():
    key = request.args.get('secret')
    return key == SECRET_KEY

@app.route('/')
def index():
    return jsonify({'status': 'active', 'version': '3.0.0'})

@app.route('/health')
def health():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

@app.route('/trigger-daily-reminder', methods=['POST'])
def daily():
    if not verify():
        return jsonify({'error': 'Unauthorized'}), 401
    if not init_firebase():
        return jsonify({'error': 'Firebase failed'}), 500
    
    try:
        msg = messaging.Message(
            notification=messaging.Notification(
                title='📖 Günlük Hatırlatma',
                body='Bugün neler hissettin? Günlüğüne birkaç satır ekle 💭'
            ),
            topic='daily_reminders',
            android=messaging.AndroidConfig(priority='high')
        )
        response = messaging.send(msg)
        return jsonify({'success': True, 'message_id': response}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/send-deadline-notifications', methods=['POST'])
def deadlines():
    if not verify():
        return jsonify({'error': 'Unauthorized'}), 401
    if not init_firebase():
        return jsonify({'error': 'Firebase failed'}), 500
    
    try:
        db = firestore.client()
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        sent = 0
        checked = 0
        
        for user in db.collection('users').limit(50).stream():
            checked += 1
            token = user.to_dict().get('fcmToken')
            if not token:
                continue
            
            for proj in db.collection('users').document(user.id).collection('projects').where('status', '==', 'active').limit(20).stream():
                pdata = proj.to_dict()
                edate = pdata.get('endDate')
                if not edate or not hasattr(edate, 'timestamp'):
                    continue
                
                ddate = datetime.fromtimestamp(edate.timestamp()).replace(hour=0, minute=0, second=0, microsecond=0)
                days = (ddate - today).days
                
                if days not in [0, 1, 3]:
                    continue
                
                title = pdata.get('title', 'Project')
                body = f'"{title}" projeniz {"bugün" if days == 0 else "yarın" if days == 1 else "3 gün sonra"} bitiyor!'
                
                msg = messaging.Message(
                    notification=messaging.Notification(title='⏰ Deadline Yaklaşıyor!', body=body),
                    data={'type': 'deadline', 'days': str(days)},
                    token=token,
                    android=messaging.AndroidConfig(priority='high')
                )
                
                messaging.send(msg)
                sent += 1
        
        return jsonify({'success': True, 'users_checked': checked, 'notifications_sent': sent}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

