# ⏰ CRON JOB SETUP GUIDE
**PythonAnywhere Otomatik Bildirim Sistemi**

**Account:** mberzah.pythonanywhere.com  
**Date:** October 10, 2025

---

## 📋 GEREKSINIMLER

✅ PythonAnywhere account (Free/Paid)  
✅ Flask app deployed  
✅ Firebase credentials uploaded  
✅ API endpoints working

---

## 🎯 BILDIRIM ZAMANLARI

### **1. Günlük Hatırlatma (Daily Reminder)**
- **Zaman:** `19:00 UTC` (22:00 Turkey Time)
- **Sıklık:** Her gün
- **Tip:** Topic-based (daily_reminders)
- **Hedef:** Tüm kullanıcılar

### **2. Proje Deadline Kontrolü (Project Deadlines)**
- **Zaman:** `09:00 UTC` (12:00 Turkey Time)
- **Sıklık:** Her gün
- **Tip:** Token-based (individual users)
- **Hedef:** Deadline'ı yaklaşan projeleri olan kullanıcılar

---

## 🚀 KURULUM ADIMLARI

### **Step 1: PythonAnywhere Dashboard**

1. Login: https://www.pythonanywhere.com/
2. Username: `mberzah`
3. Go to **"Tasks"** tab

---

### **Step 2: Daily Reminder Cron Job**

#### **Task 1 - Günlük Hatırlatma**

```
Description: Daily Journal Reminder
Time: 19:00 UTC
Command: curl -X POST "https://mberzah.pythonanywhere.com/trigger-daily-reminder?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
```

**Detaylı Ayarlar:**
- **Hour:** `19`
- **Minute:** `00`
- **Command:**
  ```bash
  curl -X POST "https://mberzah.pythonanywhere.com/trigger-daily-reminder?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
  ```

**Beklenen Sonuç:**
```json
{
  "message": "Daily reminder sent successfully",
  "message_id": "projects/flowjournal-731f7/messages/...",
  "success": true,
  "timestamp": "2025-10-10T19:00:00.000000",
  "topic": "daily_reminders"
}
```

---

### **Step 3: Deadline Reminder Cron Job**

#### **Task 2 - Proje Deadline Kontrolü**

```
Description: Project Deadline Check
Time: 09:00 UTC
Command: curl -X POST "https://mberzah.pythonanywhere.com/check-project-deadlines?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
```

**Detaylı Ayarlar:**
- **Hour:** `09`
- **Minute:** `00`
- **Command:**
  ```bash
  curl -X POST "https://mberzah.pythonanywhere.com/check-project-deadlines?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
  ```

**Beklenen Sonuç:**
```json
{
  "success": true,
  "message": "Project deadlines checked successfully",
  "output": "...",
  "timestamp": "2025-10-10T09:00:00.000000"
}
```

---

## 🔧 PYTHONANYWHERE TASKS UI

### **Adım Adım:**

1. **"Tasks" Tab'ına Git**
   ```
   Dashboard → Tasks
   ```

2. **"Create a new scheduled task"**

3. **Task 1: Daily Reminder**
   - **Time (UTC):** `19:00`
   - **Command:** 
     ```
     curl -X POST "https://mberzah.pythonanywhere.com/trigger-daily-reminder?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
     ```
   - Click **"Create"**

4. **Task 2: Deadline Check**
   - **Time (UTC):** `09:00`
   - **Command:**
     ```
     curl -X POST "https://mberzah.pythonanywhere.com/check-project-deadlines?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
     ```
   - Click **"Create"**

---

## 🧪 MANUEL TEST

### **Test 1: Daily Reminder**
```bash
curl -X POST "https://mberzah.pythonanywhere.com/trigger-daily-reminder?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
```

**Expected Output:**
```json
{
  "message": "Daily reminder sent successfully",
  "success": true
}
```

**Check Device:** Should receive notification immediately

---

### **Test 2: Deadline Check**
```bash
curl -X POST "https://mberzah.pythonanywhere.com/check-project-deadlines?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Project deadlines checked successfully"
}
```

**Check Device:** If you have projects with deadline tomorrow/today, should receive notification

---

## 📊 MONITORING

### **Check Cron Job Logs:**

1. Go to **Tasks** tab
2. Click on task name
3. View **"Log files"**

### **Check Application Logs:**

1. Go to **Web** tab
2. Click **"Log files"**
3. Check:
   - **Error log:** `/var/log/mberzah.pythonanywhere.com.error.log`
   - **Server log:** `/var/log/mberzah.pythonanywhere.com.server.log`

### **Expected Log Entries:**

**Daily Reminder:**
```
[2025-10-10 19:00:00] 📅 Günlük hatırlatma gönderiliyor...
[2025-10-10 19:00:01] ✅ Topic'e bildirim gönderildi: daily_reminders
```

**Deadline Check:**
```
[2025-10-10 09:00:00] 🔍 Proje deadline kontrolleri başlıyor...
[2025-10-10 09:00:05] ✅ 3 kullanıcı kontrol edildi
[2025-10-10 09:00:05] ✅ 2 bildirim gönderildi
```

---

## ⚠️ PYTHONANYWHERE LIMITATIONS

### **Free Account:**
- ✅ Can create scheduled tasks
- ✅ Can use curl commands
- ✅ Daily scheduled tasks work
- ⚠️ Limited to one scheduled task per day (upgrade for more)

### **Paid Account ($5/month):**
- ✅ Multiple scheduled tasks
- ✅ More CPU time
- ✅ Custom domains
- ✅ More bandwidth

---

## 🔐 SECURITY

### **API Key:**
```
py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1
```

**Location:** `backend/flask_app.py` line 72

**Important:**
- ⚠️ Never commit API key to public repos
- ⚠️ Change key before production
- ✅ Use environment variables in production

---

## 📱 NOTIFICATION SCENARIOS

### **Scenario 1: User with project deadline tomorrow**
```
09:00 UTC → Deadline check runs
→ Finds project with deadline = tomorrow
→ Sends: "📢 [Project Name] - 1 Gün Kaldı!"
```

### **Scenario 2: User subscribed to daily reminders**
```
19:00 UTC → Daily reminder runs
→ Sends to topic: daily_reminders
→ All subscribed users receive: "📖 Günlük Hatırlatma"
```

### **Scenario 3: User with no deadlines**
```
09:00 UTC → Deadline check runs
→ No projects with upcoming deadlines
→ No notification sent (✅ correct behavior)
```

---

## 🐛 TROUBLESHOOTING

### **Problem: Cron job not running**
**Solution:**
1. Check time is in UTC (not Turkey time)
2. Verify command syntax is correct
3. Check PythonAnywhere account is active

### **Problem: No notifications received**
**Solution:**
1. Test endpoint manually with curl
2. Check Firebase logs in Firebase Console
3. Verify FCM tokens are valid in Firestore
4. Check user subscribed to topic (daily reminders)

### **Problem: 401 Unauthorized**
**Solution:**
1. Verify API key is correct
2. Check `?secret=...` parameter in curl command

### **Problem: 500 Server Error**
**Solution:**
1. Check Flask app logs
2. Verify Firebase credentials are uploaded
3. Check `check_project_deadlines.py` script exists

---

## ✅ VERIFICATION CHECKLIST

After setup, verify:

- [ ] **Tasks Created**
  - [ ] Daily Reminder at 19:00 UTC
  - [ ] Deadline Check at 09:00 UTC

- [ ] **Manual Tests Passed**
  - [ ] Daily reminder sends notification
  - [ ] Deadline check works
  - [ ] API returns 200 OK

- [ ] **Logs Accessible**
  - [ ] Can view task logs
  - [ ] Can view application logs

- [ ] **Notifications Received**
  - [ ] Daily reminder arrives at 22:00 Turkey time
  - [ ] Deadline reminders work for test projects

- [ ] **Monitoring Setup**
  - [ ] Know how to check logs
  - [ ] Know how to disable/enable tasks

---

## 📝 MAINTENANCE

### **Daily:**
- No action needed (automated)

### **Weekly:**
- Check logs for errors
- Verify notifications are sending

### **Monthly:**
- Review Firebase quota usage
- Check PythonAnywhere account status

### **When Adding New Features:**
- Update API endpoints
- Update cron commands if needed
- Test manually before deploying

---

## 🚀 NEXT STEPS

1. **Setup Tasks in PythonAnywhere**
2. **Wait for scheduled times**
3. **Verify notifications arrive**
4. **Monitor logs for first week**
5. **Adjust timing if needed**

---

## 📞 SUPPORT

- **PythonAnywhere Help:** https://help.pythonanywhere.com/
- **Firebase Console:** https://console.firebase.google.com/
- **Cron Time Converter:** https://www.worldtimebuddy.com/

---

**Last Updated:** October 10, 2025  
**Status:** ✅ Ready for Production  
**Tested:** ✅ All manual tests passed

