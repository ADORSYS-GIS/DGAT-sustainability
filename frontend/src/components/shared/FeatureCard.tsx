/*
 * Reusable feature card component for displaying action items
 * Shows icons, titles, descriptions, and handles click events
 */

import React from "react";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color?: "blue" | "green";
  onClick?: () => void;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  color = "blue",
  onClick,
}) => {
  const colorClasses = {
    blue: "border-blue-200 hover:border-dgrv-blue bg-blue-50/50",
    green: "border-green-200 hover:border-dgrv-green bg-green-50/50",
  };

  const iconColorClasses = {
    blue: "text-dgrv-blue",
    green: "text-dgrv-green",
  };

  return (
    <div
      className={`p-6 rounded-lg border-2 transition-all duration-300 hover-lift cursor-pointer ${colorClasses[color]}`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-4 mb-3">
        <div
          className={`p-3 rounded-full bg-white shadow-sm ${iconColorClasses[color]}`}
        >
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
};
