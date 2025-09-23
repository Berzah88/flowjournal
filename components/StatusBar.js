import React, { useContext } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { TaskContext } from "../context/TaskContext";

export default function StatusBarComponent() {
  const { tasks } = useContext(TaskContext);

  // "done" alanına göre sayıları alıyoruz
  const activeTasks = tasks.filter(task => !task.done).length;
  const doneTasks = tasks.filter(task => task.done).length;

  // En uzun deadline ile bugünden kalan gün sayısı
  const today = new Date();
  let daysLeft = 0;
  const activeDeadlines = tasks
    .filter(task => !task.done) // sadece aktif projeler
    .map(task => {
      const diffTime = new Date(task.endDate) - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    });

  if (activeDeadlines.length > 0) {
    daysLeft = Math.max(...activeDeadlines);
  }

  return (
    <View style={styles.container}>
      {/* Active */}
      <View style={styles.item}>
        <Image source={require("../assets/active.png")} style={styles.icon} />
        <View>
          <Text style={styles.number}>{activeTasks}</Text>
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
          <Text style={styles.number}>{doneTasks}</Text>
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
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#585858",
  },
  label: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: "#555",
  },
});
