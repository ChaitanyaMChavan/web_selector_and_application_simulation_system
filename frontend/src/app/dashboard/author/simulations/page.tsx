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
  Plus,
  Edit,
  Layers,
  FileText,
  Clock,
} from "lucide-react";
import api from "@/lib/axios";
import { formatDate } from "@/lib/utils";

interface Simulation {
  id: string;
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED";
  timeLimitMinutes: number;
  createdAt: string;
  _count?: {
    steps: number;
  };
}

export default function SimulationsListPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSimulations();
  }, []);

  const fetchSimulations = async () => {
    try {
      const response = await api.get<Simulation[]>("/simulations/mine");
      setSimulations(response.data);
    } catch (error) {
      console.error("Failed to fetch simulations:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">My Simulations</h1>
              <p className="text-muted-foreground">
                Create and manage your assessment simulations
              </p>
            </div>
            <Link href="/dashboard/author/simulations/new">
              <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                <Plus className="w-4 h-4" />
                Create Simulation
              </Button>
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">All Simulations</CardTitle>
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
              ) : simulations.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    You haven&apos;t created any simulations yet.
                  </p>
                  <Link href="/dashboard/author/simulations/new">
                    <Button>
                      <Plus className="w-4 h-4" />
                      Create Your First Simulation
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Steps</TableHead>
                        <TableHead>Time Limit</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simulations.map((sim, index) => (
                        <motion.tr
                          key={sim.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{sim.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {sim.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                sim.status === "PUBLISHED"
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {sim.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Layers className="w-4 h-4" />
                              {sim._count?.steps || 0}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {sim.timeLimitMinutes} min
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(sim.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/dashboard/author/simulations/${sim.id}/view`}
                              >
                                <Button variant="ghost" size="sm" title="View">
                                  <FileText className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Link
                                href={`/dashboard/author/simulations/${sim.id}/edit`}
                              >
                                <Button variant="ghost" size="sm" title="Edit">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Link
                                href={`/dashboard/author/simulations/${sim.id}/steps`}
                              >
                                <Button variant="ghost" size="sm" title="Manage Steps">
                                  <Layers className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
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

