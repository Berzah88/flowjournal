// components/MainHeader.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedReanimated, { useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

const MainHeader = ({ 
  theme, 
  headerAnimatedStyle, 
  headerElementsStyle, 
  titleAnimatedStyle, 
  menuButtonStyle,
  logoContainerStyle,
  onMenuPress,
  onLayout,
  // new props: shared values to control header from header-only pan
  globalCollapseProgress,
  globalScrollY,
  statusTabsOffset,
  headerShouldHandle,
}) => {
  // Header gestures removed — header is static. All gesture-driven
  // updates to `globalCollapseProgress` should come from elsewhere if
  // needed. Kept animated styles only.

  // We now react to `headerAnimatedStyle`, `headerElementsStyle`, and
  // `titleAnimatedStyle` supplied by the parent (MainScreen) which are
  // driven by the scroll position. Render as-is.

  return (
    <AnimatedReanimated.View
      style={[headerAnimatedStyle]}
      onLayout={onLayout}
    >
  {/* debug indicator removed */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
                <AnimatedReanimated.View style={headerElementsStyle}>
                  <AnimatedReanimated.View style={[styles.logoContainer, logoContainerStyle]}> 
                    <AnimatedReanimated.Image 
                      source={require('../assets/logo-yeni.png')} 
                      style={styles.logoImage}
                      resizeMode="contain"
                    />
                  </AnimatedReanimated.View>
                </AnimatedReanimated.View>
              <AnimatedReanimated.View style={[styles.headerTextContainer, titleAnimatedStyle]}>
                <AnimatedReanimated.Text style={[styles.header, { color: theme.colors.text }]}>
                  Flow Journal
                </AnimatedReanimated.Text>
              </AnimatedReanimated.View>
            </View>
            <View style={styles.headerActions}>
              <AnimatedReanimated.View style={menuButtonStyle}>
                <TouchableOpacity 
                  style={[
                    styles.menuButton,
                    {
                      backgroundColor: theme.name === 'dark' ? '#FF6B6B' : 'rgba(255, 255, 255, 0.8)',
                      borderColor: theme.name === 'dark' ? '#FF6B6B' : 'rgba(102, 126, 234, 0.15)',
                      shadowColor: theme.name === 'dark' ? '#FF6B6B' : '#667eea',
                    }
                  ]} 
                  onPress={onMenuPress}
                  accessible={true}
                  accessibilityLabel="Menu options"
                  accessibilityRole="button"
                >
                  <Ionicons 
                    name="menu" 
                    size={20} 
                    color={theme.name === 'dark' ? '#FFFFFF' : theme.colors.primary} 
                  />
                </TouchableOpacity>
              </AnimatedReanimated.View>
            </View>
          </View>
        </View>
      </AnimatedReanimated.View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 0,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  marginTop: 6,
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logoContainer: {
    marginRight: 16,
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  header: {
    fontSize: 26,
    fontFamily: "Poppins_700Bold",
    color: "#1a1a1a",
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  // debug styles removed
});

export default MainHeader;

