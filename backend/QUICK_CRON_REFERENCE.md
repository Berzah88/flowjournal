# ⚡ QUICK CRON JOB REFERENCE

## 🎯 PYTHONANYWHERE TASKS

### **Task 1: Daily Reminder**
```
Time: 19:00 UTC (22:00 Turkey)
curl -X POST "https://mberzah.pythonanywhere.com/trigger-daily-reminder?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
```

### **Task 2: Deadline Check**
```
Time: 09:00 UTC (12:00 Turkey)
curl -X POST "https://mberzah.pythonanywhere.com/check-project-deadlines?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
```

---

## 🧪 QUICK TESTS

### **Test Daily Reminder:**
```bash
curl -X POST "https://mberzah.pythonanywhere.com/trigger-daily-reminder?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
```

### **Test Deadline Check:**
```bash
curl -X POST "https://mberzah.pythonanywhere.com/check-project-deadlines?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
```

### **Health Check:**
```bash
curl https://mberzah.pythonanywhere.com/health
```

---

## 📊 EXPECTED RESPONSES

### ✅ Success:
```json
{
  "success": true,
  "message": "...",
  "timestamp": "2025-10-10T..."
}
```

### ❌ Error:
```json
{
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

---

## 🔐 API KEY
```
py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1
```

---

## 📍 SETUP URL
https://www.pythonanywhere.com/user/mberzah/tasks/

---

## ⏰ TIME ZONES
- **UTC:** 19:00 → Turkey: 22:00 (Daily Reminder)
- **UTC:** 09:00 → Turkey: 12:00 (Deadline Check)

