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
  Edit,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const UserGuide: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const guideSection = [
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
                <span>{t("userGuide.backToDashboard")}</span>
              </Button>
            </div>
            <div className="flex items-center space-x-3 mb-4">
              <BookOpen className="w-8 h-8 text-dgrv-green" />
              <h1 className="text-3xl font-bold text-dgrv-blue">
                {t("userGuide.title")}
              </h1>
            </div>
            <p className="text-lg text-gray-600">{t("userGuide.subtitle")}</p>
          </div>

          {/* Quick Start Card */}
          <Card className="mb-8 bg-dgrv-green text-white">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <Play className="w-6 h-6" />
                <span>{t("userGuide.quickStart.title")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>{t("userGuide.quickStart.step1")}</p>
                <p>{t("userGuide.quickStart.step2")}</p>
                <p>{t("userGuide.quickStart.step3")}</p>
                <p>{t("userGuide.quickStart.step4")}</p>
                <p>{t("userGuide.quickStart.step5")}</p>
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
                <span>{t("userGuide.tipsForSuccess.title")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">
                    {t("userGuide.tipsForSuccess.beforeStarting.title")}
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {t("userGuide.tipsForSuccess.beforeStarting.items", {
                      returnObjects: true,
                    }).map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">
                    {t("userGuide.tipsForSuccess.duringAssessment.title")}
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {t("userGuide.tipsForSuccess.duringAssessment.items", {
                      returnObjects: true,
                    }).map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
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
                <span>{t("userGuide.needHelp.title")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{t("userGuide.needHelp.description")}</p>
              <div className="space-y-2">
                <p>{t("userGuide.needHelp.email")}</p>
                <p>{t("userGuide.needHelp.phone")}</p>
                <p>{t("userGuide.needHelp.website")}</p>
                <p>{t("userGuide.needHelp.contactAdmin")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
