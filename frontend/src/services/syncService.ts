import { offlineDB } from "./indexeddb";
import { toast } from "sonner";
import { AssessmentsService, ResponsesService } from "@/openapi-rq/requests";
import type { CreateAssessmentRequest, CreateResponseRequest } from "@/openapi-rq/requests/types.gen";

class SyncService {
  async processQueue() {
    const queue = await offlineDB.getSyncQueue();
    if (queue.length === 0) {
      return;
    }

    toast.info(`Syncing ${queue.length} item(s) with the server...`);
    const failedItems = [];

    for (const item of queue) {
      try {
        if (item.type === "assessment") {
          // The `postAssessments` method expects a `requestBody` object
          const requestBody = { requestBody: item.data as CreateAssessmentRequest };
          await AssessmentsService.postAssessments(requestBody);
        } else if (item.type === "response") {
          const { assessment_id, ...responseData } = item.data;
          const requestBody = { assessmentId: assessment_id, requestBody: [responseData as CreateResponseRequest] };
          await ResponsesService.postAssessmentsByAssessmentIdResponses(requestBody);
        } else if (item.type === "batch_responses") {
          const { assessmentId, responses } = item.data;
          if (responses && responses.length > 0) {
            const requestBody = { assessmentId: assessmentId, requestBody: responses as CreateResponseRequest[] };
            await ResponsesService.postAssessmentsByAssessmentIdResponses(requestBody);
          }
        } else if (item.type === "submit_assessment") {
          await AssessmentsService.postAssessmentsByAssessmentIdSubmit({ assessmentId: item.data.assessment_id });
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