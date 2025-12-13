"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations";
import { FileText, Plus, CheckCircle, Edit3 } from "lucide-react";
import api from "@/lib/axios";

interface DashboardStats {
  totalSimulations: number;
  draftSimulations: number;
  publishedSimulations: number;
}

export default function AuthorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSimulations: 0,
    draftSimulations: 0,
    publishedSimulations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get<{ status: string }[]>("/simulations/mine");
        const simulations = response.data;
        setStats({
          totalSimulations: simulations.length,
          draftSimulations: simulations.filter((s: { status: string }) => s.status === "DRAFT").length,
          publishedSimulations: simulations.filter((s: { status: string }) => s.status === "PUBLISHED").length,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Simulations",
      value: stats.totalSimulations,
      description: "Your created simulations",
      icon: <FileText className="w-5 h-5" />,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Draft",
      value: stats.draftSimulations,
      description: "In development",
      icon: <Edit3 className="w-5 h-5" />,
      color: "from-yellow-500 to-orange-500",
    },
    {
      title: "Published",
      value: stats.publishedSimulations,
      description: "Live and accessible",
      icon: <CheckCircle className="w-5 h-5" />,
      color: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-500/25">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Author Dashboard</h1>
                <p className="text-muted-foreground">
                  Welcome back, {user?.name}
                </p>
              </div>
            </div>
            <Link href="/dashboard/author/simulations/new">
              <Button variant="glow" className="bg-gradient-to-r from-blue-500 to-cyan-500">
                <Plus className="w-4 h-4" />
                Create Simulation
              </Button>
            </Link>
          </div>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((stat) => (
            <StaggerItem key={stat.title}>
              <Card className="glass-card border-border/50 hover:border-border transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white`}
                  >
                    {stat.icon}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {loading ? "—" : stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeIn delay={0.3}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with your simulations</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/dashboard/author/simulations/new">
                <div className="p-4 rounded-xl border border-border/50 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500/20 transition-colors">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">Create New Simulation</p>
                      <p className="text-sm text-muted-foreground">
                        Start building a new assessment
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/author/simulations">
                <div className="p-4 rounded-xl border border-border/50 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500/20 transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">View All Simulations</p>
                      <p className="text-sm text-muted-foreground">
                        Manage your existing simulations
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </DashboardLayout>
  );
}

