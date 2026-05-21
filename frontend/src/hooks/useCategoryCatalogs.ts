import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiInterceptor } from "@/services/apiInterceptor";
import { offlineDB } from "@/services/indexeddb";
import { DataTransformationService } from "@/services/dataTransformation";
import type { CategoryCatalog } from "@/openapi-rq/requests/types.gen";
import { CategoryCatalogService } from "@/openapi-rq/requests/services.gen";
import type { OfflineCategoryCatalog } from "@/types/offline";

export const useOfflineCategoryCatalogs = () => {
  return useQuery({
    queryKey: ["category-catalogs"],
    queryFn: async () => {
      try {
        // Trigger a background sync attempt, but keep IndexedDB as the source of truth
        apiInterceptor.interceptGet(
          () => CategoryCatalogService.getCategoryCatalog(),
          async () => null,
          'category_catalogs'
        );
      } catch (error) {
        console.log("Could not sync category catalogs, using local data.", error);
      }

      const categories = await offlineDB.getAllCategoryCatalogs();
      return categories.filter(
        (category) =>
          category.is_active !== false &&
          typeof category.name === "string" &&
          category.name.trim().length > 0
      );
    },
    staleTime: 60 * 60 * 1000, // 1 hour (reference data)
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
  });
};

export const useOfflineCategoryCatalog = (categoryCatalogId: string) => {
  return useQuery({
    queryKey: ["category-catalog", categoryCatalogId],
    queryFn: async () => {
      if (navigator.onLine) {
        try {
          const data = await CategoryCatalogService.getCategoryCatalogByCategoryCatalogId({ categoryCatalogId });
          const offlineData = DataTransformationService.transformCategoryCatalog(data as unknown as CategoryCatalog);
          await offlineDB.saveCategoryCatalog(offlineData);
          return data;
        } catch (e) {
          console.warn("API call for getCategoryCatalog failed, falling back to offline.", e);
        }
      }
      const localData = await offlineDB.getCategoryCatalog(categoryCatalogId);
      if (!localData) {
        throw new Error("Offline and not found in local DB");
      }
      return DataTransformationService.transformOfflineCategoryCatalogToApi(localData);
    },
    enabled: !!categoryCatalogId,
  });
};

export const useOfflineCategoryCatalogsMutation = () => {
  const queryClient = useQueryClient();

  const createOrUpdateMutation = useMutation({
    networkMode: 'always',
    mutationFn: async (categoryCatalog: OfflineCategoryCatalog) => {
      const tempId = categoryCatalog.category_catalog_id || `temp-${Date.now()}`;
      const offlineCategoryCatalog: OfflineCategoryCatalog = {
        ...categoryCatalog,
        category_catalog_id: tempId,
        sync_status: 'pending',
        updated_at: new Date().toISOString(),
      };

      // Await the local DB save before the mutation completes
      await offlineDB.saveCategoryCatalog(offlineCategoryCatalog);

      return offlineCategoryCatalog;
    },
    onMutate: async (newCategory: OfflineCategoryCatalog) => {
      await queryClient.cancelQueries({ queryKey: ['category-catalogs'] });
      const previousCategories = queryClient.getQueryData<OfflineCategoryCatalog[]>(['category-catalogs']);
      
      const isUpdate = 'category_catalog_id' in newCategory && !!newCategory.category_catalog_id && !String(newCategory.category_catalog_id).startsWith('temp-');

      const tempId = newCategory.category_catalog_id || `temp-${Date.now()}`;
      const optimisticCategory: OfflineCategoryCatalog = {
        ...newCategory,
        category_catalog_id: tempId,
        sync_status: 'pending',
        updated_at: new Date().toISOString(),
      };

      if (isUpdate) {
        queryClient.setQueryData<OfflineCategoryCatalog[]>(['category-catalogs'], old =>
          old?.map(category => category.category_catalog_id === newCategory.category_catalog_id ? optimisticCategory : category)
        );
      } else {
        queryClient.setQueryData<OfflineCategoryCatalog[]>(['category-catalogs'], old => [...(old || []), optimisticCategory]);
      }
      
      return { previousCategories };
    },
    onError: (err, newCategory, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['category-catalogs'], context.previousCategories);
      }
    },
    onSuccess: (data, variables) => {
      const isUpdate = 'category_catalog_id' in variables &&
        !!variables.category_catalog_id &&
        !String(variables.category_catalog_id).startsWith('temp-');

      apiInterceptor.interceptMutation(
        () => {
          const apiRequestBody = { ...variables };
          if (!isUpdate) {
            delete (apiRequestBody as Partial<CategoryCatalog>).category_catalog_id;
          }
          if (isUpdate) {
            return CategoryCatalogService.putCategoryCatalogByCategoryCatalogId({
              categoryCatalogId: variables.category_catalog_id!,
              requestBody: apiRequestBody as any,
            });
          }
          return CategoryCatalogService.postCategoryCatalog({ requestBody: apiRequestBody as any });
        },
        async () => {},
        data as unknown as Record<string, unknown>,
        'category_catalog',
        isUpdate ? 'update' : 'create'
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['category-catalogs'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (categoryCatalogId: string) => {
      // Delete the category and associated questions from IndexedDB
      await offlineDB.deleteCategoryCatalog(categoryCatalogId);
      await offlineDB.deleteOrganizationCategoriesByCategoryCatalog(categoryCatalogId);
      const deletedQuestionsCount = await offlineDB.deleteQuestionsByCategory(categoryCatalogId);

      if (!categoryCatalogId.startsWith('temp-')) {
        apiInterceptor.interceptMutation(
          async () => {
            await CategoryCatalogService.deleteCategoryCatalogByCategoryCatalogId({ categoryCatalogId });
            return { success: true, category_catalog_id: categoryCatalogId };
          },
          async () => {},
          { category_catalog_id: categoryCatalogId },
          'category_catalog',
          'delete'
        );
      }
      return { categoryCatalogId, deletedQuestionsCount };
    },
    onMutate: async (categoryCatalogId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['category-catalogs'] });
      await queryClient.cancelQueries({ queryKey: ['questions'] });

      // Get current data for rollback
      const previousCategories = queryClient.getQueryData(['category-catalogs']);
      const previousQuestions = queryClient.getQueryData(['questions']);

      // Optimistically remove the category from cache
      queryClient.setQueryData(['category-catalogs'], (old) =>
        old?.filter((c) => c.category_catalog_id !== categoryCatalogId)
      );

      // Optimistically remove associated questions from cache
      queryClient.setQueryData(['questions'], (old) =>
        old?.filter((q) => q.category_id !== categoryCatalogId)
      );

      return { previousCategories, previousQuestions };
    },
    onError: (_err, _categoryCatalogId, context) => {
      // Rollback to previous state on error
      if (context?.previousCategories) {
        queryClient.setQueryData(['category-catalogs'], context.previousCategories);
      }
      if (context?.previousQuestions) {
        queryClient.setQueryData(['questions'], context.previousQuestions);
      }
    },
    onSuccess: () => {
      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['category-catalogs'] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });

  return {
    createOrUpdate: createOrUpdateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreatingOrUpdating: createOrUpdateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
