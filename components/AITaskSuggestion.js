import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const AITaskSuggestion = ({
  journalEntries = [],
  existingMilestones = [],
  onSuggestionAccept,
  onSuggestionReject,
  visible = false,
  onClose,
}) => {
  const { theme } = useTheme();

  const [suggestions, setSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Journal metinlerini analiz ederek milestone önerileri çıkar
  const analyzeJournalEntries = useCallback(async () => {
    if (!journalEntries || journalEntries.length === 0) {
      setSuggestions([]);
      return;
    }

    setIsAnalyzing(true);

    try {
      // Tüm journal metinlerini birleştir
      const allTexts = journalEntries
        .filter(entry => entry.text && entry.text.trim().length > 0)
        .map(entry => entry.text.trim())
        .join(' ');

      if (allTexts.length === 0) {
        setSuggestions([]);
        setIsAnalyzing(false);
        return;
      }

      // AI analizi simülasyonu (gerçek AI entegrasyonu için hazırlık)
      const aiSuggestions = await generateMilestoneSuggestions(allTexts, existingMilestones);
      
      setSuggestions(aiSuggestions);
    } catch (error) {
      console.error('Error analyzing journal entries:', error);
      setSuggestions([]);
    } finally {
      setIsAnalyzing(false);
    }
  }, [journalEntries, existingMilestones]);

  // Milestone önerileri oluştur (AI simülasyonu)
  const generateMilestoneSuggestions = async (text, existingMilestones) => {
    // Bu fonksiyon gerçek AI entegrasyonu için hazırlanmış
    // Şimdilik pattern matching ve keyword analysis kullanıyor
    
    const suggestions = [];
    const textLower = text.toLowerCase();
    
    // Milestone pattern'leri
    const milestonePatterns = [
      {
        keywords: ['başla', 'start', 'başlangıç', 'ilk adım', 'commence'],
        suggestion: {
          title: 'Proje Başlangıcı',
          description: 'Projenin ilk adımlarını atma',
          priority: 'high',
          confidence: 0.8,
          source: 'journal_analysis'
        }
      },
      {
        keywords: ['tamamla', 'complete', 'bitir', 'finish', 'sonuç'],
        suggestion: {
          title: 'Proje Tamamlama',
          description: 'Projenin son aşamalarını tamamlama',
          priority: 'high',
          confidence: 0.8,
          source: 'journal_analysis'
        }
      },
      {
        keywords: ['test', 'deneme', 'sınama', 'kontrol', 'check'],
        suggestion: {
          title: 'Test ve Doğrulama',
          description: 'Projenin test edilmesi ve doğrulanması',
          priority: 'medium',
          confidence: 0.7,
          source: 'journal_analysis'
        }
      },
      {
        keywords: ['tasarım', 'design', 'plan', 'planlama', 'mimari'],
        suggestion: {
          title: 'Tasarım ve Planlama',
          description: 'Projenin tasarım ve planlama aşaması',
          priority: 'medium',
          confidence: 0.7,
          source: 'journal_analysis'
        }
      },
      {
        keywords: ['geliştirme', 'development', 'kod', 'code', 'programming'],
        suggestion: {
          title: 'Geliştirme Aşaması',
          description: 'Projenin geliştirme ve kodlama aşaması',
          priority: 'medium',
          confidence: 0.7,
          source: 'journal_analysis'
        }
      },
      {
        keywords: ['dokümantasyon', 'documentation', 'belge', 'rapor'],
        suggestion: {
          title: 'Dokümantasyon',
          description: 'Proje dokümantasyonunun hazırlanması',
          priority: 'low',
          confidence: 0.6,
          source: 'journal_analysis'
        }
      },
      {
        keywords: ['deploy', 'yayınla', 'publish', 'release', 'dağıt'],
        suggestion: {
          title: 'Yayınlama ve Dağıtım',
          description: 'Projenin yayınlanması ve dağıtılması',
          priority: 'high',
          confidence: 0.8,
          source: 'journal_analysis'
        }
      },
      {
        keywords: ['optimize', 'optimizasyon', 'iyileştir', 'geliştir'],
        suggestion: {
          title: 'Optimizasyon',
          description: 'Projenin performans optimizasyonu',
          priority: 'medium',
          confidence: 0.6,
          source: 'journal_analysis'
        }
      }
    ];

    // Her pattern için kontrol et
    milestonePatterns.forEach(pattern => {
      const hasKeywords = pattern.keywords.some(keyword => 
        textLower.includes(keyword)
      );
      
      if (hasKeywords) {
        // Mevcut milestone'larla çakışma kontrolü
        const isDuplicate = existingMilestones.some(milestone => 
          milestone.title.toLowerCase().includes(pattern.suggestion.title.toLowerCase()) ||
          pattern.suggestion.title.toLowerCase().includes(milestone.title.toLowerCase())
        );
        
        if (!isDuplicate) {
          suggestions.push({
            ...pattern.suggestion,
            id: `suggestion_${Date.now()}_${Math.random()}`,
            keywords: pattern.keywords,
            matchedText: textLower.split(' ').filter(word => 
              pattern.keywords.some(keyword => word.includes(keyword))
            ).slice(0, 3).join(', ')
          });
        }
      }
    });

    // Confidence'a göre sırala
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  };

  // Component mount olduğunda analiz yap
  useEffect(() => {
    if (visible && journalEntries.length > 0) {
      analyzeJournalEntries();
    }
  }, [visible, journalEntries, analyzeJournalEntries]);

  // Fade animasyonu
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  // Öneriyi kabul et
  const handleAcceptSuggestion = useCallback((suggestion) => {
    Alert.alert(
      'Milestone Önerisi',
      `"${suggestion.title}" milestone'unu eklemek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ekle',
          onPress: () => {
            onSuggestionAccept?.(suggestion);
            // Kabul edilen öneriyi listeden çıkar
            setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
          }
        }
      ]
    );
  }, [onSuggestionAccept]);

  // Öneriyi reddet
  const handleRejectSuggestion = useCallback((suggestion) => {
    onSuggestionReject?.(suggestion);
    // Reddedilen öneriyi listeden çıkar
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  }, [onSuggestionReject]);

  if (!visible || suggestions.length === 0) {
    return null;
  }

  return (
    <Animated.View style={[
      styles.container,
      {
        backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
        borderColor: theme.name === 'dark' ? '#2C2C2E' : '#E9ECEF',
        opacity: fadeAnim,
      }
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons 
            name="lightbulb" 
            size={20} 
            color={theme.name === 'dark' ? '#FFD60A' : '#FF9500'} 
          />
          <Text style={[
            styles.headerTitle,
            { color: theme.name === 'dark' ? '#FFFFFF' : '#333' }
          ]}>
            AI Milestone Önerileri
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons 
            name="close" 
            size={20} 
            color={theme.name === 'dark' ? '#8E8E93' : '#666'} 
          />
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {isAnalyzing && (
        <View style={styles.loadingContainer}>
          <MaterialIcons 
            name="psychology" 
            size={24} 
            color={theme.name === 'dark' ? '#8E8E93' : '#666'} 
          />
          <Text style={[
            styles.loadingText,
            { color: theme.name === 'dark' ? '#8E8E93' : '#666' }
          ]}>
            Journal metinleri analiz ediliyor...
          </Text>
        </View>
      )}

      {/* Suggestions List */}
      {!isAnalyzing && suggestions.length > 0 && (
        <ScrollView style={styles.suggestionsList} showsVerticalScrollIndicator={false}>
          {suggestions.map((suggestion, index) => (
            <View key={suggestion.id} style={[
              styles.suggestionCard,
              {
                backgroundColor: theme.name === 'dark' ? '#2C2C2E' : '#F8F9FA',
                borderColor: theme.name === 'dark' ? '#3A3A3E' : '#E9ECEF',
              }
            ]}>
              {/* Suggestion Header */}
              <View style={styles.suggestionHeader}>
                <View style={styles.suggestionTitleContainer}>
                  <Text style={[
                    styles.suggestionTitle,
                    { color: theme.name === 'dark' ? '#FFFFFF' : '#333' }
                  ]}>
                    {suggestion.title}
                  </Text>
                  <View style={[
                    styles.priorityBadge,
                    {
                      backgroundColor: suggestion.priority === 'high' 
                        ? '#FF3B30' 
                        : suggestion.priority === 'medium' 
                        ? '#FF9500' 
                        : '#34C759'
                    }
                  ]}>
                    <Text style={styles.priorityText}>
                      {suggestion.priority === 'high' ? 'Yüksek' : 
                       suggestion.priority === 'medium' ? 'Orta' : 'Düşük'}
                    </Text>
                  </View>
                </View>
                <View style={styles.confidenceContainer}>
                  <MaterialIcons 
                    name="trending-up" 
                    size={14} 
                    color={theme.name === 'dark' ? '#34C759' : '#34C759'} 
                  />
                  <Text style={[
                    styles.confidenceText,
                    { color: theme.name === 'dark' ? '#34C759' : '#34C759' }
                  ]}>
                    {Math.round(suggestion.confidence * 100)}%
                  </Text>
                </View>
              </View>

              {/* Suggestion Description */}
              <Text style={[
                styles.suggestionDescription,
                { color: theme.name === 'dark' ? '#8E8E93' : '#666' }
              ]}>
                {suggestion.description}
              </Text>

              {/* Matched Keywords */}
              {suggestion.matchedText && (
                <View style={styles.keywordsContainer}>
                  <Text style={[
                    styles.keywordsLabel,
                    { color: theme.name === 'dark' ? '#8E8E93' : '#666' }
                  ]}>
                    Eşleşen kelimeler:
                  </Text>
                  <Text style={[
                    styles.keywordsText,
                    { color: theme.name === 'dark' ? '#FFD60A' : '#FF9500' }
                  ]}>
                    {suggestion.matchedText}
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[
                    styles.rejectButton,
                    {
                      backgroundColor: theme.name === 'dark' ? 'rgba(255, 59, 48, 0.1)' : '#FFF5F5',
                      borderColor: theme.name === 'dark' ? '#FF3B30' : '#FF3B30',
                    }
                  ]}
                  onPress={() => handleRejectSuggestion(suggestion)}
                >
                  <MaterialIcons 
                    name="close" 
                    size={16} 
                    color={theme.name === 'dark' ? '#FF3B30' : '#FF3B30'} 
                  />
                  <Text style={[
                    styles.rejectButtonText,
                    { color: theme.name === 'dark' ? '#FF3B30' : '#FF3B30' }
                  ]}>
                    Reddet
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.acceptButton,
                    {
                      backgroundColor: theme.name === 'dark' ? 'rgba(52, 199, 89, 0.1)' : '#F0FFF4',
                      borderColor: theme.name === 'dark' ? '#34C759' : '#34C759',
                    }
                  ]}
                  onPress={() => handleAcceptSuggestion(suggestion)}
                >
                  <MaterialIcons 
                    name="check" 
                    size={16} 
                    color={theme.name === 'dark' ? '#34C759' : '#34C759'} 
                  />
                  <Text style={[
                    styles.acceptButtonText,
                    { color: theme.name === 'dark' ? '#34C759' : '#34C759' }
                  ]}>
                    Kabul Et
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginLeft: 8,
  },
  suggestionsList: {
    maxHeight: 400,
  },
  suggestionCard: {
    margin: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  suggestionTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  suggestionTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    color: '#FFFFFF',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    marginLeft: 4,
  },
  suggestionDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 18,
    marginBottom: 8,
  },
  keywordsContainer: {
    marginBottom: 12,
  },
  keywordsLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    marginBottom: 2,
  },
  keywordsText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    marginLeft: 4,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  acceptButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    marginLeft: 4,
  },
});

export default AITaskSuggestion;
