/*
 * Displays the manage users header with back button and add user button
 * Shows organization name and navigation controls for user management
 */

import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface ManageUsersHeaderProps {
  orgName: string;
  onBackToDashboard: () => void;
  onAddUser: () => void;
}

export const ManageUsersHeader: React.FC<ManageUsersHeaderProps> = ({
  orgName,
  onBackToDashboard,
  onAddUser,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          onClick={onBackToDashboard}
          className="px-4 py-2 text-base font-semibold rounded shadow border-2 border-dgrv-blue text-dgrv-blue hover:bg-dgrv-blue/10 transition"
        >
          <span className="mr-2">&larr;</span> Back to Dashboard
        </Button>
        <Button
          className="bg-dgrv-green hover:bg-green-700"
          onClick={onAddUser}
        >
          + Add User
        </Button>
      </div>
      <p className="text-lg text-gray-600 mb-6">
        Add and manage users across{" "}
        <span className="font-semibold text-dgrv-blue">{orgName}</span>
      </p>
    </>
  );
};
