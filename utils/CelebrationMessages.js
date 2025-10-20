// utils/CelebrationMessages.js
// AI-powered celebration messages - Her seferinde farklı mesajlar

const MILESTONE_MESSAGES = {
  tr: [
    "Bu adımı tamamlamak nasıl hissettirdi? Deneyimlerini kaydetmek ister misin?",
    "Harika bir adım attın! Bu süreçte neler öğrendin?",
    "Tebrikler! Bu başarıyı günlüğüne kaydetmek değerli olabilir.",
    "Müthiş! Bu yolculukta neler hissettin?",
    "Bir adım daha tamamlandı! Duygularını paylaşmak ister misin?",
    "Bu görevi bitirirken zorlandığın veya keyif aldığın anlar oldu mu?",
    "Tebrikler! Bu deneyimi gelecekte hatırlamak için yazmak ister misin?",
    "Harika iş! Bu süreçteki düşüncelerini kaydetmek ister misin?",
    "Bir başarı daha! Bu yolda neler yaşadın?",
    "Muhteşem! Bu anı ölümsüzleştirmek için birkaç kelime ekle.",
  ],
  en: [
    "How did completing this step make you feel? Want to capture your experience?",
    "Great step forward! What did you learn in this process?",
    "Congratulations! Recording this achievement could be valuable.",
    "Awesome! How did this journey feel?",
    "Another step completed! Want to share your emotions?",
    "Were there challenging or enjoyable moments while completing this task?",
    "Congratulations! Want to write about this experience for future reflection?",
    "Great work! Would you like to record your thoughts about this process?",
    "Another success! What did you experience along the way?",
    "Excellent! Add a few words to immortalize this moment.",
  ]
};

const PROJECT_MESSAGES = {
  tr: [
    "Tüm projeyi tamamladın! Bu yolculuk nasıldı? Günlüğüne kaydetmek ister misin?",
    "Muazzam bir başarı! Başından sonuna bu projeyi nasıl hissettin?",
    "Projeyi bitirdin! Öğrendiklerini ve hissettiklerini yazmak ister misin?",
    "Tebrikler! Bu projedeki en unutulmaz anılarını kaydetmek için harika bir zaman.",
    "Mükemmel! Bu projenin tamamlanması seni nasıl hissettiriyor?",
    "Harika bir iş çıkardın! Bu süreçte yaşadıklarını not etmek ister misin?",
    "Proje tamamlandı! Bu başarının hikayesini yazmaya değer.",
    "Muhteşem! Başlangıçtan bitişe kadar neler değişti?",
    "Tüm adımları tamamladın! Bu yolculuğu özetlemek ister misin?",
    "Projeyi bitirdin! Gelecekte kendine bu deneyimden bahsetmek ister misin?",
  ],
  en: [
    "You completed the entire project! How was this journey? Want to journal about it?",
    "Amazing achievement! How did you feel throughout this project?",
    "Project completed! Want to write about what you learned and felt?",
    "Congratulations! This is a great time to record your most memorable moments from this project.",
    "Excellent! How does completing this project make you feel?",
    "Great work! Want to note what you experienced during this process?",
    "Project completed! This success story is worth writing about.",
    "Awesome! What changed from start to finish?",
    "You've completed all the steps! Want to summarize this journey?",
    "Project finished! Want to tell your future self about this experience?",
  ]
};

// Akıllı mesaj seçimi - completion bilgisine göre
export const getCelebrationMessage = (completion, language = 'tr', completedCount = 0) => {
  const messages = completion.type === 'project' 
    ? PROJECT_MESSAGES[language] 
    : MILESTONE_MESSAGES[language];
  
  // Completion sayısına göre mesaj seç (her seferinde farklı)
  // Hash-like selection based on completion time + name
  const hash = (completion.name.length * completion.completedAt) % messages.length;
  
  return messages[hash];
};

// Context-aware messages - projenin durumuna göre
export const getContextualMessage = (completion, activeTasks, completedTasks, language = 'tr') => {
  const project = completion.project;
  
  // Proje istatistikleri
  const totalMilestones = project?.milestones?.length || 0;
  const completedMilestones = project?.milestones?.filter(m => m.completed).length || 0;
  const progressPercentage = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  
  // Tamamlanan toplam proje sayısı
  const totalCompletedProjects = completedTasks.length;
  
  // Contextual messages
  const contextMessages = {
    tr: {
  // İlk görev
  firstMilestone: "İlk adımı attın! Bu başlangıç nasıl hissettirdi?",
      
      // Yarıda
      halfway: `Harika! Projenin %${progressPercentage}'ini tamamladın. Bu ivmeyi kaybetme!`,
      
  // Son görev
  lastMilestone: "Son adımı tamamladın! Başarı çok yakın, duygularını kaydet.",
      
      // Proje tamamlandı - ilk proje
      firstProject: "İlk projenin! Bu muhteşem bir başlangıç. Tüm süreci özetlemek ister misin?",
      
      // Proje tamamlandı - deneyimli
      experiencedUser: `${totalCompletedProjects + 1}. projeni tamamladın! Deneyimlerini paylaş.`,
      
      // Hızlı tamamlama
      quickCompletion: "Hızlısın! Bu başarıyı kazanma sürecini yazmak ister misin?",
    },
    en: {
  firstMilestone: "First step taken! How did this beginning feel?",
      halfway: `Great! You've completed ${progressPercentage}% of the project. Keep this momentum!`,
  lastMilestone: "Last step completed! Success is so close, record your emotions.",
      firstProject: "Your first project! This is an amazing start. Want to summarize the entire process?",
      experiencedUser: `You've completed your ${totalCompletedProjects + 1}th project! Share your experience.`,
      quickCompletion: "You're fast! Want to write about how you achieved this success?",
    }
  };
  
  const messages = contextMessages[language];
  
  // Context-based message selection
  if (completion.type === 'project') {
    if (totalCompletedProjects === 0) {
      return messages.firstProject;
    } else {
      return messages.experiencedUser;
    }
  } else {
    // Milestone completion
    if (completedMilestones === 1) {
      return messages.firstMilestone;
    } else if (progressPercentage >= 80) {
      return messages.lastMilestone;
    } else if (progressPercentage >= 40 && progressPercentage <= 60) {
      return messages.halfway;
    }
  }
  
  // Default: random message
  return getCelebrationMessage(completion, language);
};

export default { getCelebrationMessage, getContextualMessage };

