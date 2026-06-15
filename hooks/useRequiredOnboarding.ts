import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { useProfile } from "./useProfile";

export function useRequireOnboarding() {

  const router = useRouter();

  const { profile, loading } = useProfile();

  useEffect(() => {

    if (

      !loading &&

      profile &&

      !profile.onboarding_complete

    ) {

      router.replace("/onboarding");

    }

  }, [profile, loading, router]);

  return { profile, loading };

}