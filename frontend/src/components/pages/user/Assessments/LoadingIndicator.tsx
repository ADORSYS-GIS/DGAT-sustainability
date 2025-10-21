/**
 * @file LoadingIndicator.tsx
 * @description This file defines the loading indicator component for the Assessments page.
 */
import React from "react";

export const LoadingIndicator: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
      </div>
    </div>
  );
};