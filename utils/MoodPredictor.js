// utils/MoodPredictor.js
// Enhanced mood prediction and sentiment analysis system
// Features: Context awareness, negation handling, intensity scoring, pattern learning

// Mood definitions
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
];

// Extended mood definitions beyond basic buttons
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

// Sentence-based analysis for better context understanding
export const analyzeSentimentBySentences = (text, userHistory = []) => {
  if (!text || text.trim().length === 0) {
    return { score: 0, label: 'neutral', confidence: 0, sentences: [] };
  }

  // Split text into sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceAnalyses = sentences.map(sentence => analyzeSentiment(sentence.trim(), userHistory));
  
  // Calculate weighted average based on sentence length and confidence
  let totalWeight = 0;
  let weightedScore = 0;
  let totalConfidence = 0;
  
  sentenceAnalyses.forEach((analysis, index) => {
    const sentence = sentences[index];
    const weight = sentence.length * (analysis.confidence || 0.5);
    totalWeight += weight;
    weightedScore += analysis.score * weight;
    totalConfidence += analysis.confidence * weight;
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

// Enhanced Sentiment Analysis with Context Awareness
export const analyzeSentiment = (text, userHistory = []) => {
  if (!text || text.trim().length === 0) return { score: 0, label: 'neutral', confidence: 0 };
  
  // Ensure text is a string and safe to use
  const safeText = String(text).trim();
  if (!safeText) return { score: 0, label: 'neutral', confidence: 0 };
  
  // Smart sentence analysis for better mood detection
  const analyzeSentenceStructure = (text) => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const analysis = {
      sentenceCount: sentences.length,
      avgWordsPerSentence: 0,
      hasQuestion: /[?]/.test(text),
      hasExclamation: /[!]/.test(text),
      hasPeriod: /[.]/.test(text),
      emotionalIntensity: 'low',
      completeness: 'incomplete'
    };
    
    if (sentences.length > 0) {
      const totalWords = sentences.reduce((sum, sentence) => 
        sum + sentence.trim().split(/\s+/).length, 0);
      analysis.avgWordsPerSentence = totalWords / sentences.length;
    }
    
    // Determine emotional intensity based on punctuation
    if (analysis.hasExclamation) {
      analysis.emotionalIntensity = 'high';
    } else if (analysis.hasQuestion) {
      analysis.emotionalIntensity = 'medium';
    }
    
    // Determine completeness
    if (text.trim().endsWith('.') || text.trim().endsWith('!') || text.trim().endsWith('?')) {
      analysis.completeness = 'complete';
    }
    
    return analysis;
  };
  
  // Enhanced text preprocessing - more comprehensive
  const enhancedPreprocessText = (text) => {
    if (!text || typeof text !== 'string') return [];
    
    const cleanText = text.toLowerCase()
      .replace(/[^\w\sçğıöşü]/g, ' ') // Turkish characters preserved
      .replace(/\s+/g, ' ')
      .trim();
    
    const words = cleanText.split(' ');
    const processedWords = [];
    
    // Enhanced negation detection with more patterns
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const nextWord = words[i + 1];
      const prevWord = words[i - 1];
      
      // Turkish negation patterns - EXPANDED
      const negationWords = ['değil', 'olmayan', 'olmuyor', 'olmaz', 'yok', 'hayır', 'hiç', 'asla', 'hiçbir'];
      const negationPhrases = ['değil mi', 'olmuyor mu', 'yok mu', 'hiç değil'];
      
      // Check for negation phrases
      if (i < words.length - 1) {
        const phrase = `${word} ${nextWord}`;
        if (negationPhrases.includes(phrase)) {
          processedWords.push({ word: nextWord, negated: true, intensity: 1.5 });
          i++; // Skip next word
          continue;
        }
      }
      
      // Check for single negation words
      if (negationWords.includes(word) && nextWord) {
        processedWords.push({ word: nextWord, negated: true, intensity: 1.2 });
        i++; // Skip next word
      } else {
        processedWords.push({ word, negated: false, intensity: 1 });
      }
    }
    
    return processedWords;
  };
  
  // Enhanced word categories with intensity levels - EXPANDED
  const positiveWords = {
    high: [
      // Turkish high positive words - EXPANDED
      'harika', 'mükemmel', 'muhteşem', 'süper', 'müthiş', 'olağanüstü',
      'fantastik', 'muazzam', 'nefes kesici', 'büyüleyici', 'etkileyici',
      'başarılı', 'başardım', 'tamamladım', 'kazandım', 'galip', 'zafer',
      'coşkulu', 'heyecanlı', 'neşeli', 'sevinçli', 'mutlu', 'gururlu',
      'aşık', 'kelebek', 'uçuşuyor', 'çarpıntı', 'kalp', 'sevgi', 'aşk',
      'memnun', 'hoşnut', 'tatmin', 'rahat', 'huzurlu', 'sakin', 'ferah',
      'enerjik', 'dinç', 'güçlü', 'aktif', 'canlı', 'diri', 'taze',
      'güzel', 'hoş', 'keyifli', 'eğlenceli', 'zevkli', 'lezzetli',
      'başarı', 'kazanç', 'galibiyet', 'zafer', 'triumph', 'victory',
      'celebration', 'kutlama', 'sevinç', 'neşe', 'mutluluk', 'happiness',
      
      // İngilizce yüksek pozitif kelimeler - EXPANDED
      'amazing', 'fantastic', 'incredible', 'phenomenal', 'outstanding',
      'brilliant', 'spectacular', 'magnificent', 'marvelous', 'superb',
      'excellent', 'perfect', 'wonderful', 'awesome', 'extraordinary',
      'delighted', 'thrilled', 'ecstatic', 'overjoyed', 'elated',
      'satisfied', 'content', 'pleased', 'grateful', 'blessed',
      'great', 'feeling', 'accomplished', 'lot' // Add for "feeling great" and "accomplished a lot"
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
      // Türkçe yüksek negatif kelimeler - EXPANDED
      'korkunç', 'dehşet', 'felaket', 'berbat', 'çok kötü', 'iğrenç',
      'nefret', 'tiksinti', 'kızgın', 'öfkeli', 'sinirli', 'gergin',
      'başarısız', 'kaybettim', 'başaramadım', 'hayal kırıklığı',
      'mutsuz', 'hüzünlü', 'kederli', 'acılı', 'üzüntülü', 'kırgın',
      'panik', 'korku', 'endişe', 'stres', 'baskı', 'zorluk',
      'çaresiz', 'umutsuz', 'karamsar', 'bitkin', 'tükenmiş', 'yorgun',
      'bezgin', 'bıktım', 'sıkıldım', 'sıkkın', 'sıkıntılı', 'yorucu', 'sıkıcı', 'can sıkıcı',
      'sinir bozucu', 'huzursuz', 'tedirgin', 'kaygılı', 'engel',
      'problem', 'sorun', 'hata', 'yanlış', 'kayıp', 'zarar', 'hasar',
      'bozuk', 'çalışmıyor', 'işe yaramıyor', 'faydasız', 'yararsız',
      'değersiz', 'önemsiz', 'anlamsız', 'boş', 'gereksiz',
      'frustrated', 'overwhelmed', 'exhausted', 'drained', 'burned out',
      
      // İngilizce yüksek negatif kelimeler - EXPANDED
      'terrible', 'awful', 'horrible', 'disgusting', 'hate', 'horrifying',
      'devastating', 'catastrophic', 'miserable', 'desperate', 'hopeless',
      'frustrated', 'annoyed', 'irritated', 'angry', 'furious', 'livid',
      'depressed', 'sad', 'melancholy', 'gloomy', 'sorrowful', 'grief',
      'anxious', 'worried', 'concerned', 'troubled', 'distressed', 'upset',
      'everything' // Add 'everything' for "I hate everything" pattern
    ],
    medium: [
      // Türkçe orta negatif kelimeler - FRUSTRATION FOCUSED
      'kötü', 'zor', 'bezgin', 'stresli', 'üzgün', 'sıkıldım', 'bıktım', 'usandım', 'sıkılıyorum', 'sıkkın', 'sıkıntılı',
      'yorucu', 'sıkıcı', 'can sıkıcı', 'sinir bozucu', 'huzursuz',
      'tedirgin', 'endişeli', 'kaygılı', 'engel', 'problem', 'sorun',
      'hata', 'yanlış', 'kayıp', 'zarar', 'hasar', 'bozuk',
      'çalışmıyor', 'işe yaramıyor', 'faydasız', 'yararsız',
      'değersiz', 'önemsiz', 'anlamsız', 'boş', 'gereksiz',
      'frustrated', 'overwhelmed', 'burned out', 'fed up', 'sick of',
      'tired of', 'had enough', 'can\'t take it', 'too much',
      
      // İngilizce orta negatif kelimeler
      'bad', 'difficult', 'tired', 'stressed', 'sad', 'failed', 'struggled',
      'bored', 'frustrated', 'disappointed', 'annoying', 'irritating',
      'depressing', 'upsetting', 'dislike', 'problematic', 'troublesome',
      'disturbing', 'concerning', 'worrying', 'alarming', 'frightening',
      'scary', 'terrifying', 'exhausted', 'weary', 'fatigued', 'drained'
    ],
    low: [
      // Türkçe düşük negatif kelimeler
      'fazla', 'aşırı', 'yavaş', 'gecikme', 'gecikti', 'gecikmiş', 'sıkkın', 'sıkıntılı',
      'halsiz', 'güçsüz', 'zayıf', 'dermansız', 'takatsiz',
      'kudretsiz', 'normal değil', 'istediğim gibi değil',
      
      // İngilizce düşük negatif kelimeler
      'slow', 'heavy', 'burdened', 'overwhelmed', 'swamped', 'strained',
      'tense', 'anxious', 'worried', 'concerned', 'troubled', 'distressed',
      'restless', 'uneasy', 'uncomfortable', 'not ideal', 'could be better'
    ]
  };
  
  const processedWords = enhancedPreprocessText(safeText);
  const sentenceAnalysis = analyzeSentenceStructure(safeText);
  
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
  
  // Calculate confidence based on sentiment word ratio, sentence structure, and user history
  const sentimentRatio = sentimentWords / totalWords;
  let confidence = Math.min(sentimentRatio * 2, 1); // Higher ratio = higher confidence
  
  // Boost confidence based on sentence structure
  if (sentenceAnalysis.completeness === 'complete') {
    confidence *= 1.3; // 30% boost for complete sentences
  }
  
  if (sentenceAnalysis.emotionalIntensity === 'high') {
    confidence *= 1.2; // 20% boost for high emotional intensity
  } else if (sentenceAnalysis.emotionalIntensity === 'medium') {
    confidence *= 1.1; // 10% boost for medium emotional intensity
  }
  
  // Boost confidence for questions (often indicate emotional state)
  if (sentenceAnalysis.hasQuestion) {
    confidence *= 1.15; // 15% boost for questions
  }
  
  confidence = Math.min(confidence, 1); // Cap at 1.0
  
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
  
  // Dynamic thresholds based on confidence - STRICTER
  const positiveThreshold = confidence > 0.7 ? 25 : 30;
  const negativeThreshold = confidence > 0.7 ? -25 : -30;
  
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
    totalWords,
    sentenceAnalysis // Include sentence structure analysis
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
  if (!text || typeof text !== 'string') return [];
  
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
  if (!text || typeof text !== 'string') return [];
  
  const situationWords = {
    forced: ['çağırdılar', 'zorla', 'mecbur', 'zorunda'],
    unexpected: ['beklenmedik', 'ani', 'birden', 'aniden'],
    repetitive: ['yeniden', 'tekrar', 'yine', 'sürekli'],
    overwhelming: ['aşırı', 'fazla', 'bitkin', 'tükenmiş', 'bunalmış']
  };
  
  const lowerText = text.toLowerCase();
  const detected = [];
  
  Object.entries(situationWords).forEach(([context, words]) => {
    if (words.some(word => lowerText.includes(word))) {
      detected.push(context);
    }
  });
  
  // Special handling for "çok" - only overwhelming if it's with negative context
  if (lowerText.includes('çok')) {
    const negativeContext = ['yorgun', 'stresli', 'zor', 'kötü', 'berbat', 'bitkin', 'tükenmiş'];
    const hasNegativeContext = negativeContext.some(word => lowerText.includes(word));
    
    if (hasNegativeContext) {
      detected.push('overwhelming');
    }
  }
  
  return detected;
};

// Emotional intensity analysis
const analyzeEmotionalIntensity = (text) => {
  if (!text || typeof text !== 'string') return 'low';
  
  const intensityMarkers = {
    high: ['aşırı', 'müthiş', 'berbat', 'korkunç', 'dehşet'],
    medium: ['biraz', 'az', 'orta', 'normal'],
    low: ['hafif', 'küçük', 'minimal']
  };
  
  const lowerText = text.toLowerCase();
  let maxIntensity = 'low';
  
  // Special handling for "çok" - only high intensity if it's with negative words
  const negativeWords = ['kötü', 'berbat', 'korkunç', 'dehşet', 'üzgün', 'kızgın', 'sinirli', 'stresli', 'mutsuz', 'yorgun', 'bitkin', 'tükenmiş', 'bıktım', 'usandım', 'sıkıldım', 'sıkkın', 'sıkıntılı', 'korku', 'endişe', 'kaygı', 'hasta', 'acı', 'ağrı', 'sıkıntı', 'problem', 'sorun', 'başarısız', 'kaybettim', 'hata', 'yanlış', 'felaket', 'trajedi', 'üzücü', 'acıklı', 'hüzünlü', 'kederli'];
  const positiveWords = ['mutlu', 'güzel', 'harika', 'mükemmel', 'süper', 'muhteşem', 'iyi', 'başarılı', 'gururlu', 'sevinçli', 'neşeli', 'keyifli', 'hoş', 'güzel'];
  
  if (lowerText.includes('çok')) {
    const hasNegative = negativeWords.some(word => lowerText.includes(word));
    const hasPositive = positiveWords.some(word => lowerText.includes(word));
    
    if (hasNegative) {
      maxIntensity = 'high'; // "çok mutsuz" = high intensity
    } else if (hasPositive) {
      maxIntensity = 'medium'; // Positive "çok" is medium intensity
    }
  }
  
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
  if (!text || typeof text !== 'string') return [];
  
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
  if (!text || typeof text !== 'string') return [];
  
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
  if (!text || typeof text !== 'string') return { hasQuestion: false, hasExclamation: false, hasNegation: false, hasConjunction: false, emotionalWords: 0 };
  
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
  if (!text || typeof text !== 'string') return { because: false, result: false, condition: false };
  
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
  if (!text || typeof text !== 'string') return { before: false, after: false, now: false, duration: false };
  
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
  
  // Ensure text is safe to use
  const safeText = text && typeof text === 'string' ? text.trim() : '';
  
  // Get contextual analysis
  const context = analyzeContextualMood(safeText, sentiment, userHistory);
  
  // Confidence-based recommendation threshold - VERY SELECTIVE
  let minConfidence = 0.7; // Much higher threshold for better accuracy and consistency
  
  // Adaptive threshold based on sentence structure
  if (sentiment.sentenceAnalysis) {
    const { completeness, emotionalIntensity, hasQuestion } = sentiment.sentenceAnalysis;
    
    // Slightly lower threshold for complete sentences
    if (completeness === 'complete') {
      minConfidence *= 0.85; // 15% lower threshold
    }
    
    // Slightly lower threshold for high emotional intensity
    if (emotionalIntensity === 'high') {
      minConfidence *= 0.75; // 25% lower threshold
    } else if (emotionalIntensity === 'medium') {
      minConfidence *= 0.9; // 10% lower threshold
    }
    
    // Slightly lower threshold for questions (often emotional)
    if (hasQuestion) {
      minConfidence *= 0.9; // 10% lower threshold
    }
  }
  
  if (sentiment.confidence < minConfidence && text.length < 20) {
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
    
    // Physical context scoring - MORE BALANCED
    if (physicalContext.includes('tired')) {
      moodScores.tired += 0.6;
      if (temporalContext.duration) {
        moodScores.tired += 0.1;
        moodScores.exhausted += 0.2; // Uzun süre yorgunluk = exhausted
      }
    }
    
    // Situational context scoring - MORE BALANCED
    if (situationContext.includes('forced')) {
      moodScores.frustrated += 0.5;
      if (timeContext.includes('weekend')) moodScores.frustrated += 0.2;
    }
    
    // Only apply overwhelming if it's actually negative context
    if (situationContext.includes('overwhelming') && sentiment.label === 'negative') {
      moodScores.overwhelmed += 0.6;
      moodScores.stressed += 0.4; // Aşırı yüklenme = stress
      if (sentenceContext.emotionalWords > 2) {
        moodScores.overwhelmed += 0.1;
        moodScores.stressed += 0.1;
      }
    }
    
    // Emotional intensity scoring - MORE BALANCED
    if (emotionalIntensity === 'high') {
      if (sentenceContext.hasExclamation) {
        moodScores.angry += 0.4;
        moodScores.surprised += 0.2; // Ünlem + yüksek yoğunluk = surprised
      } else {
        moodScores.sad += 0.4;
        moodScores.disappointed += 0.2; // Yüksek yoğunluk + üzüntü = disappointed
      }
    }
    
    // Low emotional intensity
    if (emotionalIntensity === 'low') {
      moodScores.bored += 0.3;
      moodScores.content += 0.2; // Düşük yoğunluk = content veya bored
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
    
    // CRITICAL: Check for explicit negative words first - STRONGER OVERRIDE
    const lowerText = safeText.toLowerCase(); // Define lowerText first
    
    const explicitNegativeWords = [
      // Physical/emotional states
      'mutsuz', 'üzgün', 'kızgın', 'sinirli', 'stresli', 'yorgun', 'bitkin', 'tükenmiş', 
      'bıktım', 'usandım', 'sıkıldım', 'sıkkın', 'sıkıntılı', 'korku', 'endişe', 'kaygı', 
      'hasta', 'acı', 'ağrı', 'sıkıntı', 'problem', 'sorun', 'başarısız', 'kaybettim', 
      'hata', 'yanlış', 'kötü', 'berbat', 'korkunç', 'dehşet', 'felaket', 'trajedi', 
      'üzücü', 'acıklı', 'hüzünlü', 'kederli', 'yorucu', 'sıkıcı', 'can sıkıcı',
      // Personal forms
      'mutsuzum', 'üzgünüm', 'kızgınım', 'sinirliyim', 'stresliyim', 'yorgunum', 
      'bitkinim', 'tükenmişim', 'sıkkınım', 'sıkıntılıyım', 'korkuyorum', 'endişeliyim', 
      'kaygılıyım', 'hastayım', 'başarısızım', 'kötüyüm', 'berbatım', 'korkunçum',
      'sıkılıyorum', 'sıkılmaya başladım', 'sıkılmaya başlıyorum', 'sıkılmaya başlıyorum',
      // Intensity modifiers with negative words
      'çok yorgun', 'çok bitkin', 'çok tükenmiş', 'çok mutsuz', 'çok üzgün', 
      'çok kızgın', 'çok sinirli', 'çok stresli', 'çok sıkkın', 'çok sıkıntılı',
      'çok kötü', 'çok berbat', 'çok korkunç', 'çok dehşet', 'çok hasta',
      'çok yorucu', 'çok sıkıcı', 'çok can sıkıcı',
      // English equivalents
      'very tired', 'very exhausted', 'very sad', 'very angry', 'very stressed',
      'very frustrated', 'very overwhelmed', 'very sick', 'very bad', 'very terrible',
      'very boring', 'very tiring', 'very exhausting'
    ];
    
    const hasExplicitNegative = lowerText && explicitNegativeWords.some(word => lowerText.includes(word));
    
    
    if (hasExplicitNegative) {
      // STRONG OVERRIDE: If explicit negative words found, force negative sentiment and specific moods
      // Don't modify label directly, use it in the override logic
      
      // Reset all mood scores first
      Object.keys(moodScores).forEach(key => moodScores[key] = 0);
      
      // Apply specific negative mood scoring based on detected words
      if (lowerText.includes('yorgun') || lowerText.includes('bitkin') || lowerText.includes('tükenmiş')) {
        moodScores.tired = 0.9;
        moodScores.exhausted = 0.8;
        moodScores.overwhelmed = 0.6;
      }
      
      if (lowerText.includes('mutsuz') || lowerText.includes('üzgün') || lowerText.includes('hüzünlü')) {
        moodScores.sad = 0.9;
        moodScores.disappointed = 0.7;
        moodScores.lonely = 0.5;
      }
      
      if (lowerText.includes('kızgın') || lowerText.includes('sinirli') || lowerText.includes('öfkeli')) {
        moodScores.angry = 0.9;
        moodScores.frustrated = 0.8;
        moodScores.stressed = 0.6;
      }
      
      if (lowerText.includes('stresli') || lowerText.includes('baskı') || lowerText.includes('zorluk')) {
        moodScores.stressed = 0.9;
        moodScores.overwhelmed = 0.8;
        moodScores.anxious = 0.7;
      }
      
      if (lowerText.includes('endişe') || lowerText.includes('kaygı') || lowerText.includes('korku')) {
        moodScores.anxious = 0.9;
        moodScores.worried = 0.8;
        moodScores.stressed = 0.6;
      }
      
      if (lowerText.includes('bıktım') || lowerText.includes('usandım') || lowerText.includes('sıkıldım')) {
        moodScores.frustrated = 0.9;
        moodScores.bored = 0.8;
        moodScores.overwhelmed = 0.6;
      }
      
      if (lowerText.includes('hasta') || lowerText.includes('acı') || lowerText.includes('ağrı')) {
        moodScores.tired = 0.8;
        moodScores.sad = 0.7;
        moodScores.anxious = 0.5;
      }
      
      // Fallback: if no specific mood detected, apply general negative scoring
      if (Object.values(moodScores).every(score => score === 0)) {
        moodScores.sad = 0.8;
        moodScores.disappointed = 0.6;
        moodScores.tired = 0.4;
        moodScores.anxious = 0.3;
        moodScores.worried = 0.3;
        moodScores.overwhelmed = 0.2;
        moodScores.stressed = 0.2;
        moodScores.frustrated = 0.2;
      }
      
      // Ensure ALL positive moods are ZERO
      moodScores.happy = 0;
      moodScores.excited = 0;
      moodScores.grateful = 0;
      moodScores.hopeful = 0;
      moodScores.proud = 0;
      moodScores.peaceful = 0;
      moodScores.content = 0;
      moodScores.relieved = 0;
      moodScores.motivated = 0;
      moodScores.curious = 0; // Add curious to positive moods to prevent it
    } else if (label === 'positive') {
      // Only apply positive bias if no explicit negative words
      moodScores.happy += 0.8;
      moodScores.excited += 0.6;
      
      if (sentenceContext.emotionalWords > 1) {
        moodScores.excited += 0.3;
        moodScores.happy += 0.2;
      }
      if (sentenceContext.hasExclamation) {
        moodScores.excited += 0.4;
        moodScores.surprised += 0.2;
      }
      
      // Reduce negative mood scores for positive sentiment
      moodScores.overwhelmed *= 0.1;
      moodScores.stressed *= 0.1;
      moodScores.frustrated *= 0.1;
      moodScores.sad *= 0.1;
      moodScores.angry *= 0.1;
    }
    
  // Enhanced specific context scoring
    
    // Love/romance specific scoring - ENHANCED
    if (lowerText.includes('aşık') || lowerText.includes('kelebek') || lowerText.includes('uçuşuyor') || 
        lowerText.includes('sevgi') || lowerText.includes('aşk') || lowerText.includes('sevgili')) {
      moodScores.excited += 0.8;
      moodScores.happy += 0.6;
      moodScores.surprised += 0.4;
    }
    
    // Very positive expressions - STRONG POSITIVE BIAS
    if (lowerText.includes('çok mutluyum') || lowerText.includes('çok mutlu') || 
        lowerText.includes('harika') || lowerText.includes('mükemmel') || 
        lowerText.includes('süper') || lowerText.includes('muhteşem')) {
      moodScores.happy += 0.9;
      moodScores.excited += 0.7;
      moodScores.proud += 0.3;
    }
    
    // Positive feelings - STRONG POSITIVE BIAS
    if (lowerText.includes('mutluyum') || lowerText.includes('mutlu') || 
        lowerText.includes('sevinçli') || lowerText.includes('neşeli') || 
        lowerText.includes('gururlu') || lowerText.includes('başarılı')) {
      moodScores.happy += 0.7;
      moodScores.excited += 0.4;
    }
    
    if (lowerText.includes('çarpıntı') || lowerText.includes('kalp') || lowerText.includes('kalp atışı')) {
      moodScores.excited += 0.6;
      moodScores.anxious += 0.3; // Positive anxiety from love
    }
    
    // Work/achievement specific scoring - MORE SPECIFIC
    if (lowerText.includes('iş') || lowerText.includes('çalışma') || lowerText.includes('proje') || 
        lowerText.includes('görev') || lowerText.includes('sorumluluk') || lowerText.includes('düşünmekten')) {
      if (sentenceContext.emotionalWords > 1) {
        moodScores.stressed += 0.3;
        moodScores.overwhelmed += 0.2;
      }
      // Special case for repetitive work frustration
      if (lowerText.includes('her gün') || lowerText.includes('sürekli') || lowerText.includes('durmadan')) {
        moodScores.frustrated += 0.4;
        moodScores.overwhelmed += 0.3;
        moodScores.bored += 0.3;
      }
    }
    
    // Specific positive patterns
    if (lowerText.includes('başardım') || lowerText.includes('tamamladım') || lowerText.includes('kazandım')) {
      moodScores.proud += 0.6;
      moodScores.happy += 0.4;
    }
    
    if (lowerText.includes('güzel') || lowerText.includes('hoş') || lowerText.includes('keyifli')) {
      moodScores.happy += 0.4;
      moodScores.content += 0.3;
    }
    
    // Specific negative patterns
    if (lowerText.includes('başaramadım') || lowerText.includes('kaybettim') || lowerText.includes('hata')) {
      moodScores.disappointed += 0.5;
      moodScores.sad += 0.3;
    }
    
    if (lowerText.includes('korku') || lowerText.includes('endişe') || lowerText.includes('kaygı')) {
      moodScores.anxious += 0.5;
      moodScores.worried += 0.3;
    }
    
    // Frustration and boredom specific patterns - MORE SPECIFIC
    if (lowerText.includes('sıkılıyorum') || lowerText.includes('sıkıldım') || lowerText.includes('bıktım') || 
        lowerText.includes('usandım') || lowerText.includes('bezgin')) {
      moodScores.frustrated += 0.5;
      moodScores.bored += 0.4;
      moodScores.overwhelmed += 0.2;
    }
    
    // "Can't take it anymore" patterns - MORE SPECIFIC
    if (lowerText.includes('daha ne yapayım') || lowerText.includes('yeter artık') || 
        lowerText.includes('bıktım artık') || lowerText.includes('usandım artık')) {
      moodScores.frustrated += 0.6;
      moodScores.overwhelmed += 0.4;
      moodScores.angry += 0.2;
    }
    
    // Health/physical state scoring
    if (lowerText.includes('hasta') || lowerText.includes('rahatsız') || lowerText.includes('ağrı') || 
        lowerText.includes('sızı') || lowerText.includes('acı')) {
      moodScores.tired += 0.6;
      moodScores.sad += 0.4;
    }
    
    // Social context scoring
    if (lowerText.includes('arkadaş') || lowerText.includes('aile') || lowerText.includes('insanlar') || 
        lowerText.includes('birlikte') || lowerText.includes('sosyal')) {
      if (sentiment.label === 'positive') {
        moodScores.happy += 0.3;
        moodScores.excited += 0.2;
      }
    }
    
    // Weather/seasonal context scoring
    if (lowerText.includes('güneş') || lowerText.includes('güzel hava') || lowerText.includes('bahar')) {
      moodScores.happy += 0.3;
      moodScores.excited += 0.2;
    }
    
    if (lowerText.includes('yağmur') || lowerText.includes('kötü hava') || lowerText.includes('kış')) {
      moodScores.sad += 0.2;
      moodScores.tired += 0.2;
    }
    
    // Find the mood with highest score - BALANCED MINIMUM THRESHOLD for consistency
    const sortedMoods = Object.entries(moodScores)
      .sort(([,a], [,b]) => b - a)
      .filter(([,score]) => score > 0.3); // Balanced threshold for better consistency
    
    if (sortedMoods.length === 0) {
      // Fallback to basic sentiment analysis with explicit negative word check
      if (hasExplicitNegative) {
        // If explicit negative words found but no mood scored high enough, force tired/sad
        if (lowerText.includes('yorgun') || lowerText.includes('bitkin') || lowerText.includes('tükenmiş')) {
          return { mood: 'tired', reason: 'Yorgunluk belirtileri tespit edildi.' };
        } else if (lowerText.includes('mutsuz') || lowerText.includes('üzgün')) {
          return { mood: 'sad', reason: 'Üzüntü belirtileri tespit edildi.' };
        } else {
          return { mood: 'sad', reason: 'Olumsuz duygular tespit edildi.' };
        }
      } else if (label === 'positive') {
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
  if (contextualSuggestion && contextualSuggestion.mood) {
    suggestions.push({
      mood: contextualSuggestion.mood,
      reason: contextualSuggestion.reason,
      confidence: sentiment.confidence,
      type: 'primary'
    });
  }
  
  // If we have suggestions from contextual analysis, return early
  if (suggestions.length > 0) {
    return suggestions;
  }
  
  // Add alternative suggestions based on context
  const getAlternativeSuggestions = (context, sentiment, text = '') => {
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
    const lowerText = text && typeof text === 'string' ? text.toLowerCase() : '';
    if (lowerText && (lowerText.includes('aşık') || lowerText.includes('kelebek') || lowerText.includes('uçuşuyor'))) {
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
  const alternatives = getAlternativeSuggestions(context, sentiment, safeText);
  suggestions.push(...alternatives);
  
  // Filter out conflicting suggestions - NO CONTRADICTORY MOODS
  const filteredSuggestions = [];
  const positiveMoods = ['happy', 'excited', 'calm', 'grateful', 'hopeful', 'motivated', 'peaceful', 'proud', 'relieved', 'content'];
  const negativeMoods = ['sad', 'angry', 'tired', 'frustrated', 'anxious', 'overwhelmed', 'lonely', 'exhausted', 'stressed', 'confused', 'disappointed', 'worried', 'bored'];
  const neutralMoods = ['calm', 'curious', 'nostalgic', 'surprised'];
  
  // Group suggestions by sentiment
  const positiveSuggestions = suggestions.filter(s => positiveMoods.includes(s.mood));
  const negativeSuggestions = suggestions.filter(s => negativeMoods.includes(s.mood));
  const neutralSuggestions = suggestions.filter(s => neutralMoods.includes(s.mood));
  
  // Only keep suggestions that match the sentiment
  if (sentiment.label === 'positive') {
    filteredSuggestions.push(...positiveSuggestions);
    if (positiveSuggestions.length === 0) {
      // Add one positive fallback
      filteredSuggestions.push({
        mood: 'happy',
        reason: 'Pozitif bir durum.',
        confidence: 0.4,
        type: 'fallback'
      });
    }
  } else if (sentiment.label === 'negative') {
    filteredSuggestions.push(...negativeSuggestions);
    if (negativeSuggestions.length === 0) {
      // Add one negative fallback
      filteredSuggestions.push({
        mood: 'sad',
        reason: 'Olumsuz bir durum.',
        confidence: 0.4,
        type: 'fallback'
      });
    }
  } else {
    // Neutral - can mix but avoid extremes
    filteredSuggestions.push(...neutralSuggestions);
    if (neutralSuggestions.length === 0) {
      filteredSuggestions.push({
        mood: 'calm',
        reason: 'Nötr bir durum.',
        confidence: 0.4,
        type: 'fallback'
      });
    }
  }
  
  // Ensure minimum 2 suggestions but keep them consistent - STRICTER CONSISTENCY
  if (filteredSuggestions.length < 2 && sentiment.confidence > 0.5) { // Higher confidence threshold
    const compatibleMoods = sentiment.label === 'positive' ? positiveMoods : 
                           sentiment.label === 'negative' ? negativeMoods : 
                           neutralMoods;
    
    const usedMoods = filteredSuggestions.map(s => s.mood);
    const availableMoods = compatibleMoods.filter(mood => !usedMoods.includes(mood));
    
    if (availableMoods.length > 0) {
      const fallbackMood = availableMoods[0];
      filteredSuggestions.push({
        mood: fallbackMood,
        reason: 'Alternatif mood önerisi',
        confidence: 0.4, // Higher confidence for fallback
        type: 'fallback'
      });
    }
  }
  
  // Replace original suggestions with filtered ones
  suggestions.length = 0;
  suggestions.push(...filteredSuggestions);
  
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
        suggestions.push(patternSuggestion);
      }
    } else if (isMoodConflicting(sentiment, currentMood)) {
      // Mood conflicts with sentiment - suggest correction
    
    // Add conflict resolution suggestion using contextual analysis
    if (contextualSuggestion.mood && contextualSuggestion.mood !== currentMood) {
      suggestions.push({
        mood: contextualSuggestion.mood,
        reason: `Metnin ${sentiment.label} ama mood'un ${currentMood}. ${contextualSuggestion.mood} mood'u daha uygun olabilir!`,
        confidence: sentiment.confidence,
        type: 'conflict-resolution'
      });
    }
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
