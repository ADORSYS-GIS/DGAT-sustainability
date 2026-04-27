import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "hero";
  text?: string;
  fullPage?: boolean;
  minimal?: boolean;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  text,
  fullPage = false,
  minimal = false,
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-10 h-10 border-3",
    lg: "w-16 h-16 border-4",
    hero: "w-24 h-24 border-4",
  };

  const containerClasses = fullPage
    ? `fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/40 backdrop-blur-md transition-all duration-500 ${className}`
    : `flex flex-col items-center justify-center py-16 w-full animate-in fade-in duration-700 ${className}`;

  const spinnerContent = (
    <div className={`relative flex items-center justify-center ${minimal ? className : ""}`}>
      {/* Outer orbital ring */}
      <div
        className={`${sizeClasses[size]} rounded-full border-transparent border-t-dgrv-blue/40 border-l-dgrv-blue/40 animate-[spin_3s_linear_infinite]`}
      />

      {/* Middle fast ring */}
      <div
        className={`absolute ${size === "hero" ? "w-20 h-20" : "w-4/5 h-4/5"} rounded-full border-2 border-transparent border-t-dgrv-green border-r-dgrv-green animate-[spin_1.5s_linear_infinite]`}
      />

      {/* Inner pulsating branded circle */}
      <div
        className={`absolute ${size === "hero" ? "w-12 h-12" : "w-1/2 h-1/2"} rounded-full bg-gradient-to-tr from-dgrv-blue to-dgrv-green shadow-lg animate-pulse flex items-center justify-center`}
      >
        <div className="w-1/2 h-1/2 bg-white/20 rounded-full blur-sm animate-ping"></div>
      </div>

      {/* Floating particles effect (CSS only bubbles) */}
      {!minimal && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          <div className="absolute -top-4 -left-4 w-2 h-2 bg-dgrv-blue/30 rounded-full animate-bounce [animation-delay:-0.5s]"></div>
          <div className="absolute -bottom-4 -right-4 w-2 h-2 bg-dgrv-green/30 rounded-full animate-bounce"></div>
        </div>
      )}
    </div>
  );

  if (minimal) {
    return spinnerContent;
  }

  return (
    <div className={containerClasses}>
      {spinnerContent}

      <div className="mt-8 flex flex-col items-center max-w-sm px-6 text-center">
        <p className="text-base font-semibold text-gray-800 tracking-widest uppercase mb-2">
          {text || "Loading..."}
        </p>
        <div className="flex space-x-1.5">
          <div className="w-2 h-2 bg-dgrv-blue rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-dgrv-green rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-dgrv-blue rounded-full animate-bounce"></div>
        </div>
        <p className="mt-4 text-xs text-gray-500 font-medium italic opacity-70">
          DGRV Sustainability Tool
        </p>
      </div>
    </div>
  );
};
