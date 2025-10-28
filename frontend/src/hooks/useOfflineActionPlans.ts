import { useQuery } from '@tanstack/react-query';
import { offlineDB } from '@/services/indexeddb';

export const useOfflineActionPlans = () => {
  return useQuery({
    queryKey: ['offlineActionPlans'],
    queryFn: async () => {
      const actionPlans = await offlineDB.getAllActionPlans();
      return actionPlans;
    },
  });
};