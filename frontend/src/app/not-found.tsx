import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="glass-card border-border/50 max-w-md w-full text-center">
        <CardHeader>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-xl shadow-orange-500/25">
            <Construction className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Page Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This page is currently under development. We&apos;re working hard to bring you this feature soon!
          </p>
          <Link href="/dashboard">
            <Button className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

