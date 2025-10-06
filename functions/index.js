/**
 * Firebase Functions for Flow Journal
 * Proje bitiş tarihi bildirimleri
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getMessaging} = require("firebase-admin/messaging");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const messaging = getMessaging();

setGlobalOptions({maxInstances: 10});

/**
 * Her gün saat 09:00'da çalışan scheduled function
 * Proje bitiş tarihlerini kontrol eder ve bildirim gönderir
 */
exports.checkProjectDeadlines = onSchedule({
  schedule: "0 9 * * *", // Her gün saat 09:00 (UTC)
  timeZone: "Europe/Istanbul",
}, async (event) => {
  try {
    logger.info("Proje bitiş tarihleri kontrol ediliyor...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tüm kullanıcıları al
    const usersSnapshot = await db.collection("users").get();

    if (usersSnapshot.empty) {
      logger.info("Kullanıcı bulunamadı");
      return;
    }

    let notificationCount = 0;

    // Her kullanıcı için projelerini kontrol et
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      // FCM token ve bildirim ayarları kontrol et
      if (!userData.fcmToken || !userData.projectDeadlineNotifications) {
        continue;
      }

      // Kullanıcının aktif projelerini al
      const projectsSnapshot = await db
          .collection("users")
          .doc(userId)
          .collection("projects")
          .where("status", "==", "active")
          .get();

      if (projectsSnapshot.empty) {
        continue;
      }

      // Her proje için bitiş tarihini kontrol et
      for (const projectDoc of projectsSnapshot.docs) {
        const projectData = projectDoc.data();
        const endDate = projectData.endDate ?
          projectData.endDate.toDate() : null;

        if (!endDate) {
          continue;
        }

        // Tarih farkını hesapla
        const timeDiff = endDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        let notificationTitle = "";
        let notificationBody = "";

        // Bildirim mesajlarını belirle
        if (daysDiff === 3) {
          notificationTitle = "⚠️ Proje Son 3 Gün";
          notificationBody =
            `${projectData.title} projesi 3 gün sonra bitiyor!`;
        } else if (daysDiff === 1) {
          notificationTitle = "🔥 Son Gün";
          notificationBody = `${projectData.title} projesi yarın bitiyor!`;
        } else if (daysDiff === 0) {
          notificationTitle = "✅ Bugün Bitiyor";
          notificationBody = `${projectData.title} projesi bugün bitiyor!`;
        } else if (daysDiff < 0) {
          // Geçmiş projeleri tamamlandı olarak işaretle
          await db
              .collection("users")
              .doc(userId)
              .collection("projects")
              .doc(projectDoc.id)
              .update({status: "completed"});

          notificationTitle = "✅ Proje Tamamlandı";
          notificationBody =
            `${projectData.title} projesi başarıyla tamamlandı!`;
        } else {
          continue; // Bildirim gönderilecek tarih değil
        }

        // FCM mesajı gönder
        try {
          await messaging.send({
            token: userData.fcmToken,
            notification: {
              title: notificationTitle,
              body: notificationBody,
            },
            data: {
              type: "project_deadline",
              projectId: projectDoc.id,
              daysLeft: daysDiff.toString(),
            },
          });

          notificationCount++;
          logger.info(`Bildirim gönderildi: ${userId} - ${projectData.title}`);
        } catch (error) {
          logger.error(`Bildirim gönderilemedi: ${userId}`, error);
        }
      }
    }

    logger.info(`${notificationCount} bildirim gönderildi`);
  } catch (error) {
    logger.error("Proje bitiş tarihleri kontrolünde hata:", error);
  }
});

/**
 * Test endpoint - manuel olarak proje kontrolü yapmak için
 */
exports.checkProjectDeadlinesTest = onRequest(async (req, res) => {
  try {
    // Test için scheduled function'ı çağır
    await exports.checkProjectDeadlines();
    res.status(200).send("Proje kontrolü tamamlandı");
  } catch (error) {
    logger.error("Test hatası:", error);
    res.status(500).send("Test başarısız");
  }
});
