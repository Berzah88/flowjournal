// context/EducationContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EducationContext = createContext();

// Education Steps - Her adım bağımsız
export const EDUCATION_STEPS = {
  CREATE_PROJECT: 'create_project',
  MY_DAY_INFO: 'my_day_info',
  MY_DAY_FEATURES: 'my_day_features',
};

const STORAGE_KEY = '@education_progress';

export const EducationProvider = ({ children }) => {
  const [isEducationActive, setIsEducationActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [educationCompleted, setEducationCompleted] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState(null);
  const [createdMilestoneId, setCreatedMilestoneId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load education progress from storage
  useEffect(() => {
    loadEducationProgress();
  }, []);

  const loadEducationProgress = async () => {
    try {
      const progress = await AsyncStorage.getItem(STORAGE_KEY);
      if (progress) {
        const data = JSON.parse(progress);
        setEducationCompleted(data.completed || false);
        setCurrentStep(data.currentStep || null);
        setIsEducationActive(data.isActive || false);
        setCreatedProjectId(data.projectId || null);
        setCreatedMilestoneId(data.milestoneId || null);
      }
    } catch (error) {
      console.error('Error loading education progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveEducationProgress = async (data) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving education progress:', error);
    }
  };

  // Start education
  const startEducation = useCallback(() => {
    console.log('🎓 Education started');
    setIsEducationActive(true);
    setCurrentStep(EDUCATION_STEPS.CREATE_PROJECT);
    setEducationCompleted(false);
    
    const progressData = {
      isActive: true,
      currentStep: EDUCATION_STEPS.CREATE_PROJECT,
      completed: false,
    };
    
    saveEducationProgress(progressData);
    console.log('🎓 Education progress saved:', progressData);
  }, []);

  // Move to next step
  const nextStep = useCallback(() => {
    const steps = Object.values(EDUCATION_STEPS);
    const currentIndex = steps.indexOf(currentStep);
    
    if (currentIndex < steps.length - 1) {
      const nextStepValue = steps[currentIndex + 1];
      console.log(`🎓 Moving to next step: ${nextStepValue}`);
      setCurrentStep(nextStepValue);
      saveEducationProgress({
        isActive: true,
        currentStep: nextStepValue,
        completed: false,
        projectId: createdProjectId,
        milestoneId: createdMilestoneId,
      });
    }
  }, [currentStep, createdProjectId, createdMilestoneId]);

  // Go to specific step
  const goToStep = useCallback((step) => {
    console.log(`🎓 Going to step: ${step}`);
    setCurrentStep(step);
    saveEducationProgress({
      isActive: true,
      currentStep: step,
      completed: false,
      projectId: createdProjectId,
      milestoneId: createdMilestoneId,
    });
  }, [createdProjectId, createdMilestoneId]);

  // Complete education
  const completeEducation = useCallback(() => {
    console.log('🎓 Education completed');
    setIsEducationActive(false);
    setCurrentStep(EDUCATION_STEPS.COMPLETED);
    setEducationCompleted(true);
    saveEducationProgress({
      isActive: false,
      currentStep: EDUCATION_STEPS.COMPLETED,
      completed: true,
      projectId: createdProjectId,
      milestoneId: createdMilestoneId,
    });
  }, [createdProjectId, createdMilestoneId]);

  // Skip education
  const skipEducation = useCallback(() => {
    console.log('🎓 Education skipped');
    setIsEducationActive(false);
    setCurrentStep(null);
    setEducationCompleted(true);
    saveEducationProgress({
      isActive: false,
      currentStep: null,
      completed: true,
      skipped: true,
    });
  }, []);

  // Reset education (for testing)
  const resetEducation = useCallback(async () => {
    console.log('🎓 Education reset');
    await AsyncStorage.removeItem(STORAGE_KEY);
    setIsEducationActive(false);
    setCurrentStep(null);
    setEducationCompleted(false);
    setCreatedProjectId(null);
    setCreatedMilestoneId(null);
  }, []);

  // Store created project ID
  const setEducationProjectId = useCallback((projectId) => {
    console.log(`🎓 EducationContext: Setting project ID: ${projectId}`);
    setCreatedProjectId(projectId);
    
    const progressData = {
      isActive: true,
      currentStep: currentStep,
      completed: false,
      projectId: projectId,
      milestoneId: createdMilestoneId,
    };
    
    saveEducationProgress(progressData);
    console.log('🎓 EducationContext: Progress saved:', progressData);
  }, [currentStep, createdMilestoneId]);

  // Store created milestone ID
  const setEducationMilestoneId = useCallback((milestoneId) => {
    console.log(`🎓 Education milestone set: ${milestoneId}`);
    setCreatedMilestoneId(milestoneId);
    saveEducationProgress({
      isActive: true,
      currentStep: currentStep,
      completed: false,
      projectId: createdProjectId,
      milestoneId: milestoneId,
    });
  }, [currentStep, createdProjectId]);

  const value = {
    isEducationActive,
    currentStep,
    educationCompleted,
    isLoading,
    createdProjectId,
    createdMilestoneId,
    startEducation,
    nextStep,
    goToStep,
    completeEducation,
    skipEducation,
    resetEducation,
    setEducationProjectId,
    setEducationMilestoneId,
  };

  return (
    <EducationContext.Provider value={value}>
      {children}
    </EducationContext.Provider>
  );
};

export const useEducation = () => {
  const context = useContext(EducationContext);
  if (!context) {
    throw new Error('useEducation must be used within EducationProvider');
  }
  return context;
};

