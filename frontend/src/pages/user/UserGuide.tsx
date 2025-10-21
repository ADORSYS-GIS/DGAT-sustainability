/**
 * @file UserGuide.tsx
 * @description This file defines the UserGuide page, which provides users with information on how to use the application.
 */
import React from "react";
import {
  BookOpen,
  FileText,
  CheckSquare,
  Star,
  Users,
  Download,
  HelpCircle,
  Play,
  Eye,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/pages/user/UserGuide/Header";
import { QuickStartCard } from "@/components/pages/user/UserGuide/QuickStartCard";
import { GuideSection } from "@/components/pages/user/UserGuide/GuideSection";
import { TipsForSuccessCard } from "@/components/pages/user/UserGuide/TipsForSuccessCard";
import { ContactSupportCard } from "@/components/pages/user/UserGuide/ContactSupportCard";

export const UserGuide: React.FC = () => {
  const { t } = useTranslation();

  const guideSections = [
    {
      id: "getting-started",
      title: t("userGuide.sections.gettingStarted.title"),
      icon: BookOpen,
      content: t("userGuide.sections.gettingStarted.content", {
        returnObjects: true,
      }) as string[],
    },
    {
      id: "roles",
      title: t("userGuide.sections.roles.title"),
      icon: Users,
      content: t("userGuide.sections.roles.content", {
        returnObjects: true,
      }) as string[],
    },
    {
      id: "assessments",
      title: t("userGuide.sections.assessments.title"),
      icon: FileText,
      content: t("userGuide.sections.assessments.content", {
        returnObjects: true,
      }) as string[],
    },
    {
      id: "action-plans",
      title: t("userGuide.sections.actionPlans.title"),
      icon: CheckSquare,
      content: t("userGuide.sections.actionPlans.content", {
        returnObjects: true,
      }) as string[],
    },
    {
      id: "viewing-results",
      title: t("userGuide.sections.viewingResults.title"),
      icon: Eye,
      content: t("userGuide.sections.viewingResults.content", {
        returnObjects: true,
      }) as string[],
    },
    {
      id: "creating-assessments",
      title: t("userGuide.sections.creatingAssessments.title"),
      icon: Play,
      content: t("userGuide.sections.creatingAssessments.content", {
        returnObjects: true,
      }) as string[],
    },
    {
      id: "user-management",
      title: t("userGuide.sections.userManagement.title"),
      icon: Users,
      content: t("userGuide.sections.userManagement.content", {
        returnObjects: true,
      }) as string[],
    },
    {
      id: "reports-exports",
      title: t("userGuide.sections.reportsExports.title"),
      icon: Download,
      content: t("userGuide.sections.reportsExports.content", {
        returnObjects: true,
      }) as string[],
    },
    {
      id: "best-practices",
      title: t("userGuide.sections.bestPractices.title"),
      icon: Star,
      content: t("userGuide.sections.bestPractices.content", {
        returnObjects: true,
      }) as string[],
    },
    {
      id: "troubleshooting",
      title: t("userGuide.sections.troubleshooting.title"),
      icon: HelpCircle,
      content: t("userGuide.sections.troubleshooting.content", {
        returnObjects: true,
      }) as string[],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Header />
          <QuickStartCard />
          <div className="space-y-6">
            {guideSections.map((section, index) => (
              <GuideSection
                key={section.id}
                id={section.id}
                title={section.title}
                icon={section.icon}
                content={section.content}
                index={index}
              />
            ))}
          </div>
          <TipsForSuccessCard />
          <ContactSupportCard />
        </div>
      </div>
    </div>
  );
};