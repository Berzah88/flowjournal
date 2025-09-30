// screens/Journal.js
import React, { useEffect, useRef, useState, useContext, useCallback } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TextInput,
  Keyboard,
  Text,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Image,
  BackHandler,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
// import MapView, { Marker } from "expo-maps"; // Geçici olarak devre dışı
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { useTaskActions } from "../hooks/useTaskContext";
import { 
  CORE_MOODS,
  EXTENDED_MOODS,
  analyzeSentiment, 
  analyzeSentimentBySentences,
  getSmartMoodSuggestion, 
  getSentimentColor,
  getSentimentEmoji,
  getMoodColor,
  getMoodIcon,
  getMoodObject,
  isCoreMood,
  isExtendedMood,
  learnFromUser
} from '../utils/AIMoodPredictor';

// Use CORE_MOODS for manual selection (5 basic moods)
const BASIC_MOODS = CORE_MOODS;

const { width, height } = Dimensions.get("window");

const TOP_GAP = 20;
const SWIPE_AREA = 40;
const CLOSE_THRESHOLD = 110;
const PREVIEW_HEIGHT = 100; // Reduced from 120 to 100
const UI_DISPLAY_LIMIT = 5; // UI'da gösterilecek maksimum resim sayısı

export default function Journal({
  visible = false,
  onClose = () => {},
  milestone = null,
  existingEntry = null,
  onSave = () => {},
  fromMainScreen = false,
  fromActiveProject = false,
}) {

  const { addJournalEntry, updateJournalEntry } = useTaskActions();

  // Dinamik TOP_GAP - Farklı yerlerden açılırken farklı yükseklikler
  const dynamicTopGap = fromActiveProject ? 0 : (fromMainScreen ? 40 : TOP_GAP);
  const modalHeight = height - dynamicTopGap;

  // Dinamik styles
  const dynamicStyles = StyleSheet.create({
    modalContainer: {
      position: "absolute",
      left: 0,
      width,
      top: dynamicTopGap,
      height: modalHeight,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      zIndex: 201,
      elevation: 25,
      overflow: "hidden",
    },
  });

  const translateY = useSharedValue(modalHeight);
  const translateX = useSharedValue(width); // Sağdan başla
  const scale = useSharedValue(0.96);
  const opacity = useSharedValue(0);
  const dragY = useSharedValue(0);
  const isPanningRef = useRef(false);
  const inputRef = useRef(null);
  
  // Mood picker animation values
  const moodPickerOpacity = useSharedValue(0);
  const moodPickerScale = useSharedValue(0.8);
  const moodPickerTranslateY = useSharedValue(20);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [previews, setPreviews] = useState([]);
  const [editingEntryId, setEditingEntryId] = useState(null);

  // mood state
  const [selectedMood, setSelectedMood] = useState(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [autoMoodApplied, setAutoMoodApplied] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // sentiment analysis state
  const [sentiment, setSentiment] = useState({ score: 0, label: 'neutral' });
  const [moodSuggestions, setMoodSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userHistory, setUserHistory] = useState([]); // User mood history for pattern learning
  
  // Dynamic layout management
  const [hasMedia, setHasMedia] = useState(false);
  const [hasMoodSuggestions, setHasMoodSuggestions] = useState(false);

  const todayText = new Date().toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short", // "long" yerine "short" - ay kısaltması
  });

  // Konum bilgisini al (previews'dan)
  const locationData = previews.find(item => item.type === "map");
  const [locationText, setLocationText] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  
  // Reverse geocoding ile şehir/ilçe bilgisi al
  const getLocationText = useCallback(async () => {
    const locationSource = locationData || currentLocation;
    if (!locationSource) return null;
    const coords = locationSource.content?.coords || locationSource.coords || locationSource;
    if (coords) {
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        
        if (reverseGeocode && reverseGeocode.length > 0) {
          const location = reverseGeocode[0];
          // Şehir ve ilçe bilgisini al
          const city = location.city || location.subregion || location.region;
          const district = location.district || location.subLocality;
          
          if (city && district && city !== district) {
            return `${district}, ${city}`;
          } else if (city) {
            return city;
          } else {
            // Fallback: koordinat
            return `${coords.latitude.toFixed(1)}, ${coords.longitude.toFixed(1)}`;
          }
        }
      } catch (error) {
        console.warn('Reverse geocoding failed:', error);
        // Fallback: koordinat
        return `${coords.latitude.toFixed(1)}, ${coords.longitude.toFixed(1)}`;
      }
    }
    return null;
  }, [locationData]);
  
  // Location text'i güncelle
  useEffect(() => {
    if (locationData || currentLocation) {
      getLocationText().then(setLocationText);
    } else {
      setLocationText(null);
    }
  }, [locationData, currentLocation, getLocationText]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardOpen(true);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
      setIsKeyboardOpen(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Advanced mood prediction trigger system - CONTINUOUS ANALYSIS
  const shouldTriggerMoodAnalysis = (text) => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    
    // Always trigger analysis when:
    // 1. User has typed at least 2 words (lowered threshold)
    // 2. User has typed at least 5 characters (lowered threshold)
    // 3. User has completed a sentence (ends with . ! ?)
    // 4. User has typed at least 15 characters (lowered threshold)
    const hasMinimumWords = wordCount >= 2;
    const hasMinimumChars = text.length >= 5;
    const hasCompleteSentence = /[.!?]$/.test(text.trim());
    const hasSubstantialContent = text.length >= 15;
    
    return hasMinimumWords && (hasMinimumChars || hasCompleteSentence || hasSubstantialContent);
  };

  // Continuous text analysis with sentence-based processing
  const analyzeTextContinuously = useCallback(async (text) => {
    if (!text || text.trim().length < 2) {
      setMoodSuggestions([]);
      return;
    }

    // Split text into sentences for better analysis
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const lastSentence = sentences[sentences.length - 1] || '';
    const allText = text.trim();
    
    try {
      // Use sentence-based analysis for better context understanding
      const analysis = await analyzeSentimentBySentences(allText, userHistory);
      
      setSentiment(analysis);
      
      // Get mood suggestions with enhanced context
      const moodSugs = await getSmartMoodSuggestion(analysis, selectedMood?.key, userHistory, allText);
      console.log('Mood suggestions:', moodSugs);
      setMoodSuggestions(moodSugs);
    } catch (error) {
      console.error('Mood analysis error:', error);
      setMoodSuggestions([]);
    }
    
  }, [userHistory, selectedMood]);

  // Sentiment analysis when text changes - SMART TRIGGER SYSTEM
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const shouldAnalyze = shouldTriggerMoodAnalysis(textValue);
      
      if (shouldAnalyze) {
        // Use the new continuous analysis function
        await analyzeTextContinuously(textValue);
        
        // Show suggestions with relaxed conditions - check after async call
        setTimeout(() => {
          const shouldShowSuggestions = (
            moodSuggestions.length > 0 &&
            !autoMoodApplied // Don't show if user already applied a mood
          );
          
          setShowSuggestions(shouldShowSuggestions);
          setHasMoodSuggestions(shouldShowSuggestions);
        }, 100); // Small delay to ensure state is updated
      } else {
        // Reset if conditions not met
        setSentiment({ score: 0, label: 'neutral' });
        setMoodSuggestions([]);
        setShowSuggestions(false);
        setAutoMoodApplied(false);
        setHasMoodSuggestions(false);
      }
    }, 500); // Reduced debounce for faster response

    return () => clearTimeout(timeoutId);
  }, [textValue, analyzeTextContinuously, autoMoodApplied]);

  // Populate when editing existing entry
  useEffect(() => {
    if (existingEntry) {
      console.log('Journal existingEntry:', existingEntry);
      setTextValue(existingEntry.text || "");
      const existingPreviews = [
        ...(existingEntry.images || []).map((uri) => ({ type: "image", content: uri })),
        ...(existingEntry.location ? [{ type: "map", content: existingEntry.location }] : []),
      ];
      setPreviews(existingPreviews);
      setHasMedia(existingPreviews.length > 0);
      // If previous code saved mood info (mood/moodIcon/moodColor), restore it
      if (existingEntry.mood) {
        // Önce MOODS'da ara
        let m = MOODS.find((mm) => mm.key === existingEntry.mood);
        if (!m) {
          // EXTENDED_MOODS'da ara
          const { EXTENDED_MOODS } = require('../utils/AIMoodPredictor');
          m = EXTENDED_MOODS.find((mm) => mm.key === existingEntry.mood);
        }
        if (m) {
          setSelectedMood(m);
        } else {
          // Hiçbirinde bulunamazsa custom mood objesi oluştur
          setSelectedMood({
            key: existingEntry.mood || null,
            label: existingEntry.mood || 'Unknown',
            icon: existingEntry.moodIcon || 'sentiment-neutral',
            color: existingEntry.moodColor || '#F5F5F5',
          });
        }
      } else {
        setSelectedMood(null);
      }
      setEditingEntryId(existingEntry.id);
    } else {
      setTextValue("");
      setPreviews([]);
      setEditingEntryId(null);
      setSelectedMood(null);
      setHasMedia(false);
      setHasMoodSuggestions(false);
    }
  }, [existingEntry]);

  useEffect(() => {
    if (visible) {
      // Basit açılış animasyonu
      translateY.value = withTiming(0, { duration: 320 });
      scale.value = withTiming(1, { duration: 320 });
      opacity.value = withTiming(1, { duration: 320 });
      const t = setTimeout(() => inputRef.current?.focus?.(), 340);
      
      // State'leri reset et
      setAutoMoodApplied(false);
      
      // Android geri tuşu için handler
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleClose();
        return true; // Event'i yakala, uygulamadan çıkmasın
      });
      
      return () => {
        clearTimeout(t);
        if (backHandler && backHandler.remove) {
          backHandler.remove();
        }
        // Shared values'ları da reset et
        translateY.value = modalHeight;
        scale.value = 0.96;
        opacity.value = 0;
        dragY.value = 0;
        moodPickerOpacity.value = 0;
        moodPickerScale.value = 0.8;
        moodPickerTranslateY.value = 20;
      };
    } else {
      // Journal kapanırken shared value'ları reset et
      Keyboard.dismiss();
      translateY.value = modalHeight;
      scale.value = 0.96;
      opacity.value = 0;
      dragY.value = 0;
    }
  }, [visible, translateY, scale, opacity, dragY, handleClose]);

  // Mood picker animation control
  useEffect(() => {
    if (showMoodPicker) {
      moodPickerOpacity.value = withTiming(1, { duration: 200 });
      moodPickerScale.value = withTiming(1, { duration: 250 });
      moodPickerTranslateY.value = withTiming(0, { duration: 250 });
    } else {
      moodPickerOpacity.value = withTiming(0, { duration: 150 });
      moodPickerScale.value = withTiming(0.8, { duration: 150 });
      moodPickerTranslateY.value = withTiming(20, { duration: 150 });
    }
  }, [showMoodPicker]);

  const backdropStyle = useAnimatedStyle(() => {
    const o = interpolate(translateY.value, [0, modalHeight], [0.45, 0]);
    return { opacity: o };
  });

  const modalStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value + dragY.value }, 
        { scale: scale.value }
      ],
      opacity: opacity.value,
    };
  });

  const moodPickerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: moodPickerOpacity.value,
      transform: [
        { scale: moodPickerScale.value },
        { translateY: moodPickerTranslateY.value }
      ],
    };
  });

  const handleClose = useCallback(() => {
    // Önce onClose'u çağır
    if (onClose) {
      onClose();
    }
    
    // State'leri temizle
    Keyboard.dismiss();
    setTextValue("");
    setPreviews([]);
    setEditingEntryId(null);
    setSelectedMood(null);
    setShowMoodPicker(false);
    setHasMedia(false);
    setHasMoodSuggestions(false);
    
    // Animasyonu başlat
    translateY.value = withTiming(height, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 });
  }, [onClose]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        dragY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 80) { // Daha düşük threshold
        dragY.value = withTiming(height, { duration: 200 }, () => {
          runOnJS(handleClose)();
        });
      } else {
        dragY.value = withTiming(0, { duration: 150 });
      }
    })
    .minDistance(10); // Minimum mesafe

  const backdropTap = Gesture.Tap().onEnd(() => {
    handleClose();
  });

  const addPreviewImage = (uri) => {
    setPreviews((p) => {
      const newPreviews = [...p, { type: "image", content: uri }];
      // FIFO: Sadece son 3 resmi tut, eski resimleri tamamen sil
      if (newPreviews.length > UI_DISPLAY_LIMIT) {
        return newPreviews.slice(-UI_DISPLAY_LIMIT);
      }
      return newPreviews;
    });
    setHasMedia(true);
    return true;
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.7,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      let uri = null;
      if (result?.assets && result.assets.length > 0) uri = result.assets[0].uri;
      else if (result?.uri) uri = result.uri;
      if (uri) addPreviewImage(uri);
    } catch (error) {
      // User'a error gösterme - sessizce logla
    }
  };

  const pickLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      // Location'ı hem currentLocation state'ine hem de previews'e ekle
      setCurrentLocation(loc);
      
      // Location'ı previews array'ine ekle (journal entry için)
      setPreviews(prev => {
        // Eğer zaten location varsa, eski olanı kaldır
        const filteredPreviews = prev.filter(item => item.type !== "map");
        return [...filteredPreviews, { type: "map", content: loc }];
      });
    } catch (error) {
      // User'a error gösterme - sessizce logla
    }
  };

  const handleButtonPress = async (label) => {
    if (label === "Location") {
      await pickLocation();
      return;
    }
    if (label === "Photo") {
      await pickImage();
      return;
    }
    if (label === "Mood") {
      // toggle mood picker popup
      setShowMoodPicker((s) => !s);
      return;
    }
    if (label === "Save") {
      if (!milestone || !milestone.id) {
        handleClose();
        return;
      }

      const taskId = milestone.taskId || milestone.parentTaskId || milestone.task?.id;
      const msId = milestone.id;

      // Mood seçimi - kullanıcının seçtiği mood'u veya otomatik öneriyi kullan
      let finalMood = selectedMood;
      
      // Eğer kullanıcı mood seçmemişse otomatik öneriyi kullan
      if (!selectedMood && moodSuggestions.length > 0) {
        // Önerilen mood'u EXTENDED_MOODS'dan bul (AI önerisi)
        const suggestedMood = EXTENDED_MOODS.find(m => m.key === moodSuggestions[0].mood);
        if (suggestedMood) {
          finalMood = suggestedMood;
        }
      }

      const payload = {
        text: textValue?.trim() || "",
        images: previews.filter((x) => x.type === "image").map((x) => x.content),
        location: previews.find((x) => x.type === "map")?.content?.coords || null,
        // include mood data (compatible keys)
        mood: finalMood?.key || null,
        moodIcon: finalMood ? getValidIconName(finalMood.icon) : null,
        moodColor: finalMood?.color || null,
        // include sentiment data for pattern learning
        sentiment: sentiment,
      };

      // Save işlemini async olarak yap ve tamamlandıktan sonra modal'ı kapat
      try {
        console.log('Save - editingEntryId:', editingEntryId, 'payload:', payload);
        if (editingEntryId) {
          if (updateJournalEntry) {
            console.log('Updating journal entry:', editingEntryId);
            updateJournalEntry(taskId, msId, editingEntryId, payload);
          }
        } else {
          if (addJournalEntry) {
            console.log('Adding new journal entry');
            addJournalEntry(taskId, msId, payload);
          }
        }
        
        // Update user history for pattern learning
        const newEntry = {
          mood: finalMood?.key || null,
          sentiment: sentiment,
          text: textValue?.trim() || "",
          timestamp: new Date().toISOString()
        };
        setUserHistory(prev => [...prev.slice(-49), newEntry]); // Keep last 50 entries
        
        // onSave callback'ini çağır
        onSave();
        
        // Kısa bir delay ile modal'ı kapat ki state güncellenmesi tamamlansın
        setTimeout(() => {
          handleClose();
        }, 100);
      } catch (error) {
        console.warn('Journal save error:', error);
        handleClose();
      }
    }
  };

  const renderPreviewItem = (item, key) => {
    if (!item) return null;
    if (item.type === "image") {
      return (
        <TouchableOpacity 
          key={key} 
          onPress={() => {
            Keyboard.dismiss();
            setSelectedImage({ type: "image", content: item.content });
            setShowImageModal(true);
          }}
          activeOpacity={0.8}
        >
          <Image source={{ uri: item.content }} style={styles.previewImage} resizeMode="cover" />
        </TouchableOpacity>
      );
    }
    // Harita artık medya alanında gösterilmiyor, konum bilgisi mood sticker'ının yanında gösterilecek
    return null;
  };

  const renderPreviewGrid = () => {
    // Sadece resimleri filtrele, konum bilgisini hariç tut
    const imagePreviews = previews.filter(item => item.type === "image");
    if (!imagePreviews || imagePreviews.length === 0) return null;

    // Sadece klavye kapalı olduğunda grid göster
    if (isKeyboardOpen) return null;

    // Sadece son 5 resmi göster (UI_DISPLAY_LIMIT)
    const displayPreviews = imagePreviews.slice(-UI_DISPLAY_LIMIT);
    
    // Asimetrik layout: Sol büyük + Sağ 4 küçük (üst 2, alt 2)
    const leftImage = displayPreviews[0];
    const rightImages = displayPreviews.slice(1);

    return (
      <View style={styles.previewWrapper}>
        <View style={styles.asymmetricGrid}>
          {/* Sol taraf - 1 büyük resim */}
          <View style={styles.leftColumn}>
            {leftImage && renderPreviewItem(leftImage, "left")}
          </View>
          
          {/* Sağ taraf - 4 küçük resim */}
          <View style={styles.rightColumn}>
            <View style={styles.rightTop}>
              <View style={styles.rightTopLeft}>
                {rightImages[0] && renderPreviewItem(rightImages[0], "right-top-left")}
              </View>
              <View style={styles.rightTopRight}>
                {rightImages[1] && renderPreviewItem(rightImages[1], "right-top-right")}
              </View>
            </View>
            <View style={styles.rightBottom}>
              <View style={styles.rightBottomLeft}>
                {rightImages[2] && renderPreviewItem(rightImages[2], "right-bottom-left")}
              </View>
              <View style={styles.rightBottomRight}>
                {rightImages[3] && renderPreviewItem(rightImages[3], "right-bottom-right")}
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const buttons = [
    { label: "Location", icon: "map-outline" },
    { label: "Photo", icon: "image-outline" },
    { label: "Mood", icon: "happy-outline" },
    { label: "Save", icon: "save-outline" },
  ];

  if (!visible) return null;

  return (
    <>
      <Animated.View style={styles.backdropContainer}>
        <GestureDetector gesture={backdropTap}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </GestureDetector>
      </Animated.View>

      <Animated.View style={[dynamicStyles.modalContainer, modalStyle]}>
        <LinearGradient
          colors={['#f8f9fa', '#ffffff', '#f1f3f4']}
          style={styles.gradientBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <GestureDetector gesture={panGesture}>
            <View style={styles.topSpacer} />
          </GestureDetector>
          
          {/* Pan gesture için genişletilmiş alan */}
          <GestureDetector gesture={panGesture}>
            <View style={styles.panGestureArea} />
          </GestureDetector>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.dateRow}>
            <View style={styles.dateContainer}>
              <View style={styles.dateAndMoodContainer}>
                <Text style={styles.dateText}>{todayText}</Text>
                {/* Mood tarihin yanında */}
                {selectedMood && (
                  <View style={[styles.moodTag, { backgroundColor: selectedMood.color || "transparent" }]}>
                    <MaterialIcons
                      name={getValidIconName(selectedMood.icon)}
                      size={18}
                      color="#333"
                    />
                    <Text style={styles.moodLabel}>{selectedMood.label}</Text>
                  </View>
                )}
              </View>
              
              {/* Cool Sentiment Bar - Header'ın sağında */}
              <View style={styles.coolSentimentContainer}>
                <View style={styles.coolSentimentBar}>
                  <View style={[styles.coolSentimentFill, { 
                    width: `${Math.abs(sentiment.score)}%`,
                    backgroundColor: getSentimentColor(sentiment)
                  }]} />
                </View>
                <View style={styles.coolSentimentIcon}>
                  <MaterialIcons 
                    name={sentiment.label === 'positive' ? 'sentiment-satisfied' : 
                          sentiment.label === 'negative' ? 'sentiment-dissatisfied' : 'sentiment-neutral'} 
                    size={12} 
                    color={getSentimentColor(sentiment)} 
                  />
                </View>
              </View>
            </View>
            
            {/* Location tarihin altında */}
            {locationText && (
              <View style={styles.locationRow}>
                <View style={styles.locationSticker}>
                  <Ionicons name="location" size={12} color="#007AFF" />
                  <Text style={styles.locationText}>{locationText}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Mood Suggestions + Media Counter Row */}
          <View style={styles.moodMediaRow}>
            {/* Mood Suggestions - Left Side */}
            <View style={styles.moodSuggestionsContainer}>
              {textValue.trim().split(/\s+/).length >= 3 && moodSuggestions.length > 0 && (
                moodSuggestions.map((suggestion, index) => {
                  // AI önerisi - EXTENDED_MOODS'dan bul
                  const suggestedMood = EXTENDED_MOODS.find(m => m.key === suggestion.mood);
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.moodTag,
                        { backgroundColor: suggestedMood?.color || '#4A90E2' }
                      ]}
                      activeOpacity={0.7}
                      onPress={async () => {
                        if (suggestedMood) {
                          setSelectedMood(suggestedMood);
                          setShowSuggestions(false);
                          setAutoMoodApplied(true);
                          
                          // Kullanıcıdan öğren - AI önerisi kabul edildi
                          if (textValue.trim().length > 0) {
                            try {
                              await learnFromUser(suggestedMood.key, textValue, 'ai_suggestion_accepted');
                              console.log('Learned from AI suggestion accepted:', suggestedMood.key, textValue);
                            } catch (error) {
                              console.warn('Failed to learn from user:', error);
                            }
                          }
                        }
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons 
                        name={getMoodIcon(suggestedMood?.key || 'sentiment-satisfied')} 
                        size={18} 
                        color="#000" 
                      />
                      <Text style={styles.moodTagText}>{suggestedMood?.label}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
            
            {/* Media Counter - Right Side */}
            {previews.filter(p => p.type === "image").length > 0 && (
              <View style={styles.mediaCounterContainer}>
                <View style={styles.mediaCounter}>
                  <Ionicons name="image" size={16} color="#007AFF" />
                  <Text style={styles.mediaCounterText}>{previews.filter(p => p.type === "image").length}</Text>
                </View>
              </View>
            )}
          </View>

          {renderPreviewGrid()}

          <View style={styles.textInputContainer}>
            <TextInput
              ref={inputRef}
              value={textValue}
              onChangeText={setTextValue}
              style={[
                styles.input,
                {
                   // Dynamic height using same logic as buttons + 50% margin bottom
                   height: Math.max(150, (modalHeight - (keyboardHeight || 0)) * 0.5), // 50% of available space (50% margin bottom)
                  minHeight: 150,
                }
              ]}
              placeholder={(milestone?.title ? milestone.title + ": " : "") + "Write about it..."}
              multiline
              underlineColorAndroid="transparent"
              placeholderTextColor="#999"
              textAlignVertical="top"
              editable={true}
               scrollEnabled={true}
               showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            />
          </View>

          {/* Mood picker popup with backdrop */}
          {showMoodPicker && (
            <TouchableOpacity 
              style={styles.moodPickerBackdrop}
              activeOpacity={1}
              onPress={() => setShowMoodPicker(false)}
            >
              <Animated.View 
                style={[styles.moodPicker, { bottom: keyboardHeight ? keyboardHeight + 90 : 106 }, moodPickerAnimatedStyle]}
                onStartShouldSetResponder={() => true}
              >
                {BASIC_MOODS.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[
                      styles.moodOption,
                      selectedMood?.key === m.key ? { borderColor: "#999", borderWidth: 1 } : null,
                    ]}
                    activeOpacity={0.8}
                    onPress={async () => {
                      // Manuel seçim - CORE_MOODS'dan seçim
                      setSelectedMood(m);
                      setAutoMoodApplied(true); // Manuel seçim yapıldı
                      setShowMoodPicker(false);
                      
                      // Kullanıcıdan öğren - manuel seçim
                      if (textValue.trim().length > 0) {
                        try {
                          await learnFromUser(m.key, textValue, 'manual_selection');
                          console.log('Learned from manual selection:', m.key, textValue);
                        } catch (error) {
                          console.warn('Failed to learn from user:', error);
                        }
                      }
                    }}
                  >
                    <View style={[styles.moodIconWrap, { backgroundColor: m.color }]}>
                      <MaterialIcons name={getValidIconName(m.icon)} size={14} color="#333" />
                    </View>
                    <Text style={styles.moodOptionLabel}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </Animated.View>
            </TouchableOpacity>
          )}

          <View style={[styles.buttonRow, { 
            bottom: fromActiveProject ? (keyboardHeight || 0) + 20 : (keyboardHeight || 0), 
            marginBottom: 15 
          }]}>
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={styles.button}
                activeOpacity={0.85}
                onPress={() => handleButtonPress(btn.label)}
              >
                <Ionicons name={btn.icon} size={18} color="#545454" />
                <Text style={styles.buttonText}>{btn.label === "Save" ? "Save" : btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </KeyboardAvoidingView>
        </LinearGradient>
      </Animated.View>

      {/* Image Modal */}
      {showImageModal && selectedImage && selectedImage.type === "image" && (
        <View style={styles.imageModal}>
          <TouchableOpacity 
            style={styles.imageModalBackdrop}
            onPress={() => setShowImageModal(false)}
            activeOpacity={1}
          >
            <View style={styles.imageModalContent}>
              <TouchableOpacity 
                style={styles.imageModalClose}
                onPress={() => setShowImageModal(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              
              <Image 
                source={{ uri: selectedImage.content }} 
                style={styles.imageModalImage} 
                resizeMode="contain" 
              />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdropContainer: { position: "absolute", left: 0, top: 0, width, height, zIndex: 200 },
  backdrop: { flex: 1 },
  gradientBackground: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#F5F5F5', // Eski hafif gri background
  },
  topSpacer: { height: 8 },
  panGestureArea: { 
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
  },
  dateRow: {
    flexDirection: "column",
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingTop: 8,
    minHeight: 60,
    backgroundColor: "transparent",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  dateAndMoodContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  moodRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: { 
    paddingHorizontal: 0, 
    fontSize: 18, // 20'den 18'e düşürdüm - 2 punto küçük
    color: "#1d1d1f", 
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: -0.2,
    marginRight: 12,
  },
  moodTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 10,
  },
  moodLabel: {
    marginLeft: 6,
    fontSize: 12,
    color: "#333",
    fontFamily: "Poppins_400Regular",
  },
  locationSticker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 122, 255, 0.3)",
    gap: 4,
  },
  locationText: {
    fontSize: 10,
    color: "#007AFF",
    fontFamily: "Poppins_500Medium",
  },
  previewWrapper: {
    paddingHorizontal: 16,
    marginTop: -4, // 0'dan -4'e düşürdüm - daha yukarıya aldım
    height: PREVIEW_HEIGHT,
  },
  asymmetricGrid: {
    flexDirection: "row",
    height: PREVIEW_HEIGHT,
    alignItems: "stretch",
  },
  leftColumn: {
    flex: 1,
    marginRight: 8,
    height: PREVIEW_HEIGHT,
  },
  rightColumn: {
    flex: 1,
    flexDirection: "column",
    height: PREVIEW_HEIGHT,
  },
  rightTop: {
    flex: 1,
    flexDirection: "row",
    marginBottom: 4,
    height: (PREVIEW_HEIGHT - 8) / 2,
  },
  rightTopLeft: {
    flex: 1,
    marginRight: 4,
    height: "100%",
  },
  rightTopRight: {
    flex: 1,
    height: "100%",
  },
  rightBottom: {
    flex: 1,
    flexDirection: "row",
    height: (PREVIEW_HEIGHT - 8) / 2,
  },
  rightBottomLeft: {
    flex: 1,
    marginRight: 4,
    height: "100%",
  },
  rightBottomRight: {
    flex: 1,
    height: "100%",
  },
  previewImage: { 
    width: "100%", 
    height: "100%", 
    borderRadius: 12, 
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  mapWrapper: { 
    flex: 1, 
    borderRadius: 16, 
    overflow: "hidden", 
    backgroundColor: "#f5f5f5", 
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  mapInner: { width: "100%", height: "100%", borderWidth:1, },
  textInputContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 0, // Height ile kontrol ediyoruz, margin gerek yok
  },
  input: { 
    padding: 20, 
    paddingTop: 30,
    fontSize: 18, 
    color: "#1d1d1f", 
    textAlignVertical: "top", 
    fontFamily: "Poppins_400Regular", 
    letterSpacing: -0.3,
    lineHeight: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    // Ensure cursor starts at top
    includeFontPadding: false,
    textAlignVertical: 'top',
  },
  buttonRow: { 
    position: "absolute", 
    left: 0, 
    right: 0, 
    flexDirection: "row", 
    justifyContent: "space-around", 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: "rgba(248, 249, 250, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)"
  },
  button: { 
    width: 72, 
    height: 52, 
    backgroundColor: "#ffffff", 
    borderRadius: 16, 
    justifyContent: "center", 
    alignItems: "center", 
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderWidth: 0.5,
    borderColor: "#e0e0e0",
  },
  buttonText: { 
    fontSize: 11, 
    color: "#1d1d1f", 
    textAlign: "center", 
    marginTop: 4, 
    fontFamily: "Poppins_500Medium",
    letterSpacing: -0.1,
  },

  /* mood picker popup */
  moodPickerBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  moodPicker: {
    width: width - 80,
    position: "absolute",
    left: 40,
    right: 0,
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: "#e0e0e0",
    zIndex: 500,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.09,
    shadowRadius: 6,
  },
  moodOption: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  moodIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  moodOptionLabel: { fontSize: 12, color: "#333", fontFamily: "Poppins_400Regular" },

  // Image/Map Modal Styles
  imageModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  imageModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalContent: {
    width: width - 40,
    height: height - 100,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  imageModalClose: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 1001,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 8,
  },
  imageModalImage: {
    width: "100%",
    height: "100%",
  },

  // Cool Sentiment Analysis Styles
  coolSentimentContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(135, 206, 250, 0.15)", // Soft mavi gövde
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(135, 206, 250, 0.4)", // Soft mavi çerçeve
    minWidth: 70,
    justifyContent: "center",
  },
  coolSentimentBar: {
    width: 60,
    height: 8,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: 4,
    position: "relative",
    overflow: "visible",
  },
  coolSentimentFill: {
    height: "100%",
    borderRadius: 4,
    opacity: 0.9,
  },
  coolSentimentIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  moodMediaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
  },
  moodSuggestionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    flex: 1,
    gap: 6,
  },
  mediaCounterContainer: {
    alignItems: "flex-end",
  },
  mediaCounter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 122, 255, 0.3)",
    gap: 4,
  },
  mediaCounterText: {
    fontSize: 12,
    color: "#007AFF",
    fontFamily: "Poppins_500Medium",
    fontWeight: "600",
  },
  moodTag: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 6,
    marginBottom: 4,
    minHeight: 36,
    minWidth: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  moodTagText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#000",
    marginLeft: 4,
    letterSpacing: -0.1,
  },
  mapFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  mapFallbackText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  // Media icons for keyboard open state
  mediaIconsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: "rgba(0, 122, 255, 0.05)",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    minHeight: 40,
    alignItems: "center",
  },
  mediaIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});