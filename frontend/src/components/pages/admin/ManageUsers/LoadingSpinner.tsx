/**
 * @file Loading spinner component.
 * @description This component displays a loading spinner.
 */
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;