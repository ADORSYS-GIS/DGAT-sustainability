/**
 * @file LoadingSpinner.tsx
 * @description This file defines a simple loading spinner component.
 */
import React from "react";

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="pb-8 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
    </div>
  );
};