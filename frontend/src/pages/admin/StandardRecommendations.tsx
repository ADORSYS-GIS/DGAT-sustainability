/*
 * Admin page for managing standard recommendations used in assessment reviews
 * Provides CRUD operations for recommendation templates with offline storage
 */

import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, Plus, Edit, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { set, get, del } from "idb-keyval";
import { useOfflineSyncStatus } from "@/hooks/useOfflineApi";

const STANDARD_RECOMMENDATIONS_KEY = "standard_recommendations";

interface Recommendation {
  id: string;
  text: string;
}

export const StandardRecommendations: React.FC = () => {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRec, setEditingRec] = useState<Recommendation | null>(null);
  const [formData, setFormData] = useState({ text: "" });
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline } = useOfflineSyncStatus();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const stored = (await get(STANDARD_RECOMMENDATIONS_KEY)) as
          | Recommendation[]
          | undefined;
        setRecommendations(stored || []);
        toast.success(
          `Loaded ${stored?.length ?? 0} recommendations successfully!`,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const saveRecommendations = useCallback(async (recs: Recommendation[]) => {
    try {
      await set(STANDARD_RECOMMENDATIONS_KEY, recs);
      setRecommendations(recs);
      toast.success(`Saved ${recs.length} recommendations successfully!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const resetForm = useCallback(() => {
    setFormData({ text: "" });
    setEditingRec(null);
    setShowAddDialog(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.text.trim()) {
      toast.error(t('standardRecommendations.textRequired', { defaultValue: 'Text is required' }));
      return;
    }
    try {
      if (editingRec) {
        const updated = recommendations.map((r) =>
          r.id === editingRec.id ? { ...r, text: formData.text } : r,
        );
        await saveRecommendations(updated);
        toast.success(t('standardRecommendations.updateSuccess', { defaultValue: 'Recommendation updated successfully' }));
      } else {
        const newRec: Recommendation = { id: uuidv4(), text: formData.text };
        await saveRecommendations([...recommendations, newRec]);
        toast.success(t('standardRecommendations.createSuccess', { defaultValue: 'Recommendation created successfully' }));
      }
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }, [formData, editingRec, recommendations, saveRecommendations, resetForm, t]);

  const handleEdit = useCallback((rec: Recommendation) => {
    setEditingRec(rec);
    setFormData({ text: rec.text });
    setShowAddDialog(true);
  }, []);

  const handleDelete = useCallback(
    async (recId: string) => {
      if (
        !confirm(
          t('standardRecommendations.confirmDelete', { defaultValue: 'Are you sure you want to delete this recommendation?' }),
        )
      )
        return;
      try {
        const updated = recommendations.filter((r) => r.id !== recId);
        await saveRecommendations(updated);
        toast.success(t('standardRecommendations.deleteSuccess', { defaultValue: 'Recommendation deleted successfully' }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    },
    [recommendations, saveRecommendations, t],
  );

  if (isLoading) {
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
          {/* Offline Status Indicator */}
          <div className="mb-4 flex items-center justify-end">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <Star className="w-8 h-8 text-dgrv-blue" />
                  <h1 className="text-3xl font-bold text-dgrv-blue">
                    {t('standardRecommendations.title', { defaultValue: 'Standard Recommendations' })}
                  </h1>
                </div>
                <p className="text-lg text-gray-600">
                  {t('standardRecommendations.manageDesc', { defaultValue: 'Manage standard recommendations for sustainability assessments' })}
                </p>
              </div>

              <Dialog
                open={showAddDialog}
                onOpenChange={(open) => {
                  if (!open) resetForm();
                  setShowAddDialog(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button className="bg-dgrv-green hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('standardRecommendations.add', { defaultValue: 'Add Recommendation' })}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingRec
                        ? t('standardRecommendations.edit', { defaultValue: 'Edit Recommendation' })
                        : t('standardRecommendations.addDialog', { defaultValue: 'Add New Recommendation' })}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="text">{t('standardRecommendations.textLabel', { defaultValue: 'Recommendation Text' })}</Label>
                      <Textarea
                        id="text"
                        value={formData.text}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            text: e.target.value,
                          }))
                        }
                        placeholder={t('standardRecommendations.textPlaceholder', { defaultValue: 'Enter your recommendation text...' })}
                        rows={4}
                      />
                    </div>
                    <div className="flex space-x-2 pt-4">
                      <Button
                        onClick={handleSubmit}
                        className="bg-dgrv-green hover:bg-green-700"
                      >
                        {editingRec
                          ? t('standardRecommendations.update', { defaultValue: 'Update' })
                          : t('standardRecommendations.create', { defaultValue: 'Create' })}
                      </Button>
                      <Button variant="outline" onClick={resetForm}>
                        {t('standardRecommendations.cancel', { defaultValue: 'Cancel' })}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Recommendations Grid */}
          <div className="grid gap-4">
            {recommendations.map((rec, index) => (
              <Card
                key={rec.id}
                className="animate-fade-in hover:shadow-lg transition-shadow"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-dgrv-green/10">
                      <MessageSquare className="w-5 h-5 text-dgrv-green" />
                    </div>
                    <span className="text-lg">Standard Recommendation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-700">{rec.text}</p>
                    <div className="flex space-x-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(rec)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(rec.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {recommendations.length === 0 && !isLoading && (
              <Card className="text-center py-12">
                <CardContent>
                  <Star className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {t('standardRecommendations.emptyTitle', { defaultValue: 'No recommendations yet' })}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {t('standardRecommendations.emptyDesc', { defaultValue: 'Create your first standard recommendation to get started.' })}
                  </p>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-dgrv-green hover:bg-green-700"
                  >
                    {t('standardRecommendations.addFirst', { defaultValue: 'Add First Recommendation' })}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
