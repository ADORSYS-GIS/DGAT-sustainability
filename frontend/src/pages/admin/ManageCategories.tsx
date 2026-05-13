import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useOfflineSyncStatus
} from "@/hooks/useOfflineSync";
import { useOfflineCategoryCatalogs, useOfflineCategoryCatalogsMutation } from "@/hooks/useCategoryCatalogs";
import { OfflineCategoryCatalog } from "@/types/offline";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Edit, Plus, Trash2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const SUSTAINABILITY_TEMPLATE_ID = "sustainability_template_1";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ss", name: "siSwati", flag: "🇸🇿" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "zu", name: "isiZulu", flag: "🇿🇦" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
];

interface ApiError {
  message?: string;
  detail?: string;
}

export const ManageCategories: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<OfflineCategoryCatalog | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    name_translations: LANGUAGES.reduce(
      (acc, lang) => ({ ...acc, [lang.code]: "" }),
      {} as Record<string, string>,
    ),
    description_translations: LANGUAGES.reduce(
      (acc, lang) => ({ ...acc, [lang.code]: "" }),
      {} as Record<string, string>,
    ),
  });
  // State for add/edit dialog weight error
  const [showDialogWeightError, setShowDialogWeightError] = useState(false);

  const nonEnglishLanguages = LANGUAGES.filter((lang) => lang.code !== "en");

  // Use offline hooks for all data fetching
  const { data: categoriesData, isLoading, error, refetch } = useOfflineCategoryCatalogs();

  const categories = categoriesData || [];

  // Use enhanced offline mutation hooks
  const mutationHooks = useOfflineCategoryCatalogsMutation();
  const createOrUpdateCategory = mutationHooks.createOrUpdate;
  const deleteCategory = mutationHooks.delete;
  const isPending = mutationHooks.isCreatingOrUpdating || mutationHooks.isDeleting;

  const { isOnline } = useOfflineSyncStatus();

  useEffect(() => {
    const handleDataSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.entityType === 'category_catalog' || customEvent.detail.entityType === 'category_catalogs') {
        console.log('Received datasync event for categories, refetching...');
        refetch();
      }
    };

    window.addEventListener('datasync', handleDataSync);

    return () => {
      window.removeEventListener('datasync', handleDataSync);
    };
  }, [refetch]);

  // Use categories as is (no sorting needed)
  const sortedCategories = [...categories];

  // Calculate total weight

  const currentLanguage = localStorage.getItem("i18n_language") || i18n.language || "en";
  const getCategoryDisplayName = (category: OfflineCategoryCatalog) => {
    const translations = (category as any).name_translations as Record<string, string> | undefined;
    const translated = translations && typeof translations[currentLanguage] === "string" ? translations[currentLanguage] : undefined;
    return translated || category.name;
  };

  const getCategoryDisplayDescription = (category: OfflineCategoryCatalog) => {
    const translations = (category as any).description_translations as Record<string, string> | undefined;
    const translated = translations && typeof translations[currentLanguage] === "string" ? translations[currentLanguage] : undefined;
    return translated || category.description;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name_translations: Record<string, string> = {};
    for (const code of Object.keys(formData.name_translations)) {
      if (formData.name_translations[code] && formData.name_translations[code].trim()) {
        name_translations[code] = formData.name_translations[code].trim();
      }
    }
    const description_translations: Record<string, string> = {};
    for (const code of Object.keys(formData.description_translations)) {
      if (formData.description_translations[code] && formData.description_translations[code].trim()) {
        description_translations[code] = formData.description_translations[code].trim();
      }
    }

    try {
      if (editingCategory) {
        await createOrUpdateCategory({
          ...editingCategory,
          name: formData.name,
          description: formData.description,
          name_translations,
          description_translations,
        });
        toast.success(t('manageCategories.updateSuccess'));
      } else {
        await createOrUpdateCategory({
          name: formData.name,
          description: formData.description,
          name_translations: Object.keys(name_translations).length > 0 ? name_translations : undefined,
          description_translations: Object.keys(description_translations).length > 0 ? description_translations : undefined,
          template_id: SUSTAINABILITY_TEMPLATE_ID,
          is_active: true,
        } as OfflineCategoryCatalog);
        toast.success(t('manageCategories.createSuccess'));
      }
      setIsDialogOpen(false);
      setEditingCategory(null);
      setFormData({
        name: "",
        description: "",
        name_translations: LANGUAGES.reduce(
          (acc, lang) => ({ ...acc, [lang.code]: "" }),
          {} as Record<string, string>,
        ),
        description_translations: LANGUAGES.reduce(
          (acc, lang) => ({ ...acc, [lang.code]: "" }),
          {} as Record<string, string>,
        ),
      });
    } catch (error) {
      const err = error as ApiError;
      const errorMessage = err.detail || err.message || t('manageCategories.submitError');
      toast.error(errorMessage);
    }
  };

  const handleEdit = (category: OfflineCategoryCatalog) => {
    setEditingCategory(category);
    const nameTranslations = (category as any).name_translations as Record<string, string> | undefined;
    const descriptionTranslations = (category as any).description_translations as Record<string, string> | undefined;

    setFormData({
      name: category.name,
      description: category.description ?? "",
      name_translations: LANGUAGES.reduce(
        (acc, lang) => {
          acc[lang.code] = nameTranslations?.[lang.code] || "";
          return acc;
        },
        {} as Record<string, string>,
      ),
      description_translations: LANGUAGES.reduce(
        (acc, lang) => {
          acc[lang.code] = descriptionTranslations?.[lang.code] || "";
          return acc;
        },
        {} as Record<string, string>,
      ),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm(t('manageCategories.confirmDelete')))
      return;

    try {
      await deleteCategory(categoryId);
      toast.success(t('manageCategories.deleteSuccess'));
    } catch (error) {
      const err = error as ApiError;
      const errorMessage = err.detail || err.message || t('manageCategories.deleteError');
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="hero" fullPage text={t("loading")} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              {t('manageCategories.loadError')}
            </h2>
            <p className="text-gray-600 mb-4">
              {error instanceof Error ? error.message : t('manageCategories.unknownError')}
            </p>
            <Button
              onClick={() => refetch()}
              className="bg-dgrv-blue hover:bg-blue-700"
            >
              {t('manageCategories.retry')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Offline Status Indicator */}
          <div className="mb-4 flex items-center justify-end">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${isOnline
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
              }`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
              <span>{isOnline ? t('connection.onlineStatus') : t('connection.offlineStatus')}</span>
            </div>
          </div>

          <div className="mb-8 animate-fade-in">
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-dgrv-blue mb-6">
                {t('manageCategories.title')}
              </h1>
            </div>
            <p className="text-lg text-gray-600">
              {t('manageCategories.configureCategories')}
            </p>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('manageCategories.categories')}</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-dgrv-blue hover:bg-blue-700"
                    onClick={() => {
                      setEditingCategory(null);
                      setFormData({
                        name: "",
                        description: "",
                        name_translations: LANGUAGES.reduce(
                          (acc, lang) => ({ ...acc, [lang.code]: "" }),
                          {} as Record<string, string>,
                        ),
                        description_translations: LANGUAGES.reduce(
                          (acc, lang) => ({ ...acc, [lang.code]: "" }),
                          {} as Record<string, string>,
                        ),
                      });
                      setShowDialogWeightError(false);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('manageCategories.addCategory')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory ? t('manageCategories.editCategory') : t('manageCategories.addCategory')}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">{t('manageCategories.categoryName')}</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder={t('manageCategories.categoryNamePlaceholder')}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">{t('manageCategories.categoryDescription')}</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder={t('manageCategories.categoryDescriptionPlaceholder')}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        {t('manageQuestions.additionalLanguagesOptional')}
                      </Label>
                      <Accordion type="multiple" className="w-full">
                        {nonEnglishLanguages.map((lang) => (
                          <AccordionItem key={lang.code} value={lang.code}>
                            <AccordionTrigger className="py-2 text-sm">
                              <span className="flex items-center gap-2">
                                <span>{lang.flag}</span>
                                <span>{lang.name}</span>
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label className="text-xs font-medium text-gray-600">
                                    {t('manageCategories.categoryName')}
                                  </Label>
                                  <Input
                                    value={formData.name_translations[lang.code] || ""}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        name_translations: { ...prev.name_translations, [lang.code]: e.target.value },
                                      }))
                                    }
                                    placeholder={t('manageCategories.categoryNamePlaceholder')}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-medium text-gray-600">
                                    {t('manageCategories.categoryDescription')}
                                  </Label>
                                  <Input
                                    value={formData.description_translations[lang.code] || ""}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        description_translations: { ...prev.description_translations, [lang.code]: e.target.value },
                                      }))
                                    }
                                    placeholder={t('manageCategories.categoryDescriptionPlaceholder')}
                                  />
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-dgrv-blue hover:bg-blue-700"
                      disabled={isPending}
                    >
                      {isPending
                        ? t('manageCategories.saving')
                        : editingCategory
                          ? t('manageCategories.updateCategory')
                          : t('manageCategories.createCategory')}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedCategories.map((category) => (
                  <div
                    key={category.category_catalog_id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium text-lg">{getCategoryDisplayName(category)}</h3>
                      <p className="text-sm text-gray-600">
                        {getCategoryDisplayDescription(category)}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        disabled={isPending}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(category.category_catalog_id)}
                        className="text-red-600 hover:text-red-700"
                        disabled={isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {/* Show error and redistribute button if needed */}
                {sortedCategories.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>
                      {t('manageCategories.noCategoriesYet')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
