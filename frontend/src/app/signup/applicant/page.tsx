"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, ArrowLeft, Mail, Lock, Loader2, User, Eye, EyeOff, Check } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/animations";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";

export default function ApplicantSignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;
  const passwordLongEnough = formData.password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/auth/signup/applicant", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      toast({
        title: "Account created!",
        description: "You can now sign in with your credentials.",
        variant: "success",
      });
      router.push("/login/applicant");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Signup failed",
        description: err.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 grid-background" />
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
            <CardTitle className="text-2xl font-semibold">Create account</CardTitle>
            <CardDescription className="text-muted-foreground">
              Join as an applicant to take assessments
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10 h-11 bg-secondary/50 border-white/[0.08] focus:border-primary/50"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 h-11 bg-secondary/50 border-white/[0.08] focus:border-primary/50"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10 pr-10 h-11 bg-secondary/50 border-white/[0.08] focus:border-primary/50"
                    required
                  />
                  {passwordsMatch && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>

              {/* Password requirements */}
              <div className="flex gap-4 text-xs">
                <span className={`flex items-center gap-1 ${passwordLongEnough ? "text-green-500" : "text-muted-foreground"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${passwordLongEnough ? "bg-green-500" : "bg-muted-foreground"}`} />
                  6+ characters
                </span>
                <span className={`flex items-center gap-1 ${passwordsMatch ? "text-green-500" : "text-muted-foreground"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${passwordsMatch ? "bg-green-500" : "bg-muted-foreground"}`} />
                  Passwords match
                </span>
              </div>

              <Button
                type="submit"
                className="w-full h-11 btn-gradient text-primary-foreground font-medium shadow-lg shadow-primary/25 mt-2"
                disabled={isLoading || !passwordLongEnough}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="relative z-10">Creating account...</span>
                  </>
                ) : (
                  <span className="relative z-10">Create account</span>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/[0.08] text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link
                href="/login/applicant"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}

