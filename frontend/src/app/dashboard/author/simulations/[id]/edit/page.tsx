"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/animations";
import { ArrowLeft, Loader2, Save, FileText, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import Link from "next/link";

interface Simulation {
  id: string;
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED";
  timeLimitMinutes: number;
}

export default function EditSimulationPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Simulation | null>(null);

  useEffect(() => {
    const loadSimulation = async () => {
      try {
        const response = await api.get<Simulation>(`/simulations/${params.id}`);
        setFormData(response.data);
      } catch {
        toast({
          title: "Failed to load simulation",
          description: "Could not fetch simulation details",
          variant: "destructive",
        });
        router.push("/dashboard/author/simulations");
      } finally {
        setLoading(false);
      }
    };
    loadSimulation();
  }, [params.id, router, toast]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setSaving(true);
    try {
      await api.patch(`/simulations/${params.id}`, {
        title: formData.title,
        description: formData.description,
        timeLimitMinutes: formData.timeLimitMinutes,
        status: formData.status,
      });
      toast({
        title: "Simulation updated!",
        description: "Your changes have been saved.",
        variant: "success",
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Failed to update simulation",
        description: err.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!formData) return null;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <FadeIn>
          <Link
            href="/dashboard/author/simulations"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to simulations
          </Link>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-500/25">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Edit Simulation</h1>
                <p className="text-muted-foreground">
                  Update simulation details
                </p>
              </div>
            </div>
            <Link href={`/dashboard/author/simulations/${params.id}/steps`}>
              <Button variant="outline">
                <Layers className="w-4 h-4" />
                Manage Steps
              </Button>
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Simulation Details</CardTitle>
              <CardDescription>
                Update the basic information for your simulation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    min={5}
                    max={180}
                    value={formData.timeLimitMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        timeLimitMinutes: parseInt(e.target.value) || 30,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "DRAFT" | "PUBLISHED") =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">
                        <div className="flex items-center gap-2">
                          <Badge variant="warning">DRAFT</Badge>
                          <span>Not visible to applicants</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="PUBLISHED">
                        <div className="flex items-center gap-2">
                          <Badge variant="success">PUBLISHED</Badge>
                          <span>Visible to applicants</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Published simulations are visible and accessible to applicants
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </DashboardLayout>
  );
}

