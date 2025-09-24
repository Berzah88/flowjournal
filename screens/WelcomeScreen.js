import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FONTS, COLORS } from "../constants";

export default function WelcomeScreen({ navigation }) {
  const handleStart = () => {
    navigation?.replace("Main");
  };

  return (
    <LinearGradient
      colors={[COLORS.WHITE, "#151152"]}
      start={{ x: -1.3, y: 0.2 }}
      end={{ x: 0.3, y: 0.8 }}
      style={styles.container}
    >
      <Image
        source={require("../assets/illustration.png")}
        style={styles.illustration}
        resizeMode="contain"
      />
      
      <Text style={styles.title}>Flow Journal</Text>
      
      <Text style={styles.subtitle}>
        Projelerinizi takip ederken, duygularınızı da kaydedin. Flow Jurnal, projelerinizi kişisel deneyimlerinizle birlikte takip etmenizi sağlar.
      </Text>
      
      <TouchableOpacity
        style={styles.button}
        onPress={handleStart}
        accessible={true}
        accessibilityLabel="Start using the app"
        accessibilityHint="Opens the main screen"
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Başlayın</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  illustration: {
    width: "100%",
    height: 250,
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontFamily: FONTS.SEMI_BOLD,
    color: COLORS.WHITE,
    textAlign: "center",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.REGULAR,
    color: "#f5f5f5",
    textAlign: "center",
    marginBottom: 50,
    lineHeight: 24,
  },
  button: {
    backgroundColor: "#427D56",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    minHeight: 48, // Accessibility için minimum touch target
  },
  buttonText: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontFamily: FONTS.SEMI_BOLD,
  },
});
