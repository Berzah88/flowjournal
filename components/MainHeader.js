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
  logoTitleContainerStyle,
  onMenuPress,
  onLayout,
  // Optional React element: render StatusTabs inside the header below title
  statusTabs,
  // new props: shared values to control header from header-only pan
  globalCollapseProgress,
  globalScrollY,
  statusTabsOffset,
  headerShouldHandle,
  headerFullyCollapsed,
  statusTabsHeight,
}) => {
  // Header gestures removed — header is static. All gesture-driven
  // updates to `globalCollapseProgress` should come from elsewhere if
  // needed. Kept animated styles only.

  // We now react to `headerAnimatedStyle`, `headerElementsStyle`, and
  // `titleAnimatedStyle` supplied by the parent (MainScreen) which are
  // driven by the scroll position. Render as-is.

  // Animate the visibility of statusTabs based on collapse progress.
  const statusTabsAnimatedStyle = useAnimatedStyle(() => {
    const p = globalCollapseProgress ? globalCollapseProgress.value : 0;
    // translate from below into place as p goes 0 -> 1
    const tabH = (statusTabsHeight && statusTabsHeight.value > 0) ? statusTabsHeight.value : 44;
    const translateY = tabH * (1 - p);
    const opacity = p; // proportional fade while sliding
    return { opacity, transform: [{ translateY }] };
  });

  return (
    <AnimatedReanimated.View
      style={[headerAnimatedStyle]}
      onLayout={onLayout}
    >
  {/* debug indicator removed */}
        <View style={styles.headerContainer}>
          <View style={[styles.headerTop, styles.innerContentOffset]}>
            <AnimatedReanimated.View style={[styles.headerLeft, logoTitleContainerStyle]}>
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
            </AnimatedReanimated.View>
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
          {/* Render status tabs inside header (immediately under logo + title) */}
          {statusTabs ? (
            <AnimatedReanimated.View
              style={[styles.statusTabsContainer, statusTabsAnimatedStyle]}
              pointerEvents={headerFullyCollapsed ? 'auto' : 'none'}
            >
              {statusTabs}
            </AnimatedReanimated.View>
          ) : null}
        </View>
      </AnimatedReanimated.View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginBottom: 0,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 2,
  },

  // Move inner header elements down visually without affecting layout size
  innerContentOffset: {
    transform: [{ translateY: 6 }],
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
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  header: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#1a1a1a",
    letterSpacing: -0.5,
    lineHeight: 28,
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
  statusTabsContainer: {
    marginTop: 0,
    paddingHorizontal: 0,
  },
  // debug styles removed
});

export default MainHeader;

