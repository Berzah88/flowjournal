# Daily Analysis Usage Guide

## ProjectAnalyzer Günlük Analiz Sistemi

Bu sistem, kullanıcıların her gün sadece **bir kez** proje analizi görmesini sağlar.

## Özellikler

### ✅ Günlük Tekrar Kontrolü
- Kullanıcı günde sadece **bir kez** analiz görür
- AsyncStorage ile tarih takibi
- Yeni gün geldiğinde otomatik sıfırlanır

### ✅ Akıllı Analiz
- **Overdue milestones**: "Time to Regain Control"
- **Ending soon**: "Final Push Ahead" 
- **Ahead of schedule**: "You're Crushing It"
- **Mood patterns**: "Your Energy is Contagious"

### ✅ Kişiselleştirilmiş Mesajlar
- Proje sayısına göre farklı tonlar
- Mood durumuna göre farklı yaklaşımlar
- Random seed ile çeşitlilik

## Kullanım

### MainScreen'de Otomatik Kullanım
```javascript
// MainScreen.js'de otomatik olarak çalışır
useEffect(() => {
  const checkDailyAnalysis = async () => {
    const analysis = await ProjectAnalyzer.getDailyAnalysis(activeTasks, completedTasks);
    
    if (analysis.shouldShow && analysis.feedback) {
      setDailyAnalysis(analysis.feedback);
      setDailyAnalysisVisible(true);
    }
  };

  if (activeTasks && activeTasks.length > 0) {
    checkDailyAnalysis();
  }
}, [activeTasks, completedTasks, refreshKey]);
```

### Manuel Kullanım
```javascript
// Günlük analizi manuel olarak kontrol et
const analysis = await ProjectAnalyzer.getDailyAnalysis(activeTasks, completedTasks);

if (analysis.shouldShow && analysis.feedback) {
  // Motive component'inde göster
  <Motive
    visible={true}
    onClose={() => setVisible(false)}
    type="daily_analysis"
    title={analysis.feedback.title}
    message={analysis.feedback.message}
    color={analysis.feedback.color}
  />
}
```

### Zorla Gösterim
```javascript
// Günlük limiti bypass et (test için)
const analysis = await ProjectAnalyzer.analyzeProjects(activeTasks, completedTasks, true);
```

## Analiz Kriterleri

### Güven Eşiği (0.6+ gerekli)
- **2+ proje**: +0.3 güven
- **3+ milestone**: +0.1 güven  
- **Mood data**: +0.2 güven
- **Timeline data**: +0.1 güven

### Mesaj Öncelikleri
1. **Overdue milestones** (High priority)
2. **Ending soon** (Medium priority)
3. **Ahead of schedule** (Low priority)
4. **Mood patterns** (Variable priority)
5. **No journal data** (Medium priority)

## Mesaj Örnekleri

### Overdue Milestones
- "Time to Regain Control"
- "The Comeback Starts Now"
- "Reset and Recharge"

### Positive Mood
- "Your Energy is Contagious"
- "Painting with Positivity"
- "The Optimism Circus"

### Negative Mood
- "This Too Shall Pass"
- "Growing Through Storms"
- "Pressure Creates Diamonds"

## Teknik Detaylar

### AsyncStorage Keys
- `project_analyzer_daily_display`: Son gösterim tarihi

### Confidence Calculation
```javascript
let confidence = 0;
if (projectCount >= 2) confidence += 0.3;
if (totalMilestones >= 3) confidence += 0.1;
if (moodData.hasData) confidence += 0.2;
if (timelineData.hasIssues) confidence += 0.1;
```

### Random Seed
```javascript
const timeSeed = now.getHours() + now.getMinutes() + now.getSeconds();
const dataSeed = projectCount + overdueCount + endingSoonCount;
const randomSeed = (timeSeed + dataSeed + Math.random() * 1000) % 1000;
```

## Test Etme

### Günlük Limit Testi
```javascript
// Test için günlük limiti bypass et
const analysis = await ProjectAnalyzer.analyzeProjects(tasks, [], true);
```

### Tarih Sıfırlama
```javascript
// AsyncStorage'ı temizle
await AsyncStorage.removeItem('project_analyzer_daily_display');
```

## Sonuç

Bu sistem kullanıcılara:
- ✅ Günlük motivasyon sağlar
- ✅ Proje durumlarını özetler
- ✅ Mood pattern'lerini yansıtır
- ✅ Spam önler (günde bir kez)
- ✅ Kişiselleştirilmiş deneyim sunar

Kullanıcı her uygulamaya girdiğinde, eğer yeterli veri varsa ve o gün henüz gösterilmemişse, akıllı bir analiz mesajı görür! 🚀
