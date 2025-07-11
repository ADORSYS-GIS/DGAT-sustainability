import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/shared/Navbar";
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
import { toast } from "sonner";
import { Plus, Edit, Trash2, List } from "lucide-react";
import { get, set } from "idb-keyval";
import type { Category } from "@/types/category";

const SUSTAINABILITY_TEMPLATE_ID = "sustainability_template_1";
const CATEGORIES_KEY = "sustainability_categories";

export const ManageCategories: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    weight: 25,
    order: 1,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      try {
        const stored = (await get(CATEGORIES_KEY)) as Category[] | undefined;
        setCategories(stored ?? []);
        toast.success(
          `Loaded ${stored?.length ?? 0} categories successfully!`,
          {
            className: "bg-dgrv-green text-white",
          },
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, []);

  const persistCategories = async (cats: Category[]) => {
    try {
      await set(CATEGORIES_KEY, cats);
      setCategories(cats);
      toast.success(`Saved ${cats.length} categories successfully!`, {
        className: "bg-dgrv-green text-white",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const categoryData: Category = {
      categoryId:
        editingCategory?.categoryId || Math.random().toString(36).slice(2),
      name: formData.name,
      weight: formData.weight,
      order: formData.order,
      templateId: SUSTAINABILITY_TEMPLATE_ID,
    };
    let updatedCategories: Category[];
    if (editingCategory) {
      updatedCategories = categories.map((cat) =>
        cat.categoryId === editingCategory.categoryId ? categoryData : cat,
      );
      toast.success("Category updated.");
    } else {
      updatedCategories = [...categories, categoryData];
      toast.success("Category created.");
    }
    setCategories(updatedCategories);
    await persistCategories(updatedCategories);
    setIsDialogOpen(false);
    setEditingCategory(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      weight: category.weight,
      order: category.order,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm("Are you sure you want to delete this category?"))
      return;
    const updatedCategories = categories.filter(
      (cat) => cat.categoryId !== categoryId,
    );
    setCategories(updatedCategories);
    await persistCategories(updatedCategories);
    toast.success("Category deleted.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
        </div>
      </div>
    );
  }

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
              Configure categories for the Sustainability Assessment
            </p>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sustainability Assessment Categories</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-dgrv-blue hover:bg-blue-700"
                    onClick={() => {
                      setEditingCategory(null);
                      setFormData({
                        name: "",
                        weight: 25,
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
                      {editingCategory ? "Update Category" : "Create Category"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedCategories.map((category) => (
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
                {sortedCategories.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>
                      No categories yet. Add your first category to get started!
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
