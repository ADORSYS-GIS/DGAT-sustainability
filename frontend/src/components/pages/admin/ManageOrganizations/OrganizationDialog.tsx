// /frontend/src/components/pages/admin/ManageOrganizations/OrganizationDialog.tsx
/**
 * @file Dialog component for adding or editing an organization.
 * @description This component provides a form within a dialog for creating or updating an organization.
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
import type { OrganizationCreateRequest } from '@/openapi-rq/requests/types.gen';
import { Trash2 } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface OrganizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: OrganizationCreateRequest;
  setFormData: React.Dispatch<React.SetStateAction<OrganizationCreateRequest>>;
  editingOrg: boolean;
  handleDomainChange: (idx: number, value: string) => void;
  addDomain: () => void;
  removeDomain: (idx: number) => void;
}

const OrganizationDialog: React.FC<OrganizationDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingOrg,
  handleDomainChange,
  addDomain,
  removeDomain,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingOrg
              ? t('manageOrganizations.editOrganization')
              : t('manageOrganizations.addOrganization')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 p-2 md:p-4">
          <div>
            <Label
              htmlFor="name"
              className="font-semibold text-dgrv-blue"
            >
              {t('manageOrganizations.organizationName')}
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              placeholder={t(
                'manageOrganizations.organizationNamePlaceholder'
              )}
              className="mt-1 border-gray-300 focus:border-dgrv-blue focus:ring-dgrv-blue rounded shadow-sm"
            />
          </div>
          <div>
            <Label className="font-semibold text-dgrv-blue">
              {t('manageOrganizations.domains')}{' '}
              <span className="text-red-500">*</span>
            </Label>
            {formData.domains?.map((d, idx) => (
              <div
                key={idx}
                className="flex items-center space-x-2 mb-2"
              >
                <Input
                  value={d.name}
                  onChange={(e) =>
                    handleDomainChange(idx, e.target.value)
                  }
                  placeholder={t('manageOrganizations.domainPlaceholder')}
                  className={`border-gray-300 focus:border-dgrv-blue focus:ring-dgrv-blue rounded shadow-sm ${!d?.name?.trim() ? "border-red-500" : ""}`}
                  required
                />
                {formData.domains && formData.domains.length > 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeDomain(idx)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addDomain}
              className="mt-1"
            >
              + {t('manageOrganizations.addDomain')}
            </Button>
          </div>
          <div className="flex space-x-2 pt-4">
            <Button
              onClick={onSubmit}
              className="bg-dgrv-green hover:bg-green-700 px-6 py-2 text-base font-semibold rounded shadow"
            >
              {editingOrg
                ? t('manageOrganizations.update')
                : t('manageOrganizations.create')}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6 py-2 text-base font-semibold rounded shadow"
            >
              {t('manageOrganizations.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrganizationDialog;