// Milestone Renk Paleti - Merkezi Yönetim
export const MILESTONE_COLORS = [
  "#B6CEB4", // Soft yeşil
  "#CBDCEB", // Soft mavi
  "#C0C9EE", // Soft mor
  "#D1D8BE", // Soft zeytin
  "#FFD6BA", // Soft turuncu
  "#FFF2EB", // Soft krem
  "#F49BAB", // Soft pembe
  "#F0F1C5", // Soft limon
  "#FFD2A0", // Soft şeftali
  "#E7CCCC", // Soft gül
  "#DEE5D4", // Soft nane
  "#F1D3CE", // Soft koral
  "#9FB3DF", // Soft gökyüzü
  "#BDDDE4", // Soft buz
  "#D5E5D5", // Soft mint
  "#C7D9DD", // Soft gri mavi
];

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
