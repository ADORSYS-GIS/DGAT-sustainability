import React, { useCallback, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  useOrganizationsServiceGetOrganizationsByKeycloakOrganizationIdCategories as useGetOrganizationCategories,
  useOrganizationsServicePostOrganizationsByKeycloakOrganizationIdCategoriesAssign as useAssignCategoriesToOrganization,
} from '@/openapi-rq/queries/queries';
import type {
  OrganizationCategory,
  OrganizationResponse,
} from '@/openapi-rq/requests/types.gen';
import Select, { MultiValue } from 'react-select';
import { useTranslation } from 'react-i18next';
import { useOfflineCategoryCatalogs } from '@/hooks/useCategoryCatalogs';
import type { OfflineCategoryCatalog } from '@/types/offline';

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
  const { t, i18n } = useTranslation();
  const currentLanguage = localStorage.getItem("i18n_language") || i18n.language || "en";

  // Use offline hook to get categories with translations
  const { data: offlineCategoryCatalogs } = useOfflineCategoryCatalogs();

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

  const [selectedCategories, setSelectedCategories] = useState<MultiValue<OptionType>>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [hasManualWeights, setHasManualWeights] = useState(false);

  const getEqualWeights = (categories: MultiValue<OptionType>) => {
    const count = categories.length;
    const equalWeights: Record<string, number> = {};

    if (count === 0) {
      return equalWeights;
    }

    const baseWeight = Math.floor(100 / count);
    const remainder = 100 % count;

    categories.forEach((category, index) => {
      equalWeights[category.value] = baseWeight + (index < remainder ? 1 : 0);
    });

    return equalWeights;
  };

  // Helper function to get translated category name
  const getCategoryDisplayName = useCallback((category: OfflineCategoryCatalog) => {
    const translations = category?.name_translations as Record<string, string> | undefined;
    return translations?.[currentLanguage] || category?.name || "";
  }, [currentLanguage]);

  useEffect(() => {
    if (!organization) {
      setSelectedCategories([]);
      setWeights({});
      setHasManualWeights(false);
      return;
    }

    if (orgCategories) {
      const typedOrgCategories = orgCategories as unknown as OrganizationCategoriesResponse;
      const selected =
        offlineCategoryCatalogs?.filter((cat) =>
          typedOrgCategories.organization_categories?.some(
            (orgCat) =>
              orgCat.category_catalog_id === cat.category_catalog_id
          )
        ) || [];
      setSelectedCategories(
        selected.map((c) => ({
          value: c.category_catalog_id,
          label: getCategoryDisplayName(c),
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
      setHasManualWeights(false);
    } else {
      setSelectedCategories([]);
      setWeights({});
      setHasManualWeights(false);
    }
  }, [organization, orgCategories, offlineCategoryCatalogs, getCategoryDisplayName]);

  const handleCategoryChange = (selectedOptions: MultiValue<OptionType>) => {
    setSelectedCategories(selectedOptions);

    if (!hasManualWeights) {
      setWeights(getEqualWeights(selectedOptions));
      return;
    }

    setWeights((currentWeights) =>
      selectedOptions.reduce<Record<string, number>>((nextWeights, option) => {
        nextWeights[option.value] = currentWeights[option.value] ?? 0;
        return nextWeights;
      }, {})
    );
  };

  const handleWeightChange = (categoryId: string, value: string) => {
    if (value === '') {
      setHasManualWeights(true);
      setWeights((currentWeights) => ({ ...currentWeights, [categoryId]: 0 }));
      return;
    }

    let newValue = Number(value);
    if (isNaN(newValue)) return;

    newValue = Math.max(0, Math.min(100, Math.round(newValue)));
    setHasManualWeights(true);
    setWeights((currentWeights) => ({ ...currentWeights, [categoryId]: newValue }));
  };

  const handleRedistributeEqually = () => {
    setWeights(getEqualWeights(selectedCategories));
    setHasManualWeights(false);
  };

  const handleSubmit = async () => {
    const categoryIds = selectedCategories.map((c) => c.value);
    const finalWeights = categoryIds.map((categoryId) => weights[categoryId] ?? 0);
    const totalWeight = finalWeights.reduce((sum, weight) => sum + weight, 0);

    if (totalWeight !== 100) {
      alert(t('assignCategories.totalWeightMustBe100'));
      return;
    }

    try {
      const requestBody = {
        category_catalog_ids: categoryIds,
        weights: finalWeights,
      };

      await assignCategories.mutateAsync({
        keycloakOrganizationId: organization!.id!,
        requestBody,
      });
      await refetch();
      onClose();
    } catch (error) {
      console.error('Failed to assign or update categories:', error);
      alert(t('saveError'));
    }
  };

  const categoryOptions =
    offlineCategoryCatalogs?.map((cat) => ({
      value: cat.category_catalog_id,
      label: getCategoryDisplayName(cat),
    })) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('assignCategories.title', { org: organization?.name })}
          </DialogTitle>
          <DialogDescription>
            {t('assignCategories.description')}
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label>{t('assignCategories.categories')}</Label>
          <Select
            isMulti
            options={categoryOptions}
            value={selectedCategories}
            onChange={handleCategoryChange}
          />
        </div>
        {selectedCategories.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-3">
              <Label>{t('assignCategories.weights')}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRedistributeEqually}
              >
                {t('assignCategories.redistributeEqually')}
              </Button>
            </div>
            {selectedCategories.map((cat) => (
              <div key={cat.value} className="flex items-center gap-2 mt-2">
                <Label className="w-1/3">{cat.label}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={weights[cat.value] ?? ''}
                  onChange={(e) =>
                    handleWeightChange(cat.value, e.target.value)
                  }
                />
              </div>
            ))}
            <div>
              {t('assignCategories.total')}{' '}
              {Object.values(weights)
                .reduce((s, w) => s + w, 0)
                .toFixed(2)}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">
            {t('assignCategories.cancel')}
          </Button>
          <Button onClick={handleSubmit}>{t('assignCategories.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignCategories;
