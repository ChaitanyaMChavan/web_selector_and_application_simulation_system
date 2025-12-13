"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations";
import { ClipboardCheck, Clock, CheckCircle, ArrowRight } from "lucide-react";
import api from "@/lib/axios";

interface DashboardStats {
  pendingAttempts: number;
  scoredAttempts: number;
}

export default function SelectorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    pendingAttempts: 0,
    scoredAttempts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [pendingRes, scoredRes] = await Promise.all([
          api.get<{ id: string }[]>("/scoring/pending"),
          api.get<{ id: string }[]>("/scoring/my-scores"),
        ]);
        setStats({
          pendingAttempts: pendingRes.data.length,
          scoredAttempts: scoredRes.data.length,
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
      title: "Pending Reviews",
      value: stats.pendingAttempts,
      description: "Awaiting your scores",
      icon: <Clock className="w-5 h-5" />,
      color: "from-yellow-500 to-orange-500",
    },
    {
      title: "Completed Reviews",
      value: stats.scoredAttempts,
      description: "You've scored",
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
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl shadow-purple-500/25">
                <ClipboardCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Selector Dashboard</h1>
                <p className="text-muted-foreground">
                  Welcome back, {user?.name}
                </p>
              </div>
            </div>
            <Link href="/dashboard/selector/attempts">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <ClipboardCheck className="w-4 h-4" />
                Review Attempts
              </Button>
            </Link>
          </div>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <CardDescription>Access scoring tools</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/dashboard/selector/attempts">
                <div className="p-4 rounded-xl border border-border/50 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:bg-purple-500/20 transition-colors">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Pending Attempts</p>
                      <p className="text-sm text-muted-foreground">
                        Review and score new submissions
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/selector/my-scores">
                <div className="p-4 rounded-xl border border-border/50 hover:border-pink-500/50 hover:bg-pink-500/5 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500 group-hover:bg-pink-500/20 transition-colors">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">My Scores</p>
                      <p className="text-sm text-muted-foreground">
                        View your scoring history
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-pink-500 transition-colors" />
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

