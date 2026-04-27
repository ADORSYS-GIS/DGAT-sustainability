import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  fullPage?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  text,
  fullPage = false,
}) => {
  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-10 h-10 border-3",
    lg: "w-16 h-16 border-4",
  };

  const containerClasses = fullPage
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
    : "flex flex-col items-center justify-center py-12 w-full";

  return (
    <div className={containerClasses}>
      <div className="relative">
        {/* Main outer ring */}
        <div
          className={`${sizeClasses[size]} animate-spin rounded-full border-gray-200 border-t-dgrv-blue`}
        />
        {/* Decorative pulsating inner circle */}
        <div
          className="absolute inset-0 m-auto w-1/3 h-1/3 rounded-full bg-dgrv-blue/20 animate-pulse"
        />
      </div>

      {text && (
        <div className="mt-4 flex flex-col items-center">
          <p className="text-sm font-medium text-gray-700 animate-pulse tracking-wide uppercase">
            {text}
          </p>
          <div className="mt-1 flex space-x-1">
            <span className="w-1 h-1 bg-dgrv-blue rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1 h-1 bg-dgrv-blue rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1 h-1 bg-dgrv-blue rounded-full animate-bounce"></span>
          </div>
        </div>
      )}
    </div>
  );
};
