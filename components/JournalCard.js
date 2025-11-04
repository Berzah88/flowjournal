import React, { useCallback, memo, useMemo, useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Image, Dimensions, Animated, Vibration, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
// import MapView, { Marker } from "expo-maps"; // Geçici olarak devre dışı
import PropTypes from "prop-types";
import * as Location from "expo-location";
import logger from '../utils/logger';
import { reverseGeocodeSafe, formatCoords } from '../utils/locationHelpers';
import * as Haptics from 'expo-haptics';
import { getValidIconName, MOODS as MOODS_FROM_PREDICTOR } from "../utils/AIMoodPredictor";
import { getMilestoneColor } from "../utils/milestoneColors";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useTaskActions } from "../hooks/useTaskContext";

const { width } = Dimensions.get("window");
const PREVIEW_HEIGHT = 120; // Medya alanı için 120px yükseklik

// Use MOODS from MoodPredictor to ensure consistency
const MOODS = MOODS_FROM_PREDICTOR;


// Location tag component
const LocationTag = memo(({ locationData, getLocationText }) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [locationText, setLocationText] = useState(t('location'));

  React.useEffect(() => {
    if (locationData) {
      getLocationText(locationData).then(text => {
        setLocationText(text);
      });
    }
  }, [locationData, getLocationText]);

  return (
    <View style={[
      styles.locationTag,
      {
        backgroundColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.1)' : '#F0F8FF',
        borderColor: theme.name === 'dark' ? '#007AFF' : '#007AFF',
      }
    ]}>
      <Ionicons 
        name="location" 
        size={12} 
        color={theme.name === 'dark' ? '#007AFF' : '#007AFF'} 
      />
      <Text style={[
        styles.locationTagText,
        { color: theme.name === 'dark' ? '#007AFF' : '#007AFF' }
      ]}>{locationText}</Text>
    </View>
  );
});

const JournalCard = memo(function JournalCard({ 
  dayGroup, 
  onPress, 
  navigation, 
  taskId, 
  milestoneId, 
  isCompleted,
  availableMilestones = [], // Mevcut milestone'lar
  refreshKey = 0 // Refresh trigger
}) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { deleteProjectJournalEntry } = useTaskActions();
  // Use a ref-based cache for reverse-geocoding results to avoid
  // causing parent re-renders on cache writes. LocationTag manages
  // its own display state when it calls getLocationText.
  const locationCacheRef = useRef({});

  // Clear cached location texts when language changes so labels re-resolve
  useEffect(() => {
    locationCacheRef.current = {};
  }, [language]);
  const [showDeleteOverlay, setShowDeleteOverlay] = useState(false);
  
  // Apple-style touch animation (scale only - cleaner for nested backgrounds)
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const overlayScale = useRef(new Animated.Value(0.9)).current;

  // Haptic feedback helper with fallback (same as MileStone)
  const triggerHaptic = useCallback(async (style = Haptics.ImpactFeedbackStyle.Medium) => {
    try {
      await Haptics.impactAsync(style);
      if (__DEV__) {
        console.log('✅ JournalCard Haptic:', style === Haptics.ImpactFeedbackStyle.Medium ? 'MEDIUM' : 'LIGHT');
      }
    } catch (error) {
      // Fallback to native Vibration
      try {
        const duration = style === Haptics.ImpactFeedbackStyle.Medium ? 50 : 30;
        Vibration.vibrate(duration);
        if (__DEV__) {
          console.log('✅ JournalCard Vibration:', duration + 'ms');
        }
      } catch (vibError) {
        if (__DEV__) {
          console.log('Haptic feedback not available');
        }
      }
    }
  }, []);

  // Show delete overlay with animation
  const handleLongPress = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    setShowDeleteOverlay(true);
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(overlayScale, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [overlayOpacity, overlayScale, triggerHaptic]);

  // Hide delete overlay with animation
  const handleCancelDelete = useCallback(() => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(overlayScale, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowDeleteOverlay(false);
    });
  }, [overlayOpacity, overlayScale]);

  // Confirm delete - delete all entries for this day
  const handleConfirmDelete = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    
    // Delete all journal entries for this day
    dayGroup.allEntries.forEach(entry => {
      if (entry.id && taskId) {
        deleteProjectJournalEntry(taskId, entry.id);
      }
    });
    
    // Hide overlay
    handleCancelDelete();
  }, [dayGroup.allEntries, taskId, deleteProjectJournalEntry, handleCancelDelete, triggerHaptic]);

  // Apple-style touch animations (scale only - optimized)
  const handlePressIn = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      duration: 100, // Fast and responsive
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400, // Snappier spring
      friction: 25,
    }).start();
  }, [scaleAnim]);

  // Location koordinatlarını şehir/ilçe formatına çevir
  const getLocationText = useCallback(async (locationData) => {
    if (!locationData) return t('location');

    const coords = locationData.coords || locationData;
    if (!coords || !coords.latitude || !coords.longitude) return t('location');

    const key = `${coords.latitude}_${coords.longitude}`;

    // Eğer daha önce çevrilmişse cache'den dön
    if (locationCacheRef.current[key]) {
      return locationCacheRef.current[key];
    }

    try {
      const result = await reverseGeocodeSafe(coords);
      if (result && result.length > 0) {
        const location = result[0];
        // Şehir ve ilçe bilgisini al
        const city = location.city || location.subregion || location.region;
        const district = location.district || location.subLocality;

        let locationText = t('location');
        if (city && district && city !== district) {
          locationText = `${district}, ${city}`;
        } else if (city) {
          locationText = city;
        } else {
          // Fallback: koordinat
          locationText = formatCoords(coords);
        }

        // Cache'e kaydet (ref, no setState)
        locationCacheRef.current[key] = locationText;
        return locationText;
      }
    } catch (error) {
      logger.debug('Reverse geocoding error (JournalCard):', error && (error.message || error.code || error));
      // Fallback: koordinat
      const locationText = formatCoords(coords);
      locationCacheRef.current[key] = locationText;
      return locationText;
    }

    return t('location');
  }, [t]);

  // O günün tüm resimlerini birleştir (harita hariç - APK crash sorunu)
  const allMedia = useMemo(() => {
    const media = [];
    dayGroup.allEntries.forEach(entry => {
      if (entry.images) {
        media.push(...entry.images.map(uri => ({ type: "image", content: uri })));
      }
      // Video desteği kaldırıldı
      // Harita medyası kaldırıldı - APK crash sorunu nedeniyle
    });
    
    return media;
  }, [dayGroup.allEntries, refreshKey]); // refreshKey dependency eklendi

  // O günün mood bilgisini al (mood bilgisi olan en son girişten)
  const dayMoodObj = useMemo(() => {
    const moodEntries = dayGroup.allEntries.filter(entry => 
      entry.mood || entry.moodIcon || entry.moodColor
    );
    
    const moodEntry = moodEntries.length > 0 
      ? moodEntries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
      : null;
    
    if (moodEntry) {
      if (moodEntry.mood) {
        const found = MOODS.find((m) => m.key === moodEntry.mood);
        if (found) return found;
        return { key: moodEntry.mood, label: moodEntry.mood, icon: moodEntry.moodIcon || "happy", color: moodEntry.moodColor || "#eee" };
      } else if (moodEntry.moodIcon || moodEntry.moodColor) {
        return { key: moodEntry.mood || null, label: moodEntry.mood || "", icon: moodEntry.moodIcon || "happy", color: moodEntry.moodColor || "#eee" };
      }
    }
    return null;
  }, [dayGroup.allEntries]);

  // Metin içeren girişleri al ve sırala
  const textEntries = useMemo(() => {
    return dayGroup.allEntries.filter(entry => {
      return entry.text && entry.text.trim().length > 0;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [dayGroup.allEntries]);

  const firstTextEntry = textEntries.length > 0 ? textEntries[0] : null;
  const otherTextEntries = textEntries.slice(1);

  // Eğer hiç metin içeren giriş yoksa ve medya da yoksa hiçbir şey render etme
  if (textEntries.length === 0 && allMedia.length === 0 && !dayMoodObj) {
    return null;
  }

  // Modal açma fonksiyonu
  const openJournalDetail = useCallback((mediaData) => {
    if (navigation && navigation.navigate) {
      navigation.navigate('JournalDetail', { 
        selectedMediaData: {
          ...mediaData,
          taskId,
          milestoneId,
          isCompleted
        }
      });
    } else {
      console.warn('Navigation not available for JournalDetail');
    }
  }, [navigation, taskId, milestoneId, isCompleted]);

  // Metin özetleme fonksiyonu
  const truncateText = useCallback((text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }, []);

  // AI milestone analizi - günlük kayıtlarını analiz ederek hangi milestone'a ait olduğunu belirler
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
      
      // Her milestone türü için anahtar kelime kontrolü
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
        const entryDate = new Date(dayGroup.allEntries[0]?.createdAt);
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
  }, [dayGroup.allEntries]);

  // Bu günlük kayıtları için en uygun milestone'ı bul - önce kaydedilmiş olanı kontrol et
  const relevantMilestone = useMemo(() => {
    if (!availableMilestones || availableMilestones.length === 0) return null;
    
    // Önce journal entry'lerde kaydedilmiş milestone var mı kontrol et
    const firstEntryWithMilestone = dayGroup.allEntries.find(entry => entry.milestoneId);
    if (firstEntryWithMilestone && firstEntryWithMilestone.milestoneId) {
      const savedMilestone = availableMilestones.find(m => m.id === firstEntryWithMilestone.milestoneId);
      if (savedMilestone) {
        return { milestone: savedMilestone, confidence: 1.0, isSaved: true };
      }
    }
    
    // Kaydedilmiş milestone yoksa AI analizi yap
    // Tüm günlük metinlerini birleştir
    const allTexts = dayGroup.allEntries
      .filter(entry => entry.text && entry.text.trim().length > 0)
      .map(entry => entry.text.trim())
      .join(' ');
    
    if (allTexts.length === 0) return null;
    
    return analyzeMilestoneRelevance(allTexts, availableMilestones);
  }, [dayGroup.allEntries, availableMilestones, analyzeMilestoneRelevance]);

  // Medya preview render fonksiyonu (harita hariç - APK crash sorunu)
  const renderPreviewGridForEntry = useCallback((entry) => {
    const previews = [
      ...(entry.images?.map((uri) => ({ type: "image", content: uri })) || []),
      // Video desteği kaldırıldı
      // Harita preview kaldırıldı - APK crash sorunu nedeniyle
    ];

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

    const renderPreviewItem = (item, key) => {
      if (!item) return null;
      if (item.type === "image") {
        return <Image key={key} source={{ uri: item.content }} style={styles.previewImage} resizeMode="cover" />;
      }
      // Video desteği kaldırıldı
      // Harita preview kaldırıldı - konum bilgisi etiket olarak gösterilecek
      return null;
    };

    return (
      <View style={styles.previewWrapper}>
        <View style={styles.leftGrid}>{left[0] && renderPreviewItem(left[0], "left-0")}</View>
        <View style={styles.rightGrid}>
          <View style={{ flexDirection: "row", flex: topRow.length === 1 ? 0.5 : 0.5, marginBottom: 1 }}>
            {topRow.map((item, idx) => (
              <View key={idx} style={{ flex: topRow.length === 1 ? 1 : 0.5, paddingRight: 1 }}>
                {renderPreviewItem(item, `right-top-${idx}`)}
              </View>
            ))}
          </View>
          {bottomRow.length > 0 && (
            <View style={{ flexDirection: "row", flex: 0.5 }}>
              {bottomRow.map((item, idx) => (
                <View key={idx} style={{ flex: 0.5, paddingRight: 1 }}>
                  {renderPreviewItem(item, `right-bottom-${idx}`)}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }, []);

  return (
    <Animated.View style={[
      {
        // Apple-style touch animation (scale only - no opacity for nested backgrounds)
        transform: [{ scale: scaleAnim }],
      }
    ]}>
      <Pressable 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => {
          if (showDeleteOverlay) return; // Overlay açıkken normal press'i engelle
          triggerHaptic(); // Haptic feedback
          openJournalDetail({
            images: allMedia.map(m => m.content), // Sadece resimler
            location: dayGroup.allEntries.find(entry => entry.location)?.location,
            date: dayGroup.date,
            mood: dayMoodObj,
            textEntries: textEntries
          });
        }}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={[
          styles.dayCard,
          {
            // Consistent solid backgrounds
            backgroundColor: theme.name === 'dark' 
              ? '#2A2E30' 
              : '#FFFFFF',
            borderColor: theme.name === 'dark' 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(0, 0, 0, 0.05)',
            // Reduced shadows for a softer look
            shadowColor: theme.name === 'dark' ? '#000000' : '#000',
            shadowOpacity: theme.name === 'dark' ? 0.12 : 0.07, // reduced
            shadowRadius: theme.name === 'dark' ? 4 : 2, // reduced
            shadowOffset: { width: 0, height: 2 }, // softer
            elevation: theme.name === 'dark' ? 2 : 1, // reduced
          }
        ]}
      >
      {/* Milestone Etiketi - Medya olsun ya da olmasın her zaman göster */}
      {relevantMilestone && (
        <View style={[
          styles.milestoneTagContainer,
          {
            backgroundColor: theme.name === 'dark' 
              ? 'rgba(28,28,30,0.95)' 
              : 'rgba(255,255,255,0.95)',
            borderColor: theme.name === 'dark' 
              ? 'rgba(255,255,255,0.15)' 
              : 'rgba(0,0,0,0.1)',
            marginBottom: 8,
            maxWidth: '95%', // Kart genişliğini aşmasın ama tamamını göster
          }
        ]}>
          {/* Milestone renkli dot ikonu */}
          <View style={[
            styles.milestoneDot,
            {
              backgroundColor: getMilestoneColor(relevantMilestone.milestone, theme.name)
            }
          ]} />
          <Text 
            style={[
              styles.milestoneTag,
              { 
                color: theme.name === 'dark' 
                  ? '#FFFFFF' 
                  : getMilestoneColor(relevantMilestone.milestone, theme.name)
              }
            ]}
          >
            {relevantMilestone.milestone.title}
          </Text>
        </View>
      )}

      {/* Tarih başlığı ve mood */}
      <View style={[
        styles.dayHeader,
        {
          borderBottomColor: theme.name === 'dark' ? '#3A3A3E' : '#F0F0F0',
        }
      ]}>
        <View style={styles.dayHeaderContent}>
          <Text style={[
            styles.dayHeaderText,
            { color: theme.name === 'dark' ? '#8E8E93' : '#666' }
          ]}>{dayGroup.date}</Text>
          {dayMoodObj && (
            <View style={[
              styles.dayMoodTag, 
              { 
                backgroundColor: theme.name === 'dark' 
                  ? (dayMoodObj.color ? dayMoodObj.color + 'CC' : '#4A4A4E') // Karanlık temada daha parlak
                  : (dayMoodObj.color || '#fff'),
                marginLeft: 4,
                borderColor: theme.name === 'dark' 
                  ? 'rgba(255, 255, 255, 0.3)' 
                  : 'rgba(0,0,0,0.1)',
                borderWidth: 1,
              }
            ]}>
              <MaterialIcons 
                name={getValidIconName(dayMoodObj.icon)} 
                size={16} 
                color={theme.name === 'dark' ? '#FFFFFF' : '#333'} 
              />
              <Text style={[
                styles.dayMoodLabel,
                { 
                  color: theme.name === 'dark' ? '#FFFFFF' : '#555',
                  fontWeight: theme.name === 'dark' ? '600' : '500' // Karanlık temada daha kalın
                }
              ]}>{dayMoodObj.label}</Text>
            </View>
          )}
        </View>
        {/* Location etiketi - tarihin altında */}
        {(() => {
          const hasLocation = dayGroup.allEntries.some(entry => entry.location);
          const locationEntry = dayGroup.allEntries.find(entry => entry.location);
          
          
          if (hasLocation && locationEntry) {
            return (
              <LocationTag 
                locationData={locationEntry.location} 
                getLocationText={getLocationText} 
              />
            );
          } else {
            return null;
          }
        })()}
      </View>
      
      {/* İlk metin girişi - medya olmayan kartlarda tarih başlığından hemen sonra */}
      {firstTextEntry && allMedia.length === 0 && (
        <View style={[
          styles.firstTextSection, 
          { 
            marginTop: 4, // 8'den 4'e düşürüldü - daha kompakt
            alignSelf: 'stretch', // Tam genişlik
            width: '100%',
          }
        ]}>
          <Text style={[
            styles.firstTextTime,
            { 
              color: theme.name === 'dark' ? '#8E8E93' : '#888',
              alignSelf: 'flex-start',
            }
          ]}>
            {new Date(firstTextEntry.createdAt).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
          <Text style={[
            styles.firstTextContent,
            {
              color: theme.name === 'dark' ? '#FFFFFF' : '#333',
              backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#F8F9FA',
              alignSelf: 'stretch', // Tam genişlik
              width: '100%',
            }
          ]}>{truncateText(firstTextEntry.text, 100)}</Text>
        </View>
      )}

      {/* Medya bölümü - o günün tüm medyaları */}
      {allMedia.length > 0 && (
        <View style={styles.dayMediaSection}>
          {/* Media Header - Sadece medya sayısı */}
          <View style={styles.mediaHeader}>
            <View style={styles.mediaHeaderContent}>
              <MaterialIcons 
                name="perm-media" 
                size={14} 
                color={theme.name === 'dark' ? '#8E8E93' : '#666'} 
              />
              <Text style={[
                styles.mediaHeaderText,
                { color: theme.name === 'dark' ? '#8E8E93' : '#666' }
              ]}>
                {allMedia.length} {allMedia.length === 1 ? 'media' : 'media'}
              </Text>
            </View>
          </View>
          
          {renderPreviewGridForEntry({ 
            images: allMedia.filter(m => m.type === "image").map(m => m.content),
            videos: allMedia.filter(m => m.type === "video").map(m => m.content)
            // location kaldırıldı - APK crash sorunu nedeniyle
          })}
        </View>
      )}
      
      {/* İlk metin girişi - medya olan kartlarda medyadan sonra */}
      {firstTextEntry && allMedia.length > 0 && (
        <View style={[
          styles.firstTextSection, 
          { 
            marginTop: 4,
            alignSelf: 'stretch', // Tam genişlik
            width: '100%',
          }
        ]}>
          <Text style={[
            styles.firstTextTime,
            { 
              color: theme.name === 'dark' ? '#8E8E93' : '#888',
              alignSelf: 'flex-start',
            }
          ]}>
            {new Date(firstTextEntry.createdAt).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
          <Text style={[
            styles.firstTextContent,
            {
              color: theme.name === 'dark' ? '#FFFFFF' : '#333',
              backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#F8F9FA',
              alignSelf: 'stretch', // Tam genişlik
              width: '100%',
            }
          ]}>{truncateText(firstTextEntry.text, 100)}</Text>
        </View>
      )}
      
      {/* Diğer metin girişleri - etiket olarak alt kısımda */}
      {otherTextEntries.length > 0 && (
        <View style={styles.additionalTextTags}>
          {otherTextEntries.map((entry, index) => (
                <View key={entry.id || entry.createdAt || index} style={[
              styles.textTag,
              {
                backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#E9ECEF',
                borderColor: theme.name === 'dark' ? '#3A3A3E' : '#DEE2E6',
              }
            ]}>
              <Text style={[
                styles.textTagTime,
                { color: theme.name === 'dark' ? '#8E8E93' : '#6C757D' }
              ]}>
                {new Date(entry.createdAt).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Delete Overlay - Cool & Stylish */}
      {showDeleteOverlay && (
        <Animated.View style={[
          styles.deleteOverlay,
          {
            opacity: overlayOpacity,
            backgroundColor: theme.name === 'dark' 
              ? 'rgba(0, 0, 0, 0.85)' 
              : 'rgba(255, 255, 255, 0.95)',
          }
        ]}>
          <Animated.View style={[
            styles.deleteContent,
            {
              transform: [{ scale: overlayScale }],
            }
          ]}>
            {/* Delete Icon */}
            <View style={[
              styles.deleteIconContainer,
              {
                backgroundColor: theme.name === 'dark' 
                  ? 'rgba(255, 59, 48, 0.2)' 
                  : 'rgba(255, 59, 48, 0.1)',
              }
            ]}>
              <Ionicons 
                name="trash" 
                size={32} 
                color="#FF3B30" 
              />
            </View>

            {/* Delete Text */}
            <Text style={[
              styles.deleteTitle,
              { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
            ]}>
              {t('deleteJournal') || 'Delete Journal?'}
            </Text>
            <Text style={[
              styles.deleteSubtitle,
              { color: theme.name === 'dark' ? '#8E8E93' : '#666' }
            ]}>
              {t('deleteJournalMessage') || 'All entries and media will be permanently deleted.'}
            </Text>

            {/* Action Buttons */}
            <View style={styles.deleteActions}>
              <TouchableOpacity 
                style={[
                  styles.deleteButton,
                  styles.cancelButton,
                  {
                    backgroundColor: theme.name === 'dark' 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : '#F0F0F0',
                    borderColor: theme.name === 'dark' 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : 'rgba(0, 0, 0, 0.1)',
                  }
                ]}
                onPress={handleCancelDelete}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.cancelButtonText,
                  { color: theme.name === 'dark' ? '#FFFFFF' : '#333' }
                ]}>
                  {t('cancel') || 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.deleteButton,
                  styles.confirmButton,
                ]}
                onPress={handleConfirmDelete}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>
                  {t('delete') || 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
      </Pressable>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance without heavy JSON.stringify
  if (prevProps.dayGroup.date !== nextProps.dayGroup.date) return false;
  if (prevProps.refreshKey !== nextProps.refreshKey) return false;
  const prevEntries = prevProps.dayGroup.allEntries;
  const nextEntries = nextProps.dayGroup.allEntries;
  if (prevEntries.length !== nextEntries.length) return false;

  for (let i = 0; i < prevEntries.length; i++) {
    const a = prevEntries[i];
    const b = nextEntries[i];
    if (!b) return false;
    if (a.id !== b.id) return false;
    if (a.text !== b.text) return false;
    if (a.createdAt !== b.createdAt) return false;
    if (a.mood !== b.mood) return false;
    if (a.moodIcon !== b.moodIcon) return false;
    if (a.moodColor !== b.moodColor) return false;
    // images: compare lengths and first item as quick heuristic
    const aImgs = a.images || [];
    const bImgs = b.images || [];
    if (aImgs.length !== bImgs.length) return false;
    if (aImgs.length > 0 && aImgs[0] !== bImgs[0]) return false;
    // location: compare presence and lat/lon if available
    const aLoc = a.location || null;
    const bLoc = b.location || null;
    if ((aLoc && !bLoc) || (!aLoc && bLoc)) return false;
    if (aLoc && bLoc) {
      const aLat = aLoc.latitude || aLoc.coords?.latitude;
      const aLon = aLoc.longitude || aLoc.coords?.longitude;
      const bLat = bLoc.latitude || bLoc.coords?.latitude;
      const bLon = bLoc.longitude || bLoc.coords?.longitude;
      if (aLat !== bLat || aLon !== bLon) return false;
    }
  }
  return true;
});

export default JournalCard;

const styles = StyleSheet.create({
  dayCard: {
    borderRadius: 24, // Daha yuvarlak köşeler
    padding: 16, // Daha fazla padding
    marginTop: 30,
    marginBottom: 0,
    marginLeft: 8,
    marginRight: 24,
    borderWidth: 1, // Daha kalın border
    minHeight: 90, // Biraz daha yüksek
    maxWidth: width * 0.75, // Daha dar kartlar
  // Modern glassmorphism properties
  // Note: `backdropFilter` is a web-only style and causes warnings on React Native.
  // Removed to avoid platform issues.
    overflow: 'hidden', // İçeriğin taşmasını önle
    // Flexbox properties for better alignment
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  dayHeader: {
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
  dayHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dayHeaderText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    textTransform: "capitalize",
    flex: 1,
    letterSpacing: 0.3,
  },
  dayMoodTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16, // Daha yuvarlak
    borderWidth: 1,
    minWidth: 60,
    justifyContent: "center",
    // Modern glassmorphism effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dayMoodLabel: {
    marginLeft: 3,
    fontSize: 9,
    fontFamily: "Poppins_500Medium",
    letterSpacing: 0.3,
    // fontWeight will be overridden by inline style
  },
  firstTextSection: {
    marginBottom: 4,
    minHeight: 40,
    maxHeight: 70, // 60'tan 70'e artırıldı - biraz daha uzun
    paddingHorizontal: 0, // Yan boşlukları kaldır
  },
  firstTextTime: {
    fontSize: 9,
    fontFamily: "Poppins_500Medium",
    marginBottom: 4, // 8'den 4'e düşürüldü - daha kompakt
    paddingHorizontal: 0, // Yan boşlukları kaldır
    letterSpacing: 0.4,
  },
  firstTextContent: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    lineHeight: 15, // 14'ten 15'e artırıldı - biraz daha uzun
    letterSpacing: 0.2,
    borderRadius: 6,
    padding: 6, // 8'den 6'ya düşürüldü - daha kompakt
    marginHorizontal: 0, // Yan boşlukları kaldır
  },
  additionalTextTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 22, // 8'den 16'ya artırıldı
    marginBottom: 0, // Alt boşluk sıfırlandı
  },
  textTag: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    marginBottom: 0, // Alt boşluk sıfırlandı
  },
  textTagTime: {
    fontSize: 8,
    fontFamily: "Poppins_500Medium",
    letterSpacing: 0.3,
  },
  // Medya preview stilleri
  dayMediaSection: {
    marginBottom: 6,
    marginHorizontal: -2,
  },
  // Media Header Styles
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  mediaHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaHeaderText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  mediaExpandButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  // Milestone Tag Styles
  milestoneTagContainer: {
    flexDirection: "row",
    alignItems: "center", // Vertical olarak ortala
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start', // İçeriğe göre genişlik
  },
  milestoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    flexShrink: 0, // Dot küçülmesin
  },
  milestoneTag: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: -0.1,
    flex: 1, // Kalan alanı kapla, wrap yapabilsin
  },
  previewWrapper: { 
    flexDirection: "row", 
    paddingHorizontal: 1, 
    marginTop: 1, 
    height: PREVIEW_HEIGHT, 
    alignItems: "stretch", 
    elevation: 2 
  },
  leftGrid: { 
    flex: 1, 
    marginRight: 1, 
    height: PREVIEW_HEIGHT 
  },
  rightGrid: { 
    flex: 1, 
    flexDirection: "column", 
    height: PREVIEW_HEIGHT 
  },
  previewImage: { 
    width: "100%", 
    height: "100%", 
    borderRadius: 6, 
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    shadowOpacity: 0.1,
  },
  mapWrapper: { 
    flex: 1, 
    borderRadius: 6, 
    overflow: "hidden", 
    backgroundColor: "#f8f8f8", 
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    shadowOpacity: 0.1,
  },
  mapInner: { 
    width: "100%", 
    height: "100%" 
  },
  mapFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  mapFallbackText: {
    fontSize: 10,
    color: "#666",
    marginTop: 2,
    textAlign: "center",
  },
  // Location tag stilleri
  locationTag: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  locationTagText: {
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  // Delete Overlay Styles
  deleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  deleteContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  deleteIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  deleteSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  deleteActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
  },
  deleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    marginRight: 12,
  },
  confirmButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    letterSpacing: -0.2,
  },
  confirmButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});

JournalCard.propTypes = {
  dayGroup: PropTypes.shape({
    date: PropTypes.string.isRequired,
    allEntries: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      text: PropTypes.string,
      createdAt: PropTypes.string,
      mood: PropTypes.string,
      moodIcon: PropTypes.string,
      moodColor: PropTypes.string,
      images: PropTypes.arrayOf(PropTypes.string),
      location: PropTypes.object,
    })).isRequired,
  }).isRequired,
  onPress: PropTypes.func,
  navigation: PropTypes.object,
  taskId: PropTypes.string,
  milestoneId: PropTypes.string,
  isCompleted: PropTypes.bool,
  availableMilestones: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    startDate: PropTypes.string,
    endDate: PropTypes.string,
  })),
  refreshKey: PropTypes.number,
};


JournalCard.defaultProps = {
  onPress: null,
  navigation: null,
  taskId: null,
  milestoneId: null,
  isCompleted: false,
  availableMilestones: [],
  refreshKey: 0,
};