import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// Returns the user's currently-active subscription (not expired), or null.
export function useSubscription() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter(
        { user_id: user.id, status: "active" },
        "-created_date",
        50
      );
      const now = new Date();
      return subs.find((s) => s.expiry_date && new Date(s.expiry_date) > now) || null;
    },
    enabled: isAuthenticated && !!user?.id,
  });
}

export function useHasSubscription() {
  const { data, isLoading } = useSubscription();
  return { hasAccess: !!data, subscription: data, isLoading };
}