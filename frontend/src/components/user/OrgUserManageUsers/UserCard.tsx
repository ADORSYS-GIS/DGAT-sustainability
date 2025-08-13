/*
 * Displays individual user cards with user information and management actions
 * Shows user details, verification status, categories, and edit/delete buttons
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Mail, Trash2, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrganizationMember } from "@/openapi-rq/requests/types.gen";

interface UserCardProps {
  user: OrganizationMember & { categories?: string[] };
  orgName: string;
  index: number;
  onEdit: (user: OrganizationMember & { categories?: string[] }) => void;
  onDelete: (userId: string) => void;
  isDeleting: boolean;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  orgName,
  index,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  const { t } = useTranslation();

  return (
    <Card
      key={user.id}
      className="animate-fade-in hover:shadow-lg transition-shadow"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-dgrv-blue/10">
              <Users className="w-5 h-5 text-dgrv-blue" />
            </div>
            <div>
              <span className="text-lg font-semibold">
                {user.firstName} {user.lastName}
              </span>
              <p className="text-sm font-normal text-gray-600">
                @{user.username}
              </p>
              <p className="text-xs text-gray-500">Org: {orgName}</p>
            </div>
          </div>
          <Badge
            className={
              user.emailVerified
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            }
          >
            {user.emailVerified ? t('manageUsers.verified') : t('manageUsers.notVerified')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Mail className="w-4 h-4" />
            <span>{user.email}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs mt-2">
            {user.categories &&
              user.categories.length > 0 &&
              user.categories.map((cat: string) => (
                <Badge
                  key={cat}
                  className="bg-blue-100 text-blue-700"
                >
                  {cat}
                </Badge>
              ))}
          </div>
          <div className="flex space-x-2 pt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(user)}
              className="flex-1"
              disabled={false}
            >
              <Edit className="w-4 h-4 mr-1" />
              {t('common.edit')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(user.id)}
              className="text-red-600 hover:bg-red-50"
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 