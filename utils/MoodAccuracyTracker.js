// utils/MoodAccuracyTracker.js
// Mood tahmin isabetliliğini takip eden sistem

export class MoodAccuracyTracker {
  constructor() {
    this.predictions = [];
    this.feedback = [];
    this.accuracyMetrics = {
      totalPredictions: 0,
      correctPredictions: 0,
      accuracyRate: 0,
      confidenceAccuracy: {},
      moodAccuracy: {},
      contextAccuracy: {}
    };
  }

  // Tahmin kaydetme
  recordPrediction(prediction, context) {
    const predictionRecord = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      predictedMood: prediction.mood,
      confidence: prediction.confidence,
      sentiment: prediction.sentiment,
      context: context,
      text: context.text,
      userMood: null, // Kullanıcı feedback'i ile doldurulacak
      isCorrect: null,
      feedbackTimestamp: null
    };

    this.predictions.push(predictionRecord);
    this.accuracyMetrics.totalPredictions++;
    
    return predictionRecord.id;
  }

  // Kullanıcı feedback'i alma
  recordFeedback(predictionId, actualMood, userSatisfaction = null) {
    const prediction = this.predictions.find(p => p.id === predictionId);
    if (!prediction) return false;

    prediction.userMood = actualMood;
    prediction.isCorrect = prediction.predictedMood === actualMood;
    prediction.feedbackTimestamp = new Date().toISOString();
    prediction.userSatisfaction = userSatisfaction;

    // Accuracy güncelleme
    if (prediction.isCorrect) {
      this.accuracyMetrics.correctPredictions++;
    }

    this.accuracyMetrics.accuracyRate = 
      this.accuracyMetrics.correctPredictions / this.accuracyMetrics.totalPredictions;

    // Detaylı analiz güncelleme
    this.updateDetailedMetrics(prediction);
    
    return true;
  }

  // Detaylı metrik güncelleme
  updateDetailedMetrics(prediction) {
    const { predictedMood, confidence, isCorrect, context } = prediction;

    // Confidence bazlı accuracy
    const confidenceBucket = this.getConfidenceBucket(confidence);
    if (!this.accuracyMetrics.confidenceAccuracy[confidenceBucket]) {
      this.accuracyMetrics.confidenceAccuracy[confidenceBucket] = { total: 0, correct: 0 };
    }
    this.accuracyMetrics.confidenceAccuracy[confidenceBucket].total++;
    if (isCorrect) {
      this.accuracyMetrics.confidenceAccuracy[confidenceBucket].correct++;
    }

    // Mood bazlı accuracy
    if (!this.accuracyMetrics.moodAccuracy[predictedMood]) {
      this.accuracyMetrics.moodAccuracy[predictedMood] = { total: 0, correct: 0 };
    }
    this.accuracyMetrics.moodAccuracy[predictedMood].total++;
    if (isCorrect) {
      this.accuracyMetrics.moodAccuracy[predictedMood].correct++;
    }

    // Context bazlı accuracy
    const contextKey = this.getContextKey(context);
    if (!this.accuracyMetrics.contextAccuracy[contextKey]) {
      this.accuracyMetrics.contextAccuracy[contextKey] = { total: 0, correct: 0 };
    }
    this.accuracyMetrics.contextAccuracy[contextKey].total++;
    if (isCorrect) {
      this.accuracyMetrics.contextAccuracy[contextKey].correct++;
    }
  }

  // Confidence bucket hesaplama
  getConfidenceBucket(confidence) {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  // Context key oluşturma
  getContextKey(context) {
    const keys = [];
    if (context.timeContext?.length > 0) keys.push('time');
    if (context.situationContext?.length > 0) keys.push('situation');
    if (context.socialContext?.length > 0) keys.push('social');
    if (context.physicalContext?.length > 0) keys.push('physical');
    return keys.join('-') || 'none';
  }

  // Accuracy raporu
  getAccuracyReport() {
    const report = {
      overall: {
        accuracy: this.accuracyMetrics.accuracyRate,
        totalPredictions: this.accuracyMetrics.totalPredictions,
        correctPredictions: this.accuracyMetrics.correctPredictions
      },
      byConfidence: {},
      byMood: {},
      byContext: {},
      recommendations: []
    };

    // Confidence bazlı rapor
    Object.entries(this.accuracyMetrics.confidenceAccuracy).forEach(([bucket, data]) => {
      report.byConfidence[bucket] = {
        accuracy: data.correct / data.total,
        total: data.total,
        correct: data.correct
      };
    });

    // Mood bazlı rapor
    Object.entries(this.accuracyMetrics.moodAccuracy).forEach(([mood, data]) => {
      report.byMood[mood] = {
        accuracy: data.correct / data.total,
        total: data.total,
        correct: data.correct
      };
    });

    // Context bazlı rapor
    Object.entries(this.accuracyMetrics.contextAccuracy).forEach(([context, data]) => {
      report.byContext[context] = {
        accuracy: data.correct / data.total,
        total: data.total,
        correct: data.correct
      };
    });

    // Öneriler oluşturma
    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  // Öneriler oluşturma
  generateRecommendations(report) {
    const recommendations = [];

    // Düşük accuracy'li mood'lar için öneri
    Object.entries(report.byMood).forEach(([mood, data]) => {
      if (data.accuracy < 0.6 && data.total >= 5) {
        recommendations.push({
          type: 'mood_improvement',
          mood: mood,
          currentAccuracy: data.accuracy,
          suggestion: `${mood} mood'u için tahmin algoritmasını iyileştir`
        });
      }
    });

    // Düşük confidence'li tahminler için öneri
    if (report.byConfidence.low && report.byConfidence.low.accuracy < 0.5) {
      recommendations.push({
        type: 'confidence_threshold',
        suggestion: 'Düşük confidence\'li tahminler için threshold artır'
      });
    }

    // Context bazlı öneriler
    Object.entries(report.byContext).forEach(([context, data]) => {
      if (data.accuracy < 0.6 && data.total >= 3) {
        recommendations.push({
          type: 'context_improvement',
          context: context,
          suggestion: `${context} context'i için analiz algoritmasını güçlendir`
        });
      }
    });

    return recommendations;
  }

  // Son N tahminin accuracy'si
  getRecentAccuracy(days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentPredictions = this.predictions.filter(p => 
      new Date(p.timestamp) >= cutoffDate && p.isCorrect !== null
    );

    if (recentPredictions.length === 0) return null;

    const correct = recentPredictions.filter(p => p.isCorrect).length;
    return {
      accuracy: correct / recentPredictions.length,
      total: recentPredictions.length,
      correct: correct,
      period: `${days} gün`
    };
  }

  // Tahmin kalitesi skoru
  getPredictionQualityScore(prediction) {
    const baseScore = prediction.confidence;
    let qualityScore = baseScore;

    // Geçmiş accuracy'ye göre ayarlama
    const moodAccuracy = this.accuracyMetrics.moodAccuracy[prediction.mood];
    if (moodAccuracy && moodAccuracy.total >= 3) {
      const moodAccuracyRate = moodAccuracy.correct / moodAccuracy.total;
      qualityScore = (baseScore + moodAccuracyRate) / 2;
    }

    // Context accuracy'ye göre ayarlama
    const contextKey = this.getContextKey(prediction.context);
    const contextAccuracy = this.accuracyMetrics.contextAccuracy[contextKey];
    if (contextAccuracy && contextAccuracy.total >= 2) {
      const contextAccuracyRate = contextAccuracy.correct / contextAccuracy.total;
      qualityScore = (qualityScore + contextAccuracyRate) / 2;
    }

    return Math.min(qualityScore, 1);
  }

  // Veri temizleme (eski kayıtları silme)
  cleanupOldData(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const initialCount = this.predictions.length;
    this.predictions = this.predictions.filter(p => 
      new Date(p.timestamp) >= cutoffDate
    );

    return {
      removed: initialCount - this.predictions.length,
      remaining: this.predictions.length
    };
  }

  // Export/Import fonksiyonları
  exportData() {
    return {
      predictions: this.predictions,
      accuracyMetrics: this.accuracyMetrics,
      exportDate: new Date().toISOString()
    };
  }

  importData(data) {
    if (data.predictions) this.predictions = data.predictions;
    if (data.accuracyMetrics) this.accuracyMetrics = data.accuracyMetrics;
  }
}

// Singleton instance
export const moodAccuracyTracker = new MoodAccuracyTracker();
