// utils/SmartMoodDetector.js
// Smart AI Mood Detection System
// Features: Smart Pattern Matching, Context Awareness, User Learning, Confidence Scoring, Real-time Adaptation

// Mock AsyncStorage for Node.js testing
import logger from './logger';
const AsyncStorage = {
  getItem: async (key) => null,
  setItem: async (key, value) => {},
  removeItem: async (key) => {},
  clear: async () => {}
};

// Try to import real AsyncStorage if available (React Native environment)
try {
  const realAsyncStorage = require('@react-native-async-storage/async-storage');
  if (realAsyncStorage && realAsyncStorage.default) {
    Object.assign(AsyncStorage, realAsyncStorage.default);
  }
} catch (e) {
  // Use mock AsyncStorage in Node.js environment
}

// 5 Core moods for manual selection only
export const CORE_MOODS = [
  {
    key: "happy",
    label: "Happy",
    icon: "sentiment-satisfied",
    color: "#C8E6C9", // Light green
    category: "positive"
  },
  {
    key: "excited",
    label: "Excited", 
    icon: "celebration",
    color: "#FFE0B2", // Light orange
    category: "positive"
  },
  {
    key: "tired",
    label: "Tired",
    icon: "bedtime",
    color: "#E1BEE7", // Light purple
    category: "negative"
  },
  {
    key: "sad",
    label: "Sad",
    icon: "sentiment-dissatisfied",
    color: "#FFCDD2", // Light red
    category: "negative"
  },
  {
    key: "angry",
    label: "Angry",
    icon: "mood-bad",
    color: "#FFAB91", // Light deep orange
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
    icon: "mood-bad",
    color: "#FFCCBC", // Light brown
    category: "negative"
  },
  {
    key: "anxious",
    label: "Anxious", 
    icon: "warning",
    color: "#FFF3E0", // Light amber
    category: "negative"
  },
  {
    key: "grateful",
    label: "Grateful",
    icon: "favorite",
    color: "#E8F5E8", // Light mint green
    category: "positive"
  },
  {
    key: "hopeful",
    label: "Hopeful",
    icon: "wb-sunny",
    color: "#E1F5FE", // Light blue
    category: "positive"
  },
  {
    key: "proud",
    label: "Proud",
    icon: "emoji-events",
    color: "#FFF8E1", // Light yellow
    category: "positive"
  },
  {
    key: "relieved",
    label: "Relieved",
    icon: "spa",
    color: "#F3E5F5", // Light lavender
    category: "positive"
  },
  {
    key: "overwhelmed",
    label: "Overwhelmed",
    icon: "psychology-alt",
    color: "#FFEBEE", // Light pink
    category: "negative"
  },
  {
    key: "lonely",
    label: "Lonely",
    icon: "person-off",
    color: "#E0E0E0", // Light gray
    category: "negative"
  },
  {
    key: "motivated",
    label: "Motivated",
    icon: "trending-up",
    color: "#DCEDC8", // Light lime green
    category: "positive"
  },
  {
    key: "confused",
    label: "Confused",
    icon: "help",
    color: "#F5F5F5", // Very light gray
    category: "negative"
  },
  {
    key: "disappointed",
    label: "Disappointed",
    icon: "sentiment-very-dissatisfied",
    color: "#FFE0E6", // Light rose
    category: "negative"
  },
  {
    key: "nostalgic",
    label: "Nostalgic",
    icon: "history",
    color: "#E8EAF6", // Light indigo
    category: "neutral"
  },
  {
    key: "peaceful",
    label: "Peaceful",
    icon: "spa",
    color: "#E0F2F1", // Light teal
    category: "positive"
  },
  {
    key: "curious",
    label: "Curious",
    icon: "explore",
    color: "#FFFDE7", // Light cream
    category: "neutral"
  },
  {
    key: "bored",
    label: "Bored",
    icon: "sentiment-neutral",
    color: "#FAFAFA", // Very light gray
    category: "negative"
  },
  {
    key: "surprised",
    label: "Surprised",
    icon: "surprise",
    color: "#FFF9C4", // Light yellow
    category: "neutral"
  },
  {
    key: "content",
    label: "Content",
    icon: "sentiment-very-satisfied",
    color: "#E8F5E8", // Light mint green
    category: "positive"
  },
  {
    key: "worried",
    label: "Worried",
    icon: "help-outline",
    color: "#FCE4EC", // Light magenta
    category: "negative"
  },
  {
    key: "natural",
    label: "Natural",
    icon: "sentiment-neutral",
    color: "#CFD8DC", // Light gray
    category: "neutral"
  }
];

// Storage keys
const STORAGE_KEYS = {
  USER_PATTERNS: 'smart_mood_user_patterns',
  USER_HISTORY: 'smart_mood_user_history',
  CONTEXT_PATTERNS: 'smart_mood_context_patterns',
  CONFIDENCE_HISTORY: 'smart_mood_confidence_history'
};

// Normalize text for consistent matching (Turkish-aware)
const normalizeText = (text = '') => {
  if (!text) return '';
  // Lowercase and remove punctuation while keeping Turkish characters
  // Replace non-letter/number/space characters with space, then collapse whitespace
  return text
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Semantic Analyzer - Advanced Context Understanding
class SemanticAnalyzer {
  constructor() {
    // Co-occurrence patterns - which words typically appear together with which moods
    this.coOccurrencePatterns = {
      // Context keywords that modify mood interpretation
      'sınav': {
        positiveWith: ['geçtim', 'başardım', 'bitti', 'iyi gitti', 'kolay', 'tamamladım'],
        negativeWith: ['var', 'gelecek', 'yaklaşıyor', 'korkuyorum', 'kaygılıyım', 'hazır değilim'],
        neutralWith: ['çalışıyorum', 'hazırlanıyorum'],
        confidence: 0.85
      },
      'iş': {
        positiveWith: ['tamamladım', 'başardım', 'bitti', 'kolay', 'severek'],
        negativeWith: ['çok fazla', 'bunalmış', 'yoruldum', 'bitmez', 'çok'],
        neutralWith: ['yapıyorum', 'devam ediyor'],
        confidence: 0.9
      },
      'proje': {
        positiveWith: ['tamamladım', 'başarılı', 'bitti', 'gurur duyuyorum'],
        negativeWith: ['gecikmesi', 'zor', 'karmaşık', 'takıldım'],
        neutralWith: ['üzerinde çalışıyorum'],
        confidence: 0.85
      },
      'arkadaş': {
        positiveWith: ['gördüm', 'buluştum', 'eğlendik', 'harika', 'mutlu'],
        negativeWith: ['kavga', 'tartışma', 'küs', 'görmüyorum'],
        neutralWith: ['konuştum', 'mesajlaştık'],
        confidence: 0.8
      },
      'aile': {
        positiveWith: ['buluştuk', 'mutlu', 'güzel vakit', 'sevgi dolu'],
        negativeWith: ['sorun', 'tartışma', 'problem', 'anlaşamıyoruz'],
        neutralWith: ['ziyaret', 'görüştük'],
        confidence: 0.8
      }
    };

    // Sentiment flow connectors - words that change mood direction
    this.sentimentConnectors = {
      contrast: ['ama', 'fakat', 'ancak', 'lakin', 'oysa', 'but', 'however', 'yet', 'although'],
      cause: ['çünkü', 'zira', 'nedeniyle', 'dolayısıyla', 'because', 'since', 'as'],
      progression: ['artık', 'şimdi', 'sonunda', 'nihayet', 'now', 'finally', 'at last'],
      addition: ['ayrıca', 've', 'hem', 'de', 'da', 'also', 'and', 'moreover']
    };

    // Temporal markers - detect time-based context
    this.temporalMarkers = {
      past: ['dün', 'geçen', 'önceden', 'eskiden', 'idi', 'dı', 'du', 'yesterday', 'was', 'were', 'used to'],
      present: ['şimdi', 'şu an', 'bugün', 'halen', 'now', 'currently', 'today', 'am', 'is', 'are'],
      future: ['yarın', 'gelecek', 'olacak', 'edeceğim', 'iyileşecek', 'tomorrow', 'will', 'going to']
    };
  }

  // Quick keyword -> extended mood hints (added to improve coverage)
  static extendedMoodKeywords() {
    // Curated high-precision keyword hints (filtered from TF-IDF + manual cleanup)
    return {
      'motivated': ['ilham', 'heves', 'motivated', 'motive', 'enerji', 'hevesli'],
      'grateful': ['minnettar', 'teşekkür', 'şükür', 'müteşekkir', 'thankful'],
      'nostalgic': ['nostalji', 'özlem', 'hatırlıyorum', 'remember'],
      'lonely': ['yalnız', 'tek başıma', 'kimse yok', 'lonely'],
      'frustrated': ['sıkıldım', 'bıktım', 'sinir', 'sinirliyim', 'frustrated', 'bıktım artık', 'yeter artık'],
      'anxious': ['endişeli', 'kaygı', 'kaygılı', 'endiş', 'anxious'],
      'hopeful': ['umutlu', 'umarım', 'inşallah', 'hopeful', 'umudum var', 'iyi olacak'],
      'proud': ['gururluyum', 'başardım', 'gurur duyuyorum', 'proud'],
      'relieved': ['kurtuldum', 'rahatladım', 'rahat', 'relieved', 'ferahladım'],
      'overwhelmed': ['bunaldım', 'çok fazla', 'fazla geldi', 'overwhelmed'],
      'curious': ['merak', 'merak ediyorum', 'curious', 'meraklı'],
      'content': ['memnunum', 'tatmin', 'content', 'iyi hissediyorum'],
      'peaceful': ['huzurlu', 'sakin', 'peaceful', 'dingin', 'huzur'],
      'confused': ['kafam karıştı', 'anlamıyorum', 'confused'],
      'disappointed': ['hayal kırıklığı', 'hayal kırıklığına', 'üzüldüm', 'disappointed', 'kırgınım'],
      'bored': ['sıkıldım', 'sıkıcı', 'bored'],
      'surprised': ['şaşkınım', 'beklenmedik', 'surprised', 'şaşırdım'],
      'worried': ['endişeli', 'endiş', 'kaygılı', 'worried', 'kaygılanıyorum'],
      'natural': ['calm', 'sakin', 'normal']
    };
  }

  // Analyze co-occurrence to understand context better
  analyzeCoOccurrence(text, detectedMood) {
    const lowerText = normalizeText(text);
    let contextAdjustment = 0;
    let contextReason = '';

    for (const [keyword, patterns] of Object.entries(this.coOccurrencePatterns)) {
      if (lowerText.includes(keyword)) {
        // Check if positive context words are present
        const hasPositive = patterns.positiveWith.some(word => lowerText.includes(word));
        const hasNegative = patterns.negativeWith.some(word => lowerText.includes(word));

        if (hasPositive && detectedMood === 'happy') {
          contextAdjustment += 0.2 * patterns.confidence;
          contextReason = `Positive context with "${keyword}"`;
        } else if (hasNegative && (detectedMood === 'anxious' || detectedMood === 'overwhelmed')) {
          contextAdjustment += 0.2 * patterns.confidence;
          contextReason = `Negative context with "${keyword}"`;
        } else if (hasPositive && (detectedMood === 'anxious' || detectedMood === 'sad')) {
          // Contradiction detected - user might be using irony or mixed feelings
          contextAdjustment -= 0.3;
          contextReason = `Contradiction: positive "${keyword}" with negative mood`;
        } else if (hasNegative && detectedMood === 'happy') {
          // Contradiction - might be sarcasm or resilience
          contextAdjustment -= 0.2;
          contextReason = `Possible irony: negative "${keyword}" with happy mood`;
        }
      }
    }

    return {
      adjustment: contextAdjustment,
      reason: contextReason,
      hasContext: contextReason !== ''
    };
  }

  // Analyze sentiment flow - how mood changes within text
  analyzeSentimentFlow(text) {
    const lowerText = normalizeText(text);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length < 2) {
      return { hasFlow: false, flowType: null, emphasis: 'single' };
    }

    // Detect contrast connectors
    for (const connector of this.sentimentConnectors.contrast) {
      if (lowerText.includes(connector)) {
        // Text has "but" structure - the part after connector is more important
        const parts = lowerText.split(connector);
        if (parts.length >= 2) {
          return {
            hasFlow: true,
            flowType: 'contrast',
            emphasis: 'latter', // Emphasize what comes after "but/ama"
            reason: `Contrast detected with "${connector}"`,
            beforePart: parts[0].trim(),
            afterPart: parts.slice(1).join(connector).trim()
          };
        }
      }
    }

    // Detect progression (things getting better/worse)
    for (const connector of this.sentimentConnectors.progression) {
      if (lowerText.includes(connector)) {
        return {
          hasFlow: true,
          flowType: 'progression',
          emphasis: 'latter',
          reason: `Progression detected with "${connector}"`
        };
      }
    }

    // Detect cause-effect
    for (const connector of this.sentimentConnectors.cause) {
      if (lowerText.includes(connector)) {
        return {
          hasFlow: true,
          flowType: 'cause',
          emphasis: 'balanced',
          reason: `Causal relationship detected with "${connector}"`
        };
      }
    }

    return { hasFlow: false, flowType: null, emphasis: 'balanced' };
  }

  // Detect temporal context
  detectTemporalContext(text) {
    const lowerText = normalizeText(text);

    const hasPast = this.temporalMarkers.past.some(marker => lowerText.includes(normalizeText(marker)));
    const hasPresent = this.temporalMarkers.present.some(marker => lowerText.includes(normalizeText(marker)));
    const hasFuture = this.temporalMarkers.future.some(marker => lowerText.includes(normalizeText(marker)));

    if (hasPresent && (hasPast || hasFuture)) {
      return {
        temporal: 'transition',
        weight: 1.2, // Current feelings more important in transitions
        reason: 'Temporal transition detected'
      };
    } else if (hasPast) {
      return {
        temporal: 'past',
        weight: 0.8, // Past feelings less relevant to current mood
        reason: 'Past tense detected'
      };
    } else if (hasFuture) {
      return {
        temporal: 'future',
        weight: 0.9, // Future anxieties/hopes
        reason: 'Future tense detected'
      };
    }

    return {
      temporal: 'present',
      weight: 1.0,
      reason: 'Present tense'
    };
  }

  // Main semantic analysis function
  analyzeSemantics(text, detectedMood, confidence) {
    const coOccurrence = this.analyzeCoOccurrence(text, detectedMood);
    const sentimentFlow = this.analyzeSentimentFlow(text);
    const temporalContext = this.detectTemporalContext(text);

    // Adjust confidence based on semantic analysis
    let adjustedConfidence = confidence;
    let adjustmentReasons = [];

    // Apply co-occurrence adjustment
    if (coOccurrence.hasContext) {
      adjustedConfidence += coOccurrence.adjustment;
      adjustmentReasons.push(coOccurrence.reason);
    }

    // Apply temporal context weight
    adjustedConfidence *= temporalContext.weight;
    if (temporalContext.weight !== 1.0) {
      adjustmentReasons.push(temporalContext.reason);
    }

    // Handle sentiment flow
    let finalMood = detectedMood;
    if (sentimentFlow.hasFlow && sentimentFlow.flowType === 'contrast') {
      // For contrast sentences, analyze the latter part more heavily
      adjustmentReasons.push(sentimentFlow.reason);
      if (sentimentFlow.emphasis === 'latter') {
        // The part after "but" is more important
        // This will be used by the main detector
      }
    }

    return {
      originalConfidence: confidence,
      adjustedConfidence: Math.max(0, Math.min(1, adjustedConfidence)),
      adjustmentReasons,
      sentimentFlow,
      temporalContext,
      coOccurrenceContext: coOccurrence,
      suggestedEmphasis: sentimentFlow.emphasis || 'balanced'
    };
  }
}

// Smart Pattern Matching System
class SmartPatternMatcher {
  constructor() {
    this.patterns = this.initializePatterns();
    this.negationWords = [
      'değil', 'olmayan', 'olmuyor', 'olmaz', 'yok', 'hayır', 'hiç', 'asla', 'hiçbir',
      'not', 'no', 'never', 'none', 'nothing', 'nowhere', 'neither', 'nor'
    ];
    this.intensityModifiers = {
      high: [
        'çok', 'aşırı', 'müthiş', 'muhteşem', 'olağanüstü', 'son derece', 'fazlasıyla',
        'so', 'very', 'really', 'extremely', 'incredibly', 'absolutely', 'totally',
        'completely', 'utterly', 'terribly', 'awfully', 'super', 'superbly'
      ],
      medium: [
        'oldukça', 'epey', 'hayli', 'bir hayli', 'oldukça',
        'quite', 'rather', 'pretty', 'fairly', 'somewhat', 'reasonably',
        'moderately', 'relatively', 'comparatively'
      ],
      low: [
        'biraz', 'az', 'orta', 'idare', 'tamam',
        'a bit', 'a little', 'slightly', 'somewhat', 'kind of', 'sort of',
        'mildly', 'gently', 'softly'
      ]
    };
  }

  initializePatterns() {
    return {
  // Physical states
      physical: {
        tired: {
          patterns: ['yorgun', 'bitkin', 'tükenmiş', 'halsiz', 'güçsüz', 'dermansız', 'takatsiz', 'kudretsiz', 'uyumak istiyorum', 'uykum var'],
          ngrams: ['yorgun hissediyorum', 'bitkin durumdayım', 'tükenmiş gibiyim', 'uyumak istiyorum', 'enerji kalmadı'],
          context: ['uyku', 'yorgunluk', 'dinlenme', 'istirahat', 'uyumak']
        },
        energetic: {
          patterns: ['enerjik', 'dinç', 'güçlü', 'aktif', 'canlı', 'diri', 'taze', 'zinde', 'kabarık'],
          ngrams: ['enerjik hissediyorum', 'dinç hissediyorum', 'güçlü hissediyorum', 'enerji doluyum'],
          context: ['enerji', 'güç', 'hareket', 'aktivite', 'spor']
        }
  },
  
  // Emotional states
      emotional: {
        happy: {
          patterns: ['mutlu', 'sevinçli', 'neşeli', 'gururlu', 'memnun', 'hoşnut', 'tatmin', 'umutlu', 'umudum', 'umut', 'heyecanlı', 'heyecan', 'aşık', 'sevinç', 'keyifli', 'coşkulu', 'şen', 'renkli', 'iyiyim', 'harika', 'mutluyum', 'great', 'feeling', 'accomplished'],
          ngrams: ['mutlu hissediyorum', 'mutluyum', 'iyiyim', 'çok iyiyim', 'daha iyiyim', 'sevinçliyim', 'harika hissediyorum', 'umudum var', 'umut var', 'heyecanlı hissediyorum', 'aşık hissediyorum', 'içime sığmayan sevinç', 'mutluluktan uçuyorum', 'feeling great', 'accomplished a lot'],
          context: ['başarı', 'kazandım', 'tamamladım', 'başardım', 'güzel', 'sevgi', 'aşk', 'mutluluk', 'gülümseme', 'iyi']
        },
        sad: {
          patterns: ['üzgün', 'hüzünlü', 'kederli', 'acılı', 'üzüntülü', 'kırgın', 'mutsuz', 'mahzun', 'karamsar'],
          ngrams: ['üzgün hissediyorum', 'hüzünlü hissediyorum', 'kalbim kırık', 'ağlamak istiyorum', 'içim sıkılıyor'],
          context: ['kaybettim', 'başarısız', 'kayıp', 'ayrılık', 'yas', 'gözyaşı']
        },
        angry: {
          patterns: ['kızgın', 'sinirli', 'öfkeli', 'gergin', 'huzursuz', 'deli oldum', 'çıldıracağım', 'sinir oldum', 'kudurdum', 'hate', 'terrible'],
          ngrams: ['kızgın hissediyorum', 'sinirleniyorum', 'öfkeliyim', 'deliye dönüyorum', 'sinir oldum', 'öfkeden kudurdum', 'hate everything'],
          context: ['problem', 'sorun', 'adaletsizlik', 'haksızlık', 'kavga', 'tartışma', 'öfke']
        },
        anxious: {
          patterns: ['endişeli', 'kaygılı', 'tedirgin', 'korku', 'panik', 'stresli', 'telaşlı', 'huzursuz'],
          ngrams: ['endişeli hissediyorum', 'kaygılanıyorum', 'panik halindeyim', 'korkuyorum', 'stresli hissediyorum'],
          context: ['gelecek', 'yarın', 'sınav', 'toplantı', 'randevu', 'belirsizlik']
        }
  },
  
  // Mental states
      mental: {
        frustrated: {
          patterns: ['bıktım', 'usandım', 'sıkıldım', 'sıkkın', 'sıkıntılı', 'bezgin', 'can sıkıcı', 'sıkıcı', 'yorucu', 'bunaltıcı', 'dayanılmaz'],
          ngrams: ['bıktım artık', 'usandım artık', 'sıkıldım artık', 'yeter artık', 'can sıkıcı', 'ne kadar sıkıcı', 'dayanamıyorum artık'],
          context: ['tekrar', 'aynı şey', 'sürekli', 'monoton', 'rutin', 'değişiklik yok']
        },
        overwhelmed: {
    patterns: ['bunalmış', 'aşırı yüklenmiş', 'boğuluyorum', 'dayanamıyorum', 'başa çıkamıyorum', 'altında eziliyorum'],
          ngrams: ['bunalmış hissediyorum', 'aşırı yüklenmiş hissediyorum', 'başa çıkamıyorum', 'altında eziliyorum', 'çok fazla sorumluluk', 'çok fazla iş', 'çok fazla yük'],
          context: ['yük', 'sorumluluk', 'görev', 'yapılacak', 'deadline', 'teslim', 'baskı']
        },
        motivated: {
          patterns: ['motiveli', 'hevesli', 'istekli', 'azimli', 'kararlı', 'hırslı', 'tutkulu', 'ateşli'],
          ngrams: ['motiveli hissediyorum', 'hevesliyim', 'azimli hissediyorum', 'kararlıyım', 'başaracağım'],
          context: ['hedef', 'amaç', 'plan', 'başarı', 'ilerleme', 'gelişme']
        }
  },
  
  // Social states
      social: {
        lonely: {
          patterns: ['yalnız', 'tek başına', 'kimsesiz', 'izole', 'soyutlanmış', 'yalıtılmış', 'yapayalnız'],
          ngrams: ['yalnız hissediyorum', 'tek başımayım', 'kimse yok', 'kimsem yok', 'yalnızım'],
          context: ['kimse', 'arkadaş', 'aile', 'sosyal', 'iletişim', 'konuşacak kimse']
        },
        grateful: {
          patterns: ['minnettar', 'şükür', 'teşekkür', 'memnun', 'hoşnut', 'şükran', 'müteşekkir'],
          ngrams: ['minnettar hissediyorum', 'şükür hissediyorum', 'çok teşekkür', 'minnettarım', 'şükrediyorum'],
          context: ['yardım', 'destek', 'iyilik', 'lütuf', 'nimet', 'şanslı']
        }
      }
    };
  }

  // N-gram analysis for better pattern matching
  extractNGrams(text, n = 2) {
    const words = normalizeText(text).split(/\s+/);
    const ngrams = [];
    
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n).join(' '));
    }
    
    return ngrams;
  }

  // Smart pattern matching with context awareness
  matchPatterns(text) {
    const lowerText = normalizeText(text);
    const words = lowerText.split(/\s+/);
    const ngrams = this.extractNGrams(lowerText);
    const matches = [];

  // Check for negation
  const hasNegation = this.negationWords.some(neg => lowerText.includes(normalizeText(neg)));
    
    // Check for intensity modifiers
    const intensity = this.detectIntensity(lowerText);
    
    // Enhanced pattern detection for better accuracy
    this.detectAdvancedPatterns(lowerText, matches, intensity, hasNegation);
    
    // Pattern matching
    for (const [category, moods] of Object.entries(this.patterns)) {
      for (const [mood, data] of Object.entries(moods)) {
        let score = 0;
        let matchedPatterns = [];
        
            // Check single word patterns (normalize pattern before matching)
            data.patterns.forEach(pattern => {
              const p = normalizeText(pattern);
              if (words.includes(p)) {
                score += 1;
                matchedPatterns.push(pattern);
              }
            });
        
        // Check N-gram patterns
        data.ngrams.forEach(ngram => {
          const n = normalizeText(ngram);
          if (ngrams.includes(n)) {
            score += 2; // N-grams get higher weight
            matchedPatterns.push(ngram);
          }
        });
        
        // Check context patterns
        data.context.forEach(context => {
          const c = normalizeText(context);
          if (lowerText.includes(c)) {
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

  // Enhanced pattern detection for better accuracy
  detectAdvancedPatterns(text, matches, intensity, hasNegation) {
    const lowerText = normalizeText(text);
    // Turkish specific patterns - mood-specific only, no generic intensifiers
    const turkishPatterns = {
      'frustrated': [
        'can sıkıcı', 'sıkıldım', 'bıktım', 'usandım', 'bezgin', 'yeter artık',
        'ne kadar sıkıcı', 'sıkılmaya başladım', 'dayanamıyorum artık'
      ],
      'overwhelmed': [
        'aşırı yüklenmiş', 'bunalmış', 'boğuluyorum', 
        'çok fazla iş', 'çok fazla sorumluluk', 'çok fazla yük',
        'bunalmış hissediyorum', 'başa çıkamıyorum', 'altında eziliyorum'
      ],
      'anxious': [
        'endişeli', 'kaygılı', 'tedirgin', 'korku', 'panik', 'stresli',
        'endişeli hissediyorum', 'kaygılanıyorum', 'panik halindeyim', 'korkuyorum'
      ],
      'hopeful': [
        'umudum var', 'umut var', 'gelecek güzel', 'iyi olacak', 'düzelecek',
        'umutluyum', 'pozitif düşünüyorum', 'iyi şeyler olacak', 'inancım var',
        'rahatladım', 'rahat', 'iyileşecek'
      ],
      'grateful': [
        'minnettar', 'şükür', 'teşekkür', 'minnettarım', 'şükrediyorum',
        'minnettar hissediyorum', 'şükür hissediyorum', 'şanslıyım'
      ],
      'excited': [
        'heyecanlı', 'heyecan', 'coşkulu', 'coşku', 'heyecanlandım',
        'heyecanlıyım', 'heyecanlı hissediyorum', 'heyecandan uçuyorum',
        'enerjik hissediyorum', 'enerji doluyum'
      ],
      'relieved': [
        'rahatladım', 'rahat hissediyorum', 'rahatlama', 'rahat',
        'huzurlu', 'sakin', 'dingin', 'ferahladım'
      ],
      'happy': [
        'mutluyum', 'mutlu', 'iyiyim', 'çok iyiyim', 'daha iyiyim',
        'harika', 'süper', 'mükemmel', 'güzel hissediyorum'
      ]
    };

    // Check for Turkish patterns
    Object.entries(turkishPatterns).forEach(([mood, patterns]) => {
      patterns.forEach(pattern => {
        if (lowerText.includes(normalizeText(pattern))) {
          let score = 2.0; // High score for specific patterns
          
          // Apply intensity modifier
          score *= intensity.multiplier;
          
          // Apply negation penalty
          if (hasNegation) {
            score *= -0.7;
          }
          
          matches.push({
            mood,
            category: 'advanced',
            score,
            matchedPatterns: [pattern],
            intensity: intensity.level,
            hasNegation
          });
        }
      });
    });

    // English specific patterns - mood-specific only, no generic intensifiers
    const englishPatterns = {
      'frustrated': [
        'frustrated', 'annoyed', 'irritated', 'fed up', 'sick of',
        'can\'t take it', 'had enough', 'so annoying'
      ],
      'overwhelmed': [
        'overwhelmed', 'swamped', 'drowning', 'can\'t handle',
        'burned out', 'too much work', 'too much responsibility', 'too many tasks'
      ],
      'anxious': [
        'anxious', 'worried', 'concerned', 'nervous', 'stressed',
        'panic', 'fear', 'scared', 'feeling anxious', 'freaking out'
      ],
      'hopeful': [
        'hopeful', 'optimistic', 'positive', 'looking forward',
        'excited about', 'can\'t wait', 'things will get better'
      ],
      'grateful': [
        'grateful', 'thankful', 'appreciate', 'blessed',
        'lucky', 'fortunate', 'feeling grateful', 'so thankful'
      ],
      'tired': [
        'tired', 'exhausted', 'drained', 'worn out', 'fatigued',
        'sleepy', 'drowsy', 'weary', 'need sleep', 'want to sleep'
      ],
      'sad': [
        'sad', 'depressed', 'down', 'blue', 'melancholy', 'gloomy',
        'miserable', 'unhappy', 'dejected', 'disheartened', 'heartbroken'
      ],
      'angry': [
        'angry', 'mad', 'furious', 'irritated', 'rage',
        'livid', 'outraged', 'fuming', 'upset', 'pissed off'
      ],
      'excited': [
        'excited', 'thrilled', 'enthusiastic', 'pumped', 'hyped',
        'eager', 'elated', 'ecstatic', 'overjoyed', 'can\'t wait'
      ],
      'proud': [
        'proud', 'accomplished', 'achieved', 'successful', 'victorious',
        'triumphant', 'satisfied', 'fulfilled', 'feeling proud'
      ],
      'calm': [
        'calm', 'peaceful', 'relaxed', 'serene', 'tranquil',
        'composed', 'collected', 'chill', 'at peace'
      ]
    };

    // Check for English patterns
    Object.entries(englishPatterns).forEach(([mood, patterns]) => {
      patterns.forEach(pattern => {
        if (lowerText.includes(normalizeText(pattern))) {
          let score = 2.0; // High score for specific patterns
          
          // Apply intensity modifier
          score *= intensity.multiplier;
          
          // Apply negation penalty
          if (hasNegation) {
            score *= -0.7;
          }
          
          matches.push({
            mood,
            category: 'advanced',
            score,
            matchedPatterns: [pattern],
            intensity: intensity.level,
            hasNegation
          });
        }
      });
    });

    // Enhanced phrase matching for English
    this.detectEnglishPhrases(text, matches, intensity, hasNegation);

    // Keyword hints for extended moods (generic match)
    try {
      const kwMap = SemanticAnalyzer.extendedMoodKeywords();
      Object.entries(kwMap).forEach(([mood, keywords]) => {
        keywords.forEach(k => {
          if (lowerText.includes(normalizeText(k))) {
            let score = 1.4;
            if (hasNegation) score *= -0.7;
            score *= intensity.multiplier;
            matches.push({ mood, category: 'keyword_hint', score, matchedPatterns: [k], intensity: intensity.level, hasNegation });
          }
        });
      });
    } catch (e) {
      // ignore if extended keywords not available
    }
  }

  // Enhanced English phrase detection
  detectEnglishPhrases(text, matches, intensity, hasNegation) {
    const lowerText = text.toLowerCase();
    
    // English phrase patterns
    const englishPhrases = {
      'tired': [
        'tired of', 'sick of', 'fed up with', 'had enough of',
        'worn out from', 'exhausted by', 'drained from'
      ],
      'sad': [
        'sad about', 'disappointed in', 'let down by', 'heartbroken over',
        'down about', 'blue about', 'upset about'
      ],
      'angry': [
        'angry at', 'mad at', 'furious with', 'upset with',
        'irritated by', 'annoyed by', 'frustrated with'
      ],
      'excited': [
        'excited about', 'thrilled about', 'pumped for', 'hyped for',
        'looking forward to', 'can\'t wait for', 'eager for'
      ],
      'grateful': [
        'grateful for', 'thankful for', 'appreciate the', 'blessed with',
        'lucky to have', 'fortunate to have'
      ],
      'hopeful': [
        'hopeful for', 'optimistic about', 'positive about', 'confident in',
        'believing in', 'trusting in'
      ],
      'anxious': [
        'anxious about', 'worried about', 'concerned about', 'nervous about',
        'stressed about', 'fearful of', 'scared of'
      ],
      'overwhelmed': [
        'overwhelmed by', 'swamped with', 'drowning in', 'buried under',
        'can\'t handle', 'too much to', 'burned out from'
      ]
    };

    // Check for phrase patterns
    Object.entries(englishPhrases).forEach(([mood, phrases]) => {
      phrases.forEach(phrase => {
        if (lowerText.includes(normalizeText(phrase))) {
          let score = 3.0; // Higher score for phrases (more specific)
          
          // Apply intensity modifier
          score *= intensity.multiplier;
          
          // Apply negation penalty
          if (hasNegation) {
            score *= -0.7;
          }
          
          matches.push({
            mood,
            category: 'phrase',
            score,
            matchedPatterns: [phrase],
            intensity: intensity.level,
            hasNegation
          });
        }
      });
    });
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
    if (total <= 1) return 1.0; // Single sentence
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
      const firstPattern = normalizeText(match.matchedPatterns[0] || '');
      const context = contexts.find(c => 
        normalizeText(c.sentence).includes(firstPattern)
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
    const words = normalizeText(text).split(/\s+/);
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
        { mood: 'natural', confidence: 0.4, reason: 'Sistem güvenilirliği düşük - Natural mode öneriliyor' },
        { mood: 'calm', confidence: 0.3, reason: 'No clear mood detected' }
      ];
    }
    
    if (confidence.level === 'low') {
      return [
        { mood: 'natural', confidence: 0.5, reason: 'Düşük güvenilirlik - Natural mode öneriliyor' },
        { mood: 'calm', confidence: 0.4, reason: 'Low confidence fallback' }
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
  logger.debug('Boosting pattern for:', prediction.mood);
      });
      
      // Learn from failed predictions
      failedPredictions.forEach(prediction => {
        // This would adjust pattern weights
  logger.debug('Learning from failed prediction:', prediction.mood);
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
    this.semanticAnalyzer = new SemanticAnalyzer(); // NEW: Advanced semantic analysis
    
    // Performance optimization - Cache system
    this.cache = new Map();
    this.cacheMaxSize = 100;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Initialize user data
    this.userLearning.loadUserData();
  }

  // Cache management methods
  generateCacheKey(text, userHistory = []) {
    const textHash = text.toLowerCase().trim();
    const historyHash = userHistory.length > 0 ? 
      userHistory.slice(-5).map(h => h.mood || '').join(',') : '';
    return `${textHash}_${historyHash}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key); // Remove expired cache
    }
    return null;
  }

  setCache(key, data) {
    // Clean cache if it's too large
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
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

      // Check cache first
      const cacheKey = this.generateCacheKey(text, userHistory);
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        return { ...cachedResult, fromCache: true };
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
      let confidence = this.confidenceScorer.calculateConfidence(
        weightedMatches, 
        contexts[0], 
        userPrediction
      );
      
      // 5. Determine preliminary mood
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
      
      // 6. NEW: Semantic Analysis - Advanced context understanding
      const semanticAnalysis = this.semanticAnalyzer.analyzeSemantics(text, finalMood, confidence.score);
      
      // Handle sentiment flow (e.g., "I was sad BUT now I'm happy")
      if (semanticAnalysis.sentimentFlow.hasFlow && semanticAnalysis.sentimentFlow.flowType === 'contrast') {
        // Re-analyze the emphasized part
        const emphasizedText = semanticAnalysis.sentimentFlow.emphasis === 'latter' 
          ? semanticAnalysis.sentimentFlow.afterPart 
          : text;
        
        if (emphasizedText && emphasizedText.length > 3) {
          const reMatches = this.patternMatcher.matchPatterns(emphasizedText);
          if (reMatches.length > 0) {
            const reTopMatch = reMatches[0];
            if (Math.abs(reTopMatch.score) > 0.4) {
              finalMood = reTopMatch.mood;
              reason = `Contrast detected: ${semanticAnalysis.sentimentFlow.reason} - Focus on latter part`;
              semanticAnalysis.adjustmentReasons.push('Sentiment flow adjusted mood');
            }
          }
        }
      }
      
      // Update confidence with semantic adjustments
      confidence = {
        ...confidence,
        score: semanticAnalysis.adjustedConfidence,
        level: semanticAnalysis.adjustedConfidence > 0.7 ? 'high' : 
               semanticAnalysis.adjustedConfidence > 0.5 ? 'medium' :
               semanticAnalysis.adjustedConfidence > 0.3 ? 'low' : 'very_low',
        factors: [...confidence.factors, ...semanticAnalysis.adjustmentReasons]
      };
      
      // 7. Real-time Adaptation
      this.realTimeAdapter.trackPrediction(finalMood, text, confidence.score, null);
      
      const result = {
        mood: finalMood,
        confidence,
        reason,
        matches: weightedMatches,
        userPrediction,
        context: contexts,
        semanticAnalysis: semanticAnalysis // NEW: Include semantic analysis in result
      };

      // Cache the result
      this.setCache(cacheKey, result);
      
      return result;
      
    } catch (error) {
  logger.error('Mood detection error:', error);
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
  logger.debug('getMoodSuggestions called with text:', text);
      const detection = await this.detectMood(text);
  logger.debug('Detection result:', detection);
      const suggestions = [];
      
      // Primary suggestion from extended moods - Always provide suggestion
      if (detection.confidence.score > 0.01) { // Very low threshold
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
      
      // If no primary suggestion, try text-based fallback
      if (suggestions.length === 0) {
        const lowerText = text.toLowerCase();
        
        // Check for specific Turkish phrases
        if (lowerText.includes('can sıkıcı') || lowerText.includes('sıkıcı') || lowerText.includes('bıktım')) {
          const frustratedMood = EXTENDED_MOODS.find(m => m.key === 'frustrated');
          if (frustratedMood) {
            suggestions.push({
              mood: 'frustrated',
              label: frustratedMood.label,
              icon: frustratedMood.icon,
              color: frustratedMood.color,
              confidence: 0.6,
              reason: 'Text contains frustration indicators',
              type: 'text_fallback'
            });
          }
        } else if (lowerText.includes('umudum') || lowerText.includes('umut')) {
          const hopefulMood = EXTENDED_MOODS.find(m => m.key === 'hopeful');
          if (hopefulMood) {
            suggestions.push({
              mood: 'hopeful',
              label: hopefulMood.label,
              icon: hopefulMood.icon,
              color: hopefulMood.color,
              confidence: 0.6,
              reason: 'Text contains hope indicators',
              type: 'text_fallback'
            });
          }
        }
      }
      
      // Alternative suggestions from extended moods - NO DUPLICATES
      if (detection.matches.length > 1) {
        const usedMoods = new Set(suggestions.map(s => s.mood)); // Track used moods
        
        detection.matches.slice(1, 3).forEach(match => {
          if (Math.abs(match.score) > 0.1 && !usedMoods.has(match.mood)) {
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
              usedMoods.add(match.mood); // Mark as used
            }
          }
        });
      }
      
      // Fallback suggestions from extended moods - Always provide at least one suggestion
      if (suggestions.length === 0) {
        const usedMoods = new Set(suggestions.map(s => s.mood)); // Track used moods
        const fallbacks = this.confidenceScorer.getFallbackSuggestions(detection.confidence);
        
        fallbacks.forEach(fallback => {
          if (!usedMoods.has(fallback.mood)) {
            const suggestedMood = EXTENDED_MOODS.find(m => m.key === fallback.mood);
            if (suggestedMood) {
              suggestions.push({
                ...fallback,
                label: suggestedMood.label,
                icon: suggestedMood.icon,
                color: suggestedMood.color
              });
              usedMoods.add(fallback.mood); // Mark as used
            }
          }
        });
        
        // If still no suggestions, provide calm as default
        if (suggestions.length === 0 && !usedMoods.has('calm')) {
          const calmMood = EXTENDED_MOODS.find(m => m.key === 'calm');
          if (calmMood) {
            suggestions.push({
              mood: 'calm',
              label: calmMood.label,
              icon: calmMood.icon,
              color: calmMood.color,
              confidence: 0.3,
              reason: 'Default calm suggestion',
              type: 'fallback'
            });
          }
        }
      }
      
      // Final deduplication - Remove any remaining duplicates
      const finalSuggestions = [];
      const seenMoods = new Set();
      
      suggestions.forEach(suggestion => {
        if (!seenMoods.has(suggestion.mood)) {
          finalSuggestions.push(suggestion);
          seenMoods.add(suggestion.mood);
        }
      });
      
      return finalSuggestions;
      
    } catch (error) {
  logger.error('Mood suggestions error:', error);
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
      
  logger.debug('Learned from user:', { mood, text, confidence });
      
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

// Export getMoodSuggestions function
export const getMoodSuggestions = async (text, currentMood = null) => {
  return await smartMoodDetector.getMoodSuggestions(text, currentMood);
};

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
    "psychology-alt": "psychology",
    "warning": "warning",
    "favorite": "favorite",
    "wb-sunny": "wb-sunny",
    "history": "history",
    "trending-up": "trending-up",
    "person-off": "person-off",
    "self-improvement": "self-improvement",
    "help": "help",
    "help-outline": "help",
    "emoji-events": "emoji-events",
    "explore": "explore",
    "sentiment-neutral": "sentiment-neutral",
    "sentiment-very-satisfied": "sentiment-satisfied",
    "sentiment-very-dissatisfied": "sentiment-dissatisfied",
    "surprise": "surprise"
  };
  return fallback[name] ? fallback[name] : name;
};
