import { offlineDB } from "./indexeddb";
import { toast } from "sonner";
import { AssessmentsService, ResponsesService, ReportsService } from "@/openapi-rq/requests";
import type { CreateAssessmentRequest, CreateResponseRequest } from "@/openapi-rq/requests/types.gen";
import type { SyncQueueItem } from "@/types/offline";

class SyncService {
  async processQueue() {
    const queue = await offlineDB.getSyncQueue();
    if (queue.length === 0) {
      return;
    }

    console.log('🔄 Processing sync queue with items:', queue);
    toast.info(`Syncing ${queue.length} item(s) with the server...`);
    const failedItems = [];

    for (const item of queue) {
      try {
        console.log(`🔄 Processing sync item: ${item.operation} ${item.entity_type}`, item);
        
        if (item.entity_type === "assessment" && item.operation === "create") {
          // The `postAssessments` method expects a `requestBody` object
          const requestBody = { requestBody: item.data as CreateAssessmentRequest };
          await AssessmentsService.postAssessments(requestBody);
          console.log(`✅ Successfully synced assessment creation`);
        } else if (item.entity_type === "response" && item.operation === "create") {
          const { assessment_id, ...responseData } = item.data as { assessment_id: string; [key: string]: unknown };
          const requestBody = { assessmentId: assessment_id, requestBody: [responseData as CreateResponseRequest] };
          await ResponsesService.postAssessmentsByAssessmentIdResponses(requestBody);
          console.log(`✅ Successfully synced response creation`);
        } else if (item.entity_type === "submission" && item.operation === "create") {
          // Handle assessment submission from queue
          const { assessmentId } = item.data as { assessmentId: string };
          console.log(`🔄 Submitting assessment ${assessmentId} to server...`);
          await AssessmentsService.postAssessmentsByAssessmentIdSubmit({ assessmentId });
          console.log(`✅ Successfully synced assessment submission for assessment ${assessmentId}`);
        } else if (item.entity_type === "report" && item.operation === "create") {
          // Handle report creation from queue
          console.log(`🔄 Creating report from queue:`, item.data);
          // The report data structure seems to be different from standard API format
          // We need to handle the custom report structure
          const reportData = item.data as {
            submissionId: string;
            categoryRecommendations: { category: string; recommendation: string; }[];
            reviewer: string;
            timestamp: string;
            [key: string]: unknown;
          };
          
          console.log(`🔄 Creating report for submission ${reportData.submissionId}`);
          await ReportsService.postSubmissionsBySubmissionIdReports({
            submissionId: reportData.submissionId,
            requestBody: reportData.categoryRecommendations
          });
          console.log(`✅ Report created successfully for submission ${reportData.submissionId}`);
        } else {
          console.warn(`Unknown sync item type: ${item.entity_type} with operation ${item.operation}`);
        }
      } catch (error) {
        console.error("Failed to sync item:", item, error);
        failedItems.push(item);
      }
    }

    if (failedItems.length > 0) {
      toast.error(`${failedItems.length} item(s) failed to sync. They will be retried later.`);
      // For now, we clear the queue and re-add the failed items. A more robust solution would be a separate "dead-letter" queue.
      await offlineDB.clearSyncQueue();
      for (const item of failedItems) {
        await offlineDB.addToSyncQueue(item);
      }
    } else {
      await offlineDB.clearSyncQueue();
      toast.success("Data synced successfully!");
    }
  }

  listenForOnlineStatus() {
    window.addEventListener("online", this.processQueue.bind(this));
    // Also try to sync when the app loads, in case it was closed while offline
    this.processQueue();
  }
}

export const syncService = new SyncService();
syncService.listenForOnlineStatus(); 