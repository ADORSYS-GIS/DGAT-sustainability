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
import { 
  useOfflineOrganizations,
  useOfflineSyncStatus 
} from "@/hooks/useOfflineApi";
import type {
  OrganizationResponse,
  OrganizationCreateRequest,
} from "@/openapi-rq/requests/types.gen";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { offlineDB } from "@/services/indexeddb";

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
    attributes: (o.attributes as { [key: string]: string[] }) ?? {},
  };
}

// Placeholder mutation hooks for organization management
function useOrganizationMutations() {
  const [isPending, setIsPending] = useState(false);
  
  const createOrganization = async (data: { requestBody: OrganizationCreateRequest }) => {
    setIsPending(true);
    try {
      // Generate a temporary ID for optimistic updates
      const tempId = `temp_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      
      // Create a temporary organization object for local storage
      const tempOrg = {
        id: tempId,
        name: data.requestBody.name,
        enabled: data.requestBody.enabled === "true",
        redirectUrl: import.meta.env.VITE_ORGANIZATION_REDIRECT_URL || "http://localhost:5173",
        domains: data.requestBody.domains || [],
        attributes: data.requestBody.attributes || {},
        created_at: now,
        updated_at: now,
        sync_status: 'pending' as const,
        local_changes: true,
        last_synced: undefined
      };
      
      // Save to IndexedDB immediately for optimistic UI updates
      await offlineDB.saveOrganization(tempOrg);
      
      // Try to sync with backend if online
      try {
        // Import the service dynamically to avoid circular dependencies
        const { OrganizationsService } = await import('@/openapi-rq/requests/services.gen');
        // Use environment variable for redirectUrl in the request
        const requestBodyWithEnvRedirect = {
          ...data.requestBody,
          redirectUrl: import.meta.env.VITE_ORGANIZATION_REDIRECT_URL || "http://localhost:5173"
        };
        const result = await OrganizationsService.postAdminOrganizations({ requestBody: requestBodyWithEnvRedirect });
        
        // If successful, replace the temporary organization with the real one
        if (result && result.id) {
          const realOrg = {
            id: result.id, // result.id is guaranteed to exist here due to the if condition
            name: result.name || '',
            description: null, // Not provided in OrganizationResponse
            country: null, // Not provided in OrganizationResponse
            attributes: result.attributes || {},
            updated_at: new Date().toISOString(),
            sync_status: 'synced' as const,
            local_changes: false,
            last_synced: new Date().toISOString()
          };
          await offlineDB.deleteOrganization(tempId);
          await offlineDB.saveOrganization(realOrg);
          toast.success("Organization created successfully");
        }
      } catch (apiError) {
        console.warn('API call failed, organization saved locally for sync:', apiError);
        toast.success("Organization created locally (will sync when online)");
      }
      
      return { success: true };
    } catch (error) {
      toast.error("Failed to create organization");
      throw error;
    } finally {
      setIsPending(false);
    }
  };
  
  const updateOrganization = async (data: { id: string; requestBody: OrganizationCreateRequest }) => {
    setIsPending(true);
    try {
      // Update locally first
      const existingOrg = await offlineDB.getOrganization(data.id);
      if (existingOrg) {
        const updatedOrg = {
          ...existingOrg,
          name: data.requestBody.name,
          enabled: data.requestBody.enabled === "true",
          redirectUrl: import.meta.env.VITE_ORGANIZATION_REDIRECT_URL || "http://localhost:5173",
          domains: data.requestBody.domains || [],
          attributes: data.requestBody.attributes || {},
          updated_at: new Date().toISOString(),
          sync_status: 'pending' as const,
          local_changes: true
        };
        await offlineDB.saveOrganization(updatedOrg);
      }
      
      // Try to sync with backend if online
      try {
        const { OrganizationsService } = await import('@/openapi-rq/requests/services.gen');
        // Use environment variable for redirectUrl in the request
        const requestBodyWithEnvRedirect = {
          ...data.requestBody,
          redirectUrl: import.meta.env.VITE_ORGANIZATION_REDIRECT_URL || "http://localhost:5173"
        };
        await OrganizationsService.putAdminOrganizationsById({ id: data.id, requestBody: requestBodyWithEnvRedirect });
        
        // Update the local organization to synced status
        if (existingOrg) {
          const syncedOrg = {
            ...existingOrg,
            sync_status: 'synced' as const,
            local_changes: false,
            last_synced: new Date().toISOString()
          };
          await offlineDB.saveOrganization(syncedOrg);
        }
        toast.success("Organization updated successfully");
      } catch (apiError) {
        console.warn('API call failed, organization updated locally for sync:', apiError);
        toast.success("Organization updated locally (will sync when online)");
      }
      
      return { success: true };
    } catch (error) {
      toast.error("Failed to update organization");
      throw error;
    } finally {
      setIsPending(false);
    }
  };
  
  const deleteOrganization = async (data: { id: string }) => {
    setIsPending(true);
    try {
      // Delete locally first
      await offlineDB.deleteOrganization(data.id);
      
      // Try to sync with backend if online
      try {
        const { OrganizationsService } = await import('@/openapi-rq/requests/services.gen');
        await OrganizationsService.deleteAdminOrganizationsById({ id: data.id });
        toast.success("Organization deleted successfully");
      } catch (apiError) {
        console.warn('API call failed, organization deleted locally for sync:', apiError);
        toast.success("Organization deleted locally (will sync when online)");
      }
      
      return { success: true };
    } catch (error) {
      toast.error("Failed to delete organization");
      throw error;
    } finally {
      setIsPending(false);
    }
  };
  
  return {
    createOrganization: { mutate: createOrganization, isPending },
    updateOrganization: { mutate: updateOrganization, isPending },
    deleteOrganization: { mutate: deleteOrganization, isPending }
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
    redirectUrl: import.meta.env.VITE_ORGANIZATION_REDIRECT_URL || "http://localhost:5173",
    enabled: "true",
    attributes: { categories: [] },
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  // Use offline hooks for all data fetching
  const {
    data: organizations,
    isLoading,
    refetch,
  } = useOfflineOrganizations();
  
  const { createOrganization, updateOrganization, deleteOrganization } = useOrganizationMutations();
  const { isOnline } = useOfflineSyncStatus();

  // Load categories from IndexedDB on mount
  React.useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const stored = await offlineDB.getAllCategories();
        // Map the IndexedDB category structure to the expected format
        const mappedCategories = stored.map(cat => ({
          categoryId: cat.category_id,
          name: cat.name,
          weight: cat.weight,
          order: cat.order,
          templateId: cat.template_id
        }));
        setCategories(mappedCategories);
      } catch (error) {
        console.error('Failed to load categories:', error);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

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
    const requestBody: OrganizationCreateRequest = {
      ...formData,
      domains: cleanDomains,
      enabled: "true",
      attributes: {
        categories: (formData.attributes?.categories as string[]) || [],
      },
    };
    
    if (editingOrg) {
      updateOrganization.mutate({ id: editingOrg.id, requestBody }).then(() => {
        refetch();
        setShowAddDialog(false);
        setEditingOrg(null);
        setFormData({
          name: "",
          domains: [{ name: "" }],
          redirectUrl: import.meta.env.VITE_ORGANIZATION_REDIRECT_URL || "http://localhost:5173",
          enabled: "true",
          attributes: { categories: [] },
        });
      }).catch(() => {
        // Error already handled in mutation
      });
    } else {
      createOrganization.mutate({ requestBody }).then(() => {
        refetch();
        setShowAddDialog(false);
        setFormData({
          name: "",
          domains: [{ name: "" }],
          redirectUrl: import.meta.env.VITE_ORGANIZATION_REDIRECT_URL || "http://localhost:5173",
          enabled: "true",
          attributes: { categories: [] },
        });
      }).catch(() => {
        // Error already handled in mutation
      });
    }
  };

  const handleEdit = (org: OrganizationResponseFixed) => {
    setEditingOrg(org);
    setFormData({
      name: org.name || "",
      domains: (org.domains || []).map((d) => ({ name: d.name })),
      redirectUrl: import.meta.env.VITE_ORGANIZATION_REDIRECT_URL || "http://localhost:5173",
      enabled: org.enabled ? "true" : "false",
      attributes: {
        categories: (org.attributes?.categories as string[]) || [],
      },
    });
    setShowAddDialog(true);
  };

  const handleDelete = (orgId: string) => {
    if (!confirm("Are you sure you want to delete this organization?")) return;
    
    deleteOrganization.mutate({ id: orgId }).then(() => {
      refetch();
    }).catch(() => {
      // Error already handled in mutation
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      domains: [{ name: "" }],
      redirectUrl: import.meta.env.VITE_ORGANIZATION_REDIRECT_URL || "http://localhost:5173",
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

  const fixedOrgs = Array.isArray(organizations?.organizations)
    ? (organizations.organizations as unknown[]).map(toFixedOrg)
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Offline Status Indicator */}
          <div className="mb-4 flex items-center justify-end">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <Building2 className="w-8 h-8 text-dgrv-blue" />
                  <h1 className="text-3xl font-bold text-dgrv-blue">
                    {t('manageOrganizations.title', { defaultValue: 'Manage Organizations' })}
                  </h1>
                </div>
                <p className="text-lg text-gray-600">
                  {t('manageOrganizations.subtitle', { defaultValue: 'Create and manage organizations for sustainability assessments' })}
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
                    {t('manageOrganizations.addOrganization', { defaultValue: 'Add Organization' })}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingOrg
                        ? "Edit Organization"
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
                        Categories
                      </Label>
                      <Select
                        id="categories"
                        isMulti
                        options={categories.map((cat) => ({
                          value: cat.name,
                          label: cat.name,
                        }))}
                        value={(formData.attributes?.categories || []).map(
                          (catName) => ({ value: catName, label: catName }),
                        )}
                        onChange={(selected) => {
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
                    <div className="flex space-x-2 pt-4">
                      <Button
                        onClick={handleSubmit}
                        className="bg-dgrv-green hover:bg-green-700 px-6 py-2 text-base font-semibold rounded shadow"
                        disabled={createOrganization.isPending || updateOrganization.isPending}
                      >
                        {createOrganization.isPending || updateOrganization.isPending
                          ? t('manageOrganizations.saving', { defaultValue: 'Saving...' })
                          : editingOrg 
                            ? t('manageOrganizations.update', { defaultValue: 'Update' }) 
                            : t('manageOrganizations.create', { defaultValue: 'Create' })}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={resetForm}
                        className="px-6 py-2 text-base font-semibold rounded shadow"
                      >
                        {t('manageOrganizations.cancel', { defaultValue: 'Cancel' })}
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
                        <b>{t('manageOrganizations.domains', { defaultValue: 'Domains' })}:</b>{" "}
                        {org.domains.map((d) => d.name).join(", ")}
                      </div>
                    )}
                    {org.description && (
                      <div className="text-sm text-gray-600">
                        <b>{t('manageOrganizations.description', { defaultValue: 'Description' })}:</b> {org.description}
                      </div>
                    )}
                    <div className="flex space-x-2 pt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(org)}
                        className="flex-1"
                        disabled={false}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {t('manageOrganizations.edit', { defaultValue: 'Edit' })}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(org.id)}
                        className="text-red-600 hover:bg-red-50"
                        disabled={deleteOrganization.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('manageOrganizations.delete', { defaultValue: 'Delete' })}
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
                    {t('manageOrganizations.noOrganizations', { defaultValue: 'No organizations yet' })}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {t('manageOrganizations.getStarted', { defaultValue: 'Create your first organization to get started.' })}
                  </p>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-dgrv-green hover:bg-green-700"
                  >
                    {t('manageOrganizations.addFirstOrganization', { defaultValue: 'Add First Organization' })}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
