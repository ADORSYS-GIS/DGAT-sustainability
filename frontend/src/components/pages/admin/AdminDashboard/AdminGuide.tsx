// /frontend/src/components/pages/admin/AdminDashboard/AdminGuide.tsx
/**
 * @file Admin guide summary component for the Admin Dashboard.
 * @description This component displays a summary of the admin guide with a link to the full guide.
 */
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const AdminGuide: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 lg:col-span-1">
      <Card
        className="animate-fade-in cursor-pointer hover:shadow-lg transition-shadow"
        style={{ animationDelay: "200ms" }}
        onClick={() => navigate("/admin/guide")}
      >
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-dgrv-blue" />
            <span>{t('adminDashboard.adminGuide')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-700">
            <p>{t('adminDashboard.guideIntro')}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t('adminDashboard.guideOrgsUsers')}</li>
              <li>{t('adminDashboard.guideReview')}</li>
              <li>{t('adminDashboard.guideCategoriesQuestions')}</li>
              <li>{t('adminDashboard.guideDocs')}</li>
              <li>{t('adminDashboard.guideSupport')}</li>
            </ul>
            <div className="pt-2">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full bg-dgrv-blue text-white hover:bg-blue-700"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/admin/guide");
                }}
              >
                {t('adminDashboard.viewCompleteGuide')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGuide;