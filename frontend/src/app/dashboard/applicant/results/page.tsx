"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/animations";
import {
  CheckCircle,
  Clock,
  FileText,
  Calendar,
  Star,
  ArrowRight,
  Eye,
} from "lucide-react";
import api from "@/lib/axios";
import { formatDateTime } from "@/lib/utils";

interface Attempt {
  id: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "SCORED";
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  feedback: string | null;
  simulation: {
    id: string;
    title: string;
    description: string;
  };
}

export default function ApplicantResultsPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttempts();
  }, []);

  const fetchAttempts = async () => {
    try {
      const response = await api.get<Attempt[]>("/attempts/my-attempts");
      setAttempts(response.data);
    } catch (error) {
      console.error("Failed to fetch attempts:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, score: number | null) => {
    if (status === "SCORED" && score !== null) {
      if (score >= 80) return <Badge variant="success">Scored: {score}/100</Badge>;
      if (score >= 60) return <Badge variant="warning">Scored: {score}/100</Badge>;
      return <Badge variant="destructive">Scored: {score}/100</Badge>;
    }
    if (status === "SUBMITTED") return <Badge variant="warning">Under Review</Badge>;
    if (status === "IN_PROGRESS") return <Badge variant="secondary">In Progress</Badge>;
    return <Badge>{status}</Badge>;
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FadeIn>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/25">
              <CheckCircle className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">My Results</h1>
              <p className="text-muted-foreground">
                View your assessment results and feedback
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">
                Assessment History ({attempts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : attempts.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    You haven&apos;t completed any assessments yet.
                  </p>
                  <Link href="/dashboard/applicant/simulations">
                    <Button>
                      Browse Simulations
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Simulation</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attempts.map((attempt, index) => (
                        <motion.tr
                          key={attempt.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{attempt.simulation.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {attempt.simulation.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(attempt.status, attempt.score)}
                          </TableCell>
                          <TableCell>
                            {attempt.score !== null ? (
                              <div className="flex items-center gap-2">
                                <Star className={`w-4 h-4 ${getScoreColor(attempt.score)}`} />
                                <span className={`font-bold ${getScoreColor(attempt.score)}`}>
                                  {attempt.score}
                                </span>
                                <span className="text-muted-foreground">/100</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {attempt.submittedAt ? (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                {formatDateTime(attempt.submittedAt)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Not submitted</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/dashboard/applicant/results/${attempt.id}`}>
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                            </Link>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </DashboardLayout>
  );
}

