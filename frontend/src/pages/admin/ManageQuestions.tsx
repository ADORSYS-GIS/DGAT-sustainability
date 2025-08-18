/*
 * Admin page for managing assessment questions
 * Provides CRUD operations for questions with category assignment
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  QuestionHeader,
  QuestionForm,
  QuestionList,
} from "@/components/admin/ManageQuestions";
import { LoadingState } from "@/components/shared";
import { useManageQuestions } from "@/hooks/admin/useManageQuestions";

export const ManageQuestions: React.FC = () => {
  const {
    // State
    isDialogOpen,
    setIsDialogOpen,
    editingQuestion,
    setEditingQuestion,
    formData,
    setFormData,

    // Data
    categories,
    questions,
    isLoading,
    error,
    isOnline,

    // Functions
    handleSubmit,
    handleEdit,
    handleDelete,
    resetForm,
    refetchQuestions,

    // Computed
    isPending,
  } = useManageQuestions();

  if (isLoading) {
    return <LoadingState message="Loading questions..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Error Loading Questions
            </h2>
            <p className="text-gray-600 mb-4">
              {error instanceof Error
                ? error.message
                : "An unknown error occurred"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <QuestionHeader />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Questions</CardTitle>
              <QuestionForm
                categories={categories}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                isPending={isPending}
                editingQuestion={editingQuestion}
                isDialogOpen={isDialogOpen}
                setIsDialogOpen={setIsDialogOpen}
                resetForm={resetForm}
              />
            </CardHeader>
            <CardContent>
              <QuestionList
                questions={questions}
                categories={categories}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isPending={isPending}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
