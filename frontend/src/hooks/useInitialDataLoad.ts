import { useEffect } from "react";
import { useSyncStatus } from "./shared/useSyncStatus";
import { QuestionsService } from "@/openapi-rq/requests";
import { offlineDB } from "@/services/indexeddb";
import { toast } from "sonner";

export function useInitialDataLoad() {
  const { isOnline } = useSyncStatus();

  useEffect(() => {
    const loadInitialData = async () => {
      if (isOnline) {
        try {
          toast.info("Checking for data updates...");
          const questionsData = await QuestionsService.getQuestions();
          if (questionsData && questionsData.questions) {
            await offlineDB.saveQuestions(questionsData.questions);
            toast.success("Questions updated and saved locally.");
          }
        } catch (error) {
          toast.error("Failed to fetch initial data from the server.");
          console.error("Initial data load failed:", error);
        }
      } else {
        toast.info("You are offline. Using local data.");
      }
    };

    loadInitialData();
  }, [isOnline]);
} 