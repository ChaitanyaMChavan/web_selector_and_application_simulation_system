"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/animations";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
  Video,
  Code,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import { formatTime } from "@/lib/utils";

interface Step {
  id: string;
  order: number;
  type: "MCQ" | "WRITTEN" | "VIDEO" | "CODING";
  prompt: string;
  options?: string[];
}

interface Simulation {
  id: string;
  title: string;
  description: string;
  timeLimitMinutes: number;
  steps: Step[];
}

interface Attempt {
  id: string;
  status: "IN_PROGRESS" | "SUBMITTED";
  startedAt: string;
  responses: { stepId: string; answer: string }[];
}

export default function SimulationPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  const saveResponse = useCallback(
    async (stepId: string, answer: string) => {
      if (!attempt) return;

      try {
        await api.post(`/attempts/${attempt.id}/response`, {
          stepId,
          answer,
        });
      } catch (err) {
        console.error("Failed to save response:", err);
      }
    },
    [attempt]
  );

  const handleSubmit = useCallback(async () => {
    if (!attempt || !simulation) return;

    // Save current response first
    const currentStepId = simulation.steps[currentStep]?.id;
    if (currentStepId && responses[currentStepId]) {
      await saveResponse(currentStepId, responses[currentStepId]);
    }

    setSubmitting(true);
    try {
      await api.post(`/attempts/${attempt.id}/submit`);
      toast({
        title: "Assessment submitted!",
        description: "Your responses have been recorded.",
        variant: "success",
      });
      router.push("/dashboard/applicant/simulations");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Failed to submit",
        description: err.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }, [attempt, simulation, currentStep, responses, saveResponse, toast, router]);

  useEffect(() => {
    const fetchSimulation = async () => {
      try {
        const response = await api.get<Simulation>(`/simulations/${params.id}`);
        setSimulation(response.data);

        // Check for existing attempt
        try {
          const attemptRes = await api.get<Attempt>(`/attempts/simulation/${params.id}/current`);
          if (attemptRes.data) {
            setAttempt(attemptRes.data);
            // Load existing responses
            const existingResponses: Record<string, string> = {};
            attemptRes.data.responses?.forEach((r: { stepId: string; answer: string }) => {
              existingResponses[r.stepId] = r.answer;
            });
            setResponses(existingResponses);
          }
        } catch {
          // No existing attempt
        }
      } catch {
        toast({
          title: "Failed to load simulation",
          description: "Could not fetch simulation details",
          variant: "destructive",
        });
        router.push("/dashboard/applicant/simulations");
      } finally {
        setLoading(false);
      }
    };
    fetchSimulation();
  }, [params.id, router, toast]);

  // Timer countdown
  useEffect(() => {
    if (!attempt || !simulation || attempt.status === "SUBMITTED") return;

    const startTime = new Date(attempt.startedAt).getTime();
    const duration = simulation.timeLimitMinutes * 60 * 1000;
    const endTime = startTime + duration;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        handleSubmit();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [attempt, simulation, handleSubmit]);

  const startAttempt = async () => {
    setStarting(true);
    try {
      const response = await api.post<Attempt>(`/attempts/simulation/${params.id}/start`);
      setAttempt(response.data);
      toast({
        title: "Assessment started!",
        description: "Your timer has begun. Good luck!",
        variant: "success",
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Failed to start",
        description: err.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  };

  const handleResponseChange = (stepId: string, answer: string) => {
    setResponses((prev) => ({ ...prev, [stepId]: answer }));

    // Auto-save with debounce
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }
    autoSaveTimeout.current = setTimeout(() => {
      saveResponse(stepId, answer);
    }, 1000);
  };

  const goToStep = (newStep: number) => {
    const currentStepId = simulation?.steps[currentStep]?.id;
    if (currentStepId && responses[currentStepId]) {
      saveResponse(currentStepId, responses[currentStepId]);
    }

    setDirection(newStep > currentStep ? "right" : "left");
    setCurrentStep(newStep);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!simulation) return null;

  // Show start screen if no attempt
  if (!attempt) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <FadeIn>
            <Card className="glass-card border-border/50">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/25">
                  <Play className="w-8 h-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">{simulation.title}</CardTitle>
                <CardDescription>{simulation.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary">
                      <Clock className="w-6 h-6" />
                      {simulation.timeLimitMinutes}
                    </div>
                    <p className="text-sm text-muted-foreground">Minutes</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {simulation.steps.length}
                    </div>
                    <p className="text-sm text-muted-foreground">Steps</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Before you begin:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-500" />
                      The timer will start once you click &quot;Start Assessment&quot;
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 text-green-500" />
                      Your progress is auto-saved as you go
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 text-green-500" />
                      You can navigate between steps freely
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={startAttempt}
                  variant="glow"
                  className="w-full"
                  disabled={starting}
                >
                  {starting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Start Assessment
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </DashboardLayout>
    );
  }

  // Show submitted screen
  if (attempt.status === "SUBMITTED") {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <FadeIn>
            <Card className="glass-card border-border/50 text-center">
              <CardContent className="py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Assessment Submitted</h2>
                <p className="text-muted-foreground mb-6">
                  Your responses have been recorded. You&apos;ll be notified when
                  results are available.
                </p>
                <Button
                  onClick={() => router.push("/dashboard/applicant/simulations")}
                >
                  Back to Simulations
                </Button>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </DashboardLayout>
    );
  }

  const step = simulation.steps[currentStep];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with timer */}
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{simulation.title}</h1>
              <p className="text-muted-foreground">
                Step {currentStep + 1} of {simulation.steps.length}
              </p>
            </div>
            {timeRemaining !== null && (
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                  timeRemaining < 60
                    ? "bg-red-500/20 text-red-400"
                    : timeRemaining < 300
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-primary/20 text-primary"
                }`}
              >
                <Clock className="w-5 h-5" />
                <span className="font-mono font-bold text-lg">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </div>
        </FadeIn>

        {/* Progress bar */}
        <FadeIn delay={0.1}>
          <div className="flex gap-1">
            {simulation.steps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goToStep(i)}
                className={`h-2 flex-1 rounded-full transition-all ${
                  i === currentStep
                    ? "bg-primary"
                    : responses[s.id]
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </FadeIn>

        {/* Step content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step.id}
            custom={direction}
            initial={{ opacity: 0, x: direction === "right" ? 100 : -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction === "right" ? -100 : 100 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <Card className="glass-card border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">
                    {step.type === "MCQ" && "Multiple Choice"}
                    {step.type === "WRITTEN" && "Written Response"}
                    {step.type === "VIDEO" && "Video Response"}
                    {step.type === "CODING" && "Coding Challenge"}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{step.prompt}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {step.type === "MCQ" && step.options && (
                  <div className="space-y-3">
                    {step.options.map((option, i) => (
                      <button
                        key={i}
                        onClick={() => handleResponseChange(step.id, option)}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${
                          responses[step.id] === option
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/50 hover:border-border hover:bg-muted/30"
                        }`}
                      >
                        <span className="font-medium">
                          {String.fromCharCode(65 + i)}.
                        </span>{" "}
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {step.type === "WRITTEN" && (
                  <Textarea
                    placeholder="Type your answer here..."
                    value={responses[step.id] || ""}
                    onChange={(e) =>
                      handleResponseChange(step.id, e.target.value)
                    }
                    rows={8}
                    className="resize-none"
                  />
                )}

                {step.type === "VIDEO" && (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                    <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Video recording feature coming soon
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      For now, please describe your answer in text below:
                    </p>
                    <Textarea
                      className="mt-4 max-w-lg mx-auto"
                      placeholder="Describe what you would say..."
                      value={responses[step.id] || ""}
                      onChange={(e) =>
                        handleResponseChange(step.id, e.target.value)
                      }
                      rows={4}
                    />
                  </div>
                )}

                {step.type === "CODING" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Code className="w-4 h-4" />
                      Write your code below
                    </div>
                    <Textarea
                      placeholder="// Enter your code here..."
                      value={responses[step.id] || ""}
                      onChange={(e) =>
                        handleResponseChange(step.id, e.target.value)
                      }
                      rows={12}
                      className="font-mono text-sm resize-none"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <FadeIn delay={0.2}>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => goToStep(currentStep - 1)}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </Button>

            {currentStep === simulation.steps.length - 1 ? (
              <Button
                onClick={handleSubmit}
                variant="glow"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Assessment
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => goToStep(currentStep + 1)}
                className="bg-gradient-to-r from-primary to-accent"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </FadeIn>
      </div>
    </DashboardLayout>
  );
}
