import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useProfile } from "./useProfile";

export function useRequireOnboarding() {
  const router = useRouter();

  const { profile, loading } = useProfile();

  useEffect(() => {
    if (loading) return;

    // Not logged in
    if (!profile) {
      router.replace("/login");
      return;
    }

    // Logged in but onboarding incomplete
    if (!profile.onboarding_complete) {
      router.replace("/onboarding");
      return;
    }
  }, [profile, loading, router]);

  return {
    profile,
    loading,
  };
}