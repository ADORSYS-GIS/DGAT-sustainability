/**
 * @file NoUsers.tsx
 * @description This file defines the NoUsers component for the OrgUserManageUsers page.
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NoUsersProps {
  onAddUser: () => void;
}

export const NoUsers: React.FC<NoUsersProps> = ({ onAddUser }) => {
  const { t } = useTranslation();

  return (
    <Card className="md:col-span-2 lg:col-span-3 text-center py-12">
      <CardContent>
        <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t("manageUsers.noUsersYet")}
        </h3>
        <p className="text-gray-600 mb-6">
          {t("manageUsers.addFirstUserDesc")}
        </p>
        <Button
          onClick={onAddUser}
          className="bg-dgrv-green hover:bg-green-700"
        >
          {t("manageUsers.addFirstUser")}
        </Button>
      </CardContent>
    </Card>
  );
};