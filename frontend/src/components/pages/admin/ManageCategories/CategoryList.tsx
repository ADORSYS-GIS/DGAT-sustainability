// /frontend/src/components/pages/admin/ManageCategories/CategoryList.tsx
/**
 * @file List component for displaying categories.
 * @description This component renders a list of categories with options to edit or delete them.
 */
import { Button } from '@/components/ui/button';
import { OfflineCategoryCatalog } from '@/types/offline';
import { Edit, Trash2 } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface CategoryListProps {
  categories: OfflineCategoryCatalog[];
  onEdit: (category: OfflineCategoryCatalog) => void;
  onDelete: (categoryId: string) => void;
  isPending: boolean;
}

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  onEdit,
  onDelete,
  isPending,
}) => {
  const { t } = useTranslation();

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{t('manageCategories.noCategoriesYet')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div
          key={category.category_catalog_id}
          className="flex items-center justify-between p-4 border rounded-lg"
        >
          <div>
            <h3 className="font-medium text-lg">{category.name}</h3>
            <p className="text-sm text-gray-600">
              {category.description}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(category)}
              disabled={isPending}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(category.category_catalog_id)}
              className="text-red-600 hover:text-red-700"
              disabled={isPending}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryList;