import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useTaskStats } from "../hooks/useTaskContext";
import { FONTS } from "../constants";

export default function StatusBarComponent() {
  const { activeCount, completedCount, daysLeft } = useTaskStats();

  return (
    <View style={styles.container}>
      {/* Active */}
      <View style={styles.item}>
        <Image source={require("../assets/active.png")} style={styles.icon} />
        <View>
          <Text style={styles.number}>{activeCount}</Text>
          <Text style={styles.label}>Active</Text>
        </View>
      </View>

      {/* Days left */}
      <View style={styles.item}>
        <Image source={require("../assets/calendar.png")} style={styles.icon} />
        <View>
          <Text style={styles.number}>{daysLeft}</Text>
          <Text style={styles.label}>days left</Text>
        </View>
      </View>

      {/* Done */}
      <View style={styles.item}>
        <Image source={require("../assets/done.png")} style={styles.icon} />
        <View>
          <Text style={styles.number}>{completedCount}</Text>
          <Text style={styles.label}>Done</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 2,
    marginHorizontal: 20,
    width: "85%",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    width: 22,
    height: 22,
    marginRight: 8,
  },
  number: {
    fontFamily: FONTS.SEMI_BOLD,
    fontSize: 12,
    color: "#585858",
  },
  label: {
    fontFamily: FONTS.REGULAR,
    fontSize: 10,
    color: "#555",
  },
});
