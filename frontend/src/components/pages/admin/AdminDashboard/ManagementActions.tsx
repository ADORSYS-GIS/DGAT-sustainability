// /frontend/src/components/pages/admin/AdminDashboard/ManagementActions.tsx
/**
 * @file Management actions component for the Admin Dashboard.
 * @description This component displays a grid of feature cards for various admin actions.
 */
import { FeatureCard } from '@/components/shared/FeatureCard';
import { LucideIcon } from 'lucide-react';
import React from 'react';

interface AdminAction {
  title: string;
  description: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'gray' | 'purple';
  onClick: () => void;
}

interface ManagementActionsProps {
  actions: AdminAction[];
}

const ManagementActions: React.FC<ManagementActionsProps> = ({ actions }) => {
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

export default ManagementActions;