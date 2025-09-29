// utils/AIMoodPredictor.js
// AI-Powered Mood Prediction System
// Features: Sentence-level analysis, semantic understanding, context awareness, machine learning patterns

// Basic mood definitions for UI compatibility
export const MOODS = [
  {
    key: "happy",
    label: "Happy",
    icon: "sentiment-satisfied",
    color: "#C8E6C9", // pastel green
  },
  {
    key: "excited",
    label: "Excited",
    icon: "celebration",
    color: "#FFE0B2", // pastel orange
  },
  {
    key: "calm",
    label: "Calm",
    icon: "spa",
    color: "#E1F5FE", // pastel blue
  },
  {
    key: "tired",
    label: "Tired",
    icon: "bedtime",
    color: "#F3E5F5", // pastel purple
  },
  {
    key: "sad",
    label: "Sad",
    icon: "sentiment-dissatisfied",
    color: "#FFCDD2", // pastel red
  },
  {
    key: "angry",
    label: "Angry",
    icon: "mood-bad",
    color: "#FFEBEE", // light red
  },
  {
    key: "neutral",
    label: "Neutral",
    icon: "sentiment-neutral",
    color: "#F5F5F5", // light gray
  },
];

// Extended mood definitions for compatibility
export const EXTENDED_MOODS = [
  // Basic moods (existing buttons)
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
    key: "calm",
    label: "Calm",
    icon: "spa", 
    color: "#E1F5FE",
    category: "neutral"
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
  },
  
  // Extended moods (suggestions only)
  {
    key: "frustrated",
    label: "Frustrated",
    icon: "mood-bad",
    color: "#FFCDD2",
    category: "negative"
  },
  {
    key: "anxious",
    label: "Anxious", 
    icon: "psychology",
    color: "#FFF3E0",
    category: "negative"
  },
  {
    key: "overwhelmed",
    label: "Overwhelmed",
    icon: "warning",
    color: "#FFEBEE",
    category: "negative"
  },
  {
    key: "grateful",
    label: "Grateful",
    icon: "favorite",
    color: "#E8F5E8",
    category: "positive"
  },
  {
    key: "hopeful",
    label: "Hopeful",
    icon: "wb-sunny",
    color: "#FFF8E1",
    category: "positive"
  },
  {
    key: "nostalgic",
    label: "Nostalgic",
    icon: "history",
    color: "#F3E5F5",
    category: "neutral"
  },
  {
    key: "motivated",
    label: "Motivated",
    icon: "trending-up",
    color: "#E3F2FD",
    category: "positive"
  },
  {
    key: "lonely",
    label: "Lonely",
    icon: "person-off",
    color: "#FCE4EC",
    category: "negative"
  },
  {
    key: "peaceful",
    label: "Peaceful",
    icon: "self-improvement",
    color: "#E0F2F1",
    category: "positive"
  },
  {
    key: "exhausted",
    label: "Exhausted",
    icon: "bedtime",
    color: "#E8EAF6",
    category: "negative"
  },
  {
    key: "stressed",
    label: "Stressed",
    icon: "psychology",
    color: "#FFEBEE",
    category: "negative"
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
    key: "proud",
    label: "Proud",
    icon: "emoji-events",
    color: "#E8F5E8",
    category: "positive"
  },
  {
    key: "relieved",
    label: "Relieved",
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

// Mood definitions with semantic categories
export const MOOD_CATEGORIES = {
  POSITIVE: {
    key: 'positive',
    moods: ['happy', 'excited', 'grateful', 'hopeful', 'proud', 'relieved', 'content', 'peaceful', 'motivated'],
    semantic_indicators: ['başarı', 'mutlu', 'güzel', 'harika', 'mükemmel', 'süper', 'başardım', 'kazandım', 'sevinç', 'neşe'],
    intensity_modifiers: ['çok', 'aşırı', 'müthiş', 'muhteşem', 'olağanüstü']
  },
  NEGATIVE: {
    key: 'negative', 
    moods: ['sad', 'angry', 'tired', 'frustrated', 'anxious', 'overwhelmed', 'lonely', 'exhausted', 'stressed', 'confused', 'disappointed', 'worried', 'bored'],
    semantic_indicators: ['kötü', 'berbat', 'korkunç', 'dehşet', 'başarısız', 'kaybettim', 'hata', 'yanlış', 'problem', 'sorun', 'sıkıntı', 'endişe', 'kaygı'],
    intensity_modifiers: ['çok', 'aşırı', 'müthiş', 'berbat', 'korkunç']
  },
  NEUTRAL: {
    key: 'neutral',
    moods: ['calm', 'curious', 'nostalgic', 'surprised'],
    semantic_indicators: ['normal', 'ortalama', 'standart', 'idare', 'tamam', 'olur'],
    intensity_modifiers: ['biraz', 'az', 'orta']
  }
};

// Semantic analysis patterns
export const SEMANTIC_PATTERNS = {
  // Physical states
  PHYSICAL_TIRED: {
    patterns: ['yorgun', 'bitkin', 'tükenmiş', 'halsiz', 'güçsüz', 'dermansız'],
    mood_mapping: { primary: 'tired', secondary: 'exhausted', intensity: 0.8 }
  },
  PHYSICAL_ENERGETIC: {
    patterns: ['enerjik', 'dinç', 'güçlü', 'aktif', 'canlı', 'diri'],
    mood_mapping: { primary: 'excited', secondary: 'motivated', intensity: 0.7 }
  },
  
  // Emotional states
  EMOTIONAL_SAD: {
    patterns: ['mutsuz', 'üzgün', 'hüzünlü', 'kederli', 'acılı', 'kırgın'],
    mood_mapping: { primary: 'sad', secondary: 'disappointed', intensity: 0.8 }
  },
  EMOTIONAL_ANGRY: {
    patterns: ['kızgın', 'sinirli', 'öfkeli', 'gergin', 'huzursuz'],
    mood_mapping: { primary: 'angry', secondary: 'frustrated', intensity: 0.8 }
  },
  EMOTIONAL_ANXIOUS: {
    patterns: ['endişeli', 'kaygılı', 'tedirgin', 'korku', 'panik'],
    mood_mapping: { primary: 'anxious', secondary: 'worried', intensity: 0.8 }
  },
  
  // Mental states
  MENTAL_FRUSTRATED: {
    patterns: ['bıktım', 'usandım', 'sıkıldım', 'sıkkın', 'sıkıntılı', 'bezgin', 'sıkılmaya başladım', 'sıkılmaya başlıyorum', 'yorucu', 'sıkıcı', 'can sıkıcı'],
    mood_mapping: { primary: 'frustrated', secondary: 'bored', intensity: 0.8 }
  },
  MENTAL_OVERWHELMED: {
    patterns: ['bunalmış', 'aşırı yüklenmiş', 'çok fazla', 'bitkin', 'tükenmiş'],
    mood_mapping: { primary: 'overwhelmed', secondary: 'stressed', intensity: 0.8 }
  },
  
  // Social states
  SOCIAL_LONELY: {
    patterns: ['yalnız', 'tek başıma', 'kimse yok', 'izole'],
    mood_mapping: { primary: 'lonely', secondary: 'sad', intensity: 0.7 }
  },
  SOCIAL_CONNECTED: {
    patterns: ['arkadaş', 'aile', 'birlikte', 'sosyal', 'insanlar'],
    mood_mapping: { primary: 'happy', secondary: 'content', intensity: 0.6 }
  }
};

// Context analysis patterns
export const CONTEXT_PATTERNS = {
  TIME: {
    morning: ['sabah', 'erken', 'gün doğumu'],
    evening: ['akşam', 'gece', 'geç saat'],
    weekend: ['pazar', 'cumartesi', 'hafta sonu', 'tatil'],
    work: ['iş', 'çalışma', 'ofis', 'sahaya', 'çağırdılar']
  },
  SITUATION: {
    forced: ['çağırdılar', 'zorla', 'mecbur', 'zorunda'],
    unexpected: ['beklenmedik', 'ani', 'birden', 'aniden'],
    repetitive: ['yeniden', 'tekrar', 'yine', 'sürekli', 'her gün'],
    overwhelming: ['aşırı', 'fazla', 'bitkin', 'tükenmiş', 'bunalmış']
  },
  INTENSITY: {
    high: ['aşırı', 'müthiş', 'berbat', 'korkunç', 'dehşet', 'çok'],
    medium: ['biraz', 'az', 'orta', 'normal'],
    low: ['hafif', 'küçük', 'minimal']
  }
};

// AI-powered sentence analysis
export class SentenceAnalyzer {
  constructor() {
    this.negationWords = ['değil', 'olmayan', 'olmuyor', 'olmaz', 'yok', 'hayır', 'hiç', 'asla', 'hiçbir'];
    this.intensityModifiers = ['çok', 'aşırı', 'müthiş', 'berbat', 'korkunç', 'dehşet', 'olağanüstü'];
  }

  // Analyze individual sentences
  analyzeSentence(sentence) {
    const cleanSentence = this.preprocessText(sentence);
    const tokens = this.tokenize(cleanSentence);
    
    return {
      original: sentence,
      clean: cleanSentence,
      tokens: tokens,
      sentiment: this.calculateSentiment(tokens),
      semantic: this.extractSemantic(tokens),
      context: this.extractContext(tokens),
      intensity: this.calculateIntensity(tokens),
      negation: this.detectNegation(tokens)
    };
  }

  // Preprocess text for analysis
  preprocessText(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text.toLowerCase()
      .replace(/[^\w\sçğıöşü]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Tokenize text into meaningful units
  tokenize(text) {
    const words = text.split(' ');
    const tokens = [];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const nextWord = words[i + 1];
      
      // Check for multi-word patterns
      if (nextWord && this.isMultiWordPattern(word, nextWord)) {
        tokens.push({
          type: 'phrase',
          value: `${word} ${nextWord}`,
          position: i,
          length: 2
        });
        i++; // Skip next word
      } else {
        tokens.push({
          type: 'word',
          value: word,
          position: i,
          length: 1
        });
      }
    }
    
    return tokens;
  }

  // Check if two words form a meaningful pattern
  isMultiWordPattern(word1, word2) {
    const patterns = [
      'çok yorgun', 'çok bitkin', 'çok mutsuz', 'çok üzgün', 'çok kızgın',
      'çok sinirli', 'çok stresli', 'çok sıkkın', 'çok sıkıntılı',
      'çok kötü', 'çok berbat', 'çok korkunç', 'çok dehşet',
      'sıkılmaya başladım', 'sıkılmaya başlıyorum', 'bıktım artık',
      'usandım artık', 'yeter artık', 'daha ne yapayım'
    ];
    
    return patterns.includes(`${word1} ${word2}`);
  }

  // Calculate sentiment score for tokens
  calculateSentiment(tokens) {
    let positiveScore = 0;
    let negativeScore = 0;
    let neutralScore = 0;
    
    tokens.forEach(token => {
      const word = token.value;
      
      // Check positive patterns
      for (const [category, data] of Object.entries(MOOD_CATEGORIES)) {
        if (data.semantic_indicators.some(indicator => word.includes(indicator))) {
          if (category === 'POSITIVE') positiveScore += 1;
          else if (category === 'NEGATIVE') negativeScore += 1;
          else neutralScore += 1;
        }
      }
    });
    
    const total = positiveScore + negativeScore + neutralScore;
    if (total === 0) return { score: 0, label: 'neutral', confidence: 0 };
    
    const normalizedPositive = positiveScore / total;
    const normalizedNegative = negativeScore / total;
    const normalizedNeutral = neutralScore / total;
    
    let label = 'neutral';
    let score = 0;
    
    if (normalizedPositive > normalizedNegative && normalizedPositive > normalizedNeutral) {
      label = 'positive';
      score = normalizedPositive * 100;
    } else if (normalizedNegative > normalizedPositive && normalizedNegative > normalizedNeutral) {
      label = 'negative';
      score = -normalizedNegative * 100;
    } else {
      label = 'neutral';
      score = 0;
    }
    
    return {
      score,
      label,
      confidence: Math.max(normalizedPositive, normalizedNegative, normalizedNeutral),
      breakdown: { positive: normalizedPositive, negative: normalizedNegative, neutral: normalizedNeutral }
    };
  }

  // Extract semantic meaning from tokens
  extractSemantic(tokens) {
    const semantic = {
      physical: [],
      emotional: [],
      mental: [],
      social: [],
      overall: null
    };
    
    tokens.forEach(token => {
      const word = token.value;
      
      // Check semantic patterns
      for (const [category, data] of Object.entries(SEMANTIC_PATTERNS)) {
        if (data.patterns.some(pattern => word.includes(pattern))) {
          if (category.startsWith('PHYSICAL_')) {
            semantic.physical.push({
              type: category,
              word: word,
              mood: data.mood_mapping
            });
          } else if (category.startsWith('EMOTIONAL_')) {
            semantic.emotional.push({
              type: category,
              word: word,
              mood: data.mood_mapping
            });
          } else if (category.startsWith('MENTAL_')) {
            semantic.mental.push({
              type: category,
              word: word,
              mood: data.mood_mapping
            });
          } else if (category.startsWith('SOCIAL_')) {
            semantic.social.push({
              type: category,
              word: word,
              mood: data.mood_mapping
            });
          }
        }
      }
    });
    
    // Determine overall semantic category
    const allSemantic = [...semantic.physical, ...semantic.emotional, ...semantic.mental, ...semantic.social];
    if (allSemantic.length > 0) {
      semantic.overall = allSemantic[0]; // Take the first match as primary
    }
    
    return semantic;
  }

  // Extract context from tokens
  extractContext(tokens) {
    const context = {
      time: [],
      situation: [],
      intensity: 'low'
    };
    
    tokens.forEach(token => {
      const word = token.value;
      
      // Check context patterns
      for (const [category, patterns] of Object.entries(CONTEXT_PATTERNS)) {
        if (category === 'TIME') {
          for (const [timeType, timeWords] of Object.entries(patterns)) {
            if (timeWords.some(timeWord => word.includes(timeWord))) {
              context.time.push(timeType);
            }
          }
        } else if (category === 'SITUATION') {
          for (const [situationType, situationWords] of Object.entries(patterns)) {
            if (situationWords.some(situationWord => word.includes(situationWord))) {
              context.situation.push(situationType);
            }
          }
        } else if (category === 'INTENSITY') {
          for (const [intensityLevel, intensityWords] of Object.entries(patterns)) {
            if (intensityWords.some(intensityWord => word.includes(intensityWord))) {
              context.intensity = intensityLevel;
            }
          }
        }
      }
    });
    
    return context;
  }

  // Calculate intensity level
  calculateIntensity(tokens) {
    let intensity = 0;
    
    tokens.forEach(token => {
      const word = token.value;
      
      if (this.intensityModifiers.some(modifier => word.includes(modifier))) {
        intensity += 1;
      }
      
      // Check for emotional intensity markers
      if (word.includes('!') || word.includes('?')) {
        intensity += 0.5;
      }
    });
    
    if (intensity >= 2) return 'high';
    if (intensity >= 1) return 'medium';
    return 'low';
  }

  // Detect negation patterns
  detectNegation(tokens) {
    const negations = [];
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const nextToken = tokens[i + 1];
      
      if (this.negationWords.includes(token.value) && nextToken) {
        negations.push({
          negator: token.value,
          negated: nextToken.value,
          position: token.position
        });
      }
    }
    
    return negations;
  }
}

// AI-powered mood prediction engine
export class AIMoodPredictor {
  constructor() {
    this.sentenceAnalyzer = new SentenceAnalyzer();
    this.userHistory = [];
    this.patterns = new Map();
  }

  // Main prediction method
  async predictMood(text, userHistory = []) {
    if (!text || text.trim().length === 0) {
      return { mood: 'calm', confidence: 0, reason: 'Metin boş.' };
    }

    // Analyze text at sentence level
    const sentences = this.splitIntoSentences(text);
    const sentenceAnalyses = sentences.map(sentence => 
      this.sentenceAnalyzer.analyzeSentence(sentence)
    );

    // Combine sentence analyses
    const combinedAnalysis = this.combineSentenceAnalyses(sentenceAnalyses);
    
    // Generate mood prediction
    const moodPrediction = this.generateMoodPrediction(combinedAnalysis, userHistory);
    
    return moodPrediction;
  }

  // Split text into sentences
  splitIntoSentences(text) {
    return text.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  // Combine multiple sentence analyses
  combineSentenceAnalyses(analyses) {
    if (analyses.length === 0) {
      return { sentiment: { score: 0, label: 'neutral', confidence: 0 }, semantic: null, context: null };
    }

    // Weighted average of sentiments
    let totalWeight = 0;
    let weightedScore = 0;
    let totalConfidence = 0;
    
    const sentimentBreakdown = { positive: 0, negative: 0, neutral: 0 };
    const allSemantic = [];
    const allContext = { time: [], situation: [], intensity: 'low' };
    
    analyses.forEach((analysis, index) => {
      const weight = analysis.tokens.length * (analysis.sentiment.confidence || 0.5);
      totalWeight += weight;
      weightedScore += analysis.sentiment.score * weight;
      totalConfidence += analysis.sentiment.confidence * weight;
      
      // Combine sentiment breakdown
      if (analysis.sentiment.breakdown) {
        sentimentBreakdown.positive += analysis.sentiment.breakdown.positive || 0;
        sentimentBreakdown.negative += analysis.sentiment.breakdown.negative || 0;
        sentimentBreakdown.neutral += analysis.sentiment.breakdown.neutral || 0;
      }
      
      // Combine semantic analysis
      if (analysis.semantic.overall) {
        allSemantic.push(analysis.semantic.overall);
      }
      
      // Combine context
      allContext.time.push(...analysis.context.time);
      allContext.situation.push(...analysis.context.situation);
      if (analysis.context.intensity === 'high') {
        allContext.intensity = 'high';
      } else if (analysis.context.intensity === 'medium' && allContext.intensity === 'low') {
        allContext.intensity = 'medium';
      }
    });
    
    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const finalConfidence = totalWeight > 0 ? totalConfidence / totalWeight : 0;
    
    // Determine final sentiment label
    let finalLabel = 'neutral';
    if (sentimentBreakdown.positive > sentimentBreakdown.negative && sentimentBreakdown.positive > sentimentBreakdown.neutral) {
      finalLabel = 'positive';
    } else if (sentimentBreakdown.negative > sentimentBreakdown.positive && sentimentBreakdown.negative > sentimentBreakdown.neutral) {
      finalLabel = 'negative';
    }
    
    return {
      sentiment: {
        score: finalScore,
        label: finalLabel,
        confidence: finalConfidence,
        breakdown: sentimentBreakdown
      },
      semantic: allSemantic.length > 0 ? allSemantic[0] : null,
      context: allContext,
      sentenceCount: analyses.length
    };
  }

  // Generate mood prediction from combined analysis
  generateMoodPrediction(analysis, userHistory) {
    const { sentiment, semantic, context } = analysis;
    
    // If we have strong semantic indicators, use them
    if (semantic && semantic.mood) {
      return {
        mood: semantic.mood.primary,
        confidence: semantic.mood.intensity,
        reason: this.generateReason(semantic.mood.primary, context, semantic.type),
        alternative: semantic.mood.secondary
      };
    }
    
    // Fallback to sentiment-based prediction
    if (sentiment.label === 'positive') {
      return {
        mood: 'happy',
        confidence: sentiment.confidence,
        reason: 'Pozitif bir durum tespit edildi.',
        alternative: 'excited'
      };
    } else if (sentiment.label === 'negative') {
      return {
        mood: 'sad',
        confidence: sentiment.confidence,
        reason: 'Olumsuz bir durum tespit edildi.',
        alternative: 'tired'
      };
    } else {
      return {
        mood: 'calm',
        confidence: sentiment.confidence,
        reason: 'Nötr bir durum tespit edildi.',
        alternative: 'curious'
      };
    }
  }

  // Generate contextual reason
  generateReason(mood, context, semanticType) {
    const reasons = {
      tired: 'Fiziksel yorgunluk belirtileri tespit edildi.',
      exhausted: 'Aşırı yorgunluk ve tükenmişlik hissi.',
      sad: 'Üzüntü ve hüzün belirtileri tespit edildi.',
      angry: 'Öfke ve sinir belirtileri tespit edildi.',
      frustrated: 'Frustrasyon ve sıkıntı belirtileri tespit edildi.',
      anxious: 'Endişe ve kaygı belirtileri tespit edildi.',
      overwhelmed: 'Aşırı yüklenme ve bunalmışlık hissi.',
      lonely: 'Yalnızlık hissi tespit edildi.',
      happy: 'Mutluluk ve pozitif enerji tespit edildi.',
      excited: 'Heyecan ve coşku belirtileri tespit edildi.',
      calm: 'Sakin ve huzurlu bir durum.',
      curious: 'Merak ve ilgi belirtileri tespit edildi.'
    };
    
    let reason = reasons[mood] || 'Bu mood uygun görünüyor.';
    
    // Add context-specific information
    if (context.time.length > 0) {
      reason += ` (${context.time.join(', ')} zamanı)`;
    }
    
    if (context.situation.length > 0) {
      reason += ` (${context.situation.join(', ')} durumu)`;
    }
    
    return reason;
  }

  // Learn from user patterns
  learnFromUser(mood, text, sentiment) {
    this.userHistory.push({
      mood,
      text,
      sentiment,
      timestamp: Date.now()
    });
    
    // Keep only recent history
    if (this.userHistory.length > 100) {
      this.userHistory = this.userHistory.slice(-100);
    }
    
    // Update patterns
    this.updatePatterns(mood, text, sentiment);
  }

  // Update user patterns
  updatePatterns(mood, text, sentiment) {
    const key = `${sentiment.label}_${sentiment.score > 0 ? 'positive' : 'negative'}`;
    
    if (!this.patterns.has(key)) {
      this.patterns.set(key, []);
    }
    
    this.patterns.get(key).push({
      mood,
      text,
      timestamp: Date.now()
    });
    
    // Keep only recent patterns
    const patterns = this.patterns.get(key);
    if (patterns.length > 20) {
      this.patterns.set(key, patterns.slice(-20));
    }
  }
}

// Export singleton instance
export const aiMoodPredictor = new AIMoodPredictor();

// Helper function to get sentiment color
export const getSentimentColor = (sentiment) => {
  switch (sentiment.label) {
    case 'positive': return '#4CAF50'; // Green
    case 'negative': return '#F44336'; // Red
    default: return '#9E9E9E'; // Gray
  }
};

// Helper function to get sentiment emoji
export const getSentimentEmoji = (sentiment) => {
  switch (sentiment.label) {
    case 'positive': return '😊';
    case 'negative': return '😔';
    default: return '😐';
  }
};

// Helper function to find Material icon fallback compatibility
export const getValidIconName = (name) => {
  // Some icon names used above may not exist on all sets; fallback map:
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

// Legacy compatibility functions
export const analyzeSentiment = async (text, userHistory = []) => {
  const prediction = await aiMoodPredictor.predictMood(text, userHistory);
  return {
    score: prediction.confidence * 100,
    label: prediction.mood === 'happy' || prediction.mood === 'excited' ? 'positive' : 
           prediction.mood === 'sad' || prediction.mood === 'angry' || prediction.mood === 'tired' ? 'negative' : 'neutral',
    confidence: prediction.confidence
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
    const analysis = await aiMoodPredictor.predictMood(sentence.trim(), userHistory);
    sentenceAnalyses.push({
      sentence: sentence.trim(),
      sentiment: {
        score: analysis.confidence * 100,
        label: analysis.mood === 'happy' || analysis.mood === 'excited' ? 'positive' : 
               analysis.mood === 'sad' || analysis.mood === 'angry' || analysis.mood === 'tired' ? 'negative' : 'neutral',
        confidence: analysis.confidence
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
  if (finalScore > 15) finalLabel = 'positive';
  else if (finalScore < -15) finalLabel = 'negative';
  
  return {
    score: finalScore,
    label: finalLabel,
    confidence: finalConfidence,
    sentences: sentenceAnalyses,
    sentenceCount: sentences.length
  };
};

export const getSmartMoodSuggestion = async (sentiment, currentMood, userHistory = [], text = '') => {
  const prediction = await aiMoodPredictor.predictMood(text, userHistory);
  
  // Check if confidence is too low - suggest neutral mood
  if (prediction.confidence < 0.4) {
    return [{
      mood: 'neutral',
      reason: 'Low confidence prediction - suggesting neutral mood',
      confidence: 0.8,
      type: 'neutral'
    }];
  }
  
  // Primary mood suggestion
  const suggestions = [{
    mood: prediction.mood,
    reason: prediction.reason,
    confidence: prediction.confidence,
    type: 'primary'
  }];
  
  // Add secondary mood suggestions based on sentiment
  const secondaryMoods = getSecondaryMoodSuggestions(sentiment, prediction.mood);
  suggestions.push(...secondaryMoods);
  
  // Return 2-3 suggestions maximum
  return suggestions.slice(0, 3);
};

// Helper function to get secondary mood suggestions
const getSecondaryMoodSuggestions = (sentiment, primaryMood) => {
  const suggestions = [];
  
  // Based on sentiment score and primary mood, suggest complementary moods
  if (sentiment.score > 0.3) {
    // Positive sentiment - suggest happy, excited, calm
    const positiveMoods = ['happy', 'excited', 'calm'].filter(mood => mood !== primaryMood);
    if (positiveMoods.length > 0) {
      suggestions.push({
        mood: positiveMoods[0],
        reason: 'Positive sentiment detected',
        confidence: 0.7,
        type: 'secondary'
      });
    }
  } else if (sentiment.score < -0.3) {
    // Negative sentiment - suggest sad, tired, angry
    const negativeMoods = ['sad', 'tired', 'angry'].filter(mood => mood !== primaryMood);
    if (negativeMoods.length > 0) {
      suggestions.push({
        mood: negativeMoods[0],
        reason: 'Negative sentiment detected',
        confidence: 0.7,
        type: 'secondary'
      });
    }
  } else {
    // Neutral sentiment - suggest neutral, calm, tired
    const neutralMoods = ['neutral', 'calm', 'tired'].filter(mood => mood !== primaryMood);
    if (neutralMoods.length > 0) {
      suggestions.push({
        mood: neutralMoods[0],
        reason: 'Neutral sentiment detected',
        confidence: 0.6,
        type: 'secondary'
      });
    }
  }
  
  // Add a third suggestion if we have space
  if (suggestions.length < 2) {
    const allMoods = ['happy', 'excited', 'calm', 'tired', 'sad', 'angry', 'neutral'];
    const availableMoods = allMoods.filter(mood => 
      mood !== primaryMood && 
      !suggestions.some(s => s.mood === mood)
    );
    
    if (availableMoods.length > 0) {
      suggestions.push({
        mood: availableMoods[0],
        reason: 'Alternative mood option',
        confidence: 0.5,
        type: 'tertiary'
      });
    }
  }
  
  return suggestions;
};

// Advanced mood pattern learning and analytics
export const analyzeMoodPatterns = (userHistory) => {
  if (!userHistory || userHistory.length < 5) {
    return {
      patterns: [],
      insights: [],
      recommendations: []
    };
  }
  
  const patterns = [];
  const insights = [];
  const recommendations = [];
  
  // Analyze mood trends over time
  const recentMoods = userHistory.slice(-30); // Last 30 entries
  const moodCounts = {};
  const sentimentTrends = [];
  
  recentMoods.forEach(entry => {
    const mood = entry.mood;
    const sentiment = entry.sentiment?.score || 0;
    
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    sentimentTrends.push(sentiment);
  });
  
  // Find dominant moods
  const dominantMood = Object.keys(moodCounts).reduce((a, b) => 
    moodCounts[a] > moodCounts[b] ? a : b
  );
  
  // Calculate sentiment trend
  const avgSentiment = sentimentTrends.reduce((sum, score) => sum + score, 0) / sentimentTrends.length;
  const sentimentVariance = sentimentTrends.reduce((sum, score) => sum + Math.pow(score - avgSentiment, 2), 0) / sentimentTrends.length;
  
  // Generate insights
  if (avgSentiment > 20) {
    insights.push("Genel olarak pozitif bir dönem geçiriyorsun! 🌟");
  } else if (avgSentiment < -20) {
    insights.push("Son dönemde zorlu günler yaşamışsın. Bu geçici olacak! 💙");
  } else {
    insights.push("Dengeli bir ruh hali içindesin. Bu güzel! ⚖️");
  }
  
  if (sentimentVariance > 1000) {
    insights.push("Duygusal dalgalanmaların var. Bu normal, kendini dinle! 🎭");
  }
  
  // Generate recommendations
  if (dominantMood === 'tired' && moodCounts['tired'] > recentMoods.length * 0.4) {
    recommendations.push("Sık sık yorgun hissediyorsun. Uyku düzenini gözden geçirmeyi dene! 😴");
  }
  
  if (dominantMood === 'sad' && moodCounts['sad'] > recentMoods.length * 0.3) {
    recommendations.push("Üzüntülü günlerin fazla. Sevdiğin insanlarla zaman geçirmeyi dene! 🤗");
  }
  
  if (dominantMood === 'happy' || dominantMood === 'excited') {
    recommendations.push("Pozitif enerjin harika! Bu enerjiyi projelerine yönlendir! 🚀");
  }
  
  return {
    patterns: {
      dominantMood,
      moodDistribution: moodCounts,
      avgSentiment,
      sentimentVariance
    },
    insights,
    recommendations
  };
};
