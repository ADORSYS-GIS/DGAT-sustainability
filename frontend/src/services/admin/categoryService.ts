const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface Category {
  categoryId: string;
  name: string;
  weight: number;
  templateId: string;
  order: number;
}

export const getCategoriesByTemplate = async (
  templateId: string,
): Promise<Category[]> => {
  if (!templateId) return [];
  const response = await fetch(
    `${API_BASE_URL}/categories?templateId=${templateId}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch categories");
  }
  return response.json();
};

export const createCategory = async (
  categoryData: Omit<Category, "categoryId">,
): Promise<Category> => {
  const response = await fetch(`${API_BASE_URL}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(categoryData),
  });
  if (!response.ok) {
    throw new Error("Failed to create category");
  }
  return response.json();
};

export const updateCategory = async (category: Category): Promise<Category> => {
  const response = await fetch(
    `${API_BASE_URL}/categories/${category.categoryId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(category),
    },
  );
  if (!response.ok) {
    throw new Error("Failed to update category");
  }
  return response.json();
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete category");
  }
};
