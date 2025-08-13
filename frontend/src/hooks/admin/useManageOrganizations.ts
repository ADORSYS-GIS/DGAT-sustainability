import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useOfflineSyncStatus } from "@/hooks/useOfflineApi";
import {
  useOrganizationsServiceGetAdminOrganizations,
  useOrganizationsServicePostAdminOrganizations,
  useOrganizationsServicePutAdminOrganizationsById,
  useOrganizationsServiceDeleteAdminOrganizationsById
} from "@/openapi-rq/queries/queries";
import { useOfflineCategoriesMutation } from "@/hooks/useOfflineApi";
import type { OrganizationResponse } from "@/openapi-rq/requests/types.gen";

interface Category {
  categoryId: string;
  name: string;
  weight: number;
  order: number;
  templateId: string;
}

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

function toFixedOrg(org: OrganizationResponse): OrganizationResponseFixed {
  const attributes: { [key: string]: string[] } = {};
  if (org.attributes && typeof org.attributes === 'object' && org.attributes !== null) {
    const attrsObj = org.attributes as Record<string, unknown>;
    for (const [key, value] of Object.entries(attrsObj)) {
      if (Array.isArray(value)) {
        const stringValues: string[] = value
          .filter(v => typeof v === 'string')
          .map(v => v as string);
        attributes[key] = stringValues;
      }
    }
  }
  
  // Use type assertion to access properties that might not be in the type definition
  const orgAny = org as any;
  
  return {
    id: org.id || '',
    name: org.name || '',
    alias: orgAny.alias,
    enabled: orgAny.enabled ?? false,
    description: orgAny.description,
    redirectUrl: orgAny.redirectUrl,
    domains: Array.isArray(org.domains)
      ? (org.domains as unknown[]).map((d) => ({
          name: (d as Record<string, unknown>).name as string,
          verified: (d as Record<string, unknown>).verified as
            | boolean
            | undefined,
        }))
      : [],
    attributes: attributes,
  };
}

export const useManageOrganizations = () => {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationResponseFixed | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    domains: [{ name: "" }],
    redirectUrl: import.meta.env.VITE_ORGANIZATION_REDIRECT_URL || "http://localhost:5173",
    enabled: "true",
    attributes: { categories: [] },
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  const [showCategoryCreation, setShowCategoryCreation] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    weight: 25,
    order: 1,
  });
  
  const categoryMutations = useOfflineCategoriesMutation();
  const createCategory = categoryMutations.createCategory.mutate;
  
  const {
    data: organizations,
    isLoading,
    refetch,
  } = useOrganizationsServiceGetAdminOrganizations();
  
  const createOrganizationMutation = useOrganizationsServicePostAdminOrganizations({
    onSuccess: (result) => {
      toast.success("Organization created successfully");
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
    },
    onError: (error) => {
      console.error('Failed to create organization:', error);
      toast.error("Failed to create organization");
    }
  });

  const updateOrganizationMutation = useOrganizationsServicePutAdminOrganizationsById({
    onSuccess: () => {
      toast.success("Organization updated successfully");
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
    },
    onError: (error) => {
      console.error('Failed to update organization:', error);
      toast.error("Failed to update organization");
    }
  });

  const deleteOrganizationMutation = useOrganizationsServiceDeleteAdminOrganizationsById({
    onSuccess: () => {
      toast.success("Organization deleted successfully");
      refetch();
    },
    onError: (error) => {
      console.error('Failed to delete organization:', error);
      toast.error("Failed to delete organization");
    }
  });

  const { isOnline } = useOfflineSyncStatus();

  const fixedOrgs = organizations ? 
    (Array.isArray(organizations) ? organizations : [organizations]).map(toFixedOrg) 
    : [];

  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const { offlineDB } = await import('@/services/indexeddb');
      const stored = await offlineDB.getAllCategories();
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

  useEffect(() => {
    loadCategories();
  }, []);

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
    const selectedCategories = (formData.attributes?.categories as string[]) || [];
    if (selectedCategories.length === 0) {
      toast.error("At least one category is required");
      return;
    }
    const requestBody = {
      name: formData.name,
      domains: cleanDomains,
      redirectUrl: formData.redirectUrl,
      enabled: "true" as const,
      attributes: {
        categories: selectedCategories as any[],
      },
    };
    
    if (editingOrg) {
      updateOrganizationMutation.mutate({ 
        id: editingOrg.id, 
        requestBody 
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
      redirectUrl: org.redirectUrl || import.meta.env.VITE_ORGANIZATION_REDIRECT_URL || "http://localhost:5173",
      enabled: org.enabled ? "true" : "false",
      attributes: {
        categories: (org.attributes?.categories as any[]) || [],
      },
    });
    setShowAddDialog(true);
    setShowCategoryCreation(false);
    setCategoryFormData({
      name: "",
      weight: 25,
      order: 1,
    });
  };

  const handleDelete = (orgId: string) => {
    if (!confirm("Are you sure you want to delete this organization?")) return;
    
    deleteOrganizationMutation.mutate({ id: orgId });
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
    setShowCategoryCreation(false);
    setCategoryFormData({
      name: "",
      weight: 25,
      order: 1,
    });
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

  const handleCreateCategory = async () => {
    if (!categoryFormData.name.trim()) {
      toast.error(t('manageCategories.textRequired', { defaultValue: 'Category name is required' }));
      return;
    }

    if (categoryFormData.weight <= 0 || categoryFormData.weight > 100) {
      toast.error(t('manageCategories.weightRangeError', { defaultValue: 'Weight must be between 1 and 100' }));
      return;
    }

    await createCategory({
      name: categoryFormData.name,
      weight: categoryFormData.weight,
      order: categoryFormData.order,
      template_id: "sustainability_template_1",
    }, {
      onSuccess: (result) => {
        console.log('✅ Category creation onSuccess called with result:', result);
        toast.success(t('manageCategories.createSuccess', { defaultValue: 'Category created successfully' }));
        const newCategoryName = categoryFormData.name;
        setFormData((prev) => ({
          ...prev,
          attributes: {
            ...prev.attributes,
            categories: [...(prev.attributes?.categories || []), newCategoryName],
          },
        }));
        setCategoryFormData({ name: "", weight: 25, order: categories.length + 1 });
        setShowCategoryCreation(false);
        loadCategories();
      },
      onError: (error) => {
        console.error('❌ Category creation onError called with error:', error);
        toast.error(t('manageCategories.createError', { defaultValue: 'Failed to create category' }));
      }
    });
  };

  return {
    // State
    showAddDialog,
    setShowAddDialog,
    editingOrg,
    setEditingOrg,
    formData,
    setFormData,
    categories,
    categoriesLoading,
    showCategoryCreation,
    setShowCategoryCreation,
    categoryFormData,
    setCategoryFormData,
    
    // Data
    organizations: fixedOrgs,
    isLoading: isLoading || categoriesLoading,
    isOnline,
    
    // Mutations
    categoryMutations,
    createOrganizationMutation,
    updateOrganizationMutation,
    deleteOrganizationMutation,
    
    // Functions
    handleSubmit,
    handleEdit,
    handleDelete,
    resetForm,
    handleDomainChange,
    addDomain,
    removeDomain,
    handleCreateCategory,
    loadCategories,
    refetch,
  };
}; 