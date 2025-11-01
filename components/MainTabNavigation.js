// components/MainTabNavigation.js
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, Dimensions, Text, TouchableOpacity } from 'react-native';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
  useDerivedValue,
  useAnimatedReaction,
  useAnimatedProps,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, NativeViewGestureHandler } from 'react-native-gesture-handler';
import { SWIPE_THRESHOLDS } from '../constants';
import StatusTabs from './StatusTabs';
import MyDayScreen from '../screens/MyDayScreen';
import Card from './Card';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Production: no FORCE override for child scrolling.

const MainTabNavigation = ({
  navigation,
  activeIndex,
  setActiveIndex,
  activeTasks,
  completedTasks,
  theme,
  t,
  refreshKey,
  setRefreshKey,
  myDaySelectedCard,
  setMyDaySelectedCard,
  myDaySelectedMilestone,
  setMyDaySelectedMilestone,
  myDayAddMilestoneModalVisible,
  setMyDayAddMilestoneModalVisible,
  myDaySelectedProjectForMilestone,
  setMyDaySelectedProjectForMilestone,
  selectedDate,
  setSelectedDate,
  onMyDayOpenJournal,
  onMyDayAddProject,
  moodHeight,
  statusTabsOffset,
  globalCollapseProgress,
  globalScrollY,
  headerShouldHandle,
  myDayContentScrollHandler,
  activeContentScrollHandler,
  
  parentHandlesVertical,
  onOpenCard,
  onAddProject,
  flatListProps,
  headerFullyCollapsed,
  headerShouldHandleJS,
}) => {
  // scrollHandler kaldırıldı; header çökme kontrolü artık child ScrollView/FlatList
  // (MyDayScreen / Active list) içindeki scroll handler'lar ve header gesture'ları
  // tarafından sürdürülüyor. flatListProps uygulanır.

  // Reanimated translateX for horizontal pan (UI-thread)
  const translateX = useSharedValue(0);
  const offsetRef = useRef(0); // tracks current translate target in JS
  // keep a worklet-safe copy of offset so worklets don't capture JS ref
  const offsetShared = useSharedValue(0);

  // Memoized animate to page index
  const animateToIndex = useCallback((index) => {
    const target = -index * width;
    // animate on UI thread without spring overshoot using timing
    // update worklet-safe offset immediately so worklets can read correct state
    offsetShared.value = target;
    translateX.value = withTiming(target, { duration: 240, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) {
        // sync JS ref/state once animation finished
        runOnJS(setIndexAndOffset)(index, target);
      }
    });
  }, [setActiveIndex, translateX]);

  // Sync when activeIndex changes from parent
  useEffect(() => {
    const target = -activeIndex * width;
    if (offsetRef.current !== target) {
      offsetShared.value = target;
      translateX.value = withTiming(target, { duration: 240, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setIndexAndOffset)(activeIndex, target);
      });
    }
  }, [activeIndex, translateX]);

  // Gesture: single Pan gesture handled on UI thread via react-native-gesture-handler
  const threshold = width * SWIPE_THRESHOLDS.NAVIGATE;
  // shared values to store gesture start state (worklet-safe)
  const gestureStartX = useSharedValue(0);
  const gestureStartProgress = useSharedValue(0);
  // worklet-safe active index so gestures can read which tab is active
  const activeIndexShared = useSharedValue(activeIndex);
  React.useEffect(() => { activeIndexShared.value = activeIndex; }, [activeIndex]);

  // Header eligibility (when the header should handle vertical gestures)
  // is computed centrally in `MainScreen` and passed to the header as
  // `headerShouldHandle`. We keep the horizontal-only gesture here so
  // nested vertical native scrolling can operate without the parent
  // intercepting touches.

  // Refs to native view gesture handlers so parent gesture can be told to
  // wait/fail when native views should win
  const myDayNativeRef = useRef(null);
  const activeNativeRef = useRef(null);

  // JS helper to set index and offset safely from worklets
  const setIndexAndOffset = React.useCallback((index, target) => {
    offsetRef.current = target;
    setActiveIndex(index);
  }, [setActiveIndex]);

  // Horizontal pan gesture (always enabled) for tab swipes
  const horizontalGesture = Gesture.Pan().activeOffsetX([-10, 10])
    .onStart(() => {
      gestureStartX.value = translateX.value;
    })
    .onUpdate((e) => {
      const dx = e.translationX;
      const dy = e.translationY;
      if (Math.abs(dx) > Math.abs(dy)) {
        const offset = gestureStartX.value + dx;
        const clamped = Math.max(Math.min(offset, 0), -width);
        translateX.value = clamped;
      }
    })
    .onEnd((e) => {
      const dx = e.translationX;
      const current = gestureStartX.value + dx;
      if (dx <= -threshold && offsetShared.value === 0) {
        translateX.value = withTiming(-width, { duration: 220, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(setIndexAndOffset)(1, -width);
        });
      } else if (dx >= threshold && offsetShared.value === -width) {
        translateX.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(setIndexAndOffset)(0, 0);
        });
      } else {
        const target = Math.abs(current) > width / 2 ? -width : 0;
        translateX.value = withTiming(target, { duration: 220, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(setIndexAndOffset)(target === 0 ? 0 : 1, target);
        });
      }
    });

  // Horizontal-only pan for tab swipes
  const panGesture = horizontalGesture;
  // Vertical gestures removed — header won't be controlled by parent vertical drags

  // Only use horizontal gestures for tab swipes
  const combinedGesture = horizontalGesture;

  // (debugging reactions removed)

  // If the Gesture API supports requiring external native gestures to fail,
  // instruct the parent gestures to wait for the native view handlers. Use
  // optional chaining in case the method isn't available in this version.
  try {
    // prefer the API method if available
    horizontalGesture.requireExternalGestureToFail?.(myDayNativeRef);
    horizontalGesture.requireExternalGestureToFail?.(activeNativeRef);
    // NOTE: do NOT require the verticalGesture to wait for native view
    // gestures to fail here; that previously made the header unresponsive
    // when touches started inside native lists. We prefer the onStart logic
    // inside the vertical gesture to decide activation based on header state.
  // NOTE: we do NOT require native view gestures to fail for vertical
  // parent gesture here. The parent decides onStart whether it should
  // take ownership (based on headerShouldHandle / active child offset)
  // and activating requireExternalGestureToFail here caused the header
  // to be unresponsive when touches started from inside native lists.
  } catch (e) {
    // ignore if API not present at runtime
  }

  // Active FlatList ref so we can programmatically scroll to end when asked
  const activeListRef = useRef(null);

  // If parent provided a registration callback, register a function that
  // scrolls the active FlatList to the last item. We capture the current
  // tasks array so the scroll index is accurate.

  // animated style for container
  const containerAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  // Tab press handler
  const handleTabPress = useCallback((index) => {
    if (index === activeIndex) return;
    setActiveIndex(index);
    const target = -index * width;
    offsetRef.current = target;
    offsetShared.value = target;
    animateToIndex(index);
  }, [activeIndex, animateToIndex, setActiveIndex]);

  // Memoized render functions
  const renderActiveItem = useCallback(({ item }) => (
    <Card
      title={item.title}
      startDate={item.startDate}
      endDate={item.endDate}
      completed={item.done}
  activeMilestones={(item.milestones && Array.isArray(item.milestones)) ? item.milestones.filter((m) => !m.completed) : []}
      onMilestonePress={() => {
        const projectData = {
          id: 'project-journal',
          title: t('projectJournal'),
          taskId: item.id,
          projectTitle: item.title,
          isProjectBased: true
        };
        setMyDaySelectedMilestone(projectData);
      }}
      onPress={() => onOpenCard(item)}
      style={{ marginBottom: 15 }}
      task={item}
    />
  ), [onOpenCard, t, setMyDaySelectedMilestone]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  // Memoized data arrays
  const activeTasksReversed = React.useMemo(() => {
    return [...activeTasks].reverse();
  }, [activeTasks, refreshKey]);

  return (
    <View style={styles.viewport}>
    <GestureDetector gesture={combinedGesture}>
        <AnimatedReanimated.View
          style={[
            styles.panContainer,
            { width: width * 2 },
            containerAnimatedStyle,
          ]}
        >
        {/* My Day Screen (left) */}
        <View style={{ width, flex: 1 }}>
          <MyDayScreen 
            navigation={navigation}
            headerFullyCollapsed={headerFullyCollapsed}
            headerShouldHandleJS={headerShouldHandleJS}
            parentHandlesVertical={parentHandlesVertical}
            selectedCard={myDaySelectedCard}
            setSelectedCard={setMyDaySelectedCard}
            selectedMilestone={myDaySelectedMilestone}
            setSelectedMilestone={setMyDaySelectedMilestone}
            addMilestoneModalVisible={myDayAddMilestoneModalVisible}
            setAddMilestoneModalVisible={setMyDayAddMilestoneModalVisible}
            selectedProjectForMilestone={myDaySelectedProjectForMilestone}
            setSelectedProjectForMilestone={setMyDaySelectedProjectForMilestone}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onOpenJournal={onMyDayOpenJournal}
            onAddProject={onMyDayAddProject}
            myDayContentScrollHandler={myDayContentScrollHandler}
            
          />
        </View>

        {/* Active list (right) */}
        <View style={{ width }}>
          <NativeViewGestureHandler ref={activeNativeRef}>
  {/* no debug overrides */}
          <AnimatedReanimated.FlatList
            {...(flatListProps || {})}
            ref={activeListRef}
            data={activeTasksReversed}
            keyExtractor={keyExtractor}
            // Add a small top padding so cards are not too close to the StatusTabs
            // Use the same horizontal padding as MyDay's summary container (30) so cards align
            contentContainerStyle={{ paddingHorizontal: 30, paddingBottom: 140, paddingTop: 24 }}
            renderItem={renderActiveItem}
            extraData={refreshKey}
            ListHeaderComponent={null}
            ListEmptyComponent={
              <View style={styles.emptyStateContainer}>
                <View style={[
                  styles.emptyStateCard,
                  {
                    backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#F2F2F7',
                  }
                ]}>
                  <Ionicons 
                    name="rocket-outline" 
                    size={36} 
                    color={theme.name === 'dark' ? '#667eea' : '#8E8E93'} 
                  />
                  <Text style={[
                    styles.emptyStateTitle,
                    { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
                  ]}>{t('noActiveProjects')}</Text>
                  <Text style={[
                    styles.emptyStateSubtitle,
                    { color: theme.name === 'dark' ? '#8E8E93' : '#7f8c8d' }
                  ]}>{t('startYourJourney')}</Text>
                  <TouchableOpacity
                    style={[
                      styles.emptyAddProjectButton,
                      {
                        backgroundColor: theme.name === 'dark' ? '#2C2C2E' : '#F0F8FF',
                        borderColor: theme.name === 'dark' ? '#667eea' : '#667eea',
                      }
                    ]}
                    onPress={onAddProject}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name="add-circle" 
                      size={20} 
                      color={theme.name === 'dark' ? '#667eea' : '#667eea'} 
                    />
                    <Text style={[
                      styles.emptyAddProjectButtonText,
                      { color: theme.name === 'dark' ? '#667eea' : '#667eea' }
                    ]}>{t('addProject')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            }
            showsVerticalScrollIndicator={false}
            onScroll={activeContentScrollHandler}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            scrollEventThrottle={16}
            removeClippedSubviews={false}
            windowSize={5}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={50}
            initialNumToRender={4}
            getItemLayout={(data, index) => ({
              length: 200,
              offset: 200 * index,
              index,
            })}
          />
          </NativeViewGestureHandler>
        </View>
        </AnimatedReanimated.View>
      </GestureDetector>
    </View>
  );
};

const styles = {
  viewport: { 
    flex: 1, 
    overflow: "hidden" 
  },
  panContainer: { 
    flexDirection: "row", 
    flex: 1 
  },
  myDayScrollView: {
    flex: 1,
  },
  myDayScrollContent: {
    paddingBottom: 40,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 30,
  },
  emptyStateCard: {
    borderRadius: 16,
    padding: 32,
    marginTop: 6,
    alignItems: 'center',
    width: '100%',
  },
  emptyStateTitle: {
    fontSize: 20, // 18 → 20 (daha büyük)
    fontFamily: "Poppins_600SemiBold",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 16, // 14 → 16 (daha büyük)
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 22, // 20 → 22 (daha ferah)
    marginBottom: 20,
  },
  emptyAddProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  emptyAddProjectButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    marginLeft: 6,
  },
};

export default MainTabNavigation;
