import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Recommendation } from "@/services/indexedDB";
import {
  createRecommendation,
  updateRecommendation,
  deleteRecommendation,
  getAllRecommendations,
} from "@/services/dataService";
import { Star, Plus, Edit, Trash2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StandardRecommendation extends Omit<Recommendation, "assessmentId"> {
  assessmentId: string;
}

export const StandardRecommendations: React.FC = () => {
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<
    StandardRecommendation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRec, setEditingRec] = useState<StandardRecommendation | null>(
    null,
  );
  const [formData, setFormData] = useState({
    title: "",
    text: "",
    category: "",
  });

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      // For standard recommendations, we'll create them with a special assessmentId
      const allRecs = await getAllRecommendations();
      const standardRecs = allRecs.filter(
        (rec) => rec.type === "standard",
      ) as StandardRecommendation[];
      setRecommendations(standardRecs);
    } catch (error) {
      console.error("Error loading recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.text.trim()) {
      toast({
        title: "Error",
        description: "Recommendation text is required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingRec) {
        const updatedRec: StandardRecommendation = {
          ...editingRec,
          text: { en: formData.text },
        };
        await updateRecommendation(updatedRec);
        setRecommendations((prev) =>
          prev.map((rec) =>
            rec.recommendationId === editingRec.recommendationId
              ? updatedRec
              : rec,
          ),
        );
        toast({
          title: "Success",
          description: "Recommendation updated successfully",
          className: "bg-dgrv-green text-white",
        });
      } else {
        const newRec = (await createRecommendation({
          assessmentId: "standard", // Special ID for standard recommendations
          text: { en: formData.text },
          type: "standard",
          createdBy: "admin",
        })) as StandardRecommendation;

        setRecommendations((prev) => [...prev, newRec]);
        toast({
          title: "Success",
          description: "Standard recommendation created successfully",
          className: "bg-dgrv-green text-white",
        });
      }

      resetForm();
    } catch (error) {
      console.error("Error saving recommendation:", error);
      toast({
        title: "Error",
        description: "Failed to save recommendation",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (rec: StandardRecommendation) => {
    setEditingRec(rec);
    setFormData({
      title: "", // We'll use the text as title for display
      text: rec.text.en,
      category: "",
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (recId: string) => {
    if (
      !confirm("Are you sure you want to delete this standard recommendation?")
    )
      return;

    try {
      await deleteRecommendation(recId);
      setRecommendations((prev) =>
        prev.filter((rec) => rec.recommendationId !== recId),
      );
      toast({
        title: "Success",
        description: "Standard recommendation deleted successfully",
        className: "bg-dgrv-green text-white",
      });
    } catch (error) {
      console.error("Error deleting recommendation:", error);
      toast({
        title: "Error",
        description: "Failed to delete recommendation",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ title: "", text: "", category: "" });
    setEditingRec(null);
    setShowAddDialog(false);
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
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <Star className="w-8 h-8 text-dgrv-blue" />
                  <h1 className="text-3xl font-bold text-dgrv-blue">
                    Standard Recommendations
                  </h1>
                </div>
                <p className="text-lg text-gray-600">
                  Manage reusable recommendations for assessment reviews
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
                    Add Recommendation
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingRec
                        ? "Edit Standard Recommendation"
                        : "Add Standard Recommendation"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="text">Recommendation Text</Label>
                      <Textarea
                        id="text"
                        value={formData.text}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            text: e.target.value,
                          }))
                        }
                        placeholder="Enter the recommendation text..."
                        rows={4}
                      />
                    </div>
                    <div className="flex space-x-2 pt-4">
                      <Button
                        onClick={handleSubmit}
                        className="bg-dgrv-green hover:bg-green-700"
                      >
                        {editingRec ? "Update" : "Create"} Recommendation
                      </Button>
                      <Button variant="outline" onClick={resetForm}>
                        Cancel
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
                key={rec.recommendationId}
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
                    <p className="text-gray-700">{rec.text.en}</p>
                    <div className="text-sm text-gray-500">
                      Created: {new Date(rec.createdAt).toLocaleDateString()}
                    </div>
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
                        onClick={() => handleDelete(rec.recommendationId)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {recommendations.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <Star className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No standard recommendations yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create reusable recommendations to speed up assessment
                    reviews.
                  </p>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-dgrv-green hover:bg-green-700"
                  >
                    Add First Recommendation
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
