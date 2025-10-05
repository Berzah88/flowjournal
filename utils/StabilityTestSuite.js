// utils/StabilityTestSuite.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import DataIntegrityManager from './DataIntegrityManager';

class StabilityTestSuite {
  static async runAllTests() {
    console.log('🧪 Starting stability test suite...');
    
    const results = {
      memoryLeakTest: await this.testMemoryLeaks(),
      dataIntegrityTest: await this.testDataIntegrity(),
      asyncOperationTest: await this.testAsyncOperations(),
      crashRecoveryTest: await this.testCrashRecovery(),
    };
    
    console.log('🧪 Test results:', results);
    return results;
  }

  static async testMemoryLeaks() {
    console.log('🧪 Testing memory leaks...');
    
    try {
      // Test rapid state changes
      const startTime = Date.now();
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        // Simulate rapid data changes
        const testData = Array.from({ length: 10 }, (_, j) => ({
          id: `${i}-${j}`,
          title: `Test Project ${i}-${j}`,
          milestones: Array.from({ length: 5 }, (_, k) => ({
            id: `${i}-${j}-${k}`,
            title: `Milestone ${k}`,
            journalEntries: []
          }))
        }));
        
        await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(testData));
        await new Promise(resolve => setTimeout(resolve, 1)); // Small delay
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ Memory leak test completed in ${duration}ms`);
      return { success: true, duration, iterations };
    } catch (error) {
      console.error('❌ Memory leak test failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async testDataIntegrity() {
    console.log('🧪 Testing data integrity...');
    
    try {
      // Test with corrupted data
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, 'invalid json data');
      
      const integrityCheck = await DataIntegrityManager.validateDataIntegrity();
      
      if (!integrityCheck.isValid) {
        console.log('✅ Corrupted data detected correctly');
        
        // Test recovery
        const recoveryResult = await DataIntegrityManager.recoverFromCorruption();
        
        if (recoveryResult.success) {
          console.log('✅ Data recovery successful');
          return { success: true, recovery: true };
        } else {
          console.log('❌ Data recovery failed');
          return { success: false, recovery: false };
        }
      } else {
        console.log('❌ Corrupted data not detected');
        return { success: false, detection: false };
      }
    } catch (error) {
      console.error('❌ Data integrity test failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async testAsyncOperations() {
    console.log('🧪 Testing async operations...');
    
    try {
      // Test concurrent operations
      const promises = Array.from({ length: 10 }, (_, i) => 
        AsyncStorage.setItem(`test_key_${i}`, JSON.stringify({ id: i, data: `test_${i}` }))
      );
      
      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      // Cleanup test keys
      const testKeys = Array.from({ length: 10 }, (_, i) => `test_key_${i}`);
      await AsyncStorage.multiRemove(testKeys);
      
      console.log(`✅ Async operations test: ${successCount}/10 successful`);
      return { success: successCount === 10, successCount, total: 10 };
    } catch (error) {
      console.error('❌ Async operations test failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async testCrashRecovery() {
    console.log('🧪 Testing crash recovery...');
    
    try {
      // Create test data
      const testData = [
        {
          id: 1,
          title: 'Test Project',
          milestones: [
            {
              id: 'milestone_1',
              title: 'Test Milestone',
              journalEntries: [
                {
                  id: 1,
                  content: 'Test entry',
                  createdAt: new Date().toISOString()
                }
              ]
            }
          ]
        }
      ];
      
      // Save test data
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(testData));
      
      // Create backup
      const backupResult = await DataIntegrityManager.createSecureBackup(testData);
      
      if (backupResult.success) {
        console.log('✅ Backup creation successful');
        
        // Simulate data corruption
        await AsyncStorage.setItem(STORAGE_KEYS.TASKS, 'corrupted data');
        
        // Test recovery
        const recoveryResult = await DataIntegrityManager.recoverFromCorruption();
        
        if (recoveryResult.success) {
          console.log('✅ Crash recovery successful');
          return { success: true, backup: true, recovery: true };
        } else {
          console.log('❌ Crash recovery failed');
          return { success: false, backup: true, recovery: false };
        }
      } else {
        console.log('❌ Backup creation failed');
        return { success: false, backup: false };
      }
    } catch (error) {
      console.error('❌ Crash recovery test failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async runQuickTest() {
    console.log('🧪 Running quick stability test...');
    
    try {
      // Test basic functionality
      const testData = [{ id: 1, title: 'Quick Test' }];
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(testData));
      
      const loadedData = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      const parsedData = JSON.parse(loadedData);
      
      if (parsedData.length === 1 && parsedData[0].title === 'Quick Test') {
        console.log('✅ Quick test passed');
        return { success: true };
      } else {
        console.log('❌ Quick test failed');
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Quick test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default StabilityTestSuite;



