/*
 * Admin actions grid component for dashboard navigation
 * Displays action cards for quick access to admin functions
 */

import { FeatureCard } from "@/components/shared/FeatureCard";

interface AdminAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "green";
  onClick: () => void;
}

interface AdminActionsProps {
  actions: AdminAction[];
}

export const AdminActions: React.FC<AdminActionsProps> = ({ actions }) => {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
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