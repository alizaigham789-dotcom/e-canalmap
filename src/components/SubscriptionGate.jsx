import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2 } from "lucide-react";

// Layout route — lets admins through, requires an active subscription for everyone else.
export default function SubscriptionGate() {
  const { data: currentUser } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: sub, isLoading } = useSubscription();

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (currentUser.role === "admin") return <Outlet />;
  if (!sub) return <Navigate to="/subscription" replace />;
  return <Outlet />;
}