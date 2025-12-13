"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import api from "./axios";

export type UserRole = "ADMIN" | "AUTHOR" | "SELECTOR" | "APPLICANT";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get<User>("/auth/me");
      setUser(response.data);
    } catch (error: any) {
      // Silently handle 401 errors - user is just not authenticated
      if (error.response?.status === 401) {
        setUser(null);
      } else {
        // Only log non-401 errors
        console.error("Error fetching user:", error);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Route protection
  useEffect(() => {
    if (loading) return;

    const isLoginPage = pathname?.startsWith("/login");
    const isDashboardPage = pathname?.startsWith("/dashboard");
    const isHomePage = pathname === "/";
    const isSignupPage = pathname?.startsWith("/signup");

    // Allow home page and signup page without authentication - don't redirect
    if (isHomePage || isSignupPage) {
      return;
    }

    if (!user && isDashboardPage) {
      // Not authenticated, redirect to login
      router.push("/login/applicant");
      return;
    }

    if (user && isLoginPage) {
      // Already authenticated, redirect to appropriate dashboard
      router.push(`/dashboard/${user.role.toLowerCase()}`);
      return;
    }

    // Role-based route protection
    if (user && isDashboardPage) {
      const roleFromPath = pathname?.split("/")[2]?.toUpperCase();
      if (roleFromPath && roleFromPath !== user.role) {
        router.push(`/dashboard/${user.role.toLowerCase()}`);
        return;
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string, role: UserRole) => {
    const response = await api.post<{ user: User }>(`/auth/login/${role.toLowerCase()}`, {
      email,
      password,
    });
    setUser(response.data.user);
    router.push(`/dashboard/${role.toLowerCase()}`);
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
    router.push("/login/applicant");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Hook for protecting routes based on role
export function useRequireRole(requiredRole: UserRole) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== requiredRole)) {
      router.push("/login/" + requiredRole.toLowerCase());
    }
  }, [user, loading, requiredRole, router]);

  return { user, loading, authorized: !loading && user?.role === requiredRole };
}

