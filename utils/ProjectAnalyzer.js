// utils/ProjectAnalyzer.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class ProjectAnalyzer {
  constructor() {
    this.confidenceThreshold = 0.4; // Minimum confidence to show feedback
    this.dailyDisplayKey = 'project_analyzer_daily_display';
  }

  /**
   * Check if analysis should be shown today (once per day)
   * @returns {boolean} Whether analysis should be displayed
   */
  async shouldShowToday() {
    try {
      const today = new Date().toDateString(); // YYYY-MM-DD format
      const lastDisplayDate = await AsyncStorage.getItem(this.dailyDisplayKey);
      
      if (lastDisplayDate !== today) {
        // First time today or new day - should show
        await AsyncStorage.setItem(this.dailyDisplayKey, today);
        return true;
      }
      
      return false; // Already shown today
    } catch (error) {
      console.warn('Failed to check daily display status:', error);
      return true; // Default to showing if error
    }
  }

  /**
   * Mark analysis as shown for today
   */
  async markAsShownToday() {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem(this.dailyDisplayKey, today);
    } catch (error) {
      console.warn('Failed to mark analysis as shown:', error);
    }
  }

  /**
   * Analyze all projects and generate comprehensive feedback
   * @param {Array} activeProjects - Active projects with milestones and journal entries
   * @param {Array} completedProjects - Recently completed projects
   * @param {boolean} forceShow - Force display even if already shown today
   * @returns {Object} Analysis result with feedback and confidence
   */
  async analyzeProjects(activeProjects = [], completedProjects = [], forceShow = false) {
    try {
      // Check if we should show today (unless forced)
      if (!forceShow) {
        const shouldShow = await this.shouldShowToday();
        if (!shouldShow) {
          return {
            shouldShow: false,
            reason: 'already_shown_today',
            confidence: 0,
            feedback: null
          };
        }
      }

      // Basic validation
      if (!activeProjects || activeProjects.length === 0) {
        return {
          shouldShow: false,
          reason: 'no_projects',
          confidence: 0,
          feedback: null
        };
      }

      const analysis = {
        projectCount: activeProjects.length,
        totalMilestones: 0,
        completedMilestones: 0,
        overdueMilestones: 0,
        endingSoonMilestones: 0,
        moodAnalysis: {},
        timelineAnalysis: {},
        confidence: 0,
        shouldShow: false,
        feedback: null
      };

      // Collect all milestones and journal entries
      const allMilestones = [];
      const allJournalEntries = [];
      
      activeProjects.forEach(project => {
        if (project.milestones) {
          project.milestones.forEach(milestone => {
            allMilestones.push({ ...milestone, projectName: project.title });
            if (milestone.journalEntries) {
              milestone.journalEntries.forEach(entry => {
                allJournalEntries.push({ ...entry, projectName: project.title, milestoneName: milestone.title });
              });
            }
          });
        }
      });

      analysis.totalMilestones = allMilestones.length;
      analysis.completedMilestones = allMilestones.filter(m => m.completed).length;

      // Timeline Analysis
      const timelineResult = this.analyzeTimeline(allMilestones);
      analysis.timelineAnalysis = timelineResult;
      analysis.overdueMilestones = timelineResult.overdue;
      analysis.endingSoonMilestones = timelineResult.endingSoon;

      // Mood Analysis
      const moodResult = this.analyzeMoodPatterns(allJournalEntries);
      analysis.moodAnalysis = moodResult;

      // Calculate overall confidence
      analysis.confidence = this.calculateConfidence(analysis);

      // Generate feedback if confidence is sufficient
      if (analysis.confidence >= this.confidenceThreshold) {
        analysis.feedback = this.generateFeedback(analysis);
        analysis.shouldShow = true;
      } else {
        // Even with low confidence, provide basic feedback for single projects
        if (analysis.projectCount === 1 && analysis.totalMilestones > 0) {
          analysis.feedback = this.generateBasicFeedback(analysis);
          analysis.shouldShow = true;
          analysis.confidence = 0.4; // Boost confidence for basic feedback
        } else {
          analysis.shouldShow = false;
          analysis.reason = 'low_confidence';
        }
      }

      return analysis;

    } catch (error) {
      console.error('ProjectAnalyzer error:', error);
      return {
        shouldShow: false,
        reason: 'analysis_error',
        confidence: 0,
        feedback: null
      };
    }
  }

  /**
   * Analyze timeline status of milestones
   */
  analyzeTimeline(milestones) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const result = {
      overdue: [],
      endingSoon: [],
      onTrack: [],
      aheadOfSchedule: [],
      totalDaysOverdue: 0,
      totalDaysAhead: 0,
      averageProgress: 0
    };

    milestones.forEach(milestone => {
      if (milestone.completed) return;

      if (!milestone.endDate) return;

      const endDate = new Date(milestone.endDate);
      endDate.setHours(0, 0, 0, 0);
      
      const daysUntilEnd = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      
      // Calculate progress (simplified - based on start date)
      let progress = 0;
      if (milestone.startDate) {
        const startDate = new Date(milestone.startDate);
        startDate.setHours(0, 0, 0, 0);
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const daysPassed = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
        progress = Math.max(0, Math.min(1, daysPassed / totalDays));
      }

      if (daysUntilEnd < 0) {
        result.overdue.push({ ...milestone, daysOverdue: Math.abs(daysUntilEnd), progress });
        result.totalDaysOverdue += Math.abs(daysUntilEnd);
      } else if (daysUntilEnd <= 2) {
        result.endingSoon.push({ ...milestone, daysUntilEnd, progress });
      } else if (progress > 0.8) {
        result.aheadOfSchedule.push({ ...milestone, daysUntilEnd, progress });
        result.totalDaysAhead += daysUntilEnd;
      } else {
        result.onTrack.push({ ...milestone, daysUntilEnd, progress });
      }
    });

    // Calculate average progress
    const allProgress = [...result.overdue, ...result.endingSoon, ...result.onTrack, ...result.aheadOfSchedule]
      .map(m => m.progress);
    result.averageProgress = allProgress.length > 0 ? 
      allProgress.reduce((sum, p) => sum + p, 0) / allProgress.length : 0;

    return result;
  }

  /**
   * Analyze mood patterns from journal entries
   */
  analyzeMoodPatterns(journalEntries) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Filter recent entries (last 14 days)
    const recentEntries = journalEntries.filter(entry => {
      if (!entry.createdAt) return false;
      const entryDate = new Date(entry.createdAt);
      entryDate.setHours(0, 0, 0, 0);
      const daysSinceEntry = Math.ceil((today - entryDate) / (1000 * 60 * 60 * 24));
      return daysSinceEntry <= 14;
    });

    if (recentEntries.length === 0) {
      return {
        hasData: false,
        dominantMood: 'neutral',
        moodDistribution: {},
        emotionalTrend: 'stable',
        confidence: 0
      };
    }

    // Count moods
    const moodCounts = {};
    recentEntries.forEach(entry => {
      const mood = entry.mood || 'neutral';
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });

    // Find dominant mood
    const dominantMood = Object.keys(moodCounts).reduce((a, b) => 
      moodCounts[a] > moodCounts[b] ? a : b, 'neutral'
    );

    // Calculate emotional trend (simplified)
    const positiveMoods = ['happy', 'excited', 'confident', 'motivated'];
    const negativeMoods = ['sad', 'tired', 'overwhelmed', 'stressed'];
    const neutralMoods = ['neutral', 'calm', 'focused'];

    const positiveCount = Object.keys(moodCounts)
      .filter(mood => positiveMoods.includes(mood))
      .reduce((sum, mood) => sum + moodCounts[mood], 0);
    
    const negativeCount = Object.keys(moodCounts)
      .filter(mood => negativeMoods.includes(mood))
      .reduce((sum, mood) => sum + moodCounts[mood], 0);

    let emotionalTrend = 'stable';
    if (positiveCount > negativeCount * 1.5) {
      emotionalTrend = 'positive';
    } else if (negativeCount > positiveCount * 1.5) {
      emotionalTrend = 'negative';
    }

    return {
      hasData: true,
      dominantMood,
      moodDistribution: moodCounts,
      emotionalTrend,
      totalEntries: recentEntries.length,
      confidence: Math.min(1, recentEntries.length / 7) // More entries = higher confidence
    };
  }

  /**
   * Calculate overall confidence for the analysis
   */
  calculateConfidence(analysis) {
    let confidence = 0;

    // Base confidence from project count (more generous)
    if (analysis.projectCount >= 2) {
      confidence += 0.4; // Busy user = higher confidence
    } else if (analysis.projectCount === 1) {
      confidence += 0.3; // Even single project is valuable
    }

    // Confidence from milestone data (more generous)
    if (analysis.totalMilestones > 0) {
      confidence += 0.3;
      if (analysis.totalMilestones >= 3) {
        confidence += 0.1;
      }
      if (analysis.totalMilestones >= 5) {
        confidence += 0.1;
      }
    }

    // Confidence from mood data (more generous)
    if (analysis.moodAnalysis.hasData) {
      confidence += 0.2;
      confidence += analysis.moodAnalysis.confidence * 0.2;
    } else {
      // Even without mood data, we can still provide general feedback
      confidence += 0.1;
    }

    // Confidence from timeline data (more generous)
    if (analysis.timelineAnalysis.overdue.length > 0) {
      confidence += 0.2; // Overdue milestones are important
    }
    if (analysis.timelineAnalysis.endingSoon.length > 0) {
      confidence += 0.1; // Ending soon milestones
    }
    if (analysis.timelineAnalysis.aheadOfSchedule.length > 0) {
      confidence += 0.1; // Positive feedback opportunity
    }

    // Minimum confidence boost for having any data
    if (analysis.projectCount > 0) {
      confidence += 0.1;
    }

    console.log('Confidence calculation:', {
      projectCount: analysis.projectCount,
      totalMilestones: analysis.totalMilestones,
      hasMoodData: analysis.moodAnalysis.hasData,
      overdueCount: analysis.timelineAnalysis.overdue.length,
      endingSoonCount: analysis.timelineAnalysis.endingSoon.length,
      finalConfidence: Math.min(1, confidence)
    });

    return Math.min(1, confidence);
  }

  /**
   * Generate basic feedback for simple cases
   */
  generateBasicFeedback(analysis) {
    const { projectCount, totalMilestones, completedMilestones } = analysis;
    
    const completionRate = totalMilestones > 0 ? (completedMilestones / totalMilestones) : 0;
    
    let title, message, color, priority;
    
    if (completionRate >= 0.8) {
      title = "🎉 Harika İlerleme!";
      message = `${completedMilestones}/${totalMilestones} milestone'ını tamamladınız. Devam edin!`;
      color = "#4CAF50";
      priority = "high";
    } else if (completionRate >= 0.5) {
      title = "📈 İyi Gidiyorsunuz";
      message = `Projenizde ${completedMilestones}/${totalMilestones} milestone tamamlandı.`;
      color = "#2196F3";
      priority = "medium";
    } else {
      title = "🚀 Başlangıç Yapın";
      message = `${totalMilestones} milestone'ınız var. İlk adımları atın!`;
      color = "#FF9800";
      priority = "medium";
    }
    
    return {
      type: 'basic_progress',
      title,
      message,
      color,
      priority,
      analysis: {
        projectCount,
        totalMilestones,
        completedMilestones,
        completionRate,
        confidence: 0.4
      }
    };
  }

  /**
   * Generate personalized feedback based on analysis
   */
  generateFeedback(analysis) {
    const { projectCount, moodAnalysis, timelineAnalysis, overdueMilestones, endingSoonMilestones } = analysis;

    // Create truly unique combinations for variety using multiple factors
    const now = new Date();
    const timeSeed = now.getHours() + now.getMinutes() + now.getSeconds() + now.getDate() + now.getMonth();
    const dataSeed = projectCount + overdueMilestones.length + endingSoonMilestones.length + 
                     (moodAnalysis.hasData ? Object.keys(moodAnalysis.moodDistribution).length : 0) +
                     timelineAnalysis.totalDaysOverdue + timelineAnalysis.totalDaysAhead;
    const randomSeed = (timeSeed + dataSeed + Math.floor(Math.random() * 1000)) % 1000;

    // Generate comprehensive, flowing feedback with variety
    let title = '';
    let message = '';
    let color = '#B6CEB4'; // Default soft green from milestone colors
    let priority = 'low';

    // Analyze the overall situation and create a narrative
    if (overdueMilestones.length > 0) {
      const totalDaysOverdue = timelineAnalysis.totalDaysOverdue;
      const avgDaysOverdue = Math.round(totalDaysOverdue / overdueMilestones.length);
      
      if (projectCount >= 3) {
        // Multiple variations for busy users with overdue milestones
        const overdueVariations = [
           {
             title: 'Time to Regain Control',
             message: `You're juggling ${projectCount} projects and just ${avgDaysOverdue} days behind. You've got the skills, now show them.`,
             color: '#F49BAB' // Soft pink
           },
           {
             title: 'The Comeback Starts Now',
             message: `Managing ${projectCount} projects while being ${avgDaysOverdue} days behind shows you're human. Setbacks make comebacks legendary.`,
             color: '#FFD6BA' // Soft orange
           },
           {
             title: 'Reset and Recharge',
             message: `You're ${avgDaysOverdue} days behind across ${projectCount} projects. Every master was once a beginner. This isn't failure - it's data.`,
             color: '#C0C9EE' // Soft purple
           },
           {
             title: 'Turn the Tide',
             message: `Being ${avgDaysOverdue} days behind on ${projectCount} projects might feel overwhelming, but you're about to create something amazing.`,
             color: '#CBDCEB' // Soft blue
           }
        ];
        
        const selectedVariation = overdueVariations[randomSeed % overdueVariations.length];
        title = selectedVariation.title;
        message = selectedVariation.message;
        color = selectedVariation.color;
        priority = 'high';
      } else {
        // Single project variations
        const singleProjectVariations = [
           {
             title: 'Refocus and Recharge',
             message: `You're ${avgDaysOverdue} days behind on your milestone${overdueMilestones.length > 1 ? 's' : ''}, but this is your moment to shine.`,
             color: '#D1D8BE' // Soft olive
           },
           {
             title: 'Your Moment is Here',
             message: `Being ${avgDaysOverdue} days behind isn't a setback - it's a setup for your greatest comeback yet.`,
             color: '#F0F1C5' // Soft lemon
           },
           {
             title: 'Pressure Creates Diamonds',
             message: `You're ${avgDaysOverdue} days behind, but you're diving deep into one project. This focused intensity creates breakthroughs.`,
             color: '#E7CCCC' // Soft rose
           }
        ];
        
        const selectedVariation = singleProjectVariations[randomSeed % singleProjectVariations.length];
        title = selectedVariation.title;
        message = selectedVariation.message;
        color = selectedVariation.color;
        priority = 'high';
      }
    } else if (endingSoonMilestones.length > 0) {
      // Multiple variations for ending soon milestones
      const endingSoonVariations = [
        {
          title: 'Final Push Ahead',
          message: projectCount >= 3 
            ? `You're in the final stretch with ${endingSoonMilestones.length} milestone${endingSoonMilestones.length > 1 ? 's' : ''} ending soon across your ${projectCount} projects. This is where champions separate themselves from the rest.`
            : `Your milestone${endingSoonMilestones.length > 1 ? 's are' : ' is'} in the final days, and you're perfectly positioned to finish strong. This focused approach is exactly what separates good work from great work.`,
          color: '#9FB3DF' // Soft sky blue
        },
        {
          title: 'The Finish Line Beckons',
          message: projectCount >= 3
            ? `With ${endingSoonMilestones.length} milestone${endingSoonMilestones.length > 1 ? 's' : ''} ending soon across ${projectCount} projects, you're in the zone where legends are made. This is your moment to show the world what you're capable of.`
            : `Your milestone${endingSoonMilestones.length > 1 ? 's are' : ' is'} approaching the finish line. This is where the magic happens - where good becomes great, and great becomes unforgettable.`,
          color: '#BDDDE4' // Soft ice blue
        },
        {
          title: 'The Grand Finale',
          message: projectCount >= 3
            ? `You're orchestrating the grand finale across ${projectCount} projects with ${endingSoonMilestones.length} milestone${endingSoonMilestones.length > 1 ? 's' : ''} ending soon. This is your symphony, and the world is about to hear your masterpiece.`
            : `Your milestone${endingSoonMilestones.length > 1 ? 's are' : ' is'} reaching its crescendo. This is where all your preparation meets opportunity. The stage is set for your greatest performance yet.`,
          color: '#C7D9DD' // Soft gray blue
        }
      ];
      
      const selectedVariation = endingSoonVariations[randomSeed % endingSoonVariations.length];
      title = selectedVariation.title;
      message = selectedVariation.message;
      color = selectedVariation.color;
      priority = 'medium';
    } else if (timelineAnalysis.aheadOfSchedule.length > 0) {
      const aheadCount = timelineAnalysis.aheadOfSchedule.length;
      const totalAhead = timelineAnalysis.totalDaysAhead;
      
      // Multiple variations for ahead of schedule
      const aheadVariations = [
        {
          title: 'You\'re Crushing It',
          message: projectCount >= 3
            ? `Incredible! You're ahead of schedule on ${aheadCount} milestone${aheadCount > 1 ? 's' : ''} across ${projectCount} projects. This level of productivity and organization is rare. You're not just meeting expectations - you're redefining them.`
            : `You're ${totalAhead} days ahead of schedule on ${aheadCount} milestone${aheadCount > 1 ? 's' : ''}. This kind of forward momentum is exactly what creates breakthrough moments. You're operating at a level that most people only dream of.`,
          color: '#B6CEB4' // Soft green
        },
        {
          title: 'Lightning in a Bottle',
          message: projectCount >= 3
            ? `You've captured lightning in a bottle across ${projectCount} projects, staying ${totalAhead} days ahead of schedule. This isn't just productivity - it's artistry. You're painting with time itself.`
            : `You're ${totalAhead} days ahead of schedule, moving with the precision of a master craftsman. This kind of forward momentum doesn't happen by accident - it happens when preparation meets opportunity.`,
          color: '#D5E5D5' // Soft mint
        },
        {
          title: 'The Maestro at Work',
          message: projectCount >= 3
            ? `You're conducting a symphony across ${projectCount} projects, staying ${totalAhead} days ahead of schedule. This is what mastery looks like - effortless excellence that inspires everyone around you.`
            : `You're ${totalAhead} days ahead of schedule, moving with the grace of a maestro. This isn't just efficiency - it's elegance in motion. You're not just completing tasks, you're creating art.`,
          color: '#DEE5D4' // Soft mint green
        },
        {
          title: 'Setting New Standards',
          message: projectCount >= 3
            ? `You're not just ahead of schedule on ${aheadCount} milestone${aheadCount > 1 ? 's' : ''} across ${projectCount} projects - you're setting new standards for what's possible. This is how legends are born.`
            : `You're ${totalAhead} days ahead of schedule, proving that excellence isn't about perfection - it's about progress. You're not just meeting deadlines, you're creating new possibilities.`,
          color: '#FFF2EB' // Soft cream
        }
      ];
      
      const selectedVariation = aheadVariations[randomSeed % aheadVariations.length];
      title = selectedVariation.title;
      message = selectedVariation.message;
      color = selectedVariation.color;
      priority = 'low';
    } else if (moodAnalysis.hasData) {
      const { emotionalTrend, dominantMood, moodDistribution, totalEntries } = moodAnalysis;
      
      // Create mood-specific feedback based on actual mood data
      if (emotionalTrend === 'positive') {
        // Multiple variations for positive mood with specific mood data
        const topMoods = Object.entries(moodDistribution)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 2)
          .map(([mood]) => mood);
        
        const positiveVariations = [
          {
            title: 'Your Energy is Contagious',
            message: projectCount >= 3
              ? `Your ${topMoods[0]} energy is radiating through all ${projectCount} projects. With ${totalEntries} recent entries showing this positivity, you're not just managing projects - you're inspiring progress.`
              : `Your recent ${topMoods[0]} mood patterns show incredible focus. This emotional foundation is exactly what drives breakthrough performance. You're in the zone, and it shows.`,
            color: '#B6CEB4' // Soft green
          },
          {
            title: 'Painting with Positivity',
            message: projectCount >= 3
              ? `You're painting your ${projectCount} projects with ${topMoods[0]} energy. This isn't just good mood - it's creative energy that transforms everything it touches. You're an artist of optimism.`
              : `Your ${topMoods[0]} energy is creating ripples of possibility. This kind of emotional foundation doesn't just support your work - it elevates it to something extraordinary.`,
            color: '#FFD2A0' // Soft peach
          },
          {
            title: 'The Optimism Circus',
            message: projectCount >= 3
              ? `You're running a three-ring circus of ${topMoods[0]} energy across ${projectCount} projects. With ${totalEntries} entries showing this positivity, you're not just performing - you're inspiring.`
              : `Your ${topMoods[0]} energy is like a perfectly tuned instrument. This emotional foundation is exactly what creates breakthrough moments.`,
            color: '#F0F1C5' // Soft lemon
          }
        ];
        
        const selectedVariation = positiveVariations[randomSeed % positiveVariations.length];
        title = selectedVariation.title;
        message = selectedVariation.message;
        color = selectedVariation.color;
        priority = 'low';
      } else if (emotionalTrend === 'negative') {
        // Multiple variations for negative mood with specific mood data
        const topMoods = Object.entries(moodDistribution)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 2)
          .map(([mood]) => mood);
        
        const negativeVariations = [
          {
            title: 'This Too Shall Pass',
            message: projectCount >= 3
              ? `Managing ${projectCount} projects while feeling ${topMoods[0]} shows incredible strength. With ${totalEntries} recent entries, these tough moments are where real growth happens. You're building resilience.`
              : `Your recent ${topMoods[0]} patterns suggest a challenging phase. Remember, every successful journey has valleys. What matters is that you keep moving forward, one step at a time.`,
            color: '#F1D3CE' // Soft coral
          },
          {
            title: 'Growing Through Storms',
            message: projectCount >= 3
              ? `You're weathering ${topMoods[0]} storms across ${projectCount} projects. With ${totalEntries} entries showing this challenge, you're becoming stronger with every step. This is where character is forged.`
              : `Your ${topMoods[0]} journey shows you're human, and that's beautiful. These challenging moments are where the real magic happens - where you discover your true strength.`,
            color: '#E7CCCC' // Soft rose
          },
          {
            title: 'Pressure Creates Diamonds',
            message: projectCount >= 3
              ? `You're feeling ${topMoods[0]} across ${projectCount} projects, but here's the truth: pressure creates diamonds. These challenging moments are shaping you into something extraordinary.`
              : `You're feeling the weight of ${topMoods[0]}, but remember: diamonds are formed under pressure. This emotional intensity creates breakthrough moments.`,
            color: '#FFD6BA' // Soft orange
          }
        ];
        
        const selectedVariation = negativeVariations[randomSeed % negativeVariations.length];
        title = selectedVariation.title;
        message = selectedVariation.message;
        color = selectedVariation.color;
        priority = 'high';
      } else {
        // Multiple variations for balanced mood with specific mood data
        const topMoods = Object.entries(moodDistribution)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 2)
          .map(([mood]) => mood);
        
        const balancedVariations = [
          {
            title: 'Steady Progress',
            message: projectCount >= 3
              ? `Your balanced mix of ${topMoods[0]} and ${topMoods[1]} across ${projectCount} projects shows remarkable maturity. With ${totalEntries} entries, this emotional intelligence separates good leaders from great ones.`
              : `Your emotional balance between ${topMoods[0]} and ${topMoods[1]} creates the perfect foundation for sustained success. This inner stability enables breakthrough moments.`,
            color: '#B6CEB4' // Soft green
          },
          {
            title: 'The Art of Balance',
            message: projectCount >= 3
              ? `You're mastering the art of balancing ${topMoods[0]} and ${topMoods[1]} across ${projectCount} projects. With ${totalEntries} entries, this isn't just stability - it's wisdom in action.`
              : `Your emotional equilibrium between ${topMoods[0]} and ${topMoods[1]} is like a perfectly balanced scale. This inner harmony creates space for breakthrough moments.`,
            color: '#CBDCEB' // Soft blue
          },
          {
            title: 'Centered and Focused',
            message: projectCount >= 3
              ? `You're centered with ${topMoods[0]} energy across ${projectCount} projects. With ${totalEntries} entries showing this balance, you're moving with the precision of a master archer.`
              : `Your emotional center with ${topMoods[0]} creates a powerful foundation for success. This inner stability enables you to hit your targets with precision.`,
            color: '#C0C9EE' // Soft purple
          }
        ];
        
        const selectedVariation = balancedVariations[randomSeed % balancedVariations.length];
        title = selectedVariation.title;
        message = selectedVariation.message;
        color = selectedVariation.color;
        priority = 'low';
      }
    } else {
      // Multiple variations for no journal data
      const noJournalVariations = [
        {
          title: 'Your Story Awaits',
          message: projectCount >= 3
            ? `You're managing ${projectCount} projects with impressive organization, but your story is only half-told. Journaling your experiences will help you understand not just what you're achieving, but how you're growing as a person.`
            : `Your focused approach to this project is admirable, but the real magic happens when you document your journey. Your future self will thank you for capturing these moments of growth and discovery.`,
          color: '#D1D8BE' // Soft olive
        },
        {
          title: 'The Unwritten Chapter',
          message: projectCount >= 3
            ? `You're orchestrating ${projectCount} projects like a master conductor, but the most beautiful part of your symphony remains unwritten. Your journal is waiting to capture the magic of your journey.`
            : `Your project is unfolding like a beautiful story, but the most important chapters are still unwritten. Your journal is the canvas where your growth becomes visible.`,
          color: '#F0F1C5' // Soft lemon
        },
        {
          title: 'Capturing Your Brilliance',
          message: projectCount >= 3
            ? `You're managing ${projectCount} projects with remarkable skill, but your brilliance deserves to be captured. Your journal is the mirror that will show you just how extraordinary your journey really is.`
            : `Your focused dedication is creating something beautiful, but the real treasure is in documenting your growth. Your journal is the key to unlocking your full potential.`,
          color: '#E7CCCC' // Soft rose
        }
      ];
      
      const selectedVariation = noJournalVariations[randomSeed % noJournalVariations.length];
      title = selectedVariation.title;
      message = selectedVariation.message;
      color = selectedVariation.color;
      priority = 'medium';
    }

    return {
      type: 'comprehensive_analysis',
      title,
      message,
      color,
      priority,
      analysis: {
        projectCount,
        overdueCount: overdueMilestones.length,
        endingSoonCount: endingSoonMilestones.length,
        moodTrend: moodAnalysis.emotionalTrend,
        confidence: analysis.confidence
      }
    };
  }

  /**
   * Get daily analysis for main screen (once per day)
   * @param {Array} activeProjects - Active projects
   * @param {Array} completedProjects - Completed projects
   * @returns {Object} Daily analysis result
   */
  async getDailyAnalysis(activeProjects = [], completedProjects = []) {
    try {
      const analysis = await this.analyzeProjects(activeProjects, completedProjects);
      
      // If analysis should be shown, mark as shown
      if (analysis.shouldShow && analysis.feedback) {
        await this.markAsShownToday();
      }
      
      return analysis;
    } catch (error) {
      console.error('Daily analysis error:', error);
      return {
        shouldShow: false,
        reason: 'analysis_error',
        confidence: 0,
        feedback: null
      };
    }
  }

  /**
   * Static method to get daily analysis
   * @param {Array} activeProjects - Active projects
   * @param {Array} completedProjects - Completed projects
   * @param {boolean} forceShow - Force show analysis (for testing)
   * @returns {Object} Daily analysis result
   */
  static async getDailyAnalysis(activeProjects = [], completedProjects = [], forceShow = false) {
    const analyzer = new ProjectAnalyzer();
    
    if (forceShow) {
      // For testing - force show analysis
      const analysis = await analyzer.analyzeProjects(activeProjects, completedProjects, true);
      return analysis;
    }
    
    return await analyzer.getDailyAnalysis(activeProjects, completedProjects);
  }
}

export default new ProjectAnalyzer();
