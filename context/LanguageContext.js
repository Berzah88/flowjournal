// context/LanguageContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Translation data
const translations = {
  en: {
    // Main Screen
    'myDay': 'My Day',
    'active': 'Active',
    'addProject': 'Add Project',
    'settings': 'Settings',
    'data': 'Data',
    'notifications': 'Notifications',
    'theme': 'Theme',
    'language': 'Language',
    'createBackup': 'Create Backup',
    'recoverData': 'Recover Data',
    'completedProjects': 'Completed Projects',
    'noActiveProjects': 'No Active Projects',
    'startYourJourney': 'Start your journey by creating your first project',
    
    // Project Screen
    'projectTitle': 'Project Title',
    'enterProjectTitle': 'Enter project title',
    'addDate': 'Add Date',
    'selectDateRange': 'Select Date Range',
    'selectStartDate': 'Select start date',
    'selectEndDate': 'Select end date',
    'dateRangeSelected': 'Date range selected',
    'clear': 'Clear',
    'week': 'Week',
    'weeks': 'Weeks',
    'month': 'Month',
    'months': 'Months',
    'cancel': 'Cancel',
    'confirm': 'Confirm',
    
    // Journal
    'journal': 'Emotional Journal',
    'howAreYouFeeling': 'How are you feeling?',
    'writeYourThoughts': 'Write your thoughts...',
    'addPhoto': 'Add Photo',
    'addLocation': 'Add Location',
    'noMoodDataYet': 'No Mood Data Yet',
    'startWritingJournal': 'Start writing journal entries with mood tags to see your emotional journey here.',
    'entries': 'Entries',
    'thisWeek': 'This Week',
    'thisMonth': 'This Month',
    'words': 'Words',
    'save': 'Save',
    'edit': 'Edit',
    'delete': 'Delete',
    
    // Welcome Screen
    'appName': 'Flow Journal',
    'welcomeDescription': 'Track your projects while recording your emotions. Flow Journal allows you to track your projects along with your personal experiences.',
    'getStarted': 'Get Started',
    
    // Tutorial Screen
    'createProject': 'Create Project',
    'createProjectDescription': 'Add a new project and set start-end dates',
    'addMilestones': 'Add Milestones',
    'addMilestonesDescription': 'Add step-by-step milestones to your project and track your progress',
    'emotionJournal': 'Emotion Journal',
    'emotionJournalDescription': 'Write journals and record your emotions. Transform your experiences throughout your projects into valuable memories',
    'viewProgress': 'View Progress',
    'viewProgressDescription': 'Analyze your project progress and emotional journey',
    'continue': 'Continue',
    
    // Today's Summary
    'todaysSummary': "Today's Summary",
    'howAreYouFeelingToday': 'How are you feeling today?',
    'startRecordingEmotions': 'Start recording your emotions and make sense of your day',
    'writeYourFirstJournal': 'Write your first journal',
    'greatStart': 'Great start!',
    'keepSharingEmotions': 'Keep sharing your emotions, this is very valuable',
    'writeMore': 'Write more',
    'veryActiveDay': 'Very active day!',
    'expressEmotionsBeautifully': 'You express your emotions beautifully, this is great',
    'happyDay': 'Happy day!',
    'keepRecordingPositiveEnergy': 'Keep recording this positive energy',
    'shareYourHappiness': 'Share your happiness',
    'calmDay': 'Calm day',
    'recordingPeacefulMoments': 'Recording these peaceful moments is beautiful',
    'writeYourPeace': 'Write your peace',
    'challengingDay': 'Challenging day',
    'writingEmotionsWillRelax': 'Writing your emotions will relax you',
    'expressYourEmotions': 'Express your emotions',
    'timeToRest': 'Time to rest',
    'recordingHelpsRecovery': 'Recording how you feel helps your recovery',
    'writeYourCondition': 'Write your condition',
    'normalDay': 'Normal day',
    'everyDayHasUniqueStory': 'Every day has its own unique story',
    'recordYourDay': 'Record your day',
    'goingWell': 'Going well!',
    'keepRecordingEmotions': 'Keep recording your emotions',
    
    // Mood Statement
    'todayYouFeel': 'Today you feel a bit',
    'viewMoreDetails': 'View more details',
    'clickMilestoneStartWriting': 'Click on a Milestone right away and start writing your journal',
    
    // Project Progress
    'noProjectOnThisDate': 'No project on this date',
    'noActiveProjectOnSelectedDate': 'No active project on selected date.\nWould you like to create a new project?',
    
    // Completed Projects
    'projectJournals': 'Project Journals',
    'noJournals': 'No Journals',
    'noJournalEntries': 'This project has no journal entries',
    'noCompletedProjects': 'No Completed Projects',
    
    // Journal Detail
    'location': 'Location',
    
    // Add Milestone Modal
    'enterMilestoneTitle': 'Enter milestone title...',
    
    // Notification Settings
    'dailyReminderTime': 'Daily Reminder Time',
    'enterReminderTime': 'Enter the time when the reminder should be sent (HH:MM format):',
    'enterValidTimeFormat': 'Enter a valid time format (HH:MM)',
    'resetAIFeedback': 'Reset AI Feedback',
    'resetAIFeedbackDescription': 'This will reset the AI feedback system and allow it to show again on next app start. Continue?',
    'reset': 'Reset',
    'success': 'Success',
    'aiFeedbackResetSuccess': 'AI feedback has been reset! It will show on next app start.',
    'aiFeedbackResetError': 'Failed to reset AI feedback. Please try again.',
    
    // Card
    'untitled': 'Untitled',
    
    // MileStone
    'deleteMilestoneConfirm': 'Are you sure? Deleted Milestone cannot be recovered',
    
    // Theme Toggle
    'switchToLightTheme': 'Switch to light theme',
    'switchToDarkTheme': 'Switch to dark theme',
    'lightMode': 'Light Mode',
    'darkMode': 'Dark Mode',
    
    // Completed Project Card
    'completed': 'Completed',
    
    // Moods
    'happy': 'Happy',
    'excited': 'Excited',
    'tired': 'Tired',
    'sad': 'Sad',
    'angry': 'Angry',
    'frustrated': 'Frustrated',
    'anxious': 'Anxious',
    'grateful': 'Grateful',
    'hopeful': 'Hopeful',
    'proud': 'Proud',
    'calm': 'Calm',
    'overwhelmed': 'Overwhelmed',
    'natural': 'Natural',
    'neutral': 'Neutral',
    
    // Notifications
    'journalTime': 'Journal Time!',
    'howAboutRecording': 'How about recording your experiences and emotions today?',
    'howWasYourDay': 'How was your day? Share your thoughts!',
    'whatMadeYouHappy': 'What made you happy today?',
    'timeForJournaling': 'Time for journaling! Record your story.',
    'didYouLearn': 'Did you learn anything new today?',
    'perfectTime': 'Perfect time to record your feelings and thoughts!',
    'summarizeYourDay': 'Summarize your day and save it for future you.',
    'whatMoments': 'What moments made you smile today?',
    
    // Project Analysis
    'projectAnalysis': 'Project Analysis',
    'milestoneReminder': 'Milestone Reminder',
    'projectDeadlineApproaching': 'Project Deadline Approaching!',
    'lastDay': 'Last Day!',
    'deadlineWarning': 'Deadline Warning',
    'endsIn3Days': 'ends in 3 days. You still have time!',
    'endsTomorrow': 'ends tomorrow! Time for final touches.',
    'endsInDays': 'ends in {days} days!',
    
    // Common
    'loading': 'Loading...',
    'error': 'Error',
    'success': 'Success',
    'ok': 'OK',
    'yes': 'Yes',
    'no': 'No',
    'close': 'Close',
    'back': 'Back',
    'next': 'Next',
    'previous': 'Previous',
    'done': 'Done',
    'continue': 'Continue',
    'skip': 'Skip',
    'retry': 'Retry',
    'refresh': 'Refresh',
    'search': 'Search',
    'filter': 'Filter',
    'sort': 'Sort',
    'view': 'View',
    'hide': 'Hide',
    'show': 'Show',
    'more': 'More',
    'less': 'Less',
    'all': 'All',
    'none': 'None',
    'select': 'Select',
    'selected': 'Selected',
    'unselected': 'Unselected',
    'enabled': 'Enabled',
    'disabled': 'Disabled',
    'on': 'On',
    'off': 'Off',
    'active': 'Active',
    'inactive': 'Inactive',
    'online': 'Online',
    'offline': 'Offline',
    'connected': 'Connected',
    'disconnected': 'Disconnected',
    'available': 'Available',
    'unavailable': 'Unavailable',
    'public': 'Public',
    'private': 'Private',
    'draft': 'Draft',
    'published': 'Published',
    'archived': 'Archived',
    'deleted': 'Deleted',
    'restored': 'Restored',
    'updated': 'Updated',
    'created': 'Created',
    'modified': 'Modified',
    'saved': 'Saved',
    'unsaved': 'Unsaved',
    'synchronized': 'Synchronized',
    'pending': 'Pending',
    'processing': 'Processing',
    'completed': 'Completed',
    'failed': 'Failed',
    'cancelled': 'Cancelled',
    'expired': 'Expired',
    'valid': 'Valid',
    'invalid': 'Invalid',
    'required': 'Required',
    'optional': 'Optional',
    'recommended': 'Recommended',
    'notRecommended': 'Not Recommended',
    'important': 'Important',
    'urgent': 'Urgent',
    'normal': 'Normal',
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    'critical': 'Critical',
    'info': 'Info',
    'warning': 'Warning',
    'debug': 'Debug',
    'verbose': 'Verbose',
    'minimal': 'Minimal',
    'detailed': 'Detailed',
    'summary': 'Summary',
    'full': 'Full',
    'partial': 'Partial',
    'complete': 'Complete',
    'incomplete': 'Incomplete',
    'empty': 'Empty',
    'full': 'Full',
    'new': 'New',
    'old': 'Old',
    'recent': 'Recent',
    'latest': 'Latest',
    'earliest': 'Earliest',
    'first': 'First',
    'last': 'Last',
    'beginning': 'Beginning',
    'end': 'End',
    'start': 'Start',
    'stop': 'Stop',
    'pause': 'Pause',
    'resume': 'Resume',
    'restart': 'Restart',
    'reset': 'Reset',
    'clear': 'Clear',
    'clean': 'Clean',
    'dirty': 'Dirty',
    'fresh': 'Fresh',
    'stale': 'Stale',
    'current': 'Current',
    'previous': 'Previous',
    'next': 'Next',
    'upcoming': 'Upcoming',
    'past': 'Past',
    'future': 'Future',
    'present': 'Present',
    'today': 'Today',
    'yesterday': 'Yesterday',
    'tomorrow': 'Tomorrow',
    'thisWeek': 'This Week',
    'lastWeek': 'Last Week',
    'nextWeek': 'Next Week',
    'thisMonth': 'This Month',
    'lastMonth': 'Last Month',
    'nextMonth': 'Next Month',
    'thisYear': 'This Year',
    'lastYear': 'Last Year',
    'nextYear': 'Next Year',
    'morning': 'Morning',
    'afternoon': 'Afternoon',
    'evening': 'Evening',
    'night': 'Night',
    'dawn': 'Dawn',
    'dusk': 'Dusk',
    'midnight': 'Midnight',
    'noon': 'Noon',
    'am': 'AM',
    'pm': 'PM',
    'monday': 'Monday',
    'tuesday': 'Tuesday',
    'wednesday': 'Wednesday',
    'thursday': 'Thursday',
    'friday': 'Friday',
    'saturday': 'Saturday',
    'sunday': 'Sunday',
    'dayAbbreviations': ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    'january': 'January',
    'february': 'February',
    'march': 'March',
    'april': 'April',
    'may': 'May',
    'june': 'June',
    'july': 'July',
    'august': 'August',
    'september': 'September',
    'october': 'October',
    'november': 'November',
    'december': 'December'
  },
  
  tr: {
    // Main Screen
    'myDay': 'Günüm',
    'active': 'Aktif',
    'addProject': 'Proje Ekle',
    'settings': 'Ayarlar',
    'data': 'Veri',
    'notifications': 'Bildirimler',
    'theme': 'Tema',
    'language': 'Dil',
    'createBackup': 'Yedek Oluştur',
    'recoverData': 'Veri Kurtar',
    'completedProjects': 'Tamamlanan Projeler',
    'noActiveProjects': 'Aktif Proje Yok',
    'startYourJourney': 'İlk projeni oluşturarak yolculuğuna başla',
    
    // Project Screen
    'projectTitle': 'Proje Başlığı',
    'enterProjectTitle': 'Proje başlığını girin',
    'addDate': 'Tarih Ekle',
    'selectDateRange': 'Tarih Aralığı Seç',
    'selectStartDate': 'Başlangıç tarihi seçin',
    'selectEndDate': 'Bitiş tarihi seçin',
    'dateRangeSelected': 'Tarih aralığı seçildi',
    'clear': 'Temizle',
    'week': 'Hafta',
    'weeks': 'Hafta',
    'month': 'Ay',
    'months': 'Ay',
    'cancel': 'İptal',
    'confirm': 'Onayla',
    
    // Journal
    'journal': 'Duygusal Günlük',
    'howAreYouFeeling': 'Nasıl hissediyorsun?',
    'writeYourThoughts': 'Düşüncelerini yaz...',
    'addPhoto': 'Fotoğraf Ekle',
    'addLocation': 'Konum Ekle',
    'noMoodDataYet': 'Henüz Mood Verisi Yok',
    'startWritingJournal': 'Duygusal yolculuğunu burada görmek için mood etiketleriyle günlük girişleri yazmaya başla.',
    'entries': 'Girişler',
    'thisWeek': 'Bu Hafta',
    'thisMonth': 'Bu Ay',
    'words': 'Kelime',
    'save': 'Kaydet',
    'edit': 'Düzenle',
    'delete': 'Sil',
    
    // Welcome Screen
    'appName': 'Flow Journal',
    'welcomeDescription': 'Duygularını kaydederken projelerini takip et. Flow Journal, projelerini kişisel deneyimlerinle birlikte takip etmeni sağlar.',
    'getStarted': 'Başlayalım',
    
    // Tutorial Screen
    'createProject': 'Proje Oluştur',
    'createProjectDescription': 'Yeni bir proje ekle ve başlangıç-bitiş tarihlerini belirle',
    'addMilestones': 'Kilometre Taşları Ekle',
    'addMilestonesDescription': 'Projene adım adım kilometre taşları ekle ve ilerlemeni takip et',
    'emotionJournal': 'Duygusal Günlük',
    'emotionJournalDescription': 'Günlük yaz ve duygularını kaydet. Projelerin boyunca deneyimlerini değerli anılara dönüştür',
    'viewProgress': 'İlerlemeyi Görüntüle',
    'viewProgressDescription': 'Proje ilerlemeni ve duygusal yolculuğunu analiz et',
    'continue': 'Devam Et',
    
    // Today's Summary
    'todaysSummary': "Günün Özeti",
    'howAreYouFeelingToday': 'Bugün nasıl hissediyorsun?',
    'startRecordingEmotions': 'Duygularını kaydetmeye başla ve gününü anlamlandır',
    'writeYourFirstJournal': 'İlk günlüğünü yaz',
    'greatStart': 'Harika başlangıç!',
    'keepSharingEmotions': 'Duygularını paylaşmaya devam et, bu çok değerli',
    'writeMore': 'Daha fazla yaz',
    'veryActiveDay': 'Çok aktif bir gün!',
    'expressEmotionsBeautifully': 'Duygularını güzel bir şekilde ifade ediyorsun, bu harika',
    'happyDay': 'Mutlu gün!',
    'keepRecordingPositiveEnergy': 'Bu pozitif enerjiyi kaydetmeye devam et',
    'shareYourHappiness': 'Mutluluğunu paylaş',
    'calmDay': 'Sakin gün',
    'recordingPeacefulMoments': 'Bu huzurlu anları kaydetmek güzel',
    'writeYourPeace': 'Huzurunu yaz',
    'challengingDay': 'Zorlu gün',
    'writingEmotionsWillRelax': 'Duygularını yazmak seni rahatlatacak',
    'expressYourEmotions': 'Duygularını ifade et',
    'timeToRest': 'Dinlenme zamanı',
    'recordingHelpsRecovery': 'Nasıl hissettiğini kaydetmek iyileşmene yardımcı olur',
    'writeYourCondition': 'Durumunu yaz',
    'normalDay': 'Normal gün',
    'everyDayHasUniqueStory': 'Her günün kendine özgü bir hikayesi var',
    'recordYourDay': 'Gününü kaydet',
    'goingWell': 'İyi gidiyor!',
    'keepRecordingEmotions': 'Duygularını kaydetmeye devam et',
    
    // Mood Statement
    'todayYouFeel': 'Bugün biraz',
    'viewMoreDetails': 'Daha fazla detay görüntüle',
    'clickMilestoneStartWriting': 'Hemen bir Kilometre Taşına tıklayın ve günlüğünüzü yazmaya başlayın',
    
    // Project Progress
    'noProjectOnThisDate': 'Bu tarihte proje yok',
    'noActiveProjectOnSelectedDate': 'Seçilen tarihte aktif proje yok.\nYeni bir proje oluşturmak ister misiniz?',
    
    // Completed Projects
    'projectJournals': 'Proje Günlükleri',
    'noJournals': 'Günlük Yok',
    'noJournalEntries': 'Bu projenin günlük girişi yok',
    'noCompletedProjects': 'Tamamlanan Proje Yok',
    
    // Journal Detail
    'location': 'Konum',
    
    // Add Milestone Modal
    'enterMilestoneTitle': 'Kilometre taşı başlığını girin...',
    
    // Notification Settings
    'dailyReminderTime': 'Günlük Hatırlatıcı Saati',
    'enterReminderTime': 'Hatırlatıcının gönderileceği saati girin (HH:MM formatında):',
    'enterValidTimeFormat': 'Geçerli bir saat formatı girin (HH:MM)',
    'resetAIFeedback': 'AI Geri Bildirimini Sıfırla',
    'resetAIFeedbackDescription': 'Bu, AI geri bildirim sistemini sıfırlayacak ve bir sonraki uygulama başlatıldığında tekrar göstermesine izin verecek. Devam edilsin mi?',
    'reset': 'Sıfırla',
    'success': 'Başarılı',
    'aiFeedbackResetSuccess': 'AI geri bildirimi sıfırlandı! Bir sonraki uygulama başlatıldığında gösterilecek.',
    'aiFeedbackResetError': 'AI geri bildirimi sıfırlanamadı. Lütfen tekrar deneyin.',
    
    // Card
    'untitled': 'Başlıksız',
    
    // MileStone
    'deleteMilestoneConfirm': 'Emin misiniz? Silinen Kilometre Taşı geri alınamaz',
    
    // Theme Toggle
    'switchToLightTheme': 'Açık temaya geç',
    'switchToDarkTheme': 'Koyu temaya geç',
    'lightMode': 'Açık Mod',
    'darkMode': 'Koyu Mod',
    
    // Completed Project Card
    'completed': 'Tamamlandı',
    
    // Moods
    'happy': 'Mutlu',
    'excited': 'Heyecanlı',
    'tired': 'Yorgun',
    'sad': 'Üzgün',
    'angry': 'Kızgın',
    'frustrated': 'Sinirli',
    'anxious': 'Endişeli',
    'grateful': 'Müteşekkir',
    'hopeful': 'Umutlu',
    'proud': 'Gururlu',
    'calm': 'Sakin',
    'overwhelmed': 'Bunalmış',
    'natural': 'Doğal',
    'neutral': 'Nötr',
    
    // Notifications
    'journalTime': 'Günlük Zamanı!',
    'howAboutRecording': 'Bugünkü deneyimlerini ve duygularını kaydetmeye ne dersin?',
    'howWasYourDay': 'Günün nasıldı? Düşüncelerini paylaş!',
    'whatMadeYouHappy': 'Bugün seni ne mutlu etti?',
    'timeForJournaling': 'Günlük yazma zamanı! Hikayeni kaydet.',
    'didYouLearn': 'Bugün yeni bir şey öğrendin mi?',
    'perfectTime': 'Duygularını ve düşüncelerini kaydetmek için mükemmel zaman!',
    'summarizeYourDay': 'Gününü özetle ve gelecekteki sen için kaydet.',
    'whatMoments': 'Bugün seni gülümseten anlar nelerdi?',
    
    // Project Analysis
    'projectAnalysis': 'Proje Analizi',
    'milestoneReminder': 'Kilometre Taşı Hatırlatıcısı',
    'projectDeadlineApproaching': 'Proje Son Tarihi Yaklaşıyor!',
    'lastDay': 'Son Gün!',
    'deadlineWarning': 'Son Tarih Uyarısı',
    'endsIn3Days': '3 gün içinde bitiyor. Hala zamanın var!',
    'endsTomorrow': 'yarın bitiyor! Son dokunuşlar için zaman.',
    'endsInDays': '{days} gün içinde bitiyor!',
    
    // Common
    'loading': 'Yükleniyor...',
    'error': 'Hata',
    'success': 'Başarılı',
    'ok': 'Tamam',
    'yes': 'Evet',
    'no': 'Hayır',
    'close': 'Kapat',
    'back': 'Geri',
    'next': 'İleri',
    'previous': 'Önceki',
    'done': 'Tamamlandı',
    'continue': 'Devam Et',
    'skip': 'Atla',
    'retry': 'Tekrar Dene',
    'refresh': 'Yenile',
    'search': 'Ara',
    'filter': 'Filtrele',
    'sort': 'Sırala',
    'view': 'Görüntüle',
    'hide': 'Gizle',
    'show': 'Göster',
    'more': 'Daha Fazla',
    'less': 'Daha Az',
    'all': 'Tümü',
    'none': 'Hiçbiri',
    'select': 'Seç',
    'selected': 'Seçili',
    'unselected': 'Seçilmemiş',
    'enabled': 'Etkin',
    'disabled': 'Devre Dışı',
    'on': 'Açık',
    'off': 'Kapalı',
    'active': 'Aktif',
    'inactive': 'Pasif',
    'online': 'Çevrimiçi',
    'offline': 'Çevrimdışı',
    'connected': 'Bağlı',
    'disconnected': 'Bağlantısız',
    'available': 'Mevcut',
    'unavailable': 'Mevcut Değil',
    'public': 'Genel',
    'private': 'Özel',
    'draft': 'Taslak',
    'published': 'Yayınlandı',
    'archived': 'Arşivlendi',
    'deleted': 'Silindi',
    'restored': 'Geri Yüklendi',
    'updated': 'Güncellendi',
    'created': 'Oluşturuldu',
    'modified': 'Değiştirildi',
    'saved': 'Kaydedildi',
    'unsaved': 'Kaydedilmedi',
    'synchronized': 'Senkronize Edildi',
    'pending': 'Beklemede',
    'processing': 'İşleniyor',
    'completed': 'Tamamlandı',
    'failed': 'Başarısız',
    'cancelled': 'İptal Edildi',
    'expired': 'Süresi Doldu',
    'valid': 'Geçerli',
    'invalid': 'Geçersiz',
    'required': 'Gerekli',
    'optional': 'İsteğe Bağlı',
    'recommended': 'Önerilen',
    'notRecommended': 'Önerilmeyen',
    'important': 'Önemli',
    'urgent': 'Acil',
    'normal': 'Normal',
    'low': 'Düşük',
    'medium': 'Orta',
    'high': 'Yüksek',
    'critical': 'Kritik',
    'info': 'Bilgi',
    'warning': 'Uyarı',
    'debug': 'Hata Ayıklama',
    'verbose': 'Ayrıntılı',
    'minimal': 'Minimal',
    'detailed': 'Detaylı',
    'summary': 'Özet',
    'full': 'Tam',
    'partial': 'Kısmi',
    'complete': 'Tamamlanmış',
    'incomplete': 'Tamamlanmamış',
    'empty': 'Boş',
    'full': 'Dolu',
    'new': 'Yeni',
    'old': 'Eski',
    'recent': 'Son',
    'latest': 'En Son',
    'earliest': 'En Erken',
    'first': 'İlk',
    'last': 'Son',
    'beginning': 'Başlangıç',
    'end': 'Son',
    'start': 'Başlat',
    'stop': 'Durdur',
    'pause': 'Duraklat',
    'resume': 'Devam Et',
    'restart': 'Yeniden Başlat',
    'reset': 'Sıfırla',
    'clear': 'Temizle',
    'clean': 'Temiz',
    'dirty': 'Kirli',
    'fresh': 'Taze',
    'stale': 'Bayat',
    'current': 'Mevcut',
    'previous': 'Önceki',
    'next': 'Sonraki',
    'upcoming': 'Yaklaşan',
    'past': 'Geçmiş',
    'future': 'Gelecek',
    'present': 'Şimdi',
    'today': 'Bugün',
    'yesterday': 'Dün',
    'tomorrow': 'Yarın',
    'thisWeek': 'Bu Hafta',
    'lastWeek': 'Geçen Hafta',
    'nextWeek': 'Gelecek Hafta',
    'thisMonth': 'Bu Ay',
    'lastMonth': 'Geçen Ay',
    'nextMonth': 'Gelecek Ay',
    'thisYear': 'Bu Yıl',
    'lastYear': 'Geçen Yıl',
    'nextYear': 'Gelecek Yıl',
    'morning': 'Sabah',
    'afternoon': 'Öğleden Sonra',
    'evening': 'Akşam',
    'night': 'Gece',
    'dawn': 'Şafak',
    'dusk': 'Alacakaranlık',
    'midnight': 'Gece Yarısı',
    'noon': 'Öğle',
    'am': 'ÖÖ',
    'pm': 'ÖS',
    'monday': 'Pazartesi',
    'tuesday': 'Salı',
    'wednesday': 'Çarşamba',
    'thursday': 'Perşembe',
    'friday': 'Cuma',
    'saturday': 'Cumartesi',
    'sunday': 'Pazar',
    'dayAbbreviations': ['Pa', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'],
    'january': 'Ocak',
    'february': 'Şubat',
    'march': 'Mart',
    'april': 'Nisan',
    'may': 'Mayıs',
    'june': 'Haziran',
    'july': 'Temmuz',
    'august': 'Ağustos',
    'september': 'Eylül',
    'october': 'Ekim',
    'november': 'Kasım',
    'december': 'Aralık'
  }
};

// Language Context
const LanguageContext = createContext();

// Language Provider
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  // Load language from storage
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('app_language');
        if (savedLanguage && translations[savedLanguage]) {
          setLanguage(savedLanguage);
        }
      } catch (error) {
        console.error('Language loading error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, []);

  // Change language
  const changeLanguage = async (newLanguage) => {
    try {
      if (translations[newLanguage]) {
        setLanguage(newLanguage);
        await AsyncStorage.setItem('app_language', newLanguage);
      }
    } catch (error) {
      console.error('Language change error:', error);
    }
  };

  // Get translation
  const t = (key, params = {}) => {
    let translation = translations[language][key] || key;
    
    // Replace parameters
    Object.keys(params).forEach(param => {
      translation = translation.replace(`{${param}}`, params[param]);
    });
    
    return translation;
  };

  // Get current language info
  const getLanguageInfo = () => {
    return {
      code: language,
      name: language === 'en' ? 'English' : 'Türkçe',
      nativeName: language === 'en' ? 'English' : 'Türkçe',
      flag: language === 'en' ? '🇺🇸' : '🇹🇷'
    };
  };

  const value = {
    language,
    changeLanguage,
    t,
    getLanguageInfo,
    isLoading
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook to use language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
