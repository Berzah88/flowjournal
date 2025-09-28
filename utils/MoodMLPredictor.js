// utils/MoodMLPredictor.js
// Machine Learning tabanlı mood tahmin sistemi

export class MoodMLPredictor {
  constructor() {
    this.trainingData = [];
    this.featureWeights = new Map();
    this.patterns = new Map();
    this.userProfiles = new Map();
    this.initializeDefaultWeights();
  }

  // Varsayılan feature ağırlıkları
  initializeDefaultWeights() {
    this.featureWeights.set('sentiment_score', 0.3);
    this.featureWeights.set('ngram_score', 0.25);
    this.featureWeights.set('contextual_score', 0.2);
    this.featureWeights.set('intensity_score', 0.15);
    this.featureWeights.set('temporal_pattern', 0.1);
  }

  // Feature extraction
  extractFeatures(text, context, userHistory = []) {
    const features = {
      // Text-based features
      sentiment_score: this.calculateSentimentScore(text),
      ngram_score: this.calculateNgramScore(text),
      contextual_score: this.calculateContextualScore(text, context),
      intensity_score: this.calculateIntensityScore(text),
      
      // Temporal features
      temporal_pattern: this.calculateTemporalPattern(userHistory),
      time_of_day: this.getTimeOfDay(),
      day_of_week: this.getDayOfWeek(),
      
      // User-specific features
      user_mood_history: this.calculateUserMoodHistory(userHistory),
      user_sentiment_trend: this.calculateUserSentimentTrend(userHistory),
      
      // Context features
      text_length: text.length,
      word_count: text.split(/\s+/).length,
      punctuation_density: this.calculatePunctuationDensity(text),
      caps_ratio: this.calculateCapsRatio(text),
      
      // Emotional markers
      positive_word_ratio: this.calculatePositiveWordRatio(text),
      negative_word_ratio: this.calculateNegativeWordRatio(text),
      emotional_word_density: this.calculateEmotionalWordDensity(text)
    };

    return features;
  }

  // Sentiment score calculation
  calculateSentimentScore(text) {
    // Bu fonksiyon mevcut analyzeSentiment fonksiyonunu kullanabilir
    // Şimdilik basit bir implementasyon
    const positiveWords = ['mutlu', 'sevinçli', 'heyecanlı', 'gururlu', 'başarılı'];
    const negativeWords = ['üzgün', 'kızgın', 'yorgun', 'stresli', 'başarısız'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
    });
    
    const total = positiveCount + negativeCount;
    return total > 0 ? (positiveCount - negativeCount) / total : 0;
  }

  // N-gram score calculation
  calculateNgramScore(text) {
    // 2-gram ve 3-gram'ların sentiment skorunu hesapla
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    let count = 0;
    
    // 2-gram analysis
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      const bigramScore = this.getNgramSentiment(bigram);
      score += bigramScore;
      count++;
    }
    
    return count > 0 ? score / count : 0;
  }

  // Contextual score calculation
  calculateContextualScore(text, context) {
    let score = 0;
    const lowerText = text.toLowerCase();
    
    // Time context
    if (context.timeContext?.includes('weekend')) score += 0.2;
    if (context.timeContext?.includes('evening')) score += 0.1;
    
    // Situation context
    if (context.situationContext?.includes('forced')) score -= 0.3;
    if (context.situationContext?.includes('overwhelming')) score -= 0.4;
    
    // Social context
    if (context.socialContext?.includes('alone')) score -= 0.2;
    if (context.socialContext?.includes('social')) score += 0.2;
    
    return Math.max(-1, Math.min(1, score));
  }

  // Intensity score calculation
  calculateIntensityScore(text) {
    const intensityMarkers = {
      high: ['çok', 'aşırı', 'müthiş', 'berbat', 'korkunç'],
      medium: ['biraz', 'az', 'orta', 'normal'],
      low: ['hafif', 'küçük', 'minimal']
    };
    
    const lowerText = text.toLowerCase();
    let intensityScore = 0;
    
    Object.entries(intensityMarkers).forEach(([level, markers]) => {
      const weight = level === 'high' ? 1 : level === 'medium' ? 0.5 : 0.2;
      markers.forEach(marker => {
        if (lowerText.includes(marker)) {
          intensityScore += weight;
        }
      });
    });
    
    return Math.min(intensityScore, 1);
  }

  // Temporal pattern calculation
  calculateTemporalPattern(userHistory) {
    if (userHistory.length < 5) return 0;
    
    const recentEntries = userHistory.slice(-10);
    const currentHour = new Date().getHours();
    
    // Aynı saatlerdeki mood pattern'ini analiz et
    const sameHourEntries = recentEntries.filter(entry => {
      const entryHour = new Date(entry.timestamp).getHours();
      return Math.abs(entryHour - currentHour) <= 1;
    });
    
    if (sameHourEntries.length === 0) return 0;
    
    const avgSentiment = sameHourEntries.reduce((sum, entry) => 
      sum + (entry.sentiment?.score || 0), 0) / sameHourEntries.length;
    
    return avgSentiment / 100; // Normalize to -1 to 1
  }

  // User mood history calculation
  calculateUserMoodHistory(userHistory) {
    if (userHistory.length < 3) return 0;
    
    const recentMoods = userHistory.slice(-5);
    const moodCounts = {};
    
    recentMoods.forEach(entry => {
      const mood = entry.mood;
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });
    
    // En sık kullanılan mood'u bul
    const dominantMood = Object.keys(moodCounts).reduce((a, b) => 
      moodCounts[a] > moodCounts[b] ? a : b
    );
    
    // Dominant mood'un sentiment skorunu döndür
    return this.getMoodSentimentScore(dominantMood);
  }

  // User sentiment trend calculation
  calculateUserSentimentTrend(userHistory) {
    if (userHistory.length < 5) return 0;
    
    const recentEntries = userHistory.slice(-10);
    const sentiments = recentEntries.map(entry => entry.sentiment?.score || 0);
    
    // Trend hesaplama (basit linear regression)
    let trend = 0;
    for (let i = 1; i < sentiments.length; i++) {
      trend += sentiments[i] - sentiments[i - 1];
    }
    
    return trend / (sentiments.length - 1) / 100; // Normalize
  }

  // Helper functions
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  getDayOfWeek() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  }

  calculatePunctuationDensity(text) {
    const punctuationCount = (text.match(/[.!?]/g) || []).length;
    return punctuationCount / text.length;
  }

  calculateCapsRatio(text) {
    const capsCount = (text.match(/[A-ZÇĞIÖŞÜ]/g) || []).length;
    return capsCount / text.length;
  }

  calculatePositiveWordRatio(text) {
    const positiveWords = ['mutlu', 'sevinçli', 'heyecanlı', 'gururlu', 'başarılı', 'harika', 'mükemmel'];
    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => 
      positiveWords.some(pw => word.includes(pw))
    ).length;
    return positiveCount / words.length;
  }

  calculateNegativeWordRatio(text) {
    const negativeWords = ['üzgün', 'kızgın', 'yorgun', 'stresli', 'başarısız', 'kötü', 'berbat'];
    const words = text.toLowerCase().split(/\s+/);
    const negativeCount = words.filter(word => 
      negativeWords.some(nw => word.includes(nw))
    ).length;
    return negativeCount / words.length;
  }

  calculateEmotionalWordDensity(text) {
    const emotionalWords = [
      'mutlu', 'üzgün', 'kızgın', 'heyecanlı', 'yorgun', 'stresli', 'gururlu',
      'korkmuş', 'endişeli', 'rahat', 'huzurlu', 'sakin', 'coşkulu', 'enerjik'
    ];
    const words = text.toLowerCase().split(/\s+/);
    const emotionalCount = words.filter(word => 
      emotionalWords.some(ew => word.includes(ew))
    ).length;
    return emotionalCount / words.length;
  }

  getNgramSentiment(ngram) {
    // Basit n-gram sentiment mapping
    const positiveNgrams = ['çok mutlu', 'harika gün', 'mükemmel iş', 'başarılı oldum'];
    const negativeNgrams = ['çok kötü', 'berbat gün', 'başarısız oldum', 'kaybettim'];
    
    if (positiveNgrams.includes(ngram)) return 1;
    if (negativeNgrams.includes(ngram)) return -1;
    return 0;
  }

  getMoodSentimentScore(mood) {
    const moodScores = {
      'happy': 0.8,
      'excited': 0.9,
      'calm': 0.3,
      'tired': -0.4,
      'sad': -0.7,
      'angry': -0.8,
      'frustrated': -0.6,
      'anxious': -0.5,
      'overwhelmed': -0.7
    };
    return moodScores[mood] || 0;
  }

  // Machine Learning prediction
  predictMood(features) {
    let moodScores = {};
    
    // Her mood için skor hesapla
    const moods = ['happy', 'excited', 'calm', 'tired', 'sad', 'angry', 'frustrated', 'anxious', 'overwhelmed'];
    
    moods.forEach(mood => {
      let score = 0;
      
      // Feature weights ile çarp
      Object.entries(features).forEach(([featureName, featureValue]) => {
        const weight = this.featureWeights.get(featureName) || 0;
        const moodFeatureScore = this.calculateMoodFeatureScore(mood, featureName, featureValue);
        score += weight * moodFeatureScore;
      });
      
      moodScores[mood] = score;
    });
    
    // En yüksek skorlu mood'u bul
    const predictedMood = Object.keys(moodScores).reduce((a, b) => 
      moodScores[a] > moodScores[b] ? a : b
    );
    
    const confidence = Math.abs(moodScores[predictedMood]);
    
    return {
      mood: predictedMood,
      confidence: Math.min(confidence, 1),
      scores: moodScores,
      reasoning: this.generateReasoning(predictedMood, features, moodScores)
    };
  }

  // Mood-feature score calculation
  calculateMoodFeatureScore(mood, featureName, featureValue) {
    // Her mood için feature'ların nasıl etkilediğini tanımla
    const moodFeatureMatrix = {
      'happy': {
        'sentiment_score': featureValue > 0 ? featureValue : -featureValue * 0.5,
        'ngram_score': featureValue > 0 ? featureValue : -featureValue * 0.5,
        'contextual_score': featureValue > 0 ? featureValue : -featureValue * 0.5,
        'intensity_score': featureValue * 0.8,
        'temporal_pattern': featureValue > 0 ? featureValue : -featureValue * 0.3,
        'user_mood_history': featureValue > 0 ? featureValue : -featureValue * 0.5,
        'positive_word_ratio': featureValue * 2,
        'negative_word_ratio': -featureValue * 2
      },
      'sad': {
        'sentiment_score': featureValue < 0 ? -featureValue : featureValue * 0.5,
        'ngram_score': featureValue < 0 ? -featureValue : featureValue * 0.5,
        'contextual_score': featureValue < 0 ? -featureValue : featureValue * 0.5,
        'intensity_score': featureValue * 0.6,
        'temporal_pattern': featureValue < 0 ? -featureValue : featureValue * 0.3,
        'user_mood_history': featureValue < 0 ? -featureValue : featureValue * 0.5,
        'positive_word_ratio': -featureValue * 2,
        'negative_word_ratio': featureValue * 2
      },
      'tired': {
        'sentiment_score': Math.abs(featureValue) * 0.3,
        'contextual_score': featureValue < 0 ? -featureValue * 0.8 : featureValue * 0.2,
        'intensity_score': -featureValue * 0.5,
        'temporal_pattern': featureValue < 0 ? -featureValue * 0.6 : featureValue * 0.2,
        'user_mood_history': featureValue < 0 ? -featureValue * 0.7 : featureValue * 0.3,
        'text_length': featureValue > 100 ? -0.3 : 0.1,
        'word_count': featureValue > 20 ? -0.3 : 0.1
      }
      // Diğer mood'lar için de benzer tanımlamalar...
    };
    
    const moodMatrix = moodFeatureMatrix[mood];
    if (moodMatrix && moodMatrix[featureName] !== undefined) {
      return moodMatrix[featureName];
    }
    
    // Default: feature value'yu direkt kullan
    return featureValue;
  }

  // Reasoning generation
  generateReasoning(predictedMood, features, moodScores) {
    const topFeatures = Object.entries(features)
      .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))
      .slice(0, 3);
    
    const reasons = [];
    
    topFeatures.forEach(([featureName, featureValue]) => {
      if (Math.abs(featureValue) > 0.3) {
        reasons.push(`${featureName}: ${featureValue.toFixed(2)}`);
      }
    });
    
    return `Predicted ${predictedMood} based on: ${reasons.join(', ')}`;
  }

  // Training with user feedback
  trainWithFeedback(text, predictedMood, actualMood, isCorrect) {
    const features = this.extractFeatures(text, {}, []);
    const feedback = {
      text,
      predictedMood,
      actualMood,
      isCorrect,
      features,
      timestamp: new Date().toISOString()
    };
    
    this.trainingData.push(feedback);
    
    // Feature weights'leri güncelle
    if (!isCorrect) {
      this.updateFeatureWeights(features, predictedMood, actualMood);
    }
    
    // Pattern'leri güncelle
    this.updatePatterns(features, actualMood);
  }

  // Feature weights update
  updateFeatureWeights(features, predictedMood, actualMood) {
    // Yanlış tahmin durumunda feature weights'leri ayarla
    Object.entries(features).forEach(([featureName, featureValue]) => {
      const currentWeight = this.featureWeights.get(featureName) || 0;
      
      // Eğer bu feature yanlış tahmine katkıda bulunduysa, ağırlığını azalt
      const predictedScore = this.calculateMoodFeatureScore(predictedMood, featureName, featureValue);
      const actualScore = this.calculateMoodFeatureScore(actualMood, featureName, featureValue);
      
      if (Math.abs(predictedScore) > Math.abs(actualScore)) {
        // Bu feature yanlış tahmine katkıda bulundu
        const newWeight = currentWeight * 0.95; // %5 azalt
        this.featureWeights.set(featureName, Math.max(newWeight, 0.01));
      } else {
        // Bu feature doğru tahmine katkıda bulundu
        const newWeight = currentWeight * 1.02; // %2 artır
        this.featureWeights.set(featureName, Math.min(newWeight, 0.5));
      }
    });
  }

  // Patterns update
  updatePatterns(features, actualMood) {
    const patternKey = this.generatePatternKey(features);
    
    if (!this.patterns.has(patternKey)) {
      this.patterns.set(patternKey, {});
    }
    
    const pattern = this.patterns.get(patternKey);
    pattern[actualMood] = (pattern[actualMood] || 0) + 1;
  }

  // Pattern key generation
  generatePatternKey(features) {
    const keyFeatures = [
      'sentiment_score',
      'intensity_score',
      'time_of_day',
      'day_of_week'
    ];
    
    return keyFeatures.map(feature => {
      const value = features[feature];
      if (typeof value === 'number') {
        return Math.round(value * 10) / 10; // 1 decimal place
      }
      return value;
    }).join('|');
  }

  // Get accuracy metrics
  getAccuracyMetrics() {
    if (this.trainingData.length === 0) return null;
    
    const correct = this.trainingData.filter(d => d.isCorrect).length;
    const total = this.trainingData.length;
    const accuracy = correct / total;
    
    // Mood-specific accuracy
    const moodAccuracy = {};
    const moods = [...new Set(this.trainingData.map(d => d.actualMood))];
    
    moods.forEach(mood => {
      const moodData = this.trainingData.filter(d => d.actualMood === mood);
      const moodCorrect = moodData.filter(d => d.isCorrect).length;
      moodAccuracy[mood] = moodCorrect / moodData.length;
    });
    
    return {
      overall: { accuracy, correct, total },
      byMood: moodAccuracy,
      featureWeights: Object.fromEntries(this.featureWeights)
    };
  }

  // Export/Import
  exportModel() {
    return {
      trainingData: this.trainingData,
      featureWeights: Object.fromEntries(this.featureWeights),
      patterns: Object.fromEntries(this.patterns),
      exportDate: new Date().toISOString()
    };
  }

  importModel(data) {
    if (data.trainingData) this.trainingData = data.trainingData;
    if (data.featureWeights) this.featureWeights = new Map(Object.entries(data.featureWeights));
    if (data.patterns) this.patterns = new Map(Object.entries(data.patterns));
  }
}

// Singleton instance
export const moodMLPredictor = new MoodMLPredictor();
