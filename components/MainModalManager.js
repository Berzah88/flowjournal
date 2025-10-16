// components/MainModalManager.js
import React from 'react';
import AddProjectScreen from '../screens/AddProjectScreen';
import ActiveProject from '../screens/ActiveProject';
import Journal from '../screens/Journal';
import AddMilestoneModal from './AddMilestoneModal';
import DataRecoveryMenu from './DataRecoveryMenu';
import NotificationMenu from './NotificationMenu';
import LanguageSettings from './LanguageSettings';
import CelebrationModal from './CelebrationModal';

const MainModalManager = ({
  // Add Project Modal
  addVisible,
  setAddVisible,
  
  // Active Project Modal
  selectedCard,
  onCloseCard,
  refreshKey,
  setRefreshKey,
  
  // MyDay Modals
  myDaySelectedCard,
  setMyDaySelectedCard,
  myDaySelectedMilestone,
  setMyDaySelectedMilestone,
  myDayAddMilestoneModalVisible,
  setMyDayAddMilestoneModalVisible,
  myDaySelectedProjectForMilestone,
  setMyDaySelectedProjectForMilestone,
  onMyDayMilestoneSave,
  
  // Data Recovery Modal
  dataRecoveryMenuVisible,
  closeDataRecoveryMenu,
  openLanguageSettings,
  
  // Notification Modal
  notificationMenuVisible,
  closeNotificationMenu,
  
  // Language Settings Modal
  languageSettingsVisible,
  closeLanguageSettings,
  
  // Celebration Modal
  celebrationVisible,
  setCelebrationVisible,
  celebrationData,
  setCelebrationData,
  onCelebrationJournalPress,
  activeTasks,
  completedTasks,
  
  // Props
  navigation,
  activeTasks: activeTasksForJournal,
  t,
}) => {
  return (
    <>
      {/* Add Project Modal */}
      <AddProjectScreen 
        visible={addVisible} 
        onClose={() => setAddVisible(false)} 
      />

      {/* Active Project Modal */}
      {selectedCard && (
        <ActiveProject 
          selectedCard={selectedCard} 
          onClose={() => {
            onCloseCard();
            setRefreshKey(prev => prev + 1);
          }} 
          navigation={navigation}
        />
      )}
      
      {/* MyDay Active Project Modal */}
      {myDaySelectedCard && (
        <ActiveProject 
          selectedCard={myDaySelectedCard} 
          onClose={() => {
            setMyDaySelectedCard(null);
            setRefreshKey(prev => prev + 1);
          }} 
          navigation={navigation}
        />
      )}
      
      {/* Journal Modal */}
      {myDaySelectedMilestone && (
        <Journal 
          visible={!!myDaySelectedMilestone} 
          milestone={myDaySelectedMilestone}
          existingEntry={myDaySelectedMilestone?.editEntry || null}
          onClose={() => setMyDaySelectedMilestone(null)}
          onSave={() => {
            setRefreshKey(prev => prev + 1);
          }}
          fromMainScreen={true}
          currentTask={activeTasksForJournal.find(t => t.id === myDaySelectedMilestone?.taskId)}
          isProjectBased={myDaySelectedMilestone?.isProjectBased || false}
        />
      )}

      {/* Add Milestone Modal */}
      <AddMilestoneModal
        visible={myDayAddMilestoneModalVisible}
        onClose={() => {
          setMyDayAddMilestoneModalVisible(false);
          setMyDaySelectedProjectForMilestone(null);
        }}
        project={myDaySelectedProjectForMilestone}
        onSave={onMyDayMilestoneSave}
        existingMilestones={myDaySelectedProjectForMilestone?.milestones || []}
      />

      {/* Data Recovery Menu */}
      <DataRecoveryMenu
        visible={dataRecoveryMenuVisible}
        onClose={closeDataRecoveryMenu}
        onRecoverData={() => {}}
        onCreateBackup={() => {}}
        onLanguageSettings={openLanguageSettings}
      />

      {/* Notification Menu */}
      <NotificationMenu
        visible={notificationMenuVisible}
        onClose={closeNotificationMenu}
      />

      {/* Language Settings Modal */}
      <LanguageSettings
        visible={languageSettingsVisible}
        onClose={closeLanguageSettings}
        onLanguageChange={(languageCode) => {
          // Language change is handled by LanguageContext
        }}
      />

      {/* Celebration Modal */}
      <CelebrationModal
        visible={celebrationVisible}
        onClose={() => {
          setCelebrationVisible(false);
          setCelebrationData(null);
        }}
        onJournalPress={onCelebrationJournalPress}
        completion={celebrationData}
        activeTasks={activeTasks}
        completedTasks={completedTasks}
      />
    </>
  );
};

export default MainModalManager;

