import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, Weight, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCategoryCatalogs,
  useOrganizationCategories,
  useAssignCategoriesToOrganization,
  useUpdateOrganizationCategory,
  useWeightManagement,
} from '@/hooks/useOrganizationCategories';
import {
  CategoryCatalog,
  OrganizationCategory,
  AssignCategoriesToOrganizationRequest,
} from '@/types/organization-categories';

interface OrganizationCategoryManagerProps {
  keycloakOrganizationId: string;
  organizationName: string;
}

export const OrganizationCategoryManager: React.FC<OrganizationCategoryManagerProps> = ({
  keycloakOrganizationId,
  organizationName,
}) => {
  const { t } = useTranslation();
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<OrganizationCategory | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [customWeights, setCustomWeights] = useState<number[]>([]);
  const [useCustomWeights, setUseCustomWeights] = useState(false);

  const { calculateEqualWeights, validateTotalWeight, getTotalWeight } = useWeightManagement();

  // API hooks
  const { data: categoryCatalogsData, isLoading: catalogsLoading } = useCategoryCatalogs();
  const { data: orgCategoriesData, isLoading: orgCategoriesLoading } = useOrganizationCategories(keycloakOrganizationId);
  const assignCategoriesMutation = useAssignCategoriesToOrganization();
  const updateCategoryMutation = useUpdateOrganizationCategory();

  const categoryCatalogs = categoryCatalogsData?.category_catalogs || [];
  const organizationCategories = orgCategoriesData?.organization_categories || [];

  // Calculate total weight
  const totalWeight = getTotalWeight(organizationCategories.map(cat => cat.weight));
  const isWeightValid = validateTotalWeight(organizationCategories.map(cat => cat.weight));

  // Handle category assignment
  const handleAssignCategories = async () => {
    if (selectedCategoryIds.length === 0) {
      toast.error('Please select at least one category');
      return;
    }

    const weights = useCustomWeights ? customWeights : calculateEqualWeights(selectedCategoryIds.length);

    if (!validateTotalWeight(weights)) {
      toast.error('Total weight must equal 100%');
      return;
    }

    const request: AssignCategoriesToOrganizationRequest = {
      category_catalog_ids: selectedCategoryIds,
      weights: useCustomWeights ? weights : undefined,
    };

    try {
      await assignCategoriesMutation.mutateAsync({
        keycloakOrganizationId,
        request,
      });
      setIsAssignDialogOpen(false);
      setSelectedCategoryIds([]);
      setCustomWeights([]);
      setUseCustomWeights(false);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  // Handle weight update
  const handleUpdateWeight = async (categoryId: string, newWeight: number) => {
    if (newWeight < 1 || newWeight > 100) {
      toast.error('Weight must be between 1 and 100');
      return;
    }

    try {
      await updateCategoryMutation.mutateAsync({
        keycloakOrganizationId,
        organizationCategoryId: categoryId,
        request: { weight: newWeight },
      });
      setIsEditDialogOpen(false);
      setEditingCategory(null);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  // Update custom weights when category selection changes
  useEffect(() => {
    if (selectedCategoryIds.length > 0) {
      const weights = calculateEqualWeights(selectedCategoryIds.length);
      setCustomWeights(weights);
    }
  }, [selectedCategoryIds, calculateEqualWeights]);

  if (catalogsLoading || orgCategoriesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Organization Categories</CardTitle>
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Assign Categories
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Assign Categories to {organizationName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select Categories</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto">
                    {categoryCatalogs.map((catalog) => (
                      <div
                        key={catalog.category_catalog_id}
                        className={`p-2 border rounded cursor-pointer transition-colors ${
                          selectedCategoryIds.includes(catalog.category_catalog_id)
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => {
                          if (selectedCategoryIds.includes(catalog.category_catalog_id)) {
                            setSelectedCategoryIds(prev => prev.filter(id => id !== catalog.category_catalog_id));
                          } else {
                            setSelectedCategoryIds(prev => [...prev, catalog.category_catalog_id]);
                          }
                        }}
                      >
                        {catalog.name}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="customWeights"
                    checked={useCustomWeights}
                    onChange={(e) => setUseCustomWeights(e.target.checked)}
                  />
                  <Label htmlFor="customWeights">Use custom weights</Label>
                </div>

                {useCustomWeights && selectedCategoryIds.length > 0 && (
                  <div>
                    <Label>Custom Weights</Label>
                    <div className="space-y-2 mt-2">
                      {selectedCategoryIds.map((categoryId, index) => {
                        const catalog = categoryCatalogs.find(c => c.category_catalog_id === categoryId);
                        return (
                          <div key={categoryId} className="flex items-center space-x-2">
                            <Label className="w-32 text-sm">{catalog?.name}</Label>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              value={customWeights[index] || 0}
                              onChange={(e) => {
                                const newWeights = [...customWeights];
                                newWeights[index] = parseInt(e.target.value) || 0;
                                setCustomWeights(newWeights);
                              }}
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        );
                      })}
                      <div className="text-sm text-muted-foreground">
                        Total: {getTotalWeight(customWeights)}%
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssignCategories} disabled={assignCategoriesMutation.isPending}>
                    Assign Categories
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Weight Summary */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center space-x-2">
              <Weight className="h-4 w-4" />
              <span className="font-medium">Total Weight</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={isWeightValid ? "default" : "destructive"}>
                {totalWeight}%
              </Badge>
              {isWeightValid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>

          {/* Categories List */}
          {organizationCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No categories assigned to this organization
            </div>
          ) : (
            <div className="space-y-3">
              {organizationCategories.map((category) => (
                <div key={category.organization_category_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div>
                      <div className="font-medium">{category.category_name}</div>
                      <div className="text-sm text-muted-foreground">Order: {category.order}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{category.weight}%</span>
                      <Progress value={category.weight} className="w-16 h-2" />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCategory(category);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Weight Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category Weight</DialogTitle>
            </DialogHeader>
            {editingCategory && (
              <div className="space-y-4">
                <div>
                  <Label>Category: {editingCategory.category_name}</Label>
                </div>
                <div>
                  <Label htmlFor="weight">Weight (%)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="1"
                    max="100"
                    value={editingCategory.weight}
                    onChange={(e) => {
                      const newWeight = parseInt(e.target.value) || 0;
                      setEditingCategory({ ...editingCategory, weight: newWeight });
                    }}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleUpdateWeight(editingCategory.organization_category_id, editingCategory.weight)}
                    disabled={updateCategoryMutation.isPending}
                  >
                    Update Weight
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

