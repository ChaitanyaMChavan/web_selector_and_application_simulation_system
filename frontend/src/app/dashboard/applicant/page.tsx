"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerItem } from "@/components/animations";
import { Users, FileText, Clock, CheckCircle, Play, ArrowRight } from "lucide-react";
import api from "@/lib/axios";

interface Simulation {
  id: string;
  title: string;
  description: string;
  timeLimitMinutes: number;
}

export default function ApplicantDashboard() {
  const { user } = useAuth();
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimulations = async () => {
      try {
        const response = await api.get<Simulation[]>("/simulations/published");
        setSimulations(response.data.slice(0, 3)); // Show only first 3
      } catch (error) {
        console.error("Failed to fetch simulations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSimulations();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/25">
                <Users className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Applicant Dashboard</h1>
                <p className="text-muted-foreground">
                  Welcome back, {user?.name}
                </p>
              </div>
            </div>
            <Link href="/dashboard/applicant/simulations">
              <Button variant="glow">
                <FileText className="w-4 h-4" />
                Browse Simulations
              </Button>
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Available Simulations</CardTitle>
              <CardDescription>
                Start an assessment to demonstrate your skills
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-24 rounded-xl bg-muted/30 animate-pulse"
                    />
                  ))}
                </div>
              ) : simulations.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No simulations available at the moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {simulations.map((sim) => (
                    <StaggerItem key={sim.id}>
                      <Link href={`/dashboard/applicant/simulations/${sim.id}`}>
                        <div className="p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold group-hover:text-primary transition-colors">
                                {sim.title}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {sim.description}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {sim.timeLimitMinutes} minutes
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="group-hover:bg-primary/10 group-hover:text-primary"
                            >
                              <Play className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      </Link>
                    </StaggerItem>
                  ))}
                  <Link
                    href="/dashboard/applicant/simulations"
                    className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors py-2"
                  >
                    View all simulations
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.3}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
              <CardDescription>Track your assessment journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>
                  Complete simulations to see your progress and scores here.
                </p>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </DashboardLayout>
  );
}

