/*
 * Main dashboard page that displays user overview and navigation options
 * Assembles all dashboard components and provides user-specific content
 * Shows recent submissions, action cards, and help resources
 */

import * as React from "react";
import { 
  DashboardHeader,
  DashboardActions,
  RecentSubmissions,
  ExportReports,
  HelpCard,
} from "@/components/user/Dashboard";
import { useDashboard } from "@/hooks/user/useDashboard";

export const Dashboard: React.FC = () => {
  const {
    // State
    submissionsLoading,
    reportsLoading,

    // Data
    submissions,
    reports,
    user,

    // Computed values
    userName,
    orgName,

    // Functions
    dashboardActions,
    getStatusColor,
    formatStatus,
    handleExportAllPDF,
    handleViewAll,
    handleViewGuide,
  } = useDashboard();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <DashboardHeader userName={userName} orgName={orgName} />

          <DashboardActions actions={dashboardActions} />

          <div className="grid lg:grid-cols-3 gap-8">
            <RecentSubmissions
              submissions={submissions}
              isLoading={submissionsLoading}
              onViewAll={handleViewAll}
              getStatusColor={getStatusColor}
              formatStatus={formatStatus}
            />

            <div className="space-y-6">
              <ExportReports
                onExportPDF={handleExportAllPDF}
                isLoading={reportsLoading}
                hasReports={reports.length > 0}
              />

              <HelpCard onViewGuide={handleViewGuide} />
            </div>
          </div>
        </div>
      </div>
      {/* Hidden canvas for PDF radar chart export */}
      <canvas
        id="radar-canvas"
        width={500}
        height={400}
        style={{ display: "none" }}
      />
    </div>
  );
};
