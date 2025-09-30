// utils/SmartMoodDetector.js
// Smart AI Mood Detection System
// Features: Smart Pattern Matching, Context Awareness, User Learning, Confidence Scoring, Real-time Adaptation

import AsyncStorage from '@react-native-async-storage/async-storage';

// 5 Core moods for manual selection only
export const CORE_MOODS = [
  {
    key: "happy",
    label: "Happy",
    icon: "sentiment-satisfied",
    color: "#C8E6C9",
    category: "positive"
  },
  {
    key: "excited",
    label: "Excited",
    icon: "celebration",
    color: "#FFE0B2",
    category: "positive"
  },
  {
    key: "tired",
    label: "Tired",
    icon: "bedtime",
    color: "#F3E5F5",
    category: "negative"
  },
  {
    key: "sad",
    label: "Sad",
    icon: "sentiment-dissatisfied",
    color: "#FFCDD2",
    category: "negative"
  },
  {
    key: "angry",
    label: "Angry",
    icon: "mood-bad",
    color: "#FFEBEE",
    category: "negative"
  }
];

// Backward compatibility - same as CORE_MOODS
export const MOODS = CORE_MOODS;

// Extended moods for suggestions
export const EXTENDED_MOODS = [
  ...MOODS,
  {
    key: "frustrated",
    label: "Frustrated",
    icon: "psychology",
    color: "#FFE0B2",
    category: "negative"
  },
  {
    key: "anxious",
    label: "Anxious",
    icon: "warning",
    color: "#FFCDD2",
    category: "negative"
  },
  {
    key: "grateful",
    label: "Grateful",
    icon: "favorite",
    color: "#C8E6C9",
    category: "positive"
  },
  {
    key: "hopeful",
    label: "Hopeful",
    icon: "wb-sunny",
    color: "#E1F5FE",
    category: "positive"
  },
  {
    key: "proud",
    label: "Proud",
    icon: "emoji-events",
    color: "#FFE0B2",
    category: "positive"
  },
  {
    key: "relieved",
    label: "Relieved",
    icon: "spa",
    color: "#E8F5E8",
    category: "positive"
  },
  {
    key: "overwhelmed",
    label: "Overwhelmed",
    icon: "psychology",
    color: "#FFCDD2",
    category: "negative"
  },
  {
    key: "lonely",
    label: "Lonely",
    icon: "person-off",
    color: "#F3E5F5",
    category: "negative"
  },
  {
    key: "motivated",
    label: "Motivated",
    icon: "trending-up",
    color: "#C8E6C9",
    category: "positive"
  },
  {
    key: "confused",
    label: "Confused",
    icon: "help",
    color: "#FFF3E0",
    category: "negative"
  },
  {
    key: "disappointed",
    label: "Disappointed",
    icon: "sentiment-dissatisfied",
    color: "#FFCDD2",
    category: "negative"
  },
  {
    key: "nostalgic",
    label: "Nostalgic",
    icon: "history",
    color: "#E1F5FE",
    category: "neutral"
  },
  {
    key: "peaceful",
    label: "Peaceful",
    icon: "spa",
    color: "#E1F5FE",
    category: "positive"
  },
  {
    key: "curious",
    label: "Curious",
    icon: "explore",
    color: "#FFF8E1",
    category: "neutral"
  },
  {
    key: "bored",
    label: "Bored",
    icon: "sentiment-neutral",
    color: "#F5F5F5",
    category: "negative"
  },
  {
    key: "surprised",
    label: "Surprised",
    icon: "surprise",
    color: "#FFF3E0",
    category: "neutral"
  },
  {
    key: "content",
    label: "Content",
    icon: "sentiment-satisfied",
    color: "#E8F5E8",
    category: "positive"
  },
  {
    key: "worried",
    label: "Worried",
    icon: "psychology",
    color: "#FFEBEE",
    category: "negative"
  }
];

// Storage keys
const STORAGE_KEYS = {
  USER_PATTERNS: 'smart_mood_user_patterns',
  USER_HISTORY: 'smart_mood_user_history',
  CONTEXT_PATTERNS: 'smart_mood_context_patterns',
  CONFIDENCE_HISTORY: 'smart_mood_confidence_history'
};

// Smart Pattern Matching System
class SmartPatternMatcher {
  constructor() {
    this.patterns = this.initializePatterns();
    this.negationWords = [
      'değil', 'olmayan', 'olmuyor', 'olmaz', 'yok', 'hayır', 'hiç', 'asla', 'hiçbir',
      'not', 'no', 'never', 'none', 'nothing', 'nowhere', 'neither', 'nor'
    ];
    this.intensityModifiers = {
      high: ['çok', 'aşırı', 'müthiş', 'muhteşem', 'olağanüstü', 'son derece', 'fazlasıyla'],
      medium: ['oldukça', 'epey', 'hayli', 'bir hayli', 'oldukça'],
      low: ['biraz', 'az', 'orta', 'idare', 'tamam']
    };
  }

  initializePatterns() {
    return {
      // Physical states
      physical: {
        tired: {
          patterns: ['yorgun', 'bitkin', 'tükenmiş', 'halsiz', 'güçsüz', 'dermansız', 'takatsiz', 'kudretsiz'],
          ngrams: ['çok yorgun', 'aşırı yorgun', 'bitkin durumda', 'tükenmiş hissediyorum'],
          context: ['fiziksel', 'beden', 'vücut', 'enerji', 'güç']
        },
        energetic: {
          patterns: ['enerjik', 'dinç', 'güçlü', 'aktif', 'canlı', 'diri', 'taze', 'zinde'],
          ngrams: ['çok enerjik', 'aşırı aktif', 'dinç hissediyorum', 'güçlü hissediyorum'],
          context: ['fiziksel', 'beden', 'vücut', 'enerji', 'güç']
        }
      },
      
      // Emotional states
      emotional: {
        happy: {
          patterns: ['mutlu', 'sevinçli', 'neşeli', 'gururlu', 'memnun', 'hoşnut', 'tatmin'],
          ngrams: ['çok mutlu', 'aşırı sevinçli', 'müthiş mutlu', 'harika hissediyorum'],
          context: ['başarı', 'kazandım', 'tamamladım', 'başardım', 'güzel', 'iyi']
        },
        sad: {
          patterns: ['üzgün', 'hüzünlü', 'kederli', 'acılı', 'üzüntülü', 'kırgın', 'mutsuz'],
          ngrams: ['çok üzgün', 'aşırı hüzünlü', 'müthiş kederli', 'berbat hissediyorum'],
          context: ['kaybettim', 'başarısız', 'hata', 'yanlış', 'kötü', 'berbat']
        },
        angry: {
          patterns: ['kızgın', 'sinirli', 'öfkeli', 'gergin', 'huzursuz', 'tedirgin'],
          ngrams: ['çok kızgın', 'aşırı sinirli', 'müthiş öfkeli', 'kızgın hissediyorum'],
          context: ['problem', 'sorun', 'hata', 'yanlış', 'kayıp', 'zarar']
        },
        anxious: {
          patterns: ['endişeli', 'kaygılı', 'tedirgin', 'korku', 'panik', 'stresli'],
          ngrams: ['çok endişeli', 'aşırı kaygılı', 'müthiş stresli', 'panik hissediyorum'],
          context: ['gelecek', 'yarın', 'sınav', 'iş', 'para', 'sağlık']
        }
      },
      
      // Mental states
      mental: {
        frustrated: {
          patterns: ['bıktım', 'usandım', 'sıkıldım', 'sıkkın', 'sıkıntılı', 'bezgin'],
          ngrams: ['bıktım artık', 'usandım artık', 'sıkıldım artık', 'yeter artık'],
          context: ['tekrar', 'aynı', 'sürekli', 'hep', 'her zaman']
        },
        overwhelmed: {
          patterns: ['bunalmış', 'aşırı yüklenmiş', 'çok fazla', 'bitkin', 'tükenmiş'],
          ngrams: ['çok fazla iş', 'aşırı yüklenmiş', 'bunalmış hissediyorum'],
          context: ['çok', 'fazla', 'aşırı', 'yük', 'iş', 'sorumluluk']
        },
        motivated: {
          patterns: ['motiveli', 'hevesli', 'istekli', 'azimli', 'kararlı', 'umutlu'],
          ngrams: ['çok motiveli', 'aşırı hevesli', 'müthiş istekli', 'azimli hissediyorum'],
          context: ['hedef', 'amaç', 'plan', 'gelecek', 'başarı', 'ilerleme']
        }
      },
      
      // Social states
      social: {
        lonely: {
          patterns: ['yalnız', 'tek başına', 'kimsesiz', 'izole', 'soyutlanmış'],
          ngrams: ['çok yalnız', 'aşırı yalnız', 'müthiş yalnız', 'yalnız hissediyorum'],
          context: ['kimse', 'arkadaş', 'aile', 'sosyal', 'insan', 'toplum']
        },
        grateful: {
          patterns: ['minnettar', 'şükür', 'teşekkür', 'memnun', 'hoşnut'],
          ngrams: ['çok minnettar', 'aşırı şükür', 'müthiş minnettar', 'şükür hissediyorum'],
          context: ['yardım', 'destek', 'iyilik', 'lütuf', 'nimet']
        }
      }
    };
  }

  // N-gram analysis for better pattern matching
  extractNGrams(text, n = 2) {
    const words = text.toLowerCase().split(/\s+/);
    const ngrams = [];
    
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n).join(' '));
    }
    
    return ngrams;
  }

  // Smart pattern matching with context awareness
  matchPatterns(text) {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);
    const ngrams = this.extractNGrams(lowerText);
    const matches = [];

    // Check for negation
    const hasNegation = this.negationWords.some(neg => lowerText.includes(neg));
    
    // Check for intensity modifiers
    const intensity = this.detectIntensity(lowerText);
    
    // Pattern matching
    for (const [category, moods] of Object.entries(this.patterns)) {
      for (const [mood, data] of Object.entries(moods)) {
        let score = 0;
        let matchedPatterns = [];
        
        // Check single word patterns
        data.patterns.forEach(pattern => {
          if (words.includes(pattern)) {
            score += 1;
            matchedPatterns.push(pattern);
          }
        });
        
        // Check N-gram patterns
        data.ngrams.forEach(ngram => {
          if (ngrams.includes(ngram)) {
            score += 2; // N-grams get higher weight
            matchedPatterns.push(ngram);
          }
        });
        
        // Check context patterns
        data.context.forEach(context => {
          if (lowerText.includes(context)) {
            score += 0.5;
            matchedPatterns.push(context);
          }
        });
        
        if (score > 0) {
          // Apply negation penalty
          if (hasNegation) {
            score *= -0.7;
          }
          
          // Apply intensity modifier
          score *= intensity.multiplier;
          
          matches.push({
            mood,
            category,
            score,
            matchedPatterns,
            intensity: intensity.level,
            hasNegation
          });
        }
      }
    }
    
    return matches.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  }

  // Detect intensity level
  detectIntensity(text) {
    for (const [level, modifiers] of Object.entries(this.intensityModifiers)) {
      if (modifiers.some(modifier => text.includes(modifier))) {
        return {
          level,
          multiplier: level === 'high' ? 1.5 : level === 'medium' ? 1.2 : 0.8
        };
      }
    }
    return { level: 'normal', multiplier: 1.0 };
  }
}

// Context Awareness System
class ContextAnalyzer {
  constructor() {
    this.contextWeights = {
      sentence: 1.0,
      paragraph: 1.2,
      recent: 1.5,
      emotional: 1.3,
      temporal: 1.1
    };
  }

  // Analyze sentence context
  analyzeSentenceContext(sentences) {
    const contexts = [];
    
    sentences.forEach((sentence, index) => {
      const context = {
        sentence: sentence.trim(),
        position: index,
        weight: this.calculatePositionWeight(index, sentences.length),
        emotional: this.detectEmotionalContext(sentence),
        temporal: this.detectTemporalContext(sentence)
      };
      
      contexts.push(context);
    });
    
    return contexts;
  }

  // Calculate position weight (later sentences often more important)
  calculatePositionWeight(index, total) {
    const position = index / (total - 1);
    return 0.8 + (position * 0.4); // 0.8 to 1.2
  }

  // Detect emotional context
  detectEmotionalContext(text) {
    const emotionalWords = [
      'hissediyorum', 'hissediyor', 'hissediyoruz', 'hissediyorlar',
      'duygu', 'duygusal', 'duygularım', 'duyguları',
      'mood', 'ruh hali', 'psikolojik', 'mental'
    ];
    
    return emotionalWords.some(word => text.toLowerCase().includes(word));
  }

  // Detect temporal context
  detectTemporalContext(text) {
    const temporalWords = [
      'bugün', 'dün', 'yarın', 'şimdi', 'şu an', 'geçen', 'gelecek',
      'today', 'yesterday', 'tomorrow', 'now', 'recent', 'future'
    ];
    
    return temporalWords.some(word => text.toLowerCase().includes(word));
  }

  // Combine context analysis with pattern matching
  combineContextWithPatterns(contexts, patternMatches) {
    const weightedMatches = [];
    
    patternMatches.forEach(match => {
      const context = contexts.find(c => 
        c.sentence.toLowerCase().includes(match.matchedPatterns[0])
      );
      
      if (context) {
        const weightedScore = match.score * context.weight;
        weightedMatches.push({
          ...match,
          score: weightedScore,
          context: context
        });
      } else {
        weightedMatches.push(match);
      }
    });
    
    return weightedMatches.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  }
}

// User Learning System
class UserLearningSystem {
  constructor() {
    this.userPatterns = new Map();
    this.userHistory = [];
    this.learningRate = 0.1;
  }

  // Learn from user feedback
  async learnFromUser(mood, text, confidence) {
    try {
      const entry = {
        mood,
        text: text.toLowerCase(),
        confidence,
        timestamp: Date.now(),
        patterns: this.extractUserPatterns(text)
      };
      
      this.userHistory.push(entry);
      
      // Update user patterns
      entry.patterns.forEach(pattern => {
        if (!this.userPatterns.has(pattern)) {
          this.userPatterns.set(pattern, {});
        }
        
        const patternData = this.userPatterns.get(pattern);
        patternData[mood] = (patternData[mood] || 0) + 1;
        patternData.total = (patternData.total || 0) + 1;
      });
      
      // Save to storage
      await this.saveUserData();
      
    } catch (error) {
      console.warn('Failed to learn from user:', error);
    }
  }

  // Extract patterns from user text
  extractUserPatterns(text) {
    const words = text.toLowerCase().split(/\s+/);
    const patterns = [];
    
    // Single words
    words.forEach(word => {
      if (word.length > 2) {
        patterns.push(word);
      }
    });
    
    // Bigrams
    for (let i = 0; i < words.length - 1; i++) {
      patterns.push(`${words[i]} ${words[i + 1]}`);
    }
    
    return patterns;
  }

  // Get user-specific mood prediction
  async getUserMoodPrediction(text) {
    try {
      const userPatterns = await this.getUserPatterns();
      const textPatterns = this.extractUserPatterns(text);
      
      const moodScores = {};
      
      textPatterns.forEach(pattern => {
        const patternData = userPatterns[pattern];
        if (patternData) {
          Object.entries(patternData).forEach(([mood, count]) => {
            if (mood !== 'total') {
              moodScores[mood] = (moodScores[mood] || 0) + count;
            }
          });
        }
      });
      
      const bestMood = Object.keys(moodScores).reduce((a, b) => 
        moodScores[a] > moodScores[b] ? a : b, null
      );
      
      if (bestMood && moodScores[bestMood] > 0) {
        return {
          mood: bestMood,
          confidence: Math.min(0.9, 0.6 + (moodScores[bestMood] * 0.1)),
          source: 'user_learning'
        };
      }
      
      return null;
      
    } catch (error) {
      console.warn('Failed to get user mood prediction:', error);
      return null;
    }
  }

  // Save user data to storage
  async saveUserData() {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PATTERNS,
        JSON.stringify(Object.fromEntries(this.userPatterns))
      );
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_HISTORY,
        JSON.stringify(this.userHistory.slice(-100)) // Keep last 100 entries
      );
    } catch (error) {
      console.warn('Failed to save user data:', error);
    }
  }

  // Load user data from storage
  async loadUserData() {
    try {
      const patterns = await AsyncStorage.getItem(STORAGE_KEYS.USER_PATTERNS);
      const history = await AsyncStorage.getItem(STORAGE_KEYS.USER_HISTORY);
      
      if (patterns) {
        this.userPatterns = new Map(Object.entries(JSON.parse(patterns)));
      }
      
      if (history) {
        this.userHistory = JSON.parse(history);
      }
    } catch (error) {
      console.warn('Failed to load user data:', error);
    }
  }

  // Get user patterns
  async getUserPatterns() {
    try {
      const patterns = await AsyncStorage.getItem(STORAGE_KEYS.USER_PATTERNS);
      return patterns ? JSON.parse(patterns) : {};
    } catch (error) {
      console.warn('Failed to get user patterns:', error);
      return {};
    }
  }
}

// Confidence Scoring System
class ConfidenceScorer {
  constructor() {
    this.confidenceThresholds = {
      high: 0.8,
      medium: 0.6,
      low: 0.4
    };
  }

  // Calculate confidence score
  calculateConfidence(matches, context, userPrediction) {
    let confidence = 0;
    let factors = [];
    
    // Pattern matching confidence
    if (matches.length > 0) {
      const topMatch = matches[0];
      confidence += Math.min(0.6, Math.abs(topMatch.score) * 0.1);
      factors.push(`Pattern matching: ${Math.abs(topMatch.score).toFixed(2)}`);
    }
    
    // Context confidence
    if (context && context.emotional) {
      confidence += 0.2;
      factors.push('Emotional context detected');
    }
    
    // User learning confidence
    if (userPrediction && userPrediction.confidence > 0.5) {
      confidence += 0.3;
      factors.push('User learning match');
    }
    
    // Multiple pattern confidence
    if (matches.length > 1) {
      confidence += 0.1;
      factors.push('Multiple patterns matched');
    }
    
    // Intensity confidence
    const hasIntensity = matches.some(m => m.intensity !== 'normal');
    if (hasIntensity) {
      confidence += 0.1;
      factors.push('Intensity detected');
    }
    
    return {
      score: Math.min(0.95, confidence),
      level: this.getConfidenceLevel(confidence),
      factors
    };
  }

  // Get confidence level
  getConfidenceLevel(score) {
    if (score >= this.confidenceThresholds.high) return 'high';
    if (score >= this.confidenceThresholds.medium) return 'medium';
    if (score >= this.confidenceThresholds.low) return 'low';
    return 'very_low';
  }

  // Get fallback suggestions from extended moods
  getFallbackSuggestions(confidence) {
    if (confidence.level === 'very_low') {
      return [
        { mood: 'neutral', confidence: 0.3, reason: 'No clear mood detected' },
        { mood: 'calm', confidence: 0.2, reason: 'Default calm suggestion' }
      ];
    }
    
    if (confidence.level === 'low') {
      return [
        { mood: 'neutral', confidence: 0.4, reason: 'Low confidence fallback' },
        { mood: 'calm', confidence: 0.3, reason: 'Alternative calm suggestion' }
      ];
    }
    
    return [];
  }
}

// Real-time Adaptation System
class RealTimeAdapter {
  constructor() {
    this.adaptationRate = 0.05;
    this.recentPredictions = [];
    this.adaptationThreshold = 10;
  }

  // Adapt patterns based on recent predictions
  async adaptPatterns(recentPredictions) {
    try {
      if (recentPredictions.length < this.adaptationThreshold) {
        return;
      }
      
      const successfulPredictions = recentPredictions.filter(p => p.confidence > 0.7);
      const failedPredictions = recentPredictions.filter(p => p.confidence < 0.4);
      
      // Boost successful patterns
      successfulPredictions.forEach(prediction => {
        // This would update pattern weights in real-time
        console.log('Boosting pattern for:', prediction.mood);
      });
      
      // Learn from failed predictions
      failedPredictions.forEach(prediction => {
        // This would adjust pattern weights
        console.log('Learning from failed prediction:', prediction.mood);
      });
      
    } catch (error) {
      console.warn('Failed to adapt patterns:', error);
    }
  }

  // Track prediction performance
  trackPrediction(mood, text, confidence, userFeedback) {
    const prediction = {
      mood,
      text,
      confidence,
      userFeedback,
      timestamp: Date.now()
    };
    
    this.recentPredictions.push(prediction);
    
    // Keep only recent predictions
    if (this.recentPredictions.length > 50) {
      this.recentPredictions = this.recentPredictions.slice(-50);
    }
    
    // Trigger adaptation if threshold reached
    if (this.recentPredictions.length % this.adaptationThreshold === 0) {
      this.adaptPatterns(this.recentPredictions);
    }
  }
}

// Main Smart Mood Detector Class
class SmartMoodDetector {
  constructor() {
    this.patternMatcher = new SmartPatternMatcher();
    this.contextAnalyzer = new ContextAnalyzer();
    this.userLearning = new UserLearningSystem();
    this.confidenceScorer = new ConfidenceScorer();
    this.realTimeAdapter = new RealTimeAdapter();
    
    // Initialize user data
    this.userLearning.loadUserData();
  }

  // Main mood detection function
  async detectMood(text, userHistory = []) {
    try {
      if (!text || text.trim().length === 0) {
        return {
          mood: 'neutral',
          confidence: { score: 0.1, level: 'very_low', factors: ['No text provided'] },
          reason: 'No text provided'
        };
      }

      // Split into sentences for context analysis
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      // 1. Smart Pattern Matching
      const patternMatches = this.patternMatcher.matchPatterns(text);
      
      // 2. Context Awareness
      const contexts = this.contextAnalyzer.analyzeSentenceContext(sentences);
      const weightedMatches = this.contextAnalyzer.combineContextWithPatterns(contexts, patternMatches);
      
      // 3. User Learning
      const userPrediction = await this.userLearning.getUserMoodPrediction(text);
      
      // 4. Confidence Scoring
      const confidence = this.confidenceScorer.calculateConfidence(
        weightedMatches, 
        contexts[0], 
        userPrediction
      );
      
      // 5. Determine final mood
      let finalMood = 'neutral';
      let reason = 'No clear mood detected';
      
      if (userPrediction && userPrediction.confidence > 0.6) {
        finalMood = userPrediction.mood;
        reason = 'User learning prediction';
      } else if (weightedMatches.length > 0) {
        const topMatch = weightedMatches[0];
        if (Math.abs(topMatch.score) > 0.5) {
          finalMood = topMatch.mood;
          reason = `Pattern matching: ${topMatch.matchedPatterns.join(', ')}`;
        }
      }
      
      // 6. Real-time Adaptation
      this.realTimeAdapter.trackPrediction(finalMood, text, confidence.score, null);
      
      return {
        mood: finalMood,
        confidence,
        reason,
        matches: weightedMatches,
        userPrediction,
        context: contexts
      };
      
    } catch (error) {
      console.error('Mood detection error:', error);
      return {
        mood: 'neutral',
        confidence: { score: 0.1, level: 'very_low', factors: ['Error in detection'] },
        reason: 'Error in mood detection'
      };
    }
  }

  // Get mood suggestions - Extended moods for AI suggestions
  async getMoodSuggestions(text, currentMood = null) {
    try {
      const detection = await this.detectMood(text);
      const suggestions = [];
      
      // Primary suggestion from extended moods
      if (detection.confidence.score > 0.5) {
        const suggestedMood = EXTENDED_MOODS.find(m => m.key === detection.mood);
        if (suggestedMood) {
          suggestions.push({
            mood: detection.mood,
            label: suggestedMood.label,
            icon: suggestedMood.icon,
            color: suggestedMood.color,
            confidence: detection.confidence.score,
            reason: detection.reason,
            type: 'primary'
          });
        }
      }
      
      // Alternative suggestions from extended moods
      if (detection.matches.length > 1) {
        detection.matches.slice(1, 3).forEach(match => {
          if (Math.abs(match.score) > 0.3) {
            const suggestedMood = EXTENDED_MOODS.find(m => m.key === match.mood);
            if (suggestedMood) {
              suggestions.push({
                mood: match.mood,
                label: suggestedMood.label,
                icon: suggestedMood.icon,
                color: suggestedMood.color,
                confidence: Math.abs(match.score) * 0.1,
                reason: `Alternative: ${match.matchedPatterns.join(', ')}`,
                type: 'alternative'
              });
            }
          }
        });
      }
      
      // Fallback suggestions from extended moods
      if (suggestions.length === 0) {
        const fallbacks = this.confidenceScorer.getFallbackSuggestions(detection.confidence);
        fallbacks.forEach(fallback => {
          const suggestedMood = EXTENDED_MOODS.find(m => m.key === fallback.mood);
          if (suggestedMood) {
            suggestions.push({
              ...fallback,
              label: suggestedMood.label,
              icon: suggestedMood.icon,
              color: suggestedMood.color
            });
          }
        });
      }
      
      return suggestions;
      
    } catch (error) {
      console.error('Mood suggestions error:', error);
      return [
        { 
          mood: 'neutral', 
          label: 'Neutral',
          icon: 'sentiment-neutral',
          color: '#F5F5F5',
          confidence: 0.3, 
          reason: 'Error in suggestions', 
          type: 'fallback' 
        }
      ];
    }
  }

  // Learn from user feedback
  async learnFromUser(mood, text, userFeedback = null) {
    try {
      const detection = await this.detectMood(text);
      const confidence = detection.confidence.score;
      
      // Learn from user
      await this.userLearning.learnFromUser(mood, text, confidence);
      
      // Track for real-time adaptation
      this.realTimeAdapter.trackPrediction(mood, text, confidence, userFeedback);
      
      console.log('Learned from user:', { mood, text, confidence });
      
    } catch (error) {
      console.warn('Failed to learn from user:', error);
    }
  }

  // Get user mood history
  async getUserMoodHistory() {
    try {
      const history = await AsyncStorage.getItem(STORAGE_KEYS.USER_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.warn('Failed to get user mood history:', error);
      return [];
    }
  }
}

// Export singleton instance
export const smartMoodDetector = new SmartMoodDetector();

// Backward compatibility functions
export const analyzeSentiment = async (text, userHistory = []) => {
  const detection = await smartMoodDetector.detectMood(text, userHistory);
  return {
    score: detection.confidence.score * 100,
    label: detection.mood === 'happy' || detection.mood === 'excited' ? 'positive' : 
           detection.mood === 'sad' || detection.mood === 'angry' || detection.mood === 'tired' ? 'negative' : 'neutral',
    confidence: detection.confidence.score
  };
};

// Sentence-based analysis for better context understanding
export const analyzeSentimentBySentences = async (text, userHistory = []) => {
  if (!text || text.trim().length === 0) {
    return { score: 0, label: 'neutral', confidence: 0, sentences: [] };
  }

  // Split text into sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceAnalyses = [];
  
  // Analyze each sentence
  for (const sentence of sentences) {
    const analysis = await smartMoodDetector.detectMood(sentence.trim(), userHistory);
    sentenceAnalyses.push({
      sentence: sentence.trim(),
      sentiment: {
        score: analysis.confidence.score * 100,
        label: analysis.mood === 'happy' || analysis.mood === 'excited' ? 'positive' : 
               analysis.mood === 'sad' || analysis.mood === 'angry' || analysis.mood === 'tired' ? 'negative' : 'neutral',
        confidence: analysis.confidence.score
      }
    });
  }
  
  // Calculate weighted average based on sentence length and confidence
  let totalWeight = 0;
  let weightedScore = 0;
  let totalConfidence = 0;
  
  sentenceAnalyses.forEach((analysis) => {
    const weight = analysis.sentence.length * (analysis.sentiment.confidence || 0.5);
    totalWeight += weight;
    weightedScore += analysis.sentiment.score * weight;
    totalConfidence += analysis.sentiment.confidence * weight;
  });
  
  const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
  const finalConfidence = totalWeight > 0 ? totalConfidence / totalWeight : 0;
  
  // Determine final label based on weighted score
  let finalLabel = 'neutral';
  if (finalScore > 20) {
    finalLabel = 'positive';
  } else if (finalScore < -20) {
    finalLabel = 'negative';
  }
  
  return {
    score: finalScore,
    label: finalLabel,
    confidence: finalConfidence,
    sentences: sentenceAnalyses
  };
};

export const getSmartMoodSuggestion = async (sentiment, currentMood, userHistory = [], text = '') => {
  // Use text for mood detection, sentiment for additional context
  const suggestions = await smartMoodDetector.getMoodSuggestions(text, currentMood);
  
  // If no suggestions from text analysis, try sentiment-based fallback
  if (suggestions.length === 0 && sentiment) {
    const sentimentMood = sentiment.label === 'positive' ? 'happy' : 
                         sentiment.label === 'negative' ? 'sad' : 'neutral';
    
    const fallbackMood = EXTENDED_MOODS.find(m => m.key === sentimentMood);
    if (fallbackMood) {
      suggestions.push({
        mood: sentimentMood,
        label: fallbackMood.label,
        icon: fallbackMood.icon,
        color: fallbackMood.color,
        confidence: sentiment.confidence || 0.3,
        reason: 'Sentiment-based fallback',
        type: 'fallback'
      });
    }
  }
  
  return suggestions.map(suggestion => ({
    ...suggestion,
    sentimentScore: sentiment?.score || 0
  }));
};

export const learnFromUser = async (mood, text, userFeedback = null) => {
  await smartMoodDetector.learnFromUser(mood, text, userFeedback);
};

export const getUserMoodHistory = async () => {
  return await smartMoodDetector.getUserMoodHistory();
};

// Helper functions
export const getSentimentColor = (sentiment) => {
  if (!sentiment) return '#9E9E9E';
  
  switch (sentiment.label) {
    case 'positive': return '#4CAF50';
    case 'negative': return '#F44336';
    default: return '#9E9E9E';
  }
};

export const getSentimentEmoji = (sentiment) => {
  if (!sentiment) return '😐';
  
  switch (sentiment.label) {
    case 'positive': return '😊';
    case 'negative': return '😔';
    default: return '😐';
  }
};

export const getMoodColor = (mood) => {
  const moodObj = CORE_MOODS.find(m => m.key === mood) || EXTENDED_MOODS.find(m => m.key === mood);
  return moodObj ? moodObj.color : '#E0E0E0';
};

export const getMoodIcon = (mood) => {
  const moodObj = CORE_MOODS.find(m => m.key === mood) || EXTENDED_MOODS.find(m => m.key === mood);
  return moodObj ? moodObj.icon : 'sentiment-neutral';
};

// Get mood object by key
export const getMoodObject = (mood) => {
  return CORE_MOODS.find(m => m.key === mood) || EXTENDED_MOODS.find(m => m.key === mood);
};

// Check if mood is in core moods (for manual selection)
export const isCoreMood = (mood) => {
  return CORE_MOODS.some(m => m.key === mood);
};

// Check if mood is in extended moods (for suggestions)
export const isExtendedMood = (mood) => {
  return EXTENDED_MOODS.some(m => m.key === mood);
};

export const getValidIconName = (name) => {
  const fallback = {
    "celebration": "celebration",
    "spa": "spa",
    "bedtime": "bedtime",
    "psychology": "psychology",
    "warning": "warning",
    "favorite": "favorite",
    "wb-sunny": "wb-sunny",
    "history": "history",
    "trending-up": "trending-up",
    "person-off": "person-off",
    "self-improvement": "self-improvement",
    "help": "help",
    "emoji-events": "emoji-events",
    "explore": "explore",
    "sentiment-neutral": "sentiment-neutral",
    "surprise": "surprise"
  };
  return fallback[name] ? fallback[name] : name;
};
