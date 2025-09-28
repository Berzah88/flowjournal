// utils/EnhancedMoodPredictor.js
// Geliştirilmiş mood tahmin sistemi - tüm yeni modülleri entegre eder

import { moodAccuracyTracker } from './MoodAccuracyTracker';
import { advancedTextAnalyzer } from './AdvancedTextAnalyzer';
import { moodMLPredictor } from './MoodMLPredictor';
import { 
  MOODS, 
  EXTENDED_MOODS, 
  analyzeSentiment as originalAnalyzeSentiment,
  getSmartMoodSuggestion as originalGetSmartMoodSuggestion
} from './MoodPredictor';

export class EnhancedMoodPredictor {
  constructor() {
    this.accuracyThreshold = 0.6; // Minimum accuracy threshold
    this.confidenceThreshold = 0.4; // Minimum confidence threshold
    this.ensembleWeights = {
      original: 0.3,
      advanced: 0.3,
      ml: 0.4
    };
  }

  // Ana tahmin fonksiyonu - ensemble approach
  async predictMood(text, context = {}, userHistory = []) {
    try {
      // 1. Orijinal sistem
      const originalSentiment = originalAnalyzeSentiment(text, userHistory);
      const originalSuggestion = originalGetSmartMoodSuggestion(originalSentiment, null, userHistory, text);

      // 2. Gelişmiş text analizi
      const advancedAnalysis = advancedTextAnalyzer.analyzeText(text);
      const advancedSuggestion = this.getAdvancedMoodSuggestion(advancedAnalysis, context);

      // 3. ML tabanlı tahmin
      const features = moodMLPredictor.extractFeatures(text, context, userHistory);
      const mlPrediction = moodMLPredictor.predictMood(features);

      // 4. Ensemble prediction
      const ensembleResult = this.combinePredictions(
        originalSuggestion,
        advancedSuggestion,
        mlPrediction
      );

      // 5. Accuracy tracking için prediction kaydet
      const predictionId = moodAccuracyTracker.recordPrediction(ensembleResult, {
        text,
        context,
        userHistory: userHistory.slice(-5) // Son 5 entry
      });

      // 6. Sonuç döndür
      return {
        ...ensembleResult,
        predictionId,
        components: {
          original: originalSuggestion,
          advanced: advancedSuggestion,
          ml: mlPrediction
        },
        confidence: this.calculateEnsembleConfidence(ensembleResult),
        recommendations: this.generateRecommendations(ensembleResult, text, context)
      };

    } catch (error) {
      console.error('Enhanced mood prediction error:', error);
      // Fallback to original system
      const fallbackSentiment = originalAnalyzeSentiment(text, userHistory);
      const fallbackSuggestion = originalGetSmartMoodSuggestion(fallbackSentiment, null, userHistory, text);
      
      return {
        ...fallbackSuggestion,
        predictionId: null,
        components: { original: fallbackSuggestion, advanced: null, ml: null },
        confidence: fallbackSentiment.confidence,
        recommendations: [],
        error: 'Enhanced prediction failed, using fallback'
      };
    }
  }

  // Gelişmiş analiz sonucundan mood önerisi
  getAdvancedMoodSuggestion(analysis, context) {
    const { finalScore, confidence, label } = analysis;
    
    // Score'a göre mood mapping
    let suggestedMood = 'calm';
    let reason = 'Nötr durum';

    if (finalScore > 20) {
      if (analysis.intensityAnalysis.level === 'high') {
        suggestedMood = 'excited';
        reason = 'Yüksek pozitif enerji';
      } else {
        suggestedMood = 'happy';
        reason = 'Pozitif duygular';
      }
    } else if (finalScore < -20) {
      if (analysis.contextualAnalysis.foundPhrases.some(p => p.mood === 'tired')) {
        suggestedMood = 'tired';
        reason = 'Fiziksel yorgunluk belirtileri';
      } else if (analysis.contextualAnalysis.foundPhrases.some(p => p.mood === 'frustrated')) {
        suggestedMood = 'frustrated';
        reason = 'Frustrasyon belirtileri';
      } else {
        suggestedMood = 'sad';
        reason = 'Olumsuz duygular';
      }
    }

    // Contextual adjustments
    if (context.timeContext?.includes('evening') && suggestedMood === 'tired') {
      suggestedMood = 'exhausted';
      reason = 'Akşam yorgunluğu';
    }

    if (context.situationContext?.includes('overwhelming')) {
      suggestedMood = 'overwhelmed';
      reason = 'Aşırı yüklenme hissi';
    }

    return {
      mood: suggestedMood,
      reason,
      confidence,
      type: 'advanced',
      analysis: analysis
    };
  }

  // Ensemble prediction combination
  combinePredictions(original, advanced, ml) {
    const moodVotes = {};
    const reasons = [];
    let totalConfidence = 0;

    // Orijinal sistem oyu
    if (original && original.length > 0) {
      const primaryMood = original[0].mood;
      moodVotes[primaryMood] = (moodVotes[primaryMood] || 0) + this.ensembleWeights.original;
      reasons.push(`Orijinal: ${original[0].reason}`);
      totalConfidence += this.ensembleWeights.original * 0.7; // Orijinal sistem confidence
    }

    // Gelişmiş analiz oyu
    if (advanced && advanced.mood) {
      moodVotes[advanced.mood] = (moodVotes[advanced.mood] || 0) + this.ensembleWeights.advanced;
      reasons.push(`Gelişmiş: ${advanced.reason}`);
      totalConfidence += this.ensembleWeights.advanced * advanced.confidence;
    }

    // ML tahmin oyu
    if (ml && ml.mood) {
      moodVotes[ml.mood] = (moodVotes[ml.mood] || 0) + this.ensembleWeights.ml;
      reasons.push(`ML: ${ml.reasoning}`);
      totalConfidence += this.ensembleWeights.ml * ml.confidence;
    }

    // En yüksek oy alan mood'u bul
    const predictedMood = Object.keys(moodVotes).reduce((a, b) => 
      moodVotes[a] > moodVotes[b] ? a : b
    );

    // Confidence hesaplama
    const finalConfidence = Math.min(totalConfidence, 1);

    return {
      mood: predictedMood,
      reason: reasons.join(' | '),
      confidence: finalConfidence,
      votes: moodVotes,
      type: 'ensemble'
    };
  }

  // Ensemble confidence hesaplama
  calculateEnsembleConfidence(result) {
    const { votes } = result;
    const maxVote = Math.max(...Object.values(votes));
    const totalVotes = Object.values(votes).reduce((sum, vote) => sum + vote, 0);
    
    // Consensus score (ne kadar çok sistem aynı mood'u öneriyor)
    const consensusScore = maxVote / totalVotes;
    
    // Final confidence
    return Math.min(result.confidence * consensusScore, 1);
  }

  // Öneriler oluşturma
  generateRecommendations(result, text, context) {
    const recommendations = [];

    // Düşük confidence uyarısı
    if (result.confidence < this.confidenceThreshold) {
      recommendations.push({
        type: 'warning',
        message: 'Tahmin güvenilirliği düşük. Daha detaylı yazabilirsin.',
        action: 'expand_text'
      });
    }

    // Context-based recommendations
    if (context.timeContext?.includes('weekend') && context.situationContext?.includes('work')) {
      recommendations.push({
        type: 'insight',
        message: 'Hafta sonu çalışma durumu tespit edildi.',
        action: 'consider_rest'
      });
    }

    if (context.physicalContext?.includes('tired')) {
      recommendations.push({
        type: 'suggestion',
        message: 'Yorgunluk belirtileri var. Dinlenmeyi düşün.',
        action: 'rest_suggestion'
      });
    }

    // Text length recommendations
    if (text.length < 20) {
      recommendations.push({
        type: 'tip',
        message: 'Daha uzun yazarsan mood tahmini daha doğru olur.',
        action: 'expand_text'
      });
    }

    return recommendations;
  }

  // Kullanıcı feedback'i işleme
  async processFeedback(predictionId, actualMood, userSatisfaction = null) {
    try {
      // Accuracy tracker'a feedback kaydet
      const success = moodAccuracyTracker.recordFeedback(predictionId, actualMood, userSatisfaction);
      
      if (success) {
        // ML model'i güncelle
        const prediction = moodAccuracyTracker.predictions.find(p => p.id === predictionId);
        if (prediction) {
          moodMLPredictor.trainWithFeedback(
            prediction.text,
            prediction.predictedMood,
            actualMood,
            prediction.isCorrect
          );
        }

        // Advanced analyzer'ı güncelle
        if (prediction) {
          advancedTextAnalyzer.learnFromFeedback(
            prediction.text,
            prediction.predictedMood,
            actualMood,
            prediction.isCorrect
          );
        }

        return {
          success: true,
          message: 'Feedback başarıyla kaydedildi ve modeller güncellendi.'
        };
      }

      return {
        success: false,
        message: 'Feedback kaydedilemedi.'
      };

    } catch (error) {
      console.error('Feedback processing error:', error);
      return {
        success: false,
        message: 'Feedback işlenirken hata oluştu.',
        error: error.message
      };
    }
  }

  // Accuracy raporu alma
  getAccuracyReport() {
    const accuracyReport = moodAccuracyTracker.getAccuracyReport();
    const mlMetrics = moodMLPredictor.getAccuracyMetrics();
    
    return {
      overall: accuracyReport.overall,
      byConfidence: accuracyReport.byConfidence,
      byMood: accuracyReport.byMood,
      byContext: accuracyReport.byContext,
      mlMetrics: mlMetrics,
      recommendations: accuracyReport.recommendations,
      recentAccuracy: moodAccuracyTracker.getRecentAccuracy(7),
      systemHealth: this.getSystemHealth()
    };
  }

  // Sistem sağlığı kontrolü
  getSystemHealth() {
    const recentAccuracy = moodAccuracyTracker.getRecentAccuracy(7);
    const health = {
      status: 'healthy',
      score: 1.0,
      issues: []
    };

    if (!recentAccuracy || recentAccuracy.accuracy < this.accuracyThreshold) {
      health.status = 'needs_improvement';
      health.score = recentAccuracy ? recentAccuracy.accuracy : 0.5;
      health.issues.push('Son 7 günün accuracy\'si düşük');
    }

    if (moodAccuracyTracker.accuracyMetrics.totalPredictions < 10) {
      health.status = 'learning';
      health.score = 0.7;
      health.issues.push('Henüz yeterli veri yok, sistem öğreniyor');
    }

    return health;
  }

  // Model güncelleme
  async updateModels() {
    try {
      // Feature weights'leri güncelle
      const accuracyReport = this.getAccuracyReport();
      
      if (accuracyReport.overall.accuracy < this.accuracyThreshold) {
        // Ensemble weights'leri ayarla
        this.adjustEnsembleWeights(accuracyReport);
      }

      // Advanced analyzer patterns'leri güncelle
      const advancedPatterns = advancedTextAnalyzer.exportPatterns();
      // Burada pattern'leri iyileştirebiliriz

      return {
        success: true,
        message: 'Modeller başarıyla güncellendi.',
        changes: {
          ensembleWeights: this.ensembleWeights,
          accuracyReport: accuracyReport.overall
        }
      };

    } catch (error) {
      console.error('Model update error:', error);
      return {
        success: false,
        message: 'Model güncelleme hatası.',
        error: error.message
      };
    }
  }

  // Ensemble weights ayarlama
  adjustEnsembleWeights(accuracyReport) {
    // Her component'in accuracy'sine göre weights'leri ayarla
    const components = ['original', 'advanced', 'ml'];
    const totalWeight = 1.0;
    
    // Basit weight adjustment (gerçek implementasyonda daha sofistike olabilir)
    if (accuracyReport.overall.accuracy < 0.6) {
      // ML component'ini güçlendir
      this.ensembleWeights.ml = Math.min(this.ensembleWeights.ml * 1.1, 0.6);
      this.ensembleWeights.original = Math.max(this.ensembleWeights.original * 0.95, 0.2);
      this.ensembleWeights.advanced = Math.max(this.ensembleWeights.advanced * 0.95, 0.2);
    }
  }

  // Export/Import
  exportSystem() {
    return {
      accuracyTracker: moodAccuracyTracker.exportData(),
      advancedAnalyzer: advancedTextAnalyzer.exportPatterns(),
      mlPredictor: moodMLPredictor.exportModel(),
      ensembleWeights: this.ensembleWeights,
      thresholds: {
        accuracy: this.accuracyThreshold,
        confidence: this.confidenceThreshold
      },
      exportDate: new Date().toISOString()
    };
  }

  importSystem(data) {
    try {
      if (data.accuracyTracker) {
        moodAccuracyTracker.importData(data.accuracyTracker);
      }
      if (data.advancedAnalyzer) {
        advancedTextAnalyzer.importPatterns(data.advancedAnalyzer);
      }
      if (data.mlPredictor) {
        moodMLPredictor.importModel(data.mlPredictor);
      }
      if (data.ensembleWeights) {
        this.ensembleWeights = data.ensembleWeights;
      }
      if (data.thresholds) {
        this.accuracyThreshold = data.thresholds.accuracy;
        this.confidenceThreshold = data.thresholds.confidence;
      }

      return { success: true, message: 'Sistem başarıyla yüklendi.' };
    } catch (error) {
      return { success: false, message: 'Sistem yükleme hatası.', error: error.message };
    }
  }

  // Test ve validation
  async validateSystem(testData = []) {
    if (testData.length === 0) {
      // Mevcut verilerden test seti oluştur
      const predictions = moodAccuracyTracker.predictions.filter(p => p.isCorrect !== null);
      testData = predictions.slice(-20); // Son 20 prediction'ı test et
    }

    const results = {
      total: testData.length,
      correct: 0,
      accuracy: 0,
      byMood: {},
      byConfidence: {}
    };

    for (const testCase of testData) {
      try {
        const prediction = await this.predictMood(testCase.text, testCase.context, []);
        const isCorrect = prediction.mood === testCase.actualMood;
        
        if (isCorrect) results.correct++;
        
        // Mood bazlı accuracy
        if (!results.byMood[testCase.actualMood]) {
          results.byMood[testCase.actualMood] = { total: 0, correct: 0 };
        }
        results.byMood[testCase.actualMood].total++;
        if (isCorrect) results.byMood[testCase.actualMood].correct++;

        // Confidence bazlı accuracy
        const confidenceBucket = prediction.confidence >= 0.7 ? 'high' : 
                                prediction.confidence >= 0.4 ? 'medium' : 'low';
        if (!results.byConfidence[confidenceBucket]) {
          results.byConfidence[confidenceBucket] = { total: 0, correct: 0 };
        }
        results.byConfidence[confidenceBucket].total++;
        if (isCorrect) results.byConfidence[confidenceBucket].correct++;

      } catch (error) {
        console.error('Validation error for test case:', testCase, error);
      }
    }

    results.accuracy = results.total > 0 ? results.correct / results.total : 0;

    // Mood bazlı accuracy hesapla
    Object.keys(results.byMood).forEach(mood => {
      const data = results.byMood[mood];
      data.accuracy = data.total > 0 ? data.correct / data.total : 0;
    });

    // Confidence bazlı accuracy hesapla
    Object.keys(results.byConfidence).forEach(bucket => {
      const data = results.byConfidence[bucket];
      data.accuracy = data.total > 0 ? data.correct / data.total : 0;
    });

    return results;
  }
}

// Singleton instance
export const enhancedMoodPredictor = new EnhancedMoodPredictor();

// Backward compatibility - mevcut fonksiyonları wrap et
export const analyzeSentiment = (text, userHistory = []) => {
  return originalAnalyzeSentiment(text, userHistory);
};

export const getSmartMoodSuggestion = async (sentiment, currentMood, userHistory = [], text = '') => {
  // Enhanced predictor kullan
  const result = await enhancedMoodPredictor.predictMood(text, {}, userHistory);
  
  // Orijinal format'a çevir
  return [{
    mood: result.mood,
    reason: result.reason,
    confidence: result.confidence,
    type: 'enhanced'
  }];
};

// Yeni fonksiyonlar
export const predictMoodEnhanced = (text, context = {}, userHistory = []) => {
  return enhancedMoodPredictor.predictMood(text, context, userHistory);
};

export const processMoodFeedback = (predictionId, actualMood, userSatisfaction = null) => {
  return enhancedMoodPredictor.processFeedback(predictionId, actualMood, userSatisfaction);
};

export const getMoodAccuracyReport = () => {
  return enhancedMoodPredictor.getAccuracyReport();
};

export const updateMoodModels = () => {
  return enhancedMoodPredictor.updateModels();
};

export const validateMoodSystem = (testData = []) => {
  return enhancedMoodPredictor.validateSystem(testData);
};
