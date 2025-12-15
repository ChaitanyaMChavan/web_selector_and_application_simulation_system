import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction, Home, ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { FadeIn } from "@/components/animations";

export default function AnalyticsPage() {
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

          <Card className="glass-card border-border/50 text-center max-w-md mx-auto">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-xl shadow-orange-500/25">
                <Construction className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Analytics Coming Soon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                The analytics dashboard is currently under development. We&apos;re working hard to bring you comprehensive insights and reports!
              </p>
              <Link href="/dashboard/admin">
                <Button className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Admin Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </DashboardLayout>
  );
}

