// constants/index.js
// Tüm sabit değerlerin merkezi yönetimi

// Animasyon süreleri
export const ANIMATION_DURATIONS = {
  FAST: 200,
  NORMAL: 320,
  SLOW: 500,
  VERY_SLOW: 800,
};

// Swipe threshold'ları
export const SWIPE_THRESHOLDS = {
  CLOSE: 120,
  // Fraction of screen width required to navigate between tabs. Lower
  // value -> more sensitive to shorter swipes. Default was 0.18.
  NAVIGATE: 0.12,
  // Velocity threshold (px/s) used for fling shortcuts. Lowering this
  // makes quick swipes easier to trigger.
  VELOCITY: 500,
  PAN_RESPONDER: 12,
};

// Renk paleti
export const COLORS = {
  PRIMARY: "#8E7DBE",
  SECONDARY: "#6C63FF",
  SUCCESS: "#4CAF50",
  ERROR: "#FF4444",
  WARNING: "#FFD700",
  INFO: "#4A90E2",
  WHITE: "#FFFFFF",
  BLACK: "#000000",
  GRAY: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
};

// Font aileleri
export const FONTS = {
  LIGHT: "Poppins_300Light",
  REGULAR: "Poppins_400Regular",
  MEDIUM: "Poppins_500Medium",
  SEMI_BOLD: "Poppins_600SemiBold",
  BOLD: "Poppins_700Bold",
  EXTRA_BOLD: "Poppins_800ExtraBold",
};

// Spacing değerleri
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
};

// Border radius değerleri
export const BORDER_RADIUS = {
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 20,
  FULL: 999,
};

// Elevation değerleri
export const ELEVATION = {
  SM: 2,
  MD: 4,
  LG: 8,
  XL: 12,
  XXL: 16,
};

// Modal boyutları
export const MODAL_SIZES = {
  PREVIEW_HEIGHT: 150,
  MAX_PREVIEW_ITEMS: 4,
  TOP_GAP: 50,
  SWIPE_AREA: 40,
};

// Storage keys
export const STORAGE_KEYS = {
  TASKS: "tasks",
};

// Error messages
export const ERROR_MESSAGES = {
  STORAGE_LOAD_FAILED: "Failed to load data from storage",
  STORAGE_SAVE_FAILED: "Failed to save data to storage",
  IMAGE_PICK_FAILED: "Failed to pick image",
  LOCATION_FAILED: "Failed to get location",
  NETWORK_ERROR: "Network connection error",
};

// Success messages
export const SUCCESS_MESSAGES = {
  TASK_SAVED: "Task saved successfully",
  MILESTONE_ADDED: "Milestone added successfully",
  JOURNAL_ENTRY_SAVED: "Journal entry saved successfully",
};

// Milestone renk paleti - Merkezi yönetim
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

// Mood seçenekleri artık utils/AIMoodPredictor.js'de yönetiliyor

// Accessibility labels
export const ACCESSIBILITY_LABELS = {
  ADD_PROJECT: "Add new project",
  ADD_MILESTONE: "Add new milestone",
  EDIT_PROJECT: "Edit project",
  DELETE_PROJECT: "Delete project",
  COMPLETE_PROJECT: "Mark project as complete",
  SAVE_JOURNAL: "Save journal entry",
  ADD_PHOTO: "Add photo to journal",
  ADD_LOCATION: "Add location to journal",
  SELECT_MOOD: "Select mood for journal entry",
};

// Animation configs
export const ANIMATION_CONFIGS = {
  SPRING: {
    damping: 20,
    stiffness: 300,
    mass: 0.8,
  },
  TIMING: {
    duration: ANIMATION_DURATIONS.NORMAL,
  },
  BOUNCE: {
    damping: 15,
    stiffness: 200,
    mass: 0.5,
  },
};
