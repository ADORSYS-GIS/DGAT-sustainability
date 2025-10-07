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
  Organization,
  CreateOrganizationRequest,
} from "@/openapi-rq/requests/types.gen";

// Custom interface for organization form data
interface OrganizationFormData {
  name: string;
  domains: { name: string }[];
  redirectUrl: string;
  enabled: string;
  attributes: { categories: string[] };
}
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useOrganizationsServiceGetOrganizations,
  useOrganizationsServicePutOrganizationsByOrganizationId,
  useOrganizationsServiceDeleteOrganizationsByOrganizationId,
} from "@/services/openapiQueries";
import { useMutation } from "@tanstack/react-query";
import { fetchWithAuth } from "@/services/shared/authService";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { OrganizationCategoryManager } from "@/components/admin/OrganizationCategoryManager";

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
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: "",
    domains: [{ name: "" }],
    redirectUrl:
      import.meta.env.VITE_ORGANIZATION_REDIRECT_URL ||
      "https://ec2-56-228-63-114.eu-north-1.compute.amazonaws.com/",
    enabled: "true",
    attributes: { categories: [] },
  });
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationResponseFixed | null>(null);


  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [orgToDelete, setOrgToDelete] =
    useState<OrganizationResponseFixed | null>(null);


  // Use direct API query method from queries.ts instead of offline hook
  const {
    data: organizations,
    isLoading,
    refetch,
  } = useOrganizationsServiceGetOrganizations();

  // Use the actual mutation methods from queries.ts for direct API calls
  const createOrganizationMutation = useMutation({
    mutationFn: async (variables: { requestBody: CreateOrganizationRequest }) => {
      const base = import.meta.env.VITE_API_BASE_URL || "/api";
      const resp = await fetchWithAuth(
        `${base}/admin/organizations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(variables.requestBody),
        },
      );
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Create organization failed: ${resp.status} ${text}`);
      }
      return resp.json();
    },
    onSuccess: (result) => {
      toast.success("Organization created successfully");
      refetch();
      setShowAddDialog(false);
      setEditingOrg(null);

      if (result && typeof result === "object" && "id" in result) {
        const newOrg = toFixedOrg(result);
        setSelectedOrganization(newOrg);
      }

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
    // Build payload as expected by backend
    const requestBody: CreateOrganizationRequest = {
      name: formData.name,
      domains: cleanDomains,
      redirectUrl:
        formData.redirectUrl ||
        import.meta.env.VITE_ORGANIZATION_REDIRECT_URL ||
        "https://ec2-56-228-63-114.eu-north-1.compute.amazonaws.com/",
      enabled: "true",
      attributes: {
        categories: (formData.attributes?.categories as string[]) || [],
      },
    } as unknown as CreateOrganizationRequest;

    if (editingOrg) {
      (updateOrganizationMutation.mutate as unknown as (v: unknown) => void)({
        organizationId: editingOrg.id,
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
      attributes: { categories: [], ...(org.attributes || {}) },
    });
    setShowAddDialog(true);
  };

  const handleDelete = (org: OrganizationResponseFixed) => {
    setOrgToDelete(org);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = () => {
    if (!orgToDelete) return;

    (deleteOrganizationMutation.mutate as unknown as (v: unknown) => void)({ organizationId: orgToDelete.id });
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


  if (isLoading) {
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
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="text-blue-600 mt-0.5">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-blue-900">Category Assignment</h3>
                          <p className="text-blue-700 text-sm mt-1">
                            After creating the organization, you'll be able to assign categories with custom weights through the category manager.
                          </p>
                        </div>
                      </div>
                    </div>


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
