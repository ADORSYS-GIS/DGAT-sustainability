// /frontend/src/components/pages/admin/ManageCategories/CategoryDialog.tsx
/**
 * @file Dialog component for adding or editing a category.
 * @description This component provides a form within a dialog for creating or updating a category.
 */
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OfflineCategoryCatalog } from '@/types/offline';
import { Plus } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface CategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    name: string;
    description: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{ name: string; description: string }>>;
  editingCategory: OfflineCategoryCatalog | null;
  isPending: boolean;
}

const CategoryDialog: React.FC<CategoryDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingCategory,
  isPending,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingCategory ? t('manageCategories.editCategory') : t('manageCategories.addCategory')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t('manageCategories.categoryName')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              placeholder={t('manageCategories.categoryNamePlaceholder')}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">{t('manageCategories.categoryDescription')}</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder={t('manageCategories.categoryDescriptionPlaceholder', { defaultValue: 'Enter category description...' })}
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-dgrv-blue hover:bg-blue-700"
            disabled={isPending}
          >
            {isPending
              ? t('manageCategories.saving', { defaultValue: 'Saving...' })
              : editingCategory
                ? t('manageCategories.updateCategory')
                : t('manageCategories.createCategory')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryDialog;