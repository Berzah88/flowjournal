import React, { useRef, useEffect, useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions,
  StatusBar,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { FONTS, COLORS, SPACING, BORDER_RADIUS, ANIMATION_DURATIONS } from "../constants";
import { useLanguage } from "../context/LanguageContext";
import AddProjectScreen from "./AddProjectScreen";
import ActiveProject from "./ActiveProject";
import Journal from "./Journal";
import MainScreen from "./MainScreen";

const { width, height } = Dimensions.get("window");

export default function TutorialScreen({ navigation }) {
  const { t } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps = [
    {
      id: 1,
      title: t('createProject'),
      description: t('createProjectDescription'),
      color: "#10B981",
      screen: "AddProject"
    },
    {
      id: 2,
      title: t('addMilestones'),
      description: t('addMilestonesDescription'),
      color: "#3B82F6",
      screen: "ActiveProject"
    },
    {
      id: 3,
      title: t('emotionJournal'),
      description: t('emotionJournalDescription'),
      color: "#F59E0B",
      screen: "Journal"
    },
    {
      id: 4,
      title: t('viewProgress'),
      description: t('viewProgressDescription'),
      color: "#8B5CF6",
      screen: "Main"
    }
  ];

  useEffect(() => {
    // Staggered entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_DURATIONS.SLOW,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: ANIMATION_DURATIONS.SLOW,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigation?.replace("Main");
    }
  };

  const handleSkip = () => {
    navigation?.replace("Main");
  };

  const currentTutorial = tutorialSteps[currentStep];

  const renderScreenPreview = () => {
    const screenProps = {
      navigation: { navigate: () => {}, replace: () => {}, goBack: () => {} },
      selectedCard: null,
      onClose: () => {},
      setMainActiveTab: () => {},
      selectedMilestone: null,
      setSelectedMilestone: () => {},
      autoOpenJournal: false
    };

    switch (currentTutorial.screen) {
      case "AddProject":
        // Real AddProject modal view - only modal, no background
        return (
          <View style={styles.mockModal}>
            <View style={styles.mockInputOverlay}>
              <Text style={styles.mockInputText}>My New Project</Text>
            </View>
            
            <View style={styles.mockDateButton}>
              <Text style={styles.mockDateButtonText}>Add Date</Text>
            </View>
          </View>
        );
      case "ActiveProject":
        // Use the wedding plan screenshot
        return (
          <View style={[styles.mockActiveProject, styles.mockActiveProjectNarrow]}>
            <Image 
              source={require('../assets/wedding-plan-screenshot.jpg')}
              style={styles.mockScreenshot}
              resizeMode="contain"
            />
          </View>
        );
      case "Journal":
        // Use the emotion journal screenshot
        return (
          <View style={[styles.mockActiveProject, styles.mockActiveProjectNarrow]}>
            <Image 
              source={require('../assets/emotion-journal-screenshot.jpg')}
              style={styles.mockScreenshot}
              resizeMode="contain"
            />
          </View>
        );
      case "Main":
        // Use the view progress screenshot
        return (
          <View style={[styles.mockActiveProject, styles.mockActiveProjectSmall]}>
            <Image 
              source={require('../assets/viev-progress-screenshot.jpg')}
              style={styles.mockScreenshot}
              resizeMode="contain"
            />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={[
          "#FAFAFA", 
          "#F5F3FF", 
          "#EDE9FE", 
          "#DDD6FE", 
          "#C4B5FD", 
          "#A78BFA", 
          "#8B5CF6"
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>FJ</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipText}>{t('skip')}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Progress Indicator */}
        <Animated.View 
          style={[
            styles.progressContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.progressTrack}>
            {tutorialSteps.map((_, index) => (
              <View 
                key={index}
                style={[
                  styles.progressDot,
                  index === currentStep && styles.progressDotActive,
                  index < currentStep && styles.progressDotCompleted
                ]}
              >
                {index < currentStep && (
                  <Ionicons name="checkmark" size={12} color="white" />
                )}
              </View>
            ))}
          </View>
          <Text style={styles.progressText}>
            Step {currentStep + 1} of {tutorialSteps.length}
          </Text>
        </Animated.View>

        {/* Tutorial Content */}
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Screen Preview */}
          <View style={styles.screenPreviewContainer}>
            {renderScreenPreview()}
          </View>

          {/* Title */}
          <Text style={styles.title}>{currentTutorial.title}</Text>

          {/* Description */}
          <Text style={styles.description}>
            {currentStep === 0 
              ? "Create your own task manager for your events, manifesting, personal journey or any topic"
              : currentTutorial.description
            }
          </Text>

        </Animated.View>

        {/* Navigation Buttons */}
        <Animated.View 
          style={[
            styles.buttonContainer,
            currentStep > 0 && styles.buttonContainerLower,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
            <TouchableOpacity
              style={[styles.button, styles.nextButton, { backgroundColor: currentTutorial.color }]}
              onPress={handleNext}
              accessible={true}
              accessibilityLabel={currentStep === tutorialSteps.length - 1 ? "Get Started" : "Next Step"}
              accessibilityRole="button"
            >
              <View style={styles.buttonGradient}>
                <Text style={styles.buttonText}>
                  {currentStep === tutorialSteps.length - 1 ? t('getStarted') : t('continue')}
                </Text>
                <Ionicons 
                  name={currentStep === tutorialSteps.length - 1 ? "arrow-forward" : "chevron-forward"} 
                  size={20} 
                  color="white" 
                  style={styles.buttonIcon} 
                />
              </View>
            </TouchableOpacity>
            
            {/* Back Button */}
            {currentStep > 0 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCurrentStep(currentStep - 1)}
                accessible={true}
                accessibilityLabel="Previous Step"
                accessibilityRole="button"
              >
                <Ionicons name="chevron-back" size={20} color={currentTutorial.color} />
                <Text style={[styles.backButtonText, { color: currentTutorial.color }]}>
                  Back
                </Text>
              </TouchableOpacity>
            )}
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#8B5CF6",
  },
  container: {
    flex: 1,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.XL,
    paddingTop: SPACING.LG,
    paddingBottom: SPACING.SM,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 16,
    fontFamily: FONTS.BOLD,
    color: "rgba(107, 70, 193, 0.9)",
  },
  skipButton: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  skipText: {
    fontSize: 16,
    fontFamily: FONTS.MEDIUM,
    color: "rgba(107, 70, 193, 0.8)",
  },
  progressContainer: {
    alignItems: "center",
    paddingVertical: SPACING.LG,
  },
  progressTrack: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.SM,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(107, 70, 193, 0.3)",
    marginHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotActive: {
    backgroundColor: "#6B46C1",
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  progressDotCompleted: {
    backgroundColor: "#10B981",
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 12,
    fontFamily: FONTS.MEDIUM,
    color: "rgba(107, 70, 193, 0.6)",
    textAlign: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.XL,
  },
  screenPreviewContainer: {
    alignItems: "center",
    marginBottom: SPACING.XXL,
    width: "100%",
    maxWidth: 400,
  },
  title: {
    fontSize: 28,
    fontFamily: FONTS.BOLD,
    color: "#6B46C1",
    textAlign: "center",
    marginBottom: SPACING.LG,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    fontFamily: FONTS.REGULAR,
    color: "rgba(107, 70, 193, 0.7)",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
    marginBottom: SPACING.XL,
  },
  stepCounter: {
    fontSize: 14,
    fontFamily: FONTS.MEDIUM,
    color: "rgba(107, 70, 193, 0.6)",
    textAlign: "center",
  },
  buttonContainer: {
    paddingHorizontal: SPACING.XL,
    paddingBottom: SPACING.XXL,
    minHeight: 120, // Reserve space for back button height
  },
  buttonContainerLower: {
    marginTop: 40,
  },
  button: {
    width: "100%",
    borderRadius: BORDER_RADIUS.XL,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  nextButton: {
    // Specific styles for next button if needed
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.LG,
    paddingHorizontal: SPACING.XL,
    minHeight: 56,
    borderRadius: BORDER_RADIUS.XL,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: FONTS.BOLD,
    color: "white",
    marginRight: SPACING.SM,
    letterSpacing: -0.3,
  },
  buttonIcon: {
    marginLeft: SPACING.XS,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: FONTS.MEDIUM,
    marginLeft: SPACING.XS,
  },
  // Mock Modal Styles - matches real AddProjectScreen, scaled down
  mockModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    width: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  mockInputOverlay: {
    width: "100%",
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#525252",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginVertical: 12,
    paddingVertical: 4,
    minHeight: 50,
    maxHeight: 100,
  },
  mockInputText: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#525252",
  },
  mockDateButton: {
    paddingVertical: 12,
    marginVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "#4A90E2",
  },
  mockDateButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
  // Mock ActiveProject Styles - matches the provided screenshot
  mockActiveProject: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    overflow: "hidden",
    width: 240,
    height: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 30,
  },
  mockActiveProjectNarrow: {
    height: 240,
  },
  mockActiveProjectSmall: {
    width: 200,
    height: 240,
    marginTop: 50,
  },
  mockScreenshot: {
    width: "100%",
    height: "100%",
  },
  mockScreenshotPlaceholder: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  mockScreenshotText: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#1D1D1F",
    textAlign: "center",
    marginBottom: 8,
  },
  mockScreenshotSubtext: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#8E8E93",
    textAlign: "center",
  },
  mockScreenshotIcon: {
    marginTop: 20,
    padding: 20,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderRadius: 50,
  },
  // Header Styles
  mockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  mockHeaderContent: {
    flex: 1,
  },
  mockTitle: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#1D1D1F",
    marginBottom: 4,
  },
  mockDateRange: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#8E8E93",
  },
  mockMenuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  // Modern Header Styles
  mockModernHeader: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  mockHeaderContent: {
    flexDirection: "column",
    gap: 12,
  },
  mockTitleSection: {
    flexDirection: "column",
    gap: 4,
  },
  mockModernTitle: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#1D1D1F",
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  mockDateRange: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#8E8E93",
    letterSpacing: -0.2,
  },
  mockTabSwitcher: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  mockTabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  mockActiveTabButton: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mockTabButtonText: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#8E8E93",
  },
  mockActiveTabButtonText: {
    color: "#1D1D1F",
    fontFamily: "Poppins_600SemiBold",
  },
  // Progress Section
  mockProgressSection: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  mockProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mockProgressLabel: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#8E8E93",
    letterSpacing: -0.2,
  },
  mockProgressPercentage: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: "#007AFF",
  },
  mockProgressBarContainer: {
    height: 6,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  mockProgressBar: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 3,
  },
  // Milestones Container
  mockMilestonesContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  mockMilestoneHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  mockMilestoneHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mockMilestoneTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#1D1D1F",
  },
  mockMinimalAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  mockMinimalAddText: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#007AFF",
  },
  mockMilestonesList: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  mockMilestoneCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mockMilestoneContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  mockMilestoneIcon: {
    width: 24,
    alignItems: "center",
    marginRight: 12,
  },
  mockMilestoneTextContainer: {
    flex: 1,
  },
  mockMilestoneText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#1D1D1F",
    marginBottom: 2,
  },
  mockMilestoneSubtext: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#8E8E93",
  },
  mockMilestoneStatus: {
    width: 24,
    alignItems: "center",
  },
});
