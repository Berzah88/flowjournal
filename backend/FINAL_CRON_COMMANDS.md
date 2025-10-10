# ⚡ FINAL CRON JOB COMMANDS
**Ready to Copy-Paste to PythonAnywhere**

---

## 📍 PythonAnywhere Tasks URL
```
https://www.pythonanywhere.com/user/mberzah/tasks/
```

---

## ⏰ TASK 1: DAILY JOURNAL REMINDER

**Description:**
```
Daily Journal Reminder
```

**Time (UTC):**
```
Hour: 19
Minute: 0
```

**Command:**
```
curl -X POST "https://mberzah.pythonanywhere.com/trigger-daily-reminder?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
```

**When it runs:**
- Every day at 22:00 Turkey Time
- Sends to all users subscribed to "daily_reminders" topic
- Notification: "📖 Günlük Hatırlatma"

---

## ⏰ TASK 2: PROJECT DEADLINE NOTIFICATIONS (OPTIMIZED)

**Description:**
```
Project Deadline Notifications
```

**Time (UTC):**
```
Hour: 9
Minute: 0
```

**Command:**
```
curl -X POST "https://mberzah.pythonanywhere.com/send-deadline-notifications?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
```

**When it runs:**
- Every day at 12:00 Turkey Time
- Checks all users for projects with deadlines
- Sends notifications for projects with 0, 1, or 3 days left
- Only active projects (status != 'completed')

---

## 🧪 MANUAL TEST COMMANDS

### Test Daily Reminder:
```bash
curl -X POST "https://mberzah.pythonanywhere.com/trigger-daily-reminder?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
```

**Expected:** Notification in 2-3 seconds

---

### Test Deadline Notifications:
```bash
curl -X POST "https://mberzah.pythonanywhere.com/send-deadline-notifications?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
```

**Expected:** JSON response with notification count

---

### Health Check:
```bash
curl https://mberzah.pythonanywhere.com/health
```

**Expected:**
```json
{
  "status": "healthy",
  "timestamp": "...",
  "firebase": "initialized"
}
```

---

## 📋 FILES TO UPLOAD TO PYTHONANYWHERE

Make sure these files are in `/home/mberzah/mysite/`:

1. ✅ `flask_app.py` (updated with new endpoint)
2. ✅ `send_deadline_notifications.py` (new optimized script)
3. ✅ `serviceAccountKey.json` (Firebase credentials)
4. ✅ `check_project_deadlines.py` (backup, optional)

---

## 🔄 UPDATE PYTHONANYWHERE

### Step 1: Upload New Files
```
Files Tab → Upload
→ send_deadline_notifications.py
```

### Step 2: Update flask_app.py
```
Files Tab → mysite/flask_app.py → Edit
→ Copy content from local flask_app.py
→ Save
```

### Step 3: Reload Web App
```
Web Tab → Reload mberzah.pythonanywhere.com
```

---

## ✅ VERIFICATION

After upload, test:

```bash
# Should see new endpoint
curl https://mberzah.pythonanywhere.com/

# Should return version 1.3.0 and new endpoint:
# /send-deadline-notifications
```

Test the new endpoint:
```bash
curl -X POST "https://mberzah.pythonanywhere.com/send-deadline-notifications?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
```

Expected response:
```json
{
  "success": true,
  "message": "Deadline notifications sent",
  "users_checked": 2,
  "notifications_sent": 1,
  "timestamp": "2025-10-10T..."
}
```

---

## 🎯 FINAL CRON SETUP

Once verified, create these tasks in PythonAnywhere:

| Task | Time | Command |
|------|------|---------|
| Daily Reminder | 19:00 UTC | `curl -X POST "https://mberzah.pythonanywhere.com/trigger-daily-reminder?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"` |
| Deadline Check | 09:00 UTC | `curl -X POST "https://mberzah.pythonanywhere.com/send-deadline-notifications?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"` |

---

## 📊 EXPECTED BEHAVIOR

### Daily (22:00 Turkey Time):
```
📖 Günlük Hatırlatma
Bugün neler hissettin? Günlüğüne birkaç satır ekle 💭
```
→ Sent to ALL users

### Daily (12:00 Turkey Time):
```
⏰ Proje Deadline Yaklaşıyor!
"[Project Name]" projeniz yarın bitiyor! 1 gün kaldı.
```
→ Sent to users with upcoming deadlines ONLY

---

## 🚀 READY TO DEPLOY!

1. ✅ Upload files to PythonAnywhere
2. ✅ Test endpoints manually
3. ✅ Create cron tasks
4. ✅ Wait for scheduled times
5. ✅ Verify notifications arrive

**Last Updated:** October 10, 2025  
**Status:** PRODUCTION READY ✅

