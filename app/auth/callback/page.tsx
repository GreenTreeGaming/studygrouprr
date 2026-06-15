"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { isEduEmail } from "@/lib/authRules";

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        async function handleAuth() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.replace("/");
                return;
            }

            if (!user.email || !isEduEmail(user.email)) {
                router.replace("/auth/invalid-email");
                return;
            }

            await supabase.from("profiles").upsert({
                id: user.id,
                email: user.email,
                name: user.user_metadata.full_name,
                avatar_url: user.user_metadata.avatar_url,
            });

            const { data: profile } = await supabase
                .from("profiles")
                .select("onboarding_complete")
                .eq("id", user.id)
                .single();

            if (!profile?.onboarding_complete) {
                router.replace("/onboarding");
            } else {
                router.replace("/dashboard");
            }
        }

        handleAuth();
    }, [router]);

    return (
        <main className="flex min-h-screen items-center justify-center">
            <p>Signing you in...</p>
        </main>
    );
}