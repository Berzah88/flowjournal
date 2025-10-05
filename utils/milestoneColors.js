// Milestone Renk Paleti - Merkezi Yönetim
import { MILESTONE_COLORS } from '../constants';

// Dark mode için uygun renk paleti
const DARK_MODE_MILESTONE_COLORS = [
  "#FF6B6B", // Soft kırmızı
  "#4ECDC4", // Soft turkuaz
  "#45B7D1", // Soft mavi
  "#96CEB4", // Soft yeşil
  "#FFEAA7", // Soft sarı
  "#DDA0DD", // Soft mor
  "#F39C12", // Soft turuncu
  "#E17055", // Soft koral
  "#00B894", // Soft nane
  "#6C5CE7", // Soft lavanta
  "#A29BFE", // Soft menekşe
  "#FD79A8", // Soft pembe
  "#00CEC9", // Soft teal
  "#FDCB6E", // Soft altın
  "#E84393", // Soft fuşya
  "#74B9FF", // Soft gökyüzü
];

// Kullanılan renkleri takip etmek için Set
let usedColors = new Set();

// Milestone icon arkaplan rengini belirleyen fonksiyon
export const getMilestoneColor = (milestone, theme = 'light') => {
  // Güvenlik kontrolü - milestone objesi değilse varsayılan renk döndür
  if (!milestone || typeof milestone !== 'object') {
    return theme === 'dark' ? "#6B7280" : "#BFBFBF";
  }
  
  if (milestone.completed) {
    return theme === 'dark' ? "#6B7280" : "#BFBFBF"; // Completed milestone'lar tema uyumlu gri
  }
  
  // Eğer milestone'ın zaten rengi varsa, onu kullan
  if (milestone.color) {
    return milestone.color;
  }
  
  // Milestone'a unique renk ata
  return assignUniqueColor(milestone, theme);
};

// Milestone kart gövde rengini belirleyen fonksiyon - her zaman beyaz
export const getMilestoneCardColor = () => {
  return "#F2F2F7"; // Modern Apple tarzı açık gri - modal ile aynı
};

// Unique renk atama fonksiyonu
export const assignUniqueColor = (milestone, theme = 'light') => {
  // Güvenlik kontrolü - milestone objesi değilse varsayılan renk döndür
  if (!milestone || typeof milestone !== 'object') {
    return theme === 'dark' ? "#6B7280" : "#BFBFBF";
  }
  
  const colorPalette = theme === 'dark' ? DARK_MODE_MILESTONE_COLORS : MILESTONE_COLORS;
  
  // Önce paletten kullanılmayan renk ara
  for (const color of colorPalette) {
    if (!usedColors.has(color)) {
      usedColors.add(color);
      milestone.color = color; // Milestone'a rengi ata
      return color;
    }
  }
  
  // Palet bitti, random renk generate et
  const randomColor = generateRandomColor(theme);
  usedColors.add(randomColor);
  milestone.color = randomColor;
  return randomColor;
};

// Random renk generate etme fonksiyonu
const generateRandomColor = (theme = 'light') => {
  const hue = Math.floor(Math.random() * 360);
  
  if (theme === 'dark') {
    // Dark mode için daha canlı renkler
    const saturation = 60 + Math.floor(Math.random() * 30); // 60-90% arası
    const lightness = 50 + Math.floor(Math.random() * 30); // 50-80% arası
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  } else {
    // Light mode için soft tonlar
    const saturation = 20 + Math.floor(Math.random() * 30); // 20-50% arası
    const lightness = 75 + Math.floor(Math.random() * 20); // 75-95% arası
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
};

// Kullanılan renkleri temizleme fonksiyonu (test için)
export const clearUsedColors = () => {
  usedColors.clear();
};

// Milestone rengini güncelleme fonksiyonu
export const updateMilestoneColor = (milestone, newColor) => {
  // Eski rengi kullanılan renklerden çıkar
  if (milestone.color) {
    usedColors.delete(milestone.color);
  }
  
  // Yeni rengi ata
  milestone.color = newColor;
  usedColors.add(newColor);
};

// Milestone silindiğinde rengi serbest bırakma fonksiyonu
export const releaseMilestoneColor = (milestone) => {
  if (milestone.color) {
    usedColors.delete(milestone.color);
  }
};
