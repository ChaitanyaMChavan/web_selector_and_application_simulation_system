"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/animations";
import {
  ArrowLeft,
  Plus,
  Loader2,
  GripVertical,
  Trash2,
  Layers,
  ListChecks,
  AlignLeft,
  Video,
  Code,
  Edit,
  FileCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import Link from "next/link";

type StepType = "MCQ" | "WRITTEN" | "VIDEO" | "CODING";

interface Step {
  id: string;
  order: number;
  type: StepType;
  prompt: string;
  options?: string[];
}

interface Rubric {
  id: string;
  stepId: string;
  criterionName: string;
  description: string | null;
  maxScore: number;
  order: number;
}

interface Simulation {
  id: string;
  title: string;
}

const stepTypeIcons: Record<StepType, React.ReactNode> = {
  MCQ: <ListChecks className="w-4 h-4" />,
  WRITTEN: <AlignLeft className="w-4 h-4" />,
  VIDEO: <Video className="w-4 h-4" />,
  CODING: <Code className="w-4 h-4" />,
};

const stepTypeColors: Record<StepType, string> = {
  MCQ: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  WRITTEN: "bg-green-500/10 text-green-500 border-green-500/20",
  VIDEO: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  CODING: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

export default function StepsBuilderPage() {
  const params = useParams();
  const { toast } = useToast();
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [saving, setSaving] = useState(false);
  const [newStep, setNewStep] = useState<{
    type: StepType;
    prompt: string;
    options: string[];
  }>({
    type: "MCQ",
    prompt: "",
    options: ["", "", "", ""],
  });
  const [rubrics, setRubrics] = useState<Map<string, Rubric[]>>(new Map());
  const [loadingRubrics, setLoadingRubrics] = useState<Set<string>>(new Set());
  const [rubricDialogOpen, setRubricDialogOpen] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [newRubric, setNewRubric] = useState({
    criterionName: "",
    description: "",
    maxScore: 10,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const [simRes, stepsRes] = await Promise.all([
          api.get<Simulation>(`/simulations/${params.id}`),
          api.get<Step[]>(`/simulations/${params.id}/steps`),
        ]);
        setSimulation(simRes.data);
        setSteps(stepsRes.data);
      } catch {
        toast({
          title: "Failed to load data",
          description: "Could not fetch simulation details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [params.id, toast]);


  const handleAddStep = async () => {
    if (!newStep.prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a prompt for this step",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload: {
        type: StepType;
        prompt: string;
        order: number;
        options?: string[];
      } = {
        type: newStep.type,
        prompt: newStep.prompt,
        order: steps.length + 1,
      };

      if (newStep.type === "MCQ") {
        payload.options = newStep.options.filter((o) => o.trim());
      }

      const response = await api.post<Step>(`/simulations/${params.id}/steps`, payload);
      setSteps([...steps, response.data]);
      setNewStep({ type: "MCQ", prompt: "", options: ["", "", "", ""] });
      setDialogOpen(false);
      toast({
        title: "Step added!",
        description: "The step has been added to the simulation.",
        variant: "success",
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Failed to add step",
        description: err.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditStep = (step: Step) => {
    setEditingStep(step);
    setNewStep({
      type: step.type,
      prompt: step.prompt,
      options: step.options || ["", "", "", ""],
    });
    setEditDialogOpen(true);
  };

  const handleUpdateStep = async () => {
    if (!editingStep || !newStep.prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a prompt for this step",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload: {
        type?: StepType;
        prompt?: string;
        options?: string[];
      } = {
        prompt: newStep.prompt,
      };

      if (newStep.type !== editingStep.type) {
        payload.type = newStep.type;
      }

      if (newStep.type === "MCQ") {
        payload.options = newStep.options.filter((o) => o.trim());
      } else {
        payload.options = undefined;
      }

      const response = await api.patch<Step>(
        `/simulations/${params.id}/steps/${editingStep.id}`,
        payload
      );
      setSteps(steps.map((s) => (s.id === editingStep.id ? response.data : s)));
      setNewStep({ type: "MCQ", prompt: "", options: ["", "", "", ""] });
      setEditingStep(null);
      setEditDialogOpen(false);
      toast({
        title: "Step updated!",
        description: "The step has been updated successfully.",
        variant: "success",
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Failed to update step",
        description: err.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    try {
      await api.delete(`/simulations/${params.id}/steps/${stepId}`);
      setSteps(steps.filter((s) => s.id !== stepId));
      // Remove rubrics for this step
      const newRubrics = new Map(rubrics);
      newRubrics.delete(stepId);
      setRubrics(newRubrics);
      toast({
        title: "Step deleted",
        description: "The step has been removed from the simulation.",
        variant: "success",
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Failed to delete step",
        description: err.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const loadRubrics = async (stepId: string) => {
    if (loadingRubrics.has(stepId)) return;
    setLoadingRubrics(new Set([...Array.from(loadingRubrics), stepId]));
    try {
      const response = await api.get<Rubric[]>(`/rubrics/step/${stepId}`);
      const newRubrics = new Map(rubrics);
      newRubrics.set(stepId, response.data);
      setRubrics(newRubrics);
    } catch (error) {
      console.error("Failed to load rubrics:", error);
    } finally {
      const newLoading = new Set(Array.from(loadingRubrics));
      newLoading.delete(stepId);
      setLoadingRubrics(newLoading);
    }
  };

  const handleManageRubrics = (stepId: string) => {
    setSelectedStepId(stepId);
    if (!rubrics.has(stepId)) {
      loadRubrics(stepId);
    }
    setRubricDialogOpen(true);
  };

  const handleCreateRubric = async () => {
    if (!selectedStepId || !newRubric.criterionName.trim()) {
      toast({
        title: "Validation error",
        description: "Please fill in the criterion name",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await api.post<Rubric>(`/rubrics/step/${selectedStepId}`, {
        criterionName: newRubric.criterionName,
        description: newRubric.description || null,
        maxScore: newRubric.maxScore,
      });
      const newRubrics = new Map(rubrics);
      const stepRubrics = newRubrics.get(selectedStepId) || [];
      newRubrics.set(selectedStepId, [...stepRubrics, response.data]);
      setRubrics(newRubrics);
      setNewRubric({ criterionName: "", description: "", maxScore: 10 });
      toast({
        title: "Rubric created",
        description: "The rubric has been added successfully",
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "Failed to create rubric",
        description: error.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRubric = async (rubricId: string, stepId: string) => {
    try {
      await api.delete(`/rubrics/${rubricId}`);
      const newRubrics = new Map(rubrics);
      const stepRubrics = newRubrics.get(stepId) || [];
      newRubrics.set(stepId, stepRubrics.filter((r) => r.id !== rubricId));
      setRubrics(newRubrics);
      toast({
        title: "Rubric deleted",
        description: "The rubric has been removed",
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "Failed to delete rubric",
        description: error.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleReorder = async (activeId: string, overId: string) => {
    if (activeId === overId) return;
    const oldIndex = steps.findIndex((s) => s.id === activeId);
    const newIndex = steps.findIndex((s) => s.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...steps];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const reorderedWithOrder = reordered.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSteps(reorderedWithOrder);
    setReordering(true);

    try {
      await api.patch(`/simulations/${params.id}/steps/reorder`, {
        steps: reorderedWithOrder.map((s) => ({ id: s.id, order: s.order })),
      });
      toast({
        title: "Order updated",
        description: "Step order has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Reorder failed",
        description: error.response?.data?.message || "Could not save order",
        variant: "destructive",
      });
      try {
        const stepsRes = await api.get<Step[]>(`/simulations/${params.id}/steps`);
        setSteps(stepsRes.data);
      } catch {
        /* ignore */
      }
    } finally {
      setReordering(false);
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      handleReorder(String(active.id), String(over.id));
    }
  };

  const SortableStep = ({ step, index }: { step: Step; index: number }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
      useSortable({ id: step.id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
    };

    return (
      <motion.div
        key={step.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ delay: index * 0.05 }}
        className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-card/50 hover:border-border transition-colors group"
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <GripVertical className="w-5 h-5 cursor-grab" />
          <span className="font-mono text-sm w-6">{index + 1}.</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={stepTypeColors[step.type]} variant="outline">
              {stepTypeIcons[step.type]}
              {step.type}
            </Badge>
          </div>
          <p className="text-sm line-clamp-2">{step.prompt}</p>
          {step.type === "MCQ" && step.options && (
            <div className="mt-2 text-xs text-muted-foreground">
              {step.options.length} options
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {rubrics.has(step.id) && (
            <Badge variant="outline" className="text-xs">
              {rubrics.get(step.id)?.length || 0} rubrics
            </Badge>
          )}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleManageRubrics(step.id)}
              title="Manage Rubrics"
            >
              <FileCheck className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleEditStep(step)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleDeleteStep(step.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...newStep.options];
    newOptions[index] = value;
    setNewStep({ ...newStep, options: newOptions });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FadeIn>
          <Link
            href="/dashboard/author/simulations"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to simulations
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-500/25">
                <Layers className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Step Builder</h1>
                <p className="text-muted-foreground">
                  {simulation?.title}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/dashboard/author/simulations/${params.id}/edit`}>
                <Button variant="outline">
                  <Edit className="w-4 h-4" />
                  Edit Details
                </Button>
              </Link>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                    <Plus className="w-4 h-4" />
                    Add Step
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add New Step</DialogTitle>
                    <DialogDescription>
                      Create a new step for this simulation
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Step Type</Label>
                      <Select
                        value={newStep.type}
                        onValueChange={(value: StepType) =>
                          setNewStep({ ...newStep, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MCQ">
                            <div className="flex items-center gap-2">
                              <ListChecks className="w-4 h-4" />
                              Multiple Choice
                            </div>
                          </SelectItem>
                          <SelectItem value="WRITTEN">
                            <div className="flex items-center gap-2">
                              <AlignLeft className="w-4 h-4" />
                              Written Response
                            </div>
                          </SelectItem>
                          <SelectItem value="VIDEO">
                            <div className="flex items-center gap-2">
                              <Video className="w-4 h-4" />
                              Video Response
                            </div>
                          </SelectItem>
                          <SelectItem value="CODING">
                            <div className="flex items-center gap-2">
                              <Code className="w-4 h-4" />
                              Coding Challenge
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Prompt / Question</Label>
                      <Textarea
                        placeholder="Enter the question or prompt for this step..."
                        value={newStep.prompt}
                        onChange={(e) =>
                          setNewStep({ ...newStep, prompt: e.target.value })
                        }
                        rows={3}
                      />
                    </div>

                    {newStep.type === "MCQ" && (
                      <div className="space-y-2">
                        <Label>Options</Label>
                        {newStep.options.map((option, index) => (
                          <Input
                            key={index}
                            placeholder={`Option ${index + 1}`}
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                          />
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setNewStep({
                              ...newStep,
                              options: [...newStep.options, ""],
                            })
                          }
                        >
                          <Plus className="w-3 h-3" />
                          Add Option
                        </Button>
                      </div>
                    )}

                    {newStep.type === "VIDEO" && (
                      <p className="text-sm text-muted-foreground">
                        Video response feature - applicants will record a video
                        answer to this prompt.
                      </p>
                    )}

                    {newStep.type === "CODING" && (
                      <p className="text-sm text-muted-foreground">
                        Coding challenge - applicants will write code in a
                        textarea to answer this prompt.
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddStep} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Step"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </FadeIn>

        {/* Edit Step Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Step</DialogTitle>
              <DialogDescription>
                Update the step details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Step Type</Label>
                <Select
                  value={newStep.type}
                  onValueChange={(value: StepType) =>
                    setNewStep({ ...newStep, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MCQ">
                      <div className="flex items-center gap-2">
                        <ListChecks className="w-4 h-4" />
                        Multiple Choice
                      </div>
                    </SelectItem>
                    <SelectItem value="WRITTEN">
                      <div className="flex items-center gap-2">
                        <AlignLeft className="w-4 h-4" />
                        Written Response
                      </div>
                    </SelectItem>
                    <SelectItem value="VIDEO">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        Video Response
                      </div>
                    </SelectItem>
                    <SelectItem value="CODING">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4" />
                        Coding Challenge
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prompt / Question</Label>
                <Textarea
                  placeholder="Enter the question or prompt for this step..."
                  value={newStep.prompt}
                  onChange={(e) =>
                    setNewStep({ ...newStep, prompt: e.target.value })
                  }
                  rows={3}
                />
              </div>

              {newStep.type === "MCQ" && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  {newStep.options.map((option, index) => (
                    <Input
                      key={index}
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setNewStep({
                        ...newStep,
                        options: [...newStep.options, ""],
                      })
                    }
                  >
                    <Plus className="w-3 h-3" />
                    Add Option
                  </Button>
                </div>
              )}

              {newStep.type === "VIDEO" && (
                <p className="text-sm text-muted-foreground">
                  Video response feature - applicants will record a video
                  answer to this prompt.
                </p>
              )}

              {newStep.type === "CODING" && (
                <p className="text-sm text-muted-foreground">
                  Coding challenge - applicants will write code in a
                  textarea to answer this prompt.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingStep(null);
                  setNewStep({ type: "MCQ", prompt: "", options: ["", "", "", ""] });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateStep} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Step"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <FadeIn delay={0.1}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">
                Steps ({steps.length})
              </CardTitle>
              <CardDescription>
                Drag to reorder, or click to edit
              </CardDescription>
            </CardHeader>
            <CardContent>
              {steps.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No steps added yet. Add your first step to get started.
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Add First Step
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onDragEnd}
                  >
                    <SortableContext
                      items={steps.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <AnimatePresence>
                        {steps.map((step, index) => (
                          <SortableStep key={step.id} step={step} index={index} />
                        ))}
                      </AnimatePresence>
                    </SortableContext>
                  </DndContext>
                  {reordering && (
                    <p className="text-xs text-muted-foreground text-right">
                      Saving order...
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* Rubric Management Dialog */}
        <Dialog open={rubricDialogOpen} onOpenChange={setRubricDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Rubrics</DialogTitle>
              <DialogDescription>
                Create and manage scoring rubrics for this step
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Create New Rubric Form */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold">Add New Rubric</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Criterion Name *</Label>
                    <Input
                      placeholder="e.g., Code Quality, Problem Solving"
                      value={newRubric.criterionName}
                      onChange={(e) =>
                        setNewRubric({ ...newRubric, criterionName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe what this criterion evaluates..."
                      value={newRubric.description}
                      onChange={(e) =>
                        setNewRubric({ ...newRubric, description: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Score</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={newRubric.maxScore}
                      onChange={(e) =>
                        setNewRubric({
                          ...newRubric,
                          maxScore: parseInt(e.target.value) || 10,
                        })
                      }
                    />
                  </div>
                  <Button onClick={handleCreateRubric} disabled={saving} size="sm">
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Rubric
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Existing Rubrics List */}
              {selectedStepId && (
                <div className="space-y-3">
                  <h3 className="font-semibold">
                    Rubrics (
                    {loadingRubrics.has(selectedStepId)
                      ? "..."
                      : rubrics.get(selectedStepId)?.length || 0}
                    )
                  </h3>
                  {loadingRubrics.has(selectedStepId) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading rubrics...
                    </div>
                  ) : !rubrics.has(selectedStepId) ||
                    rubrics.get(selectedStepId)?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                      No rubrics yet. Add your first rubric above.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rubrics
                        .get(selectedStepId)
                        ?.sort((a, b) => a.order - b.order)
                        .map((rubric) => (
                          <div
                            key={rubric.id}
                            className="p-3 border rounded-lg flex items-start justify-between gap-3"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{rubric.criterionName}</span>
                                <Badge variant="outline" className="text-xs">
                                  Max: {rubric.maxScore}
                                </Badge>
                              </div>
                              {rubric.description && (
                                <p className="text-sm text-muted-foreground">
                                  {rubric.description}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteRubric(rubric.id, selectedStepId)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRubricDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

