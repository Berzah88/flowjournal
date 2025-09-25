// Milestone Renk Paleti - Merkezi Yönetim
import { MILESTONE_COLORS } from '../constants';

// Kullanılan renkleri takip etmek için Set
let usedColors = new Set();

// Milestone rengini belirleyen fonksiyon
export const getMilestoneColor = (milestone) => {
  if (milestone.completed) return "#BFBFBF"; // Completed milestone'lar gri
  
  // Eğer milestone'ın zaten rengi varsa, onu kullan
  if (milestone.color) {
    return milestone.color;
  }
  
  // Milestone'a unique renk ata
  return assignUniqueColor(milestone);
};

// Unique renk atama fonksiyonu
export const assignUniqueColor = (milestone) => {
  // Önce paletten kullanılmayan renk ara
  for (const color of MILESTONE_COLORS) {
    if (!usedColors.has(color)) {
      usedColors.add(color);
      milestone.color = color; // Milestone'a rengi ata
      return color;
    }
  }
  
  // Palet bitti, random renk generate et
  const randomColor = generateRandomColor();
  usedColors.add(randomColor);
  milestone.color = randomColor;
  return randomColor;
};

// Random renk generate etme fonksiyonu
const generateRandomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 20 + Math.floor(Math.random() * 30); // 20-50% arası
  const lightness = 75 + Math.floor(Math.random() * 20); // 75-95% arası (soft tonlar)
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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
