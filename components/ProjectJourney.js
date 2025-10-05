// components/ProjectJourney.js
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useTaskActions } from '../hooks/useTaskContext';
import JournalCard from './JournalCard';
import { FONTS, SPACING, BORDER_RADIUS, COLORS } from '../constants';

const { width } = Dimensions.get('window');

export default function ProjectJourney({ 
  currentTask, 
  onOpenJournal,
  navigation,
  availableMilestones = [], // Mevcut milestone'ları al
  refreshKey = 0 // Refresh trigger
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { addProjectJournalEntry } = useTaskActions();


  // Get all journal entries (only project-based system)
  const getAllJournalEntries = useMemo(() => {
    if (!currentTask?.journalEntries) return [];
    
    
    // Sort by date (newest first)
    return currentTask.journalEntries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [currentTask, refreshKey]); // refreshKey dependency eklendi


  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups = {};
    getAllJournalEntries.forEach(entry => {
      const date = new Date(entry.createdAt);
      const dateKey = date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });
    
    return Object.keys(groups)
      .sort((a, b) => {
        const dateA = new Date(groups[a][0].createdAt);
        const dateB = new Date(groups[b][0].createdAt);
        return dateB - dateA;
      })
      .map(dateKey => ({
        date: dateKey,
        entries: groups[dateKey]
      }));
  }, [getAllJournalEntries, refreshKey]); // refreshKey dependency eklendi


  const renderDateGroup = (dateGroup) => {
    // Convert to JournalCard format
    const journalCardData = {
      date: dateGroup.date,
      allEntries: dateGroup.entries.map(entry => ({
        ...entry,
        milestoneTitle: entry.originalMilestoneTitle || entry.milestoneTitle || 'General Entry',
        milestoneId: entry.originalMilestoneId || entry.milestoneId,
      }))
    };
    

    return (
      <JournalCard
        key={`${dateGroup.date}-${refreshKey}`} // RefreshKey ile unique key
        dayGroup={journalCardData}
        navigation={navigation}
        taskId={currentTask?.id}
        milestoneId={null} // Project-based, no specific milestone
        isCompleted={false}
        availableMilestones={availableMilestones} // AI analizi için milestone'ları geç
        refreshKey={refreshKey} // Refresh trigger
        onPress={() => {
          // Open the first entry for editing, or create new if no entries
          if (dateGroup.entries.length > 0) {
            onOpenJournal && onOpenJournal(dateGroup.entries[0]);
          } else {
            onOpenJournal && onOpenJournal(null);
          }
        }}
      />
    );
  };

  return (
    <View style={[
      styles.container,
      { backgroundColor: theme.name === 'dark' ? '#1A1A1C' : '#FFFFFF' }
    ]}>
      {/* Header */}
      <View style={[
        styles.header,
        { 
          backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(248, 251, 255, 0.5)',
          borderBottomColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
        }
      ]}>
        <View style={styles.headerContent}>
          <Text style={[
            styles.headerTitle,
            { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
          ]}>
            Project Journey
          </Text>
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: 'rgba(0, 122, 255, 0.08)' }
            ]}
            onPress={() => onOpenJournal && onOpenJournal(null)}
          >
            <Ionicons name="add" size={16} color={theme.name === 'dark' ? '#FFFFFF' : '#007AFF'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {groupedEntries.length > 0 ? (
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
        >
          {groupedEntries.map(renderDateGroup)}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons 
            name="book-outline" 
            size={48} 
            color={theme.name === 'dark' ? '#8E8E93' : '#8E8E93'} 
          />
          <Text style={[
            styles.emptyTitle,
            { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
          ]}>
            No journal entries yet
          </Text>
          <Text style={[
            styles.emptySubtitle,
            { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
          ]}>
            Start documenting your project journey
          </Text>
          <TouchableOpacity
            style={[
              styles.startButton,
              { backgroundColor: theme.colors.primary }
            ]}
            onPress={() => onOpenJournal && onOpenJournal(null)}
          >
            <Text style={styles.startButtonText}>Start Writing</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 12, // 16'dan 12'ye düşürüldü
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, // 16'dan 8'e düşürüldü
  },
  headerTitle: {
    fontSize: 16, // 18'den 16'ya düşürüldü
    fontFamily: FONTS.SEMI_BOLD,
    letterSpacing: -0.5,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.15)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
    paddingHorizontal: 16, // Yan boşlukları artır
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 16,
    fontFamily: FONTS.SEMI_BOLD,
    marginBottom: 12,
    marginHorizontal: 24,
    letterSpacing: -0.3,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.SEMI_BOLD,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: FONTS.REGULAR,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  startButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startButtonText: {
    fontSize: 14,
    fontFamily: FONTS.MEDIUM,
    color: '#FFFFFF',
  },
});
