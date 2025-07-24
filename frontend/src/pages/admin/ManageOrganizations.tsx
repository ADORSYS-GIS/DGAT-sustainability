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
  useOrganizationsServiceGetAdminOrganizations,
  useOrganizationsServicePostAdminOrganizations,
  useOrganizationsServicePutAdminOrganizationsById,
  useOrganizationsServiceDeleteAdminOrganizationsById,
} from "@/openapi-rq/queries/queries";
import type {
  OrganizationResponse,
  OrganizationCreateRequest,
} from "@/openapi-rq/requests/types.gen";
import { get } from "idb-keyval";
import Select from "react-select";
import { useTranslation } from "react-i18next";

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

export const ManageOrganizations: React.FC = () => {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingOrg, setEditingOrg] =
    useState<OrganizationResponseFixed | null>(null);
  const [formData, setFormData] = useState<OrganizationCreateRequest>({
    name: "",
    domains: [{ name: "" }],
    redirectUrl: "",
    enabled: "true",
    attributes: { categories: [] },
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const {
    data: organizations,
    isLoading,
    refetch,
  } = useOrganizationsServiceGetAdminOrganizations();
  const createOrgMutation = useOrganizationsServicePostAdminOrganizations({
    onSuccess: () => {
      refetch();
      setShowAddDialog(false);
      setFormData({
        name: "",
        domains: [{ name: "" }],
        redirectUrl: "",
        enabled: "true",
        attributes: { categories: [] },
      });
    },
  });
  const updateOrgMutation = useOrganizationsServicePutAdminOrganizationsById({
    onSuccess: () => {
      refetch();
      setShowAddDialog(false);
      setEditingOrg(null);
      setFormData({
        name: "",
        domains: [{ name: "" }],
        redirectUrl: "",
        enabled: "true",
        attributes: { categories: [] },
      });
    },
  });
  const deleteOrgMutation = useOrganizationsServiceDeleteAdminOrganizationsById(
    {
      onSuccess: () => refetch(),
    },
  );

  // Load categories from IndexedDB on mount
  React.useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true);
      const stored = (await get("sustainability_categories")) as
        | Category[]
        | undefined;
      setCategories(stored || []);
      setCategoriesLoading(false);
    };
    loadCategories();
  }, []);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }
    // Remove empty domains
    const cleanDomains = (formData.domains || []).filter((d) => d.name.trim());
    if (cleanDomains.length === 0) {
      alert("At least one domain is required");
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
      updateOrgMutation.mutate({ id: editingOrg.id, requestBody });
    } else {
      createOrgMutation.mutate({ requestBody });
    }
  };

  const handleEdit = (org: OrganizationResponseFixed) => {
    setEditingOrg(org);
    setFormData({
      name: org.name || "",
      domains: (org.domains || []).map((d) => ({ name: d.name })),
      redirectUrl: org.redirectUrl || "",
      enabled: org.enabled ? "true" : "false",
      attributes: {
        categories: (org.attributes?.categories as string[]) || [],
      },
    });
    setShowAddDialog(true);
  };

  const handleDelete = (orgId: string) => {
    if (!confirm("Are you sure you want to delete this organization?")) return;
    deleteOrgMutation.mutate({ id: orgId });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      domains: [{ name: "" }],
      redirectUrl: "",
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

  const fixedOrgs = Array.isArray(organizations)
    ? (organizations as unknown[]).map(toFixedOrg)
    : [];

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
                    {t('manageOrganizations.title')}
                  </h1>
                </div>
                <p className="text-lg text-gray-600">
                  {t('manageOrganizations.subtitle')}
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
                  <Button className="bg-dgrv-green hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('manageOrganizations.addOrganization')}
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
                        htmlFor="redirectUrl"
                        className="font-semibold text-dgrv-blue"
                      >
                        Redirect URL
                      </Label>
                      <Input
                        id="redirectUrl"
                        value={formData.redirectUrl}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            redirectUrl: e.target.value,
                          }))
                        }
                        placeholder="Enter redirect URL (e.g. https://adorsys.com/callback)"
                        className="mt-1 border-gray-300 focus:border-dgrv-blue focus:ring-dgrv-blue rounded shadow-sm"
                      />
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
                        disabled={
                          createOrgMutation.status === "pending" ||
                          updateOrgMutation.status === "pending"
                        }
                      >
                        {editingOrg ? t('manageOrganizations.update') : t('manageOrganizations.create')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={resetForm}
                        className="px-6 py-2 text-base font-semibold rounded shadow"
                      >
                        {t('manageOrganizations.cancel')}
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
                        <b>{t('manageOrganizations.domains')}:</b>{" "}
                        {org.domains.map((d) => d.name).join(", ")}
                      </div>
                    )}
                    {org.description && (
                      <div className="text-sm text-gray-600">
                        <b>{t('manageOrganizations.description')}:</b> {org.description}
                      </div>
                    )}
                    <div className="flex space-x-2 pt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(org)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {t('manageOrganizations.edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(org.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('manageOrganizations.delete')}
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
        </div>
      </div>
    </div>
  );
};
