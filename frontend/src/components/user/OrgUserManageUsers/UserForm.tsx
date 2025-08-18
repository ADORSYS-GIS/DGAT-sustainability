/*
 * Displays the add/edit user dialog with form fields for email and categories
 * Handles form validation, submission, and role assignment for organization users
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import type { OrganizationMember } from "@/openapi-rq/requests/types.gen";

interface UserFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser: OrganizationMember | null;
  formData: {
    email: string;
    roles: string[];
    categories: string[];
  };
  setFormData:
    | ((
        updater: (prev: {
          email: string;
          roles: string[];
          categories: string[];
        }) => { email: string; roles: string[]; categories: string[] },
      ) => void)
    | ((data: {
        email: string;
        roles: string[];
        categories: string[];
      }) => void);
  categories: string[];
  onSubmit: () => void;
  onReset: () => void;
  isPending: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({
  isOpen,
  onOpenChange,
  editingUser,
  formData,
  setFormData,
  categories,
  onSubmit,
  onReset,
  isPending,
}) => {
  const { t } = useTranslation();

  const handleOpenChange = (open: boolean) => {
    if (!open) onReset();
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                (
                  setFormData as (
                    updater: (prev: {
                      email: string;
                      roles: string[];
                      categories: string[];
                    }) => {
                      email: string;
                      roles: string[];
                      categories: string[];
                    },
                  ) => void
                )((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="Enter email"
            />
          </div>
          <div>
            <Label htmlFor="categories">Categories</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {categories.map((cat) => (
                <label key={cat} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(cat)}
                    onChange={(e) => {
                      (
                        setFormData as (
                          updater: (prev: {
                            email: string;
                            roles: string[];
                            categories: string[];
                          }) => {
                            email: string;
                            roles: string[];
                            categories: string[];
                          },
                        ) => void
                      )((prev) => ({
                        ...prev,
                        categories: e.target.checked
                          ? [...prev.categories, cat]
                          : prev.categories.filter((c) => c !== cat),
                      }));
                    }}
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={t("manageUsers.orgUser")}
              readOnly
              className="bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div className="flex space-x-2 pt-4">
            <Button
              onClick={onSubmit}
              className="bg-dgrv-green hover:bg-green-700"
              disabled={isPending}
            >
              {isPending
                ? t("common.processing")
                : editingUser
                  ? t("common.update")
                  : t("common.create")}{" "}
              {t("manageUsers.user")}
            </Button>
            <Button variant="outline" onClick={onReset}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
