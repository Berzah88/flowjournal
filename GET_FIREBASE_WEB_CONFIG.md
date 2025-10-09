# 🔥 Firebase Web Config Nasıl Alınır?

## 📋 **Adımlar**

### **1. Firebase Console'a Git**
```
https://console.firebase.google.com/project/flowjournal-731f7/settings/general
```

### **2. Project Settings → General**

1. **"Your apps"** bölümüne in
2. **Web app** (</>  ikonu) ekle (yoksa)
3. **App nickname:** "Flow Journal Web"
4. **Firebase Hosting:** HAYIR (şimdilik)
5. **"Register app"** butonuna tıkla

### **3. Firebase Config'i Kopyala**

Şuna benzer bir config göreceksin:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "flowjournal-731f7.firebaseapp.com",
  projectId: "flowjournal-731f7",
  storageBucket: "flowjournal-731f7.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxxx"
};
```

### **4. Bu Config'i Bana Gönder**

Config'i aldıktan sonra buraya yapıştır, ben `firebaseConfig.js` dosyasını oluşturacağım!

---

## ⚡ **Hızlı Yol**

Firebase Console → ⚙️ Project Settings → General → Scroll down → "Your apps" → Web app (</>)

---

**NOT:** API key public olabilir, güvenlik Firebase Rules ile sağlanır!

