// Test script for offline functionality
// This script demonstrates how to test the PWA offline capabilities

import { offlineDB } from './services/indexeddb';
import { syncService } from './services/syncService';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

class OfflineTestSuite {
  private results: TestResult[] = [];

  async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    try {
      await testFn();
      this.results.push({
        name,
        passed: true,
        message: 'Test passed',
        duration: Date.now() - startTime
      });
      console.log(`✅ ${name} - PASSED (${Date.now() - startTime}ms)`);
    } catch (error) {
      this.results.push({
        name,
        passed: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      });
      console.error(`❌ ${name} - FAILED: ${error instanceof Error ? error.message : 'Unknown error'} (${Date.now() - startTime}ms)`);
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Offline Functionality Tests...\n');

    // Test 1: Database Initialization
    await this.runTest('Database Initialization', async () => {
      await offlineDB.init();
      const stats = await offlineDB.getStats();
      if (typeof stats.assessments !== 'number') {
        throw new Error('Database not properly initialized');
      }
    });

    // Test 2: Sync Service Initialization
    await this.runTest('Sync Service Initialization', async () => {
      await syncService.init();
      const status = await syncService.getSyncStatus();
      if (typeof status.isOnline !== 'boolean') {
        throw new Error('Sync service not properly initialized');
      }
    });

    // Test 3: Local Data Storage
    await this.runTest('Local Data Storage - Questions', async () => {
      const testQuestion = {
        question_id: 'test-question-1',
        category: 'test-category',
        revisions: [{
          question_revision_id: 'test-revision-1',
          question_id: 'test-question-1',
          text: 'Test question text',
          language: 'en',
          version: 1,
          created_at: new Date().toISOString()
        }],
        last_synced: new Date().toISOString()
      };

      await offlineDB.saveQuestion(testQuestion);
      const retrieved = await offlineDB.getAllQuestions();
      
      if (!retrieved.find(q => q.question_id === 'test-question-1')) {
        throw new Error('Question not saved or retrieved correctly');
      }
    });

    // Test 4: Local Data Storage - Assessments
    await this.runTest('Local Data Storage - Assessments', async () => {
      const testAssessment = {
        assessment_id: 'test-assessment-1',
        user_id: 'test-user',
        language: 'en',
        created_at: new Date().toISOString(),
        sync_status: 'synced' as const
      };

      await offlineDB.saveAssessment(testAssessment);
      const retrieved = await offlineDB.getAssessment('test-assessment-1');
      
      if (!retrieved || retrieved.assessment_id !== 'test-assessment-1') {
        throw new Error('Assessment not saved or retrieved correctly');
      }
    });

    // Test 5: Local Data Storage - Responses
    await this.runTest('Local Data Storage - Responses', async () => {
      const testResponse = {
        response_id: 'test-response-1',
        assessment_id: 'test-assessment-1',
        question_revision_id: 'test-revision-1',
        response: 'Test response text',
        version: 1,
        updated_at: new Date().toISOString(),
        sync_status: 'pending' as const,
        local_changes: true
      };

      await offlineDB.saveResponse(testResponse);
      const retrieved = await offlineDB.getResponse('test-response-1');
      
      if (!retrieved || retrieved.response_id !== 'test-response-1') {
        throw new Error('Response not saved or retrieved correctly');
      }
    });

    // Test 6: Sync Queue Operations
    await this.runTest('Sync Queue Operations', async () => {
      await offlineDB.addToSyncQueue({
        operation: 'create',
        entity_type: 'response',
        entity_id: 'test-response-1',
        data: { test: 'data' }
      });

      const queue = await offlineDB.getSyncQueue();
      if (queue.length === 0) {
        throw new Error('Sync queue item not added');
      }

      const item = queue[0];
      if (item.operation !== 'create' || item.entity_type !== 'response') {
        throw new Error('Sync queue item not saved correctly');
      }
    });

    // Test 7: Conflict Detection
    await this.runTest('Conflict Detection', async () => {
      // Create two versions of the same response
      const response1 = {
        response_id: 'conflict-test-1',
        assessment_id: 'test-assessment-1',
        question_revision_id: 'test-revision-1',
        response: 'Original response',
        version: 1,
        updated_at: new Date().toISOString(),
        sync_status: 'synced' as const
      };

      const response2 = {
        ...response1,
        response: 'Modified response',
        version: 2,
        sync_status: 'pending' as const,
        local_changes: true
      };

      await offlineDB.saveResponse(response1);
      await offlineDB.saveResponse(response2);

      const latest = await offlineDB.getLatestResponsesByAssessment('test-assessment-1');
      const conflictResponse = latest.find(r => r.response_id === 'conflict-test-1');
      
      if (!conflictResponse || conflictResponse.version !== 2) {
        throw new Error('Conflict detection not working correctly');
      }
    });

    // Test 8: Data Cleanup
    await this.runTest('Data Cleanup', async () => {
      await offlineDB.clearAllData();
      const stats = await offlineDB.getStats();
      
      if (stats.assessments !== 0 || stats.questions !== 0 || stats.responses !== 0) {
        throw new Error('Data not cleared properly');
      }
    });

    // Test 9: Service Worker Registration
    await this.runTest('Service Worker Registration', async () => {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }

      const registrations = await navigator.serviceWorker.getRegistrations();
      const swRegistration = registrations.find(reg => 
        reg.scope.includes(window.location.origin)
      );

      if (!swRegistration) {
        throw new Error('Service Worker not registered');
      }
    });

    // Test 10: IndexedDB Performance
    await this.runTest('IndexedDB Performance Test', async () => {
      const startTime = Date.now();
      
      // Create 100 test questions
      const questions = Array.from({ length: 100 }, (_, i) => ({
        question_id: `perf-test-${i}`,
        category: `category-${i % 10}`,
        revisions: [{
          question_revision_id: `revision-${i}`,
          question_id: `perf-test-${i}`,
          text: `Performance test question ${i}`,
          language: 'en',
          version: 1,
          created_at: new Date().toISOString()
        }],
        last_synced: new Date().toISOString()
      }));

      await offlineDB.saveQuestions(questions);
      const retrieved = await offlineDB.getAllQuestions();
      
      const duration = Date.now() - startTime;
      
      if (retrieved.length < 100) {
        throw new Error('Not all questions were saved');
      }
      
      if (duration > 5000) { // 5 seconds threshold
        throw new Error(`Performance test too slow: ${duration}ms`);
      }
      
      console.log(`   📊 Performance: Saved and retrieved 100 questions in ${duration}ms`);
    });

    this.printSummary();
  }

  private printSummary(): void {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`   - ${r.name}: ${r.message}`));
    }

    console.log('\n🎯 Next Steps for Manual Testing:');
    console.log('1. Open DevTools → Application → Storage');
    console.log('2. Check IndexedDB for "SustainabilityAssessmentDB"');
    console.log('3. Go offline (DevTools → Network → Offline)');
    console.log('4. Try creating assessments and responses');
    console.log('5. Go back online and check sync behavior');
    console.log('6. Check Service Worker in Application → Service Workers');
  }
}

// Manual testing instructions
export const manualTestingInstructions = {
  offlineScenarios: [
    {
      name: 'Basic Offline Usage',
      steps: [
        '1. Load the application while online',
        '2. Go to DevTools → Network → Check "Offline"',
        '3. Navigate to different pages',
        '4. Try to create a new assessment',
        '5. Fill out some responses',
        '6. Check that data is saved locally',
        '7. Go back online',
        '8. Verify that data syncs to server'
      ]
    },
    {
      name: 'Sync Conflict Resolution',
      steps: [
        '1. Create an assessment while online',
        '2. Add some responses',
        '3. Go offline',
        '4. Modify the responses',
        '5. In another browser/device, modify the same responses',
        '6. Go back online',
        '7. Check conflict resolution behavior'
      ]
    },
    {
      name: 'Background Sync',
      steps: [
        '1. Go offline',
        '2. Make several changes (create assessments, responses)',
        '3. Close the browser tab',
        '4. Go back online',
        '5. Reopen the application',
        '6. Verify that changes were synced in background'
      ]
    },
    {
      name: 'PWA Installation',
      steps: [
        '1. Open the app in Chrome/Edge',
        '2. Look for install prompt or use browser menu',
        '3. Install the PWA',
        '4. Test offline functionality in installed app',
        '5. Check that it works without browser UI'
      ]
    }
  ],
  
  performanceTests: [
    {
      name: 'Large Dataset Handling',
      description: 'Test with 1000+ questions and responses',
      metrics: ['Load time', 'Search performance', 'Sync time']
    },
    {
      name: 'Network Interruption',
      description: 'Test behavior during network interruptions',
      scenarios: ['Slow network', 'Intermittent connectivity', 'Complete offline']
    }
  ],

  debuggingTips: [
    'Use DevTools → Application → Storage to inspect IndexedDB',
    'Check Service Worker logs in DevTools → Application → Service Workers',
    'Monitor Network tab for failed requests',
    'Use Console to check for sync service logs',
    'Test on different devices and browsers',
    'Verify PWA manifest in DevTools → Application → Manifest'
  ]
};

// Export test runner
export const testRunner = new OfflineTestSuite();

// Auto-run tests if this file is imported directly
if (typeof window !== 'undefined' && window.location.search.includes('test=offline')) {
  testRunner.runAllTests().catch(console.error);
}