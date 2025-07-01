export interface Category {
  categoryId: string;
  name: string;
  weight: number;
  templateId: string;
  order: number;
  enabledFor?: string[];
}

export const getCategoriesByTemplate = async (templateId: string): Promise<Category[]> => {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories?templateId=${templateId}`);
  if (!response.ok) throw new Error("Failed to fetch categories");
  return response.json();
}; 