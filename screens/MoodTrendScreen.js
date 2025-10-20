// screens/MoodTrendScreen.js
import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import AnimatedReanimated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withRepeat, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Svg, { Path, Circle, Text as SvgText, Line, Defs, RadialGradient, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

// Local Catmull-Rom to Bezier converter to avoid external dependency on d3-shape
// points: array of [x,y] pairs. closed: boolean
function catmullRom2bezier(points, closed = true, tensionDiv = 36) {
  if (!points || points.length === 0) return '';
  const size = points.length;
  let d = '';
  for (let i = 0; i < size; i++) {
    const p0 = points[(i - 1 + size) % size];
    const p1 = points[i];
    const p2 = points[(i + 1) % size];
    const p3 = points[(i + 2) % size];

    if (i === 0) {
      d += `M${p1[0]},${p1[1]} `;
    }

    // Catmull-Rom to Bezier conversion with adjustable tension
    const control1x = p1[0] + (p2[0] - p0[0]) / tensionDiv;
    const control1y = p1[1] + (p2[1] - p0[1]) / tensionDiv;
    const control2x = p2[0] - (p3[0] - p1[0]) / tensionDiv;
    const control2y = p2[1] - (p3[1] - p1[1]) / tensionDiv;

    d += `C${control1x},${control1y} ${control2x},${control2y} ${p2[0]},${p2[1]} `;
  }

  if (closed) d += 'Z';
  return d;
}
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useActiveTasks, useCompletedTasks } from '../hooks/useTaskContext';
import { MOODS, EXTENDED_MOODS } from '../utils/AIMoodPredictor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProjectAnalyzer from '../utils/ProjectAnalyzer';

const { width, height } = Dimensions.get('window');

// Custom Radar Chart Component - 5 Category Pentagon
const CustomRadarChart = ({ moodData, size = 280, theme }) => {
  const { t } = useLanguage();
  const center = size / 2;
  const maxRadius = size / 2 - 40;
  const levels = 4;
  const angleStep = (Math.PI * 2) / 5; // Pentagon - 5 sides
  
  // 5 categories for pentagon shape with distinct color tones
  const categories = [
    { label: t('positive') || 'Positive', iconName: 'sentiment-very-satisfied', value: moodData.positive || 0, angle: -Math.PI / 2, color: '#9333EA' },
    { label: t('peaceful') || 'Peaceful', iconName: 'spa', value: moodData.peaceful || 0, angle: -Math.PI / 2 + angleStep, color: '#06B6D4' },
    { label: t('balanced') || 'Balanced', iconName: 'wb-sunny', value: moodData.balanced || 0, angle: -Math.PI / 2 + angleStep * 2, color: '#F59E0B' },
    { label: t('neutral') || 'Neutral', iconName: 'sentiment-neutral', value: moodData.neutral || 0, angle: -Math.PI / 2 + angleStep * 3, color: '#6B7280' },
    { label: t('negative') || 'Negative', iconName: 'sentiment-dissatisfied', value: moodData.negative || 0, angle: -Math.PI / 2 + angleStep * 4, color: '#EF4444' },
  ];

  // Reduced baseline so polygon reflects real variance better
  const minBaseline = 0.25; // was 0.5, now 25%

  // Dynamic scaling: use the highest category value as reference so the chart
  // fills relative to the highest observed value instead of always 100.
  // To avoid tiny max values blowing up the chart, enforce a floor (displayMaxFloor).
  const values = categories.map(c => c.value || 0);
  const maxValue = Math.max(...values, 0);
  const displayMaxFloor = 30; // If max is very small, treat it as at least this to avoid over-amplification
  const displayMax = Math.max(maxValue, displayMaxFloor);

  // Memoize heavy calculations
  const { dataPoints, polygonPoints, glowPoints, baseColor, avgFillOpacity, pathD, glowD } = React.useMemo(() => {
    const pts = categories.map(cat => {
      // Normalize relative to displayMax (dynamic) rather than fixed 100
      const rawRatio = displayMax > 0 ? (cat.value / displayMax) : 0;
      const clampedRatio = Math.max(0, Math.min(1, rawRatio));
      const normalizedValue = minBaseline + (clampedRatio * (1 - minBaseline));
      const radius = normalizedValue * maxRadius;
      const x = center + radius * Math.cos(cat.angle);
      const y = center + radius * Math.sin(cat.angle);
      return { x, y, radius, value: cat.value, label: cat.label, angle: cat.angle, color: cat.color };
    });

  const poly = pts.map(p => `${p.x},${p.y}`).join(' ');

  // Create smooth closed path using local Catmull-Rom to Bezier converter
  const pointPairs = pts.map(p => [p.x, p.y]);
  const path = catmullRom2bezier(pointPairs, true, 36); // higher divisor -> less smoothing

    // Glow polygon: very slightly larger radius for a subtle, tight glow
    // Remove the larger additive offset so the glow doesn't form a visible rim
    const glowPts = pts.map(p => {
      const glowRadius = Math.min(maxRadius, p.radius * 1.03 + 2);
      const gx = center + glowRadius * Math.cos(p.angle);
      const gy = center + glowRadius * Math.sin(p.angle);
      return `${gx},${gy}`;
    });

    const glowPairs = pts.map(p => {
      const glowRadius = Math.min(maxRadius, p.radius * 1.03 + 2);
      return [center + glowRadius * Math.cos(p.angle), center + glowRadius * Math.sin(p.angle)];
    });
  const glowPath = catmullRom2bezier(glowPairs, true, 36);

    // Derive base color (dominant) fallback
    const total = categories.reduce((s, c) => s + c.value, 0);
    const dominant = total === 0 ? null : categories.reduce((max, c) => c.value > max.value ? c : max, categories[0]);
    const base = dominant ? dominant.color : '#CCCCCC';

  // Compute average fill relative to displayMax so fill intensity matches dynamic scaling
  const avgFill = pts.length > 0 ? (0.45 + 0.45 * (pts.reduce((s, p) => s + (p.value / displayMax), 0) / pts.length)) : 0.6;

    return { dataPoints: pts, polygonPoints: poly, glowPoints: glowPts, baseColor: base, avgFillOpacity: avgFill, pathD: path, glowD: glowPath };
  }, [categories, center, maxRadius, minBaseline, displayMax]);

  // In dark theme use a near-white gray for grid circles so they read against the very dark background
  const gridColor = theme.name === 'dark' ? 'rgba(230, 230, 230, 0.18)' : 'rgba(0, 0, 0, 0.10)';

  // Determine top two dominant categories for gradient
  const sortedByValue = [...categories].sort((a, b) => b.value - a.value);
  const top1 = sortedByValue[0] || { color: baseColor };
  const top2 = sortedByValue[1] || top1;
  // Gradient id unique per render to avoid conflicts
  const gradId = `radarGrad-${top1.color.replace('#', '')}-${top2.color.replace('#', '')}`;
  // 5 point shared values used for glow pulse only
  const p0 = useSharedValue(0);
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  const p3 = useSharedValue(0);
  const p4 = useSharedValue(0);

  useEffect(() => {
    // start repeating glow pulses for each point with small stagger
    // make the bounce a bit faster and smoother and increase scale range for more presence
    p0.value = withDelay(50, withRepeat(withTiming(1, { duration: 700 }), -1, true));
    p1.value = withDelay(110, withRepeat(withTiming(1, { duration: 720 }), -1, true));
    p2.value = withDelay(170, withRepeat(withTiming(1, { duration: 740 }), -1, true));
    p3.value = withDelay(230, withRepeat(withTiming(1, { duration: 760 }), -1, true));
    p4.value = withDelay(290, withRepeat(withTiming(1, { duration: 780 }), -1, true));

    return () => {
      // stop pulses
      p0.value = 0;
      p1.value = 0;
      p2.value = 0;
      p3.value = 0;
      p4.value = 0;
    };
  }, [p0, p1, p2, p3, p4]);

  // (global chart animation removed — only per-point glow remains)

  // individual point glow animated styles (dot is static)
  // increase scale range and maximum opacity for a more noticeable but still subtle pulse
  const p0GlowStyle = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(p0.value, [0, 1], [0.9, 1.16]) }], opacity: interpolate(p0.value, [0, 1], [0, 0.18]) }));
  const p1GlowStyle = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(p1.value, [0, 1], [0.9, 1.16]) }], opacity: interpolate(p1.value, [0, 1], [0, 0.18]) }));
  const p2GlowStyle = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(p2.value, [0, 1], [0.9, 1.16]) }], opacity: interpolate(p2.value, [0, 1], [0, 0.18]) }));
  const p3GlowStyle = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(p3.value, [0, 1], [0.9, 1.16]) }], opacity: interpolate(p3.value, [0, 1], [0, 0.18]) }));
  const p4GlowStyle = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(p4.value, [0, 1], [0.9, 1.16]) }], opacity: interpolate(p4.value, [0, 1], [0, 0.18]) }));

  return (
    <View style={{ width: size, height: size + 20, position: 'relative' }}>
      <Svg width={size} height={size + 20}>
        <Defs>
          <SvgLinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={top1.color} stopOpacity="0.72" />
            <Stop offset="70%" stopColor={top2.color} stopOpacity="0.45" />
          </SvgLinearGradient>
        </Defs>

        {/* Grid circles */}
        {[...Array(levels)].map((_, i) => {
          const radius = ((i + 1) / levels) * maxRadius;
          // Make grid circles more prominent: higher opacity and stroke for outer circles
          const opacity = 0.6 - (i * 0.12);
          const strokeW = i === levels - 1 ? "2" : "1.4";
          return (
            <Circle
              key={`circle-${i}`}
              cx={center}
              cy={center}
              r={radius}
              stroke={gridColor}
              strokeWidth={strokeW}
              fill="none"
              opacity={opacity}
            />
          );
        })}

        {/* Glow path under the main shape for subtle outer glow */}
        {glowD && (
          <Path
            d={glowD}
            fill={baseColor}
            // keep glow extremely subtle to avoid strong colored rim
            fillOpacity={0.008}
            stroke="none"
          />
        )}

        {/* Main smooth polygon with gradient fill and subtle stroke in dark mode */}
        {pathD && (
          <Path
            d={pathD}
            fill={`url(#${gradId})`}
            // In dark mode make polygon solid (no transparency)
            fillOpacity={theme && theme.name === 'dark' ? 1 : Math.min(avgFillOpacity, 0.78)}
            // remove stroke so no faint rim appears around the polygon
            stroke={baseColor}
            strokeOpacity={0}
            strokeWidth={0}
          />
        )}

        {/* Data point markers with subtle static backing (SVG fallback) */}
        {dataPoints.map((p, idx) => (
          <React.Fragment key={`pt-${idx}`}>
            {/* very small static backing circle so SVG still looks fine if reanimated not available */}
              <Circle cx={p.x} cy={p.y} r={3} fill={baseColor} fillOpacity={0.06} />
              <Circle cx={p.x} cy={p.y} r={4} fill={p.color} fillOpacity={0.10} />
          </React.Fragment>
        ))}

      </Svg>
      
      {/* Animated overlay markers (native Views to use reanimated easily) */}
      {dataPoints.map((p, idx) => {
        // glow + static dot per point
        const glowStyle = idx === 0 ? p0GlowStyle : idx === 1 ? p1GlowStyle : idx === 2 ? p2GlowStyle : idx === 3 ? p3GlowStyle : p4GlowStyle;
        const bgColor = theme.name === 'dark' ? `${p.color}CC` : p.color;
        return (
          <React.Fragment key={`anim-pt-${idx}`}>
            <AnimatedReanimated.View
              style={[
                {
                  position: 'absolute',
                  left: p.x - 9,
                  top: p.y - 9,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: bgColor,
                  opacity: 0.12,
                },
                glowStyle
              ]}
            />
            <AnimatedReanimated.View
              style={[
                {
                  position: 'absolute',
                  left: p.x - 4,
                  top: p.y - 4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.name === 'dark' ? '#FFF' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: p.color,
                }
              ]}
            />
          </React.Fragment>
        );
      })}

      {/* Category Labels positioned outside the chart border */}
      {categories.map((cat, index) => {
        const labelRadius = maxRadius * 1.15; // 15% daha dışarıda
        const labelX = center + labelRadius * Math.cos(cat.angle);
        const labelY = center + labelRadius * Math.sin(cat.angle);
        
        return (
          <View
            key={`label-${index}`}
            style={{
              position: 'absolute',
              left: labelX - 25,
              top: labelY - 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{
              fontSize: 11,
              fontWeight: '700',
              color: cat.color,
              textAlign: 'center',
            }}>
              {cat.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// Natural language summary generator
  const getMoodSummaryText = (categories, isLastDay, t, lang = 'en') => {
  const safeT = (key, params) => {
    try {
      const res = t(key, params);
      // if translation returned the key itself (no translation found), build a simple fallback
      if (!res || (typeof res === 'string' && res.indexOf('thisWeek_') !== -1 && res === key)) {
        // basic readable fallback
        if (key === 'thisWeek_balanced') return lang && lang.startsWith('tr') ? `Bu hafta genel olarak dengeli` : `This week felt balanced`;
        if (params && params.top) {
          if (lang && lang.startsWith('tr')) return `Bu hafta sizin için çoğunlukla ${params.top} ${params.verb || ''}`;
          // English fallback (choose tense-aware phrase)
          return isLastDay ? `This week was mostly ${params.top}.` : `This week is mostly ${params.top}.`;
        }
        return key;
      }
      return res;
    } catch (e) {
      return key;
    }
  };

  const sorted = [...categories].sort((a, b) => b.value - a.value);
  const top = sorted[0] || { label: '' };
  const second = sorted[1] || { label: '' };
  const high = top.value >= 60;
  const medium = top.value >= 35;
  const secondClose = second.value > 20 && (top.value - second.value < 20);

  // Language-aware phrasing: Turkish needs a verb ('geçiyor'/'geçti'), English reads better with whole sentences
  if (lang && lang.startsWith('tr')) {
    const verb = isLastDay ? (t('past') || 'geçti') : (t('present') || 'geçiyor');
    if (high && secondClose) return safeT('thisWeek_quite_and', { top: top.label.toLowerCase(), second: second.label.toLowerCase(), verb });
    if (high) return safeT('thisWeek_very', { top: top.label.toLowerCase(), verb });
    if (medium && secondClose) return safeT('thisWeek_some_and', { top: top.label.toLowerCase(), second: second.label.toLowerCase(), verb });
    if (medium) return safeT('thisWeek_some', { top: top.label.toLowerCase(), verb });
    if (top.value > 0) return safeT('thisWeek_mostly', { top: top.label.toLowerCase(), verb });
    return safeT('thisWeek_balanced', { verb });
  }

  // English / fallback: produce natural sentences without injecting an extra 'now' word
  if (high && secondClose) return `This week was largely ${top.label.toLowerCase()} and ${second.label.toLowerCase()}.`;
  if (high) return `This week was very ${top.label.toLowerCase()}.`;
  if (medium && secondClose) return `This week had some ${top.label.toLowerCase()} and ${second.label.toLowerCase()}.`;
  if (medium) return `This week had some ${top.label.toLowerCase()}.`;
  if (top.value > 0) return isLastDay ? `This week was mostly ${top.label.toLowerCase()}.` : `This week is mostly ${top.label.toLowerCase()}.`;
  return `This week felt balanced.`;
};

// Local fallback summary builder that never uses translation keys.
// This guarantees the header is a natural sentence in TR/EN using category labels.
const buildSafeSummary = (categories, isLastDay, lang = 'en') => {
  const sorted = [...categories].sort((a, b) => b.value - a.value);
  const top = sorted[0] || { label: '' };
  const second = sorted[1] || { label: '' };
  const topLabel = (top.label || '').toString().toLowerCase();
  const secondLabel = (second.label || '').toString().toLowerCase();
  const high = (top.value || 0) >= 60;
  const medium = (top.value || 0) >= 35;
  const secondClose = (second.value || 0) > 20 && ((top.value || 0) - (second.value || 0) < 20);

  if (lang && lang.startsWith('tr')) {
    const verb = isLastDay ? 'geçti' : 'geçiyor';
    if (high && secondClose) return `Bu hafta sizin için çoğunlukla ${topLabel} ve ${secondLabel} ${verb}.`;
    if (high) return `Bu hafta sizin için çok ${topLabel} ${verb}.`;
    if (medium && secondClose) return `Bu hafta sizin için biraz ${topLabel} ve ${secondLabel} ${verb}.`;
    if (medium) return `Bu hafta sizin için biraz ${topLabel} ${verb}.`;
    if ((top.value || 0) > 0) return `Bu hafta sizin için çoğunlukla ${topLabel} ${verb}.`;
    return `Bu hafta genel olarak dengeli.`;
  }

  // English
  if (high && secondClose) return `This week was largely ${topLabel} and ${secondLabel}.`;
  if (high) return `This week was very ${topLabel}.`;
  if (medium && secondClose) return `This week had some ${topLabel} and ${secondLabel}.`;
  if (medium) return `This week had some ${topLabel}.`;
  if ((top.value || 0) > 0) return isLastDay ? `This week was mostly ${topLabel}.` : `This week is mostly ${topLabel}.`;
  return `This week felt balanced.`;
};

// Generate a supportive message for the dominant mood.
// Rotates daily so users don't see the exact same line every day.
const generateSupportiveMessage = (dominantLabel = '', lang = 'en') => {
  const label = (dominantLabel || '').toString().toLowerCase();
  const daySeed = Math.floor(Date.now() / 86400000); // days since epoch

  const templates = {
    en: {
      positive: [
        `Nice work — keep riding that positive energy.`,
        `You're doing well — try to notice what boosted your mood today.`,
        `Great to see positive moments — consider thanking yourself for them.`,
        `Carry this momentum: small actions can keep this up.`
      ],
      peaceful: [
        `That calm feeling is valuable — lean into what's grounding you.`,
        `You're in a peaceful place — consider a mindful moment to savor it.`,
        `Quiet and calm can recharge you — hold on to what helped today.`,
        `Use this calm as a break — small rituals help it last.`
      ],
      balanced: [
        `A balanced week — nice stability. Keep small routines that help.`,
        `You're steady — notice the little wins that keep things stable.`,
        `Balance matters — maybe schedule a small treat for yourself.`,
        `Steady progress is real progress — keep going.`
      ],
      neutral: [
        `A neutral week — that's okay. Small comforts can brighten things.`,
        `Not dramatic — try a small novelty to bump your mood gently.`,
        `Neutral days can be restful; a small goal may add momentum.`,
        `It's fine to have a calm week — prioritize simple self-care.`
      ],
      negative: [
        `Tough week — it's okay to rest and reach out if you need support.`,
        `If things feel heavy, try one small, doable step for yourself today.`,
        `You're not alone — brief grounding exercises can help a bit.`,
        `Hard days happen — be gentle with yourself and consider a small reset.`
      ],
      default: [
        `Take a moment for yourself — small actions add up.`,
        `You matter — try one gentle habit today.`,
      ]
    },
    tr: {
      positive: [
        `Güzel — bu pozitif enerjiyi sürdürmeye çalış.`,
        `İyi gidiyorsun — bugün seni iyi hissettirenleri fark et.`,
        `Pozitif anları kutla; kendine teşekkür etmeyi unutma.`,
        `Bu ivmeyi kullan; küçük adımlar fark yaratır.`
      ],
      peaceful: [
        `Huzurlu bir dönem — seni ayakta tutanı sürdür.`,
        `Sakin anları fark et; birkaç derin nefes iyi gelir.`,
        `Huzur yenileyicidir — bugün küçük bir ritüel dene.`,
        `Sakinlik değerli; kendine nazik ol.`
      ],
      balanced: [
        `Dengeli bir hafta — istikrar güzel, küçük ödüller planla.`,
        `Stabil olmak önemli; küçük kazanımları kutla.`,
        `Dengeyi korumak için basit rutinlere devam et.`,
        `İlerleme istikrarlıysa bu zaten başarıdır.`
      ],
      neutral: [
        `Nötr bir hafta — bu da normal. Küçük keyifler ekleyebilirsin.`,
        `Çok heyecan yoksa bir yenilik deneyebilirsin; ruh halini hafifçe yükseltir.`,
        `Sakin günler dinlendirici olabilir; basit öz bakım yap.`,
        `Nötr olmak sorun değil; kendine küçük hedefler koy.`
      ],
      negative: [
        `Zor bir dönem olabilir — dinlenmek ve destek istemek önemlidir.`,
        `Şimdi küçük, yapılabilir bir adım at; bu yardımcı olabilir.`,
        `Ağır hissediyorsan kısa bir topraklanma egzersizi deneyebilirsin.`,
        `Zor günler olur; kendine nazik davran ve gerekiyorsa yardım iste.`
      ],
      default: [
        `Kendine zaman ayır; küçük adımlar birikir.`,
        `Sen değerlisin; bugün kendine iyi davran.`
      ]
    }
  };

  // choose category by matching keywords in label
  let cat = 'default';
  if (/posit|iyi|pozitif|excited|grateful|proud|motivated/i.test(label)) cat = 'positive';
  else if (/peace|huzur|huzurlu|calm|peaceful|relieved|content/i.test(label)) cat = 'peaceful';
  else if (/balanc|dengeli|hopeful|confident|curious|surprised/i.test(label)) cat = 'balanced';
  else if (/neutral|nötr|okay|contemplative|nostalgic|bored/i.test(label)) cat = 'neutral';
  else if (/negat|üzgün|sad|angry|anxious|stressed|tired|frustrated|worried/i.test(label)) cat = 'negative';

  const langKey = (lang && lang.startsWith('tr')) ? 'tr' : 'en';
  const pool = (templates[langKey] && templates[langKey][cat]) || templates[langKey].default;
  const idx = Math.abs(daySeed) % pool.length;
  return pool[idx];
};

// (previous simple motivation sentence removed — replaced by AI analysisSnippet)

// Mood Summary Info Box Component
const MoodSummaryBox = ({ categories, theme, t, isLastDay, analysisSnippet, language }) => {
  const dominantCategory = categories.reduce((prev, current) =>
    (current.value > prev.value) ? current : prev
  );
  const cardBg = theme.name === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';
  const borderColor = theme.name === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
  const textPrimary = theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F';
  const textSecondary = theme.name === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)';

  // Gradient background for the summary box - subtle and theme-aware
  const gradColors = theme.name === 'dark'
    ? ['rgba(255,255,255,0.02)', `${dominantCategory.color}06`]
    : ['rgba(255,255,255,0.9)', `${dominantCategory.color}10`];

  return (
    <LinearGradient colors={gradColors} style={[styles.moodSummaryBox, { borderColor }]}> 
      <View style={[
        styles.moodSummaryIconCircle,
        { backgroundColor: theme.name === 'dark' ? `${dominantCategory.color}12` : `${dominantCategory.color}18` }
      ]}>
        <MaterialIcons 
          name={dominantCategory.iconName} 
          size={32} 
          color={theme.name === 'dark' ? `${dominantCategory.color}DD` : dominantCategory.color}
        />
      </View>
      <View style={styles.moodSummaryTextContainer}>
        {
          (() => {
            // Compute the summary text and ensure we never leak raw translation keys.
            const candidate = getMoodSummaryText(categories, isLastDay, t, language);
            const shouldFallback = !candidate || (typeof candidate === 'string' && candidate.indexOf('thisWeek_') !== -1);
            const summaryText = shouldFallback ? buildSafeSummary(categories, isLastDay, language) : candidate;
            return (
              <Text style={[styles.moodSummaryCategory, { color: textPrimary, fontSize: 14 }]}> 
                {summaryText}
              </Text>
            );
          })()
        }
        {/* Supportive message (rotates daily) — prefer a tailored supportive line based on dominant category */}
        <Text style={{ color: textSecondary, fontSize: 12, marginTop: 8 }}>
          {generateSupportiveMessage(dominantCategory.label, language)}
        </Text>
        {/* If AI analysis exists and is meaningfully different, show it below the supportive line */}
        {analysisSnippet && analysisSnippet !== generateSupportiveMessage(dominantCategory.label, language) ? (
          <Text style={{ color: textSecondary, fontSize: 12, marginTop: 8 }}>
            {analysisSnippet}
          </Text>
        ) : null}
      </View>
    </LinearGradient>
  );
};

const MoodTrendScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const locale = language === 'tr' ? 'tr-TR' : (language || 'en-US');
  const insets = useSafeAreaInsets();
  const activeTasks = useActiveTasks();
  const completedTasks = useCompletedTasks();

  // Collect all mood data
  const allMoodData = useMemo(() => {
    const allTasks = [...activeTasks, ...completedTasks];
    const moodEntries = [];
    
    allTasks.forEach(task => {
      if (task.journalEntries && Array.isArray(task.journalEntries)) {
        task.journalEntries.forEach(entry => {
          if (entry.mood) {
            moodEntries.push({
              mood: entry.mood,
              createdAt: new Date(entry.createdAt),
              taskTitle: task.title,
            });
          }
        });
      }
    });
    
    // Sort by date (newest first)
    return moodEntries.sort((a, b) => b.createdAt - a.createdAt);
  }, [activeTasks, completedTasks]);

  // 5-Category Mood System for Pentagon Chart
  const veryPositiveMoods = ['excited', 'grateful', 'proud', 'motivated'];  // Pozitif (çok iyi)
  const peacefulMoods = ['happy', 'peaceful', 'relieved', 'content', 'calm'];  // Huzurlu
  const balancedMoods = ['hopeful', 'confident', 'curious', 'surprised'];  // Dengeli
  const neutralMoods = ['okay', 'neutral', 'contemplative', 'bored', 'nostalgic'];  // Nötr
  const negativeMoods = ['sad', 'angry', 'anxious', 'overwhelmed', 'tired', 'frustrated', 'stressed', 'exhausted', 'worried', 'disappointed', 'lonely', 'confused'];  // Negatif
  
  // Legacy categories for compatibility
  const positiveMoods = [...veryPositiveMoods, ...peacefulMoods, ...balancedMoods];

  // Last 7 days analysis
  const last7DaysData = useMemo(() => {
    const now = new Date();
    const last7DaysStart = new Date(now);
    last7DaysStart.setDate(now.getDate() - 7);
    last7DaysStart.setHours(0, 0, 0, 0);
    
    const entries = allMoodData.filter(entry => entry.createdAt >= last7DaysStart);
    
    // Count for each of 5 categories
    const veryPositive = entries.filter(e => veryPositiveMoods.includes(e.mood)).length;
    const peaceful = entries.filter(e => peacefulMoods.includes(e.mood)).length;
    const balanced = entries.filter(e => balancedMoods.includes(e.mood)).length;
    const neutral = entries.filter(e => neutralMoods.includes(e.mood)).length;
    const negative = entries.filter(e => negativeMoods.includes(e.mood)).length;
    
    // Legacy positive count
    const positive = veryPositive + peaceful + balanced;
    const total = entries.length;
    
    return {
      entries,
      positive,
      negative,
      neutral,
      total,
      positivePercent: total > 0 ? Math.round((positive / total) * 100) : 0,
      negativePercent: total > 0 ? Math.round((negative / total) * 100) : 0,
      neutralPercent: total > 0 ? Math.round((neutral / total) * 100) : 0,
      // 5 categories for pentagon
      veryPositivePercent: total > 0 ? Math.round((veryPositive / total) * 100) : 0,
      peacefulPercent: total > 0 ? Math.round((peaceful / total) * 100) : 0,
      balancedPercent: total > 0 ? Math.round((balanced / total) * 100) : 0,
      neutralCategoryPercent: total > 0 ? Math.round((neutral / total) * 100) : 0,
      negativeCategoryPercent: total > 0 ? Math.round((negative / total) * 100) : 0,
    };
  }, [allMoodData]);

  // Count distinct days with entries in the last 7 days. If fewer than 3, we'll show
  // a simple prompt asking the user to write more journal entries instead of analytics.
  const uniqueDaysThisWeekCount = useMemo(() => {
    try {
      const s = new Set(last7DaysData.entries.map(e => {
        const d = new Date(e.createdAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }));
      return s.size;
    } catch (e) {
      return 0;
    }
  }, [last7DaysData]);

  // Previous 7 days for comparison
  const previous7DaysData = useMemo(() => {
    const now = new Date();
    const previous7DaysStart = new Date(now);
    previous7DaysStart.setDate(now.getDate() - 14);
    previous7DaysStart.setHours(0, 0, 0, 0);
    
    const last7DaysStart = new Date(now);
    last7DaysStart.setDate(now.getDate() - 7);
    last7DaysStart.setHours(0, 0, 0, 0);
    
    const entries = allMoodData.filter(entry => 
      entry.createdAt >= previous7DaysStart && entry.createdAt < last7DaysStart
    );
    
    const positive = entries.filter(e => positiveMoods.includes(e.mood)).length;
    const negative = entries.filter(e => negativeMoods.includes(e.mood)).length;
    const total = entries.length;
    
    return {
      total,
      positivePercent: total > 0 ? Math.round((positive / total) * 100) : 0,
      negativePercent: total > 0 ? Math.round((negative / total) * 100) : 0,
    };
  }, [allMoodData]);

  // Daily breakdown (last 7 days)
  const dailyBreakdown = useMemo(() => {
    const now = new Date();
    const days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      
      const dayEntries = allMoodData.filter(entry => 
        entry.createdAt >= date && entry.createdAt < nextDate
      );
      
      const positive = dayEntries.filter(e => positiveMoods.includes(e.mood)).length;
      const negative = dayEntries.filter(e => negativeMoods.includes(e.mood)).length;
      const neutral = dayEntries.filter(e => neutralMoods.includes(e.mood)).length;
      
  const dayName = date.toLocaleDateString(locale, { weekday: 'short' });
      
      days.push({
        date,
        dayName,
        positive,
        negative,
        neutral,
        total: dayEntries.length,
      });
    }
    
    return days;
  }, [allMoodData]);

  // Trend calculation
  const trendInfo = useMemo(() => {
    const thisWeekScore = last7DaysData.total > 0 
      ? (last7DaysData.positive - last7DaysData.negative) / last7DaysData.total 
      : 0;
    
    const prevWeekScore = previous7DaysData.total > 0 
      ? (previous7DaysData.positivePercent - previous7DaysData.negativePercent) / 100 
      : 0;
    
    const scoreDiff = thisWeekScore - prevWeekScore;
    const percentChange = previous7DaysData.total > 0 
      ? Math.round(((last7DaysData.positivePercent - previous7DaysData.positivePercent) / previous7DaysData.positivePercent) * 100) 
      : 0;
    
    let trend = 'stable';
    if (scoreDiff > 0.2) trend = 'improving';
    if (scoreDiff < -0.2) trend = 'declining';
    
    return {
      trend,
      percentChange,
      direction: percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'stable',
    };
  }, [last7DaysData, previous7DaysData]);

  const getMoodInfo = useCallback((moodKey) => {
    return [...MOODS, ...EXTENDED_MOODS].find(m => m.key === moodKey) || 
           { key: moodKey, label: moodKey, icon: 'sentiment-neutral', color: '#8E8E93' };
  }, []);

  // Dominant Mood Color - En çok hissedilen mood'un rengi
  const dominantMoodColor = useMemo(() => {
    if (last7DaysData.total === 0) return '#8E8E93';

    // Tüm mood'ları say
    const moodCounts = {};
    last7DaysData.entries.forEach(entry => {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });

    // En çok hissedilen mood'u bul
    let maxCount = 0;
    let dominantMood = null;
    Object.keys(moodCounts).forEach(mood => {
      if (moodCounts[mood] > maxCount) {
        maxCount = moodCounts[mood];
        dominantMood = mood;
      }
    });

    // Mood rengini getir
    if (dominantMood) {
      const moodInfo = getMoodInfo(dominantMood);
      return moodInfo.color;
    }

    // Fallback: Kategorilere göre renk
    if (last7DaysData.positivePercent > last7DaysData.negativePercent) {
      return '#34C759'; // Pozitif - Yeşil
    } else if (last7DaysData.negativePercent > last7DaysData.positivePercent) {
      return '#FF3B30'; // Negatif - Kırmızı
    }
    return '#8E8E93'; // Nötr - Gri
  }, [last7DaysData, getMoodInfo]);

  // Short AI-style explanation using ProjectAnalyzer (forceShow=true to get a snippet without marking shown)
  const [analysisSnippet, setAnalysisSnippet] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
  // Use static forceShow to avoid marking daily shown state and pass current language
  const currentLang = language || 'en';
  const analysis = await ProjectAnalyzer.constructor.getDailyAnalysis(activeTasks, completedTasks, true, currentLang);
        if (mounted && analysis && analysis.feedback && analysis.feedback.message) {
          let msg = analysis.feedback.message;
          // Post-process Turkish AI output to avoid 'şimdi' in weekly-summary phrasing
          try {
            if (currentLang && currentLang.startsWith('tr')) {
              // prefer natural Turkish phrasing. If it's weekend, prefer past tense 'geçti', otherwise use present-progressive 'geçiyor'
              const verb = isLastDayOfWeek() ? 'geçti' : 'geçiyor';
              // Replace common Turkish temporal phrases that sound unnatural in short summaries
              // 'şimdi', 'şu an', 'şuan', 'şimdilerde' -> replace with more natural verbs or adverbials
              msg = msg.replace(/\b(şimdi|şu an|şuan|şimdilerde)\b/gi, verb);
              // Also replace 'son zamanlarda' with a softer 'son zamanlarda' -> 'son zamanlarda' is okay, but if ends with 'şimdi' force swap
              msg = msg.replace(/\bson zamanlarda\b/gi, 'son zamanlarda');
              // If message still contains an English 'now' for any reason, remove/replace it
              msg = msg.replace(/\bnow\b/gi, verb);
            } else {
              // English: avoid 'now'/'currently' — use 'is' or 'was' depending on week boundary
              const replacementEn = isLastDayOfWeek() ? 'was' : 'is';
              msg = msg.replace(/\b(now|currently|at the moment)\b/gi, replacementEn);
              // If Turkish words accidentally appear, neutralize them
              msg = msg.replace(/\b(şimdi|şu an|şimdilerde)\b/gi, replacementEn);
            }
            // Trim duplicate spaces possibly introduced by replacements
            msg = msg.replace(/\s{2,}/g, ' ').trim();
          } catch (e) {
            // if replacement fails, fall back to original msg
          }
          setAnalysisSnippet(msg);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [activeTasks, completedTasks, language]);



  // weekly mood grid removed per design request

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'improving': return '#34C759';
      case 'declining': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return 'trending-up';
      case 'declining': return 'trending-down';
      default: return 'remove';
    }
  };

  // Theme colors
  const getTrendGradient = () => {
    if (trendInfo.trend === 'improving') {
      return theme.name === 'dark' 
        ? ['#07220b', '#08140a'] // Dark green gradient - much darker for dark theme
        : ['#e8f5e9', '#c8e6c9']; // Light green gradient
    } else if (trendInfo.trend === 'declining') {
      return theme.name === 'dark' 
        ? ['#220607', '#170406'] // Dark red gradient - much darker for dark theme
        : ['#ffebee', '#ffcdd2']; // Light red gradient
    } else {
      return theme.name === 'dark' 
        ? ['#050505', '#0b0b0b'] // Dark neutral gradient - deeper black
        : ['#f5f5f5', '#e0e0e0']; // Light neutral gradient
    }
  };

  const bgGradient = getTrendGradient();
  // Dark theme: make background and cards much darker and mute on-page mood color accents
  const cardBg = theme.name === 'dark' ? '#0B0B0B' : '#FFFFFF';
  const textPrimary = theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F';
  const textSecondary = theme.name === 'dark' ? '#8E8E93' : '#636366';
  const borderColor = theme.name === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)';

  // Haftanın son günü mü?
  const isLastDayOfWeek = () => {
    const now = new Date();
    return now.getDay() === 0 || now.getDay() === 6; // Pazar veya Cumartesi
  };

  if (uniqueDaysThisWeekCount < 3) {
    const cardBgLocal = theme.name === 'dark' ? '#0B0B0B' : '#FFFFFF';
    const textPrimaryLocal = theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F';
    const textSecondaryLocal = theme.name === 'dark' ? '#8E8E93' : '#636366';
    return (
      <View style={[styles.screen, { backgroundColor: cardBgLocal }]}> 
        {/* Header matched to content header (same style & position) */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: Math.max(insets.top, 16) * 3,
          paddingHorizontal: 20,
          paddingBottom: 4,
        }}>
            <TouchableOpacity
              onPress={() => navigation?.goBack?.()}
              style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: -14 }] }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('goBack') || 'Geri Dön'}
          >
            <Ionicons name="chevron-back" size={18} color={textPrimaryLocal} />
          </TouchableOpacity>
          <View style={{ marginLeft: 8 }}>
            <Text style={{ fontSize: 22, fontFamily: 'Poppins_600SemiBold', color: textPrimaryLocal }}>
              {t('moodAnalysis')}
            </Text>
            <Text style={{ fontSize: 14, fontFamily: 'Poppins_400Regular', color: textSecondaryLocal, marginTop: 2 }}>
              {t('last7Days')}
            </Text>
          </View>
        </View>

        <View style={styles.emptyContainer}>
          <MaterialIcons name="analytics" size={64} color={textSecondaryLocal} />
          <Text style={[styles.emptyText, { color: textPrimaryLocal }]}> 
            {t('needMoreJournalDays') || 'Try writing in your journal on at least 3 different days this week to see your mood trends'}
          </Text>
        </View>
      </View>
    );
  }
  if (allMoodData.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: cardBg }]}> 
        {/* Header matched to content header (same style & position) */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: Math.max(insets.top, 16) * 3,
          paddingHorizontal: 20,
          paddingBottom: 4,
        }}>
            <TouchableOpacity
              onPress={() => navigation?.goBack?.()}
              style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: -14 }] }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('goBack') || 'Geri Dön'}
          >
            <Ionicons name="chevron-back" size={18} color={theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F'} />
          </TouchableOpacity>
          <View style={{ marginLeft: 8 }}>
            <Text style={{ fontSize: 22, fontFamily: 'Poppins_600SemiBold', color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }}>
              {t('moodAnalysis')}
            </Text>
            <Text style={{ fontSize: 14, fontFamily: 'Poppins_400Regular', color: theme.name === 'dark' ? '#8E8E93' : '#636366', marginTop: 2 }}>
              {t('last7Days')}
            </Text>
          </View>
        </View>

        <View style={styles.emptyContainer}>
          <MaterialIcons name="sentiment-satisfied" size={64} color={textSecondary} />
          <Text style={[styles.emptyText, { color: textPrimary }]}>
            {t('noMoodData') || 'No mood data yet'}
          </Text>
          <Text style={[styles.emptySubtext, { color: textSecondary }]}>
            {t('startJournalingToTrackMood') || 'Start journaling to track your mood'}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.screen, { backgroundColor: cardBg }]}> 
      {/* Top Bar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Math.max(insets.top, 16) * 3,
        paddingHorizontal: 20,
        paddingBottom: 4,
      }}>
          <TouchableOpacity
            onPress={() => navigation?.goBack?.()}
            style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: -14 }] }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('goBack') || 'Geri Dön'}
        >
          <Ionicons name="chevron-back" size={18} color={theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F'} />
        </TouchableOpacity>
        <View style={{ marginLeft: 8 }}>
          <Text style={{ fontSize: 22, fontFamily: 'Poppins_600SemiBold', color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }}>
            {t('moodAnalysis')}
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'Poppins_400Regular', color: theme.name === 'dark' ? '#8E8E93' : '#636366', marginTop: 2 }}>
            {t('last7Days')}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Radar Chart - Mood Sentiment Analysis */}
        {last7DaysData.total > 0 && (
          <View style={styles.section}>
            
            <View style={styles.radarChartContainer}>
              <CustomRadarChart
                moodData={{
                  positive: last7DaysData.veryPositivePercent || 0,
                  peaceful: last7DaysData.peacefulPercent || 0,
                  balanced: last7DaysData.balancedPercent || 0,
                  neutral: last7DaysData.neutralCategoryPercent || 0,
                  negative: last7DaysData.negativeCategoryPercent || 0
                }}
                size={Math.min(320, width - 60)}
                theme={theme}
              />
            </View>
            
            {/* Mood Summary Box */}
            <MoodSummaryBox 
              categories={[
                { label: t('positive') || 'Positive', iconName: 'sentiment-very-satisfied', value: last7DaysData.veryPositivePercent || 0, color: '#9333EA' },
                { label: t('peaceful') || 'Peaceful', iconName: 'spa', value: last7DaysData.peacefulPercent || 0, color: '#06B6D4' },
                { label: t('balanced') || 'Balanced', iconName: 'wb-sunny', value: last7DaysData.balancedPercent || 0, color: '#F59E0B' },
                { label: t('neutral') || 'Neutral', iconName: 'sentiment-neutral', value: last7DaysData.neutralCategoryPercent || 0, color: '#6B7280' },
                { label: t('negative') || 'Negative', iconName: 'sentiment-dissatisfied', value: last7DaysData.negativeCategoryPercent || 0, color: '#EF4444' },
              ]}
              theme={theme}
              t={t}
              isLastDay={isLastDayOfWeek()}
              language={language}
              analysisSnippet={analysisSnippet}
            />
            
          </View>
        )}

        {/* Weekly calendar removed as requested */}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  topBarTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_600SemiBold',
  },
  topBarSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    marginHorizontal: Math.max(20, width * 0.05),
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  
  // ========== RADAR CHART STYLES ==========
  radarChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  moodSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
  marginTop: 4,
    borderWidth: 1,
  },
  moodSummaryIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  moodSummaryTextContainer: {
    flex: 1,
  },
  moodSummaryTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 2,
  },
  moodSummaryCategory: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 2,
  },
  moodSummarySubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
  },
  // ========== END RADAR CHART STYLES ==========
  
  // ========== CALENDAR STYLES ==========
  calendarContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 10,
    borderWidth: 1,
    gap: 4,
    backgroundColor: '#F8F8FA',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  dayCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  dayHeader: {
    alignItems: 'center',
    marginBottom: 4,
  },
  dayName: {
    fontSize: 9,
    fontFamily: 'Poppins_500Medium',
    textTransform: 'uppercase',
    marginBottom: 1,
    color: '#888',
  },
  dayDate: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: '#222',
  },
  moodCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    position: 'relative',
  },
  moodText: {
    fontSize: 7,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
    textTransform: 'capitalize',
    marginTop: 1,
    color: '#555',
  },
  countBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
    minWidth: 12,
    backgroundColor: '#EEE',
  },
  countText: {
    fontSize: 8,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emptyCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  // ========== END CALENDAR STYLES ==========
  
  // History Card Styles (keep these)
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyInfo: {
    marginLeft: 12,
    flex: 1,
  },
  historyMood: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  historyTask: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  historyDate: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default MoodTrendScreen;
