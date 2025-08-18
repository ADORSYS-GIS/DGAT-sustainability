/*
 * System statistics display component for admin dashboard
 * Shows key metrics and statistics in a grid layout with loading states
 */

import { Card, CardContent } from "@/components/ui/card";

interface SystemStat {
  label: string;
  value: number;
  color: string;
  loading: boolean;
}

interface SystemStatsProps {
  stats: SystemStat[];
}

export const SystemStats: React.FC<SystemStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <Card
          key={stat.label}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-dgrv-blue mb-1">
              {stat.loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-dgrv-blue"></div>
                </div>
              ) : (
                stat.value
              )}
            </div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
