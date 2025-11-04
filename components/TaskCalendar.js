import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMilestoneColor } from '../utils/milestoneColors';
import { FONTS } from '../constants';

function TaskCalendar({
  currentMonth,
  setCurrentMonth,
  selectedDate,
  startDate,
  endDate,
  onDayPress,
  onDayLongPress,
  language,
  t,
  theme,
  existingTasks,
  editingTask,
  project,
}) {
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatMonthYear = (date) => {
    const locale = language === 'tr' ? 'tr-TR' : (language || 'en-US');
    try {
      return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    } catch (e) {
      return date.toLocaleString();
    }
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const isDateInRange = (date, start, end) => {
    if (!start || !end) return false;
    const startTime = start.getTime();
    const endTime = end.getTime();
    const dateTime = date.getTime();
    return dateTime >= startTime && dateTime <= endTime;
  };

  // Precompute a map of dayKey -> [colors] for the current month to avoid
  // scanning all tasks for every rendered day cell. This reduces O(days * tasks)
  // work per render to roughly O(tasks + coveredDays).
  const milestoneMap = useMemo(() => {
    const map = Object.create(null);
    if (!project) return map; // keep existing behavior
    if (!existingTasks || existingTasks.length === 0) return map;

    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    monthStart.setHours(0,0,0,0);
    monthEnd.setHours(23,59,59,999);

    existingTasks.forEach((task) => {
      if (editingTask && task.id === editingTask.id) return;
      if (!task.startDate || !task.endDate) return;
      if (task.completed) return;

      const taskStart = new Date(task.startDate);
      const taskEnd = new Date(task.endDate);
      taskStart.setHours(0,0,0,0);
      taskEnd.setHours(23,59,59,999);

      // compute overlap of task with current month
      const overlapStart = taskStart > monthStart ? taskStart : monthStart;
      const overlapEnd = taskEnd < monthEnd ? taskEnd : monthEnd;
      if (overlapEnd < overlapStart) return;

      const color = getMilestoneColor(task, theme.name === 'dark' ? 'dark' : 'light');

      // iterate days in overlap and push color into map keyed by YYYY-MM-DD
      for (let d = new Date(overlapStart); d <= overlapEnd; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0,10);
        if (!map[key]) map[key] = [];
        map[key].push(color);
      }
    });

    return map;
  }, [existingTasks, editingTask, currentMonth, project, theme && theme.name]);

  const getMilestonesForDate = useCallback((date) => {
    if (!date) return [];
    const key = date.toISOString().slice(0,10);
    return milestoneMap[key] || [];
  }, [milestoneMap]);

  // Build calendar cells
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const weekStart = language && language.startsWith('tr') ? 1 : 0;
    const jsFirstDay = getFirstDayOfMonth(currentMonth);
    const firstDay = (jsFirstDay - weekStart + 7) % 7;

    // build cells and weeks deterministically
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    return weeks.map((week, wi) => (
      <View key={`week-${wi}`} style={{ flexDirection: 'row', width: '100%' }}>
        {week.map((cell, ci) => {
          if (cell === null) return <View key={`empty-${wi}-${ci}`} style={styles.calendarDay} />;

          const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), cell);
          const isSelected = isSameDay(dayDate, selectedDate);
          const isToday = isSameDay(dayDate, new Date());
          const isStartDate = startDate && isSameDay(dayDate, startDate);
          const isEndDate = endDate && isSameDay(dayDate, endDate);
          const isInRange = isDateInRange(dayDate, startDate, endDate);
          const dayMilestones = getMilestonesForDate(dayDate);

          return (
            <TouchableOpacity
              key={`day-${wi}-${ci}`}
              style={[
                styles.calendarDay,
                isSelected && !startDate && !endDate && styles.selectedDay,
                isToday && !isSelected && !isInRange && styles.todayDay,
                isStartDate && styles.rangeStartDay,
                isEndDate && styles.rangeEndDay,
                isInRange && !isStartDate && !isEndDate && styles.rangeDay,
              ]}
              onPress={() => onDayPress(dayDate)}
              onLongPress={() => onDayLongPress(dayDate)}
              delayLongPress={500}
            >
              <Text style={[
                styles.dayText,
                isSelected && !startDate && !endDate && styles.selectedDayText,
                isToday && !isSelected && !isInRange && styles.todayDayText,
                (isStartDate || isEndDate) && styles.rangeEndDayText,
                isInRange && !isStartDate && !isEndDate && styles.rangeDayText,
              ]}>{cell}</Text>

              {dayMilestones && dayMilestones.length > 0 && (() => {
                const MAX_DOTS = 2;
                if (dayMilestones.length > MAX_DOTS) {
                  return (
                    <View style={styles.milestoneDotsRow} pointerEvents="none">
                      <View style={[styles.milestoneDotMore, { backgroundColor: theme.name === 'dark' ? '#3A3A3C' : '#E6E7EB' }]}>
                        <Text style={[styles.milestoneDotMoreText, { color: theme.name === 'dark' ? '#FFF' : '#111' }]}>{`+${dayMilestones.length}`}</Text>
                      </View>
                    </View>
                  );
                }

                return (
                  <View style={styles.milestoneDotsRow} pointerEvents="none">
                    {dayMilestones.map((c, idx) => (
                      <View key={`dot-${wi}-${ci}-${idx}`} style={[styles.milestoneDot, { backgroundColor: c }]} />
                    ))}
                  </View>
                );
              })()}
            </TouchableOpacity>
          );
        })}
      </View>
    ));
  };

  return (
    <View style={styles.calendarContainerFull}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigateMonth(-1)}>
          <Ionicons name="chevron-back" size={20} color={theme.name === 'dark' ? '#8E8E93' : '#7f8c8d'} />
        </TouchableOpacity>

        <Text style={[styles.monthYearText, { color: theme.text }]}>{formatMonthYear(currentMonth)}</Text>

        <TouchableOpacity style={styles.navButton} onPress={() => navigateMonth(1)}>
          <Ionicons name="chevron-forward" size={20} color={theme.name === 'dark' ? '#8E8E93' : '#7f8c8d'} />
        </TouchableOpacity>
      </View>

      <View style={styles.dayHeaders}>
        {t('dayAbbreviations').map(day => (
          <Text key={day} style={[styles.dayHeaderText, { color: theme.name === 'dark' ? '#8E8E93' : '#666' }]}>{day}</Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {renderCalendar()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendarContainerFull: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: 14,
    fontFamily: FONTS.MEDIUM,
    color: '#1a1a1a',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeaderText: {
    flex: 1,
    maxWidth: `${100/7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: FONTS.REGULAR,
    color: '#7f8c8d',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    justifyContent: 'space-between',
    width: '100%',
  },
  calendarDay: {
    width: `${100/7 - 1}%`,
    aspectRatio: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 4,
    paddingTop: 6,
    paddingBottom: 20,
    position: 'relative',
  },
  selectedDay: {
    backgroundColor: '#5AC8FA',
    borderRadius: 16,
  },
  todayDay: {
    backgroundColor: 'rgba(90, 200, 250, 0.3)',
    borderRadius: 16,
  },
  dayText: {
    fontSize: 13,
    fontFamily: FONTS.REGULAR,
    color: '#1a1a1a',
  },
  selectedDayText: {
    color: '#fff',
    fontFamily: FONTS.MEDIUM,
  },
  todayDayText: {
    color: '#5AC8FA',
    fontFamily: FONTS.MEDIUM,
  },
  rangeStartDay: {
    backgroundColor: '#5AC8FA',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  rangeEndDay: {
    backgroundColor: '#5AC8FA',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  rangeDay: {
    backgroundColor: 'rgba(90, 200, 250, 0.3)',
    borderRadius: 0,
  },
  rangeEndDayText: {
    color: '#fff',
    fontFamily: FONTS.MEDIUM,
  },
  rangeDayText: {
    color: '#5AC8FA',
    fontFamily: FONTS.MEDIUM,
  },
  milestoneDotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  milestoneDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  milestoneDotMore: {
    minWidth: 16,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    paddingHorizontal: 3,
  },
  milestoneDotMoreText: {
    fontSize: 8,
    fontFamily: FONTS.SEMI_BOLD,
  },
});

export default React.memo(TaskCalendar);
