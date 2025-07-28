import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  FileText, 
  CheckSquare, 
  Star,
  Users,
  Download,
  HelpCircle,
  ArrowLeft,
  Play,
  Eye,
  Edit
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const UserGuide: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const guideSection = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: BookOpen,
      content: [
        "Welcome to the DGRV Sustainability Assessment Platform! This tool helps your cooperative measure and improve its sustainability practices.",
        "Your dashboard provides access to assessments, action plans, and progress tracking tools.",
        "If you're an organization administrator, you can create new assessments and manage team members. Organization users can answer assessments and track progress."
      ]
    },
    {
      id: "roles",
      title: "Understanding User Roles",
      icon: Users,
      content: [
        "Organization Administrator (org_admin): Can create new assessments, manage users, and view all organization data.",
        "Organization User (Org_User): Can answer assigned assessments, view results, and manage action plans.",
        "Both roles can access the dashboard, view submissions, and export reports for their organization."
      ]
    },
    {
      id: "assessments",
      title: "Taking Assessments",
      icon: FileText,
      content: [
        "Assessments are organized into categories (e.g., Environmental, Social, Governance) with questions in each category.",
        "For each question, provide: Yes/No response, percentage completion (0%, 25%, 50%, 75%, 100%), and detailed text explanation.",
        "You can attach files to support your answers (max 1MB per file). Use the paperclip icon to add documents.",
        "Save your progress anytime using 'Save Draft'. Complete all questions in a category before moving to the next one.",
        "Once submitted, assessments go through a review process before final approval."
      ]
    },
    {
      id: "action-plans",
      title: "Managing Action Plans",
      icon: CheckSquare,
      content: [
        "Action plans help you track improvement tasks based on assessment recommendations.",
        "Use the Kanban board to move tasks through stages: To Do → In Progress → Done → Approved.",
        "Add new tasks, set deadlines, and assign team members to track progress effectively.",
        "Regular updates to your action plan demonstrate continuous improvement efforts.",
        "Export action plans to share progress with stakeholders and management."
      ]
    },
    {
      id: "viewing-results",
      title: "Viewing Assessment Results",
      icon: Eye,
      content: [
        "Access all your submissions through 'View Assessments' on the dashboard.",
        "Track submission status: Pending Review → Under Review → Approved/Rejected/Revision Requested.",
        "View detailed feedback and recommendations from reviewers to understand improvement areas.",
        "Compare results across different assessment periods to track your cooperative's progress.",
        "Use the submission view to review your answers and supporting documents."
      ]
    },
    {
      id: "creating-assessments",
      title: "Creating Assessments (Admins Only)",
      icon: Play,
      content: [
        "Organization administrators can start new assessment cycles for their cooperative.",
        "Click 'Start Sustainability Assessment' to create a new assessment draft.",
        "Share the assessment ID with team members so they can contribute to different sections.",
        "Monitor progress and ensure all categories are completed before final submission.",
        "Only submit assessments when all required sections are thoroughly completed."
      ]
    },
    {
      id: "user-management",
      title: "Managing Team Members (Admins Only)",
      icon: Users,
      content: [
        "Organization administrators can add and manage team members through 'Manage Users'.",
        "Invite new users by email and assign appropriate roles based on their responsibilities.",
        "Assign category access to users so they can contribute to specific assessment areas.",
        "Remove users who no longer need access to maintain security and data integrity.",
        "Regularly review user permissions to ensure appropriate access levels."
      ]
    },
    {
      id: "reports-exports",
      title: "Reports and Exports",
      icon: Download,
      content: [
        "Export assessment reports in PDF format for sharing with stakeholders and boards.",
        "Use CSV exports for data analysis and tracking trends over time.",
        "Download Word documents for detailed documentation and reporting purposes.",
        "Regular report generation helps demonstrate continuous improvement efforts.",
        "Share reports with members and stakeholders to maintain transparency."
      ]
    },
    {
      id: "best-practices",
      title: "Best Practices for Cooperatives",
      icon: Star,
      content: [
        "Involve diverse team members in assessments to get comprehensive perspectives on sustainability practices.",
        "Provide detailed, honest answers with specific examples and supporting documentation.",
        "Use assessment results to create realistic, achievable action plans for improvement.",
        "Regular assessment cycles (annually or bi-annually) help track progress and maintain momentum.",
        "Celebrate improvements and share successes with your cooperative members and community."
      ]
    },
    {
      id: "troubleshooting",
      title: "Common Issues and Solutions",
      icon: HelpCircle,
      content: [
        "Can't access assessments: Check with your organization administrator about role assignments and category access.",
        "Assessment not saving: Ensure you're completing all required fields (Yes/No, percentage, and text explanation).",
        "File upload issues: Files must be under 1MB. Try reducing file size or using different formats.",
        "Can't see other team submissions: Only organization administrators can view all submissions.",
        "Missing assessment categories: Contact your administrator to verify category assignments for your organization."
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Button>
            </div>
            <div className="flex items-center space-x-3 mb-4">
              <BookOpen className="w-8 h-8 text-dgrv-green" />
              <h1 className="text-3xl font-bold text-dgrv-blue">
                User Guide for Cooperatives
              </h1>
            </div>
            <p className="text-lg text-gray-600">
              Complete guide for using the DGRV sustainability assessment platform
            </p>
          </div>

          {/* Quick Start Card */}
          <Card className="mb-8 bg-dgrv-green text-white">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <Play className="w-6 h-6" />
                <span>Quick Start</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>1. 📋 Start or answer an assessment from your dashboard</p>
                <p>2. ✏️ Complete all questions with detailed explanations</p>
                <p>3. 📎 Attach supporting documents where relevant</p>
                <p>4. ✅ Submit for review when complete</p>
                <p>5. 📊 Use results to create action plans and track progress</p>
              </div>
            </CardContent>
          </Card>

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
                    <section.icon className="w-6 h-6 text-dgrv-green" />
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

          {/* Tips for Success */}
          <Card className="mt-8 bg-dgrv-blue text-white">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <Star className="w-6 h-6" />
                <span>Tips for Successful Sustainability Assessments</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Before Starting:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Gather relevant documents and data</li>
                    <li>• Involve team members from different areas</li>
                    <li>• Review previous assessments if available</li>
                    <li>• Set aside adequate time for completion</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">During Assessment:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Be honest and specific in responses</li>
                    <li>• Provide concrete examples</li>
                    <li>• Upload supporting evidence</li>
                    <li>• Save drafts regularly</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card className="mt-8 border-dgrv-green border-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3 text-dgrv-green">
                <HelpCircle className="w-6 h-6" />
                <span>Need Help?</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                If you need assistance or have questions about using the platform:
              </p>
              <div className="space-y-2">
                <p>📧 Email: support@dgrv.org</p>
                <p>📞 Phone: +27 (0) 11 000 0000</p>
                <p>🌐 Website: www.dgrv.org/support</p>
                <p>💬 Contact your organization administrator for role-specific questions</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}; 