"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  ListChecks,
  AlignLeft,
  Video,
  Code,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

interface Step {
  id: string;
  order: number;
  type: "MCQ" | "WRITTEN" | "VIDEO" | "CODING";
  prompt: string;
  options?: string[];
}

interface Response {
  stepId: string;
  answer: string;
}

interface AttemptDetails {
  id: string;
  status: string;
  startedAt: string;
  submittedAt: string;
  simulation: {
    id: string;
    title: string;
    description: string;
    steps: Step[];
  };
  applicant: {
    id: string;
    name: string;
    email: string;
  };
  responses: Response[];
  score?: number;
  feedback?: string;
}

const stepTypeIcons: Record<string, React.ReactNode> = {
  MCQ: <ListChecks className="w-4 h-4" />,
  WRITTEN: <AlignLeft className="w-4 h-4" />,
  VIDEO: <Video className="w-4 h-4" />,
  CODING: <Code className="w-4 h-4" />,
};

export default function ScoreAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [attempt, setAttempt] = useState<AttemptDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState<number | "">("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const loadAttempt = async () => {
      try {
        const response = await api.get<AttemptDetails>(`/scoring/attempt/${params.attemptId}`);
        setAttempt(response.data);
        if (response.data.score !== null && response.data.score !== undefined) {
          setScore(response.data.score);
        }
        if (response.data.feedback) {
          setFeedback(response.data.feedback);
        }
      } catch {
        toast({
          title: "Failed to load attempt",
          description: "Could not fetch attempt details",
          variant: "destructive",
        });
        router.push("/dashboard/selector/attempts");
      } finally {
        setLoading(false);
      }
    };
    loadAttempt();
  }, [params.attemptId, router, toast]);


  const handleSubmitScore = async () => {
    if (score === "" || score < 0 || score > 100) {
      toast({
        title: "Invalid score",
        description: "Please enter a score between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await api.post(`/scoring/attempt/${params.attemptId}`, {
        score: Number(score),
        feedback,
      });
      toast({
        title: "Score submitted!",
        description: "The attempt has been scored successfully.",
        variant: "success",
      });
      router.push("/dashboard/selector/attempts");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Failed to submit score",
        description: err.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getResponseForStep = (stepId: string) => {
    return attempt?.responses.find((r) => r.stepId === stepId)?.answer || "No response";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!attempt) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FadeIn>
          <Link
            href="/dashboard/selector/attempts"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to attempts
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{attempt.simulation.title}</h1>
              <p className="text-muted-foreground">
                Review and score this submission
              </p>
            </div>
            <Badge
              variant={
                attempt.status === "SCORED"
                  ? "success"
                  : attempt.status === "SUBMITTED"
                  ? "warning"
                  : "secondary"
              }
              className="text-sm px-3 py-1"
            >
              {attempt.status}
            </Badge>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Applicant info & scoring */}
          <div className="space-y-6">
            <FadeIn delay={0.1}>
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Applicant</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                      {attempt.applicant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{attempt.applicant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {attempt.applicant.email}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50 text-sm text-muted-foreground">
                    <p>
                      Submitted: {formatDateTime(attempt.submittedAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={0.2}>
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Scoring</CardTitle>
                  <CardDescription>
                    Enter a score and optional feedback
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="score">Score (0-100)</Label>
                    <Input
                      id="score"
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Enter score..."
                      value={score}
                      onChange={(e) =>
                        setScore(
                          e.target.value === "" ? "" : parseInt(e.target.value)
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feedback">Feedback (optional)</Label>
                    <Textarea
                      id="feedback"
                      placeholder="Enter feedback for the applicant..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button
                    onClick={handleSubmitScore}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Submit Score
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          {/* Responses */}
          <div className="lg:col-span-2">
            <FadeIn delay={0.3}>
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Responses ({attempt.simulation.steps.length} steps)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StaggerContainer className="space-y-4">
                    {attempt.simulation.steps.map((step, index) => (
                      <StaggerItem key={step.id}>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 rounded-xl border border-border/50 bg-muted/20"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-sm text-muted-foreground">
                              #{step.order}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {stepTypeIcons[step.type]}
                              {step.type}
                            </Badge>
                          </div>
                          <p className="font-medium mb-3">{step.prompt}</p>

                          <div className="p-3 rounded-lg bg-card/50 border border-border/50">
                            <p className="text-sm text-muted-foreground mb-1">
                              Response:
                            </p>
                            {step.type === "MCQ" ? (
                              <div className="space-y-1">
                                {step.options?.map((opt, i) => (
                                  <div
                                    key={i}
                                    className={`text-sm px-2 py-1 rounded ${
                                      opt === getResponseForStep(step.id)
                                        ? "bg-primary/20 text-primary font-medium"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {String.fromCharCode(65 + i)}. {opt}
                                  </div>
                                ))}
                              </div>
                            ) : step.type === "CODING" ? (
                              <pre className="text-sm font-mono whitespace-pre-wrap bg-muted/50 p-3 rounded">
                                {getResponseForStep(step.id)}
                              </pre>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">
                                {getResponseForStep(step.id)}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

