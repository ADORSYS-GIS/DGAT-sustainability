import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Users, 
  Building2, 
  List, 
  FileText, 
  CheckSquare, 
  Star,
  Settings,
  AlertTriangle,
  HelpCircle,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useOfflineSyncStatus } from "@/hooks/useOfflineApi";

export const AdminGuide: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOnline } = useOfflineSyncStatus();

  const guideSection = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: BookOpen,
      content: [
        "Welcome to the DGRV Admin Dashboard! As an administrator, you have access to all system management features.",
        "Your role allows you to manage organizations, users, assessment categories, questions, and review submissions.",
        "Start by familiarizing yourself with the dashboard overview and then explore each management section."
      ]
    },
    {
      id: "organizations",
      title: "Managing Organizations",
      icon: Building2,
      content: [
        "Organizations represent cooperative entities in the system. Each organization can have multiple users and custom settings.",
        "To create a new organization: Navigate to 'Manage Organizations' → Click 'Add Organization' → Fill in details including domains and categories.",
        "Organizations can be assigned specific assessment categories to customize their experience.",
        "Use the organization management page to edit details, manage domains, and configure access settings."
      ]
    },
    {
      id: "users",
      title: "User Management",
      icon: Users,
      content: [
        "Users are assigned to organizations with specific roles: org_admin (can create assessments) or Org_User (can answer assessments).",
        "To add users: Go to 'Manage Users' → Select an organization → Click 'Add User' → Enter email and select role.",
        "Organization admins can manage users within their own organization through the user dashboard.",
        "Monitor user activity and manage permissions through the user management interface."
      ]
    },
    {
      id: "categories",
      title: "Assessment Categories",
      icon: List,
      content: [
        "Categories organize assessment questions into logical groups (e.g., Environmental, Social, Governance).",
        "Each category has a weight (percentage) that contributes to the overall assessment score.",
        "Total category weights must equal 100%. Use the redistribute function to automatically balance weights.",
        "Categories can be reordered and assigned to specific organizations to customize their assessment experience."
      ]
    },
    {
      id: "questions",
      title: "Question Management",
      icon: FileText,
      content: [
        "Questions are the core of assessments. Each question belongs to a category and supports multiple languages.",
        "Question format includes: Yes/No response, Percentage completion (0%, 25%, 50%, 75%, 100%), and text explanation.",
        "Questions support multilingual content: English (required), siSwati, Portuguese, Zulu, German, and French.",
        "Use the weight field (1-10) to indicate question importance within each category."
      ]
    },
    {
      id: "reviews",
      title: "Assessment Reviews",
      icon: CheckSquare,
      content: [
        "Review submitted assessments from organizations and provide feedback or recommendations.",
        "Assessment statuses: Pending Review → Under Review → Approved/Rejected/Revision Requested.",
        "Use standard recommendations to speed up the review process with pre-written feedback.",
        "Provide detailed comments and actionable recommendations to help organizations improve."
      ]
    },
    {
      id: "recommendations",
      title: "Standard Recommendations",
      icon: Star,
      content: [
        "Create reusable recommendation templates for common assessment scenarios.",
        "Standard recommendations help maintain consistency across reviews and save time.",
        "Categories recommendations by topic (e.g., Environmental Improvements, Governance Best Practices).",
        "Use these templates during assessment reviews to provide consistent, high-quality feedback."
      ]
    },
    {
      id: "system-settings",
      title: "System Configuration",
      icon: Settings,
      content: [
        "Monitor system health through the dashboard metrics: active users, pending reviews, completed assessments.",
        "Access system logs and audit trails for troubleshooting and compliance purposes.",
        "Configure global settings such as default assessment templates and notification preferences.",
        "Manage data exports and reports for organizational insights and compliance reporting."
      ]
    },
    {
      id: "offline-mode",
      title: "Offline Mode",
      icon: AlertTriangle,
      content: [
        "The system supports offline functionality, allowing you to continue working without an internet connection.",
        "When offline: You can view existing data, but creating or updating records will be queued for sync when online.",
        "Data is automatically synchronized when the connection is restored.",
        "Look for the online/offline status indicator in the top-right corner of each page."
      ]
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: AlertTriangle,
      content: [
        "Common issues: Users can't access assessments → Check organization membership and role assignments.",
        "Assessment not loading → Verify categories are configured and questions exist for all assigned categories.",
        "Email notifications not working → Check organization domain configuration and user email verification.",
        "For technical issues, check the system health dashboard and contact support if needed."
      ]
    },
    {
      id: "best-practices",
      title: "Best Practices",
      icon: HelpCircle,
      content: [
        "Regularly review and update assessment questions to reflect current sustainability standards.",
        "Maintain consistent category weights across organizations for fair comparisons.",
        "Provide timely feedback on assessments to encourage continued engagement.",
        "Use standard recommendations to ensure consistent guidance across all organizations.",
        "Monitor system metrics to identify trends and areas for improvement."
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Offline Status Indicator */}
          <div className="mb-4 flex items-center justify-end">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="outline"
                onClick={() => navigate("/admin/dashboard")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Button>
            </div>
            <div className="flex items-center space-x-3 mb-4">
              <BookOpen className="w-8 h-8 text-dgrv-blue" />
              <h1 className="text-3xl font-bold text-dgrv-blue">
                Administrator Guide
              </h1>
            </div>
            <p className="text-lg text-gray-600">
              Complete guide for managing the DGRV sustainability assessment platform
            </p>
          </div>

          {/* Guide Sections */}
          <div className="space-y-6">
            {guideSection.map((section, index) => (
              <Card
                key={section.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <section.icon className="w-6 h-6 text-dgrv-blue" />
                    <span>{section.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {section.content.map((paragraph, pIndex) => (
                      <p key={pIndex} className="text-gray-700 leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact Support */}
          <Card className="mt-8 bg-dgrv-blue text-white">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <HelpCircle className="w-6 h-6" />
                <span>Need Additional Help?</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                If you need additional assistance or have questions not covered in this guide:
              </p>
              <div className="space-y-2">
                <p>📧 Email: support@dgrv.org</p>
                <p>📞 Phone: +27 (0) 11 000 0000</p>
                <p>🌐 Website: www.dgrv.org/support</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}; 