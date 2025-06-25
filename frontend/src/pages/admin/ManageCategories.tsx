import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, List } from "lucide-react";
import { Category, Template } from "@/services/indexedDB";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesByTemplate,
  getAllTemplates,
} from "@/services/dataService";

export const ManageCategories: React.FC = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    weight: 25,
    templateId: "",
    order: 1,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      loadCategories();
    }
  }, [selectedTemplate]);

  const loadTemplates = async () => {
    try {
      const templateData = await getAllTemplates();
      setTemplates(templateData);
      if (templateData.length > 0 && !selectedTemplate) {
        setSelectedTemplate(templateData[0].templateId);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    }
  };

  const loadCategories = async () => {
    if (!selectedTemplate) return;

    try {
      const categoryData = await getCategoriesByTemplate(selectedTemplate);
      setCategories(categoryData.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error("Error loading categories:", error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCategory) {
        const updatedCategory: Category = {
          ...editingCategory,
          ...formData,
          templateId: selectedTemplate,
        };
        await updateCategory(updatedCategory);
        toast({
          title: "Success",
          description: "Category updated successfully",
          className: "bg-dgrv-green text-white",
        });
      } else {
        await createCategory({
          ...formData,
          templateId: selectedTemplate,
        });
        toast({
          title: "Success",
          description: "Category created successfully",
          className: "bg-dgrv-green text-white",
        });
      }

      setIsDialogOpen(false);
      setEditingCategory(null);
      setFormData({ name: "", weight: 25, templateId: "", order: 1 });
      loadCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      toast({
        title: "Error",
        description: "Failed to save category",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      weight: category.weight,
      templateId: category.templateId,
      order: category.order,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm("Are you sure you want to delete this category?"))
      return;

    try {
      await deleteCategory(categoryId);
      toast({
        title: "Success",
        description: "Category deleted successfully",
        className: "bg-dgrv-green text-white",
      });
      loadCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const selectedTemplateName =
    templates.find((t) => t.templateId === selectedTemplate)?.name || "";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center space-x-3 mb-4">
              <List className="w-8 h-8 text-dgrv-blue" />
              <h1 className="text-3xl font-bold text-dgrv-blue">
                Manage Categories
              </h1>
            </div>
            <p className="text-lg text-gray-600">
              Configure assessment categories for different tools
            </p>
          </div>

          {/* Template Selection */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Select Assessment Tool</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose an assessment tool" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem
                      key={template.templateId}
                      value={template.templateId}
                    >
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedTemplate && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Categories for {selectedTemplateName}</CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="bg-dgrv-blue hover:bg-blue-700"
                      onClick={() => {
                        setEditingCategory(null);
                        setFormData({
                          name: "",
                          weight: 25,
                          templateId: "",
                          order: categories.length + 1,
                        });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingCategory ? "Edit Category" : "Add New Category"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Category Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="e.g., Environmental Impact"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="weight">Weight (%)</Label>
                        <Input
                          id="weight"
                          type="number"
                          min="1"
                          max="100"
                          value={formData.weight}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              weight: parseInt(e.target.value) || 0,
                            }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="order">Display Order</Label>
                        <Input
                          id="order"
                          type="number"
                          min="1"
                          value={formData.order}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              order: parseInt(e.target.value) || 1,
                            }))
                          }
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-dgrv-blue hover:bg-blue-700"
                      >
                        {editingCategory
                          ? "Update Category"
                          : "Create Category"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categories.map((category) => (
                    <div
                      key={category.categoryId}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h3 className="font-medium text-lg">{category.name}</h3>
                        <p className="text-sm text-gray-600">
                          Weight: {category.weight}% | Order: {category.order}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(category.categoryId)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>
                        No categories yet. Add your first category to get
                        started!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
