import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  CheckCircle,
} from "lucide-react";
import {
  Category,
  Question,
  Assessment as AssessmentType,
} from "@/services/indexedDB";
import {
  getCategoriesByTemplate,
  getQuestionsByTemplate,
  createAssessment,
  updateAssessment,
  calculateAssessmentScore,
} from "@/services/dataService";

export const Assessment: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentCategoryIndex, setCategoryIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [assessment, setAssessment] = useState<AssessmentType | null>(null);
  const [loading, setLoading] = useState(true);

  const templateId =
    type === "dgat" ? "dgat_template" : "sustainability_template";
  const toolName =
    type === "dgat" ? "Digital Gap Analysis" : "Sustainability Assessment";

  useEffect(() => {
    if (user) {
      loadAssessmentData();
    }
  }, [user, type]);

  const loadAssessmentData = async () => {
    try {
      setLoading(true);

      // Load categories and questions
      const [categoryData, questionData] = await Promise.all([
        getCategoriesByTemplate(templateId),
        getQuestionsByTemplate(templateId),
      ]);

      setCategories(categoryData.sort((a, b) => a.order - b.order));
      setQuestions(questionData.sort((a, b) => a.order - b.order));

      // Create new assessment
      const newAssessment = await createAssessment({
        userId: user!.id,
        organizationId: user!.organizationId || "unknown",
        templateId,
        answers: {},
        status: "draft",
      });

      setAssessment(newAssessment);
      setLoading(false);
    } catch (error) {
      console.error("Error loading assessment data:", error);
      toast({
        title: "Error",
        description: "Failed to load assessment data",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const getCurrentCategoryQuestions = () => {
    if (!categories[currentCategoryIndex]) return [];
    return questions.filter(
      (q) => q.categoryId === categories[currentCategoryIndex].categoryId,
    );
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCommentChange = (questionId: string, comment: string) => {
    setComments((prev) => ({ ...prev, [questionId]: comment }));
  };

  const saveDraft = async () => {
    if (!assessment) return;

    try {
      const updatedAssessment: AssessmentType = {
        ...assessment,
        answers: { ...answers, comments },
      };

      await updateAssessment(updatedAssessment);
      setAssessment(updatedAssessment);

      toast({
        title: "Draft Saved",
        description: "Your progress has been saved locally",
        className: "bg-dgrv-green text-white",
      });
    } catch (error) {
      console.error("Error saving draft:", error);
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    }
  };

  const submitAssessment = async () => {
    if (!assessment) return;

    try {
      // Calculate score
      const { totalScore, categoryScores } = await calculateAssessmentScore(
        assessment.assessmentId,
      );

      const updatedAssessment: AssessmentType = {
        ...assessment,
        answers: { ...answers, comments },
        status: "submitted",
        score: totalScore,
        categoryScores,
      };

      await updateAssessment(updatedAssessment);

      toast({
        title: "Assessment Submitted!",
        description: `Your ${toolName.toLowerCase()} has been submitted successfully`,
        className: "bg-dgrv-green text-white",
      });

      // Navigate to dashboard after short delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Error submitting assessment:", error);
      toast({
        title: "Error",
        description: "Failed to submit assessment",
        variant: "destructive",
      });
    }
  };

  const nextCategory = async () => {
    await saveDraft();
    if (currentCategoryIndex < categories.length - 1) {
      setCategoryIndex(currentCategoryIndex + 1);
    }
  };

  const previousCategory = () => {
    if (currentCategoryIndex > 0) {
      setCategoryIndex(currentCategoryIndex - 1);
    }
  };

  const renderQuestionInput = (question: Question) => {
    // Instead of switching on question.type, always render all three inputs
    const yesNoValue = answers[question.questionId]?.yesNo;
    const percentageValue = answers[question.questionId]?.percentage;
    const textValue = answers[question.questionId]?.text || "";
    const comment = comments[question.questionId] || "";
    return (
      <div className="space-y-4">
        {/* Yes/No */}
        <div>
          <Label>Yes/No</Label>
          <div className="flex space-x-4 mt-1">
            <Button
              type="button"
              variant={yesNoValue === true ? "default" : "outline"}
              className={
                yesNoValue === true ? "bg-dgrv-green hover:bg-green-700" : ""
              }
              onClick={() =>
                handleAnswerChange(question.questionId, {
                  ...answers[question.questionId],
                  yesNo: true,
                })
              }
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={yesNoValue === false ? "default" : "outline"}
              className={
                yesNoValue === false ? "bg-red-500 hover:bg-red-600" : ""
              }
              onClick={() =>
                handleAnswerChange(question.questionId, {
                  ...answers[question.questionId],
                  yesNo: false,
                })
              }
            >
              No
            </Button>
          </div>
        </div>
        {/* Percentage */}
        <div>
          <Label>Percentage</Label>
          <div className="flex space-x-2 mt-1">
            {[0, 25, 50, 75, 100].map((val) => (
              <Button
                key={val}
                type="button"
                variant={percentageValue === val ? "default" : "outline"}
                className={
                  percentageValue === val
                    ? "bg-dgrv-blue text-white border-dgrv-blue"
                    : "bg-white text-dgrv-blue border-dgrv-blue hover:bg-dgrv-blue/10"
                }
                onClick={() =>
                  handleAnswerChange(question.questionId, {
                    ...answers[question.questionId],
                    percentage: val,
                  })
                }
              >
                {val}%
              </Button>
            ))}
          </div>
        </div>
        {/* Text Input */}
        <div>
          <Label htmlFor={`input-text-${question.questionId}`}>
            Your Response
          </Label>
          <Textarea
            id={`input-text-${question.questionId}`}
            value={textValue}
            onChange={(e) =>
              handleAnswerChange(question.questionId, {
                ...answers[question.questionId],
                text: e.target.value,
              })
            }
            placeholder="Enter your response..."
            className="mt-1"
            rows={4}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold text-dgrv-blue mb-4">
                  Assessment Not Available
                </h2>
                <p className="text-gray-600 mb-6">
                  The {toolName.toLowerCase()} is not yet configured. Please
                  contact your administrator.
                </p>
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="bg-dgrv-blue hover:bg-blue-700"
                >
                  Return to Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const currentCategory = categories[currentCategoryIndex];
  const currentQuestions = getCurrentCategoryQuestions();
  const progress = ((currentCategoryIndex + 1) / categories.length) * 100;
  const isLastCategory = currentCategoryIndex === categories.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-dgrv-blue mb-2">
              {toolName}
            </h1>
            <p className="text-lg text-gray-600">
              Category {currentCategoryIndex + 1} of {categories.length}:{" "}
              {currentCategory?.name}
            </p>
          </div>

          {/* Progress Bar */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Progress
                </span>
                <span className="text-sm font-medium text-dgrv-blue">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="w-full" />
            </CardContent>
          </Card>

          {/* Questions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl text-dgrv-blue">
                {currentCategory?.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {currentQuestions.map((question, index) => (
                <div
                  key={question.questionId}
                  className="border-b pb-6 last:border-b-0"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {index + 1}. {question.text.en}
                    </h3>
                    {question.text.zu && (
                      <p className="text-sm text-gray-600 italic">
                        {question.text.zu}
                      </p>
                    )}
                  </div>
                  {renderQuestionInput(question)}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={previousCategory}
              disabled={currentCategoryIndex === 0}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </Button>

            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={saveDraft}
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Draft</span>
              </Button>

              {isLastCategory ? (
                <Button
                  onClick={submitAssessment}
                  className="bg-dgrv-green hover:bg-green-700 flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Assessment</span>
                </Button>
              ) : (
                <Button
                  onClick={nextCategory}
                  className="bg-dgrv-blue hover:bg-blue-700 flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
