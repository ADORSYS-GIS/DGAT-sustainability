/**
 * @file ActionPlan.tsx
 * @description This file defines the main component for the Action Plan page, which displays a Kanban board of recommendations.
 */
import { Navbar } from "@/components/shared/Navbar";
import {
  useOfflineRecommendationStatusMutation,
  useOfflineUserRecommendations,
} from "@/hooks/useOfflineReports";
import * as React from "react";
import { toast } from "sonner";
import { useAuth } from "../../hooks/shared/useAuth";
import { ActionPlanHeader } from "@/components/pages/user/ActionPlan/ActionPlanHeader";
import { KanbanBoard } from "@/components/pages/user/ActionPlan/KanbanBoard";
import { LoadingSpinner } from "@/components/pages/user/ActionPlan/LoadingSpinner";
import {
  extractRecommendations,
  KanbanRecommendation,
} from "@/components/pages/user/ActionPlan/services";

export const ActionPlan: React.FC = () => {
  const { data, isLoading } = useOfflineUserRecommendations();
  const { updateRecommendationStatus } =
    useOfflineRecommendationStatusMutation();
  const { roles } = useAuth();
  const isAdmin = roles.includes("org_admin");

  const [kanbanRecs, setKanbanRecs] = React.useState<KanbanRecommendation[]>(
    []
  );

  React.useEffect(() => {
    if (data?.reports) {
      setKanbanRecs(extractRecommendations(data.reports));
    }
  }, [data]);

  const moveRecommendation = async (
    id: string,
    newStatus: "todo" | "in_progress" | "done" | "approved"
  ) => {
    setKanbanRecs((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, status: newStatus } : rec))
    );

    const recommendationToUpdate = kanbanRecs.find((rec) => rec.id === id);

    if (!recommendationToUpdate) {
      toast.error("Recommendation not found.");
      return;
    }

    try {
      await updateRecommendationStatus(
        recommendationToUpdate.report_id,
        recommendationToUpdate.category,
        recommendationToUpdate.recommendation_id,
        newStatus,
        {
          onSuccess: () => {
            toast.success("Status updated successfully");
          },
          onError: (error) => {
            console.error("Failed to update status:", error);
            toast.error("Failed to update status");
          },
        }
      );
    } catch (error) {
      console.error("Unhandled error in moveRecommendation:", error);
      toast.error("Failed to update status");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ActionPlanHeader />
          <KanbanBoard
            recommendations={kanbanRecs}
            isAdmin={isAdmin}
            moveRecommendation={moveRecommendation}
          />
        </div>
      </div>
    </div>
  );
};
