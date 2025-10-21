// /frontend/src/pages/admin/AssignCategories.tsx
/**
 * @file Assign Categories dialog.
 * @description This dialog allows administrators to assign categories to an organization and set their weights.
 */
import CategorySelector from '@/components/pages/admin/AssignCategories/CategorySelector';
import WeightDistribution from '@/components/pages/admin/AssignCategories/WeightDistribution';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useCategoryCatalogServiceGetCategoryCatalog as useGetCategoryCatalogs,
  useOrganizationsServiceGetOrganizationsByKeycloakOrganizationIdCategories as useGetOrganizationCategories,
  useOrganizationsServicePostOrganizationsByKeycloakOrganizationIdCategoriesAssign as useAssignCategoriesToOrganization,
  useOrganizationsServicePutOrganizationsByKeycloakOrganizationIdCategoriesByOrganizationCategoryId as useUpdateOrganizationCategory,
} from '@/openapi-rq/queries/queries';
import type {
  CategoryCatalog,
  OrganizationCategory,
  OrganizationResponse,
} from '@/openapi-rq/requests/types.gen';
import React, { useEffect, useState } from 'react';
import { MultiValue } from 'react-select';

interface OptionType {
  value: string;
  label: string;
}

interface AssignCategoriesProps {
  organization: OrganizationResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

interface OrganizationCategoriesResponse {
  organization_categories: OrganizationCategory[];
}

const AssignCategories: React.FC<AssignCategoriesProps> = ({
  organization,
  isOpen,
  onClose,
}) => {
  const { data: categoryCatalogs } = useGetCategoryCatalogs();
  const { data: orgCategories, refetch } = useGetOrganizationCategories(
    {
      keycloakOrganizationId: organization!.id!,
    },
    undefined,
    {
      enabled: !!organization,
    }
  );

  const assignCategories = useAssignCategoriesToOrganization();
  const updateCategory = useUpdateOrganizationCategory();

  const [selectedCategories, setSelectedCategories] = useState<MultiValue<OptionType>>([]);
  const [weights, setWeights] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (!organization) {
      setSelectedCategories([]);
      setWeights({});
      return;
    }

    if (orgCategories) {
      const typedOrgCategories = orgCategories as unknown as OrganizationCategoriesResponse;
      const selected =
        categoryCatalogs?.category_catalogs?.filter((cat) =>
          typedOrgCategories.organization_categories?.some(
            (orgCat) =>
              orgCat.category_catalog_id === cat.category_catalog_id
          )
        ) || [];
      setSelectedCategories(
        selected.map((c) => ({
          value: c.category_catalog_id,
          label: c.name,
        }))
      );
      const initialWeights =
        typedOrgCategories.organization_categories?.reduce(
          (acc, cat) => {
            acc[cat.category_catalog_id!] = cat.weight || 0;
            return acc;
          },
          {} as { [key: string]: number }
        ) || {};
      setWeights(initialWeights);
    } else {
      setSelectedCategories([]);
      setWeights({});
    }
  }, [organization, orgCategories, categoryCatalogs]);

  const handleCategoryChange = (selectedOptions: MultiValue<OptionType>) => {
    setSelectedCategories(selectedOptions);
    const count = selectedOptions.length;
    const newWeights: { [key: string]: number } = {};
    if (count > 0) {
      const autoWeight = 100 / count;
      selectedOptions.forEach((option) => {
        newWeights[option.value] = autoWeight;
      });
    }
    setWeights(newWeights);
  };

  const handleWeightChange = (categoryId: string, value: string) => {
    let newValue = Number(value);
    if (isNaN(newValue)) return;

    newValue = Math.max(0, Math.min(100, newValue));

    const oldWeightOfChanged = weights[categoryId] || 0;
    if (
      newValue === oldWeightOfChanged &&
      value === String(oldWeightOfChanged)
    ) {
      return;
    }

    const newWeights = { ...weights };
    newWeights[categoryId] = newValue;

    const otherCategories = selectedCategories.filter(
      (c) => c.value !== categoryId
    );

    if (otherCategories.length > 0) {
      const sumOfOtherWeights = Object.entries(weights).reduce(
        (sum, [id, weight]) => (id !== categoryId ? sum + weight : sum),
        0
      );

      const remainingNewTotal = 100 - newValue;

      if (sumOfOtherWeights > 0) {
        const factor = remainingNewTotal / sumOfOtherWeights;
        otherCategories.forEach((cat) => {
          newWeights[cat.value] = (weights[cat.value] || 0) * factor;
        });
      } else {
        const evenSplit = remainingNewTotal / otherCategories.length;
        otherCategories.forEach((cat) => {
          newWeights[cat.value] = evenSplit;
        });
      }
    }
    setWeights(newWeights);
  };

  const handleSubmit = async () => {
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    if (Math.round(totalWeight) !== 100) {
      alert('Total weight must be 100');
      return;
    }

    const categoryIds = selectedCategories.map((c) => c.value);

    try {
      await assignCategories.mutateAsync({
        keycloakOrganizationId: organization!.id!,
        requestBody: { category_catalog_ids: categoryIds },
      });

      const { data: updatedOrgCategories } = await refetch();

      if (updatedOrgCategories) {
        await Promise.all(
          categoryIds.map((categoryId) => {
            const typedUpdatedOrgCategories = updatedOrgCategories as unknown as OrganizationCategoriesResponse;
            const orgCat = typedUpdatedOrgCategories.organization_categories?.find(
              (c) => c.category_catalog_id === categoryId
            );
            if (orgCat && weights[categoryId] !== undefined) {
              return updateCategory.mutateAsync({
                keycloakOrganizationId: organization!.id!,
                organizationCategoryId: orgCat.organization_category_id!,
                requestBody: { weight: weights[categoryId] },
              });
            }
            return Promise.resolve();
          })
        );
      }
      onClose();
    } catch (error) {
      console.error('Failed to assign or update categories:', error);
      alert('An error occurred while saving. Please try again.');
    }
  };

  const categoryOptions =
    categoryCatalogs?.category_catalogs?.map((cat) => ({
      value: cat.category_catalog_id,
      label: cat.name,
    })) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Assign Categories to {organization?.name}
          </DialogTitle>
          <DialogDescription>
            Assign categories to this organization and set their weights. The total weight must be 100.
          </DialogDescription>
        </DialogHeader>
        <CategorySelector
          options={categoryOptions}
          value={selectedCategories}
          onChange={handleCategoryChange}
        />
        {selectedCategories.length > 0 && (
          <WeightDistribution
            selectedCategories={selectedCategories}
            weights={weights}
            onWeightChange={handleWeightChange}
          />
        )}
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignCategories;