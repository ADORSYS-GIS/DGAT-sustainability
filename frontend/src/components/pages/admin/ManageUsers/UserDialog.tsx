// /frontend/src/components/pages/admin/ManageUsers/UserDialog.tsx
/**
 * @file Dialog component for adding or editing a user.
 * @description This component provides a form within a dialog for creating or updating a user.
 */
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OrganizationMember } from '@/openapi-rq/requests/types.gen';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface UserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: { email: string; roles: string[] };
  setFormData: React.Dispatch<React.SetStateAction<{ email: string; roles: string[] }>>;
  editingUser: OrganizationMember | null;
  selectedOrgName: string;
  isProcessing: boolean;
}

const UserDialog: React.FC<UserDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingUser,
  selectedOrgName,
  isProcessing,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingUser ? t('manageUsers.editUser') : t('manageUsers.addNewUser')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">{t('manageUsers.email')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
              placeholder={t('manageUsers.emailPlaceholder')}
            />
          </div>
          <div>
            <Label htmlFor="role">{t('manageUsers.role')}</Label>
            <Input
              id="role"
              value={t('manageUsers.organizationAdmin')}
              readOnly
              className="bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div>
            <Label htmlFor="organization">{t('manageUsers.organization')}</Label>
            <Input
              id="organization"
              value={selectedOrgName}
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
              disabled={isProcessing}
            >
              {isProcessing
                ? t('manageUsers.processing')
                : editingUser ? t('manageUsers.update') : t('manageUsers.create')}{' '}
              {t('manageUsers.user')}
            </Button>
            <Button variant="outline" onClick={onClose}>
              {t('manageUsers.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserDialog;