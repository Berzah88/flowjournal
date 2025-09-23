// components/ActiveTaskMenu.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from "react-native";

export default function ActiveTaskMenu({ visible, onClose, onToggleComplete, onDelete, onEdit, isCompleted }) {
  if (!visible) return null;

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Edit */}
          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              onEdit && onEdit();
              onClose();
            }}
          >
            <Text style={styles.itemText}>Edit</Text>
          </TouchableOpacity>

          {/* Complete / Uncomplete */}
          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              onToggleComplete && onToggleComplete();
              onClose();
            }}
          >
            <Text style={[styles.itemText, isCompleted && styles.uncompleteText]}>
              {isCompleted ? "Mark as Incomplete" : "Complete"}
            </Text>
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              onDelete && onDelete();
              onClose();
            }}
          >
            <Text style={[styles.itemText, styles.deleteText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
  },
  container: {
    position: "absolute",
    top: 20,
    right: 18,
    backgroundColor: "#EEEEEE",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    minWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  item: {
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  itemText: {
    fontSize: 16,
    color: "#222",
    fontFamily: "Poppins_600SemiBold",
  },
  deleteText: { color: "#E74C3C" },
  uncompleteText: { color: "#4A90E2" },
});
