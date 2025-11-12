import { useQuery } from '@tanstack/react-query';
import { offlineDB } from '@/services/indexeddb';
import { useActiveOrganization } from './shared/useActiveOrganization';

export const useOfflineOrganizationCategories = () => {
  const activeOrganizationId = useActiveOrganization();

  return useQuery({
    queryKey: ['offlineOrganizationCategories', activeOrganizationId],
    queryFn: () => {
      if (!activeOrganizationId) return [];
      // This assumes you have a method in offlineDB to get categories by org ID.
      // You might need to implement this method.
      return offlineDB.getOrganizationCategories(activeOrganizationId);
    },
    enabled: !!activeOrganizationId,
  });
};