import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    } else if (!isLoading && isAuthenticated && adminOnly && user?.role !== "admin") {
      setLocation("/");
    }
  }, [isLoading, isAuthenticated, user, adminOnly, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex justify-center items-center">جاري التحميل...</div>;
  }

  if (!isAuthenticated || (adminOnly && user?.role !== "admin")) {
    return null;
  }

  return <>{children}</>;
}
