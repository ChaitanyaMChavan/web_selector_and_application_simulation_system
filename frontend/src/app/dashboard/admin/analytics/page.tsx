"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/animations";
import {
  ArrowLeft,
  BarChart3,
  Activity,
  Target,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsData {
  recentAttempts: Array<{
    date: string;
    count: number;
  }>;
  attemptsByStatus: Record<string, number>;
  averageScore: number | null;
  scoredAttemptsCount: number;
  simulationsByStatus: Record<string, number>;
}

const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  cyan: "#06b6d4",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: COLORS.warning,
  SUBMITTED: COLORS.warning, // SUBMITTED = PENDING (awaiting scoring)
  IN_PROGRESS: COLORS.primary,
  COMPLETED: COLORS.success,
  SCORED: COLORS.success,
  DRAFT: COLORS.warning,
  PUBLISHED: COLORS.success,
};

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get<AnalyticsData>("/admin/analytics");
      setAnalytics(response.data);
    } catch (error: any) {
      console.error("Failed to fetch analytics:", error);
      toast({
        title: "Failed to load analytics",
        description: error.response?.data?.message || "Could not fetch analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for charts
  // Map SUBMITTED to PENDING for display purposes
  const attemptsByStatusData = analytics
    ? Object.entries(analytics.attemptsByStatus).map(([status, count]) => {
        const displayStatus = status === "SUBMITTED" ? "PENDING" : status;
        return {
          name: displayStatus.replace("_", " "),
          value: count,
          color: STATUS_COLORS[displayStatus] || STATUS_COLORS[status] || COLORS.primary,
        };
      })
    : [];

  const simulationsByStatusData = analytics
    ? Object.entries(analytics.simulationsByStatus).map(([status, count]) => ({
        name: status,
        value: count,
        color: STATUS_COLORS[status] || COLORS.primary,
      }))
    : [];

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid
      }
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateString; // Return original on error
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FadeIn>
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin Dashboard
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-500/25">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
              <p className="text-muted-foreground">
                Comprehensive insights and system statistics
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Key Metrics */}
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="glass-card border-border/50">
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : analytics ? (
              <>
                <Card className="glass-card border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Average Score
                    </CardTitle>
                    <Target className="w-5 h-5 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {analytics.averageScore !== null
                        ? analytics.averageScore.toFixed(1)
                        : "N/A"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.scoredAttemptsCount} scored attempts
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Attempts
                    </CardTitle>
                    <Activity className="w-5 h-5 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {Object.values(analytics.attemptsByStatus).reduce(
                        (sum, count) => sum + count,
                        0
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Across all statuses
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Scored Attempts
                    </CardTitle>
                    <CheckCircle2 className="w-5 h-5 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {analytics.attemptsByStatus.SCORED || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed assessments
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pending Attempts
                    </CardTitle>
                    <Clock className="w-5 h-5 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {analytics.attemptsByStatus.SUBMITTED || analytics.attemptsByStatus.PENDING || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Awaiting scoring
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        </FadeIn>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Attempts Chart */}
          <FadeIn delay={0.2}>
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Attempts Over Time (Last 30 Days)</CardTitle>
                <CardDescription>
                  Daily attempt creation trend
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : analytics && analytics.recentAttempts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.recentAttempts}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <Tooltip
                        labelFormatter={(label) => `Date: ${formatDate(label)}`}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke={COLORS.primary}
                        strokeWidth={2}
                        name="Attempts"
                        dot={{ fill: COLORS.primary, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>

          {/* Attempts by Status Pie Chart */}
          <FadeIn delay={0.3}>
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Attempts by Status</CardTitle>
                <CardDescription>
                  Distribution of attempt statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : attemptsByStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={attemptsByStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {attemptsByStatusData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attempts by Status Bar Chart */}
          <FadeIn delay={0.4}>
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Attempts by Status (Bar Chart)</CardTitle>
                <CardDescription>
                  Detailed breakdown of attempt statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : attemptsByStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={attemptsByStatusData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="name"
                        className="text-xs"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" fill={COLORS.primary} radius={[8, 8, 0, 0]}>
                        {attemptsByStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>

          {/* Simulations by Status */}
          <FadeIn delay={0.5}>
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Simulations by Status</CardTitle>
                <CardDescription>
                  Distribution of simulation statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : simulationsByStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={simulationsByStatusData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="name"
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" fill={COLORS.purple} radius={[8, 8, 0, 0]}>
                        {simulationsByStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        {/* Status Breakdown Cards */}
        <FadeIn delay={0.6}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="glass-card border-border/50">
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : analytics ? (
              <>
                {Object.entries(analytics.attemptsByStatus).map(([status, count]) => {
                  // Map SUBMITTED to PENDING for display
                  const displayStatus = status === "SUBMITTED" ? "PENDING" : status;
                  const displayName = displayStatus.replace("_", " ");
                  
                  return (
                    <Card key={status} className="glass-card border-border/50">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {displayName}
                        </CardTitle>
                        {displayStatus === "SCORED" ? (
                          <CheckCircle2
                            className="w-5 h-5"
                            style={{ color: STATUS_COLORS[displayStatus] || COLORS.primary }}
                          />
                        ) : displayStatus === "PENDING" ? (
                          <Clock
                            className="w-5 h-5"
                            style={{ color: STATUS_COLORS[displayStatus] || COLORS.warning }}
                          />
                        ) : (
                          <Activity
                            className="w-5 h-5"
                            style={{ color: STATUS_COLORS[displayStatus] || COLORS.primary }}
                          />
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{count}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            ) : null}
          </div>
        </FadeIn>
      </div>
    </DashboardLayout>
  );
}
