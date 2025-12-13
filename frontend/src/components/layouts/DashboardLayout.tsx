"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Users,
  ClipboardCheck,
  LogOut,
  Menu,
  X,
  Zap,
  ChevronRight,
} from "lucide-react";
import { useAuth, UserRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/animations";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const navItems: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/dashboard/admin", icon: <LayoutDashboard className="w-5 h-5" /> },
  ],
  AUTHOR: [
    { label: "Dashboard", href: "/dashboard/author", icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "Simulations", href: "/dashboard/author/simulations", icon: <FileText className="w-5 h-5" /> },
  ],
  SELECTOR: [
    { label: "Dashboard", href: "/dashboard/selector", icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "Pending", href: "/dashboard/selector/attempts", icon: <ClipboardCheck className="w-5 h-5" /> },
    { label: "My Scores", href: "/dashboard/selector/my-scores", icon: <Users className="w-5 h-5" /> },
  ],
  APPLICANT: [
    { label: "Dashboard", href: "/dashboard/applicant", icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "Simulations", href: "/dashboard/applicant/simulations", icon: <FileText className="w-5 h-5" /> },
  ],
};

const roleGradients: Record<UserRole, string> = {
  ADMIN: "from-rose-500 to-orange-400",
  AUTHOR: "from-blue-500 to-cyan-400",
  SELECTOR: "from-violet-500 to-purple-400",
  APPLICANT: "from-primary to-sky-400",
};

const roleBgColors: Record<UserRole, string> = {
  ADMIN: "bg-rose-500/10 dark:bg-rose-500/10",
  AUTHOR: "bg-blue-500/10 dark:bg-blue-500/10",
  SELECTOR: "bg-violet-500/10 dark:bg-violet-500/10",
  APPLICANT: "bg-primary/10 dark:bg-primary/10",
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-sky-400 animate-pulse" />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-sky-400 animate-ping opacity-20" />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  const items = navItems[user.role];
  const gradient = roleGradients[user.role];
  const bgColor = roleBgColors[user.role];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold">SimAssess</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-sm">SimAssess</h1>
                <p className="text-[10px] text-muted-foreground capitalize">{user.role.toLowerCase()}</p>
              </div>
            </div>
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== `/dashboard/${user.role.toLowerCase()}` && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                    isActive
                      ? `${bgColor} text-foreground`
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b", gradient)}
                    />
                  )}
                  <span className={isActive ? "text-foreground" : ""}>{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-3 border-t border-border">
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-sm font-semibold", gradient)}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
