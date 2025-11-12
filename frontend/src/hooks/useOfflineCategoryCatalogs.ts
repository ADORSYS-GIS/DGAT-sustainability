import { useQuery } from '@tanstack/react-query';
import { offlineDB } from '@/services/indexeddb';

export const useOfflineCategoryCatalogs = () => {
  return useQuery({
    queryKey: ['offlineCategoryCatalogs'],
    queryFn: () => {
      return offlineDB.getAllCategoryCatalogs();
    },
  });
};