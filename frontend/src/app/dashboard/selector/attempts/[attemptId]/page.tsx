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

interface Rubric {
  id: string;
  stepId: string;
  criterionName: string;
  description: string | null;
  maxScore: number;
  order: number;
}

interface Step {
  id: string;
  order: number;
  type: "MCQ" | "WRITTEN" | "VIDEO" | "CODING";
  prompt: string;
  options?: string[];
  rubrics?: Rubric[];
}

interface Response {
  stepId: string;
  answer: string;
  id?: string; // Response ID for fetching file content
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
  const [rubricScores, setRubricScores] = useState<Map<string, { score: number | ""; comment: string }>>(new Map());
  const [existingScores, setExistingScores] = useState<Record<string, { score: number; comment: string }>>({});
  const [fileContents, setFileContents] = useState<Map<string, string>>(new Map());
  const [loadingFileContents, setLoadingFileContents] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadAttempt = async () => {
      try {
        const response = await api.get<AttemptDetails & { existingScores?: Record<string, { score: number; comment: string }> }>(`/scoring/attempt/${params.attemptId}`);
        setAttempt(response.data);
        if (response.data.score !== null && response.data.score !== undefined) {
          setScore(response.data.score);
        }
        if (response.data.feedback) {
          setFeedback(response.data.feedback);
        }
        // Load existing rubric scores if available
        if (response.data.existingScores) {
          setExistingScores(response.data.existingScores);
          const scoresMap = new Map<string, { score: number | ""; comment: string }>();
          Object.entries(response.data.existingScores).forEach(([rubricId, data]) => {
            scoresMap.set(rubricId, { score: data.score, comment: data.comment || "" });
          });
          setRubricScores(scoresMap);
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

  // Fetch file contents for coding steps with file URLs
  useEffect(() => {
    if (!attempt) return;

    attempt.simulation.steps.forEach((step) => {
      if (step.type !== 'CODING') return;
      
      const response = attempt.responses.find((r) => r.stepId === step.id);
      if (!response || !response.id) return;
      
      const responseVal = response.answer;
      const isFileResponse = responseVal && (responseVal.startsWith('http') || responseVal.startsWith('/uploads/'));
      
      if (isFileResponse) {
        // Check current state to avoid re-fetching
        const fileContent = fileContents.get(step.id);
        const isLoading = loadingFileContents.has(step.id);
        
        // Auto-fetch file content if not already loaded or loading
        if (!fileContent && !isLoading) {
          fetchFileContent(response.id, step.id);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);


  const calculateTotalScore = () => {
    let totalMax = 0;
    let totalEarned = 0;
    
    attempt?.simulation.steps.forEach(step => {
      step.rubrics?.forEach(rubric => {
        totalMax += rubric.maxScore;
        const rubricScore = rubricScores.get(rubric.id);
        if (rubricScore && rubricScore.score !== "") {
          totalEarned += Number(rubricScore.score);
        }
      });
    });

    return totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : null;
  };

  const hasRubrics = () => {
    return attempt?.simulation.steps.some(step => step.rubrics && step.rubrics.length > 0) || false;
  };

  const handleSubmitScore = async () => {
    const hasRubricScoring = hasRubrics();
    
    if (hasRubricScoring) {
      // Validate all rubric scores are filled
      let allFilled = true;
      attempt?.simulation.steps.forEach(step => {
        step.rubrics?.forEach(rubric => {
          const rubricScore = rubricScores.get(rubric.id);
          if (!rubricScore || rubricScore.score === "" || Number(rubricScore.score) < 0 || Number(rubricScore.score) > rubric.maxScore) {
            allFilled = false;
          }
        });
      });

      if (!allFilled) {
        toast({
          title: "Incomplete scoring",
          description: "Please fill in all rubric scores",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Simple scoring validation
      if (score === "" || score < 0 || score > 100) {
        toast({
          title: "Invalid score",
          description: "Please enter a score between 0 and 100",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        feedback,
      };

      if (hasRubricScoring) {
        // Submit rubric scores
        const rubricScoresArray = Array.from(rubricScores.entries()).map(([rubricId, data]) => ({
          rubricId,
          score: Number(data.score),
          comment: data.comment || null,
        }));
        payload.rubricScores = rubricScoresArray;
        // Score will be calculated automatically
      } else {
        // Simple scoring
        payload.score = Number(score);
      }

      await api.post(`/scoring/attempt/${params.attemptId}`, payload);
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

  const updateRubricScore = (rubricId: string, score: number | "", comment: string) => {
    const newScores = new Map(rubricScores);
    newScores.set(rubricId, { score, comment });
    setRubricScores(newScores);
  };

  const getResponseForStep = (stepId: string) => {
    return attempt?.responses.find((r) => r.stepId === stepId)?.answer || "No response";
  };

  const fetchFileContent = async (responseId: string, stepId: string) => {
    if (loadingFileContents.has(stepId) || fileContents.has(stepId)) {
      return;
    }
    setLoadingFileContents((prev) => new Set([...Array.from(prev), stepId]));
    try {
      const response = await api.get(`/responses/${responseId}/file-content`);
      setFileContents((prev) => new Map([...Array.from(prev.entries()), [stepId, response.data.content]]));
    } catch (error) {
      console.error('Failed to fetch file content:', error);
    } finally {
      setLoadingFileContents((prev) => new Set(Array.from(prev).filter(id => id !== stepId)));
    }
  };

  const isVideoUrl = (url: string) => {
    return url && (url.startsWith('http') || url.startsWith('/uploads/'));
  };

  const isFileUrl = (url: string) => {
    return url && (url.startsWith('http') || url.startsWith('/uploads/'));
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
                    {hasRubrics() 
                      ? "Score using rubrics below, or enter overall score"
                      : "Enter a score and optional feedback"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasRubrics() && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Calculated Score:</span>
                        <span className="text-lg font-bold text-primary">
                          {calculateTotalScore() !== null ? `${calculateTotalScore()}/100` : "—"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Based on rubric scores below
                      </p>
                    </div>
                  )}
                  {!hasRubrics() && (
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
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="feedback">Overall Feedback (optional)</Label>
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

                          <div className="p-3 rounded-lg bg-card/50 border border-border/50 mb-3">
                            <p className="text-sm text-muted-foreground mb-1">
                              Response:
                            </p>
                            {(() => {
                              const responseVal = getResponseForStep(step.id);
                              if (step.type === "MCQ") {
                                return (
                                  <div className="space-y-1">
                                    {step.options?.map((opt, i) => (
                                      <div
                                        key={i}
                                        className={`text-sm px-2 py-1 rounded ${
                                          opt === responseVal
                                            ? "bg-primary/20 text-primary font-medium"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {String.fromCharCode(65 + i)}. {opt}
                                      </div>
                                    ))}
                                  </div>
                                );
                              }

                              if (step.type === "VIDEO" && responseVal && isVideoUrl(responseVal)) {
                                // Handle Cloudinary URLs and local paths
                                const videoUrl = responseVal.startsWith("https://") 
                                  ? responseVal 
                                  : responseVal.startsWith("/uploads/")
                                  ? responseVal
                                  : null;
                                
                                if (videoUrl) {
                                  return (
                                    <div className="space-y-2">
                                      <video 
                                        controls 
                                        src={videoUrl} 
                                        className="w-full max-w-xl rounded border"
                                        preload="metadata"
                                      />
                                      {responseVal.includes("cloudinary") && (
                                        <p className="text-xs text-muted-foreground">Video stored on Cloudinary</p>
                                      )}
                                    </div>
                                  );
                                }
                              }

                              if (step.type === "CODING") {
                                const response = attempt?.responses.find((r) => r.stepId === step.id);
                                const responseId = response?.id;
                                const isFileResponse = responseVal && isFileUrl(responseVal);
                                
                                // If it's a file URL, display content (fetching is handled in useEffect)
                                if (isFileResponse && responseId) {
                                  const fileContent = fileContents.get(step.id);
                                  const isLoading = loadingFileContents.has(step.id);
                                  
                                  return (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <a
                                          href={responseVal}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-sm text-primary underline inline-flex items-center gap-2"
                                        >
                                          Download attached file
                                        </a>
                                        {responseVal.includes("cloudinary") && (
                                          <span className="text-xs text-muted-foreground">Stored on Cloudinary</span>
                                        )}
                                      </div>
                                      {isLoading && (
                                        <div className="text-sm text-muted-foreground">Loading file content...</div>
                                      )}
                                      {fileContent && (
                                        <div className="relative">
                                          <pre className="text-sm font-mono whitespace-pre-wrap bg-muted/50 p-3 rounded border overflow-x-auto max-h-96 overflow-y-auto">
                                            <code>{fileContent}</code>
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                
                                // If it's plain text code (not a file)
                                return (
                                  <pre className="text-sm font-mono whitespace-pre-wrap bg-muted/50 p-3 rounded">
                                    {responseVal || "No response"}
                                  </pre>
                                );
                              }

                              return (
                                <p className="text-sm whitespace-pre-wrap">
                                  {responseVal || "No response"}
                                </p>
                              );
                            })()}
                          </div>

                          {/* Rubrics Scoring */}
                          {step.rubrics && step.rubrics.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                              <p className="text-sm font-medium text-muted-foreground">
                                Scoring Rubrics:
                              </p>
                              {step.rubrics
                                .sort((a, b) => a.order - b.order)
                                .map((rubric) => {
                                  const rubricScore = rubricScores.get(rubric.id) || { score: "", comment: "" };
                                  return (
                                    <div
                                      key={rubric.id}
                                      className="p-3 rounded-lg border border-border/50 bg-muted/10"
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm">
                                              {rubric.criterionName}
                                            </span>
                                            <Badge variant="outline" className="text-xs">
                                              Max: {rubric.maxScore}
                                            </Badge>
                                          </div>
                                          {rubric.description && (
                                            <p className="text-xs text-muted-foreground">
                                              {rubric.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="space-y-2 mt-2">
                                        <div className="flex items-center gap-2">
                                          <Label className="text-xs w-16">Score:</Label>
                                          <Input
                                            type="number"
                                            min={0}
                                            max={rubric.maxScore}
                                            placeholder="0"
                                            value={rubricScore.score}
                                            onChange={(e) =>
                                              updateRubricScore(
                                                rubric.id,
                                                e.target.value === "" ? "" : parseInt(e.target.value),
                                                rubricScore.comment
                                              )
                                            }
                                            className="h-8 text-sm"
                                          />
                                          <span className="text-xs text-muted-foreground">
                                            / {rubric.maxScore}
                                          </span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <Label className="text-xs w-16 mt-1">Comment:</Label>
                                          <Textarea
                                            placeholder="Optional comment..."
                                            value={rubricScore.comment}
                                            onChange={(e) =>
                                              updateRubricScore(
                                                rubric.id,
                                                rubricScore.score,
                                                e.target.value
                                              )
                                            }
                                            rows={2}
                                            className="text-sm"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
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

