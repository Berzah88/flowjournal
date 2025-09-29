import React, { useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Animated, 
  Dimensions,
  SafeAreaView,
  StatusBar 
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { FONTS, COLORS, SPACING, BORDER_RADIUS, ANIMATION_DURATIONS } from "../constants";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered entrance animations
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_DURATIONS.SLOW,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_DURATIONS.SLOW,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: ANIMATION_DURATIONS.SLOW,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleStart = () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation?.replace("Tutorial");
    });
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={[
          "#FAFAFA", 
          "#F5F3FF", 
          "#EDE9FE", 
          "#DDD6FE", 
          "#C4B5FD", 
          "#A78BFA", 
          "#8B5CF6"
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Background Elements */}
        <View style={styles.backgroundElements}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />
        </View>

        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Image
              source={require("../assets/Logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>Flow Journal</Text>
          </View>


          {/* Description and CTA Section */}
          <Animated.View 
            style={[
              styles.ctaSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={styles.subtitle}>
              Track your projects while recording your emotions. Flow Journal allows you to track your projects along with your personal experiences.
            </Text>

            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStart}
              accessible={true}
              accessibilityLabel="Start the app"
              accessibilityHint="Goes to main screen"
              accessibilityRole="button"
            >
              <Animated.View 
                style={[
                  styles.buttonContent,
                  { transform: [{ scale: buttonScaleAnim }] }
                ]}
              >
                <LinearGradient
                  colors={[COLORS.WHITE, "#F8F9FA"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.PRIMARY} style={styles.buttonIcon} />
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#8B5CF6",
  },
  container: {
    flex: 1,
    width: "100%",
  },
  backgroundElements: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  circle: {
    position: "absolute",
    backgroundColor: "rgba(139, 92, 246, 0.08)",
    borderRadius: 999,
  },
  circle1: {
    width: 200,
    height: 200,
    top: -100,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -75,
  },
  circle3: {
    width: 100,
    height: 100,
    top: height * 0.3,
    right: 20,
  },
  content: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: SPACING.XL,
    paddingTop: SPACING.XXL,
    paddingBottom: SPACING.XL,
    zIndex: 1,
  },
  logoSection: {
    alignItems: "center",
    marginTop: SPACING.XXL * 1.5,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: SPACING.LG,
  },
  appName: {
    fontSize: 32,
    fontFamily: FONTS.BOLD,
    color: "#6B46C1",
    textAlign: "center",
    marginBottom: SPACING.SM,
    letterSpacing: -0.5,
  },
  ctaSection: {
    width: "100%",
    alignItems: "center",
    marginTop: SPACING.XXL,
  },
  startButton: {
    width: "100%",
    marginBottom: SPACING.LG,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonContent: {
    borderRadius: BORDER_RADIUS.XL,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.LG,
    paddingHorizontal: SPACING.XL,
    minHeight: 56,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: FONTS.BOLD,
    color: COLORS.PRIMARY,
    marginRight: SPACING.SM,
    letterSpacing: -0.3,
  },
  buttonIcon: {
    marginLeft: SPACING.XS,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONTS.REGULAR,
    color: "rgba(107, 70, 193, 0.7)",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: SPACING.XXL,
  },
});
