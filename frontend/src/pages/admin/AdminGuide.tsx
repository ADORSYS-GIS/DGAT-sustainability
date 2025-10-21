// /frontend/src/pages/admin/AdminGuide.tsx
/**
 * @file Admin Guide page.
 * @description This page provides a comprehensive guide for administrators.
 */
import BestPractices from '@/components/pages/admin/AdminGuide/BestPractices';
import ContactSupport from '@/components/pages/admin/AdminGuide/ContactSupport';
import GuideHeader from '@/components/pages/admin/AdminGuide/GuideHeader';
import GuideSection from '@/components/pages/admin/AdminGuide/GuideSection';
import QuickStartCard from '@/components/pages/admin/AdminGuide/QuickStartCard';
import { useOfflineSyncStatus } from "@/hooks/useOfflineSync";
import {
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

export const AdminGuide: React.FC = () => {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSyncStatus();

  const guideSections = [
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

          <GuideHeader />
          <QuickStartCard />

          <div className="space-y-6">
            {guideSections.map((section, index) => (
              <GuideSection key={section.id} section={section} index={index} />
            ))}
          </div>

          <BestPractices />
          <ContactSupport />
        </div>
      </div>
    </div>
  );
};
