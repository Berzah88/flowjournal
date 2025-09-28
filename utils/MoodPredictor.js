// utils/MoodPredictor.js
// Enhanced mood prediction and sentiment analysis system
// Features: Context awareness, negation handling, intensity scoring, pattern learning

// Mood definitions
export const MOODS = [
  {
    key: "happy",
    label: "Happy",
    icon: "sentiment-satisfied",
    color: "#4CAF50", // solid green
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
];

// Extended mood definitions beyond basic buttons
export const EXTENDED_MOODS = [
  // Basic moods (existing buttons)
  {
    key: "happy",
    label: "Happy",
    icon: "sentiment-satisfied",
    color: "#4CAF50",
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

// Enhanced Sentiment Analysis with Context Awareness
export const analyzeSentiment = (text, userHistory = []) => {
  if (!text || text.trim().length === 0) return { score: 0, label: 'neutral', confidence: 0 };
  
  // Enhanced word categories with intensity levels
  const positiveWords = {
    high: [
      // Türkçe yüksek pozitif kelimeler
      'harika', 'mükemmel', 'muhteşem', 'süper', 'müthiş', 'olağanüstü',
      'fantastik', 'muazzam', 'nefes kesici', 'büyüleyici', 'etkileyici',
      'başarılı', 'başardım', 'tamamladım', 'kazandım', 'galip', 'zafer',
      'coşkulu', 'heyecanlı', 'neşeli', 'sevinçli', 'mutlu', 'gururlu',
      'aşık', 'kelebek', 'uçuşuyor', 'çarpıntı', 'kalp', 'sevgi', 'aşk',
      
      // İngilizce yüksek pozitif kelimeler
      'amazing', 'fantastic', 'incredible', 'phenomenal', 'outstanding',
      'brilliant', 'spectacular', 'magnificent', 'marvelous', 'superb',
      'excellent', 'perfect', 'wonderful', 'awesome', 'extraordinary'
    ],
    medium: [
      // Türkçe orta pozitif kelimeler
      'güzel', 'iyi', 'hoş', 'keyifli', 'eğlenceli', 'güzel', 'tatmin',
      'memnun', 'rahat', 'huzurlu', 'sakin', 'ferah', 'temiz', 'düzenli',
      'galiba', 'sanırım', 'gibi', 'hissediyorum', 'hissediyor',
      'verimli', 'etkili', 'faydalı', 'yararlı', 'değerli', 'önemli',
      'anlamlı', 'kaliteli', 'üstün', 'ideal', 'organize', 'planlı',
      
      // İngilizce orta pozitif kelimeler
      'good', 'nice', 'great', 'fine', 'pleasant', 'enjoyable', 'satisfied',
      'comfortable', 'peaceful', 'calm', 'clean', 'organized', 'efficient',
      'useful', 'valuable', 'important', 'meaningful', 'quality'
    ],
    low: [
      // Türkçe düşük pozitif kelimeler
      'tamam', 'olur', 'idare', 'fena değil', 'iyi gibi', 'ortalama',
      'normal', 'standart', 'kabul edilebilir', 'uygun', 'makul',
      
      // İngilizce düşük pozitif kelimeler
      'okay', 'ok', 'fine', 'acceptable', 'decent', 'reasonable', 'adequate'
    ]
  };
  
  const negativeWords = {
    high: [
      // Türkçe yüksek negatif kelimeler
      'korkunç', 'dehşet', 'felaket', 'berbat', 'çok kötü', 'iğrenç',
      'nefret', 'tiksinti', 'kızgın', 'öfkeli', 'sinirli', 'gergin',
      'başarısız', 'kaybettim', 'başaramadım', 'hayal kırıklığı',
      'mutsuz', 'hüzünlü', 'kederli', 'acılı', 'üzüntülü', 'kırgın',
      'panik', 'korku', 'endişe', 'stres', 'baskı', 'zorluk',
      'çaresiz', 'umutsuz', 'karamsar', 'bitkin', 'tükenmiş', 'yorgun',
      
      // İngilizce yüksek negatif kelimeler
      'terrible', 'awful', 'horrible', 'disgusting', 'hate', 'horrifying',
      'devastating', 'catastrophic', 'miserable', 'desperate', 'hopeless'
    ],
    medium: [
      // Türkçe orta negatif kelimeler
      'kötü', 'zor', 'bezgin', 'stresli', 'üzgün', 'sıkıldım', 'bıktım', 'pazar günü', 'akşamdan beri',
      'yorucu', 'sıkıcı', 'can sıkıcı', 'sinir bozucu', 'huzursuz',
      'tedirgin', 'endişeli', 'kaygılı', 'engel', 'problem', 'sorun',
      'hata', 'yanlış', 'kayıp', 'zarar', 'hasar', 'bozuk',
      'çalışmıyor', 'işe yaramıyor', 'faydasız', 'yararsız',
      'değersiz', 'önemsiz', 'anlamsız', 'boş', 'gereksiz',
      
      // İngilizce orta negatif kelimeler
      'bad', 'difficult', 'tired', 'stressed', 'sad', 'failed', 'struggled',
      'bored', 'frustrated', 'disappointed', 'annoying', 'irritating',
      'depressing', 'upsetting', 'dislike', 'problematic', 'troublesome',
      'disturbing', 'concerning', 'worrying', 'alarming', 'frightening',
      'scary', 'terrifying', 'exhausted', 'weary', 'fatigued', 'drained'
    ],
    low: [
      // Türkçe düşük negatif kelimeler
      'fazla', 'aşırı', 'yavaş', 'gecikme', 'gecikti', 'gecikmiş',
      'halsiz', 'güçsüz', 'zayıf', 'dermansız', 'takatsiz',
      'kudretsiz', 'normal değil', 'istediğim gibi değil',
      
      // İngilizce düşük negatif kelimeler
      'slow', 'heavy', 'burdened', 'overwhelmed', 'swamped', 'strained',
      'tense', 'anxious', 'worried', 'concerned', 'troubled', 'distressed',
      'restless', 'uneasy', 'uncomfortable', 'not ideal', 'could be better'
    ]
  };
  
  // Enhanced text preprocessing with negation detection
  const preprocessText = (text) => {
    const cleanText = text.toLowerCase()
      .replace(/[^\w\sçğıöşü]/g, ' ') // Turkish characters preserved
      .replace(/\s+/g, ' ')
      .trim();
    
    const words = cleanText.split(' ');
    const processedWords = [];
    
    // Detect negations and context
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const nextWord = words[i + 1];
      
      // Turkish negation patterns
      const negationWords = ['değil', 'olmayan', 'olmuyor', 'olmaz', 'yok', 'hayır'];
      
      if (negationWords.includes(word) && nextWord) {
        // Mark next word as negated
        processedWords.push({ word: nextWord, negated: true, intensity: 1 });
        i++; // Skip next word as it's already processed
      } else {
        processedWords.push({ word, negated: false, intensity: 1 });
      }
    }
    
    return processedWords;
  };
  
  const processedWords = preprocessText(text);
  
  // Enhanced scoring with intensity levels
  let positiveScore = 0;
  let negativeScore = 0;
  let totalWords = processedWords.length;
  let sentimentWords = 0;
  
  processedWords.forEach(({ word, negated, intensity }) => {
    let foundSentiment = false;
    
    // Check positive words with intensity
    for (const level of ['high', 'medium', 'low']) {
      const words = positiveWords[level];
      const intensityMultiplier = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
      
      for (const pw of words) {
        if (word.includes(pw) || pw.includes(word)) {
          const baseScore = intensityMultiplier * intensity;
          positiveScore += negated ? -baseScore : baseScore;
          sentimentWords++;
          foundSentiment = true;
          break;
        }
      }
      if (foundSentiment) break;
    }
    
    // Check negative words with intensity (if not already found positive)
    if (!foundSentiment) {
      for (const level of ['high', 'medium', 'low']) {
        const words = negativeWords[level];
        const intensityMultiplier = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
        
        for (const nw of words) {
          if (word.includes(nw) || nw.includes(word)) {
            const baseScore = intensityMultiplier * intensity;
            negativeScore += negated ? -baseScore : baseScore;
            sentimentWords++;
            foundSentiment = true;
            break;
          }
        }
        if (foundSentiment) break;
      }
    }
  });
  
  // Calculate confidence based on sentiment word ratio and user history
  const sentimentRatio = sentimentWords / totalWords;
  let confidence = Math.min(sentimentRatio * 2, 1); // Higher ratio = higher confidence
  
  // Apply user history pattern learning
  if (userHistory.length > 0) {
    const recentMoods = userHistory.slice(-5); // Last 5 entries
    const avgSentiment = recentMoods.reduce((sum, entry) => sum + (entry.sentiment?.score || 0), 0) / recentMoods.length;
    
    // Adjust confidence based on consistency with user patterns
    const consistency = Math.abs(avgSentiment - (positiveScore - negativeScore)) / 100;
    confidence = confidence * (1 - consistency * 0.3); // Reduce confidence if inconsistent
  }
  
  // If no sentiment words found, return neutral with low confidence
  if (sentimentWords === 0) {
    return { 
      score: 0, 
      label: 'neutral', 
      positiveCount: 0, 
      negativeCount: 0, 
      confidence: 0.1,
      sentimentWords: 0,
      totalWords 
    };
  }
  
  // Calculate final score with intensity weighting
  const totalSentimentScore = positiveScore - negativeScore;
  const maxPossibleScore = sentimentWords * 3; // Max intensity is 3
  let normalizedScore = (totalSentimentScore / maxPossibleScore) * 100;
  normalizedScore = Math.max(-100, Math.min(100, normalizedScore));
  
  // Dynamic thresholds based on confidence - lowered for better detection
  const positiveThreshold = confidence > 0.7 ? 8 : 12;
  const negativeThreshold = confidence > 0.7 ? -8 : -12;
  
  let label = 'neutral';
  if (normalizedScore > positiveThreshold) label = 'positive';
  else if (normalizedScore < negativeThreshold) label = 'negative';
  
  return { 
    score: normalizedScore, 
    label, 
    positiveCount: positiveScore, 
    negativeCount: negativeScore,
    confidence,
    sentimentWords,
    totalWords
  };
};

// Enhanced smart mood suggestion with confidence-based recommendations
// Advanced Context-Aware Mood Analysis
export const analyzeContextualMood = (text, sentiment, userHistory = []) => {
  const context = {
    timeContext: analyzeTimeContext(text),
    situationContext: analyzeSituationContext(text),
    emotionalIntensity: analyzeEmotionalIntensity(text),
    socialContext: analyzeSocialContext(text),
    physicalContext: analyzePhysicalContext(text),
    sentenceContext: analyzeSentenceContext(text),
    causalContext: analyzeCausalContext(text),
    temporalContext: analyzeTemporalContext(text)
  };
  
  return context;
};

// Time-based context analysis
const analyzeTimeContext = (text) => {
  const timeWords = {
    weekend: ['pazar', 'cumartesi', 'hafta sonu', 'tatil'],
    evening: ['akşam', 'gece', 'geç saat', 'akşamdan beri'],
    morning: ['sabah', 'erken', 'gün doğumu'],
    work: ['iş', 'çalışma', 'ofis', 'sahaya', 'çağırdılar']
  };
  
  const lowerText = text.toLowerCase();
  const detected = [];
  
  Object.entries(timeWords).forEach(([context, words]) => {
    if (words.some(word => lowerText.includes(word))) {
      detected.push(context);
    }
  });
  
  return detected;
};

// Situation-based context analysis  
const analyzeSituationContext = (text) => {
  const situationWords = {
    forced: ['çağırdılar', 'zorla', 'mecbur', 'zorunda'],
    unexpected: ['beklenmedik', 'ani', 'birden', 'aniden'],
    repetitive: ['yeniden', 'tekrar', 'yine', 'sürekli'],
    overwhelming: ['çok', 'aşırı', 'fazla', 'bitkin']
  };
  
  const lowerText = text.toLowerCase();
  const detected = [];
  
  Object.entries(situationWords).forEach(([context, words]) => {
    if (words.some(word => lowerText.includes(word))) {
      detected.push(context);
    }
  });
  
  return detected;
};

// Emotional intensity analysis
const analyzeEmotionalIntensity = (text) => {
  const intensityMarkers = {
    high: ['çok', 'aşırı', 'müthiş', 'berbat', 'korkunç'],
    medium: ['biraz', 'az', 'orta', 'normal'],
    low: ['hafif', 'küçük', 'minimal']
  };
  
  const lowerText = text.toLowerCase();
  let maxIntensity = 'low';
  
  Object.entries(intensityMarkers).forEach(([level, words]) => {
    if (words.some(word => lowerText.includes(word))) {
      if (level === 'high') maxIntensity = 'high';
      else if (level === 'medium' && maxIntensity === 'low') maxIntensity = 'medium';
    }
  });
  
  return maxIntensity;
};

// Social context analysis
const analyzeSocialContext = (text) => {
  const socialWords = {
    alone: ['yalnız', 'tek başıma', 'kimse yok'],
    social: ['arkadaş', 'aile', 'insanlar', 'birlikte'],
    conflict: ['kavga', 'tartışma', 'anlaşmazlık'],
    support: ['destek', 'yardım', 'anlayış']
  };
  
  const lowerText = text.toLowerCase();
  const detected = [];
  
  Object.entries(socialWords).forEach(([context, words]) => {
    if (words.some(word => lowerText.includes(word))) {
      detected.push(context);
    }
  });
  
  return detected;
};

// Physical context analysis
const analyzePhysicalContext = (text) => {
  const physicalWords = {
    tired: ['yorgun', 'bitkin', 'tükenmiş', 'halsiz'],
    energetic: ['enerjik', 'dinç', 'güçlü', 'aktif'],
    sick: ['hasta', 'rahatsız', 'ağrı', 'sızı'],
    healthy: ['sağlıklı', 'iyi', 'dinç', 'güçlü']
  };
  
  const lowerText = text.toLowerCase();
  const detected = [];
  
  Object.entries(physicalWords).forEach(([context, words]) => {
    if (words.some(word => lowerText.includes(word))) {
      detected.push(context);
    }
  });
  
  return detected;
};

// Sentence structure and context analysis
const analyzeSentenceContext = (text) => {
  const lowerText = text.toLowerCase();
  const context = {
    hasQuestion: /[?]/.test(text),
    hasExclamation: /[!]/.test(text),
    hasNegation: /(değil|olmuyor|olmaz|yok|hayır)/.test(lowerText),
    hasConjunction: /(ve|ama|fakat|ancak|çünkü|için|dolayı)/.test(lowerText),
    hasCondition: /(eğer|şayet|eğer ki|eğerki)/.test(lowerText),
    hasComparison: /(gibi|kadar|daha|en|çok|az)/.test(lowerText),
    hasTimeRelation: /(önce|sonra|şimdi|henüz|hala|artık)/.test(lowerText),
    hasCauseEffect: /(çünkü|için|dolayı|nedeniyle|yüzünden)/.test(lowerText),
    sentenceLength: text.split(' ').length,
    emotionalWords: 0
  };
  
  // Count emotional words
  const emotionalWords = ['mutlu', 'üzgün', 'kızgın', 'yorgun', 'heyecanlı', 'korkmuş', 'endişeli', 'gururlu', 'mahcup', 'şaşkın', 'aşık', 'kelebek', 'uçuşuyor'];
  context.emotionalWords = emotionalWords.filter(word => lowerText.includes(word)).length;
  
  return context;
};

// Causal relationship analysis
const analyzeCausalContext = (text) => {
  const lowerText = text.toLowerCase();
  const causalPatterns = {
    // Cause-effect patterns
    because: /(çünkü|için|dolayı|nedeniyle|yüzünden|sebebiyle)/.test(lowerText),
    result: /(bu yüzden|bu nedenle|bu sebeple|sonuç olarak)/.test(lowerText),
    condition: /(eğer|şayet|eğer ki|eğerki|şartıyla)/.test(lowerText),
    contrast: /(ama|fakat|ancak|oysa|halbuki)/.test(lowerText),
    addition: /(ve|ayrıca|bunun yanında|üstelik)/.test(lowerText)
  };
  
  // Extract cause and effect
  const causeEffect = {
    cause: null,
    effect: null,
    relationship: null
  };
  
  // Simple cause-effect extraction
  if (causalPatterns.because) {
    const becauseMatch = lowerText.match(/(çünkü|için|dolayı|nedeniyle|yüzünden|sebebiyle)\s+(.+)/);
    if (becauseMatch) {
      causeEffect.cause = becauseMatch[2].trim();
      causeEffect.relationship = 'because';
    }
  }
  
  if (causalPatterns.result) {
    const resultMatch = lowerText.match(/(bu yüzden|bu nedenle|bu sebeple|sonuç olarak)\s+(.+)/);
    if (resultMatch) {
      causeEffect.effect = resultMatch[2].trim();
      causeEffect.relationship = 'result';
    }
  }
  
  return { ...causalPatterns, ...causeEffect };
};

// Temporal relationship analysis
const analyzeTemporalContext = (text) => {
  const lowerText = text.toLowerCase();
  const temporalPatterns = {
    // Time sequences
    before: /(önce|evvel|daha önce|önceden)/.test(lowerText),
    after: /(sonra|ardından|daha sonra|sonradan)/.test(lowerText),
    now: /(şimdi|şu an|şu anda|hala|henüz)/.test(lowerText),
    always: /(hep|her zaman|sürekli|daima)/.test(lowerText),
    never: /(hiç|asla|hiçbir zaman)/.test(lowerText),
    recently: /(yeni|az önce|biraz önce|geçenlerde)/.test(lowerText),
    duration: /(sürekli|uzun süre|çok uzun|kısa süre)/.test(lowerText)
  };
  
  // Extract time references
  const timeReferences = {
    specificTime: null,
    duration: null,
    frequency: null
  };
  
  // Extract specific time mentions
  const timeMatch = lowerText.match(/(pazar|cumartesi|pazartesi|salı|çarşamba|perşembe|cuma|sabah|öğle|akşam|gece)/);
  if (timeMatch) {
    timeReferences.specificTime = timeMatch[1];
  }
  
  // Extract duration
  const durationMatch = lowerText.match(/(\d+)\s*(saat|gün|hafta|ay|yıl)/);
  if (durationMatch) {
    timeReferences.duration = `${durationMatch[1]} ${durationMatch[2]}`;
  }
  
  return { ...temporalPatterns, ...timeReferences };
};

export const getSmartMoodSuggestion = (sentiment, currentMood, userHistory = [], text = '') => {
  const suggestions = [];
  
  // Get contextual analysis
  const context = analyzeContextualMood(text, sentiment, userHistory);
  
  // Confidence-based recommendation threshold
  const minConfidence = 0.15; // Lowered threshold for better suggestions
  
  if (sentiment.confidence < minConfidence && text.length < 20) {
    console.log('MoodPredictor: Confidence too low or text too short', {
      confidence: sentiment.confidence,
      textLength: text.length,
      threshold: minConfidence
    });
    return suggestions;
  }
  
  // Advanced mood mapping with context awareness
  const getContextualMoodSuggestion = (sentiment, context) => {
    const { label, score, confidence } = sentiment;
    const { 
      timeContext, situationContext, emotionalIntensity, socialContext, physicalContext,
      sentenceContext, causalContext, temporalContext 
    } = context;
    
    // Calculate mood scores based on different contexts
    const moodScores = {
      // Basic moods
      tired: 0,
      frustrated: 0,
      sad: 0,
      angry: 0,
      happy: 0,
      excited: 0,
      calm: 0,
      
      // Extended moods
      anxious: 0,
      overwhelmed: 0,
      lonely: 0,
      grateful: 0,
      hopeful: 0,
      exhausted: 0,
      stressed: 0,
      confused: 0,
      disappointed: 0,
      proud: 0,
      relieved: 0,
      curious: 0,
      bored: 0,
      surprised: 0,
      content: 0,
      worried: 0,
      nostalgic: 0,
      motivated: 0,
      peaceful: 0
    };
    
    // Physical context scoring
    if (physicalContext.includes('tired')) {
      moodScores.tired += 0.8;
      if (temporalContext.duration) {
        moodScores.tired += 0.2;
        moodScores.exhausted += 0.3; // Uzun süre yorgunluk = exhausted
      }
    }
    
    // Situational context scoring
    if (situationContext.includes('forced')) {
      moodScores.frustrated += 0.7;
      if (timeContext.includes('weekend')) moodScores.frustrated += 0.3;
    }
    
    if (situationContext.includes('overwhelming')) {
      moodScores.overwhelmed += 0.8;
      moodScores.stressed += 0.6; // Aşırı yüklenme = stress
      if (sentenceContext.emotionalWords > 2) {
        moodScores.overwhelmed += 0.2;
        moodScores.stressed += 0.2;
      }
    }
    
    // Emotional intensity scoring
    if (emotionalIntensity === 'high') {
      if (sentenceContext.hasExclamation) {
        moodScores.angry += 0.6;
        moodScores.surprised += 0.3; // Ünlem + yüksek yoğunluk = surprised
      } else {
        moodScores.sad += 0.6;
        moodScores.disappointed += 0.3; // Yüksek yoğunluk + üzüntü = disappointed
      }
    }
    
    // Low emotional intensity
    if (emotionalIntensity === 'low') {
      moodScores.bored += 0.4;
      moodScores.content += 0.3; // Düşük yoğunluk = content veya bored
    }
    
    // Social context scoring
    if (socialContext.includes('alone')) {
      moodScores.lonely += 0.7;
    }
    
    // Causal context scoring
    if (causalContext.because && causalContext.cause) {
      const cause = causalContext.cause.toLowerCase();
      if (cause.includes('yorgun') || cause.includes('bitkin')) {
        moodScores.tired += 0.5;
        moodScores.exhausted += 0.3;
      }
      if (cause.includes('zorla') || cause.includes('mecbur')) {
        moodScores.frustrated += 0.5;
        moodScores.stressed += 0.3;
      }
      if (cause.includes('endişe') || cause.includes('kaygı')) {
        moodScores.anxious += 0.5;
        moodScores.worried += 0.3;
      }
      if (cause.includes('başarı') || cause.includes('kazandım')) {
        moodScores.proud += 0.6;
        moodScores.happy += 0.4;
      }
      if (cause.includes('rahat') || cause.includes('huzur')) {
        moodScores.peaceful += 0.6;
        moodScores.relieved += 0.4;
      }
    }
    
    // Temporal context scoring
    if (temporalContext.always && label === 'negative') {
      moodScores.overwhelmed += 0.4;
      moodScores.stressed += 0.3;
    }
    
    if (temporalContext.recently && label === 'positive') {
      moodScores.hopeful += 0.3;
      moodScores.relieved += 0.2;
    }
    
    if (temporalContext.never && label === 'negative') {
      moodScores.disappointed += 0.4;
    }
    
    // Sentence structure scoring
    if (sentenceContext.hasQuestion && label === 'negative') {
      moodScores.anxious += 0.3;
      moodScores.confused += 0.2;
    }
    
    if (sentenceContext.hasQuestion && label === 'positive') {
      moodScores.curious += 0.3;
    }
    
    if (sentenceContext.hasConjunction && sentenceContext.emotionalWords > 1) {
      // Complex emotions - boost multiple moods
      moodScores.frustrated += 0.2;
      moodScores.tired += 0.2;
      moodScores.confused += 0.1;
    }
    
    if (sentenceContext.hasNegation && label === 'negative') {
      moodScores.disappointed += 0.3;
    }
    
    // Positive sentiment specific scoring
    if (label === 'positive') {
      if (sentenceContext.emotionalWords > 1) {
        moodScores.excited += 0.3;
        moodScores.happy += 0.2;
      }
      if (sentenceContext.hasExclamation) {
        moodScores.excited += 0.4;
        moodScores.surprised += 0.2;
      }
    }
    
    // Love/romance specific scoring
    const lowerText = text.toLowerCase();
    if (lowerText.includes('aşık') || lowerText.includes('kelebek') || lowerText.includes('uçuşuyor')) {
      moodScores.excited += 0.8;
      moodScores.happy += 0.6;
      moodScores.surprised += 0.4;
    }
    
    if (lowerText.includes('çarpıntı') || lowerText.includes('kalp')) {
      moodScores.excited += 0.6;
      moodScores.anxious += 0.3; // Positive anxiety from love
    }
    
    // Find the mood with highest score
    const sortedMoods = Object.entries(moodScores)
      .sort(([,a], [,b]) => b - a)
      .filter(([,score]) => score > 0);
    
    if (sortedMoods.length === 0) {
      // Fallback to basic sentiment analysis
      if (label === 'positive') {
        return { mood: 'happy', reason: 'Pozitif bir durum.' };
      } else if (label === 'negative') {
        return { mood: 'sad', reason: 'Olumsuz bir durum.' };
      } else {
        return { mood: 'calm', reason: 'Nötr bir durum.' };
      }
    }
    
    const [primaryMood, primaryScore] = sortedMoods[0];
    const [secondaryMood, secondaryScore] = sortedMoods[1] || [null, 0];
    
    // Generate contextual reason
    let reason = generateContextualReason(primaryMood, context, primaryScore);
    
    // If secondary mood is close in score, mention it
    if (secondaryScore > 0.3 && Math.abs(primaryScore - secondaryScore) < 0.2) {
      reason += ` (Ayrıca ${secondaryMood} hissediyor olabilirsin)`;
    }
    
    return { mood: primaryMood, reason, confidence: primaryScore };
  };
  
  // Generate contextual reason based on mood and context
  const generateContextualReason = (mood, context, score) => {
    const { timeContext, situationContext, causalContext, temporalContext } = context;
    
    switch (mood) {
      case 'tired':
        if (temporalContext.duration) {
          return `${temporalContext.duration} süredir yorgun görünüyorsun.`;
        }
        if (timeContext.includes('evening')) {
          return 'Akşam yorgunluğu hissediyorsun.';
        }
        return 'Fiziksel yorgunluk var.';
        
      case 'frustrated':
        if (timeContext.includes('weekend') && timeContext.includes('work')) {
          return 'Hafta sonu çalışma zorunluluğu sinir bozucu.';
        }
        if (situationContext.includes('forced')) {
          return 'Zorla yapılan işler rahatsız edici.';
        }
        return 'Frustrasyon hissediyorsun.';
        
      case 'overwhelmed':
        if (situationContext.includes('overwhelming')) {
          return 'Aşırı yüklenme hissi var.';
        }
        if (temporalContext.always) {
          return 'Sürekli baskı altında hissediyorsun.';
        }
        return 'Bunalmış görünüyorsun.';
        
      case 'anxious':
        if (causalContext.because) {
          return 'Endişe verici bir durum var.';
        }
        return 'Kaygılı görünüyorsun.';
        
      case 'lonely':
        return 'Yalnızlık hissediyorsun.';
        
      case 'angry':
        return 'Öfke ve sinir var.';
        
      case 'sad':
        return 'Üzgün görünüyorsun.';
        
      case 'happy':
        return 'Mutlu görünüyorsun.';
        
      case 'excited':
        return 'Heyecanlı görünüyorsun.';
        
      case 'hopeful':
        return 'Umutlu görünüyorsun.';
        
      case 'exhausted':
        return 'Tamamen tükenmiş görünüyorsun.';
        
      case 'stressed':
        return 'Stres altında hissediyorsun.';
        
      case 'confused':
        return 'Kafan karışık görünüyor.';
        
      case 'disappointed':
        return 'Hayal kırıklığı yaşıyorsun.';
        
      case 'proud':
        return 'Gururlu görünüyorsun.';
        
      case 'relieved':
        return 'Rahatlamış görünüyorsun.';
        
      case 'curious':
        return 'Meraklı görünüyorsun.';
        
      case 'bored':
        return 'Sıkılmış görünüyorsun.';
        
      case 'surprised':
        return 'Şaşırmış görünüyorsun.';
        
      case 'content':
        return 'Memnun görünüyorsun.';
        
      case 'worried':
        return 'Endişeli görünüyorsun.';
        
      case 'nostalgic':
        return 'Nostaljik hissediyorsun.';
        
      case 'motivated':
        return 'Motiveli görünüyorsun.';
        
      case 'peaceful':
        return 'Huzurlu görünüyorsun.';
        
      default:
        return 'Bu mood uygun görünüyor.';
    }
  };
  
  // Get contextual mood suggestion
  const contextualSuggestion = getContextualMoodSuggestion(sentiment, context);
  
  // Add primary suggestion
  if (contextualSuggestion.mood) {
    suggestions.push({
      mood: contextualSuggestion.mood,
      reason: contextualSuggestion.reason,
      confidence: sentiment.confidence,
      type: 'primary'
    });
  }
  
  // Add alternative suggestions based on context
  const getAlternativeSuggestions = (context, sentiment) => {
    const alternatives = [];
    const { 
      timeContext, situationContext, emotionalIntensity, socialContext, physicalContext,
      sentenceContext, causalContext, temporalContext 
    } = context;
    
    // Weekend work frustration
    if (timeContext.includes('weekend') && timeContext.includes('work')) {
      alternatives.push({
        mood: 'overwhelmed',
        reason: 'Hafta sonu çalışma baskısı.',
        confidence: 0.8,
        type: 'alternative'
      });
    }
    
    // Evening tiredness
    if (timeContext.includes('evening') && physicalContext.includes('tired')) {
      alternatives.push({
        mood: 'exhausted',
        reason: 'Akşam yorgunluğu.',
        confidence: 0.7,
        type: 'alternative'
      });
    }
    
    // Forced situations
    if (situationContext.includes('forced')) {
      alternatives.push({
        mood: 'anxious',
        reason: 'Zorla yapılan işler endişe yaratıyor.',
        confidence: 0.6,
        type: 'alternative'
      });
    }
    
    // Causal relationships
    if (causalContext.because && causalContext.cause) {
      const cause = causalContext.cause.toLowerCase();
      if (cause.includes('yorgun') && !alternatives.some(alt => alt.mood === 'tired')) {
        alternatives.push({
          mood: 'tired',
          reason: 'Sebep: Fiziksel yorgunluk.',
          confidence: 0.7,
          type: 'alternative'
        });
      }
    }
    
    // Temporal patterns
    if (temporalContext.always && sentiment.label === 'negative') {
      alternatives.push({
        mood: 'overwhelmed',
        reason: 'Sürekli olumsuz durumlar.',
        confidence: 0.6,
        type: 'alternative'
      });
    }
    
    // Social context
    if (socialContext.includes('alone') && sentiment.label === 'negative') {
      alternatives.push({
        mood: 'lonely',
        reason: 'Yalnızlık hissi.',
        confidence: 0.7,
        type: 'alternative'
      });
    }
    
    // Sentence structure based alternatives
    if (sentenceContext.hasQuestion && sentiment.label === 'negative') {
      alternatives.push({
        mood: 'anxious',
        reason: 'Soru işareti endişe göstergesi.',
        confidence: 0.5,
        type: 'alternative'
      });
    }
    
    if (sentenceContext.hasExclamation && emotionalIntensity === 'high') {
      alternatives.push({
        mood: 'angry',
        reason: 'Ünlem işareti yoğun duygu.',
        confidence: 0.6,
        type: 'alternative'
      });
    }
    
    // Complex emotions (multiple emotional words)
    if (sentenceContext.emotionalWords > 2) {
      alternatives.push({
        mood: 'overwhelmed',
        reason: 'Çok fazla duygusal kelime.',
        confidence: 0.5,
        type: 'alternative'
      });
    }
    
    // Love/romance specific alternatives
    const lowerText = text.toLowerCase();
    if (lowerText.includes('aşık') || lowerText.includes('kelebek') || lowerText.includes('uçuşuyor')) {
      alternatives.push({
        mood: 'excited',
        reason: 'Aşk ve heyecan hissi.',
        confidence: 0.9,
        type: 'alternative'
      });
      alternatives.push({
        mood: 'happy',
        reason: 'Mutlu aşk duyguları.',
        confidence: 0.8,
        type: 'alternative'
      });
    }
    
    return alternatives;
  };
  
  // Add alternative suggestions
  const alternatives = getAlternativeSuggestions(context, sentiment);
  suggestions.push(...alternatives);
  
  // Check if current mood conflicts with sentiment
  const isMoodConflicting = (sentiment, currentMood) => {
    if (!currentMood) return false;
    
    const positiveMoods = ['happy', 'excited', 'calm', 'grateful', 'hopeful', 'motivated', 'peaceful'];
    const negativeMoods = ['sad', 'angry', 'tired', 'frustrated', 'anxious', 'overwhelmed', 'lonely'];
    
    if (sentiment.label === 'positive' && negativeMoods.includes(currentMood)) return true;
    if (sentiment.label === 'negative' && positiveMoods.includes(currentMood)) return true;
    
    return false;
  };
  
  // Apply user history patterns
  const getUserPatternSuggestion = (sentiment, userHistory) => {
    if (userHistory.length < 3) return null;
    
    const recentEntries = userHistory.slice(-10);
    const similarSentiments = recentEntries.filter(entry => 
      Math.abs((entry.sentiment?.score || 0) - sentiment.score) < 20
    );
    
    if (similarSentiments.length >= 2) {
      const mostCommonMood = getMostCommonMood(similarSentiments);
      if (mostCommonMood) {
        return {
          mood: mostCommonMood,
          reason: `Geçmiş verilerine göre benzer duygular için ${mostCommonMood} mood'unu seçmişsin.`
        };
      }
    }
    
    return null;
  };
  
  const getMostCommonMood = (entries) => {
    const moodCounts = {};
    entries.forEach(entry => {
      const mood = entry.mood;
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });
    
    return Object.keys(moodCounts).reduce((a, b) => 
      moodCounts[a] > moodCounts[b] ? a : b
    );
  };
  
  // Generate suggestions
  if (!currentMood || currentMood === '') {
    // No mood selected - suggest based on sentiment
    const patternSuggestion = getUserPatternSuggestion(sentiment, userHistory);
    if (patternSuggestion) {
      console.log('MoodPredictor: Using pattern suggestion', patternSuggestion);
      suggestions.push(patternSuggestion);
    } else {
      // Use contextual suggestion as fallback
      console.log('MoodPredictor: Using contextual suggestion as fallback');
    }
  } else if (isMoodConflicting(sentiment, currentMood)) {
    // Mood conflicts with sentiment - suggest correction
    console.log('MoodPredictor: Mood conflict detected', {
      currentMood,
      sentiment: sentiment.label
    });
    
    // Add conflict resolution suggestion using contextual analysis
    if (contextualSuggestion.mood && contextualSuggestion.mood !== currentMood) {
      suggestions.push({
        mood: contextualSuggestion.mood,
        reason: `Metnin ${sentiment.label} ama mood'un ${currentMood}. ${contextualSuggestion.mood} mood'u daha uygun olabilir!`,
        confidence: sentiment.confidence,
        type: 'conflict-resolution'
      });
    }
  } else {
    console.log('MoodPredictor: No suggestions needed', {
      currentMood,
      sentiment: sentiment.label,
      conflicting: isMoodConflicting(sentiment, currentMood)
    });
  }
  
  // Add confidence indicator to suggestions
  return suggestions.map(suggestion => ({
    ...suggestion,
    confidence: sentiment.confidence,
    sentimentScore: sentiment.score
  }));
};

// Simplified smart suggestions - removed motivational content
// Only returns basic mood-related insights if needed
export const getSmartSuggestions = (sentiment, currentMood, userHistory = []) => {
  // Return empty array - no motivational content needed
  // Focus is only on mood suggestions
  return [];
};

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

// Predictive mood suggestion based on historical patterns
export const predictMood = (text, userHistory = []) => {
  const sentiment = analyzeSentiment(text, userHistory);
  const patterns = analyzeMoodPatterns(userHistory);
  
  // Combine sentiment analysis with user patterns
  let predictedMood = null;
  let confidence = sentiment.confidence;
  
  if (patterns.patterns.dominantMood && sentiment.confidence > 0.7) {
    // If user has strong patterns and high confidence, consider pattern
    const patternWeight = 0.3;
    const sentimentWeight = 0.7;
    
    // This is a simplified prediction - in a real system, you'd use ML models
    if (sentiment.label === 'positive' && patterns.patterns.dominantMood === 'happy') {
      predictedMood = 'happy';
      confidence = Math.min(confidence + 0.2, 1);
    } else if (sentiment.label === 'negative' && patterns.patterns.dominantMood === 'sad') {
      predictedMood = 'sad';
      confidence = Math.min(confidence + 0.2, 1);
    }
  }
  
  // Fallback to sentiment-based prediction
  if (!predictedMood) {
    const suggestions = getSmartMoodSuggestion(sentiment, null, userHistory);
    predictedMood = suggestions.length > 0 ? suggestions[0].mood : 'calm';
  }
  
  return {
    mood: predictedMood,
    confidence,
    reasoning: `Sentiment: ${sentiment.label} (${sentiment.score.toFixed(1)}), Confidence: ${(confidence * 100).toFixed(1)}%`
  };
};

// Helper function to find Material icon fallback compatibility
export const getValidIconName = (name) => {
  // Some icon names used above may not exist on all sets; fallback map:
  const fallback = {
    "celebration": "celebration",
    "spa": "spa",
    "bedtime": "bedtime",
  };
  return fallback[name] ? fallback[name] : name;
};
