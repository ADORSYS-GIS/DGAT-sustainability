/**
 * @file Category card component for the Manage Questions page.
 * @description This component displays a single category and its questions.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OfflineCategoryCatalog, OfflineQuestion } from "@/types/offline";
import { ChevronDown, ChevronRight, Edit, Layers, Plus, Trash2 } from "lucide-react";
import React from "react";
import QuestionText from "./QuestionText";

interface CategoryCardProps {
  category: OfflineCategoryCatalog;
  questions: OfflineQuestion[];
  isExpanded: boolean;
  onToggle: () => void;
  onAddQuestion: (categoryName: string) => void;
  onEdit: (question: OfflineQuestion) => void;
  onDelete: (questionId: string) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  questions,
  isExpanded,
  onToggle,
  onAddQuestion,
  onEdit,
  onDelete,
}) => {
  const questionCount = questions.length;

  return (
    <Card className="overflow-hidden border shadow-lg bg-white">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              <Layers className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl font-semibold text-gray-900">
                {category.name}
              </CardTitle>
              <div className="flex items-center space-x-3 mt-1">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {questionCount} {questionCount === 1 ? 'Question' : 'Questions'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
            <Button
              onClick={() => onAddQuestion(category.name)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isExpanded && (
          <div>
            {questionCount > 0 ? (
              <div className="divide-y divide-gray-100">
                {questions.map((question, index) => (
                  <div key={question.question_id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-sm font-medium text-gray-600 mt-1">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <QuestionText question={question} />
                            <div className="flex items-center space-x-4 mt-3">
                              <Badge variant="outline" className="text-xs">
                                Weight: {question.latest_revision?.weight || 5}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(question.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(question)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(question.question_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Yet</h3>
                <p className="text-gray-500 mb-4">Get started by adding the first question to this category.</p>
                <Button
                  onClick={() => onAddQuestion(category.name)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Question
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryCard;