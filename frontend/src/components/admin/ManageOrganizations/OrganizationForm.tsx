/*
 * Organization form component for creating and editing organizations
 * Provides dialog interface with domain management and category assignment
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Category {
  categoryId: string;
  name: string;
  weight: number;
  order: number;
  templateId: string;
}

interface OrganizationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
  editingOrg: any;
  formData: {
    name: string;
    domains: { name: string }[];
    attributes: { categories: string[] };
  };
  setFormData: (data: any) => void;
  categories: Category[];
  categoriesLoading: boolean;
  showCategoryCreation: boolean;
  setShowCategoryCreation: (show: boolean) => void;
  categoryFormData: {
    name: string;
    weight: number;
    order: number;
  };
  setCategoryFormData: (data: any) => void;
  handleDomainChange: (idx: number, value: string) => void;
  addDomain: () => void;
  removeDomain: (idx: number) => void;
  handleCreateCategory: () => void;
  resetForm: () => void;
}

export const OrganizationForm: React.FC<OrganizationFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  editingOrg,
  formData,
  setFormData,
  categories,
  categoriesLoading,
  showCategoryCreation,
  setShowCategoryCreation,
  categoryFormData,
  setCategoryFormData,
  handleDomainChange,
  addDomain,
  removeDomain,
  handleCreateCategory,
  resetForm,
}) => {
  const { t } = useTranslation();

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCategoryChange = (categoryName: string) => {
    setFormData({
      ...formData,
      attributes: {
        ...formData.attributes,
        categories: [categoryName],
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {editingOrg
                ? t('manageOrganizations.editOrganization', { defaultValue: 'Edit Organization' })
                : t('manageOrganizations.addOrganization', { defaultValue: 'Add New Organization' })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              {t('manageOrganizations.name', { defaultValue: 'Organization Name' })}
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('manageOrganizations.namePlaceholder', { defaultValue: 'Enter organization name' })}
            />
          </div>

          {/* Domains */}
          <div className="space-y-2">
            <Label htmlFor="domains">
              {t('manageOrganizations.domains', { defaultValue: 'Domains' })} *
            </Label>
            {formData.domains?.map((domain, idx) => (
              <div key={idx} className="flex space-x-2">
                <Input
                  value={domain.name}
                  onChange={(e) => handleDomainChange(idx, e.target.value)}
                  placeholder={t('manageOrganizations.domainPlaceholder', { defaultValue: 'Enter domain (e.g. adorsys.com)' })}
                  className={idx === 0 ? "border-red-500" : ""}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addDomain}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('manageOrganizations.addDomain', { defaultValue: '+ Add Domain' })}
            </Button>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <Label htmlFor="categories">
              {t('manageOrganizations.categories', { defaultValue: 'Categories' })} *
            </Label>
            <Select
              value={formData.attributes?.categories?.[0] || ""}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('manageOrganizations.selectCategories', { defaultValue: 'Select categories...' })} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.categoryId} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Create Category with Organization */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              {t('manageOrganizations.createCategoryWithOrgDesc', { defaultValue: 'Optionally create a new category and assign it to this organization' })}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCategoryCreation(!showCategoryCreation)}
              className="w-full"
            >
              {t('manageOrganizations.createCategory', { defaultValue: 'Create Category' })}
            </Button>
          </div>

          {/* Category Creation Form */}
          {showCategoryCreation && (
            <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
              <h4 className="font-medium">
                {t('manageOrganizations.newCategory', { defaultValue: 'New Category' })}
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryName">
                    {t('manageCategories.name', { defaultValue: 'Name' })} *
                  </Label>
                  <Input
                    id="categoryName"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    placeholder={t('manageCategories.namePlaceholder', { defaultValue: 'Category name' })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="categoryWeight">
                    {t('manageCategories.weight', { defaultValue: 'Weight' })} *
                  </Label>
                  <Input
                    id="categoryWeight"
                    type="number"
                    min="1"
                    max="100"
                    value={categoryFormData.weight}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, weight: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={categoriesLoading}
                  className="bg-dgrv-green hover:bg-green-700"
                >
                  {categoriesLoading
                    ? t('common.processing', { defaultValue: 'Processing...' })
                    : t('manageCategories.create', { defaultValue: 'Create Category' })}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCategoryCreation(false)}
                >
                  {t('common.cancel', { defaultValue: 'Cancel' })}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-2 pt-6 border-t">
          <Button variant="outline" onClick={handleClose}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isPending}
            className="bg-dgrv-green hover:bg-green-700"
          >
            {isPending
              ? t('common.processing', { defaultValue: 'Processing...' })
              : editingOrg
              ? t('common.update', { defaultValue: 'Update' })
              : t('manageOrganizations.createOrganization', { defaultValue: 'Create Organization' })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 