/**
 * @file GuideSection.tsx
 * @description This file defines the GuideSection component for the UserGuide page.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface GuideSectionProps {
  id: string;
  title: string;
  icon: LucideIcon;
  content: string[];
  index: number;
}

export const GuideSection: React.FC<GuideSectionProps> = ({
  id,
  title,
  icon: Icon,
  content,
  index,
}) => {
  return (
    <Card
      key={id}
      className="animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          <Icon className="w-6 h-6 text-dgrv-green" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {content.map((paragraph, pIndex) => (
            <p key={pIndex} className="text-gray-700 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};