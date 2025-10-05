import React, { useCallback, memo, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
// import MapView, { Marker } from "expo-maps"; // Geçici olarak devre dışı
import PropTypes from "prop-types";
import * as Location from "expo-location";
import { getValidIconName, MOODS as MOODS_FROM_PREDICTOR } from "../utils/MoodPredictor";
import { getMilestoneColor } from "../utils/milestoneColors";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

const { width } = Dimensions.get("window");
const PREVIEW_HEIGHT = 120; // Medya alanı için 120px yükseklik

// Use MOODS from MoodPredictor to ensure consistency
const MOODS = MOODS_FROM_PREDICTOR;


// Location tag component
const LocationTag = memo(({ locationData, getLocationText }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
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
  const { t } = useLanguage();
  const [locationTexts, setLocationTexts] = useState({});

  // Location koordinatlarını şehir/ilçe formatına çevir
  const getLocationText = useCallback(async (locationData) => {
    if (!locationData) return t('location');
    
    const coords = locationData.coords || locationData;
    if (!coords || !coords.latitude || !coords.longitude) return t('location');
    
    const key = `${coords.latitude}_${coords.longitude}`;
    
    // Eğer daha önce çevrilmişse cache'den dön
    if (locationTexts[key]) {
      return locationTexts[key];
    }
    
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      
      if (result && result.length > 0) {
        const location = result[0];
        // Şehir ve ilçe bilgisini al
        const city = location.city || location.subregion || location.region;
        const district = location.district || location.subLocality;
        
        let locationText = "Location";
        if (city && district && city !== district) {
          locationText = `${district}, ${city}`;
        } else if (city) {
          locationText = city;
        } else {
          // Fallback: koordinat
          locationText = `${coords.latitude.toFixed(1)}, ${coords.longitude.toFixed(1)}`;
        }
        
        // Cache'e kaydet
        setLocationTexts(prev => ({ ...prev, [key]: locationText }));
        return locationText;
      }
    } catch (error) {
      console.warn('Reverse geocoding error:', error);
      // Fallback: koordinat
      const locationText = `${coords.latitude.toFixed(1)}, ${coords.longitude.toFixed(1)}`;
      setLocationTexts(prev => ({ ...prev, [key]: locationText }));
      return locationText;
    }
    
    return "Location";
  }, [locationTexts]);

  // O günün tüm medyalarını birleştir (harita hariç - APK crash sorunu)
  const allMedia = useMemo(() => {
    const media = [];
    dayGroup.allEntries.forEach(entry => {
      if (entry.images) {
        media.push(...entry.images.map(uri => ({ type: "image", content: uri })));
      }
      // Harita medyası kaldırıldı - APK crash sorunu nedeniyle
      // if (entry.location) {
      //   media.push({ type: "map", content: entry.location });
      // }
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
    
    // Minimum güven skoru (0.3)
    return bestScore >= 0.3 ? { milestone: bestMatch, confidence: Math.min(bestScore, 1) } : null;
  }, [dayGroup.allEntries]);

  // Bu günlük kayıtları için en uygun milestone'ı bul
  const relevantMilestone = useMemo(() => {
    if (!availableMilestones || availableMilestones.length === 0) return null;
    
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
      // Harita preview kaldırıldı - APK crash sorunu nedeniyle
      // ...(entry.location ? [{ type: "map", content: entry.location }] : []),
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
    <TouchableOpacity 
      style={[
        styles.dayCard,
        {
          // Consistent solid backgrounds
          backgroundColor: theme.name === 'dark' 
            ? '#2A2A2E' 
            : '#FFFFFF',
          borderColor: theme.name === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.05)',
          // Enhanced shadows for modern look
          shadowColor: theme.name === 'dark' ? '#000000' : '#000',
          shadowOpacity: theme.name === 'dark' ? 0.3 : 0.1,
          shadowRadius: theme.name === 'dark' ? 12 : 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: theme.name === 'dark' ? 8 : 4,
        }
      ]}
      activeOpacity={0.7}
      onPress={() => {
        openJournalDetail({
          images: allMedia.filter(m => m.type === "image").map(m => m.content),
          location: dayGroup.allEntries.find(entry => entry.location)?.location,
          date: dayGroup.date,
          mood: dayMoodObj,
          textEntries: textEntries
        });
      }}
      activeOpacity={0.8}
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
          }
        ]}>
          {/* Milestone renkli dot ikonu */}
          <View style={[
            styles.milestoneDot,
            {
              backgroundColor: getMilestoneColor(relevantMilestone.milestone, theme.name)
            }
          ]} />
          <Text style={[
            styles.milestoneTag,
            { 
              color: theme.name === 'dark' 
                ? '#FFFFFF' 
                : getMilestoneColor(relevantMilestone.milestone, theme.name)
            }
          ]}>
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
                name="photo-library" 
                size={14} 
                color={theme.name === 'dark' ? '#8E8E93' : '#666'} 
              />
              <Text style={[
                styles.mediaHeaderText,
                { color: theme.name === 'dark' ? '#8E8E93' : '#666' }
              ]}>
                {allMedia.length} {allMedia.length === 1 ? 'photo' : 'photos'}
              </Text>
            </View>
          </View>
          
          {renderPreviewGridForEntry({ 
            images: allMedia.filter(m => m.type === "image").map(m => m.content)
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
            <View key={index} style={[
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
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.dayGroup.date === nextProps.dayGroup.date &&
    prevProps.refreshKey === nextProps.refreshKey && // RefreshKey kontrolü eklendi
    prevProps.dayGroup.allEntries.length === nextProps.dayGroup.allEntries.length &&
    prevProps.dayGroup.allEntries.every((entry, index) => {
      const nextEntry = nextProps.dayGroup.allEntries[index];
      return entry.id === nextEntry.id &&
             entry.text === nextEntry.text &&
             entry.createdAt === nextEntry.createdAt &&
             entry.mood === nextEntry.mood &&
             entry.moodIcon === nextEntry.moodIcon &&
             entry.moodColor === nextEntry.moodColor &&
             JSON.stringify(entry.images) === JSON.stringify(nextEntry.images) && // Medya kontrolü
             JSON.stringify(entry.location) === JSON.stringify(nextEntry.location); // Konum kontrolü
    })
  );
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
    backdropFilter: 'blur(10px)', // Web için blur efekti
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
    gap: 4,
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
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  milestoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  milestoneTag: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.3,
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