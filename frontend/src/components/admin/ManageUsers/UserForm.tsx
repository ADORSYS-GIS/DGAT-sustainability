/*
 * User form component for creating and editing users
 * Provides dialog interface for user management with role assignment
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import type { OrganizationResponse } from "@/openapi-rq/requests/types.gen";

interface UserFormProps {
  showAddDialog: boolean;
  setShowAddDialog: (show: boolean) => void;
  editingUser: { id: string; email: string } | null;
  formData: {
    email: string;
    roles: string[];
  };
  setFormData: (data: { email: string; roles: string[] }) =>
    | void
    | ((
        updater: (prev: { email: string; roles: string[] }) => {
          email: string;
          roles: string[];
        },
      ) => void);
  onSubmit: () => void;
  resetForm: () => void;
  selectedOrg: OrganizationResponse | null;
  isPending: boolean;
  isCreatingUser: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({
  showAddDialog,
  setShowAddDialog,
  editingUser,
  formData,
  setFormData,
  onSubmit,
  resetForm,
  selectedOrg,
  isPending,
  isCreatingUser,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={showAddDialog}
      onOpenChange={(open) => {
        if (!open) resetForm();
        setShowAddDialog(open);
      }}
    >
      <DialogTrigger asChild></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingUser
              ? t("manageUsers.editUser")
              : t("manageUsers.addNewUser")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">{t("manageUsers.email")}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                (typeof setFormData === "function"
                  ? (setFormData as (
                      updater: (prev: { email: string; roles: string[] }) => {
                        email: string;
                        roles: string[];
                      },
                    ) => void)
                  : setFormData)((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
              placeholder={t("manageUsers.emailPlaceholder")}
            />
          </div>
          <div>
            <Label htmlFor="role">{t("manageUsers.role")}</Label>
            <Input
              id="role"
              value={t("manageUsers.organizationAdmin")}
              readOnly
              className="bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div>
            <Label htmlFor="organization">
              {t("manageUsers.organization")}
            </Label>
            <Input
              id="organization"
              value={selectedOrg?.name || ""}
              readOnly
              disabled
              className="bg-gray-100 cursor-not-allowed"
              placeholder="Current organization"
            />
          </div>
          <div className="flex space-x-2 pt-4">
            <Button
              onClick={onSubmit}
              className="bg-dgrv-green hover:bg-green-700"
              disabled={isPending || isCreatingUser}
            >
              {isPending || isCreatingUser
                ? t("manageUsers.processing", { defaultValue: "Processing..." })
                : editingUser
                  ? t("manageUsers.update")
                  : t("manageUsers.create")}{" "}
              {t("manageUsers.user")}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              {t("manageUsers.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
