/**
 * @file UserDialog.tsx
 * @description This file defines the UserDialog component for adding or editing a user.
 */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrgAdminUserInvitationForm } from "@/components/shared/OrgAdminUserInvitationForm";
import { OrganizationMember } from "@/openapi-rq/requests/types.gen";
import { useTranslation } from "react-i18next";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser: OrganizationMember | null;
  formData: {
    email: string;
    roles: string[];
    categories: string[];
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      email: string;
      roles: string[];
      categories: string[];
    }>
  >;
  isLoadingCategories: boolean;
  availableCategories: { category_catalog_id: string; name: string }[];
  handleSubmit: () => void;
  resetForm: () => void;
  isSubmitting: boolean;
  orgId: string;
  orgName: string;
  onInvitationCreated: () => void;
}

export const UserDialog: React.FC<UserDialogProps> = ({
  open,
  onOpenChange,
  editingUser,
  formData,
  setFormData,
  isLoadingCategories,
  availableCategories,
  handleSubmit,
  resetForm,
  isSubmitting,
  orgId,
  orgName,
  onInvitationCreated,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {editingUser ? t("manageUsers.editUser") : "Invite New User"}
          </DialogTitle>
        </DialogHeader>
        {editingUser ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="Enter email"
              />
            </div>
            <div>
              <Label htmlFor="categories">Categories</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {isLoadingCategories ? (
                  <p>Loading categories...</p>
                ) : (
                  availableCategories.map((cat) => (
                    <label
                      key={cat.category_catalog_id}
                      className="flex items-center gap-1"
                    >
                      <input
                        type="checkbox"
                        checked={formData.categories.includes(
                          cat.category_catalog_id
                        )}
                        onChange={(e) => {
                          const categoryId = cat.category_catalog_id;
                          setFormData((prev) => ({
                            ...prev,
                            categories: e.target.checked
                              ? [...prev.categories, categoryId]
                              : prev.categories.filter(
                                  (c) => c !== categoryId
                                ),
                          }));
                        }}
                      />
                      <span>{cat.name}</span>
                    </label>
                  ))
                )}
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
                onClick={handleSubmit}
                className="bg-dgrv-green hover:bg-green-700"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? t("common.processing")
                  : editingUser
                  ? t("common.update")
                  : t("common.create")}{" "}
                {t("manageUsers.user")}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <OrgAdminUserInvitationForm
            organizationId={orgId}
            organizationName={orgName}
            onInvitationCreated={onInvitationCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};