# 🔧 Cron Job Troubleshooting

## 🚨 Problem: 4x Duplicate Notifications

### ✅ Çözülen Sorunlar:

1. **✅ Duplicate User IDs (FIXED)**
   - ESKİ: `eExyBGCmRMG1KjEFwTszUl:APA91` → DELETED
   - YENİ: `user_dJAXp5PIRZGaaijVHYBp` → ACTIVE
   - **Sonuç:** Artık sadece 1 user var

---

## 🔍 2. PythonAnywhere Cron Job Kontrolü

### **Şu Anda Kontrol Edilmesi Gereken:**

1. **PythonAnywhere Dashboard'a Git:**
   - https://www.pythonanywhere.com/user/mberzah/
   - **Tasks** sekmesine tıkla

2. **Mevcut Cron Job'ları Gör:**
   ```
   SADECE BUNLAR OLMALI:
   
   ✅ 09:00 UTC → curl https://mberzah.pythonanywhere.com/send-deadline-notifications
   ✅ 19:00 UTC → curl https://mberzah.pythonanywhere.com/send-daily-reminder
   ```

3. **PROBLEM: Eğer Şunları Görüyorsan SİL:**
   ```
   ❌ Duplicate daily reminder (2 tane 19:00)
   ❌ Eski /trigger-* endpoints
   ❌ Test cron jobs
   ❌ Disabled ama hala görünen cron'lar
   ```

---

## 🗑️ Gereksiz Cron Job'ları Silme:

### **Adım 1: Tasks Sayfası**
```
PythonAnywhere → Dashboard → Tasks
```

### **Adım 2: Her Satırda "Delete" Butonu**
```
Eğer şunları görüyorsan SİL:
- ❌ /trigger-daily-reminder
- ❌ /trigger-milestone-reminder
- ❌ /trigger-project-deadline
- ❌ /trigger-project-deadline-reminder
- ❌ Duplicate /send-daily-reminder
- ❌ Duplicate /send-deadline-notifications
```

### **Adım 3: Sadece Şunlar Kalmalı**
```
✅ 09:00 UTC → /send-deadline-notifications
✅ 19:00 UTC → /send-daily-reminder
```

---

## 🧪 3. Test: Yarın Akşam 22:00'de Kontrol Et

### **Beklenen Sonuç:**
```
22:00'de SADECE 1 BİLDİRİM gelmeli:
"📖 Bugün neler hissettin? Günlüğüne birkaç satır ekle 💭"
```

### **Eğer 2+ Bildirim Gelirse:**
```
1. PythonAnywhere error log'a bak
2. Cron job'ları tekrar kontrol et
3. Flask app version kontrol et (v2.0.0 olmalı)
```

---

## 📊 Final Checklist:

- [x] ✅ Duplicate user IDs silindi
- [ ] ⏳ PythonAnywhere cron job'ları kontrol edildi
- [ ] ⏳ Yarın 22:00'de test edildi
- [ ] ⏳ Sadece 1 bildirim geldi

---

## 🔗 Useful Links:

- **PythonAnywhere Tasks:** https://www.pythonanywhere.com/user/mberzah/tasks/
- **Error Log:** Web tab → Log files → Error log
- **Flask App:** https://mberzah.pythonanywhere.com/

---

## 📞 Next Steps:

1. **ŞİMDİ:** PythonAnywhere cron job'ları kontrol et
2. **YARIN 22:00:** Test et (sadece 1 bildirim gelmeli)
3. **SORUN DEVAM EDERSE:** Error log'a bak

---

**Son Güncelleme:** 2025-10-10
**Durum:** 1/3 Fixed (User IDs cleaned)

