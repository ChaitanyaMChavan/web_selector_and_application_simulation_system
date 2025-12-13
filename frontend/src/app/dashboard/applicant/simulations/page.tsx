"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations";
import { FileText, Clock, Layers, Play, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import api from "@/lib/axios";

interface Simulation {
  id: string;
  title: string;
  description: string;
  timeLimitMinutes: number;
  _count?: {
    steps: number;
  };
}

export default function ApplicantSimulationsPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchSimulations();
  }, []);

  const fetchSimulations = async () => {
    try {
      const response = await api.get<Simulation[]>("/simulations/published");
      setSimulations(response.data);
    } catch (error) {
      console.error("Failed to fetch simulations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSimulations = simulations.filter(
    (sim) =>
      sim.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sim.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Available Simulations</h1>
              <p className="text-muted-foreground">
                Browse and start assessments to showcase your skills
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search simulations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </FadeIn>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="glass-card border-border/50">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredSimulations.length === 0 ? (
          <FadeIn delay={0.2}>
            <Card className="glass-card border-border/50">
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "No simulations found matching your search."
                    : "No simulations available at the moment."}
                </p>
              </CardContent>
            </Card>
          </FadeIn>
        ) : (
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSimulations.map((sim) => (
              <StaggerItem key={sim.id}>
                <motion.div
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="glass-card border-border/50 h-full hover:border-primary/50 transition-colors group">
                    <CardHeader>
                      <CardTitle className="group-hover:text-primary transition-colors">
                        {sim.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {sim.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {sim.timeLimitMinutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-4 h-4" />
                          {sim._count?.steps || 0} steps
                        </span>
                      </div>
                      <Link href={`/dashboard/applicant/simulations/${sim.id}`}>
                        <Button variant="glow" className="w-full">
                          <Play className="w-4 h-4" />
                          Start Assessment
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </DashboardLayout>
  );
}

