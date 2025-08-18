/*
 * User list component for displaying and managing users
 * Shows user cards with edit/delete actions in a grid layout
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Edit, Trash2, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrganizationMember } from "@/openapi-rq/requests/types.gen";

interface UserListProps {
  users: OrganizationMember[];
  onEdit: (user: OrganizationMember) => void;
  onDelete: (userId: string) => void;
  isPending: boolean;
  selectedOrgName: string;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  onEdit,
  onDelete,
  isPending,
  selectedOrgName,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {users.map((user, index) => (
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
                  <span className="text-lg">
                    {user.firstName} {user.lastName}
                  </span>
                  <p className="text-sm font-normal text-gray-600">
                    @{user.username}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("manageUsers.orgLabel")}{" "}
                    {selectedOrgName || t("manageUsers.unknown")}
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
                {user.emailVerified
                  ? t("manageUsers.verified")
                  : t("manageUsers.notVerified")}
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
                  disabled={isPending}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(user.id)}
                  className="text-red-600 hover:bg-red-50"
                  disabled={isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {users.length === 0 && (
        <Card className="md:col-span-2 lg:col-span-3 text-center py-12">
          <CardContent>
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t("manageUsers.noUsersYet")}
            </h3>
            <p className="text-gray-600">
              {t("manageUsers.noUsersDescription")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
