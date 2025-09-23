import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function WelcomeScreen({ navigation }) {
  
  const handleStart = () => {
    if (navigation && navigation.replace) {
      navigation.replace("Main");
    } else {
    }
  };

  
  try {
    return (
      <LinearGradient
        colors={["#FFFFFF", "#151152"]}
        start={{ x: -1.3, y: 0.2 }}
        end={{ x: 0.3, y: 0.8 }}
        style={styles.container}
      >
        {(() => {
          try {
            return (
              <Image
                source={require("../assets/illustration.png")}
                style={styles.illustration}
                resizeMode="contain"
              />
            );
          } catch (imageError) {
            console.error("WelcomeScreen: Image error:", imageError);
            return <Text style={styles.title}>Image Error</Text>;
          }
        })()}

        {(() => {
          try {
            return (
              <>
                {(() => {
                  try {
                    // Font family safety check
                    const safeTitleStyle = {
                      ...styles.title,
                      fontFamily: undefined // Remove font family to prevent crash
                    };
                    return <Text style={safeTitleStyle}>Flow Journal</Text>;
                  } catch (titleError) {
                    console.error("WelcomeScreen: Title error:", titleError);
                    return <Text>Flow Journal</Text>;
                  }
                })()}

                {(() => {
                  try {
                    // Font family safety check
                    const safeSubtitleStyle = {
                      ...styles.subtitle,
                      fontFamily: undefined // Remove font family to prevent crash
                    };
                    return (
                      <Text style={safeSubtitleStyle}>
                        Projelerinizi takip ederken, duygularınızı da kaydedin. Flow Jurnal, projelerinizi kişisel deneyimlerinizle birlikte takip etmenizi sağlar.
                      </Text>
                    );
                  } catch (subtitleError) {
                    console.error("WelcomeScreen: Subtitle error:", subtitleError);
                    return <Text>Projelerinizi takip ederken, duygularınızı da kaydedin.</Text>;
                  }
                })()}

                {(() => {
                  try {
                    return (
                      <TouchableOpacity
                        style={styles.button}
                        onPress={handleStart}
                      >
                        {(() => {
                          try {
                            // Font family safety check
                            const safeButtonTextStyle = {
                              ...styles.buttonText,
                              fontFamily: undefined // Remove font family to prevent crash
                            };
                            return <Text style={safeButtonTextStyle}>Başlayın</Text>;
                          } catch (buttonTextError) {
                            console.error("WelcomeScreen: Button text error:", buttonTextError);
                            return <Text>Başlayın</Text>;
                          }
                        })()}
                      </TouchableOpacity>
                    );
                  } catch (buttonError) {
                    console.error("WelcomeScreen: Button error:", buttonError);
                    return (
                      <TouchableOpacity onPress={handleStart}>
                        <Text>Başlayın</Text>
                      </TouchableOpacity>
                    );
                  }
                })()}
              </>
            );
          } catch (textComponentsError) {
            console.error("WelcomeScreen: Text components error:", textComponentsError);
            return (
              <View>
                <Text>Flow Journal</Text>
                <TouchableOpacity onPress={handleStart}>
                  <Text>Başlayın</Text>
                </TouchableOpacity>
              </View>
            );
          }
        })()}
      </LinearGradient>
    );
  } catch (renderError) {
    console.error("WelcomeScreen: Render error:", renderError);
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome Screen Error</Text>
        <TouchableOpacity style={styles.button} onPress={handleStart}>
          <Text style={styles.buttonText}>Başlayın</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logo: {
    right: 100,
    marginBottom: 10,
  },
  illustration: {
    width: "100%",
    height: 250,
    bottom: 5,
  },
  title: {
    fontSize: 30,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
    textAlign: "center",
    top: 2,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#f5f5f5",
    textAlign: "center",
    marginBottom: 50,
  },
  button: {
    backgroundColor: "#427D56",
    bottom: 0,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
  },
});
