"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, ArrowLeft, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/animations";
import { useToast } from "@/hooks/use-toast";

export default function ApplicantLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password, "APPLICANT");
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
        variant: "success",
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Sign in failed",
        description: err.response?.data?.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 grid-background" />
      
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <motion.div
        animate={{ y: [-20, 20, -20] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ y: [20, -20, 20] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl"
      />

      <FadeIn className="w-full max-w-md relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to home
        </Link>

        <Card className="glass-card border-white/[0.08]">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="relative w-16 h-16 mx-auto mb-4"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-sky-400 rounded-2xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="absolute -inset-2 bg-primary/20 rounded-3xl blur-xl animate-pulse-glow" />
            </motion.div>
            <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to continue to your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-secondary/50 border-white/[0.08] focus:border-primary/50"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-secondary/50 border-white/[0.08] focus:border-primary/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full h-11 btn-gradient text-primary-foreground font-medium shadow-lg shadow-primary/25"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="relative z-10">Signing in...</span>
                  </>
                ) : (
                  <span className="relative z-10">Sign in</span>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/[0.08] text-center text-sm">
              <span className="text-muted-foreground">Don&apos;t have an account? </span>
              <Link
                href="/signup/applicant"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Create one
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          By signing in, you agree to our Terms of Service
        </p>
      </FadeIn>
    </div>
  );
}
