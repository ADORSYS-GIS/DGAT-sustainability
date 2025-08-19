/*
 * Organization form component for creating and editing organizations
 * Provides dialog interface with domain management and category assignment
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2,
  ChevronDown,
  Globe,
  Plus,
  Settings,
  Tag,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface Category {
  categoryId: string;
  name: string;
  weight: number;
  order: number;
  templateId: string;
}

type OrganizationFormData = {
  name: string;
  domains: { name: string }[];
  redirectUrl: string;
  enabled: string;
  attributes: { categories: string[] };
};

type CategoryFormData = {
  name: string;
  weight: number;
  order: number;
};

type EditingOrganization = {
  id: string;
  name: string;
  alias?: string;
  enabled: boolean;
  description?: string | null;
  redirectUrl?: string | null;
  domains?: { name: string; verified?: boolean }[];
  attributes?: { [key: string]: string[] };
} | null;

interface OrganizationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
  editingOrg: EditingOrganization;
  formData: OrganizationFormData;
  setFormData: React.Dispatch<React.SetStateAction<OrganizationFormData>>;
  categories: Category[];
  categoriesLoading: boolean;
  showCategoryCreation: boolean;
  setShowCategoryCreation: React.Dispatch<React.SetStateAction<boolean>>;
  categoryFormData: CategoryFormData;
  setCategoryFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
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
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCategoryChange = (categoryName: string) => {
    const currentCategories = formData.attributes?.categories || [];

    if (currentCategories.includes(categoryName)) {
      // Remove category if already selected
      setFormData({
        ...formData,
        attributes: {
          ...formData.attributes,
          categories: currentCategories.filter((cat) => cat !== categoryName),
        },
      });
    } else {
      // Add category if not selected
      setFormData({
        ...formData,
        attributes: {
          ...formData.attributes,
          categories: [...currentCategories, categoryName],
        },
      });
    }
  };

  const removeCategory = (categoryName: string) => {
    const currentCategories = formData.attributes?.categories || [];
    setFormData({
      ...formData,
      attributes: {
        ...formData.attributes,
        categories: currentCategories.filter((cat) => cat !== categoryName),
      },
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedCategories = formData.attributes?.categories || [];
  const availableCategories = categories.filter(
    (cat) => !selectedCategories.includes(cat.name),
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6 border-b border-gray-100">
          <DialogTitle className="flex items-center justify-between text-xl font-semibold text-gray-900">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <span>
                {editingOrg
                  ? t("manageOrganizations.editOrganization", {
                      defaultValue: "Edit Organization",
                    })
                  : t("manageOrganizations.addOrganization", {
                      defaultValue: "Add New Organization",
                    })}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 py-6">
          {/* Organization Name */}
          <div className="space-y-3">
            <Label
              htmlFor="name"
              className="text-sm font-medium text-gray-700 flex items-center gap-2"
            >
              <Building2 className="h-4 w-4 text-gray-500" />
              {t("manageOrganizations.name", {
                defaultValue: "Organization Name",
              })}
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={t("manageOrganizations.namePlaceholder", {
                defaultValue: "Enter organization name",
              })}
              className="h-11 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Domains */}
          <div className="space-y-3">
            <Label
              htmlFor="domains"
              className="text-sm font-medium text-gray-700 flex items-center gap-2"
            >
              <Globe className="h-4 w-4 text-gray-500" />
              {t("manageOrganizations.domains", { defaultValue: "Domains" })} *
            </Label>
            <div className="space-y-3">
              {formData.domains?.map((domain, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Input
                    value={domain.name}
                    onChange={(e) => handleDomainChange(idx, e.target.value)}
                    placeholder={t("manageOrganizations.domainPlaceholder", {
                      defaultValue: "Enter domain (e.g. adorsys.com)",
                    })}
                    className={`h-11 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 flex-1 ${
                      idx === 0
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                  />
                  {formData.domains.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDomain(idx)}
                      className="h-11 w-11 p-0 hover:bg-red-50 hover:text-red-600 rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addDomain}
                className="w-full h-11 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-blue-600 font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("manageOrganizations.addDomain", {
                  defaultValue: "Add Domain",
                })}
              </Button>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <Label
              htmlFor="categories"
              className="text-sm font-medium text-gray-700 flex items-center gap-2"
            >
              <Tag className="h-4 w-4 text-gray-500" />
              {t("manageOrganizations.categories", {
                defaultValue: "Categories",
              })}{" "}
              *
            </Label>
            <div className="border border-gray-200 rounded-lg px-4 py-3 min-h-[48px] flex items-center justify-between bg-white hover:border-gray-300 transition-colors">
              <div className="flex flex-wrap gap-2 flex-1">
                {selectedCategories.map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-full border border-blue-200 font-medium"
                  >
                    {category}
                    <button
                      onClick={() => removeCategory(category)}
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {selectedCategories.length === 0 && (
                  <span className="text-sm text-gray-400 italic">
                    {t("manageOrganizations.selectCategories", {
                      defaultValue: "Select categories...",
                    })}
                  </span>
                )}
              </div>
              <div ref={dropdownRef} className="ml-3">
                <DropdownMenu
                  open={isCategoryDropdownOpen}
                  onOpenChange={setIsCategoryDropdownOpen}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-2">
                    <div className="text-xs font-medium text-gray-500 px-2 py-1.5">
                      Available Categories
                    </div>
                    {categories.map((category) => (
                      <DropdownMenuCheckboxItem
                        key={category.categoryId}
                        checked={selectedCategories.includes(category.name)}
                        onCheckedChange={() =>
                          handleCategoryChange(category.name)
                        }
                        className="px-2 py-2"
                      >
                        {category.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {selectedCategories.length === 0 && (
              <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                {t("manageOrganizations.categoriesRequired", {
                  defaultValue: "At least one category is required",
                })}
              </p>
            )}
          </div>

          {/* Create Category with Organization */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Settings className="h-4 w-4" />
              <span>
                {t("manageOrganizations.createCategoryWithOrgDesc", {
                  defaultValue:
                    "Optionally create a new category and assign it to this organization",
                })}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCategoryCreation(!showCategoryCreation)}
              className="w-full h-11 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            >
              {t("manageOrganizations.createCategory", {
                defaultValue: "Create Category",
              })}
            </Button>
          </div>

          {/* Category Creation Form */}
          {showCategoryCreation && (
            <div className="p-6 border border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-white space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Tag className="h-4 w-4 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900">
                  {t("manageOrganizations.newCategory", {
                    defaultValue: "New Category",
                  })}
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="categoryName"
                    className="text-sm font-medium text-gray-700"
                  >
                    {t("manageCategories.name", { defaultValue: "Name" })} *
                  </Label>
                  <Input
                    id="categoryName"
                    value={categoryFormData.name}
                    onChange={(e) =>
                      setCategoryFormData({
                        ...categoryFormData,
                        name: e.target.value,
                      })
                    }
                    placeholder={t("manageCategories.namePlaceholder", {
                      defaultValue: "Category name",
                    })}
                    className="h-11 text-base border-gray-200 focus:border-green-500 focus:ring-green-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="categoryWeight"
                    className="text-sm font-medium text-gray-700"
                  >
                    {t("manageCategories.weight", { defaultValue: "Weight" })} *
                  </Label>
                  <Input
                    id="categoryWeight"
                    type="number"
                    min="1"
                    max="100"
                    value={categoryFormData.weight}
                    onChange={(e) =>
                      setCategoryFormData({
                        ...categoryFormData,
                        weight: parseInt(e.target.value) || 0,
                      })
                    }
                    className="h-11 text-base border-gray-200 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <Button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={categoriesLoading}
                  className="bg-green-600 hover:bg-green-700 h-11 px-6 font-medium"
                >
                  {categoriesLoading
                    ? t("common.processing", { defaultValue: "Processing..." })
                    : t("manageCategories.create", {
                        defaultValue: "Create Category",
                      })}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCategoryCreation(false)}
                  className="h-11 px-6 border-gray-200 hover:bg-gray-50"
                >
                  {t("common.cancel", { defaultValue: "Cancel" })}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 px-6 py-4">
          <Button
            variant="outline"
            onClick={handleClose}
            className="h-11 px-6 border-gray-200 hover:bg-white"
          >
            {t("common.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 h-11 px-8 font-medium"
          >
            {isPending
              ? t("common.processing", { defaultValue: "Processing..." })
              : editingOrg
                ? t("common.update", { defaultValue: "Update" })
                : t("manageOrganizations.createOrganization", {
                    defaultValue: "Create Organization",
                  })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
