"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations";
import { Shield, Users, FileText, Settings, Activity, UserCog, BarChart3 } from "lucide-react";
import api from "@/lib/axios";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  users: {
    total: number;
    authors: number;
    selectors: number;
    applicants: number;
  };
  simulations: {
    total: number;
  };
  attempts: {
    total: number;
    scored: number;
  };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get<Stats>("/admin/stats");
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats
    ? [
        {
          title: "Total Users",
          value: stats.users.total.toString(),
          description: `${stats.users.authors} authors, ${stats.users.selectors} selectors, ${stats.users.applicants} applicants`,
          icon: <Users className="w-5 h-5" />,
          color: "from-blue-500 to-cyan-500",
        },
        {
          title: "Simulations",
          value: stats.simulations.total.toString(),
          description: "Total created",
          icon: <FileText className="w-5 h-5" />,
          color: "from-purple-500 to-pink-500",
        },
        {
          title: "Attempts",
          value: stats.attempts.total.toString(),
          description: `${stats.attempts.scored} scored`,
          icon: <Activity className="w-5 h-5" />,
          color: "from-green-500 to-emerald-500",
        },
        {
          title: "System Health",
          value: "OK",
          description: "All systems operational",
          icon: <Settings className="w-5 h-5" />,
          color: "from-orange-500 to-red-500",
        },
      ]
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <FadeIn>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-xl shadow-red-500/25">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.name}
              </p>
            </div>
          </div>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading
            ? [1, 2, 3, 4].map((i) => (
                <Card key={i} className="glass-card border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-10 rounded-xl" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))
            : statCards.map((stat) => (
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
                      <div className="text-3xl font-bold">{stat.value}</div>
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
              <CardTitle>User Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{user?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium">{user?.role}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-medium font-mono text-sm">{user?.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.4}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>System Tools</CardTitle>
              <CardDescription>
                Administration and management tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/dashboard/admin/users">
                  <Button variant="outline" className="w-full justify-start h-auto py-4">
                    <UserCog className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-semibold">User Management</div>
                      <div className="text-xs text-muted-foreground">
                        Manage users, roles, and permissions
                      </div>
                    </div>
                  </Button>
                </Link>
                <Link href="/dashboard/admin/analytics">
                  <Button variant="outline" className="w-full justify-start h-auto py-4">
                    <BarChart3 className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-semibold">Analytics</div>
                      <div className="text-xs text-muted-foreground">
                        View system analytics and reports
                      </div>
                    </div>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </DashboardLayout>
  );
}

