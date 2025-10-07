import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, List, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useCategoryCatalogs,
  useCreateCategoryCatalog,
} from "@/hooks/useOrganizationCategories";
import {
  CategoryCatalog,
  CreateCategoryCatalogRequest,
} from "@/types/organization-categories";

const SUSTAINABILITY_TEMPLATE_ID = "sustainability_template_1";

export const ManageCategories: React.FC = () => {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryCatalog | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // Use category catalog hooks
  const { data: categoryCatalogsData, isLoading, error, refetch } = useCategoryCatalogs();
  const createCategoryCatalogMutation = useCreateCategoryCatalog();

  const categoryCatalogs = categoryCatalogsData?.category_catalogs || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    if (editingCategory) {
      // TODO: Implement update functionality when backend supports it
      toast.info("Update functionality will be implemented in the next phase");
      return;
    } else {
      // Create new category catalog entry
      const request: CreateCategoryCatalogRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        template_id: SUSTAINABILITY_TEMPLATE_ID,
      };

      try {
        await createCategoryCatalogMutation.mutateAsync(request);
        setIsDialogOpen(false);
        setFormData({ name: "", description: "" });
      } catch (error) {
        // Error is handled by the mutation hook
      }
    }
  };

  const handleEdit = (category: CategoryCatalog) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (
      !window.confirm(
        t("manageCategories.confirmDelete", {
          defaultValue:
            "Are you sure you want to delete this category? This will remove it from the catalog and may affect organizations that use it.",
        }),
      )
    )
      return;

    // TODO: Implement delete functionality when backend supports it
    toast.info("Delete functionality will be implemented in the next phase");
  };

  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setEditingCategory(null);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading categories...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">Error loading categories: {error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 pt-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("manageCategories.title", { defaultValue: "Manage Categories" })}
          </h1>
          <p className="text-gray-600 mt-2">
            {t("manageCategories.subtitle", {
              defaultValue: "Manage the category catalog. Categories can be assigned to organizations with custom weights.",
            })}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              className="bg-dgrv-green hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("manageCategories.addCategory", { defaultValue: "Add Category" })}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory
                  ? t("manageCategories.editCategory", { defaultValue: "Edit Category" })
                  : t("manageCategories.addCategory", { defaultValue: "Add Category" })}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">
                  {t("manageCategories.name", { defaultValue: "Name" })}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("manageCategories.namePlaceholder", {
                    defaultValue: "Enter category name",
                  })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">
                  {t("manageCategories.description", { defaultValue: "Description" })}
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t("manageCategories.descriptionPlaceholder", {
                    defaultValue: "Enter category description (optional)",
                  })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t("manageCategories.cancel", { defaultValue: "Cancel" })}
                </Button>
                <Button
                  type="submit"
                  disabled={createCategoryCatalogMutation.isPending}
                >
                  {editingCategory
                    ? t("manageCategories.update", { defaultValue: "Update" })
                    : t("manageCategories.create", { defaultValue: "Create" })}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">
                {t("manageCategories.infoTitle", { defaultValue: "Category Catalog" })}
              </h3>
              <p className="text-blue-700 text-sm mt-1">
                {t("manageCategories.infoDescription", {
                  defaultValue:
                    "This is the master catalog of available categories. Organizations can select from these categories and assign custom weights to them. Weights are managed at the organization level, not here.",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Compact Table */}
      {categoryCatalogs.length > 0 ? (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categoryCatalogs.map((category) => (
                  <tr key={category.category_catalog_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-dgrv-blue/10 rounded-full flex items-center justify-center">
                          <List className="h-4 w-4 text-dgrv-blue" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{category.name}</div>
                          {category.description && (
                            <div className="text-sm text-gray-500">{category.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        category.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {category.is_active
                          ? t("manageCategories.active", { defaultValue: "Active" })
                          : t("manageCategories.inactive", { defaultValue: "Inactive" })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(category)}
                          className="text-dgrv-blue hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(category.category_catalog_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <List className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t("manageCategories.noCategories", { defaultValue: "No categories yet" })}
          </h3>
          <p className="text-gray-600 mb-6">
            {t("manageCategories.getStarted", {
              defaultValue: "Create your first category to get started. Categories can then be assigned to organizations with custom weights.",
            })}
          </p>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-dgrv-green hover:bg-green-700"
          >
            {t("manageCategories.addFirstCategory", { defaultValue: "Add First Category" })}
          </Button>
        </div>
      )}
    </div>
  );
};