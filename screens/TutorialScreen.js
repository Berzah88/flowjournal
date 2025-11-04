import React, { useRef, useEffect, useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions,
  StatusBar,
  ScrollView,
  Image
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { FONTS, COLORS, SPACING, BORDER_RADIUS, ANIMATION_DURATIONS, Helpers } from "../constants";
import { useLanguage } from "../context/LanguageContext";
import { useEducation } from "../context/EducationContext";
import permissionManager from '../services/PermissionManager';
// Helpers moved to constants; prefer the centralized token module

const { width, height } = Dimensions.get("window");

export default function TutorialScreen({ navigation }) {
  const { t, language } = useLanguage();
  const { startEducation } = useEducation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps = [
    {
      id: 1,
      title: language === 'tr' ? 'Hoşgeldiniz' : 'Welcome',
      description: language === 'tr' 
        ? 'Projelerinizi kişisel deneyimlerinize dönüştürün. Flow Journal sadece bir proje yöneticisi değil, tüm organizasyon, plan ve yapılacak listeleriniz boyunca değerli anılarınızı da biriktirebilmeniz için tasarlandı.' 
        : 'Transform your projects into personal experiences. Flow Journal is not just a project manager, it\'s designed to allow you to collect your valuable memories throughout all your organizations, plans and to-do lists.',
      color: "#8B5CF6",
      benefits: language === 'tr' 
        ? [
            { icon: 'albums-outline', text: 'Projelerinizi Organize edin' },
            { icon: 'book-outline', text: 'Deneyimlerinizi kaydedin' },
            { icon: 'heart-circle-outline', text: 'İlerlemeniz ve duygularınızı takip edin' }
          ]
        : [
            { icon: 'albums-outline', text: 'Organize your projects' },
            { icon: 'book-outline', text: 'Record your experiences' },
            { icon: 'heart-circle-outline', text: 'Track your progress and emotions' }
          ]
    },
    {
      id: 2,
      title: language === 'tr' ? 'Projeler Oluştur' : 'Create Projects',
      description: language === 'tr'
        ? 'Bir event, işiniz için bir iş planı, düğün planınız veya sadece manifesting için projeler oluşturun.'
        : 'Create projects for an event, a business plan for your work, your wedding plan, or just for manifesting.',
      color: "#10B981",
      benefits: language === 'tr'
        ? [
            { icon: 'folder-outline', text: 'Projeler ve tasklar oluşturun' },
            { icon: 'calendar-outline', text: 'Deadlinelarınızı organize edin' },
            { icon: 'color-palette-outline', text: 'Renkli ve eğlenceli takip' }
          ]
        : [
            { icon: 'folder-outline', text: 'Create projects and tasks' },
            { icon: 'calendar-outline', text: 'Organize your deadlines' },
            { icon: 'color-palette-outline', text: 'Colorful and fun tracking' }
          ],
      tips: language === 'tr'
        ? 'İpucu: Projeler hayal ettiğiniz her şey olabilir. Bir event veya belki sadece duygusal bir yolculuk için bile olabilir.'
        : 'Tip: Projects can be anything you imagine. An event or even just for an emotional journey.'
    },
    {
      id: 3,
      title: language === 'tr' ? 'Görevler Ekle' : 'Add Tasks',
      description: language === 'tr'
        ? 'Projeni adım adım parçala. Her görev tamamlandığında başarı hissini yaşa!'
        : 'Break down your project step by step. Feel the success as you complete each task!',
      color: "#3B82F6",
      benefits: language === 'tr'
        ? [
            { icon: 'checkmark-circle-outline', text: 'Sınırsız görev ekle' },
            { icon: 'git-branch-outline', text: 'Alt görevler oluştur' },
            { icon: 'stats-chart-outline', text: 'İlerlemeyi görselleştir' }
          ]
        : [
            { icon: 'checkmark-circle-outline', text: 'Add unlimited tasks' },
            { icon: 'git-branch-outline', text: 'Create subtasks' },
            { icon: 'stats-chart-outline', text: 'Visualize progress' }
          ],
      tips: language === 'tr'
        ? 'İpucu: Görevleri birbirine bağlayarak mantıksal bir akış oluştur!'
        : 'Tip: Link tasks together to create a logical flow!'
    },
    {
      id: 4,
      title: language === 'tr' ? 'Anı Günlüğü Oluştur' : 'Create Memory Journal',
      description: language === 'tr'
        ? 'Projelerinizdeki anı ve deneyimlerinizi kaydettikçe yapay zeka yazdıklarınızdan çıkarımlar yaparak sizi daha çok tanır. Fotoğraf, not, konum ve AI destekli mood takibiyle zengin bir anı arşivi oluşturun.'
        : 'As you record your memories and experiences in your projects, AI gets to know you better by making inferences from what you write. Create a rich memory archive with photos, notes, location and AI-powered mood tracking.',
      color: "#FF6B6B",
      benefits: language === 'tr'
        ? [
            { icon: 'list-outline', text: 'Yapılacak listenizi kişisel deneyimlere dönüştürün' },
            { icon: 'images-outline', text: 'Medya ve konumlarla zengin anılar yaratın' },
            { icon: 'phone-portrait-outline', text: 'Her yerden üyelik vb. zorunluluklar olmadan erişin' }
          ]
        : [
            { icon: 'list-outline', text: 'Transform your to-do list into personal experiences' },
            { icon: 'images-outline', text: 'Create rich memories with media and locations' },
            { icon: 'phone-portrait-outline', text: 'Access from anywhere without membership requirements' }
          ],
      tips: language === 'tr'
        ? 'İpucu: AI ne kadar çok yazarsanız sizi o kadar iyi tanır ve daha doğru mood analizleri yapar!'
        : 'Tip: The more you write, the better AI knows you and makes more accurate mood analyses!'
    },
    {
      id: 5,
      title: language === 'tr' ? 'Anılarınızı Yeniden Keşfedin' : 'Rediscover Your Memories',
      description: language === 'tr'
        ? 'Geçmişinize dönük deneyim ve duygularınızı yeniden keşfedin. Biriktirdiğiniz projelerinizdeki anılar ve duygusal yolcuklarınızı yeniden deneyimleyin.'
        : 'Rediscover your past experiences and emotions. Re-experience the memories and emotional journeys from your collected projects.',
      color: "#F59E0B",
      benefits: language === 'tr'
        ? [
            { icon: 'archive-outline', text: 'Projelerinizi anılarınız ile arşivleyin' },
            { icon: 'time-outline', text: 'Her projeniz geçmişinize bir yolculuk olacak' },
            { icon: 'star-outline', text: 'Özel anlarınızı yeniden yaşayın' }
          ]
        : [
            { icon: 'archive-outline', text: 'Archive your projects with your memories' },
            { icon: 'time-outline', text: 'Every project will be a journey to your past' },
            { icon: 'star-outline', text: 'Relive your special moments' }
          ],
      tips: language === 'tr'
        ? 'İpucu: Anılarını düzenli gözden geçirmek, yaşam kalitenizi artırır!'
        : 'Tip: Regularly reviewing your memories improves your quality of life!'
    }
  ];

  useEffect(() => {
    // Reset animations when step changes
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.9);
    
    // Staggered entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_DURATIONS.SLOW,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  const handleNext = async () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Tutorial bittiğinde education'ı başlat, izinleri sor ve Main'e geç
      console.log('🎓 Tutorial completed, starting education...');
      startEducation();

      try {
        await permissionManager.requestAllPermissions();
      } catch (e) {
        console.warn('Permission request failed:', e);
      }

      navigation?.replace("Main");
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    // Skip'te de education'ı başlat, izinleri sor ve Main'e git
    console.log('🎓 Tutorial skipped, starting education...');
    startEducation();

    try {
      await permissionManager.requestAllPermissions();
    } catch (e) {
      console.warn('Permission request failed on skip:', e);
    }

    navigation?.replace("Main");
  };

  const currentTutorial = tutorialSteps[currentStep];

  return (
    <View style={[styles.fullScreen, Helpers.container]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
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
              <Image 
                source={require('../assets/logo-yeni.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
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
            {language === 'tr' ? `Adım ${currentStep + 1} / ${tutorialSteps.length}` : `Step ${currentStep + 1} of ${tutorialSteps.length}`}
          </Text>
        </Animated.View>

        {/* Tutorial Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            {/* Title */}
            <Text style={[styles.title, { color: currentTutorial.color }]}>
              {currentTutorial.title}
            </Text>

            {/* Description */}
            <Text style={styles.description}>
              {currentTutorial.description}
            </Text>

            {/* Benefits List */}
            <View style={styles.benefitsContainer}>
              {currentTutorial.benefits.map((benefit, index) => (
                <Animated.View 
                  key={index}
                  style={[
                    styles.benefitItem,
                    {
                      opacity: fadeAnim,
                      transform: [{ 
                        translateX: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-20, 0]
                        }) 
                      }]
                    }
                  ]}
                >
                  <View style={[styles.benefitIconContainer, { backgroundColor: currentTutorial.color + '20' }]}>
                    <Ionicons name={benefit.icon} size={18} color={currentTutorial.color} />
                  </View>
                  <Text style={styles.benefitText}>{benefit.text}</Text>
                </Animated.View>
              ))}
            </View>

            {/* Tips */}
            {currentTutorial.tips && (
              <View style={[styles.tipsContainer, { borderLeftColor: currentTutorial.color }]}>
                <Ionicons name="bulb-outline" size={20} color={currentTutorial.color} />
                <Text style={styles.tipsText}>{currentTutorial.tips}</Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          <View style={styles.buttonRow}>
            {/* Back Button */}
            {currentStep > 0 && (
              <TouchableOpacity
                style={[styles.backButton, { borderColor: currentTutorial.color }]}
                onPress={handleBack}
                accessible={true}
                accessibilityLabel="Previous Step"
                accessibilityRole="button"
              >
                <Ionicons name="chevron-back" size={20} color={currentTutorial.color} />
                <Text style={[styles.backButtonText, { color: currentTutorial.color }]}>
                  {language === 'tr' ? 'Geri' : 'Back'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Next Button */}
            <TouchableOpacity
              style={[
                styles.button, 
                styles.nextButton, 
                { backgroundColor: currentTutorial.color },
                currentStep === 0 && styles.singleButton
              ]}
              onPress={handleNext}
              accessible={true}
              accessibilityLabel={currentStep === tutorialSteps.length - 1 ? "Get Started" : "Next Step"}
              accessibilityRole="button"
            >
              <View style={styles.buttonContent}>
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
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
  },
  container: {
    width: "100%",
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.XL,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + SPACING.LG : SPACING.XXL,
    paddingBottom: SPACING.SM,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoContainer: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
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
    paddingVertical: SPACING.MD,
  },
  progressTrack: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.SM,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(107, 70, 193, 0.3)",
    marginHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotActive: {
    backgroundColor: "#6B46C1",
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  progressDotCompleted: {
    backgroundColor: "#10B981",
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  progressText: {
    fontSize: 12,
    fontFamily: FONTS.MEDIUM,
    color: "rgba(107, 70, 193, 0.6)",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.LG,
    paddingTop: SPACING.XXL,
  },
  title: {
    fontSize: 32,
    fontFamily: FONTS.BOLD,
    textAlign: "center",
    marginBottom: SPACING.LG,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    fontFamily: FONTS.REGULAR,
    color: "rgba(107, 70, 193, 0.8)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: SPACING.XL,
  },
  benefitsContainer: {
    width: "100%",
    marginBottom: SPACING.LG,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.MD,
    paddingHorizontal: SPACING.MD,
  },
  benefitIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.MD,
  },
  benefitText: {
    fontSize: 15,
    fontFamily: FONTS.MEDIUM,
    color: "rgba(107, 70, 193, 0.9)",
    flex: 1,
    lineHeight: 22,
  },
  tipsContainer: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    flexDirection: "row",
    alignItems: "flex-start",
    borderLeftWidth: 4,
    marginTop: SPACING.MD,
  },
  tipsText: {
    fontSize: 14,
    fontFamily: FONTS.MEDIUM,
    color: "rgba(107, 70, 193, 0.9)",
    flex: 1,
    marginLeft: SPACING.SM,
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: SPACING.XL,
    paddingBottom: SPACING.XL,
    paddingTop: SPACING.MD,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.MD,
  },
  button: {
    flex: 1,
    borderRadius: BORDER_RADIUS.XL,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  singleButton: {
    flex: 1,
  },
  nextButton: {
    // Specific styles for next button if needed
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.LG,
    paddingHorizontal: SPACING.LG,
    minHeight: 56,
    backgroundColor: "transparent",
  },
  buttonText: {
    fontSize: 18,
    fontFamily: FONTS.BOLD,
    color: "white",
    marginRight: SPACING.SM,
    letterSpacing: -0.3,
    backgroundColor: "transparent",
  },
  buttonIcon: {
    marginLeft: SPACING.XS,
    backgroundColor: "transparent",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.XL,
    borderWidth: 2,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    minWidth: 100,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: FONTS.BOLD,
    marginLeft: SPACING.XS,
    backgroundColor: "transparent",
  },
});
