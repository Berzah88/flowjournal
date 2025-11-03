// screens/MoodTrendScreen.js
import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Pressable,
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
import { Helpers } from '../components/Styles';

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
    { label: t('positive') || 'Positive', iconName: 'sentiment-very-satisfied', value: moodData.positive || 0, angle: -Math.PI / 2, color: '#16A34A' },
    { label: t('peaceful') || 'Peaceful', iconName: 'spa', value: moodData.peaceful || 0, angle: -Math.PI / 2 + angleStep, color: '#06B6D4' },
    { label: t('balanced') || 'Balanced', iconName: 'wb-sunny', value: moodData.balanced || 0, angle: -Math.PI / 2 + angleStep * 2, color: '#F59E0B' },
    { label: t('neutral') || 'Neutral', iconName: 'sentiment-neutral', value: moodData.neutral || 0, angle: -Math.PI / 2 + angleStep * 3, color: '#6B7280' },
    { label: t('negative') || 'Negative', iconName: 'sentiment-dissatisfied', value: moodData.negative || 0, angle: -Math.PI / 2 + angleStep * 4, color: '#EF4444' },
  ];

  // Reduced baseline so polygon reflects real variance better
  // Optimized scaling: slightly higher baseline and a slightly smaller maxScale
  // to avoid shapes touching the outermost grid line. We'll also clamp the
  // computed display max against a robust cap (mean + stddev) to reduce the
  // influence of single extreme outliers.
  // Increase baseline to give a noticeably larger central 'safe' area
  // so zero/very low values aren't visually at the exact center.
  const minBaseline = 0.24; // baseline so smallest values are still visible and center area larger
  // Reduce maxScale slightly so the polygon sits further from the outer ring
  const maxScale = 0.76; // limit how close polygon can get to outer ring

  // Dynamic scaling: derive an adaptive floor from the average of values so
  // tiny datasets still show variance, but large datasets are not over-amplified.
  const values = categories.map(c => c.value || 0);
  const maxValue = Math.max(...values, 0);
  const avgValue = values.length ? (values.reduce((s, v) => s + v, 0) / values.length) : 0;
  const baseFloor = 10; // absolute minimum floor
  const dynamicFloor = Math.max(baseFloor, Math.round(avgValue * 2));
  const displayMax = Math.max(maxValue, dynamicFloor);

  // Robust outlier handling: compute standard deviation and clamp the
  // displayMax to (avg * 3 + 2*stdDev) at minimum 'baseFloor'. This reduces
  // the visual impact when a single category is an extreme outlier.
  const variance = values.length ? values.reduce((s, v) => s + Math.pow(v - avgValue, 2), 0) / values.length : 0;
  const stdDev = Math.sqrt(variance) || 0;
  const robustCap = Math.max(baseFloor, Math.round(avgValue * 3 + stdDev * 2));
  const adjustedDisplayMax = Math.max(dynamicFloor, Math.min(displayMax, robustCap));

  // Memoize heavy calculations
  const { dataPoints, polygonPoints, glowPoints, baseColor, avgFillOpacity, pathD, glowD } = React.useMemo(() => {
  const pts = categories.map(cat => {
  // Normalize relative to adjustedDisplayMax (robust clamped) rather than fixed 100
  const denom = adjustedDisplayMax > 0 ? adjustedDisplayMax : displayMax;
  const rawRatio = denom > 0 ? (cat.value / denom) : 0;
  const clampedRatio = Math.max(0, Math.min(1, rawRatio));
  // Use maxScale to ensure the polygon never reaches the outermost grid line
  const normalizedValue = minBaseline + (clampedRatio * (maxScale - minBaseline));
  const radius = normalizedValue * maxRadius;
      const x = center + radius * Math.cos(cat.angle);
      const y = center + radius * Math.sin(cat.angle);
      return { x, y, radius, value: cat.value, label: cat.label, angle: cat.angle, color: cat.color };
    });

  const poly = pts.map(p => `${p.x},${p.y}`).join(' ');

  // Create smooth closed path using local Catmull-Rom to Bezier converter
  const pointPairs = pts.map(p => [p.x, p.y]);
  // Use a smaller divisor to increase smoothing a bit and reduce visible spikes
  const path = catmullRom2bezier(pointPairs, true, 80);

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
  const glowPath = catmullRom2bezier(glowPairs, true, 80);

    // Derive base color (dominant) fallback
    const total = categories.reduce((s, c) => s + c.value, 0);
    const dominant = total === 0 ? null : categories.reduce((max, c) => c.value > max.value ? c : max, categories[0]);
    const base = dominant ? dominant.color : '#CCCCCC';

  // Compute average fill relative to displayMax so fill intensity matches dynamic scaling
  const avgFill = pts.length > 0 ? (0.45 + 0.45 * (pts.reduce((s, p) => s + (p.value / displayMax), 0) / pts.length)) : 0.6;

    return { dataPoints: pts, polygonPoints: poly, glowPoints: glowPts, baseColor: base, avgFillOpacity: avgFill, pathD: path, glowD: glowPath };
  }, [categories, center, maxRadius, minBaseline, displayMax]);

  // In dark theme use a near-white gray for grid circles so they read against the very dark background
  // Make grid lines a bit more visible in both themes
  const gridColor = theme.name === 'dark' ? 'rgba(230, 230, 230, 0.28)' : 'rgba(0, 0, 0, 0.14)';

  // Determine top two dominant categories for gradient
  const sortedByValue = [...categories].sort((a, b) => b.value - a.value);
  const top1 = sortedByValue[0] || { color: baseColor };
  const top2 = sortedByValue[1] || top1;
  // Two radial gradient ids unique per render (one per top category)
  const radTop1Id = `radTop1-${top1.color.replace('#', '')}-${top2.color.replace('#', '')}`;
  const radTop2Id = `radTop2-${top1.color.replace('#', '')}-${top2.color.replace('#', '')}`;
  // Find second point coordinates from dataPoints to compute directional overlay vector
  const secondPoint = (dataPoints && dataPoints.length) ? (dataPoints.find(p => p.label === top2.label) || dataPoints[1] || dataPoints[0]) : null;
  const sxPercent = secondPoint ? Math.round((secondPoint.x / size) * 100) : 60;
  const syPercent = secondPoint ? Math.round((secondPoint.y / (size + 20)) * 100) : 45;
  // 5 point shared values used for glow pulse only
  const p0 = useSharedValue(0);
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  const p3 = useSharedValue(0);
  const p4 = useSharedValue(0);
  // Chart-level opacity for a subtle fade-in when component mounts
  const chartOpacity = useSharedValue(0);

  useEffect(() => {
    // start repeating glow pulses for each point with small stagger
    // make the bounce a bit faster and smoother and increase scale range for more presence
    p0.value = withDelay(50, withRepeat(withTiming(1, { duration: 700 }), -1, true));
    p1.value = withDelay(110, withRepeat(withTiming(1, { duration: 720 }), -1, true));
    p2.value = withDelay(170, withRepeat(withTiming(1, { duration: 740 }), -1, true));
    p3.value = withDelay(230, withRepeat(withTiming(1, { duration: 760 }), -1, true));
    p4.value = withDelay(290, withRepeat(withTiming(1, { duration: 780 }), -1, true));

  // Fade in chart container slightly after mount for a gentle entrance
  chartOpacity.value = withDelay(40, withTiming(1, { duration: 320 }));

    return () => {
      // stop pulses
      p0.value = 0;
      p1.value = 0;
      p2.value = 0;
      p3.value = 0;
      p4.value = 0;
      chartOpacity.value = 0;
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

  // Animated style for chart container opacity (fade-in)
  const chartAnimStyle = useAnimatedStyle(() => ({ opacity: chartOpacity.value }));

  // Popup state for showing percentage on point tap
  const [popup, setPopup] = useState({ visible: false, x: 0, y: 0, label: '', value: 0, index: -1 });

  // Determine focal point for radial gradient using the highest data point
  const dominantPoint = dataPoints && dataPoints.length ? dataPoints.reduce((a, b) => (b.value > a.value ? b : a), dataPoints[0]) : null;
  const fxPercent = dominantPoint ? Math.round((dominantPoint.x / size) * 100) : 50;
  const fyPercent = dominantPoint ? Math.round((dominantPoint.y / (size + 20)) * 100) : 45;
  // We'll use two localized radial gradients (one for each of the top two categories)
  // radTop1Id and radTop2Id are computed above and will be defined in <Defs>

  return (
    <Pressable onPress={() => setPopup({ visible: false, x: 0, y: 0, label: '', value: 0, index: -1 })}>
      <AnimatedReanimated.View style={[{ width: size, height: size + 20, position: 'relative' }, chartAnimStyle]}>
      <Svg width={size} height={size + 20}>
        <Defs>
          {/* Radial gradient focal point positioned at the dominant category point so color "radiates" from that category */}
          {/* Radial gradient focused on dominant category with a 35/65 handoff to secondary color */}
          {/* Localized radial for the primary top category (dominant) */}
          <RadialGradient id={radTop1Id} cx={`${fxPercent}%`} cy={`${fyPercent}%`} r="78%" fx={`${fxPercent}%`} fy={`${fyPercent}%`}>
            {/* Softer radial palette: reduced opacities and gentler falloff for a calmer visual */}
            <Stop offset="0%" stopColor={top1.color} stopOpacity="0.72" />
            <Stop offset="30%" stopColor={top1.color} stopOpacity="0.42" />
            <Stop offset="60%" stopColor={top1.color} stopOpacity="0.18" />
            <Stop offset="100%" stopColor={top1.color} stopOpacity="0.06" />
          </RadialGradient>

          {/* Localized radial for the secondary top category (runner-up) */}
          <RadialGradient id={radTop2Id} cx={`${sxPercent}%`} cy={`${syPercent}%`} r="78%" fx={`${sxPercent}%`} fy={`${syPercent}%`}>
            {/* Softer secondary radial */}
            <Stop offset="0%" stopColor={top2.color} stopOpacity="0.56" />
            <Stop offset="28%" stopColor={top2.color} stopOpacity="0.36" />
            <Stop offset="62%" stopColor={top2.color} stopOpacity="0.16" />
            <Stop offset="100%" stopColor={top2.color} stopOpacity="0.06" />
          </RadialGradient>
        </Defs>

        {/* Pentagon concentric rings (replace circular grid with polygon rings) */}
        {[...Array(levels)].map((_, i) => {
          const radius = ((i + 1) / levels) * maxRadius;
          const ringPoints = categories.map(cat => ({ x: center + radius * Math.cos(cat.angle), y: center + radius * Math.sin(cat.angle) }));
          const pathD = ringPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';
          const opacity = 0.36 - (i * 0.06);
          const strokeW = i === levels - 1 ? 1.8 : 1.2;
          return (
            <Path
              key={`ring-${i}`}
              d={pathD}
              stroke={gridColor}
              strokeWidth={strokeW}
              fill="none"
              opacity={opacity}
            />
          );
        })}

        {/* Glow path under the main shape for subtle outer glow (use computed glowD) */}
        {glowD && (
          <Path
            d={glowD}
            fill={baseColor}
            // make glow slightly subtler for soft look
            fillOpacity={0.02}
            stroke="none"
          />
        )}

        {/* Draw polygon filled with localized radial for primary category, then overlay secondary radial for dual influence */}
        {pathD && (
          <Path
            d={pathD}
            fill={`url(#${radTop1Id})`}
            // slightly reduce overall fill opacity so gradient looks softer over background
            fillOpacity={0.92}
            stroke={baseColor}
            strokeOpacity={theme && theme.name === 'dark' ? 0.18 : 0.12}
            strokeWidth={1.2}
            strokeLinejoin="miter"
            strokeLinecap="butt"
          />
        )}

        {/* Inverted subtle crescent overlay (mirrored side) to soften hilal effect */}
        {pathD && (
          <Path
            d={pathD}
            fill={`url(#${radTop2Id})`}
            // make overlay subtler so the secondary color reads as soft/pale
            fillOpacity={0.22}
            stroke="none"
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
            {/* Tappable small dot: Pressable so we can show a tiny popup with percentage */}
            <Pressable
              onPress={(e) => {
                e && e.stopPropagation && e.stopPropagation();
                setPopup({ visible: true, x: p.x, y: p.y, label: p.label, value: Math.round(p.value || 0), index: idx });
              }}
              style={{ position: 'absolute', left: p.x - 10, top: p.y - 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}
            >
              <AnimatedReanimated.View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: theme.name === 'dark' ? '#FFF' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: p.color,
                }}
              />
            </Pressable>
          </React.Fragment>
        );
      })}

      {/* Popup showing percentage when a point is tapped */}
      {popup.visible && (
        <View style={{ position: 'absolute', left: Math.max(8, popup.x - 40), top: Math.max(6, popup.y - 48), backgroundColor: theme.name === 'dark' ? '#111' : '#FFF', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: theme.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 }}>
          <Text style={{ fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }}>{popup.label}</Text>
          <Text style={{ fontSize: 12, color: theme.name === 'dark' ? '#BDBDBD' : '#6B7280', marginTop: 2 }}>{popup.value}%</Text>
        </View>
      )}

      {/* Category labels removed as per UX request (static colored headings above chart) */}
      </AnimatedReanimated.View>
    </Pressable>
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
const MoodSummaryBox = ({ categories, theme, t, isLastDay, analysisSnippet, language, explicitMessage, overrideIcon, overrideIconColor, suppressHeader, variant = 'supportive', showLeftAccent = true }) => {
  const dominantCategory = categories.reduce((prev, current) =>
    (current.value > prev.value) ? current : prev
  );
  const cardBg = theme.name === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';
  const borderColor = theme.name === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
  const textPrimary = theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F';
  const textSecondary = theme.name === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)';

  // Gradient background for the summary box - subtle and theme-aware
  // Analysis variant uses a more neutral palette to differentiate visually
  const gradColors = (variant === 'analysis')
    ? (theme.name === 'dark' ? ['rgba(255,255,255,0.012)', 'rgba(255,255,255,0.018)'] : ['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.98)'])
    : (theme.name === 'dark'
      ? ['rgba(255,255,255,0.02)', `${dominantCategory.color}06`]
      : ['rgba(255,255,255,0.9)', `${dominantCategory.color}10`]
    );

  return (
    <LinearGradient colors={gradColors} style={[styles.moodSummaryBox, variant === 'analysis' ? styles.moodSummaryBoxAnalysis : null, { borderColor }]}> 
      {variant === 'analysis' && showLeftAccent ? (
        <View style={[styles.leftAccent, { backgroundColor: dominantCategory.color }]} />
      ) : null}

      <View style={[styles.moodSummaryIconCircle, variant === 'analysis' ? styles.moodSummaryIconCircleAnalysis : null,
        // If suppressHeader is true (AI box), use a neutral background rather than category color
        (suppressHeader
          ? { backgroundColor: theme.name === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.04)' }
          : { backgroundColor: theme.name === 'dark' ? `${dominantCategory.color}12` : `${dominantCategory.color}18` }
        )
      ]}>
        <MaterialIcons 
          name={overrideIcon || dominantCategory.iconName} 
          size={variant === 'analysis' ? 28 : 32} 
          color={overrideIcon ? (overrideIconColor || (theme.name === 'dark' ? '#BDBDBD' : '#6B7280')) : (theme.name === 'dark' ? `${dominantCategory.color}DD` : dominantCategory.color)}
        />
      </View>

      <View style={styles.moodSummaryTextContainer}>
        {
          (() => {
            // Compute the summary text and ensure we never leak raw translation keys.
            const candidate = getMoodSummaryText(categories, isLastDay, t, language);
            const shouldFallback = !candidate || (typeof candidate === 'string' && candidate.indexOf('thisWeek_') !== -1);
            const summaryText = shouldFallback ? buildSafeSummary(categories, isLastDay, language) : candidate;
            return suppressHeader ? null : (
              <Text style={[styles.moodSummaryCategory, { color: textPrimary, fontSize: 14, fontFamily: 'Poppins_600SemiBold' }]}> 
                {summaryText}
              </Text>
            );
          })()
        }
        {/* Message area: use explicitMessage if provided, otherwise show supportive message and optional AI snippet below */}
        {(() => {
          // Replace any visible 'milestone' occurrences again (defensive)
          const replaceMilestone = (txt) => {
            if (!txt || typeof txt !== 'string') return txt;
            try {
              if (language && language.startsWith('tr')) {
                return txt
                  .replace(/\bmilestones\b/gi, 'görevler')
                  .replace(/\bmilestone\b/gi, 'görev')
                  .replace(/\bTasks\b/gi, 'Görevler')
                  .replace(/\bTask\b/gi, 'Görev');
              }
              return txt
                .replace(/\bmilestones\b/gi, 'Tasks')
                .replace(/\bmilestone\b/gi, 'Task')
                .replace(/\bGörevler\b/gi, 'Tasks')
                .replace(/\bGörev\b/gi, 'Task');
            } catch (e) { return txt; }
          };

          const bodyStyle = variant === 'analysis' ? [styles.moodSummaryMessage, styles.moodSummaryMessageAnalysis, { color: textSecondary }] : [styles.moodSummaryMessage, { color: textSecondary }];

          if (explicitMessage) {
            return (
              <Text style={bodyStyle}>
                {replaceMilestone(explicitMessage)}
              </Text>
            );
          }

          const supportive = generateSupportiveMessage(dominantCategory.label, language);
          return (
            <>
              <Text style={bodyStyle}>
                {replaceMilestone(supportive)}
              </Text>
              {/* If AI analysis exists and is meaningfully different, show it below the supportive line */}
              {analysisSnippet && analysisSnippet !== supportive ? (
                <Text style={[bodyStyle, { marginTop: 8 }]}> {replaceMilestone(analysisSnippet)} </Text>
              ) : null}
            </>
          );
        })()}
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
    // Helper: normalize mood key to a canonical lowercase string
    const normalizeMoodKey = (m) => {
      if (!m) return null;
      if (typeof m === 'string') return m.trim().toLowerCase();
      // if mood is an object with key or id
      if (typeof m === 'object') {
        if (m.key) return String(m.key).trim().toLowerCase();
        if (m.name) return String(m.name).trim().toLowerCase();
      }
      return null;
    };

    allTasks.forEach(task => {
      if (task && task.journalEntries && Array.isArray(task.journalEntries)) {
        task.journalEntries.forEach(entry => {
          try {
            const created = entry && entry.createdAt ? new Date(entry.createdAt) : null;
            if (!created || isNaN(created.getTime())) return;
            const rawMood = normalizeMoodKey(entry.mood);
            if (!rawMood) return;
            // Map rawMood to a canonical mood defined in MOODS/EXTENDED_MOODS if possible
            const canonical = (() => {
              const all = [...MOODS, ...EXTENDED_MOODS];
              const found = all.find(m => m.key && String(m.key).toLowerCase() === rawMood) || all.find(m => m.label && String(m.label).toLowerCase() === rawMood);
              return found ? String(found.key).toLowerCase() : rawMood;
            })();

            moodEntries.push({
              mood: canonical,
              createdAt: created,
              taskTitle: task && task.title ? task.title : null,
            });
          } catch (e) {
            // skip malformed entries
          }
        });
      }
    });

    // Sort by date (newest first)
    return moodEntries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [activeTasks, completedTasks]);

  // 5-Category Mood System for Pentagon Chart
  const veryPositiveMoods = ['excited', 'grateful', 'proud', 'motivated'];  // Pozitif (çok iyi)
  const peacefulMoods = ['happy', 'peaceful', 'relieved', 'content', 'calm'];  // Huzurlu
  const balancedMoods = ['hopeful', 'confident', 'curious', 'surprised'];  // Dengeli
  const neutralMoods = ['okay', 'neutral', 'contemplative', 'bored', 'nostalgic'];  // Nötr
  // include 'natural' (present in EXTENDED_MOODS) as neutral synonym
  neutralMoods.push('natural');
  const negativeMoods = ['sad', 'angry', 'anxious', 'overwhelmed', 'tired', 'frustrated', 'stressed', 'exhausted', 'worried', 'disappointed', 'lonely', 'confused'];  // Negatif
  
  // Legacy categories for compatibility
  const positiveMoods = [...veryPositiveMoods, ...peacefulMoods, ...balancedMoods];

  // Last 7 days analysis
  const last7DaysData = useMemo(() => {
    const now = new Date();
    // Define an explicit 7-day window (inclusive of today):
    // start = startOfToday - 6 days, end = startOfTomorrow (non-inclusive)
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const last7DaysStart = new Date(startOfToday);
    last7DaysStart.setDate(startOfToday.getDate() - 6); // include today + previous 6 days => 7 days total
    const last7DaysEnd = new Date(startOfToday);
    last7DaysEnd.setDate(startOfToday.getDate() + 1); // non-inclusive end (start of next day)

    const entries = allMoodData.filter(entry => entry.createdAt >= last7DaysStart && entry.createdAt < last7DaysEnd);
    
    // Count for each of 5 categories
    const veryPositive = entries.filter(e => veryPositiveMoods.includes(String(e.mood).toLowerCase())).length;
    const peaceful = entries.filter(e => peacefulMoods.includes(String(e.mood).toLowerCase())).length;
    const balanced = entries.filter(e => balancedMoods.includes(String(e.mood).toLowerCase())).length;
    const neutral = entries.filter(e => neutralMoods.includes(String(e.mood).toLowerCase())).length;
    const negative = entries.filter(e => negativeMoods.includes(String(e.mood).toLowerCase())).length;

    // Legacy positive count (counts)
    const positive = veryPositive + peaceful + balanced;
    const total = entries.length;

    // Helper to compute percent as float and rounded display percent
    const pct = (n) => ({ raw: total > 0 ? (n / total) : 0, display: total > 0 ? Math.round((n / total) * 100) : 0 });

    const veryPositivePct = pct(veryPositive);
    const peacefulPct = pct(peaceful);
    const balancedPct = pct(balanced);
    const neutralPct = pct(neutral);
    const negativePct = pct(negative);

    // Determine top label (dominant category) prefer counts
    const categoryCounts = [
      { key: 'veryPositive', count: veryPositive, label: t('positive') || 'Positive' },
      { key: 'peaceful', count: peaceful, label: t('peaceful') || 'Peaceful' },
      { key: 'balanced', count: balanced, label: t('balanced') || 'Balanced' },
      { key: 'neutral', count: neutral, label: t('neutral') || 'Neutral' },
      { key: 'negative', count: negative, label: t('negative') || 'Negative' },
    ];
    const topCategory = categoryCounts.sort((a, b) => b.count - a.count)[0] || null;

    // debug logging removed

    return {
      entries,
      positive,
      negative,
      neutral,
      total,
      positivePercent: positive > 0 ? Math.round((positive / total) * 100) : 0,
      negativePercent: negative > 0 ? Math.round((negative / total) * 100) : 0,
      neutralPercent: neutral > 0 ? Math.round((neutral / total) * 100) : 0,
      // 5 categories: provide both raw (0..1) and display (0..100)
      veryPositivePercentRaw: veryPositivePct.raw,
      peacefulPercentRaw: peacefulPct.raw,
      balancedPercentRaw: balancedPct.raw,
      neutralCategoryPercentRaw: neutralPct.raw,
      negativeCategoryPercentRaw: negativePct.raw,
      veryPositivePercent: veryPositivePct.display,
      peacefulPercent: peacefulPct.display,
      balancedPercent: balancedPct.display,
      neutralCategoryPercent: neutralPct.display,
      negativeCategoryPercent: negativePct.display,
      topLabel: topCategory ? topCategory.label : null,
    };
  }, [allMoodData, t, language]);

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
    // Build previous 7-day window that is directly before the last7Days window
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const last7DaysStart = new Date(startOfToday);
    last7DaysStart.setDate(startOfToday.getDate() - 6); // start for the "last 7 days" window

    const previous7DaysStart = new Date(startOfToday);
    previous7DaysStart.setDate(startOfToday.getDate() - 13); // 7 days before last7DaysStart
    const previous7DaysEnd = new Date(last7DaysStart); // non-inclusive end - directly before last7DaysStart

    const entries = allMoodData.filter(entry => 
      entry.createdAt >= previous7DaysStart && entry.createdAt < previous7DaysEnd
    );
    
    const positive = entries.filter(e => positiveMoods.includes(e.mood)).length;
    const negative = entries.filter(e => negativeMoods.includes(e.mood)).length;
    const total = entries.length;

    // debug logging removed

    return {
      total,
      positivePercent: total > 0 ? Math.round((positive / total) * 100) : 0,
      negativePercent: total > 0 ? Math.round((negative / total) * 100) : 0,
      positiveRaw: total > 0 ? (positive / total) : 0,
      negativeRaw: total > 0 ? (negative / total) : 0,
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
    // Compute percent change safely: prefer relative change when previous raw > 0, otherwise use percentage-point difference
    let percentChange = 0;
    try {
      const lastRaw = last7DaysData.total > 0 ? (last7DaysData.positive / last7DaysData.total) : 0;
      const prevRaw = previous7DaysData.total > 0 ? (previous7DaysData.positiveRaw || 0) : 0;
      if (previous7DaysData.total > 0 && prevRaw > 0) {
        percentChange = Math.round(((lastRaw - prevRaw) / prevRaw) * 100);
      } else {
        // fallback to percentage-point difference (easier to interpret)
        percentChange = Math.round((last7DaysData.positivePercent || 0) - (previous7DaysData.positivePercent || 0));
      }
    } catch (e) {
      percentChange = 0;
    }
    
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

    // Determine dominant category from the aggregated weekly percentages
    const categories = [
      { key: 'positive', value: last7DaysData.positivePercent || 0, color: '#16A34A' },
      { key: 'peaceful', value: last7DaysData.peacefulPercent || 0, color: '#06B6D4' },
      { key: 'balanced', value: last7DaysData.balancedPercent || 0, color: '#F59E0B' },
      { key: 'neutral', value: last7DaysData.neutralCategoryPercent || 0, color: '#6B7280' },
      { key: 'negative', value: last7DaysData.negativeCategoryPercent || 0, color: '#EF4444' },
    ];

    const dominant = categories.reduce((max, c) => (c.value > max.value ? c : max), categories[0]);
    return dominant && dominant.value > 0 ? dominant.color : '#8E8E93';
  }, [last7DaysData, getMoodInfo]);

  // Short weekly-style explanation synthesized from aggregated last 7 days data
  const [analysisSnippet, setAnalysisSnippet] = useState(null);
  useEffect(() => {
    // Build a concise, more natural weekly analysis string with varied templates
    try {
      if (!last7DaysData || last7DaysData.total === 0) {
        setAnalysisSnippet(null);
        return;
      }

      const topLabel = last7DaysData.topLabel || (language && language.startsWith('tr') ? t('neutral') : 'Neutral');
      const percent = Math.abs(trendInfo.percentChange || 0);
      const dir = trendInfo.direction || 'stable';

      // Day-based seed so messages vary across days but are stable within a day
      const daySeed = Math.floor(Date.now() / 86400000);
      const pick = (arr) => arr[daySeed % arr.length];

      if (language && language.startsWith('tr')) {
        // Turkish natural templates
        const upHigh = [
          `Bu hafta genelde ${topLabel} hissedildi — geçen haftaya göre belirgin bir iyileşme var (%${percent}). Güzel iş!`,
          `Hafta boyunca çoğunlukla ${topLabel} oldun; özellikle son günlerde ruh halin daha iyi görünüyordu.`
        ];
        const upLow = [
          `Bu hafta çoğunlukla ${topLabel} hissettin; geçen haftaya göre hafif bir düzelme gözlemledik.`,
          `Genel olarak ${topLabel} bir hafta geçirmişsin; küçük bir ilerleme var gibi.`
        ];

        const downHigh = [
          `Bu hafta daha çok ${topLabel} hissettin ve geçen haftaya göre düşüş var (%${percent}). Kendine küçük bir mola ver; yardımcı olabilir.`,
          `Hafta boyunca ${topLabel} anlar daha fazlaydı; geçen haftaya kıyasla ruh halinde belirgin bir azalma var.`
        ];
        const downLow = [
          `Bu hafta çoğunlukla ${topLabel} hissettin; geçen haftaya göre hafif bir düşüş var.`,
          `Biraz daha zor bir hafta olmuş; küçük bir reset (kısa yürüyüş, nefes) yardımcı olabilir.`
        ];

        const stableLow = [
          `Hafta genel olarak dengeliydi; büyük dalgalanmalar yok.`,
          `Bu hafta çoğunlukla aynı ruh hali sürdü; bu da bir istikrar göstergesi.`
        ];
        const stableMed = [
          `Bu hafta çoğunlukla ${topLabel} hissedildi; geçen haftaya göre çok değişmedi.`,
          `Genel olarak benzer bir ruh hali vardı; ufak değişiklikler fark yaratabilir.`
        ];

        let chosen = null;
        if (dir === 'up') chosen = percent >= 20 ? pick(upHigh) : pick(upLow);
        else if (dir === 'down') chosen = percent >= 20 ? pick(downHigh) : pick(downLow);
        else chosen = percent <= 3 ? pick(stableLow) : pick(stableMed);

        setAnalysisSnippet(chosen);
      } else {
        // English natural templates
        const upHigh = [
          `This week was mostly ${topLabel} — there was a clear improvement compared to last week (${percent}%). Great job!`,
          `You felt ${topLabel} through the week; mood looks notably better than last week.`
        ];
        const upLow = [
          `This week leaned ${topLabel}; a small improvement vs. last week.`,
          `Overall ${topLabel} moments this week; slight upward change compared to before.`
        ];

        const downHigh = [
          `This week had more ${topLabel} moments and shows a decline vs last week (${percent}%). Consider a short reset.`,
          `There were more ${topLabel} feelings this week; it's a noticeable dip compared to last week.`
        ];
        const downLow = [
          `This week was mostly ${topLabel}; a slight decline compared to last week.`,
          `A somewhat tougher week — a small break or reset might help.`
        ];

        const stableLow = [
          `The week felt balanced overall; not much change from last week.`,
          `Mostly steady this week — a calm, even-paced period.`
        ];
        const stableMed = [
          `This week was mainly ${topLabel}; not very different from last week.`,
          `Overall similar mood to last week; little changes could shift things.`
        ];

        let chosen = null;
        if (dir === 'improving' || dir === 'up') chosen = percent >= 20 ? pick(upHigh) : pick(upLow);
        else if (dir === 'declining' || dir === 'down') chosen = percent >= 20 ? pick(downHigh) : pick(downLow);
        else chosen = percent <= 3 ? pick(stableLow) : pick(stableMed);

        setAnalysisSnippet(chosen);
      }
    } catch (e) {
      setAnalysisSnippet(null);
    }
  }, [last7DaysData, trendInfo, language, t]);



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
      <View style={[styles.screen, Helpers.container, { backgroundColor: cardBgLocal }]}> 
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
      <View style={[styles.screen, Helpers.container, { backgroundColor: cardBg }]}> 
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
    <View style={[styles.screen, Helpers.container, { backgroundColor: cardBg }]}> 
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
                  // Use combined positive percentage (veryPositive + peaceful + balanced)
                  positive: last7DaysData.positivePercent || 0,
                  peaceful: last7DaysData.peacefulPercent || 0,
                  balanced: last7DaysData.balancedPercent || 0,
                  neutral: last7DaysData.neutralCategoryPercent || 0,
                  negative: last7DaysData.negativeCategoryPercent || 0
                }}
                // Increase chart size: raise max cap and reduce side padding allowance
                size={Math.min(440, width - 24)}
                theme={theme}
              />
            </View>
            
            {/* Mood Summary Boxes: supportive message + AI analysis (each in its own identical card) */}
            <View style={{ marginTop: 0, gap: 4 }}>
                <MoodSummaryBox
                categories={[
                  { label: t('positive') || 'Positive', iconName: 'sentiment-very-satisfied', value: last7DaysData.veryPositivePercent || 0, color: '#16A34A' },
                  { label: t('peaceful') || 'Peaceful', iconName: 'spa', value: last7DaysData.peacefulPercent || 0, color: '#06B6D4' },
                  { label: t('balanced') || 'Balanced', iconName: 'wb-sunny', value: last7DaysData.balancedPercent || 0, color: '#F59E0B' },
                  { label: t('neutral') || 'Neutral', iconName: 'sentiment-neutral', value: last7DaysData.neutralCategoryPercent || 0, color: '#6B7280' },
                  { label: t('negative') || 'Negative', iconName: 'sentiment-dissatisfied', value: last7DaysData.negativeCategoryPercent || 0, color: '#EF4444' },
                ]}
                theme={theme}
                t={t}
                isLastDay={isLastDayOfWeek()}
                language={language}
                  explicitMessage={generateSupportiveMessage((last7DaysData.topLabel || t('positive')), language)}
              />

              {analysisSnippet ? (
                <MoodSummaryBox
                  categories={[
                    { label: t('positive') || 'Positive', iconName: 'sentiment-very-satisfied', value: last7DaysData.veryPositivePercent || 0, color: '#16A34A' },
                    { label: t('peaceful') || 'Peaceful', iconName: 'spa', value: last7DaysData.peacefulPercent || 0, color: '#06B6D4' },
                    { label: t('balanced') || 'Balanced', iconName: 'wb-sunny', value: last7DaysData.balancedPercent || 0, color: '#F59E0B' },
                    { label: t('neutral') || 'Neutral', iconName: 'sentiment-neutral', value: last7DaysData.neutralCategoryPercent || 0, color: '#6B7280' },
                    { label: t('negative') || 'Negative', iconName: 'sentiment-dissatisfied', value: last7DaysData.negativeCategoryPercent || 0, color: '#EF4444' },
                  ]}
                  theme={theme}
                  t={t}
                  isLastDay={isLastDayOfWeek()}
                  language={language}
                  explicitMessage={analysisSnippet}
                  overrideIcon={'insights'}
                  overrideIconColor={'#6B7280'}
                  suppressHeader={true}
                  showLeftAccent={false}
                  variant={'analysis'}
                />
              ) : null}
            </View>
            
          </View>
        )}

        {/* Weekly calendar removed as requested */}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
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
    marginTop: 0,
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
    paddingVertical: 0,
  },
  moodSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
  marginTop: 0,
    borderWidth: 1,
  },

  /* supportiveAccent removed */
  moodSummaryIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  moodSummaryIconCircleAnalysis: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  // Thin left accent bar used for the 'analysis' variant
  leftAccent: {
    width: 6,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    marginRight: 12,
    height: '100%'
  },
  // Slightly different box style for analysis cards
  moodSummaryBoxAnalysis: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  moodSummaryTextContainer: {
    flex: 1,
  },
  moodSummaryMessage: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    marginTop: 6,
    lineHeight: 18,
  },
  moodSummaryMessageAnalysis: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 20,
  },
  moodSummaryTitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 2,
  },
  moodSummaryCategory: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 2,
  },
  moodSummarySubtitle: {
    fontSize: 12,
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
