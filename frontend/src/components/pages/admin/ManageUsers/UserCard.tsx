// /frontend/src/components/pages/admin/ManageUsers/UserCard.tsx
/**
 * @file Card component for displaying user details.
 * @description This component renders a card with information about a user, including actions to edit or delete them.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OrganizationMember } from '@/openapi-rq/requests/types.gen';
import { Edit, Mail, Trash2, Users } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface UserCardProps {
  user: OrganizationMember;
  onEdit: (user: OrganizationMember) => void;
  onDelete: (user: OrganizationMember) => void;
  selectedOrgName: string;
  isDeleting: boolean;
  index: number;
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  onEdit,
  onDelete,
  selectedOrgName,
  isDeleting,
  index,
}) => {
  const { t } = useTranslation();

  return (
    <Card
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
              <span className="text-lg">
                {user.firstName} {user.lastName}
              </span>
              <p className="text-sm font-normal text-gray-600">
                @{user.username}
              </p>
              <p className="text-xs text-gray-500">
                {t('manageUsers.orgLabel')}{" "}
                {selectedOrgName || t('manageUsers.unknown')}
              </p>
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
          <div className="flex space-x-2 pt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(user)}
              className="flex-1"
              disabled={false}
            >
              <Edit className="w-4 h-4 mr-1" />
              {t('manageUsers.edit')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(user)}
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

export default UserCard;