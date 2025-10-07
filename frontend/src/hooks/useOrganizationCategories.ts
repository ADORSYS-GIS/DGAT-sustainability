import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  categoryCatalogApi,
  organizationCategoriesApi,
  weightUtils,
} from '@/services/organizationCategoriesApi';
import {
  CategoryCatalog,
  CreateCategoryCatalogRequest,
  OrganizationCategory,
  AssignCategoriesToOrganizationRequest,
  UpdateOrganizationCategoryRequest,
} from '@/types/organization-categories';

// Query keys
const QUERY_KEYS = {
  categoryCatalogs: ['category-catalogs'] as const,
  organizationCategories: (orgId: string) => ['organization-categories', orgId] as const,
};

// Category Catalog hooks
export const useCategoryCatalogs = () => {
  return useQuery({
    queryKey: QUERY_KEYS.categoryCatalogs,
    queryFn: categoryCatalogApi.getCategoryCatalogs,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateCategoryCatalog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoryCatalogApi.createCategoryCatalog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categoryCatalogs });
      toast.success('Category catalog created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category catalog: ${error.message}`);
    },
  });
};

export const useDeleteCategoryCatalog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // For deletion from catalog table, we get name and delete by underlying category id
    mutationFn: (categoryName: string) => categoryCatalogApi.deleteCategoryCatalogByName(categoryName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categoryCatalogs });
      toast.success('Category catalog deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete category catalog: ${error.message}`);
    },
  });
};

// Organization Categories hooks
export const useOrganizationCategories = (keycloakOrganizationId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.organizationCategories(keycloakOrganizationId),
    queryFn: () => organizationCategoriesApi.getOrganizationCategories(keycloakOrganizationId),
    enabled: !!keycloakOrganizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAssignCategoriesToOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ keycloakOrganizationId, request }: {
      keycloakOrganizationId: string;
      request: AssignCategoriesToOrganizationRequest;
    }) => organizationCategoriesApi.assignCategoriesToOrganization(keycloakOrganizationId, request),
    onMutate: async ({ keycloakOrganizationId, request }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.organizationCategories(keycloakOrganizationId) });
      const previous = queryClient.getQueryData(QUERY_KEYS.organizationCategories(keycloakOrganizationId));
      // Optimistically update cache
      const nowList = (previous as any)?.organization_categories ?? [];
      const newList = (request.category_catalog_ids || []).map((id, idx) => {
        const existing = nowList.find((c: any) => c.category_catalog_id === id);
        const weight = request.weights?.[idx] ?? existing?.weight ?? 0;
        return existing ?? {
          organization_category_id: `${id}-temp`,
          keycloak_organization_id: keycloakOrganizationId,
          category_catalog_id: id,
          category_name: (undefined as unknown) as string, // name will be resolved on server
          weight,
          order: idx + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });
      queryClient.setQueryData(QUERY_KEYS.organizationCategories(keycloakOrganizationId), {
        organization_categories: newList,
      });
      return { previous };
    },
    onError: (_err, { keycloakOrganizationId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.organizationCategories(keycloakOrganizationId), context.previous);
      }
      toast.error('Failed to assign categories');
    },
    onSuccess: (_, { keycloakOrganizationId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizationCategories(keycloakOrganizationId) });
      toast.success('Categories assigned to organization successfully');
    },
  });
};

export const useUpdateOrganizationCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ keycloakOrganizationId, organizationCategoryId, request }: {
      keycloakOrganizationId: string;
      organizationCategoryId: string;
      request: UpdateOrganizationCategoryRequest;
    }) => organizationCategoriesApi.updateOrganizationCategory(
      keycloakOrganizationId,
      organizationCategoryId,
      request
    ),
    onSuccess: (_, { keycloakOrganizationId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizationCategories(keycloakOrganizationId) });
      toast.success('Organization category updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update organization category: ${error.message}`);
    },
  });
};

// Utility hooks
export const useWeightManagement = () => {
  const calculateEqualWeights = (categoryCount: number) => {
    return weightUtils.calculateEqualWeights(categoryCount);
  };

  const validateTotalWeight = (weights: number[]) => {
    return weightUtils.validateTotalWeight(weights);
  };

  const getTotalWeight = (weights: number[]) => {
    return weightUtils.getTotalWeight(weights);
  };

  return {
    calculateEqualWeights,
    validateTotalWeight,
    getTotalWeight,
  };
};


