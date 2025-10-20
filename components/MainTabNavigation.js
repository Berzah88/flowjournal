// components/MainTabNavigation.js
import React, { useRef, useCallback, useEffect } from 'react';
import { View, Animated, PanResponder, Dimensions, Text, TouchableOpacity } from 'react-native';
import AnimatedReanimated, { 
  useAnimatedScrollHandler, 
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { SWIPE_THRESHOLDS } from '../constants';
import StatusTabs from './StatusTabs';
import StatusBarComponent from './StatusBar';
import MyDayScreen from '../screens/MyDayScreen';
import Card from './Card';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

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
  collapseProgress,
  myDayScrollRef,
  activeListScrollRef,
  onOpenCard,
  onAddProject,
}) => {
  // Simplified scroll handler with direct value updates
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      if (!statusTabsOffset || !collapseProgress) return;
      
      const y = event.contentOffset?.y ?? 0;
      const thr = statusTabsOffset.value; // StatusTabs offset'i kullan
      const clamped = Math.max(0, Math.min(y, thr));
      
      const progress = thr > 0 ? clamped / thr : 0;
      collapseProgress.value = progress;
    },
  });

  // Pan animation values
  const panX = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef(0);

  // Memoized animate to page index
  const animateToIndex = useCallback((index) => {
    const target = -index * width;
    panX.stopAnimation();
    try {
      panX.flattenOffset();
    } catch (e) {
      // Ignore errors during cleanup
    }

    Animated.spring(panX, {
      toValue: target,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start(() => {
      offsetRef.current = target;
      setActiveIndex(index);
      panX.setValue(target);
      panX.setOffset(0);
    });
  }, [panX, setActiveIndex]);

  // Sync when activeIndex changes from parent
  useEffect(() => {
    const target = -activeIndex * width;
    if (offsetRef.current !== target) {
      Animated.spring(panX, {
        toValue: target,
        useNativeDriver: true,
        tension: 300,
        friction: 30,
      }).start(() => {
        offsetRef.current = target;
        panX.setValue(target);
        panX.setOffset(0);
      });
    }
  }, [activeIndex, panX]);

  // PanResponder for swipe navigation
  const threshold = width * SWIPE_THRESHOLDS.NAVIGATE;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > SWIPE_THRESHOLDS.PAN_RESPONDER && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onPanResponderGrant: () => {
        panX.stopAnimation();
        panX.setOffset(offsetRef.current);
        panX.setValue(0);
      },
      onPanResponderMove: (_, gesture) => {
        const offset = offsetRef.current;
        const minDx = -width - offset;
        const maxDx = -offset;
        const clampedDx = Math.max(Math.min(gesture.dx, maxDx), minDx);
        panX.setValue(clampedDx);
      },
      onPanResponderRelease: (_, gesture) => {
        try {
          panX.flattenOffset();
        } catch (e) {}
        const currentOffset = offsetRef.current;

        if (gesture.dx <= -threshold && currentOffset === 0) {
          animateToIndex(1);
        } else if (gesture.dx >= threshold && currentOffset === -width) {
          animateToIndex(0);
        } else {
          animateToIndex(currentOffset === 0 ? 0 : 1);
        }
      },
      onPanResponderTerminate: () => {
        animateToIndex(offsetRef.current === 0 ? 0 : 1);
      },
      onShouldBlockNativeResponder: () => false,
    })
  ).current;

  // Tab press handler
  const handleTabPress = useCallback((index) => {
    if (index === activeIndex) return;
    setActiveIndex(index);
    offsetRef.current = -index * width;
    animateToIndex(index);
  }, [activeIndex, animateToIndex, setActiveIndex]);

  // Memoized render functions
  const renderActiveItem = useCallback(({ item }) => (
    <Card
      title={item.title}
      startDate={item.startDate}
      endDate={item.endDate}
      completed={item.done}
      activeMilestones={item.milestones?.filter((m) => !m.completed) ?? []}
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
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.panContainer,
          { width: width * 2, transform: [{ translateX: panX }] },
        ]}
      >
        {/* My Day Screen (left) */}
        <View style={{ width }}>
          <AnimatedReanimated.FlatList
            ref={myDayScrollRef}
            data={[{ key: 'myday' }]}
            keyExtractor={(item) => item.key}
            renderItem={() => (
              <MyDayScreen 
                navigation={navigation}
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
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            onScroll={activeIndex === 0 && statusTabsOffset && collapseProgress ? scrollHandler : undefined}
            scrollEnabled={activeIndex === 0}
            scrollEventThrottle={16}
            removeClippedSubviews={false}
            windowSize={5}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={50}
            initialNumToRender={1}
          />
        </View>

        {/* Active list (right) */}
        <View style={{ width }}>
          <StatusBarComponent activeCount={activeTasks.length} doneCount={completedTasks.length} />
          <AnimatedReanimated.FlatList
            ref={activeListScrollRef}
            data={activeTasksReversed}
            keyExtractor={keyExtractor}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140, paddingTop: 0 }}
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
            onScroll={activeIndex === 1 && statusTabsOffset && collapseProgress ? scrollHandler : undefined}
            scrollEnabled={activeIndex === 1}
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
        </View>
      </Animated.View>
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
