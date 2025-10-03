// Types for the new organization category weight management system

export interface CategoryCatalog {
  category_catalog_id: string;
  name: string;
  description?: string;
  template_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryCatalogRequest {
  name: string;
  description?: string;
  template_id: string;
  is_active?: boolean;
}

export interface UpdateCategoryCatalogRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface CategoryCatalogResponse {
  category_catalog: CategoryCatalog;
}

export interface CategoryCatalogListResponse {
  category_catalogs: CategoryCatalog[];
}

export interface OrganizationCategory {
  organization_category_id: string;
  keycloak_organization_id: string;
  category_catalog_id: string;
  category_name: string; // Denormalized for easier access
  weight: number;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateOrganizationCategoryRequest {
  keycloak_organization_id: string;
  category_catalog_id: string;
  weight: number;
  order: number;
}

export interface UpdateOrganizationCategoryRequest {
  weight?: number;
  order?: number;
}

export interface AssignCategoriesToOrganizationRequest {
  category_catalog_ids: string[];
  weights?: number[]; // If not provided, weights will be distributed equally
}

export interface OrganizationCategoryResponse {
  organization_category: OrganizationCategory;
}

export interface OrganizationCategoryListResponse {
  organization_categories: OrganizationCategory[];
}

// Legacy category interface for backward compatibility
export interface LegacyCategory {
  categoryId: string;
  name: string;
  weight: number;
  order: number;
  templateId: string;
}

