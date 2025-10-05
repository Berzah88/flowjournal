// components/FlashCalendar.js
import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

const toDateKey = (d) =>
  d ? (d instanceof Date ? d.toISOString().split("T")[0] : new Date(d).toISOString().split("T")[0]) : null;

export default function FlashCalendar({
  visible,
  initialStart, // Date or ISO string (optional)
  initialEnd, // Date or ISO string (optional)
  onConfirm, // ({ startDate: ISOString, endDate: ISOString }) => void
  onCancel, // () => void
  minDate, // Date (optional)
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [localStart, setLocalStart] = useState(initialStart ? new Date(initialStart) : null);
  const [localEnd, setLocalEnd] = useState(initialEnd ? new Date(initialEnd) : null);

  useEffect(() => {
    if (visible) {
      setLocalStart(initialStart ? new Date(initialStart) : null);
      setLocalEnd(initialEnd ? new Date(initialEnd) : null);
    }
  }, [visible, initialStart, initialEnd]);

  // When a day is pressed: if we don't have a start, set it.
  // If we have start but no end, create a range (handles earlier/later selection).
  // If we have both, start a new selection.
  const handleDayPress = (day) => {
    const picked = new Date(day.dateString);
    if (!localStart || (localStart && localEnd)) {
      setLocalStart(picked);
      setLocalEnd(null);
      return;
    }

    // localStart exists and localEnd is null -> make range
    if (picked < localStart) {
      setLocalEnd(localStart);
      setLocalStart(picked);
    } else {
      setLocalEnd(picked);
    }
  };

  const getMarkedDates = () => {
    const marked = {};
    if (!localStart) return marked;

    const sKey = toDateKey(localStart);
    if (localStart && !localEnd) {
      // single selected day
      marked[sKey] = {
        startingDay: true,
        endingDay: true,
        color: "#8E7DBE",
        textColor: "#fff",
      };
      return marked;
    }

    if (localStart && localEnd) {
      const eKey = toDateKey(localEnd);
      // start
      marked[sKey] = { startingDay: true, color: "#8E7DBE", textColor: "#fff" };
      // end
      marked[eKey] = { endingDay: true, color: "#8E7DBE", textColor: "#fff" };

      // in-between days
      const cur = new Date(localStart);
      cur.setDate(cur.getDate() + 1);
      while (cur < localEnd) {
        const k = toDateKey(cur);
        marked[k] = { color: "#d9d4f7", textColor: "#222" };
        cur.setDate(cur.getDate() + 1);
      }
      return marked;
    }
    return marked;
  };

  const handleConfirm = () => {
    if (!localStart) {
      // nothing selected — do nothing
      onCancel && onCancel();
      return;
    }
    const s = localStart;
    const e = localEnd || localStart;
    onConfirm && onConfirm({ startDate: s.toISOString(), endDate: e.toISOString() });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.scrim} />
      </TouchableWithoutFeedback>

      <View style={styles.wrapper} pointerEvents="box-none">
        <View style={[
          styles.card,
          { backgroundColor: theme.name === 'dark' ? '#2C2C2E' : '#FFFFFF' }
        ]}>
          <Text style={[styles.heading, { color: theme.name === 'dark' ? '#FF6B6B' : theme.colors.text }]}>{t('selectDateRange')}</Text>

          <Calendar
            onDayPress={handleDayPress}
            markedDates={getMarkedDates()}
            markingType={"period"}
            minDate={minDate ? toDateKey(minDate) : undefined}
            firstDay={1}
            monthFormat={'MMMM yyyy'}
            hideExtraDays={true}
            disableMonthChange={false}
            enableSwipeMonths={true}
            theme={{
              backgroundColor: theme.name === 'dark' ? '#2C2C2E' : '#f9f7fc',
              calendarBackground: theme.name === 'dark' ? '#2C2C2E' : '#f9f7fc',
              textSectionTitleColor: theme.name === 'dark' ? '#FF6B6B' : '#8E7DBE',
              selectedDayBackgroundColor: theme.name === 'dark' ? '#FF6B6B' : '#8E7DBE',
              selectedDayTextColor: "#fff",
              todayTextColor: theme.name === 'dark' ? '#FF6B6B' : '#8E7DBE',
              dayTextColor: theme.name === 'dark' ? '#FFFFFF' : '#222',
              textDisabledColor: theme.name === 'dark' ? '#8E8E93' : '#aaa',
              arrowColor: theme.name === 'dark' ? '#FF6B6B' : '#8E7DBE',
              monthTextColor: theme.name === 'dark' ? '#FFFFFF' : '#505050',
              textMonthFontFamily: "Poppins_700Bold",
              textDayFontFamily: "Poppins_500Medium",
              textDayHeaderFontFamily: "Poppins_600SemiBold",
              textMonthFontSize: 16,
              textDayFontSize: 14,
              textDayHeaderFontSize: 12,
            }}
          />

          {/* Seçim durumu göstergesi */}
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, { color: theme.name === 'dark' ? '#8E8E93' : '#666' }]}>
              {!localStart ? t('selectStartDate') : 
               !localEnd ? t('selectEndDate') : 
               t('dateRangeSelected')}
            </Text>
            {localStart && (
              <TouchableOpacity 
                style={[
                  styles.clearBtn,
                  { backgroundColor: theme.name === 'dark' ? 'rgba(255, 107, 107, 0.2)' : 'rgba(108, 99, 255, 0.1)' }
                ]}
                onPress={() => {
                  setLocalStart(null);
                  setLocalEnd(null);
                }}
              >
                <Text style={[styles.clearText, { color: theme.name === 'dark' ? '#FF6B6B' : '#6C63FF' }]}>{t('clear')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.presetsRow}>
            <TouchableOpacity
              style={[
                styles.presetBtn,
                { backgroundColor: theme.name === 'dark' ? 'rgba(255, 107, 107, 0.2)' : 'rgba(108, 99, 255, 0.1)' }
              ]}
              onPress={() => {
                const today = new Date();
                const end = new Date();
                end.setDate(today.getDate() + 7);
                setLocalStart(today);
                setLocalEnd(end);
              }}
            >
                <Text style={[styles.presetText, { color: theme.name === 'dark' ? '#FF6B6B' : '#6C63FF' }]}>1 {t('week')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetBtn,
                { backgroundColor: theme.name === 'dark' ? 'rgba(255, 107, 107, 0.2)' : 'rgba(108, 99, 255, 0.1)' }
              ]}
              onPress={() => {
                const today = new Date();
                const end = new Date();
                end.setDate(today.getDate() + 14);
                setLocalStart(today);
                setLocalEnd(end);
              }}
            >
                <Text style={[styles.presetText, { color: theme.name === 'dark' ? '#FF6B6B' : '#6C63FF' }]}>2 {t('weeks')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetBtn,
                { backgroundColor: theme.name === 'dark' ? 'rgba(255, 107, 107, 0.2)' : 'rgba(108, 99, 255, 0.1)' }
              ]}
              onPress={() => {
                const today = new Date();
                const end = new Date();
                end.setDate(today.getDate() + 30);
                setLocalStart(today);
                setLocalEnd(end);
              }}
            >
                <Text style={[styles.presetText, { color: theme.name === 'dark' ? '#FF6B6B' : '#6C63FF' }]}>1 {t('month')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetBtn,
                { backgroundColor: theme.name === 'dark' ? 'rgba(255, 107, 107, 0.2)' : 'rgba(108, 99, 255, 0.1)' }
              ]}
              onPress={() => {
                const today = new Date();
                const end = new Date();
                end.setDate(today.getDate() + 90);
                setLocalStart(today);
                setLocalEnd(end);
              }}
            >
                <Text style={[styles.presetText, { color: theme.name === 'dark' ? '#FF6B6B' : '#6C63FF' }]}>3 {t('months')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionLeft} onPress={onCancel}>
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRight} onPress={handleConfirm}>
              <Text style={styles.confirmText}>{t('confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  wrapper: {
    position: "absolute",
    left: 18,
    right: 18,
    top: Platform.OS === "ios" ? "24%" : "22%",
    alignItems: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  heading: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#222", marginBottom: 8, textAlign: "left" },
  statusContainer: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginTop: 8, 
    marginBottom: 4 
  },
  statusText: { 
    fontSize: 14, 
    fontFamily: "Poppins_500Medium", 
    color: "#666" 
  },
  clearBtn: { 
    backgroundColor: "#FFE5E5", 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6 
  },
  clearText: { 
    color: "#E53E3E", 
    fontSize: 12, 
    fontFamily: "Poppins_500Medium" 
  },
  presetsRow: { flexDirection: "row", justifyContent: "flex-start", marginTop: 10, flexWrap: "wrap" },
  presetBtn: { backgroundColor: "#F0F0F5", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 8, marginBottom: 6 },
  presetText: { color: "#444", fontSize: 13, fontFamily: "Poppins_500Medium" },
  actionsRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  actionLeft: { paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  actionRight: { backgroundColor: "#8E7DBE", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  cancelText: { color: "#666", fontFamily: "Poppins_600SemiBold" },
  confirmText: { color: "#fff", fontFamily: "Poppins_700Bold" },
});
