import { useState, useEffect } from 'react';

const ACTIVE_ORG_STORAGE_KEY = 'activeOrganizationId';

export const useActiveOrganization = (): string | null => {
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setActiveOrgId(localStorage.getItem(ACTIVE_ORG_STORAGE_KEY));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return activeOrgId;
};

export const setActiveOrganization = (orgId: string) => {
  localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, orgId);
  // Dispatch a storage event to notify other tabs/windows
  window.dispatchEvent(new StorageEvent('storage', {
    key: ACTIVE_ORG_STORAGE_KEY,
    newValue: orgId,
  }));
};