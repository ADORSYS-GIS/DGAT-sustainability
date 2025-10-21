// /frontend/src/components/pages/admin/AdminGuide/GuideSection.tsx
/**
 * @file Guide section component for the Admin Guide page.
 * @description This component displays a single section of the admin guide with a title, icon, and content.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import React from 'react';

interface GuideSectionProps {
  section: {
    id: string;
    title: string;
    icon: LucideIcon;
    content: string[];
  };
  index: number;
}

const GuideSection: React.FC<GuideSectionProps> = ({ section, index }) => {
  return (
    <Card
      className="animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          <section.icon className="w-6 h-6 text-dgrv-blue" />
          <span>{section.title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {section.content.map((paragraph, pIndex) => (
            <p key={pIndex} className="text-gray-700 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default GuideSection;