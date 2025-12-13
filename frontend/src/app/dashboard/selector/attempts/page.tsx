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
import { ClipboardCheck, FileText, Calendar, ArrowRight } from "lucide-react";
import api from "@/lib/axios";
import { formatDateTime } from "@/lib/utils";

interface PendingAttempt {
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
  status: string;
}

export default function PendingAttemptsPage() {
  const [attempts, setAttempts] = useState<PendingAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttempts();
  }, []);

  const fetchAttempts = async () => {
    try {
      const response = await api.get<PendingAttempt[]>("/scoring/pending");
      setAttempts(response.data);
    } catch (error) {
      console.error("Failed to fetch attempts:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FadeIn>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl shadow-purple-500/25">
              <ClipboardCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Pending Attempts</h1>
              <p className="text-muted-foreground">
                Review and score submitted assessments
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">
                Awaiting Review ({attempts.length})
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
                  <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No pending attempts to review. Great job!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Applicant</TableHead>
                        <TableHead>Simulation</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
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
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
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
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              {formatDateTime(attempt.submittedAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="warning">Pending Review</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/dashboard/selector/attempts/${attempt.id}`}
                            >
                              <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500">
                                Review
                                <ArrowRight className="w-4 h-4" />
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

