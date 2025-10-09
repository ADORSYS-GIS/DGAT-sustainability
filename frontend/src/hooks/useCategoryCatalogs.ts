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
      const result = await apiInterceptor.interceptGet(
        () => CategoryCatalogService.getCategoryCatalog(),
        async () => {
          const catalogs = await offlineDB.getAllCategoryCatalogs();
          return { category_catalogs: catalogs };
        },
        'category_catalogs'
      );
      return result.category_catalogs as OfflineCategoryCatalog[];
    },
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
    mutationFn: async (categoryCatalog: CategoryCatalog) => {
      const isUpdate = 'category_catalog_id' in categoryCatalog &&
        !!categoryCatalog.category_catalog_id &&
        !String(categoryCatalog.category_catalog_id).startsWith('temp-');
      const tempId = `temp-${Date.now()}`;
      
      // Ensure category_catalog_id is always a string for offline storage
      const catalogWithId = {
        ...categoryCatalog,
        category_catalog_id: categoryCatalog.category_catalog_id || tempId,
      };
      
      const offlineCategoryCatalog = DataTransformationService.transformCategoryCatalog(catalogWithId);

      // Prepare request body for API call
      const apiRequestBody = { ...categoryCatalog };
      if (!isUpdate) {
        // For create operations, remove temporary ID if it exists
        delete (apiRequestBody as Partial<CategoryCatalog>).category_catalog_id;
      }

      return apiInterceptor.interceptMutation(
        () => {
          if (isUpdate) {
            return CategoryCatalogService.putCategoryCatalogByCategoryCatalogId({
              categoryCatalogId: categoryCatalog.category_catalog_id!,
              requestBody: apiRequestBody,
            });
          }
          return CategoryCatalogService.postCategoryCatalog({ requestBody: apiRequestBody });
        },
        async () => { await offlineDB.saveCategoryCatalog(offlineCategoryCatalog); },
        offlineCategoryCatalog as unknown as Record<string, unknown>,
        'category_catalog',
        isUpdate ? 'update' : 'create'
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-catalogs"] });
      queryClient.invalidateQueries({ queryKey: ["category-catalog"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (categoryCatalogId: string) => {
      const apiCall = async () => {
        await CategoryCatalogService.deleteCategoryCatalogByCategoryCatalogId({ categoryCatalogId });
        return { category_catalog_id: categoryCatalogId };
      };

      return apiInterceptor.interceptMutation(
        apiCall,
        async () => { await offlineDB.deleteCategoryCatalog(categoryCatalogId); },
        { category_catalog_id: categoryCatalogId },
        'category_catalog',
        'delete'
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-catalogs"] });
      queryClient.invalidateQueries({ queryKey: ["category-catalog"] });
    },
  });

  return {
    createOrUpdate: createOrUpdateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreatingOrUpdating: createOrUpdateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};