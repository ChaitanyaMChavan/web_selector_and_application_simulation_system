"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/animations";
import {
  ArrowLeft,
  Clock,
  Layers,
  ListChecks,
  AlignLeft,
  Video,
  Code,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";

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
  status: "DRAFT" | "PUBLISHED";
  timeLimitMinutes: number;
  steps: Step[];
}

const stepTypeIcons: Record<string, React.ReactNode> = {
  MCQ: <ListChecks className="w-4 h-4" />,
  WRITTEN: <AlignLeft className="w-4 h-4" />,
  VIDEO: <Video className="w-4 h-4" />,
  CODING: <Code className="w-4 h-4" />,
};

const stepTypeColors: Record<string, string> = {
  MCQ: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  WRITTEN: "bg-green-500/10 text-green-500 border-green-500/20",
  VIDEO: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  CODING: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

export default function ViewSimulationPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSimulation = async () => {
      try {
        const response = await api.get<Simulation>(`/simulations/${params.id}`);
        setSimulation(response.data);
      } catch {
        toast({
          title: "Failed to load simulation",
          description: "Could not fetch simulation details",
          variant: "destructive",
        });
        router.push("/dashboard/author/simulations");
      } finally {
        setLoading(false);
      }
    };
    loadSimulation();
  }, [params.id, router, toast]);

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

  if (!simulation) return null;

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
            <div>
              <h1 className="text-3xl font-bold">{simulation.title}</h1>
              <p className="text-muted-foreground mt-1">{simulation.description}</p>
            </div>
            <Badge
              variant={simulation.status === "PUBLISHED" ? "success" : "warning"}
              className="text-sm px-3 py-1"
            >
              {simulation.status}
            </Badge>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Simulation Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time Limit</p>
                    <p className="font-semibold">{simulation.timeLimitMinutes} minutes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Steps</p>
                    <p className="font-semibold">{simulation.steps.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Video className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-semibold">{simulation.status}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Steps ({simulation.steps.length})</CardTitle>
              <CardDescription>All steps in this simulation</CardDescription>
            </CardHeader>
            <CardContent>
              {simulation.steps.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No steps added yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {simulation.steps.map((step, index) => (
                    <div
                      key={step.id}
                      className="p-4 rounded-xl border border-border/50 bg-card/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-mono text-sm w-6">{index + 1}.</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              className={stepTypeColors[step.type]}
                              variant="outline"
                            >
                              {stepTypeIcons[step.type]}
                              {step.type}
                            </Badge>
                          </div>
                          <p className="font-medium mb-2">{step.prompt}</p>
                          {step.type === "MCQ" && step.options && (
                            <div className="mt-2 space-y-1">
                              {step.options.map((option, i) => (
                                <div
                                  key={i}
                                  className="text-sm text-muted-foreground pl-4"
                                >
                                  {String.fromCharCode(65 + i)}. {option}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="flex gap-2">
            <Link href={`/dashboard/author/simulations/${params.id}/edit`}>
              <Button variant="outline">Edit Simulation</Button>
            </Link>
            <Link href={`/dashboard/author/simulations/${params.id}/steps`}>
              <Button>Manage Steps</Button>
            </Link>
          </div>
        </FadeIn>
      </div>
    </DashboardLayout>
  );
}

