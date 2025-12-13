"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CheckCircle, FileText, Calendar, Star } from "lucide-react";
import api from "@/lib/axios";
import { formatDateTime } from "@/lib/utils";

interface ScoredAttempt {
  id: string;
  simulation: {
    id: string;
    title: string;
  };
  applicant: {
    id: string;
    name: string;
    email: string;
  };
  submittedAt: string;
  scoredAt: string;
  score: number;
  feedback?: string;
}

export default function MyScoressPage() {
  const [scores, setScores] = useState<ScoredAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScores();
  }, []);

  const fetchScores = async () => {
    try {
      const response = await api.get<ScoredAttempt[]>("/scoring/my-scores");
      setScores(response.data);
    } catch (error) {
      console.error("Failed to fetch scores:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FadeIn>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-xl shadow-green-500/25">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">My Scores</h1>
              <p className="text-muted-foreground">
                View your scoring history
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">
                Scored Attempts ({scores.length})
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
              ) : scores.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    You haven&apos;t scored any attempts yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Applicant</TableHead>
                        <TableHead>Simulation</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Scored On</TableHead>
                        <TableHead>Feedback</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scores.map((attempt, index) => (
                        <motion.tr
                          key={attempt.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                                {attempt.applicant.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {attempt.applicant.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {attempt.applicant.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              {attempt.simulation.title}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`font-bold text-lg ${getScoreColor(
                                attempt.score
                              )}`}
                            >
                              {attempt.score}
                            </span>
                            <span className="text-muted-foreground">/100</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              {formatDateTime(attempt.scoredAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {attempt.feedback ? (
                              <p className="text-sm text-muted-foreground max-w-xs truncate">
                                {attempt.feedback}
                              </p>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                No feedback
                              </span>
                            )}
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

