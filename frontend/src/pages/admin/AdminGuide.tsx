import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOfflineSyncStatus } from "@/hooks/useOfflineSync";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CheckSquare,
  FileText,
  HelpCircle,
  List,
  Settings,
  Star,
  Users
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const AdminGuide: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOnline } = useOfflineSyncStatus();

  const guideSection = [
    {
      id: "overview",
      title: t('adminGuide.sections.overview.title'),
      icon: BookOpen,
      content: t('adminGuide.sections.overview.content', { returnObjects: true }) as string[]
    },
    {
      id: "organizations",
      title: t('adminGuide.sections.organizations.title'),
      icon: Building2,
      content: t('adminGuide.sections.organizations.content', { returnObjects: true }) as string[]
    },
    {
      id: "users",
      title: t('adminGuide.sections.users.title'),
      icon: Users,
      content: t('adminGuide.sections.users.content', { returnObjects: true }) as string[]
    },
    {
      id: "categories",
      title: t('adminGuide.sections.categories.title'),
      icon: List,
      content: t('adminGuide.sections.categories.content', { returnObjects: true }) as string[]
    },
    {
      id: "questions",
      title: t('adminGuide.sections.questions.title'),
      icon: FileText,
      content: t('adminGuide.sections.questions.content', { returnObjects: true }) as string[]
    },
    {
      id: "reviews",
      title: t('adminGuide.sections.reviews.title'),
      icon: CheckSquare,
      content: t('adminGuide.sections.reviews.content', { returnObjects: true }) as string[]
    },
    {
      id: "recommendations",
      title: t('adminGuide.sections.recommendations.title'),
      icon: Star,
      content: t('adminGuide.sections.recommendations.content', { returnObjects: true }) as string[]
    },
    {
      id: "systemHealth",
      title: t('adminGuide.sections.systemHealth.title'),
      icon: Settings,
      content: t('adminGuide.sections.systemHealth.content', { returnObjects: true }) as string[]
    },
    {
      id: "support",
      title: t('adminGuide.sections.support.title'),
      icon: HelpCircle,
      content: t('adminGuide.sections.support.content', { returnObjects: true }) as string[]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-8">
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
                <span>{t('adminGuide.backToDashboard')}</span>
              </Button>
            </div>
            <div className="flex items-center space-x-3 mb-4">
              <BookOpen className="w-8 h-8 text-dgrv-blue" />
              <h1 className="text-3xl font-bold text-dgrv-blue">
                {t('adminGuide.title')}
              </h1>
            </div>
            <p className="text-lg text-gray-600">
              {t('adminGuide.subtitle')}
            </p>
          </div>

          {/* Quick Start Card */}
          <Card className="mb-8 bg-dgrv-blue text-white">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <BookOpen className="w-6 h-6" />
                <span>{t('adminGuide.quickStart.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>{t('adminGuide.quickStart.step1')}</p>
                <p>{t('adminGuide.quickStart.step2')}</p>
                <p>{t('adminGuide.quickStart.step3')}</p>
                <p>{t('adminGuide.quickStart.step4')}</p>
                <p>{t('adminGuide.quickStart.step5')}</p>
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

          {/* Best Practices */}
          <Card className="mt-8 bg-dgrv-green text-white">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <Star className="w-6 h-6" />
                <span>{t('adminGuide.bestPractices.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">{t('adminGuide.bestPractices.regularReviews.title')}</h4>
                  <ul className="space-y-1 text-sm">
                    {(t('adminGuide.bestPractices.regularReviews.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">{t('adminGuide.bestPractices.qualityAssurance.title')}</h4>
                  <ul className="space-y-1 text-sm">
                    {(t('adminGuide.bestPractices.qualityAssurance.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card className="mt-8 border-dgrv-blue border-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3 text-dgrv-blue">
                <HelpCircle className="w-6 h-6" />
                <span>{t('adminGuide.contactInfo.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                {t('adminGuide.contactInfo.description')}
              </p>
              <div className="space-y-2">
                <p>{t('adminGuide.contactInfo.email')}</p>
                <p>{t('adminGuide.contactInfo.phone')}</p>
                <p>{t('adminGuide.contactInfo.website')}</p>
                <p>{t('adminGuide.contactInfo.documentation')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}; 
