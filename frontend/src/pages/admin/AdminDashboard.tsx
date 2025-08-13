/*
 * Admin dashboard page that displays system overview and management options
 * Shows statistics, pending reviews, and navigation to admin functions
 */

import { 
  AdminDashboardHeader, 
  SystemStats, 
  AdminActions, 
  PendingReviews, 
  AdminGuide 
} from "@/components/admin/AdminDashboard";
import { useAdminDashboard } from "@/hooks/admin/useAdminDashboard";

export const AdminDashboard: React.FC = () => {
  const { 
    pendingReviews, 
    pendingReviewsCount, 
    systemStats, 
    adminActions, 
    isLoading 
  } = useAdminDashboard();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AdminDashboardHeader />
          <SystemStats stats={systemStats} />
          <AdminActions actions={adminActions} />
          
          <div className="grid lg:grid-cols-3 gap-8">
            <PendingReviews 
              reviews={pendingReviews}
              count={pendingReviewsCount}
              isLoading={isLoading}
            />
            <div className="space-y-6">
              <AdminGuide />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
