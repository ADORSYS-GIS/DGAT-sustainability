// /frontend/src/components/pages/admin/AdminDashboard/WelcomeHeader.tsx
/**
 * @file Welcome header component for the Admin Dashboard.
 * @description This component displays a welcome message and an introduction for the admin user.
 */
import { Settings } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const WelcomeHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Settings className="w-8 h-8 text-dgrv-blue" />
          <h1 className="text-3xl font-bold text-dgrv-blue">
            {t('adminDashboard.welcome')}
          </h1>
        </div>
      </div>
      <p className="text-lg text-gray-600">
        {t('adminDashboard.intro')}
      </p>
    </div>
  );
};

export default WelcomeHeader;