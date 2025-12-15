"use client";

import { motion } from "framer-motion";
import { Zap, ArrowRight, Users, FileText, ClipboardCheck, Shield, Sparkles } from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

const roles = [
  {
    title: "Admin",
    description: "System management & oversight",
    href: "/login/admin",
    icon: <Shield className="w-5 h-5" />,
    gradient: "from-rose-500 to-orange-400",
    shadow: "shadow-rose-500/20",
    hoverBg: "group-hover:bg-rose-500/5",
  },
  {
    title: "Author",
    description: "Create & publish simulations",
    href: "/login/author",
    icon: <FileText className="w-5 h-5" />,
    gradient: "from-blue-500 to-cyan-400",
    shadow: "shadow-blue-500/20",
    hoverBg: "group-hover:bg-blue-500/5",
  },
  {
    title: "Selector",
    description: "Review & score submissions",
    href: "/login/selector",
    icon: <ClipboardCheck className="w-5 h-5" />,
    gradient: "from-violet-500 to-purple-400",
    shadow: "shadow-violet-500/20",
    hoverBg: "group-hover:bg-violet-500/5",
  },
  {
    title: "Applicant",
    description: "Take assessments & grow",
    href: "/login/applicant",
    icon: <Users className="w-5 h-5" />,
    gradient: "from-primary to-sky-400",
    shadow: "shadow-primary/20",
    hoverBg: "group-hover:bg-primary/5",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen mesh-gradient overflow-hidden relative">
      {/* Subtle grid */}
      <div className="absolute inset-0 grid-background" />

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [-20, 20, -20], x: [-10, 10, -10] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-[15%] w-72 h-72 bg-primary/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [20, -20, 20], x: [10, -10, 10] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-20 right-[15%] w-96 h-96 bg-accent/10 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20">
        {/* Hero */}
        <FadeIn delay={0.1} className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 1, bounce: 0.4 }}
            className="relative w-20 h-20 mx-auto mb-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-sky-400 rounded-2xl rotate-6 opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-sky-400 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -inset-4 bg-primary/20 rounded-3xl blur-xl"
            />
          </motion.div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="gradient-text">SimAssess</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Modern assessment platform for evaluating talent through
            interactive simulations and real-world scenarios.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Trusted by forward-thinking organizations</span>
          </motion.div>
        </FadeIn>

        {/* Role Cards */}
        <StaggerContainer 
          staggerDelay={0.1}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl px-4"
        >
          {roles.map((role) => (
            <StaggerItem key={role.title}>
              <Link href={role.href} className="block group h-full">
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`relative p-6 rounded-2xl glass-card cursor-pointer overflow-hidden ${role.hoverBg} transition-colors duration-300 h-full flex flex-col`}
                >
                  {/* Icon */}
                  <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center text-white mb-4 shadow-lg ${role.shadow} flex-shrink-0`}>
                    {role.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col">
                    <h3 className="text-lg font-semibold mb-1">
                      {role.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 flex-1">
                      {role.description}
                    </p>

                    {/* Arrow */}
                    <div className="flex items-center text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors mt-auto">
                      <span>Sign in</span>
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Bottom decoration */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-muted-foreground/50"
        >
          <div className="w-8 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span>v1.0</span>
          <div className="w-8 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </motion.div>
      </div>
    </div>
  );
}
