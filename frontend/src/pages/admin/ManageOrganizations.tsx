// /frontend/src/pages/admin/ManageOrganizations.tsx
/**
 * @file Page for managing organizations.
 * @description This page allows administrators to create, update, delete, and manage organizations.
 */
import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useOfflineOrganizations } from "@/hooks/useOfflineOrganizations";
import type {
  OrganizationCreateRequest,
  OrganizationResponse,
} from "@/openapi-rq/requests/types.gen";
import { Building2, Plus } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import AssignCategories from "./AssignCategories";
import OrganizationCard from "@/components/pages/admin/ManageOrganizations/OrganizationCard";
import OrganizationDialog from "@/components/pages/admin/ManageOrganizations/OrganizationDialog";

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
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<OrganizationResponse | null>(null);

  const {
    organizations: offlineOrganizations,
    isLoading,
    createOrganizationOffline,
    updateOrganizationOffline,
    deleteOrganizationOffline,
    refetchOrganizations,
  } = useOfflineOrganizations();

  const orgs = offlineOrganizations || [];

  React.useEffect(() => {
    const handleDataSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.entityType === 'organization') {
        refetchOrganizations();
      }
    };

    window.addEventListener('datasync', handleDataSync);

    return () => {
      window.removeEventListener('datasync', handleDataSync);
    };
  }, [refetchOrganizations]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
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
    setShowAddDialog(false);
    setEditingOrg(null);
    setFormData({
      name: "",
      domains: [{ name: "" }],
      redirectUrl: import.meta.env.VITE_ORGANIZATION_REDIRECT_URL || "https://ec2-56-228-63-114.eu-north-1.compute.amazonaws.com/",
      enabled: "true",
      attributes: { categories: [] },
    });
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
    setShowDeleteConfirmation(false);
    setOrgToDelete(null);
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
      <div className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <Building2 className="w-8 h-8 text-dgrv-blue" />
                  <h1 className="text-3xl font-bold text-dgrv-blue">
                    {t('manageOrganizations.title')}
                  </h1>
                </div>
                <p className="text-lg text-gray-600">
                  {t('manageOrganizations.subtitle')}
                </p>
              </div>
              <Button
                className="bg-dgrv-green hover:bg-green-700"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('manageOrganizations.addOrganization')}
              </Button>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org, index) => (
              <OrganizationCard
                key={org.id}
                org={org}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAssign={setAssigningOrg}
                index={index}
              />
            ))}
            {orgs.length === 0 && (
              <Card className="md:col-span-2 lg:col-span-3 text-center py-12">
                <CardContent>
                  <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {t('manageOrganizations.noOrganizations')}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {t('manageOrganizations.getStarted')}
                  </p>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-dgrv-green hover:bg-green-700"
                  >
                    {t('manageOrganizations.addFirstOrganization')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
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
      <OrganizationDialog
        isOpen={showAddDialog}
        onClose={resetForm}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        editingOrg={!!editingOrg}
        handleDomainChange={handleDomainChange}
        addDomain={addDomain}
        removeDomain={removeDomain}
      />
    </div>
  );
};
