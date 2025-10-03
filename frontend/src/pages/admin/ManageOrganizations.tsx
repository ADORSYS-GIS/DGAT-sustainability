import * as React from "react";
import { useState } from "react";
import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Edit, Trash2, MapPin, Mail } from "lucide-react";

import type {
  OrganizationResponse,
  OrganizationCreateRequest,
} from "@/openapi-rq/requests/types.gen";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useOrganizationsServiceGetOrganizations,
  useOrganizationsServicePostOrganizations,
  useOrganizationsServicePutOrganizationsByOrganizationId,
  useOrganizationsServiceDeleteOrganizationsByOrganizationId,
} from "@/openapi-rq/queries/queries";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useOfflineCategoriesMutation } from "@/hooks/useOfflineApi";
import { OrganizationCategoryManager } from "@/components/admin/OrganizationCategoryManager";
import { useCategoryCatalogs, useCreateCategoryCatalog } from "@/hooks/useOrganizationCategories";

interface Category {
  categoryId: string;
  name: string;
  weight: number;
  order: number;
  templateId: string;
}

// Update the OrganizationResponse type for local use
interface OrganizationDomain {
  name: string;
  verified?: boolean;
}
interface OrganizationResponseFixed {
  id: string;
  name: string;
  alias?: string;
  enabled: boolean;
  description?: string | null;
  redirectUrl?: string | null;
  domains?: OrganizationDomain[];
  attributes?: { [key: string]: string[] };
}

// Helper to map OrganizationResponse to OrganizationResponseFixed
function toFixedOrg(org: unknown): OrganizationResponseFixed {
  const o = org as Record<string, unknown>;

  // Convert attributes from serde_json::Value to HashMap<string, string[]>
  const attributes: { [key: string]: string[] } = {};
  if (
    o.attributes &&
    typeof o.attributes === "object" &&
    o.attributes !== null
  ) {
    const attrsObj = o.attributes as Record<string, unknown>;
    for (const [key, value] of Object.entries(attrsObj)) {
      if (Array.isArray(value)) {
        const stringValues: string[] = value
          .filter((v) => typeof v === "string")
          .map((v) => v as string);
        attributes[key] = stringValues;
      }
    }
  }

  return {
    id: o.id as string,
    name: o.name as string,
    alias: o.alias as string | undefined,
    enabled: (o.enabled as boolean) ?? false,
    description: o.description as string | null,
    redirectUrl: o.redirectUrl as string | null,
    domains: Array.isArray(o.domains)
      ? (o.domains as unknown[]).map((d) => ({
          name: (d as Record<string, unknown>).name as string,
          verified: (d as Record<string, unknown>).verified as
            | boolean
            | undefined,
        }))
      : [],
    attributes: attributes,
  };
}

export const ManageOrganizations: React.FC = () => {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingOrg, setEditingOrg] =
    useState<OrganizationResponseFixed | null>(null);
  const [formData, setFormData] = useState<OrganizationCreateRequest>({
    name: "",
    domains: [{ name: "" }],
    redirectUrl:
      import.meta.env.VITE_ORGANIZATION_REDIRECT_URL ||
      "https://ec2-56-228-63-114.eu-north-1.compute.amazonaws.com/",
    enabled: "true",
    attributes: { categories: [] },
  });
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationResponseFixed | null>(null);

  // Category creation state
  const [showCategoryCreation, setShowCategoryCreation] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    weight: 25,
    order: 1,
  });

  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [orgToDelete, setOrgToDelete] =
    useState<OrganizationResponseFixed | null>(null);

  // Category catalog hooks
  const { data: categoryCatalogsData, isLoading: categoriesLoading } = useCategoryCatalogs();
  const categoryCatalogs = categoryCatalogsData?.category_catalogs || [];
  const createCategoryMutation = useCreateCategoryCatalog();
  const categoryMutations = useOfflineCategoriesMutation();

  // Use direct API query method from queries.ts instead of offline hook
  const {
    data: organizations,
    isLoading,
    refetch,
  } = useOrganizationsServiceGetOrganizations();

  // Use the actual mutation methods from queries.ts for direct API calls
  const createOrganizationMutation =
    useOrganizationsServicePostOrganizations({
      onSuccess: (result) => {
        toast.success("Organization created successfully");
        refetch();
        setShowAddDialog(false);
        setEditingOrg(null);
        setFormData({
          name: "",
          domains: [{ name: "" }],
          redirectUrl:
            import.meta.env.VITE_ORGANIZATION_REDIRECT_URL ||
            "https://ec2-56-228-63-114.eu-north-1.compute.amazonaws.com/",
          enabled: "true",
          attributes: { categories: [] },
        });
      },
      onError: (error) => {
        console.error("Failed to create organization:", error);
        toast.error("Failed to create organization");
      },
    });

  const updateOrganizationMutation =
    useOrganizationsServicePutOrganizationsByOrganizationId({
      onSuccess: () => {
        toast.success("Organization updated successfully");
        refetch();
        setShowAddDialog(false);
        setEditingOrg(null);
        setFormData({
          name: "",
          domains: [{ name: "" }],
          redirectUrl:
            import.meta.env.VITE_ORGANIZATION_REDIRECT_URL ||
            "https://ec2-56-228-63-114.eu-north-1.compute.amazonaws.com/",
          enabled: "true",
          attributes: { categories: [] },
        });
      },
      onError: (error) => {
        console.error("Failed to update organization:", error);
        toast.error("Failed to update organization");
      },
    });

  const deleteOrganizationMutation =
    useOrganizationsServiceDeleteOrganizationsByOrganizationId({
      onSuccess: () => {
        toast.success("Organization deleted successfully");
        refetch();
        setShowDeleteConfirmation(false); // Close the dialog
        setOrgToDelete(null); // Clear the organization to delete
      },
      onError: (error) => {
        console.error("Failed to delete organization:", error);
        toast.error("Failed to delete organization");
      },
    });

  // Transform the organizations data from the direct API call
  const fixedOrgs = organizations
    ? (Array.isArray(organizations) ? organizations : [organizations]).map(
        toFixedOrg,
      )
    : [];

  // Log organization details for debugging
  React.useEffect(() => {
    if (organizations) {
      console.log("Raw organizations from API:", organizations);
      console.log("Fixed organizations:", fixedOrgs);
      fixedOrgs.forEach((org, index) => {
        console.log(`Organization ${index + 1}:`, {
          id: org.id,
          name: org.name,
          attributes: org.attributes,
          categories: org.attributes?.categories,
        });
      });
    }
  }, [organizations, fixedOrgs]);

  // Categories are now loaded via the useCategoryCatalogs hook

  // Debug formData changes
  React.useEffect(() => {
    console.log("FormData changed:", formData);
    console.log("FormData categories:", formData.attributes?.categories);
  }, [formData]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    // Remove empty domains
    const cleanDomains = (formData.domains || []).filter((d) => d.name.trim());
    if (cleanDomains.length === 0) {
      toast.error("At least one domain is required");
      return;
    }
    // Check if at least one category is selected
    const selectedCategories =
      (formData.attributes?.categories as string[]) || [];
    if (selectedCategories.length === 0) {
      toast.error("At least one category is required");
      return;
    }
    const requestBody: OrganizationCreateRequest = {
      ...formData,
      domains: cleanDomains,
      enabled: "true",
      attributes: {
        categories: selectedCategories,
      },
    };

    if (editingOrg) {
      updateOrganizationMutation.mutate({
        id: editingOrg.id,
        requestBody,
      });
    } else {
      createOrganizationMutation.mutate({ requestBody });
    }
  };

  const handleEdit = (org: OrganizationResponseFixed) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      domains: org.domains || [{ name: "" }],
      redirectUrl:
        org.redirectUrl ||
        import.meta.env.VITE_ORGANIZATION_REDIRECT_URL ||
        "https://ec2-56-228-63-114.eu-north-1.compute.amazonaws.com/",
      enabled: org.enabled ? "true" : "false",
      attributes: org.attributes || { categories: [] },
    });
    setShowAddDialog(true);
    setShowCategoryCreation(false);
    setCategoryFormData({
      name: "",
      weight: 25,
      order: 1,
    });
  };

  const handleDelete = (org: OrganizationResponseFixed) => {
    setOrgToDelete(org);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = () => {
    if (!orgToDelete) return;

    deleteOrganizationMutation.mutate({ id: orgToDelete.id });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      domains: [{ name: "" }],
      redirectUrl:
        import.meta.env.VITE_ORGANIZATION_REDIRECT_URL ||
        "https://ec2-56-228-63-114.eu-north-1.compute.amazonaws.com/",
      enabled: "true",
      attributes: { categories: [] },
    });
    setEditingOrg(null);
    setShowAddDialog(false);
    setShowCategoryCreation(false);
    setCategoryFormData({
      name: "",
      weight: 25,
      order: 1,
    });
  };

  // --- Domains UI helpers ---
  const handleDomainChange = (idx: number, value: string) => {
    setFormData((prev) => {
      const newDomains = [...(prev.domains || [])];
      newDomains[idx] = { name: value };
      return { ...prev, domains: newDomains };
    });
  };
  const addDomain = () => {
    setFormData((prev) => ({
      ...prev,
      domains: [...(prev.domains || []), { name: "" }],
    }));
  };
  const removeDomain = (idx: number) => {
    setFormData((prev) => {
      const newDomains = [...(prev.domains || [])];
      newDomains.splice(idx, 1);
      return {
        ...prev,
        domains: newDomains.length ? newDomains : [{ name: "" }],
      };
    });
  };

  const handleCreateCategory = async () => {
    if (!categoryFormData.name.trim()) {
      toast.error(
        t("manageCategories.textRequired", {
          defaultValue: "Category name is required",
        }),
      );
      return;
    }

    if (categoryFormData.weight <= 0 || categoryFormData.weight > 100) {
      toast.error(
        t("manageCategories.weightRangeError", {
          defaultValue: "Weight must be between 1 and 100",
        }),
      );
      return;
    }

    createCategoryMutation.mutate(
      {
        name: categoryFormData.name,
        weight: categoryFormData.weight,
        order: categoryFormData.order,
        template_id: "sustainability_template_1", // Match the template ID used in ManageCategories
      },
      {
        onSuccess: (result) => {
          console.log(
            "✅ Category creation onSuccess called with result:",
            result,
          );
          toast.success(
            t("manageCategories.createSuccess", {
              defaultValue: "Category created successfully",
            }),
          );

          // Add the new category to the form data
          const newCategoryName = categoryFormData.name;
          setFormData((prev) => ({
            ...prev,
            attributes: {
              ...prev.attributes,
              categories: [
                ...(prev.attributes?.categories || []),
                newCategoryName,
              ],
            },
          }));

          // Reset category form
          setCategoryFormData({
            name: "",
            weight: 25,
            order: categoryCatalogs.length + 1,
          });

          // Hide category creation section
          setShowCategoryCreation(false);
        },
        onError: (error) => {
          console.error(
            "❌ Category creation onError called with error:",
            error,
          );
          toast.error(
            t("manageCategories.createError", {
              defaultValue: "Failed to create category",
            }),
          );
        },
      },
    );
  };

  if (isLoading || categoriesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <Building2 className="w-8 h-8 text-dgrv-blue" />
                  <h1 className="text-3xl font-bold text-dgrv-blue">
                    {t("manageOrganizations.title", {
                      defaultValue: "Manage Organizations",
                    })}
                  </h1>
                </div>
                <p className="text-lg text-gray-600">
                  {t("manageOrganizations.subtitle", {
                    defaultValue:
                      "Create and manage organizations for sustainability assessments",
                  })}
                </p>
              </div>

              <Dialog
                open={showAddDialog}
                onOpenChange={(open) => {
                  if (!open) resetForm();
                  setShowAddDialog(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    className="bg-dgrv-green hover:bg-green-700"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("manageOrganizations.addOrganization", {
                      defaultValue: "Add Organization",
                    })}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingOrg
                        ? t("manageOrganizations.editOrganization")
                        : "Add New Organization"}
                    </DialogTitle>
                  </DialogHeader>
                  {/* --- FORM UI --- */}
                  <div className="space-y-6 p-2 md:p-4">
                    <div>
                      <Label
                        htmlFor="name"
                        className="font-semibold text-dgrv-blue"
                      >
                        Organization Name
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
                        placeholder="Enter organization name"
                        className="mt-1 border-gray-300 focus:border-dgrv-blue focus:ring-dgrv-blue rounded shadow-sm"
                      />
                    </div>
                    <div>
                      <Label className="font-semibold text-dgrv-blue">
                        Domains <span className="text-red-500">*</span>
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
                            placeholder="Enter domain (e.g. adorsys.com)"
                            className={`border-gray-300 focus:border-dgrv-blue focus:ring-dgrv-blue rounded shadow-sm ${!d.name.trim() ? "border-red-500" : ""}`}
                            required
                          />
                          {formData.domains.length > 1 && (
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
                        + Add Domain
                      </Button>
                    </div>
                    <div>
                      <Label
                        htmlFor="categories"
                        className="font-semibold text-dgrv-blue"
                      >
                        Categories <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        id="categories"
                        isMulti
                        options={categoryCatalogs.map((cat) => ({
                          value: cat.name,
                          label: cat.name,
                        }))}
                        value={(formData.attributes?.categories || []).map(
                          (catName) => ({ value: catName, label: catName }),
                        )}
                        onChange={(selected) => {
                          console.log(
                            "Categories selected in Select:",
                            selected,
                          );
                          setFormData((prev) => ({
                            ...prev,
                            attributes: {
                              ...prev.attributes,
                              categories: selected.map((opt) => opt.value),
                            },
                            enabled: "true",
                          }));
                        }}
                        classNamePrefix="react-select"
                        placeholder="Select categories..."
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: "#2563eb",
                            minHeight: "44px",
                            boxShadow: "none",
                            "&:hover": { borderColor: "#2563eb" },
                          }),
                          multiValue: (base) => ({
                            ...base,
                            backgroundColor: "#e0f2fe",
                            color: "#0369a1",
                          }),
                          multiValueLabel: (base) => ({
                            ...base,
                            color: "#0369a1",
                          }),
                          multiValueRemove: (base) => ({
                            ...base,
                            color: "#0369a1",
                            ":hover": {
                              backgroundColor: "#bae6fd",
                              color: "#0ea5e9",
                            },
                          }),
                        }}
                      />
                    </div>

                    {/* Category Creation Section */}
                    {!editingOrg && (
                      <div className="border-t pt-4 mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-dgrv-blue">
                              {t("manageOrganizations.createCategoryWithOrg")}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {t(
                                "manageOrganizations.createCategoryWithOrgDesc",
                              )}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setShowCategoryCreation(!showCategoryCreation)
                            }
                            className="text-dgrv-blue border-dgrv-blue hover:bg-dgrv-blue hover:text-white"
                          >
                            {showCategoryCreation
                              ? t("manageOrganizations.skipCategoryCreation")
                              : t("manageOrganizations.createCategory")}
                          </Button>
                        </div>

                        {showCategoryCreation && (
                          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                            <div>
                              <Label className="font-semibold text-dgrv-blue">
                                {t("manageOrganizations.newCategoryName")}{" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                value={categoryFormData.name}
                                onChange={(e) =>
                                  setCategoryFormData((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                  }))
                                }
                                placeholder={t(
                                  "manageOrganizations.newCategoryNamePlaceholder",
                                )}
                                className="mt-1 border-gray-300 focus:border-dgrv-blue focus:ring-dgrv-blue rounded shadow-sm"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="font-semibold text-dgrv-blue">
                                  {t("manageOrganizations.categoryWeight")}{" "}
                                  <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={categoryFormData.weight}
                                  onChange={(e) =>
                                    setCategoryFormData((prev) => ({
                                      ...prev,
                                      weight: parseInt(e.target.value) || 25,
                                    }))
                                  }
                                  className="mt-1 border-gray-300 focus:border-dgrv-blue focus:ring-dgrv-blue rounded shadow-sm"
                                />
                              </div>
                              <div>
                                <Label className="font-semibold text-dgrv-blue">
                                  {t(
                                    "manageOrganizations.categoryDisplayOrder",
                                  )}
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={categoryFormData.order}
                                  onChange={(e) =>
                                    setCategoryFormData((prev) => ({
                                      ...prev,
                                      order: parseInt(e.target.value) || 1,
                                    }))
                                  }
                                  className="mt-1 border-gray-300 focus:border-dgrv-blue focus:ring-dgrv-blue rounded shadow-sm"
                                />
                              </div>
                            </div>
                            <div className="flex space-x-2 pt-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleCreateCategory}
                                className="bg-dgrv-green hover:bg-green-700 text-white"
                                disabled={
                                  createCategoryMutation.isPending
                                }
                              >
                                {createCategoryMutation.isPending
                                  ? t("common.processing")
                                  : t("manageOrganizations.createCategory")}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setShowCategoryCreation(false)}
                              >
                                {t("manageOrganizations.skipCategoryCreation")}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex space-x-2 pt-4">
                      <Button
                        onClick={handleSubmit}
                        className="bg-dgrv-green hover:bg-green-700 px-6 py-2 text-base font-semibold rounded shadow"
                        disabled={
                          createOrganizationMutation.isPending ||
                          updateOrganizationMutation.isPending
                        }
                      >
                        {createOrganizationMutation.isPending ||
                        updateOrganizationMutation.isPending
                          ? t("manageOrganizations.saving", {
                              defaultValue: "Saving...",
                            })
                          : editingOrg
                            ? t("manageOrganizations.update", {
                                defaultValue: "Update",
                              })
                            : t("manageOrganizations.create", {
                                defaultValue: "Create",
                              })}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={resetForm}
                        className="px-6 py-2 text-base font-semibold rounded shadow"
                      >
                        {t("manageOrganizations.cancel", {
                          defaultValue: "Cancel",
                        })}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Organizations Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {fixedOrgs.map((org, index) => (
              <Card
                key={org.id}
                className="animate-fade-in hover:shadow-lg transition-shadow"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-dgrv-blue/10">
                      <Building2 className="w-5 h-5 text-dgrv-blue" />
                    </div>
                    <span className="text-lg">{org.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {org.domains && org.domains.length > 0 && (
                      <div className="text-sm text-gray-600">
                        <b>
                          {t("manageOrganizations.domains", {
                            defaultValue: "Domains",
                          })}
                          :
                        </b>{" "}
                        {org.domains.map((d) => d.name).join(", ")}
                      </div>
                    )}
                    {org.description && (
                      <div className="text-sm text-gray-600">
                        <b>
                          {t("manageOrganizations.description", {
                            defaultValue: "Description",
                          })}
                          :
                        </b>{" "}
                        {org.description}
                      </div>
                    )}
                    <div className="flex flex-col space-y-2 pt-4">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(org)}
                          className="flex-1"
                          disabled={false}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          {t("manageOrganizations.edit", {
                            defaultValue: "Edit",
                          })}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(org)}
                          className="text-red-600 hover:bg-red-50"
                          disabled={deleteOrganizationMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                          {t("manageOrganizations.delete", {
                            defaultValue: "Delete",
                          })}
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedOrganization(org)}
                        className="w-full"
                      >
                        Manage Categories
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {fixedOrgs.length === 0 && (
              <Card className="md:col-span-2 lg:col-span-3 text-center py-12">
                <CardContent>
                  <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {t("manageOrganizations.noOrganizations", {
                      defaultValue: "No organizations yet",
                    })}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {t("manageOrganizations.getStarted", {
                      defaultValue:
                        "Create your first organization to get started.",
                    })}
                  </p>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-dgrv-green hover:bg-green-700"
                  >
                    {t("manageOrganizations.addFirstOrganization", {
                      defaultValue: "Add First Organization",
                    })}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Delete Confirmation Dialog */}
          <ConfirmationDialog
            isOpen={showDeleteConfirmation}
            onClose={() => {
              setShowDeleteConfirmation(false);
              setOrgToDelete(null);
            }}
            onConfirm={confirmDelete}
            title={t("manageOrganizations.confirmDeleteTitle")}
            description={t("manageOrganizations.confirmDeleteDescription", {
              name: orgToDelete?.name || "",
            })}
            confirmText={t("manageOrganizations.deleteOrganization")}
            cancelText={t("manageOrganizations.cancel")}
            variant="destructive"
            isLoading={deleteOrganizationMutation.isPending}
          />

          {/* Organization Category Manager Dialog */}
          {selectedOrganization && (
            <Dialog open={!!selectedOrganization} onOpenChange={() => setSelectedOrganization(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Manage Categories - {selectedOrganization.name}</DialogTitle>
                </DialogHeader>
                <OrganizationCategoryManager
                  keycloakOrganizationId={selectedOrganization.id}
                  organizationName={selectedOrganization.name}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  );
};
