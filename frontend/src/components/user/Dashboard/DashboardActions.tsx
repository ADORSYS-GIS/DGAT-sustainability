/*
 * Displays the grid of action cards for dashboard navigation
 * Renders feature cards with animations and handles user interactions
 */

import { FeatureCard } from "@/components/shared/FeatureCard";
import { useTranslation } from "react-i18next";

interface DashboardAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "green" | "blue";
  onClick: () => void;
}

interface DashboardActionsProps {
  actions: DashboardAction[];
}

export const DashboardActions: React.FC<DashboardActionsProps> = ({
  actions,
}) => {
  return (
    <div className="grid md:grid-cols-3 gap-6 mb-12">
      {actions.map((action, index) => (
        <div
          key={action.title}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <FeatureCard {...action} />
        </div>
      ))}
    </div>
  );
};
