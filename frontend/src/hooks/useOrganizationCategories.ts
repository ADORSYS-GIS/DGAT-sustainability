import { useQuery } from '@tanstack/react-query';
import { useAuth } from './shared/useAuth';
import { OrganizationsService } from '@/openapi-rq/requests';

export const useOrganizationCategories = () => {
  const { user } = useAuth();
  
  const getOrganizationId = () => {
    if (user?.organizations) {
      const orgKeys = Object.keys(user.organizations);
      if (orgKeys.length > 0) {
        const firstOrgKey = orgKeys[0];
        return user.organizations[firstOrgKey]?.id;
      }
    }
    return undefined;
  };

  const organizationId = getOrganizationId();

  const fetchOrganizationCategories = async (orgId: string) => {
    // Directly use the generated service
    const response = await OrganizationsService.getOrganizationsByKeycloakOrganizationIdCategories({ keycloakOrganizationId: orgId });
    return response;
  };

  return useQuery({
    queryKey: ['organizationCategories', organizationId],
    queryFn: () => fetchOrganizationCategories(organizationId!),
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};