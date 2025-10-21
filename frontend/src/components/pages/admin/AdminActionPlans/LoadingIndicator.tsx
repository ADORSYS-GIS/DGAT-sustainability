// /frontend/src/components/pages/admin/AdminActionPlans/LoadingIndicator.tsx
/**
 * @file Loading indicator component for the Admin Action Plans page.
 * @description This component displays a loading spinner and a message while data is being fetched.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

const LoadingIndicator: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">{t('adminActionPlans.loading', { defaultValue: 'Loading action plans...' })}</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingIndicator;