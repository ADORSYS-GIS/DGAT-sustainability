import {
  CategoryCatalog,
  CategoryCatalogListResponse,
  CategoryCatalogResponse,
  CreateCategoryCatalogRequest,
  OrganizationCategory,
  OrganizationCategoryListResponse,
  OrganizationCategoryResponse,
  AssignCategoriesToOrganizationRequest,
  UpdateOrganizationCategoryRequest,
} from '@/types/organization-categories';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('keycloak_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Category Catalog API functions
export const categoryCatalogApi = {
  // Get all active category catalogs
  async getCategoryCatalogs(): Promise<CategoryCatalogListResponse> {
    const response = await fetch(`${API_BASE_URL}/category-catalog`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch category catalogs: ${response.statusText}`);
    }

    return response.json();
  },

  // Create a new category catalog entry
  async createCategoryCatalog(request: CreateCategoryCatalogRequest): Promise<CategoryCatalogResponse> {
    const response = await fetch(`${API_BASE_URL}/category-catalog`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to create category catalog: ${response.statusText}`);
    }

    return response.json();
  },
};

// Organization Categories API functions
export const organizationCategoriesApi = {
  // Get organization categories by Keycloak organization ID
  async getOrganizationCategories(keycloakOrganizationId: string): Promise<OrganizationCategoryListResponse> {
    const response = await fetch(`${API_BASE_URL}/organizations/${keycloakOrganizationId}/categories`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch organization categories: ${response.statusText}`);
    }

    return response.json();
  },

  // Assign categories to an organization with equal weight distribution
  async assignCategoriesToOrganization(
    keycloakOrganizationId: string,
    request: AssignCategoriesToOrganizationRequest
  ): Promise<OrganizationCategoryListResponse> {
    const response = await fetch(`${API_BASE_URL}/organizations/${keycloakOrganizationId}/categories/assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to assign categories to organization: ${response.statusText}`);
    }

    return response.json();
  },

  // Update organization category weight
  async updateOrganizationCategory(
    keycloakOrganizationId: string,
    organizationCategoryId: string,
    request: UpdateOrganizationCategoryRequest
  ): Promise<OrganizationCategoryResponse> {
    const response = await fetch(
      `${API_BASE_URL}/organizations/${keycloakOrganizationId}/categories/${organizationCategoryId}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update organization category: ${response.statusText}`);
    }

    return response.json();
  },
};

// Utility functions for weight management
export const weightUtils = {
  // Calculate equal weight distribution
  calculateEqualWeights(categoryCount: number): number[] {
    if (categoryCount === 0) return [];
    
    const equalWeight = Math.floor(100 / categoryCount);
    const remainder = 100 % categoryCount;
    
    const weights = new Array(categoryCount).fill(equalWeight);
    
    // Add remainder to first categories
    for (let i = 0; i < remainder; i++) {
      weights[i]++;
    }
    
    return weights;
  },

  // Validate that total weight equals 100
  validateTotalWeight(weights: number[]): boolean {
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    return total === 100;
  },

  // Get total weight
  getTotalWeight(weights: number[]): number {
    return weights.reduce((sum, weight) => sum + weight, 0);
  },
};

