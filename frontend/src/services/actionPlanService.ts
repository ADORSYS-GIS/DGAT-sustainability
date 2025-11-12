import { AdminService } from "@/openapi-rq/requests/services.gen";
import { apiInterceptor } from "./apiInterceptor";
import { offlineDB } from "./indexeddb";
import { OfflineRecommendation } from "../types/offline";

export const getActionPlans = async () => {
  return await apiInterceptor.interceptGet(
    () => AdminService.getAdminActionPlans(),
    async () => {
      const submissions = await offlineDB.getAllSubmissions();
      type OrganizationPlan = {
        organization_id: string;
        organization_name: string;
        recommendations: OfflineRecommendation[];
      };
      const organizationsMap = new Map<string, OrganizationPlan>();
      for (const submission of submissions) {
        if (!organizationsMap.has(submission.organization_id)) {
          organizationsMap.set(submission.organization_id, {
            organization_id: submission.organization_id,
            organization_name: 'Unknown Organization',
            recommendations: [],
          });
        }
        const org = organizationsMap.get(submission.organization_id);
        if (org) {
          const reports = await offlineDB.getReportsBySubmission(submission.submission_id);
          for (const report of reports) {
            if (report.data && Array.isArray(report.data)) {
              report.data.forEach((categoryData) => {
                Object.keys(categoryData).forEach((category) => {
                  const recommendations = categoryData[category]?.recommendations;
                  if (recommendations && Array.isArray(recommendations)) {
                    recommendations.forEach((rec: { id: string; text: string; status: "todo" | "in_progress" | "done" | "approved"; }) => {
                      if (rec.text !== 'No recommendation provided') {
                        const now = new Date().toISOString();
                        org.recommendations.push({
                          recommendation_id: rec.id,
                          report_id: report.report_id,
                          submission_id: submission.submission_id,
                          assessment_id: submission.assessment_id,
                          assessment_name: submission.assessment_name || 'Unknown Assessment',
                          category,
                          recommendation: rec.text,
                          status: rec.status,
                          created_at: report.generated_at,
                          organization_id: org.organization_id,
                          organization_name: org.organization_name,
                          updated_at: now,
                          sync_status: 'synced',
                          local_changes: false,
                          last_synced: now,
                        });
                      }
                    });
                  }
                });
              });
            }
          }
        }
      }
      return { organizations: Array.from(organizationsMap.values()) };
    },
    'action-plans'
  );
};