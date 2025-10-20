import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  StatusBar,
  Animated,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import Journal from "./Journal";
import { useActiveTasks, useTaskActions } from "../hooks/useTaskContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { getMilestoneColor } from "../utils/milestoneColors";

const { width, height } = Dimensions.get("window");

const JournalDetailScreen = ({ 
  route, 
  navigation
}) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const locale = language === 'tr' ? 'tr-TR' : (language || 'en-US');
  const { selectedMediaData: initialMediaData } = route.params;
  const activeTasks = useActiveTasks();
  const { updateProjectJournalEntry } = useTaskActions();
  const [locationText, setLocationText] = useState(null);
  const [journalModalVisible, setJournalModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  
  // Milestone selection modal states
  const [milestoneModalVisible, setMilestoneModalVisible] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);

  // Fullscreen Media Viewer States
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useSharedValue(0.95);
  const opacityAnim = useSharedValue(0);

  // Fullscreen Animation Values
  const fullscreenScale = useSharedValue(0);
  const fullscreenOpacity = useSharedValue(0);
  const fullscreenTranslateX = useSharedValue(0);
  const fullscreenTranslateY = useSharedValue(0);
  
  // TaskContext'ten güncel veriyi al - sadece gerekli değişikliklerde güncelle
  const selectedMediaData = useMemo(() => {
    if (!activeTasks || activeTasks.length === 0) return initialMediaData;
    
    // Güncel task'i bul
    const task = activeTasks.find(t => t.id === initialMediaData.taskId);
    if (!task) return initialMediaData;
    
    // Project-based journal entries'leri al
    const projectJournalEntries = task.journalEntries || [];
    
    // Sadece belirli güne ait journal entries'leri filtrele
    const targetDate = initialMediaData.date;
    const filteredEntries = projectJournalEntries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
        const entryDateString = entryDate.toLocaleDateString(locale, {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
      return entryDateString === targetDate;
    });
    
    // En güncel entry'yi bul (medya, konum, mood için)
    const latestEntry = filteredEntries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    
    // Tüm resimleri topla (tüm entries'lerden)
    const allImages = [];
    filteredEntries.forEach(entry => {
      if (entry.images && entry.images.length > 0) {
        allImages.push(...entry.images);
      }
    });
    
    // Mood objesini doğru şekilde oluştur
    let moodObj = null;
    if (latestEntry?.mood) {
      // MOODS veya EXTENDED_MOODS'dan mood'u bul
      const { MOODS, EXTENDED_MOODS } = require('../utils/AIMoodPredictor');
      let foundMood = MOODS.find(m => m.key === latestEntry.mood);
      if (!foundMood) {
        foundMood = EXTENDED_MOODS.find(m => m.key === latestEntry.mood);
      }
      
      if (foundMood) {
        moodObj = foundMood;
      } else {
        // Custom mood objesi oluştur
        moodObj = {
          key: latestEntry.mood,
          label: latestEntry.mood,
          icon: latestEntry.moodIcon || 'sentiment-neutral',
          color: latestEntry.moodColor || '#F5F5F5'
        };
      }
    }
    
    // initialMediaData'yı güncel verilerle güncelle
    return {
      ...initialMediaData,
      textEntries: filteredEntries, // Sadece o güne ait journal entries
      task: task, // Task bilgisini de ekle
      // Güncel medya, konum ve mood verilerini güncelle
      images: allImages, // Tüm resimleri birleştir
      location: latestEntry?.location || initialMediaData.location,
      mood: moodObj, // Doğru mood objesi
    };
  }, [activeTasks, initialMediaData]);

  // Milestone analizi yapacak fonksiyon
  const analyzeMilestoneRelevance = useCallback((journalText, milestones) => {
    if (!journalText || !milestones || milestones.length === 0) return null;
    
    const textLower = journalText.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;
    
    milestones.forEach(milestone => {
      if (!milestone.title) return;
      
      const milestoneTitle = milestone.title.toLowerCase();
      let score = 0;
      
      // Direkt başlık eşleşmesi
      if (textLower.includes(milestoneTitle)) {
        score += 0.8;
      }
      
      // Başlıktaki anahtar kelimeler
      const titleWords = milestoneTitle.split(' ').filter(word => word.length > 3);
      titleWords.forEach(word => {
        if (textLower.includes(word)) {
          score += 0.3;
        }
      });
      
      // Milestone'a özel anahtar kelimeler
      const milestoneKeywords = {
        'başlangıç': ['başla', 'start', 'ilk', 'commence', 'begin'],
        'tamamla': ['bitir', 'complete', 'finish', 'son', 'end'],
        'test': ['test', 'deneme', 'kontrol', 'check', 'sınama'],
        'tasarım': ['design', 'plan', 'mimari', 'architecture', 'blueprint'],
        'geliştirme': ['development', 'code', 'kod', 'programming', 'build'],
        'dokümantasyon': ['documentation', 'belge', 'rapor', 'manual'],
        'deploy': ['yayınla', 'publish', 'release', 'dağıt', 'launch'],
        'optimizasyon': ['optimize', 'iyileştir', 'performance', 'hızlandır']
      };
      
      Object.entries(milestoneKeywords).forEach(([key, keywords]) => {
        if (milestoneTitle.includes(key) || milestoneTitle.includes(keywords[0])) {
          keywords.forEach(keyword => {
            if (textLower.includes(keyword)) {
              score += 0.2;
            }
          });
        }
      });
      
      // Zaman bazlı analiz (milestone tarihlerine göre)
      if (milestone.startDate && milestone.endDate) {
        const entryDate = new Date(selectedMediaData.textEntries[0]?.createdAt);
        const startDate = new Date(milestone.startDate);
        const endDate = new Date(milestone.endDate);
        
        if (entryDate >= startDate && entryDate <= endDate) {
          score += 0.4; // Tarih aralığında ise bonus puan
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = milestone;
      }
    });
    
    // Minimum güven skoru (0.6) - Düşük confidence'ta otomatik seçim yapma
    return bestScore >= 0.6 ? { milestone: bestMatch, confidence: Math.min(bestScore, 1) } : null;
  }, [selectedMediaData.textEntries]);

  // Milestone analizi - kullanıcı seçimi varsa onu kullan, yoksa kaydedilmiş milestone'ı göster, yoksa AI analizi yap
  const relevantMilestone = useMemo(() => {
    if (!selectedMediaData.task || !selectedMediaData.textEntries || selectedMediaData.textEntries.length === 0) {
      return null;
    }
    
    const milestones = selectedMediaData.task.milestones || [];
    if (milestones.length === 0) return null;
    
    // Eğer kullanıcı manuel seçim yapmışsa onu kullan (state'den)
    if (selectedMilestone) {
      return { milestone: selectedMilestone, confidence: 1.0, isManual: true };
    }
    
    // Journal entry'lerde kaydedilmiş milestone var mı kontrol et
    const firstEntryWithMilestone = selectedMediaData.textEntries.find(entry => entry.milestoneId);
    if (firstEntryWithMilestone && firstEntryWithMilestone.milestoneId) {
      const savedMilestone = milestones.find(m => m.id === firstEntryWithMilestone.milestoneId);
      if (savedMilestone) {
        return { milestone: savedMilestone, confidence: 1.0, isManual: true, isSaved: true };
      }
    }
    
    // Tüm journal metinlerini birleştir - AI analizi
    const allJournalText = selectedMediaData.textEntries
      .map(entry => entry.text || '')
      .join(' ');
    
    const aiResult = analyzeMilestoneRelevance(allJournalText, milestones);
    if (aiResult) {
      return { ...aiResult, isManual: false };
    }
    
    return null;
  }, [selectedMediaData.task, selectedMediaData.textEntries, analyzeMilestoneRelevance, selectedMilestone]);

  // Milestone seçim fonksiyonları
  const handleMilestonePress = useCallback(() => {
    setMilestoneModalVisible(true);
  }, []);

  const handleMilestoneSelect = useCallback((milestone) => {
    setSelectedMilestone(milestone);
    setMilestoneModalVisible(false);
    
    // O günün tüm journal entry'lerine milestone bilgisini kaydet
    if (selectedMediaData.textEntries && selectedMediaData.taskId) {
      selectedMediaData.textEntries.forEach(entry => {
        if (entry.id) {
          updateProjectJournalEntry(selectedMediaData.taskId, entry.id, {
            ...entry,
            milestoneId: milestone.id,
            milestoneTitle: milestone.title
          });
        }
      });
    }
  }, [selectedMediaData, updateProjectJournalEntry]);

  const handleMilestoneClear = useCallback(() => {
    setSelectedMilestone(null);
    setMilestoneModalVisible(false);
    
    // O günün tüm journal entry'lerinden milestone bilgisini kaldır
    if (selectedMediaData.textEntries && selectedMediaData.taskId) {
      selectedMediaData.textEntries.forEach(entry => {
        if (entry.id) {
          updateProjectJournalEntry(selectedMediaData.taskId, entry.id, {
            ...entry,
            milestoneId: null,
            milestoneTitle: null
          });
        }
      });
    }
  }, [selectedMediaData, updateProjectJournalEntry]);

  // Konum bilgisini al - sadece bir kez çalışır
  const [locationLoaded, setLocationLoaded] = useState(false);

  useEffect(() => {
    if (locationLoaded) return; // Prevent multiple calls

    const getLocationText = async () => {
      if (selectedMediaData.location) {
        const coords = selectedMediaData.location.coords || selectedMediaData.location;
        if (coords && coords.latitude && coords.longitude) {
          try {
            // Önce konum izinlerini kontrol et
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
              console.warn('Location permission not granted for reverse geocoding');
              return;
            }

            const result = await Location.reverseGeocodeAsync({
              latitude: coords.latitude,
              longitude: coords.longitude,
            });

            if (result && result.length > 0) {
              const location = result[0];
              const city = location.city || location.subregion || location.region;
              const district = location.district || location.subLocality;

              let locationText = t('location');
              if (city && district && city !== district) {
                locationText = `${district}, ${city}`;
              } else if (city) {
                locationText = city;
              }

              setLocationText(locationText);
            }
          } catch (error) {
            console.warn('Reverse geocoding error:', error);
          }
        }
      }
      setLocationLoaded(true);
    };

    getLocationText();
  }, [selectedMediaData.location]);

  // Page load animations - sadece bir kez çalışır
  const [animationsStarted, setAnimationsStarted] = useState(false);
  
  useEffect(() => {
    if (animationsStarted) return; // Prevent multiple calls
    
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Reanimated scale animation - no oscillation
    scaleAnim.value = withTiming(1, { duration: 600 });
    opacityAnim.value = withTiming(1, { duration: 600 });
    
    setAnimationsStarted(true);
  }, []);

  // Media list preparation - useMemo ile hesapla
  const mediaList = useMemo(() => {
    const media = [];
    
    // Add images only
    if (selectedMediaData.images && selectedMediaData.images.length > 0) {
      media.push(...selectedMediaData.images.map(imageUri => ({
        uri: imageUri,
        type: 'image',
        timestamp: new Date().toISOString() // Fallback timestamp
      })));
    }
    
    return media;
  }, [selectedMediaData.images]);

  // Fullscreen viewer functions
  const openFullscreen = (imageIndex) => {
    setSelectedImageIndex(imageIndex);
    setFullscreenVisible(true);
    
    // Fullscreen entrance animation - no oscillation
    fullscreenScale.value = withTiming(1, { duration: 300 });
    fullscreenOpacity.value = withTiming(1, { duration: 300 });
  };

  const closeFullscreen = () => {
    fullscreenScale.value = withTiming(0, { duration: 200 });
    fullscreenOpacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(setFullscreenVisible)(false);
    });
  };

  // Fullscreen gesture handlers
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const { translationY } = event;
      if (translationY > 0) {
        fullscreenTranslateY.value = translationY;
        fullscreenOpacity.value = interpolate(
          translationY,
          [0, 300],
          [1, 0],
          Extrapolate.CLAMP
        );
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      if (translationY > 100 || velocityY > 1000) {
        closeFullscreen();
      } else {
        fullscreenTranslateY.value = withTiming(0, { duration: 200 });
        fullscreenOpacity.value = withTiming(1, { duration: 200 });
      }
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      closeFullscreen();
    });

  const renderMediaGrid = (mediaData) => {
    // selectedMediaData'dan resimleri al
    const images = mediaData.images || [];
    
    // Sadece resimler
    const previews = images.map((uri) => ({ type: "image", content: uri }));

    if (!previews || previews.length === 0) return null;

    const left = previews[0] ? [previews[0]] : [];
    const right = previews.slice(1);
    const rightCount = right.length;

    let topRow = [];
    let bottomRow = [];
    if (rightCount === 1) topRow = [right[0]];
    else if (rightCount === 2) topRow = right;
    else if (rightCount === 3) {
      topRow = [right[0]];
      bottomRow = right.slice(1, 3);
    } else if (rightCount >= 4) {
      topRow = right.slice(0, 2);
      bottomRow = right.slice(2, 4);
    }

    const renderMediaItem = (item, key, index) => {
      if (!item) return null;
      if (item.type === "image") {
        // Find the global index of this image in mediaList
        const globalIndex = mediaList.findIndex(media => media.uri === item.content);
        
        return (
          <TouchableOpacity 
            key={key} 
            style={styles.mediaItem}
            onPress={() => globalIndex >= 0 && openFullscreen(globalIndex)}
            activeOpacity={0.9}
          >
            <Image source={{ uri: item.content }} style={styles.mediaImage} resizeMode="cover" />
            <View style={styles.mediaOverlay}>
              <MaterialIcons name="zoom-in" size={24} color="rgba(255,255,255,0.9)" />
            </View>
          </TouchableOpacity>
        );
      }
      // Video desteği kaldırıldı
      // Harita render kaldırıldı - APK crash sorunu nedeniyle
      return null;
    };

    return (
      <View style={styles.mediaGrid}>
        {/* Sol taraf - ana resim */}
        {left.length > 0 && (
          <View style={styles.leftGrid}>
            {renderMediaItem(left[0], 'left', 0)}
          </View>
        )}
        
        {/* Sağ taraf - diğer medyalar */}
        {rightCount > 0 && (
          <View style={styles.rightGrid}>
            {topRow.length > 0 && (
              <View style={styles.topRow}>
                {topRow.map((item, index) => (
                  <View key={`top-${index}`} style={{ flex: 1, marginRight: index === 0 ? 2 : 0 }}>
                    {renderMediaItem(item, `top-${index}`, index + 1)}
                  </View>
                ))}
              </View>
            )}
            {bottomRow.length > 0 && (
              <View style={styles.bottomRow}>
                {bottomRow.map((item, index) => (
                  <View key={`bottom-${index}`} style={{ flex: 1, marginRight: index === 0 ? 2 : 0 }}>
                    {renderMediaItem(item, `bottom-${index}`, index + topRow.length + 1)}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (!selectedMediaData) {
    return (
      <SafeAreaView style={[
        styles.container,
        { backgroundColor: theme.name === 'dark' ? '#000000' : '#FFFFFF' }
      ]}>
        <View style={styles.errorContainer}>
          <Text style={[
            styles.errorText,
            { color: theme.name === 'dark' ? '#8E8E93' : '#999' }
          ]}>Veri bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Animated styles
  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleAnim.value }],
      opacity: opacityAnim.value,
    };
  });

  const fullscreenAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: fullscreenScale.value },
        { translateX: fullscreenTranslateX.value },
        { translateY: fullscreenTranslateY.value }
      ],
      opacity: fullscreenOpacity.value,
    };
  });

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: theme.name === 'dark' ? '#000000' : '#FFFFFF' }
    ]}>
      <Reanimated.View style={[styles.contentContainer, animatedContainerStyle]}>
        <Animated.View style={[
          styles.fadeContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          {/* Header */}
          <View style={[
            styles.header,
            {
              backgroundColor: theme.name === 'dark' ? '#000000' : '#FFFFFF',
              borderBottomColor: theme.name === 'dark' ? '#2C2C2E' : '#E9ECEF',
            }
          ]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={[
            styles.backButton,
            {
              backgroundColor: theme.name === 'dark' 
                ? 'rgba(255,255,255,0.1)' 
                : 'rgba(0,0,0,0.05)',
              borderColor: 'transparent',
            }
          ]}
        >
          <MaterialIcons 
            name="arrow-back-ios" 
            size={20} 
            color={theme.name === 'dark' ? '#FFFFFF' : '#333'} 
          />
        </TouchableOpacity>
        <View style={styles.titleSection}>
          <Text style={[
            styles.date,
            { color: theme.name === 'dark' ? '#FFFFFF' : '#333' }
          ]}>{selectedMediaData.date}</Text>
          <View style={styles.tagsContainer}>
            {selectedMediaData.mood && (
              <View style={[
                styles.mood, 
                { 
                  backgroundColor: theme.name === 'dark' 
                    ? (selectedMediaData.mood.color || '#2C2C2E') + 'CC' // Add transparency for dark mode
                    : selectedMediaData.mood.color || '#fff',
                  borderColor: theme.name === 'dark' 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : '#E9ECEF',
                  borderWidth: 1
                }
              ]}>
                <MaterialIcons 
                  name={getValidIconName(selectedMediaData.mood.icon)} 
                  size={16} 
                  color={theme.name === 'dark' ? '#000000' : '#333'} 
                />
                <Text style={[
                  styles.moodText,
                  { color: theme.name === 'dark' ? '#000000' : '#333' }
                ]}>{selectedMediaData.mood.label}</Text>
              </View>
            )}
            {locationText && (
              <View style={[
                styles.locationTag,
                {
                  backgroundColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)',
                  borderColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.3)' : 'rgba(0, 122, 255, 0.2)',
                }
              ]}>
                <View style={[
                  styles.locationIconContainer,
                  {
                    backgroundColor: theme.name === 'dark' ? '#007AFF' : '#007AFF'
                  }
                ]}>
                  <Ionicons 
                    name="location" 
                    size={12} 
                    color="#FFFFFF" 
                  />
                </View>
                <Text style={[
                  styles.locationTagText,
                  { color: theme.name === 'dark' ? '#007AFF' : '#007AFF' }
                ]}>{locationText}</Text>
              </View>
            )}
            
            {/* Milestone Etiketi - Editable */}
            {relevantMilestone && (
              <TouchableOpacity 
                style={[
                  styles.milestoneTag,
                  {
                    backgroundColor: theme.name === 'dark' 
                      ? 'rgba(28,28,30,0.95)' 
                      : 'rgba(255,255,255,0.95)',
                    borderColor: theme.name === 'dark' 
                      ? 'rgba(255,255,255,0.15)' 
                      : 'rgba(0,0,0,0.1)',
                    maxWidth: '95%', // Ekran genişliğinin %95'ini aşmasın ama tamamını göster
                  }
                ]}
                onPress={handleMilestonePress}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.milestoneDot,
                  {
                    backgroundColor: getMilestoneColor(relevantMilestone.milestone, theme.name)
                  }
                ]} />
                <Text 
                  style={[
                    styles.milestoneTagText,
                    { 
                      color: theme.name === 'dark' 
                        ? '#FFFFFF' 
                        : getMilestoneColor(relevantMilestone.milestone, theme.name)
                    }
                  ]}
                >
                  {relevantMilestone.milestone.title}
                </Text>
                <View style={[
                  styles.confidenceDot,
                  {
                    backgroundColor: relevantMilestone.isManual 
                      ? (theme.name === 'dark' ? '#007AFF' : '#007AFF') // Manuel seçim için mavi
                      : relevantMilestone.confidence >= 0.7 
                      ? (theme.name === 'dark' ? '#34C759' : '#2ECC71')
                      : relevantMilestone.confidence >= 0.5 
                      ? (theme.name === 'dark' ? '#FF9500' : '#E67E22')
                      : (theme.name === 'dark' ? '#FF3B30' : '#E74C3C'),
                    borderColor: theme.name === 'dark' 
                      ? 'rgba(255,255,255,0.2)' 
                      : 'rgba(255,255,255,0.8)'
                  }
                ]} />
                <MaterialIcons 
                  name="edit" 
                  size={12} 
                  color={theme.name === 'dark' ? '#8E8E93' : '#666'} 
                  style={[
                    styles.editIcon,
                    {
                      backgroundColor: theme.name === 'dark' 
                        ? 'rgba(255,255,255,0.1)' 
                        : 'rgba(0,0,0,0.05)'
                    }
                  ]}
                />
              </TouchableOpacity>
            )}
            
            {/* Milestone Ekle Butonu - Eğer hiç milestone yoksa */}
            {selectedMediaData.task && selectedMediaData.task.milestones && selectedMediaData.task.milestones.length > 0 && !relevantMilestone && (
              <TouchableOpacity 
                style={[
                  styles.addMilestoneButton,
                  {
                    backgroundColor: theme.name === 'dark' 
                      ? 'rgba(28,28,30,0.7)' 
                      : 'rgba(255,255,255,0.7)',
                    borderColor: theme.name === 'dark' 
                      ? 'rgba(255,255,255,0.2)' 
                      : 'rgba(0,0,0,0.15)',
                  }
                ]}
                onPress={handleMilestonePress}
                activeOpacity={0.7}
              >
                <MaterialIcons 
                  name="add" 
                  size={16} 
                  color={theme.name === 'dark' ? '#8E8E93' : '#666'} 
                />
                <Text style={[
                  styles.addMilestoneText,
                  { color: theme.name === 'dark' ? '#8E8E93' : '#666' }
                ]}>
                  Milestone
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.placeholder} />
      </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Media Section - Fixed */}
            <View style={styles.mediaSection}>
              {(selectedMediaData.images && selectedMediaData.images.length > 0) ? (
                renderMediaGrid(selectedMediaData)
              ) : (
                <View style={[
                  styles.noMediaContainer,
                  {
                    backgroundColor: theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    borderColor: theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  }
                ]}>
                  <MaterialIcons 
                    name="photo-library" 
                    size={48} 
                    color={theme.name === 'dark' ? '#8E8E93' : '#999'} 
                  />
                  <Text style={[
                    styles.noMediaText,
                    { color: theme.name === 'dark' ? '#8E8E93' : '#999' }
                  ]}>Bu gün için medya bulunmuyor</Text>
                </View>
              )}
            </View>

            {/* Daily Notes Section - Scrollable */}
            <View style={[
              styles.notesSection,
              {
                backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#F8F9FA',
                borderColor: theme.name === 'dark' ? '#2C2C2E' : '#E9ECEF',
              }
            ]}>
              <Text style={[
                styles.sectionTitle,
                { color: theme.name === 'dark' ? '#FFFFFF' : '#333' }
              ]}>Günlükler</Text>
              
              <ScrollView 
                style={styles.notesScrollView}
                contentContainerStyle={styles.notesScrollContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                {selectedMediaData.textEntries && selectedMediaData.textEntries.length > 0 ? (
                  selectedMediaData.textEntries.map((entry, index) => (
                    <View key={index} style={[
                      styles.noteItem,
                      {
                        backgroundColor: theme.name === 'dark' ? '#000000' : '#FFFFFF',
                        borderColor: theme.name === 'dark' ? '#2C2C2E' : '#E9ECEF',
                      }
                    ]}>
                      <View style={styles.noteHeader}>
                        <Text style={[
                          styles.noteTime,
                          { color: theme.name === 'dark' ? '#8E8E93' : '#666' }
                        ]}>
                          {new Date(entry.createdAt).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                        <TouchableOpacity 
                          style={[
                            styles.editButton,
                            {
                              backgroundColor: theme.name === 'dark' 
                                ? 'rgba(255,255,255,0.1)' 
                                : 'rgba(0,0,0,0.05)',
                              borderColor: 'transparent',
                            }
                          ]}
                          onPress={() => {
                            // Journal modal'ını edit modunda aç
                            setEditingEntry(entry);
                            setJournalModalVisible(true);
                          }}
                        >
                          <MaterialIcons 
                            name="edit" 
                            size={16} 
                            color={theme.name === 'dark' ? '#FFFFFF' : '#666'} 
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={[
                        styles.noteContent,
                        { color: theme.name === 'dark' ? '#FFFFFF' : '#333' }
                      ]}>{entry.text}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={[
                      styles.emptyText,
                      { color: theme.name === 'dark' ? '#8E8E93' : '#999' }
                    ]}>Bu gün için not bulunmuyor</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Animated.View>
      </Reanimated.View>

      {/* Fullscreen Media Viewer */}
      <Modal
        visible={fullscreenVisible}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={closeFullscreen}
      >
        <GestureDetector gesture={Gesture.Simultaneous(panGesture, tapGesture)}>
          <Reanimated.View style={[styles.fullscreenContainer, fullscreenAnimatedStyle]}>
            <StatusBar hidden={true} />
            
            {/* Close button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={closeFullscreen}
            >
              <MaterialIcons name="close" size={30} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Image counter */}
            {mediaList.length > 1 && (
              <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>
                  {selectedImageIndex + 1} / {mediaList.length}
                </Text>
              </View>
            )}

            {/* Main media - Image only (video support removed) */}
            <ScrollView
              style={styles.fullscreenScrollView}
              contentContainerStyle={styles.fullscreenScrollContent}
              maximumZoomScale={3}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image
                source={{ uri: mediaList[selectedImageIndex]?.uri }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            </ScrollView>

            {/* Navigation arrows for multiple media */}
            {mediaList.length > 1 && (
              <>
                {selectedImageIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.navArrow, styles.leftArrow]}
                    onPress={() => {
                      setSelectedImageIndex(prev => prev - 1);
                    }}
                  >
                    <MaterialIcons name="chevron-left" size={30} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
                {selectedImageIndex < mediaList.length - 1 && (
                  <TouchableOpacity
                    style={[styles.navArrow, styles.rightArrow]}
                    onPress={() => {
                      setSelectedImageIndex(prev => prev + 1);
                    }}
                  >
                    <MaterialIcons name="chevron-right" size={30} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </Reanimated.View>
        </GestureDetector>
      </Modal>

      {/* Journal Modal */}
      {journalModalVisible && (
        <Journal 
          visible={journalModalVisible}
          milestone={{
            id: selectedMediaData.milestoneId,
            taskId: selectedMediaData.taskId
          }}
          existingEntry={editingEntry}
          onClose={() => {
            setJournalModalVisible(false);
            setEditingEntry(null);
          }}
          onSave={() => {
            // Modal kapandıktan sonra sayfayı yenile
            setJournalModalVisible(false);
            setEditingEntry(null);
          }}
          fromMainScreen={false}
          // Project-based journal support
          currentTask={activeTasks.find(t => t.id === selectedMediaData.taskId)}
          isProjectBased={true}
        />
      )}

      {/* Milestone Selection Modal */}
      {milestoneModalVisible && selectedMediaData.task && (
        <Modal
          visible={milestoneModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={[
            styles.milestoneModalContainer,
            { backgroundColor: theme.name === 'dark' ? '#000000' : '#FFFFFF' }
          ]}>
            {/* Header */}
            <View style={[
              styles.milestoneModalHeader,
              {
                borderBottomColor: theme.name === 'dark' ? '#2C2C2E' : '#E9ECEF',
              }
            ]}>
              <TouchableOpacity 
                onPress={() => setMilestoneModalVisible(false)}
                style={styles.milestoneModalBackButton}
              >
                <MaterialIcons 
                  name="arrow-back" 
                  size={24} 
                  color={theme.name === 'dark' ? '#FFFFFF' : '#333'} 
                />
              </TouchableOpacity>
              <Text style={[
                styles.milestoneModalTitle,
                { color: theme.name === 'dark' ? '#FFFFFF' : '#333' }
              ]}>
                Milestone Seç
              </Text>
              <View style={styles.milestoneModalPlaceholder} />
            </View>

            {/* Milestone List */}
            <ScrollView style={styles.milestoneModalContent}>
              {/* Temizle seçeneği */}
              <TouchableOpacity 
                style={[
                  styles.milestoneOption,
                  styles.clearMilestoneOption,
                  {
                    borderColor: theme.name === 'dark' ? '#2C2C2E' : '#E9ECEF',
                  }
                ]}
                onPress={handleMilestoneClear}
              >
                <MaterialIcons 
                  name="clear" 
                  size={20} 
                  color={theme.name === 'dark' ? '#FF3B30' : '#E74C3C'} 
                />
                <Text style={[
                  styles.milestoneOptionText,
                  { color: theme.name === 'dark' ? '#FF3B30' : '#E74C3C' }
                ]}>
                  Milestone'ı Temizle
                </Text>
              </TouchableOpacity>

              {/* Milestone seçenekleri */}
              {selectedMediaData.task.milestones && selectedMediaData.task.milestones.map((milestone, index) => (
                <TouchableOpacity 
                  key={milestone.id || index}
                  style={[
                    styles.milestoneOption,
                    {
                      borderColor: theme.name === 'dark' ? '#2C2C2E' : '#E9ECEF',
                      backgroundColor: selectedMilestone?.id === milestone.id 
                        ? (theme.name === 'dark' ? '#007AFF20' : '#007AFF10')
                        : 'transparent'
                    }
                  ]}
                  onPress={() => handleMilestoneSelect(milestone)}
                >
                  <View style={[
                    styles.milestoneOptionDot,
                    {
                      backgroundColor: getMilestoneColor(milestone, theme.name)
                    }
                  ]} />
                  <Text style={[
                    styles.milestoneOptionText,
                    { 
                      color: theme.name === 'dark' ? '#FFFFFF' : '#333',
                      fontWeight: selectedMilestone?.id === milestone.id ? '600' : '400'
                    }
                  ]}>
                    {milestone.title}
                  </Text>
                  {selectedMilestone?.id === milestone.id && (
                    <MaterialIcons 
                      name="check" 
                      size={20} 
                      color={theme.name === 'dark' ? '#007AFF' : '#007AFF'} 
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const getValidIconName = (name) => {
  const fallback = { sick: "sick", "self-improvement": "self-improvement" };
  return fallback[name] ? fallback[name] : name;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  contentContainer: {
    flex: 1,
  },

  fadeContainer: {
    flex: 1,
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  errorText: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start", // center'dan flex-start'a değiştirildi
    paddingHorizontal: 20,
    paddingTop: 20, // Üst boşluk eklendi
    paddingBottom: 12,
    borderBottomWidth: 1,
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0,
    marginTop: 4, // Geri düğmesini daha yukarı taşı
  },

  titleSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  date: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 4,
  },

  tagsContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },

  mood: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },

  moodText: {
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    marginLeft: 4,
  },

  locationTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },

  locationTagText: {
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    marginLeft: 4,
  },

  placeholder: {
    width: 40,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },

  mediaSection: {
    height: height * 0.22, // Daha da küçültüldü (0.27 -> 0.22)
    marginBottom: 20,
  },

  mediaGrid: {
    flexDirection: "row",
    height: "100%",
    gap: 4,
  },

  leftGrid: {
    flex: 1,
  },

  rightGrid: {
    flex: 1,
    flexDirection: "column",
  },

  topRow: {
    flex: 1,
    flexDirection: "row",
    marginBottom: 2,
  },

  bottomRow: {
    flex: 1,
    flexDirection: "row",
  },

  mediaItem: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },

  mediaImage: {
    width: "100%",
    height: "100%",
  },

  mediaOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 1,
  },

  mapWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f8f8f8",
  },

  mapInner: {
    width: "100%",
    height: "100%",
  },

  // Fullscreen Media Viewer Styles
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },

  imageCounter: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 1000,
  },

  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },

  fullscreenScrollView: {
    flex: 1,
    width: width,
  },

  fullscreenScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  fullscreenImage: {
    width: width,
    height: height * 0.8,
  },

  navArrow: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },

  leftArrow: {
    left: 20,
  },

  rightArrow: {
    right: 20,
  },

  notesSection: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12, // 16 -> 12 (daha kompakt)
  },

  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 12,
    textAlign: "left", // Sola hizalandı
  },

  notesScrollView: {
    flex: 1,
  },

  notesScrollContent: {
    paddingBottom: 20,
  },

  noteItem: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },

  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  noteTime: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },

  editButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },

  noteContent: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    lineHeight: 20,
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },

  emptyText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },

  // Milestone Tag Styles
  milestoneTag: {
    flexDirection: "row",
    alignItems: "center", // Vertical olarak ortala
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignSelf: 'flex-start', // İçeriğe göre genişlik
  },
  milestoneDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 1,
    flexShrink: 0, // Dot küçülmesin
  },
  milestoneTagText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.2,
    color: '#333',
    flex: 1, // Kalan alanı kapla, wrap yapabilsin
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  editIcon: {
    marginLeft: 8,
    padding: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  addMilestoneButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.15)',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addMilestoneText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    marginLeft: 4,
  },

  // Milestone Modal Styles
  milestoneModalContainer: {
    flex: 1,
  },
  milestoneModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  milestoneModalBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  milestoneModalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  milestoneModalPlaceholder: {
    width: 40,
  },
  milestoneModalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  milestoneOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  clearMilestoneOption: {
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  milestoneOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  milestoneOptionText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    flex: 1,
  },

  // No Media Styles
  noMediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  noMediaText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default JournalDetailScreen;
