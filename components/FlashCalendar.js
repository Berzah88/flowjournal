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
        <View style={styles.card}>
          <Text style={styles.heading}>Select date range</Text>

          <Calendar
            onDayPress={handleDayPress}
            markedDates={getMarkedDates()}
            markingType={"period"}
            minDate={minDate ? toDateKey(minDate) : undefined}
            theme={{
              backgroundColor: "#f9f7fc",
              calendarBackground: "#f9f7fc",
              textSectionTitleColor: "#8E7DBE",
              selectedDayBackgroundColor: "#8E7DBE",
              selectedDayTextColor: "#fff",
              todayTextColor: "#8E7DBE",
              dayTextColor: "#222",
              textDisabledColor: "#aaa",
              arrowColor: "#8E7DBE",
              monthTextColor: "#505050",
              textMonthFontFamily: "Poppins_700Bold",
              textDayFontFamily: "Poppins_500Medium",
              textDayHeaderFontFamily: "Poppins_600SemiBold",
              textMonthFontSize: 16,
              textDayFontSize: 14,
              textDayHeaderFontSize: 12,
            }}
          />

          <View style={styles.presetsRow}>
            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => {
                const today = new Date();
                const end = new Date();
                end.setDate(today.getDate() + 7);
                setLocalStart(today);
                setLocalEnd(end);
              }}
            >
              <Text style={styles.presetText}>Next 7 days</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => {
                const today = new Date();
                const end = new Date();
                end.setDate(today.getDate() + 30);
                setLocalStart(today);
                setLocalEnd(end);
              }}
            >
              <Text style={styles.presetText}>30 days</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionLeft} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRight} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Confirm</Text>
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
  presetsRow: { flexDirection: "row", justifyContent: "flex-start", marginTop: 10 },
  presetBtn: { backgroundColor: "#F0F0F5", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 8 },
  presetText: { color: "#444", fontSize: 13, fontFamily: "Poppins_500Medium" },
  actionsRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  actionLeft: { paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  actionRight: { backgroundColor: "#8E7DBE", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  cancelText: { color: "#666", fontFamily: "Poppins_600SemiBold" },
  confirmText: { color: "#fff", fontFamily: "Poppins_700Bold" },
});
