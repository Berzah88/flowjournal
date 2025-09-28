// utils/AdvancedTextAnalyzer.js
// Gelişmiş metin analizi ve N-gram tabanlı mood tahmini

export class AdvancedTextAnalyzer {
  constructor() {
    this.ngramDatabase = new Map();
    this.contextualPhrases = new Map();
    this.emotionalIntensityMarkers = new Map();
    this.initializeAdvancedPatterns();
  }

  // Gelişmiş pattern'leri başlatma
  initializeAdvancedPatterns() {
    // N-gram patterns (2-3 kelimelik ifadeler)
    this.ngramDatabase.set('2gram', {
      // Pozitif 2-gram'lar
      positive: [
        'çok mutlu', 'harika gün', 'mükemmel iş', 'süper haber', 'neşeli an',
        'gurur duyuyorum', 'başarılı oldum', 'kazandım', 'tamamladım',
        'sevinçliyim', 'heyecanlıyım', 'coşkulu', 'enerjik', 'dinç',
        'huzurlu', 'sakin', 'rahat', 'ferah', 'temiz hava',
        'güzel anı', 'anlamlı', 'değerli', 'önemli', 'kaliteli',
        'very happy', 'great day', 'perfect job', 'amazing news', 'wonderful time'
      ],
      // Negatif 2-gram'lar
      negative: [
        'çok kötü', 'berbat gün', 'korkunç iş', 'felaket haber', 'üzgün an',
        'başarısız oldum', 'kaybettim', 'başaramadım', 'hayal kırıklığı',
        'mutsuzum', 'hüzünlüyüm', 'kederli', 'acılı', 'üzüntülü',
        'yorgunum', 'bitkinim', 'tükenmiş', 'halsiz', 'güçsüz',
        'stresli', 'gergin', 'sinirli', 'öfkeli', 'kızgın',
        'very bad', 'terrible day', 'awful job', 'disaster news', 'sad time'
      ]
    });

    this.ngramDatabase.set('3gram', {
      // Pozitif 3-gram'lar
      positive: [
        'çok mutlu oldum', 'harika bir gün', 'mükemmel iş çıkardım',
        'süper haber aldım', 'neşeli anlar yaşadım', 'gurur duyuyorum',
        'başarılı oldum bugün', 'kazandım yarışı', 'tamamladım projeyi',
        'sevinçliyim çünkü', 'heyecanlıyım çünkü', 'coşkulu hissediyorum',
        'very happy today', 'great day today', 'perfect job done'
      ],
      // Negatif 3-gram'lar
      negative: [
        'çok kötü hissettim', 'berbat bir gün', 'korkunç iş yaptım',
        'felaket haber aldım', 'üzgün anlar yaşadım', 'başarısız oldum',
        'kaybettim yarışı', 'başaramadım projeyi', 'hayal kırıklığı yaşadım',
        'mutsuzum çünkü', 'hüzünlüyüm çünkü', 'kederli hissediyorum',
        'very bad day', 'terrible job done', 'awful news received'
      ]
    });

    // Contextual phrases (bağlamsal ifadeler)
    this.contextualPhrases.set('time_based', {
      'pazar günü': { mood: 'tired', intensity: 0.7, reason: 'Hafta sonu yorgunluğu' },
      'akşam saatleri': { mood: 'tired', intensity: 0.6, reason: 'Gün sonu yorgunluğu' },
      'sabah erken': { mood: 'tired', intensity: 0.5, reason: 'Erken kalkma yorgunluğu' },
      'gece geç': { mood: 'tired', intensity: 0.8, reason: 'Geç saat yorgunluğu' }
    });

    this.contextualPhrases.set('situation_based', {
      'zorla çağırdılar': { mood: 'frustrated', intensity: 0.9, reason: 'Zorla yapılan iş' },
      'mecbur kaldım': { mood: 'frustrated', intensity: 0.8, reason: 'Zorunlu durum' },
      'beklenmedik oldu': { mood: 'surprised', intensity: 0.7, reason: 'Beklenmedik durum' },
      'aşırı yüklendim': { mood: 'overwhelmed', intensity: 0.9, reason: 'Aşırı yüklenme' }
    });

    this.contextualPhrases.set('emotional_intensity', {
      'çok çok': { multiplier: 2.0, reason: 'Çifte vurgu' },
      'aşırı derecede': { multiplier: 1.8, reason: 'Aşırı vurgu' },
      'müthiş derecede': { multiplier: 1.7, reason: 'Güçlü vurgu' },
      'son derece': { multiplier: 1.6, reason: 'Son derece vurgu' },
      'extremely': { multiplier: 1.8, reason: 'Extreme emphasis' },
      'incredibly': { multiplier: 1.7, reason: 'Incredible emphasis' }
    });

    // Emotional intensity markers
    this.emotionalIntensityMarkers.set('high', [
      'çok', 'aşırı', 'müthiş', 'berbat', 'korkunç', 'dehşet', 'felaket',
      'muhteşem', 'olağanüstü', 'fantastik', 'muazzam', 'nefes kesici',
      'extremely', 'incredibly', 'amazingly', 'terribly', 'awfully'
    ]);

    this.emotionalIntensityMarkers.set('medium', [
      'biraz', 'az', 'orta', 'normal', 'standart', 'makul', 'uygun',
      'somewhat', 'quite', 'rather', 'fairly', 'moderately'
    ]);

    this.emotionalIntensityMarkers.set('low', [
      'hafif', 'küçük', 'minimal', 'azıcık', 'birazcık', 'slightly', 'a bit'
    ]);
  }

  // N-gram analizi
  analyzeNgrams(text) {
    const words = text.toLowerCase().split(/\s+/);
    const ngrams = {
      '2gram': [],
      '3gram': []
    };

    // 2-gram analizi
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      ngrams['2gram'].push(bigram);
    }

    // 3-gram analizi
    for (let i = 0; i < words.length - 2; i++) {
      const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      ngrams['3gram'].push(trigram);
    }

    return ngrams;
  }

  // N-gram bazlı sentiment skoru
  calculateNgramSentiment(text) {
    const ngrams = this.analyzeNgrams(text);
    let positiveScore = 0;
    let negativeScore = 0;
    let totalNgrams = 0;

    // 2-gram analizi
    ngrams['2gram'].forEach(ngram => {
      totalNgrams++;
      if (this.ngramDatabase.get('2gram').positive.includes(ngram)) {
        positiveScore += 2; // 2-gram'lar daha yüksek ağırlık
      } else if (this.ngramDatabase.get('2gram').negative.includes(ngram)) {
        negativeScore += 2;
      }
    });

    // 3-gram analizi
    ngrams['3gram'].forEach(ngram => {
      totalNgrams++;
      if (this.ngramDatabase.get('3gram').positive.includes(ngram)) {
        positiveScore += 3; // 3-gram'lar en yüksek ağırlık
      } else if (this.ngramDatabase.get('3gram').negative.includes(ngram)) {
        negativeScore += 3;
      }
    });

    return {
      positiveScore,
      negativeScore,
      totalNgrams,
      netScore: positiveScore - negativeScore,
      confidence: totalNgrams > 0 ? Math.min(totalNgrams / 5, 1) : 0
    };
  }

  // Contextual phrase analizi
  analyzeContextualPhrases(text) {
    const lowerText = text.toLowerCase();
    const foundPhrases = [];
    let contextualMoodScore = 0;
    let contextualIntensity = 1;

    // Time-based phrases
    Object.entries(this.contextualPhrases.get('time_based')).forEach(([phrase, data]) => {
      if (lowerText.includes(phrase)) {
        foundPhrases.push({
          phrase,
          type: 'time_based',
          mood: data.mood,
          intensity: data.intensity,
          reason: data.reason
        });
        contextualMoodScore += data.intensity;
      }
    });

    // Situation-based phrases
    Object.entries(this.contextualPhrases.get('situation_based')).forEach(([phrase, data]) => {
      if (lowerText.includes(phrase)) {
        foundPhrases.push({
          phrase,
          type: 'situation_based',
          mood: data.mood,
          intensity: data.intensity,
          reason: data.reason
        });
        contextualMoodScore += data.intensity;
      }
    });

    // Emotional intensity markers
    Object.entries(this.contextualPhrases.get('emotional_intensity')).forEach(([phrase, data]) => {
      if (lowerText.includes(phrase)) {
        contextualIntensity *= data.multiplier;
        foundPhrases.push({
          phrase,
          type: 'intensity_marker',
          multiplier: data.multiplier,
          reason: data.reason
        });
      }
    });

    return {
      foundPhrases,
      contextualMoodScore,
      contextualIntensity,
      hasContextualData: foundPhrases.length > 0
    };
  }

  // Gelişmiş emotional intensity analizi
  analyzeEmotionalIntensity(text) {
    const lowerText = text.toLowerCase();
    const intensityScores = { high: 0, medium: 0, low: 0 };
    let maxIntensity = 'low';

    // Intensity marker'ları sayma
    Object.entries(this.emotionalIntensityMarkers).forEach(([level, markers]) => {
      markers.forEach(marker => {
        const regex = new RegExp(`\\b${marker}\\b`, 'g');
        const matches = lowerText.match(regex);
        if (matches) {
          intensityScores[level] += matches.length;
        }
      });
    });

    // En yüksek intensity'yi belirleme
    if (intensityScores.high > 0) maxIntensity = 'high';
    else if (intensityScores.medium > 0) maxIntensity = 'medium';

    // Punctuation analizi
    const exclamationCount = (text.match(/!/g) || []).length;
    const questionCount = (text.match(/\?/g) || []).length;
    const capsCount = (text.match(/[A-ZÇĞIÖŞÜ]/g) || []).length;

    // Punctuation bazlı intensity ayarlama
    if (exclamationCount >= 2) maxIntensity = 'high';
    else if (exclamationCount === 1 && maxIntensity === 'low') maxIntensity = 'medium';

    if (capsCount > text.length * 0.1) maxIntensity = 'high'; // %10'dan fazla büyük harf

    return {
      level: maxIntensity,
      scores: intensityScores,
      punctuation: {
        exclamations: exclamationCount,
        questions: questionCount,
        caps: capsCount
      },
      confidence: Math.min((intensityScores.high + intensityScores.medium + intensityScores.low) / 3, 1)
    };
  }

  // Sarcasm ve irony detection (basit)
  detectSarcasm(text) {
    const lowerText = text.toLowerCase();
    const sarcasmIndicators = [
      'tabii ki', 'elbette', 'kesinlikle', 'mükemmel', 'harika',
      'of course', 'sure', 'absolutely', 'perfect', 'great'
    ];

    const negativeContext = [
      'kötü', 'berbat', 'korkunç', 'felaket', 'başarısız',
      'bad', 'terrible', 'awful', 'disaster', 'failed'
    ];

    let sarcasmScore = 0;

    // Sarcasm indicator + negative context
    sarcasmIndicators.forEach(indicator => {
      if (lowerText.includes(indicator)) {
        negativeContext.forEach(negative => {
          if (lowerText.includes(negative)) {
            sarcasmScore += 0.3;
          }
        });
      }
    });

    // Question mark + positive words (sarcastic question)
    if (text.includes('?') && sarcasmIndicators.some(indicator => lowerText.includes(indicator))) {
      sarcasmScore += 0.2;
    }

    return {
      isSarcastic: sarcasmScore > 0.3,
      score: sarcasmScore,
      confidence: Math.min(sarcasmScore, 1)
    };
  }

  // Comprehensive text analysis
  analyzeText(text) {
    const ngramAnalysis = this.calculateNgramSentiment(text);
    const contextualAnalysis = this.analyzeContextualPhrases(text);
    const intensityAnalysis = this.analyzeEmotionalIntensity(text);
    const sarcasmAnalysis = this.detectSarcasm(text);

    // Combined confidence calculation
    const confidence = Math.min(
      (ngramAnalysis.confidence + 
       (contextualAnalysis.hasContextualData ? 0.3 : 0) + 
       intensityAnalysis.confidence + 
       sarcasmAnalysis.confidence) / 4,
      1
    );

    // Final sentiment calculation
    let finalScore = ngramAnalysis.netScore;
    
    // Contextual adjustment
    if (contextualAnalysis.hasContextualData) {
      finalScore += contextualAnalysis.contextualMoodScore * 10;
    }

    // Intensity adjustment
    finalScore *= intensityAnalysis.level === 'high' ? 1.5 : 
                  intensityAnalysis.level === 'medium' ? 1.2 : 1.0;

    // Sarcasm adjustment (reverse sentiment if sarcastic)
    if (sarcasmAnalysis.isSarcastic) {
      finalScore = -finalScore * 0.8;
    }

    // Normalize score
    const normalizedScore = Math.max(-100, Math.min(100, finalScore));

    return {
      ngramAnalysis,
      contextualAnalysis,
      intensityAnalysis,
      sarcasmAnalysis,
      finalScore: normalizedScore,
      confidence,
      label: normalizedScore > 10 ? 'positive' : normalizedScore < -10 ? 'negative' : 'neutral'
    };
  }

  // Learning from user feedback
  learnFromFeedback(text, predictedMood, actualMood, isCorrect) {
    if (!isCorrect) {
      // Yanlış tahmin durumunda pattern'leri güncelle
      const ngrams = this.analyzeNgrams(text);
      
      // Yanlış tahmin edilen n-gram'ları zayıflat
      ngrams['2gram'].forEach(ngram => {
        // Bu n-gram'ın mood ile ilişkisini zayıflat
        // Gerçek implementasyonda daha sofistike learning algoritması kullanılabilir
      });

      ngrams['3gram'].forEach(ngram => {
        // 3-gram'lar için de aynı işlem
      });
    }
  }

  // Export/Import functionality
  exportPatterns() {
    return {
      ngramDatabase: Object.fromEntries(this.ngramDatabase),
      contextualPhrases: Object.fromEntries(this.contextualPhrases),
      emotionalIntensityMarkers: Object.fromEntries(this.emotionalIntensityMarkers),
      exportDate: new Date().toISOString()
    };
  }

  importPatterns(data) {
    if (data.ngramDatabase) {
      this.ngramDatabase = new Map(Object.entries(data.ngramDatabase));
    }
    if (data.contextualPhrases) {
      this.contextualPhrases = new Map(Object.entries(data.contextualPhrases));
    }
    if (data.emotionalIntensityMarkers) {
      this.emotionalIntensityMarkers = new Map(Object.entries(data.emotionalIntensityMarkers));
    }
  }
}

// Singleton instance
export const advancedTextAnalyzer = new AdvancedTextAnalyzer();
