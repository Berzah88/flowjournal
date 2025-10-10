# 🧪 Comprehensive Notification System Test Plan

**Date:** October 10, 2025  
**System:** Firestore-based Notification System  
**Test Environment:** Production-like (PythonAnywhere + Firebase)

---

## 📋 Test Scenarios

### ✅ **Test 1: Daily Journal Reminder**
**Objective:** Verify daily journal reminder notifications are sent correctly

**Steps:**
1. Trigger: Call `/api/send-daily-reminder` endpoint
2. Expected: All users with `test-user` ID receive notification
3. Notification Content:
   - Title: "📖 Günlük Hatırlatma"
   - Body: "Bugün neler hissettin? Günlüğüne birkaç satır ekle 💭"

**Test Command:**
```bash
curl -X POST https://berzah.pythonanywhere.com/api/send-daily-reminder
```

**Success Criteria:**
- ✅ Notification received on device
- ✅ Correct title and body
- ✅ No duplicate notifications
- ✅ Response: 200 OK with success message

---

### ✅ **Test 2: Project Deadline Reminder**
**Objective:** Verify project deadline notifications are sent to correct users

**Prerequisites:**
- Have active projects in Firestore with upcoming deadlines

**Steps:**
1. Trigger: Call `/api/send-project-deadline-reminder` endpoint
2. Expected: Users with projects deadline = tomorrow receive notifications
3. Notification Content:
   - Title: "⏰ Proje Deadline Yaklaşıyor!"
   - Body: Custom per project (includes project name and days remaining)

**Test Command:**
```bash
curl -X POST https://berzah.pythonanywhere.com/api/send-project-deadline-reminder
```

**Success Criteria:**
- ✅ Notification received for projects with deadline tomorrow
- ✅ Correct project name in notification
- ✅ Correct days remaining calculation
- ✅ No notifications for completed projects
- ✅ Response: 200 OK with notification count

---

### ✅ **Test 3: Manual Test Notification**
**Objective:** Verify FCM token is valid and notifications can be sent

**Steps:**
1. Get current FCM token from app
2. Send test notification using backend script
3. Verify notification received

**Test Command:**
```bash
cd backend
python send_manual_test.py
```

**Success Criteria:**
- ✅ Notification received immediately
- ✅ Custom test message displayed
- ✅ No errors in logs

---

### ✅ **Test 4: Firestore Sync Verification**
**Objective:** Verify app data is syncing to Firestore correctly

**Steps:**
1. Open app and create a new project
2. Check Firestore Console for new project document
3. Update project (add milestone, change date)
4. Verify changes reflected in Firestore
5. Delete project
6. Verify project removed from Firestore

**Test Command:**
```bash
cd backend
python debug_users.py
```

**Success Criteria:**
- ✅ New projects appear in Firestore immediately
- ✅ Updates sync correctly
- ✅ Deletions remove documents
- ✅ Completed projects marked as status: "completed"
- ✅ User FCM token is up-to-date

---

### ✅ **Test 5: Cron Job Simulation**
**Objective:** Verify scheduled tasks work as expected

**Steps:**
1. Check current time and cron schedule
2. Manually trigger cron endpoints
3. Verify notifications sent at correct time

**Cron Schedule:**
- Daily Reminder: 19:00 UTC (22:00 Turkey)
- Deadline Reminder: 09:00 UTC (12:00 Turkey)

**Test Commands:**
```bash
# Daily reminder (scheduled for 19:00 UTC)
curl -X POST https://berzah.pythonanywhere.com/api/send-daily-reminder

# Deadline reminder (scheduled for 09:00 UTC)
curl -X POST https://berzah.pythonanywhere.com/api/send-project-deadline-reminder
```

**Success Criteria:**
- ✅ Endpoints respond within 30 seconds
- ✅ Correct notifications sent
- ✅ Logs show successful execution
- ✅ No timeout errors

---

### ✅ **Test 6: Multiple User Scenario**
**Objective:** Verify system handles multiple users correctly

**Prerequisites:**
- Multiple test users with different projects

**Steps:**
1. Create projects with different deadlines
2. Trigger deadline reminder
3. Verify only relevant users get notifications
4. Check each notification has correct project info

**Success Criteria:**
- ✅ Each user gets only their own project notifications
- ✅ No cross-user data leaks
- ✅ All active users receive daily reminder
- ✅ Completed projects don't trigger notifications

---

### ✅ **Test 7: Edge Cases**
**Objective:** Test system behavior in unusual scenarios

**Scenarios:**
1. **No FCM Token:** User document without FCM token
2. **Expired Token:** Invalid/expired FCM token
3. **No Projects:** User with no active projects
4. **Past Deadline:** Project with deadline in the past
5. **Today Deadline:** Project ending today
6. **Multiple Projects:** User with 5+ projects

**Test Commands:**
```bash
cd backend
python test_edge_cases.py
```

**Success Criteria:**
- ✅ System handles missing tokens gracefully
- ✅ Expired tokens logged but don't crash system
- ✅ Users without projects don't receive deadline reminders
- ✅ Past deadlines are ignored
- ✅ Today's deadlines trigger notifications
- ✅ Multiple projects all processed correctly

---

### ✅ **Test 8: Performance Test**
**Objective:** Verify system can handle multiple notifications

**Steps:**
1. Create 10+ test projects
2. Trigger deadline reminder
3. Measure response time
4. Check all notifications delivered

**Success Criteria:**
- ✅ Response time < 30 seconds
- ✅ All notifications delivered
- ✅ No Firebase quota errors
- ✅ No PythonAnywhere timeout

---

### ✅ **Test 9: Error Handling**
**Objective:** Verify system handles errors gracefully

**Scenarios:**
1. Firebase connection failure
2. Invalid project data
3. Malformed FCM token
4. Missing required fields

**Success Criteria:**
- ✅ Errors logged clearly
- ✅ System continues processing other notifications
- ✅ No data corruption
- ✅ Appropriate error messages returned

---

### ✅ **Test 10: End-to-End Flow**
**Objective:** Test complete user journey

**Steps:**
1. Install fresh app
2. Grant notification permissions
3. Create project with deadline tomorrow
4. Wait for or trigger deadline reminder
5. Receive and tap notification
6. Verify app opens to correct screen
7. Complete project
8. Verify no more deadline notifications

**Success Criteria:**
- ✅ Permissions granted successfully
- ✅ FCM token saved to Firestore
- ✅ Project synced immediately
- ✅ Notification received at correct time
- ✅ Tapping notification opens app
- ✅ Completed project stops sending reminders

---

## 🛠️ Test Execution Checklist

### Pre-Test Setup
- [ ] Firebase Console access ready
- [ ] PythonAnywhere dashboard open
- [ ] Test device with app installed
- [ ] Backend scripts ready in `backend/` folder
- [ ] Internet connection stable

### Test Execution
- [ ] Run Test 1: Daily Reminder
- [ ] Run Test 2: Deadline Reminder
- [ ] Run Test 3: Manual Test
- [ ] Run Test 4: Firestore Sync
- [ ] Run Test 5: Cron Simulation
- [ ] Run Test 6: Multiple Users
- [ ] Run Test 7: Edge Cases
- [ ] Run Test 8: Performance
- [ ] Run Test 9: Error Handling
- [ ] Run Test 10: End-to-End

### Post-Test Cleanup
- [ ] Remove test data from Firestore
- [ ] Clear test notifications
- [ ] Document any issues found
- [ ] Update test plan with results

---

## 📊 Test Results Template

```
Test Name: _________________
Date/Time: _________________
Tester: ___________________

✅ PASS / ❌ FAIL

Notes:
- 
- 
- 

Issues Found:
- 
- 
```

---

## 🔧 Useful Commands

### Check Firestore Data
```bash
cd backend
python debug_users.py
```

### Send Manual Test Notification
```bash
cd backend
python send_manual_test.py
```

### Test API Endpoints
```bash
# Health check
curl https://berzah.pythonanywhere.com/

# Daily reminder
curl -X POST https://berzah.pythonanywhere.com/api/send-daily-reminder

# Deadline reminder
curl -X POST https://berzah.pythonanywhere.com/api/send-project-deadline-reminder
```

### Check App Logs
```
npx expo start --dev-client
# Watch for console logs with FCM/Firestore prefixes
```

---

## 📱 Expected Notification Format

### Daily Reminder
```
📖 Günlük Hatırlatma
Bugün neler hissettin? Günlüğüne birkaç satır ekle 💭
```

### Deadline Reminder (1 day)
```
⏰ Proje Deadline Yaklaşıyor!
"[Project Name]" projeniz yarın bitiyor! 1 gün kaldı.
```

### Deadline Reminder (today)
```
⏰ Proje Deadline Yaklaşıyor!
"[Project Name]" projeniz bugün bitiyor!
```

---

## ✅ Success Metrics

- **Notification Delivery Rate:** >95%
- **Response Time:** <30 seconds
- **Error Rate:** <5%
- **User Satisfaction:** Notifications received on time
- **Data Accuracy:** 100% (correct project names, dates)

---

## 🚨 Known Issues

_Document any known issues here_

---

## 📝 Notes

- All tests should be run with real device, not emulator (FCM works better)
- Ensure app is closed/background for background notification test
- Check Firebase Console for quota limits
- Monitor PythonAnywhere logs for any errors

---

**Last Updated:** October 10, 2025  
**Version:** 1.0.0

