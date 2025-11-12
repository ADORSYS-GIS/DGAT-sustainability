import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Edit, Plus, Trash2, ListTree } from "lucide-react";
import * as React from "react";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type {
  OrganizationCreateRequest,
  OrganizationResponse,
} from "@/openapi-rq/requests/types.gen";
import { useTranslation } from "react-i18next";
import Select from "react-select";
import { toast } from "sonner";
import AssignCategories from "./AssignCategories";

import type { OfflineCategoryCatalog } from "@/types/offline";
import { useOfflineOrganizations } from "@/hooks/useOfflineOrganizations"; // Import the new hook

export const ManageOrganizations: React.FC = () => {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingOrg, setEditingOrg] =
    useState<OrganizationResponse | null>(null);
  const [assigningOrg, setAssigningOrg] =
    useState<OrganizationResponse | null>(null);
  const [formData, setFormData] = useState<OrganizationCreateRequest>({
    name: "",
    domains: [{ name: "" }],
    redirectUrl: import.meta.env.VITE_ORGANIZATION_REDIRECT_URL || "https://ec2-56-228-63-114.eu-north-1.compute.amazonaws.com/",
    enabled: "true",
    attributes: { categories: [] },
  });
  const [categories, setCategories] = useState<OfflineCategoryCatalog[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0); // New state for pending sync items
  
  // Category creation state
  
  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<OrganizationResponse | null>(null);
  
  // Category mutation hooks
  
  const {
    organizations: offlineOrganizations,
    isLoading,
    isOnline,
    createOrganizationOffline,
    updateOrganizationOffline,
    deleteOrganizationOffline,
    refetchOrganizations,
  } = useOfflineOrganizations();

  // Function to update pending sync count
  const updatePendingSyncCount = async () => {
    const { offlineDB } = await import('@/services/indexeddb');
    const syncQueue = await offlineDB.getSyncQueue();
    setPendingSyncCount(syncQueue.length);
  };

  const orgs = offlineOrganizations || [];

  // Load categories from IndexedDB on mount
  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const { offlineDB } = await import('@/services/indexeddb');
      const stored = await offlineDB.getAllCategoryCatalogs();
      setCategories(stored);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  React.useEffect(() => {
    loadCategories();
    updatePendingSyncCount(); // Initial load of pending sync count

    const handleDataSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.entityType === 'organization') {
        refetchOrganizations();
        updatePendingSyncCount(); // Update count after organization sync
      }
    };

    window.addEventListener('datasync', handleDataSync);

    return () => {
      window.removeEventListener('datasync', handleDataSync);
    };
  }, [refetchOrganizations]); // Added updatePendingSyncCount to dependency array

  React.useEffect(() => {
    console.log('FormData changed:', formData);
    console.log('FormData categories:', formData.attributes?.categories);
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
    const requestBody: OrganizationCreateRequest = {
      ...formData,
      domains: cleanDomains,
      enabled: "true",
      attributes: {
        categories: (formData.attributes?.categories as string[]) || [],
      },
    };
    
    if (editingOrg) {
      updateOrganizationOffline(editingOrg.id, requestBody);
    } else {
      createOrganizationOffline(requestBody);
    }
    setShowAddDialog(false); // Close the dialog after submission
    setEditingOrg(null); // Clear editing state
    setFormData({ // Reset form data
      name: "",
      domains: [{ name: "" }],
      redirectUrl: import.meta.env.VITE_ORGANIZATION_REDIRECT_URL || "https://ec2-56-228-63-114.eu-north-1.compute.amazonaws.com/",
      enabled: "true",
      attributes: { categories: [] },
    });
    updatePendingSyncCount(); // Update pending sync count after an offline operation
  };

  const handleEdit = (org: OrganizationResponse) => {
    setEditingOrg(org);
    const orgAttributes = org.attributes || {};
    setFormData({
      name: org.name,
      domains:
        Array.isArray(org.domains) && org.domains.length > 0
          ? org.domains.map((d) => (typeof d === "string" ? { name: d } : d))
          : [{ name: "" }],
      redirectUrl:
        (orgAttributes.redirect_url && orgAttributes.redirect_url[0]) ||
        import.meta.env.VITE_ORGANIZATION_REDIRECT_URL ||
        "https://ec2-56-228-63-114.eu-north-1.compute.amazonaws.com/",
      enabled: ((orgAttributes.enabled && orgAttributes.enabled[0]) || "true") as "true" | "false",
      attributes: {
        categories: orgAttributes.categories || [],
      },
    });
    setShowAddDialog(true);
  };

  const handleDelete = (org: OrganizationResponse) => {
    setOrgToDelete(org);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = () => {
    if (!orgToDelete) return;
    
    deleteOrganizationOffline(orgToDelete.id);
    setShowDeleteConfirmation(false); // Close the dialog
    setOrgToDelete(null); // Clear the organization to delete
    updatePendingSyncCount(); // Update pending sync count after an offline operation
  };

  const resetForm = () => {
    setFormData({
      name: "",
      domains: [{ name: "" }],
      redirectUrl: import.meta.env.VITE_ORGANIZATION_REDIRECT_URL || "https://ec2-56-228-63-114.eu-north-1.compute.amazonaws.com/",
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">


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
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingOrg
                        ? t('manageOrganizations.editOrganization')
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
                            className={`border-gray-300 focus:border-dgrv-blue focus:ring-dgrv-blue rounded shadow-sm ${!d?.name?.trim() ? "border-red-500" : ""}`}
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
                    
                    
                    <div className="flex space-x-2 pt-4">
                      <Button
                        onClick={handleSubmit}
                        className="bg-dgrv-green hover:bg-green-700 px-6 py-2 text-base font-semibold rounded shadow"
                        // No longer need to disable based on mutation pending state as operations are offline
                      >
                        {editingOrg
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
            {orgs.map((org, index) => (
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
                  <div className="space-y-4">
                    {org.domains && org.domains.length > 0 && (
                      <div className="text-sm text-gray-600">
                        <b>{t('manageOrganizations.domains', { defaultValue: 'Domains' })}:</b>{" "}
                        {org.domains
                          .map((d: { name: string }) => d.name) // Access the 'name' property of each domain object
                          .join(", ")}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <div className="flex flex-col space-y-2 w-full">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(org)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {t('manageOrganizations.edit', { defaultValue: 'Edit' })}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(org)}
                        className="text-red-600 hover:bg-red-50 flex-1"
                        // No longer need to disable based on mutation pending state
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {t('manageOrganizations.delete', { defaultValue: 'Delete' })}
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAssigningOrg(org)}
                      className="w-full"
                    >
                      <ListTree className="w-4 h-4 mr-1" />
                      {t('manageOrganizations.assignCategories', { defaultValue: 'Assign Categories' })}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}

            {orgs.length === 0 && (
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

          {/* Delete Confirmation Dialog */}
          <ConfirmationDialog
            isOpen={showDeleteConfirmation}
            onClose={() => {
              setShowDeleteConfirmation(false);
              setOrgToDelete(null);
            }}
            onConfirm={confirmDelete}
            title={t('manageOrganizations.confirmDeleteTitle')}
            description={t('manageOrganizations.confirmDeleteDescription', { 
              name: orgToDelete?.name || ''
            })}
            confirmText={t('manageOrganizations.deleteOrganization')}
            cancelText={t('manageOrganizations.cancel')}
            variant="destructive"
            // isLoading={deleteOrganizationMutation.isPending} // No longer needed
          />

          {assigningOrg && (
            <AssignCategories
              organization={assigningOrg}
              isOpen={!!assigningOrg}
              onClose={() => setAssigningOrg(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
