// components/MainModalManager.js
import React from 'react';
import { Alert } from 'react-native';
import { useTaskActions } from '../hooks/useTaskContext';
import AddProjectScreen from '../screens/AddProjectScreen';
import ActiveProject from '../screens/ActiveProject';
import Journal from '../screens/Journal';
import AddTaskModal from './AddTaskModal';
import DataRecoveryMenu from './DataRecoveryMenu';
import NotificationMenu from './NotificationMenu';
import LanguageSettings from './LanguageSettings';
import CelebrationModal from './CelebrationModal';
import ParentDateNotificationModal from './ParentDateNotificationModal';

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
  
  // Parent Date Notification Modal
  parentDateNotificationVisible,
  setParentDateNotificationVisible,
  parentDateNotifications,
  setParentDateNotifications,
  
  // Props
  navigation,
  activeTasks: activeTasksForJournal,
  t,
}) => {
  // Get task actions at top-level (Hooks must be called at component top-level)
  const { createBackup, restoreFromBackupManually } = useTaskActions();
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

      {/* Add Task Modal */}
      <AddTaskModal
        visible={myDayAddMilestoneModalVisible}
        onClose={() => {
          setMyDayAddMilestoneModalVisible(false);
          setMyDaySelectedProjectForMilestone(null);
        }}
        project={myDaySelectedProjectForMilestone}
        onSave={onMyDayMilestoneSave}
        existingTasks={myDaySelectedProjectForMilestone?.milestones || []}
      />

      {/* Data Recovery Menu */}
      <DataRecoveryMenu
        visible={dataRecoveryMenuVisible}
        onClose={closeDataRecoveryMenu}
        onRecoverData={async () => {
          try {
            const result = await restoreFromBackupManually();
            if (result && result.success) {
              Alert.alert('Başarılı', result.message || 'Veriler geri yüklendi');
            } else {
              Alert.alert('Hata', result?.message || 'Veriler geri yüklenemedi');
            }
          } catch (error) {
            console.error('Recover data failed:', error);
            Alert.alert('Hata', error.message || 'Veriler geri yüklenemedi');
          } finally {
            closeDataRecoveryMenu();
          }
        }}
        onCreateBackup={async () => {
          try {
            const result = await createBackup();
            if (result && result.success) {
              Alert.alert('Başarılı', result.message || 'Backup oluşturuldu');
            } else {
              Alert.alert('Hata', result?.message || 'Backup oluşturulamadı');
            }
          } catch (error) {
            console.error('Create backup failed:', error);
            Alert.alert('Hata', error.message || 'Backup oluşturulamadı');
          } finally {
            closeDataRecoveryMenu();
          }
        }}
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

      {/* Parent Date Notification Modal */}
      <ParentDateNotificationModal
        visible={parentDateNotificationVisible}
        notifications={parentDateNotifications}
        onClose={() => {
          setParentDateNotificationVisible(false);
          setParentDateNotifications([]);
        }}
      />
    </>
  );
};

export default MainModalManager;

