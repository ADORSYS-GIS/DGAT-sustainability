/*
 * Category list component for displaying and managing assessment categories
 * Shows category items with edit/delete actions and weight validation
 */

import { Button } from "@/components/ui/button";
import { Edit, Trash2, List } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Category {
  category_id: string;
  name: string;
  weight: number;
  order: number;
  template_id: string;
  created_at: string;
  updated_at: string;
}

interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  isPending: boolean;
  weightExceeds: boolean;
  weightNot100: boolean;
  totalWeight: number;
  onRedistributeWeights: () => Promise<void>;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  onEdit,
  onDelete,
  isPending,
  weightExceeds,
  weightNot100,
  totalWeight,
  onRedistributeWeights,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div
          key={category.category_id}
          className="flex items-center justify-between p-4 border rounded-lg"
        >
          <div>
            <h3 className="font-medium text-lg">{category.name}</h3>
            <p className="text-sm text-gray-600">
              {t('manageCategories.weightLabel', { weight: category.weight, order: category.order })}
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
              onClick={() => onDelete(category.category_id)}
              className="text-red-600 hover:text-red-700"
              disabled={isPending}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
      
      {weightExceeds && (
        <div className="text-center py-4 text-red-600">
          <p className="mb-2">
            {t('manageCategories.totalWeightExceeds')}
          </p>
          <Button
            variant="outline"
            onClick={onRedistributeWeights}
            className="bg-dgrv-blue text-white hover:bg-blue-700"
            disabled={isPending}
          >
            {t('manageCategories.redistributeWeights')}
          </Button>
        </div>
      )}
      
      {!weightExceeds && weightNot100 && categories.length > 0 && (
        <div className="text-center py-4 text-yellow-600">
          <p>
            {t('manageCategories.totalWeightNot100', { total: totalWeight })}
          </p>
        </div>
      )}
      
      {categories.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>
            {t('manageCategories.noCategoriesYet')}
          </p>
        </div>
      )}
    </div>
  );
}; 