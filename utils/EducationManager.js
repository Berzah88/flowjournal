// utils/EducationManager.js
import { EDUCATION_STEPS } from '../context/EducationContext';

// Education step metadata
export const EDUCATION_STEP_CONFIG = {
  [EDUCATION_STEPS.CREATE_PROJECT]: {
    title: {
      tr: 'Başlayalım! 🚀',
      en: 'Let\'s Begin! 🚀'
    },
    description: {
      tr: 'İlk projenizi oluşturarak başlayın. Düğün planınız, kariyer hedefiniz veya kişisel bir yolculuğunuz olabilir.',
      en: 'Start by creating your first project. It could be your wedding plan, career goal, or a personal journey.'
    },
    buttonText: {
      tr: 'Proje Ekle',
      en: 'Add Project'
    },
    color: '#10B981',
    icon: 'add-circle',
  },
  
  [EDUCATION_STEPS.MY_DAY_INFO]: {
    title: {
      tr: 'Harika! 🎉',
      en: 'Great! 🎉'
    },
    description: {
      tr: 'Şimdi projenize ilk görevinizi ekleyelim. Buradan her gün projelerinizi takip edebilir ve deneyimlerinizi yazabilirsiniz.',
      en: 'Now let\'s add your first task to the project. From here, you can track your projects daily and write about your experiences.'
    },
    buttonText: {
      tr: 'İlk Görev Ekle',
      en: 'Add First Task'
    },
    color: '#3B82F6',
    icon: 'today',
  },
  
  [EDUCATION_STEPS.MY_DAY_FEATURES]: {
    title: {
      tr: 'Keşfetmeye Hazır mısınız? ✨',
      en: 'Ready to Explore? ✨'
    },
    description: {
      tr: 'Görevlerinize basılı tutarak tamamlayabilir, günlüklerinizi yazabilir, proje kartınızı favori yapabilir ve sağa kaydırarak diğer projelerinizi görebilirsiniz. Artık keşfetmeye başlayabilirsiniz!',
      en: 'Press and hold tasks to complete, write your journals, favorite project cards, and swipe right to see other projects. You\'re ready to explore now!'
    },
    buttonText: {
      tr: 'Hadi Başlayalım',
      en: 'Let\'s Go'
    },
    color: '#F59E0B',
    icon: 'sparkles',
  },
};

// Get step configuration
export const getStepConfig = (step, language = 'tr') => {
  const config = EDUCATION_STEP_CONFIG[step];
  if (!config) return null;
  
  return {
    ...config,
    title: config.title[language] || config.title.tr,
    description: config.description[language] || config.description.tr,
    buttonText: config.buttonText[language] || config.buttonText.tr,
    suggestions: config.suggestions?.[language] || config.suggestions?.tr,
    features: config.features?.[language] || config.features?.tr,
  };
};

// Calculate progress percentage
export const calculateProgress = (currentStep) => {
  const steps = Object.values(EDUCATION_STEPS);
  const currentIndex = steps.indexOf(currentStep);
  
  if (currentIndex === -1) return 0;
  
  return Math.round(((currentIndex + 1) / steps.length) * 100);
};

// Check if step is completed
export const isStepCompleted = (currentStep, targetStep) => {
  const steps = Object.values(EDUCATION_STEPS);
  const currentIndex = steps.indexOf(currentStep);
  const targetIndex = steps.indexOf(targetStep);
  
  return currentIndex > targetIndex;
};

// Get next step
export const getNextStep = (currentStep) => {
  const steps = Object.values(EDUCATION_STEPS);
  const currentIndex = steps.indexOf(currentStep);
  
  if (currentIndex < steps.length - 1) {
    return steps[currentIndex + 1];
  }
  
  return null;
};

// Get previous step
export const getPreviousStep = (currentStep) => {
  const steps = Object.values(EDUCATION_STEPS);
  const currentIndex = steps.indexOf(currentStep);
  
  if (currentIndex > 0) {
    return steps[currentIndex - 1];
  }
  
  return null;
};

// Check if education should be shown for new users
export const shouldShowEducation = (hasAnyTasks, educationCompleted) => {
  // Show education only if:
  // 1. User has no tasks (new user)
  // 2. Education not completed yet
  return !hasAnyTasks && !educationCompleted;
};

export default {
  EDUCATION_STEP_CONFIG,
  getStepConfig,
  calculateProgress,
  isStepCompleted,
  getNextStep,
  getPreviousStep,
  shouldShowEducation,
};

