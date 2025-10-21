/**
 * @file Header.tsx
 * @description This file defines the Header component for the OrgUserManageUsers page.
 */
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  orgName: string;
  onInviteUser: () => void;
}

export const Header: React.FC<HeaderProps> = ({ orgName, onInviteUser }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-6">
      <Button
        variant="outline"
        onClick={() => navigate("/user/dashboard")}
        className="px-4 py-2 text-base font-semibold rounded shadow border-2 border-dgrv-blue text-dgrv-blue hover:bg-dgrv-blue/10 transition"
      >
        <span className="mr-2">&larr;</span> Back to Dashboard
      </Button>
      <Button
        className="bg-dgrv-green hover:bg-green-700"
        onClick={onInviteUser}
      >
        + Invite User
      </Button>
    </div>
  );
};