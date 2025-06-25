import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
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
import { Badge } from "@/components/ui/badge";
import { Task } from "@/services/indexedDB";
import {
  createTask,
  updateTask,
  getTasksByAssessment,
  getAssessmentsByUser,
} from "@/services/dataService";
import {
  Kanban,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const ActionPlan: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    dueDate: "",
    assessmentId: "",
  });

  useEffect(() => {
    if (user?.id) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      // Get all user assessments first
      const assessments = await getAssessmentsByUser(user!.id);
      let allTasks: Task[] = [];

      // Get tasks for each assessment
      for (const assessment of assessments) {
        const assessmentTasks = await getTasksByAssessment(
          assessment.assessmentId,
        );
        allTasks = [...allTasks, ...assessmentTasks];
      }

      setTasks(allTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const task = await createTask({
        assessmentId: newTask.assessmentId || "general",
        title: newTask.title,
        description: newTask.description,
        status: "todo",
        dueDate: newTask.dueDate || undefined,
      });

      setTasks((prev) => [...prev, task]);
      setNewTask({ title: "", description: "", dueDate: "", assessmentId: "" });
      setShowAddTask(false);

      toast({
        title: "Success",
        description: "Task added successfully",
        className: "bg-dgrv-green text-white",
      });
    } catch (error) {
      console.error("Error adding task:", error);
      toast({
        title: "Error",
        description: "Failed to add task",
        variant: "destructive",
      });
    }
  };

  const updateTaskStatus = async (
    taskId: string,
    newStatus: "todo" | "in_progress" | "done",
  ) => {
    try {
      const task = tasks.find((t) => t.taskId === taskId);
      if (!task) return;

      const updatedTask = { ...task, status: newStatus };
      await updateTask(updatedTask);

      setTasks((prev) =>
        prev.map((t) => (t.taskId === taskId ? updatedTask : t)),
      );

      toast({
        title: "Success",
        description: "Task status updated",
        className: "bg-dgrv-green text-white",
      });
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "todo":
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      case "in_progress":
        return <PlayCircle className="w-4 h-4 text-blue-500" />;
      case "done":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-gray-100 border-gray-300";
      case "in_progress":
        return "bg-blue-50 border-blue-300";
      case "done":
        return "bg-green-50 border-green-300";
      default:
        return "bg-gray-100 border-gray-300";
    }
  };

  const columns = [
    { id: "todo", title: "To Do", icon: AlertCircle, color: "text-gray-600" },
    {
      id: "in_progress",
      title: "In Progress",
      icon: PlayCircle,
      color: "text-blue-600",
    },
    { id: "done", title: "Done", icon: CheckCircle, color: "text-green-600" },
  ];

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
                  <Kanban className="w-8 h-8 text-dgrv-blue" />
                  <h1 className="text-3xl font-bold text-dgrv-blue">
                    Action Plan
                  </h1>
                </div>
                <p className="text-lg text-gray-600">
                  Track your sustainability improvement tasks
                </p>
              </div>

              <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
                <DialogTrigger asChild>
                  <Button className="bg-dgrv-green hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Task</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Task Title</Label>
                      <Input
                        id="title"
                        value={newTask.title}
                        onChange={(e) =>
                          setNewTask((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        placeholder="Enter task title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newTask.description}
                        onChange={(e) =>
                          setNewTask((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Enter task description"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dueDate">Due Date (Optional)</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) =>
                          setNewTask((prev) => ({
                            ...prev,
                            dueDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="flex space-x-2 pt-4">
                      <Button
                        onClick={handleAddTask}
                        className="bg-dgrv-green hover:bg-green-700"
                      >
                        Add Task
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowAddTask(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map((column) => {
              const columnTasks = getTasksByStatus(column.id);
              const IconComponent = column.icon;

              return (
                <Card key={column.id} className="animate-fade-in">
                  <CardHeader className="pb-3">
                    <CardTitle
                      className={`flex items-center space-x-2 ${column.color}`}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span>{column.title}</span>
                      <Badge variant="outline" className="ml-auto">
                        {columnTasks.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {columnTasks.map((task) => (
                      <Card
                        key={task.taskId}
                        className={`${getStatusColor(task.status)} cursor-pointer hover:shadow-md transition-shadow`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm">
                              {task.title}
                            </h4>
                            {getStatusIcon(task.status)}
                          </div>
                          {task.description && (
                            <p className="text-xs text-gray-600 mb-3">
                              {task.description}
                            </p>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500 mb-3">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          <div className="flex space-x-1">
                            {task.status !== "todo" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs px-2 py-1 h-6"
                                onClick={() =>
                                  updateTaskStatus(task.taskId, "todo")
                                }
                              >
                                To Do
                              </Button>
                            )}
                            {task.status !== "in_progress" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs px-2 py-1 h-6"
                                onClick={() =>
                                  updateTaskStatus(task.taskId, "in_progress")
                                }
                              >
                                In Progress
                              </Button>
                            )}
                            {task.status !== "done" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs px-2 py-1 h-6"
                                onClick={() =>
                                  updateTaskStatus(task.taskId, "done")
                                }
                              >
                                Done
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {columnTasks.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <IconComponent className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          No tasks in {column.title.toLowerCase()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
