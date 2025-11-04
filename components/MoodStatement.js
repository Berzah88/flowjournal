// components/MoodStatement.js
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { MOODS } from '../utils/AIMoodPredictor';
// Lazy import of JS predictor for on-device inference
let jsPredictor = null;
try {
  // require is fine in RN packager; in Node eval harness this will resolve too
  jsPredictor = require('../native_ml/predictor').default;
} catch (e) {
  jsPredictor = null;
}
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import logger from '../utils/logger';
const analyzeSemanticPatterns = (allMoods) => {
  if (allMoods.length < 2) return null;
  
  // En erken ve en son mood'ları karşılaştır
  const sortedByTime = [...allMoods].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  const firstMood = sortedByTime[0].mood;
  const lastMood = sortedByTime[sortedByTime.length - 1].mood;
  
  const firstCategory = getMoodCategory(firstMood);
  const lastCategory = getMoodCategory(lastMood);
  
  // Gün içinde iyileşme/kötüleşme tespiti
  if (firstCategory === 'negative' && lastCategory === 'positive') {
    return { type: 'improvement' };
  } else if (firstCategory === 'positive' && lastCategory === 'negative') {
    return { type: 'decline' };
  } else if (allMoods.length >= 3) {
    // Mood çeşitliliği analizi
    const uniqueMoods = new Set(allMoods.map(m => m.mood));
    if (uniqueMoods.size >= 3) {
      return { type: 'diverse' };
    }
  }
  
  return null;
};

// Helper: Mood kategorisini belirle
const getMoodCategory = (moodKey) => {
  const positiveMoods = ['happy', 'excited', 'grateful', 'hopeful', 'proud', 'motivated', 'energetic', 'relieved', 'peaceful', 'content'];
  const negativeMoods = ['sad', 'angry', 'anxious', 'frustrated', 'overwhelmed', 'lonely', 'disappointed', 'worried'];
  
  if (positiveMoods.includes(moodKey)) return 'positive';
  if (negativeMoods.includes(moodKey)) return 'negative';
  return 'neutral';
};

// NOTE: getSolidMoodColor removed (unused) to reduce bundle size

// Helper: Recency bazlı weight hesapla - EN ÖNEMLİ: Son girilen entry en yüksek weight
const getRecencyWeight = (timestamp, allTimestamps) => {
  const entryTime = (typeof timestamp === 'number') ? timestamp : new Date(timestamp).getTime();
  const now = Date.now();
  const timeDiff = now - entryTime; // Milliseconds
  
  // RECENCY FACTOR - Ne kadar yakınsa o kadar yüksek
  let recencyWeight = 1.0;
  
  if (timeDiff < 60 * 60 * 1000) {
    // Son 1 saat: 3.0x weight (ÇOK ÖNEMLİ)
    recencyWeight = 3.0;
  } else if (timeDiff < 3 * 60 * 60 * 1000) {
    // Son 3 saat: 2.0x weight
    recencyWeight = 2.0;
  } else if (timeDiff < 6 * 60 * 60 * 1000) {
    // Son 6 saat: 1.5x weight
    recencyWeight = 1.5;
  } else if (timeDiff < 12 * 60 * 60 * 1000) {
    // Son 12 saat: 1.2x weight
    recencyWeight = 1.2;
  }
  // Daha eski: 1.0x (normal)
  
  return recencyWeight;
};

// Helper: format a Date (local) to YYYY-MM-DD dayKey to avoid timezone surprises
const formatDayKey = (date) => {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const MoodStatement = React.memo(({ 
  activeTasks = [], 
  completedTasks = [],
  selectedDate, // Optional - yoksa bugün kullanılır
  onPress = null,
  onCreateFirstProject = null // Yeni: İlk proje oluşturma callback
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  // STEP 1: Journal metadata'yı hesapla (lightweight!)
  const journalMetadata = useMemo(() => {
    let totalCount = 0;
    let lastTimestamp = '';
    let lastMoodKey = '';
    let lastTextLen = 0;
    
    [...activeTasks, ...completedTasks].forEach(task => {
      if (task.journalEntries && Array.isArray(task.journalEntries)) {
        totalCount += task.journalEntries.length;
        const lastEntry = task.journalEntries[task.journalEntries.length - 1];
        if (lastEntry?.createdAt > lastTimestamp) {
          lastTimestamp = lastEntry.createdAt;
          lastMoodKey = lastEntry?.mood || '';
          lastTextLen = lastEntry?.text ? String(lastEntry.text).length : 0;
        }
      }
    });
    
    return { totalCount, lastTimestamp, lastMoodKey, lastTextLen };
  }, [activeTasks, completedTasks]);
  
  // STEP 2: Journal entries'i flat array'e çıkar - SADECE METADATA DEĞİŞTİĞİNDE
  const allJournalEntries = useMemo(() => {
    // Journal cache updated (logging removed to reduce JS-thread work)
    
    const entries = [];
    [...activeTasks, ...completedTasks].forEach(task => {
      if (task.journalEntries && Array.isArray(task.journalEntries)) {
          task.journalEntries.forEach(entry => {
            try {
              const createdAtMs = (entry && entry.createdAt)
                ? (typeof entry.createdAt === 'number'
                    ? entry.createdAt
                    : (Date.parse(entry.createdAt) || new Date(entry.createdAt).getTime()) )
                : Date.now();
              const dayKey = formatDayKey(createdAtMs);
              entries.push({
                ...entry,
                projectId: task.id,
                projectDone: task.done,
                createdAtMs,
                dayKey,
              });
            } catch (e) {
              if (__DEV__) logger.warn('MoodStatement: entry date parse failed', e);
              const createdAtMs = Date.now();
              entries.push({
                ...entry,
                projectId: task.id,
                projectDone: task.done,
                createdAtMs,
                dayKey: formatDayKey(createdAtMs),
              });
            }
          });
      }
    });
    return entries;
  }, [journalMetadata.totalCount, journalMetadata.lastTimestamp, journalMetadata.lastMoodKey, journalMetadata.lastTextLen]); // ✅ Expanded deps to react to mood/content changes
  
  // Bugünkü mood'ları hesapla - SADECE allJournalEntries DEĞİŞTİĞİNDE
  const todayMoodData = useMemo(() => {
  // Heavy calculations are memoized; avoid debug logging here to
  // reduce JS-thread activity during scroll interactions.
    
  // selectedDate yoksa bugünü kullan
  const dateToUse = selectedDate ? new Date(selectedDate) : new Date();
  const today = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate());
  const todayKey = formatDayKey(today);
    
    const todayMoods = [];
    const moodCounts = {};
    // build quick lookup map by dayKey to avoid repeated date parsing
    const entriesByDay = Object.create(null);
    allJournalEntries.forEach(e => {
      const key = e.dayKey || formatDayKey(e.createdAtMs || e.createdAt);
      if (!entriesByDay[key]) entriesByDay[key] = [];
      entriesByDay[key].push(e);
    });
    let hasCompletedProjectToday = false;
    
    // Pull today's entries from map if any
    const todays = entriesByDay[todayKey] || [];
    todays.forEach(entry => {
      if (entry.mood) {
        todayMoods.push({
          mood: entry.mood,
          moodIcon: entry.moodIcon,
          moodColor: entry.moodColor,
          text: entry.text,
          timestamp: entry.createdAtMs || Date.parse(entry.createdAt)
        });
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      }
    });
    
    // Bugün tamamlanan projeleri kontrol et (hızlı check)
    const completedTasksList = completedTasks.filter(t => t.done);
    completedTasksList.forEach(task => {
      const completionDate = task.updatedAt ? new Date(task.updatedAt) : 
                            task.completedAt ? new Date(task.completedAt) : null;
      
      if (completionDate) {
        completionDate.setHours(0, 0, 0, 0);
        if (completionDate.getTime() === today.getTime()) {
          hasCompletedProjectToday = true;
        }
      }
    });
    
    // ✨ RECENCY-BASED: Son girilen entry en yüksek öncelik!
    let dominantMood = null;
    let maxWeightedScore = 0;
    const moodWeightedScores = {};
    
    // Tüm timestamp'leri al (recency hesaplama için)
    const allTimestamps = todayMoods.map(e => e.timestamp);
    
    // Her mood için weighted score hesapla - RECENCY FACTOR
    todayMoods.forEach(entry => {
      const recencyWeight = getRecencyWeight(entry.timestamp, allTimestamps);
      const mood = entry.mood;
      
      if (!moodWeightedScores[mood]) {
        moodWeightedScores[mood] = 0;
      }
      
      // Son 1 saat içindeki entry 3x daha önemli!
      moodWeightedScores[mood] += recencyWeight;
    });
    
    // En yüksek weighted score'u bul - SADECE EN YÜKSEK SCORE'U BUL
    let dominantMoodKey = null;
    Object.entries(moodWeightedScores).forEach(([mood, score]) => {
      if (score > maxWeightedScore) {
        maxWeightedScore = score;
        dominantMoodKey = mood;
      }
    });
    
    // Dominant mood bulunduysa mood objesini oluştur
  if (dominantMoodKey) {
      // Önce MOODS'da ara
      let foundMood = MOODS.find(m => m.key === dominantMoodKey);
        
      // MOODS'da bulunamazsa EXTENDED_MOODS'da ara
      if (!foundMood) {
        const { EXTENDED_MOODS } = require('../utils/AIMoodPredictor');
        foundMood = EXTENDED_MOODS.find(m => m.key === dominantMoodKey);
      }
      
      // Hiçbirinde bulunamazsa, journal entry'den gelen bilgileri kullan
      if (!foundMood) {
        const entryWithMood = todayMoods.find(entry => entry.mood === dominantMoodKey);
        foundMood = {
          key: dominantMoodKey,
          label: dominantMoodKey.charAt(0).toUpperCase() + dominantMoodKey.slice(1),
          icon: entryWithMood?.moodIcon || 'sentiment-neutral',
          color: entryWithMood?.moodColor || '#4A90E2'
        };
      }
      
      dominantMood = foundMood;
      
      // Debug log - Sadece final result
      if (todayMoods.length > 0) {
        if (__DEV__) logger.debug('🎭 MoodStatement - Final Dominant:', dominantMood?.key, '| Scores:', moodWeightedScores, '| Entries:', todayMoods.length);
      }
    }
    // --- New: try JS predictor override (non-blocking effect will set state below) ---
    // We'll store a provisional override key on the returned object for the effect to consume
    const provisional = { __predicted_text_for_js: null, __predicted_mood: null, __predicted_conf: null };
    if (allTimestamps && allTimestamps.length > 0) {
      // take the most recent entry text to ask JS predictor
      const latest = todayMoods[todayMoods.length - 1];
      if (latest && latest.text && jsPredictor) {
        provisional.__predicted_text_for_js = String(latest.text);
      }
    }
    
  // ✨ YENİ: Dünkü mood'u hesapla (Trend Analysis) - OPTIMIZE
  const yesterdayMoods = [];
    
  // yesterday moods from entriesByDay
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const yesterdayKey = formatDayKey(yesterday);
  const yest = entriesByDay[yesterdayKey] || [];
    yest.forEach(entry => {
      if (entry.mood) yesterdayMoods.push({ mood: entry.mood, timestamp: entry.createdAtMs || Date.parse(entry.createdAt) });
    });
    
    // Dünkü dominant mood - Dün için de recency kullan
    let yesterdayDominantMood = null;
    if (yesterdayMoods.length > 0) {
      const yesterdayWeightedScores = {};
      const yesterdayTimestamps = yesterdayMoods.map(e => e.timestamp);
      
      yesterdayMoods.forEach(entry => {
        const recencyWeight = getRecencyWeight(entry.timestamp, yesterdayTimestamps);
        yesterdayWeightedScores[entry.mood] = (yesterdayWeightedScores[entry.mood] || 0) + recencyWeight;
      });
      
      let maxYesterdayScore = 0;
      Object.entries(yesterdayWeightedScores).forEach(([mood, score]) => {
        if (score > maxYesterdayScore) {
          maxYesterdayScore = score;
          yesterdayDominantMood = mood;
        }
      });
    }
    
    // Trend analizi
    let trendDirection = null;
    let trendMessage = null;
    
    if (dominantMood && yesterdayDominantMood) {
      const todayCategory = getMoodCategory(dominantMood.key);
      const yesterdayCategory = getMoodCategory(yesterdayDominantMood);
      
      if (todayCategory === 'positive' && yesterdayCategory === 'negative') {
        trendDirection = 'up';
        trendMessage = 'improvingFromYesterday'; // "Dünden daha iyi!"
      } else if (todayCategory === 'negative' && yesterdayCategory === 'positive') {
        trendDirection = 'down';
        trendMessage = 'worseningFromYesterday'; // "Ruh halin biraz düştü"
      } else if (todayCategory === yesterdayCategory) {
        trendDirection = 'stable';
        trendMessage = 'stableMood'; // "Sabit bir ruh hali"
      }
    }
    
    // ✨ YENİ: Streak Calculation (Son 7 gün) - OPTIMIZE
    const last7Days = [];
    const journalStreak = { current: 0, longest: 0 };
    const moodStreak = { mood: null, count: 0 };
    
    for (let i = 0; i < 7; i++) {
  const cd = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
  const checkKey = formatDayKey(cd);
      const dayEntries = entriesByDay[checkKey] || [];
      const dayMoods = dayEntries.filter(e => e.mood).map(e => e.mood);
      last7Days.push({
        date: new Date(cd),
        hasEntry: dayMoods.length > 0,
        moods: dayMoods
      });
    }
    
    // Journal streak hesapla (kaç gün üst üste journal yazıldı)
    let currentStreak = 0;
    for (const day of last7Days) {
      if (day.hasEntry) {
        currentStreak++;
      } else {
        break;
      }
    }
    journalStreak.current = currentStreak;
    
    // Mood streak hesapla (aynı mood kaç gün üst üste)
    if (dominantMood) {
      let consecutiveDays = 0;
      for (const day of last7Days) {
        if (day.moods.includes(dominantMood.key)) {
          consecutiveDays++;
        } else {
          break;
        }
      }
      
      if (consecutiveDays >= 2) {
        moodStreak.mood = dominantMood.key;
        moodStreak.count = consecutiveDays;
      }
    }
    
    // ✨ Semantic Analysis - Gün içi mood patterns
    const semanticPattern = analyzeSemanticPatterns(todayMoods);

    if (__DEV__) {
      try {
        const last7Count = last7Days.reduce((acc, d) => acc + (d.hasEntry ? 1 : 0), 0);
        logger.debug('MoodStatement debug', { todayCount: (todays || []).length, yesterdayCount: (yest || []).length, last7Count });
      } catch (e) { /* swallow */ }
    }

    return {
      dominantMood,
      provisional,
      totalEntries: todayMoods.length + (hasCompletedProjectToday ? 1 : 0),
      allMoods: todayMoods,
      hasCompletedProjectToday,
      // ✨ YENİ özellikler
      trendDirection,
      trendMessage,
      yesterdayDominantMood,
      journalStreak,
      moodStreak,
      moodCounts, // Mood çeşitliliği için
      semanticPattern, // ✨ Gün içi pattern analizi
    };
  }, [allJournalEntries, completedTasks, selectedDate]); // ✅ SADECE JOURNAL DEĞİŞTİĞİNDE!

  // State: override from JS predictor (non-blocking)
  const [jsOverride, setJsOverride] = useState(null);

  // Effect: when memo produces a provisional prediction text, call JS predictor async
  useEffect(() => {
    let active = true;
    const prov = todayMoodData?.provisional;
    if (prov && prov.__predicted_text_for_js && jsPredictor) {
      // Debounce predictor to avoid running heavy JS during short
      // interactions (like quick reverse-scrolls). If provisional input
      // changes or component unmounts, the timer is cleared.
      const timer = setTimeout(() => {
        try {
          const res = jsPredictor.predict(prov.__predicted_text_for_js);
          if (!active) return;
          if (res && res.mood && res.probs) {
            const conf = res.probs[res.topIndex] || Math.max(...res.probs);
            // apply override only if confidence >= 0.6
            if (conf >= 0.6) {
              setJsOverride({ moodKey: res.mood, confidence: conf });
            } else {
              setJsOverride(null);
            }
          }
        } catch (e) {
          // ignore predictor errors
          if (__DEV__) logger.warn('JS predictor error:', e.message || e);
        }
      }, 500);
      return () => { active = false; clearTimeout(timer); };
    } else {
      setJsOverride(null);
    }
    return () => { active = false; };
  }, [todayMoodData?.provisional]);

  // If JS override exists, use it to replace dominantMood for display (no UI structure changes)
  const displayMood = useMemo(() => {
    if (jsOverride && jsOverride.moodKey) {
      const found = MOODS.find(m => m.key === jsOverride.moodKey) || require('../utils/AIMoodPredictor').EXTENDED_MOODS.find(m => m.key === jsOverride.moodKey);
      return found || { key: jsOverride.moodKey, label: jsOverride.moodKey };
    }
    return todayMoodData.dominantMood;
  }, [jsOverride, todayMoodData.dominantMood]);

  // ----- Quick Tips: Emotional Journal ile aynı mapping -----
  const generateQuickTip = useCallback((moodKey) => {
    const tips = {
      happy: ['keepDoingHappy','happinessContagious','joyWellDeserved'],
      excited: ['channelExcitement','enthusiasmPowerful','energyPerfect'],
      grateful: ['keepDoingHappy','joyWellDeserved','emotionalAwareness'],
      hopeful: ['continueTracking','setSmallGoals','emotionalAwareness'],
      proud: ['continueTracking','setSmallGoals','emotionalAwareness'],
      motivated: ['motivationStrong','determinationAdvantage','motivationInspiring'],
      peaceful: ['calmnessSuperpower','tranquilityPerfect','serenityValuable'],
      content: ['continueTracking','setSmallGoals','emotionalAwareness'],
      confident: ['motivationStrong','determinationAdvantage','motivationInspiring'],
      sad: ['okayToFeel','sadnessTemporary','considerCausingSadness'],
      angry: ['frustrationSignalsGrowth','identifyFrustration','changeApproach'],
      tired: ['bodyAskingRest','prioritizeSelfCare','reassessWorkLife'],
      frustrated: ['frustrationSignalsGrowth','identifyFrustration','changeApproach'],
      anxious: ['anxietyManageable','breakDownTasks','listenAnxiety'],
      overwhelmed: ['breakDownTasks','anxietyManageable','listenAnxiety'],
      lonely: ['okayToFeel','continueTracking','emotionalAwareness'],
      confused: ['continueTracking','setSmallGoals','emotionalAwareness'],
      disappointed: ['changeApproach','setSmallGoals','continueTracking'],
      worried: ['anxietyManageable','listenAnxiety','continueTracking'],
      bored: ['setSmallGoals','continueTracking','emotionalAwareness'],
      stressed: ['breakDownTasks','prioritizeSelfCare','setSmallGoals'],
      exhausted: ['bodyAskingRest','prioritizeSelfCare','reassessWorkLife'],
      calm: ['calmnessSuperpower','tranquilityPerfect','serenityValuable'],
      curious: ['setSmallGoals','continueTracking','emotionalAwareness'],
      nostalgic: ['emotionalAwareness','continueTracking','setSmallGoals'],
      surprised: ['continueTracking','emotionalAwareness','setSmallGoals'],
      focused: ['motivationStrong','setSmallGoals','emotionalAwareness'],
      neutral: ['continueTracking','setSmallGoals','emotionalAwareness'],
      natural: ['continueTracking','setSmallGoals','emotionalAwareness'],
      default: ['continueTracking','setSmallGoals','emotionalAwareness']
    };
    const list = tips[moodKey] || tips.default;
    return t(list[Math.floor(Math.random() * list.length)]);
  }, [t]);

  // Günlük mesaj cache'i (AsyncStorage'den)
  const [dailyTip, setDailyTip] = useState('');
  // AI destekli günlük motivasyon (unique per day/input)
  const [aiMotivation, setAiMotivation] = useState('');

  // Migration effect: run once on mount to normalize any old cached ai_motivation_* keys
  useEffect(() => {
    let active = true;
    const migrateCachedAiMotivations = async () => {
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const aiKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith('ai_motivation_'));
        if (!aiKeys || aiKeys.length === 0) return;

        // load EXTENDED_MOODS safely
        const { EXTENDED_MOODS = [] } = require('../utils/AIMoodPredictor');

        for (const key of aiKeys) {
          try {
            const parts = key.split('_'); // ai_motivation_<date>_<moodKey>_<ts>
            const moodKey = parts[2] || 'none';
            const raw = await AsyncStorage.getItem(key);
            if (!raw) continue;
            let cleaned = String(raw);

            // Build candidate labels to strip based on moodKey
            const candidates = [];
            const m1 = MOODS.find(m => m.key === moodKey);
            const m2 = EXTENDED_MOODS.find(m => m.key === moodKey);
            if (m1) candidates.push(m1.label);
            if (m2) candidates.push(m2.label);
            // localized form
            try { candidates.push(t(moodKey)); } catch (e) {}
            // fallback 'yourMood' label
            try { candidates.push(t('yourMood')); } catch (e) {}

            // Try to strip any of these labels from the start of the text
            const patterns = [' —', ' -', ':', '—', '-', ':'];
            let modified = false;
            for (const cand of candidates) {
              if (!cand) continue;
              const cl = String(cand).trim();
              for (const sep of patterns.concat([''])) {
                const prefix = cl + (sep ? sep + ' ' : ' ');
                if (cleaned.startsWith(prefix)) {
                  cleaned = cleaned.slice(prefix.length).trim();
                  modified = true;
                  break;
                }
                const prefix2 = cl + sep;
                if (cleaned.startsWith(prefix2)) {
                  cleaned = cleaned.slice(prefix2.length).trim();
                  modified = true;
                  break;
                }
              }
              if (modified) break;
            }

            if (modified) {
              await AsyncStorage.setItem(key, cleaned).catch(() => {});
              if (__DEV__) logger.debug('MoodStatement: migrated ai_motivation key', key);
            }
          } catch (e) {
            if (__DEV__) logger.warn('MoodStatement: migrate key failed', key, e);
            continue;
          }
        }
      } catch (e) {
        if (__DEV__) logger.warn('MoodStatement: migration failed', e);
      }
    };

    migrateCachedAiMotivations().catch(() => {});
    return () => { active = false; };
  }, []);

  // Load daily tip and AI motivation whenever the mood context for today changes.
  // This keeps AsyncStorage access off the main render path and updates when
  // relevant inputs change (dominant mood, entries count or selectedDate).
  useEffect(() => {
    let active = true;

    const loadDailyTip = async () => {
      try {
        const today = formatDayKey(new Date());
        const cachedTip = await AsyncStorage.getItem(`daily_tip_${today}`);

        if (cachedTip && active) {
          setDailyTip(cachedTip);
        } else if (active) {
          const moodKey = todayMoodData?.dominantMood?.key || 'default';
          const newTip = generateQuickTip(moodKey);
          AsyncStorage.setItem(`daily_tip_${today}`, newTip).catch(() => {});
          setDailyTip(newTip);
        }
      } catch (error) {
        if (__DEV__) logger.error('Daily tip loading error:', error);
        if (active) setDailyTip(generateQuickTip(todayMoodData?.dominantMood?.key || 'default'));
      }
    };

    const loadAiMotivation = async () => {
      try {
        const today = formatDayKey(new Date());
        const lastTs = (todayMoodData?.allMoods && todayMoodData.allMoods.length > 0) ? String(todayMoodData.allMoods[todayMoodData.allMoods.length - 1].timestamp) : 'none';
        const key = `ai_motivation_${today}_${todayMoodData?.dominantMood?.key || 'none'}_${lastTs}`;
        const cached = await AsyncStorage.getItem(key);

        const normalizeAiText = (text, moodLabel) => {
          if (!text) return text;
          try {
            const ml = moodLabel && String(moodLabel).trim();
            if (!ml) return text;
            const patterns = [`${ml} —`, `${ml} -`, `${ml}:`, `${ml} — `, `${ml} - `, `${ml}: `, `${ml} `, ml];
            let out = String(text);
            for (const p of patterns) {
              if (out.startsWith(p)) {
                out = out.slice(p.length).trim();
                break;
              }
            }
            return out;
          } catch (e) {
            return text;
          }
        };

        if (cached && active) {
          const moodLabel = (displayMood && (t(displayMood.key) || displayMood.label)) || t('yourMood') || 'Ruh halin';
          const clean = normalizeAiText(cached, moodLabel);
          setAiMotivation(clean);
          return;
        }

        const trend = todayMoodData?.trendDirection || 'stable';
        const streak = todayMoodData?.journalStreak?.current || 0;
        const lastEntryText = (todayMoodData?.allMoods && todayMoodData.allMoods.length > 0) ? String(todayMoodData.allMoods[todayMoodData.allMoods.length - 1].text || '') : '';
        const action = generateQuickTip((todayMoodData?.dominantMood && todayMoodData.dominantMood.key) || 'default') || t('keepGoing') || 'Küçük bir adım at';

        let aiMsg = '';
        if (trend === 'up') {
          aiMsg = `Bugün ilerleme var — bu enerjiyi korumak için: ${action}.`;
        } else if (trend === 'down') {
          aiMsg = `Zorlayıcı bir gün olabilir. Kendine nazik davran; bir mola ver ya da küçük bir görev tamamla.`;
        } else {
          if (streak >= 3) {
            aiMsg = `Harika iş! ${streak} gündür tutarlı ilerliyorsun. Küçük bir kutlama yap.`;
          } else if (lastEntryText && lastEntryText.length > 20) {
            const snippet = lastEntryText.split(/[\.\!\?]/)[0].slice(0, 80);
            aiMsg = `Son yazında "${snippet}..." demişsin. Bugün için küçük bir hedef belirleyebilirsin: ${action}.`;
          } else {
            aiMsg = `Bugünü üretken kılmak için küçük bir adım at: ${action}.`;
          }
        }

        const moodLabel = (displayMood && (t(displayMood.key) || displayMood.label)) || t('yourMood') || 'Ruh halin';
        const normalized = normalizeAiText(aiMsg, moodLabel);
        AsyncStorage.setItem(key, normalized).catch(() => {});
        if (active) setAiMotivation(normalized);
      } catch (e) {
        if (__DEV__) logger.warn('AI motivation generation failed:', e);
        if (active) setAiMotivation('Duygusal farkındalığın gelişiyor — küçük bir adım atmayı unutma.');
      }
    };

    loadDailyTip();
    loadAiMotivation();
    return () => { active = false; };
  }, [
    // update when today's entries or dominant mood change
    todayMoodData?.allMoods?.length,
    todayMoodData?.dominantMood?.key,
    displayMood?.key,
    selectedDate,
  ]);

  // QuickTip: Günlük mesajları kullan
  const quickTip = useMemo(() => {
    return dailyTip || 'Günlük mesaj yükleniyor...';
  }, [dailyTip]);
  
  // Sadece bugün için göster - selectedDate verilmemişse her zaman göster
  if (selectedDate) {
    const today = new Date();
    const selectedDateObj = new Date(selectedDate);
    today.setHours(0, 0, 0, 0);
    selectedDateObj.setHours(0, 0, 0, 0);
    
    // selectedDate bugün değilse component'i gösterme
    if (selectedDateObj.getTime() !== today.getTime()) {
      return null;
    }
  }
  
  // Check: Hiç proje var mı?
  const hasNoProjects = activeTasks.length === 0 && completedTasks.length === 0;
  
  const content = (
    <View style={styles.container}>
      {/* Enhanced Mood Status - More Prominent */}
      <View style={[
        styles.moodStatus,
        { 
          borderLeftColor: hasNoProjects 
            ? '#667eea' // Proje yoksa mor
            : (todayMoodData.dominantMood?.color || '#007AFF'),
          backgroundColor: theme.name === 'dark' 
            ? (hasNoProjects ? 'rgba(102, 126, 234, 0.12)' : (todayMoodData.dominantMood ? 'rgba(28, 28, 30, 0.88)' : 'rgba(0, 122, 255, 0.12)'))
            : (hasNoProjects ? 'rgba(102, 126, 234, 0.08)' : (todayMoodData.dominantMood ? 'rgba(255, 255, 255, 0.94)' : 'rgba(0, 122, 255, 0.08)')),
          borderWidth: theme.name === 'dark' ? 1 : 0.5,
          borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          shadowColor: hasNoProjects ? '#667eea' : (todayMoodData.dominantMood?.color || '#8E7DBE'),
          // Softer, more subtle shadow (larger radius, lower opacity)
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 0,
        }
      ]}>
        <View style={[
          styles.moodIconContainer,
          {
            backgroundColor: hasNoProjects 
              ? '#667eea' // Proje yoksa mor (teşvik edici)
              : (todayMoodData.dominantMood?.color || '#007AFF'),
            shadowColor: hasNoProjects 
              ? '#667eea' 
              : (todayMoodData.dominantMood?.color || '#007AFF'),
            // Softer icon shadow
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 0,
          }
        ]}>
          <MaterialIcons 
            name={hasNoProjects ? 'rocket-launch' : (todayMoodData.dominantMood?.icon || 'create')} 
            size={22} 
            color="#000000" 
          />
        </View>
        
          <View style={styles.statusContent}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
            <Text style={[
              styles.statusText,
              { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F', flex: 1, flexShrink: 1, flexWrap: 'wrap' }
            ]}>
              {hasNoProjects ? 
                    t('startYourJourney') || 'İlk projeni oluşturarak başla' :
                    (displayMood ? 
                      `${t('todayYourMoodIs')} ${t(displayMood.key) || displayMood.label || displayMood.key}${t('like') ? ' ' + t('like') : ''}` :
                      t('howAreYouFeelingToday')
                    )
                  }
            </Text>
            
            {/* ✨ Streak Badge - Sadece proje varsa */}
            {!hasNoProjects && todayMoodData.journalStreak.current >= 3 && (
                <View style={[styles.streakBadge, { backgroundColor: displayMood?.color || '#FF9500', marginLeft: 8 }]}> 
                <Text style={styles.streakText}>🔥 {todayMoodData.journalStreak.current}</Text>
              </View>
            )}
          </View>
          
          <Text style={[
            styles.motivationText,
            { 
              color: theme.name === 'dark' 
                ? (hasNoProjects ? '#667eea' : (todayMoodData.dominantMood ? '#8E8E93' : '#4A90E2'))
                : (hasNoProjects ? '#667eea' : (todayMoodData.dominantMood ? '#8E8E93' : '#4A90E2'))
            }
          ]}>
            {aiMotivation || quickTip}
          </Text>
        </View>
      </View>
    </View>
  );

  // Smart onPress: Proje yoksa farklı action
  const handlePress = hasNoProjects ? onCreateFirstProject : onPress;
  
  if (handlePress) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}, (prevProps, nextProps) => { // React.memo comparison function
  // Custom comparison: Journal entry VEYA proje sayısı değiştiğinde re-render
  
  // Proje sayılarını kontrol et
  const prevHasNoProjects = prevProps.activeTasks.length === 0 && prevProps.completedTasks.length === 0;
  const nextHasNoProjects = nextProps.activeTasks.length === 0 && nextProps.completedTasks.length === 0;
  
  // Proje durumu değiştiyse re-render gerekli
  if (prevHasNoProjects !== nextHasNoProjects) {
    if (__DEV__) logger.debug('🔄 MoodStatement - Re-render gerekli (proje durumu değişti)');
    return false; // Do re-render
  }
  
  // Journal entry count ve son timestamp karşılaştır
  let prevCount = 0;
  let prevLastTimestamp = '';
  let prevLastMoodKey = '';
  let prevLastTextLen = 0;
  [...prevProps.activeTasks, ...prevProps.completedTasks].forEach(task => {
    if (task.journalEntries) {
      prevCount += task.journalEntries.length;
      const last = task.journalEntries[task.journalEntries.length - 1];
      if (last?.createdAt > prevLastTimestamp) prevLastTimestamp = last.createdAt;
      if (last?.createdAt === prevLastTimestamp) {
        prevLastMoodKey = last?.mood || prevLastMoodKey;
        prevLastTextLen = last?.text ? String(last.text).length : prevLastTextLen;
      }
    }
  });
  
  let nextCount = 0;
  let nextLastTimestamp = '';
  let nextLastMoodKey = '';
  let nextLastTextLen = 0;
  [...nextProps.activeTasks, ...nextProps.completedTasks].forEach(task => {
    if (task.journalEntries) {
      nextCount += task.journalEntries.length;
      const last = task.journalEntries[task.journalEntries.length - 1];
      if (last?.createdAt > nextLastTimestamp) nextLastTimestamp = last.createdAt;
      if (last?.createdAt === nextLastTimestamp) {
        nextLastMoodKey = last?.mood || nextLastMoodKey;
        nextLastTextLen = last?.text ? String(last.text).length : nextLastTextLen;
      }
    }
  });
  
  // True = DON'T re-render, False = RE-render
  const shouldSkipRender = (
    prevCount === nextCount && 
    prevLastTimestamp === nextLastTimestamp &&
    prevProps.selectedDate === nextProps.selectedDate &&
    prevLastMoodKey === nextLastMoodKey &&
    prevLastTextLen === nextLastTextLen
  );
  
  if (!shouldSkipRender) {
    if (__DEV__) logger.debug('🔄 MoodStatement - Re-render gerekli (journal değişti)');
  }
  
  return shouldSkipRender;
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24, // slightly narrower to better fit header
    marginTop: 2, // reduced top margin so MoodStatement sits closer to header
    marginBottom: 0,
  },
  moodStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12, // moderate vertical padding to fit header
    paddingHorizontal: 8, // slightly more compact horizontally
    borderRadius: 16,
    borderLeftWidth: 4,
  },
  moodIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusText: {
    fontSize: 13, // moderate size to fit header
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 2,
    lineHeight: 18,
    letterSpacing: -0.3,
    flexWrap: 'wrap',
  },
  motivationText: {
    fontSize: 11, // slightly larger than original but smaller than previous change
    fontFamily: 'Poppins_400Regular',
    lineHeight: 16,
    opacity: 0.85,
  },
  streakBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  streakText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#000000',
  },
});

export default MoodStatement;
