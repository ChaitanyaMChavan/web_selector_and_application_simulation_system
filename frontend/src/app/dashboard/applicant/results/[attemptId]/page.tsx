"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Star,
  ListChecks,
  AlignLeft,
  Video,
  Code,
  FileText,
} from "lucide-react";
import api from "@/lib/axios";
import Link from "next/link";
import { formatDateTime, formatTime } from "@/lib/utils";

interface Step {
  id: string;
  order: number;
  type: "MCQ" | "WRITTEN" | "VIDEO" | "CODING";
  prompt: string;
  options?: string[];
}

interface AttemptDetails {
  id: string;
  status: string;
  startedAt: string;
  submittedAt: string;
  score: number | null;
  feedback: string | null;
  simulation: {
    id: string;
    title: string;
    description: string;
    timeLimitMinutes: number;
    steps: Step[];
  };
  responses: { stepId: string; answer: string }[];
}

const stepTypeIcons: Record<string, React.ReactNode> = {
  MCQ: <ListChecks className="w-4 h-4" />,
  WRITTEN: <AlignLeft className="w-4 h-4" />,
  VIDEO: <Video className="w-4 h-4" />,
  CODING: <Code className="w-4 h-4" />,
};

export default function ResultDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [attempt, setAttempt] = useState<AttemptDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAttempt = async () => {
      try {
        const response = await api.get<AttemptDetails>(`/attempts/${params.attemptId}`);
        setAttempt(response.data);
      } catch (error) {
        console.error("Failed to load attempt:", error);
        router.push("/dashboard/applicant/results");
      } finally {
        setLoading(false);
      }
    };
    loadAttempt();
  }, [params.attemptId, router]);

  const getResponseForStep = (stepId: string) => {
    return attempt?.responses.find((r) => r.stepId === stepId)?.answer || "No response";
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
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

  if (!attempt) return null;

  const timeSpent = attempt.submittedAt
    ? Math.floor(
        (new Date(attempt.submittedAt).getTime() -
          new Date(attempt.startedAt).getTime()) /
          1000 /
          60
      )
    : null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <FadeIn>
          <Link
            href="/dashboard/applicant/results"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Results
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{attempt.simulation.title}</h1>
              <p className="text-muted-foreground">{attempt.simulation.description}</p>
            </div>
            <div className="flex flex-col gap-2">
              {attempt.status === "SCORED" && attempt.score !== null && (
                <div className="flex items-center gap-2">
                  <Star className={`w-5 h-5 ${getScoreColor(attempt.score)}`} />
                  <span className={`text-2xl font-bold ${getScoreColor(attempt.score)}`}>
                    {attempt.score}
                  </span>
                  <span className="text-muted-foreground">/100</span>
                </div>
              )}
              <Badge
                variant={
                  attempt.status === "SCORED"
                    ? "success"
                    : attempt.status === "SUBMITTED"
                    ? "warning"
                    : "secondary"
                }
              >
                {attempt.status}
              </Badge>
            </div>
          </div>
        </FadeIn>

        {/* Score and Feedback Card */}
        {attempt.status === "SCORED" && (
          <FadeIn delay={0.1}>
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Your Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {attempt.score !== null && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Score</p>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-bold ${getScoreColor(attempt.score)}`}>
                        {attempt.score}
                      </span>
                      <span className="text-muted-foreground">/ 100</span>
                    </div>
                  </div>
                )}
                {attempt.feedback && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Feedback</p>
                    <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                      <p className="text-sm whitespace-pre-wrap">{attempt.feedback}</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50 text-sm">
                  <div>
                    <p className="text-muted-foreground">Started</p>
                    <p className="font-medium">{formatDateTime(attempt.startedAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Submitted</p>
                    <p className="font-medium">
                      {attempt.submittedAt ? formatDateTime(attempt.submittedAt) : "—"}
                    </p>
                  </div>
                  {timeSpent !== null && (
                    <div>
                      <p className="text-muted-foreground">Time Spent</p>
                      <p className="font-medium">{timeSpent} minutes</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Time Limit</p>
                    <p className="font-medium">{attempt.simulation.timeLimitMinutes} minutes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* Responses */}
        <FadeIn delay={0.2}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">
                Your Responses ({attempt.simulation.steps.length} steps)
              </CardTitle>
              <CardDescription>
                Review your submitted answers
              </CardDescription>
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
                      <div className="flex items-center gap-2 mb-3">
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
                        <p className="text-sm text-muted-foreground mb-2">Your Answer:</p>
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
    </DashboardLayout>
  );
}

