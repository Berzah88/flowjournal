# 🚀 PythonAnywhere Setup Guide

**Account:** mberzah.pythonanywhere.com  
**Date:** October 10, 2025

---

## 📋 Step-by-Step Setup

### **1. Login to PythonAnywhere**
```
https://www.pythonanywhere.com/login/
Username: mberzah
```

---

### **2. Upload Backend Files**

Go to **Files** tab and create:

```
/home/mberzah/
├── flask_app.py                    # Main Flask application
├── check_project_deadlines.py      # Deadline checker
├── serviceAccountKey.json          # Firebase credentials
└── requirements.txt                # Python dependencies
```

**Upload these files:**
1. `flask_app.py` - from your `backend/` folder
2. `check_project_deadlines.py` - from your `backend/` folder
3. `serviceAccountKey.json` - from your `backend/` folder

---

### **3. Create requirements.txt**

File: `/home/mberzah/requirements.txt`

```txt
Flask==3.0.0
firebase-admin==6.2.0
python-dotenv==1.0.0
gunicorn==21.2.0
```

---

### **4. Install Dependencies**

Go to **Consoles** → Open **Bash console**:

```bash
cd ~
pip3 install --user -r requirements.txt
```

Wait for installation to complete (~2-3 minutes)

---

### **5. Create Web App**

Go to **Web** tab:

1. Click **"Add a new web app"**
2. Select **Flask**
3. Select **Python 3.10**
4. Click **Next**

**Important:** Set these configurations:

#### Source Code:
```
/home/mberzah/
```

#### WSGI Configuration File:
Click on the WSGI config file link and replace content with:

```python
import sys
import os

# Add your project directory to sys.path
project_home = '/home/mberzah'
if project_home not in sys.path:
    sys.path = [project_home] + sys.path

# Import flask app
from flask_app import app as application
```

#### Working Directory:
```
/home/mberzah/
```

---

### **6. Configure Environment Variables**

Still in **Web** tab, scroll to **Environment variables**:

Add these:
```
GOOGLE_APPLICATION_CREDENTIALS = /home/mberzah/serviceAccountKey.json
```

---

### **7. Reload Web App**

Click the big green **"Reload mberzah.pythonanywhere.com"** button

---

### **8. Test API Endpoints**

Open a new browser tab or use curl:

#### Test Health Check:
```bash
curl https://mberzah.pythonanywhere.com/
```

**Expected Response:**
```json
{
  "status": "healthy",
  "message": "Flow Journal Notification API is running!",
  "timestamp": "2025-10-10T12:00:00.000000"
}
```

#### Test Daily Reminder:
```bash
curl -X POST https://mberzah.pythonanywhere.com/api/send-daily-reminder
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Daily reminders sent successfully",
  "sent_count": 2
}
```

#### Test Deadline Reminder:
```bash
curl -X POST https://mberzah.pythonanywhere.com/api/send-project-deadline-reminder
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Deadline reminders sent",
  "projects_found": 3,
  "notifications_sent": 3
}
```

---

### **9. Setup Scheduled Tasks (Cron)**

Go to **Tasks** tab:

#### Task 1: Daily Journal Reminder
- **Time:** `19:00 UTC` (22:00 Turkey)
- **Command:** 
  ```bash
  curl -X POST https://mberzah.pythonanywhere.com/api/send-daily-reminder
  ```
- **Frequency:** Daily

#### Task 2: Project Deadline Reminder
- **Time:** `09:00 UTC` (12:00 Turkey)
- **Command:**
  ```bash
  curl -X POST https://mberzah.pythonanywhere.com/api/send-project-deadline-reminder
  ```
- **Frequency:** Daily

---

### **10. Monitor Logs**

Go to **Web** tab → **Log files**:

Check these logs regularly:
- **Error log:** `/var/log/mberzah.pythonanywhere.com.error.log`
- **Server log:** `/var/log/mberzah.pythonanywhere.com.server.log`

---

## 🔧 Troubleshooting

### Issue: 404 Not Found
**Solution:** 
1. Check WSGI configuration
2. Ensure `flask_app.py` is in `/home/mberzah/`
3. Reload web app

### Issue: 500 Internal Server Error
**Solution:**
1. Check error log for details
2. Verify `serviceAccountKey.json` is uploaded
3. Verify Firebase credentials are correct
4. Check Python packages are installed

### Issue: No notifications received
**Solution:**
1. Check if API responds (use health check)
2. Verify FCM tokens in Firestore
3. Check Firebase Console for errors
4. Run manual test: `python send_manual_test.py`

### Issue: ImportError
**Solution:**
```bash
cd ~
pip3 install --user firebase-admin Flask
```

---

## ✅ Verification Checklist

- [ ] Files uploaded to PythonAnywhere
- [ ] requirements.txt created
- [ ] Dependencies installed
- [ ] Web app created and configured
- [ ] WSGI config updated
- [ ] Environment variables set
- [ ] Web app reloaded
- [ ] Health check returns 200 OK
- [ ] Daily reminder endpoint works
- [ ] Deadline reminder endpoint works
- [ ] Scheduled tasks created
- [ ] Logs are accessible
- [ ] Notifications received on device

---

## 📱 Quick Test

After setup, test immediately:

```bash
# 1. Health check
curl https://mberzah.pythonanywhere.com/

# 2. Send test notification
curl -X POST https://mberzah.pythonanywhere.com/api/send-daily-reminder

# 3. Check your phone for notification
```

---

## 📞 Support

If you encounter issues:

1. **PythonAnywhere Help:** https://help.pythonanywhere.com/
2. **PythonAnywhere Forums:** https://www.pythonanywhere.com/forums/
3. **Firebase Console:** Check for quota/errors
4. **Local Test:** Run `python send_manual_test.py` to verify Firebase works

---

## 🎯 Success Criteria

✅ API responds to health check  
✅ Daily reminder sends notifications  
✅ Deadline reminder sends notifications  
✅ Scheduled tasks run automatically  
✅ No errors in logs  
✅ Notifications received on device

---

**Last Updated:** October 10, 2025  
**Status:** Ready for deployment
