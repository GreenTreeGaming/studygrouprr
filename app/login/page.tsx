"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  GraduationCap,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import LoginButton from "@/components/LoginButton";
import { isEduEmail } from "@/lib/authRules";
import { supabase } from "@/lib/supabase";

import styles from "./login.module.css";

type LoginView = "checking" | "ready" | "redirecting";

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<LoginView>("checking");

  useEffect(() => {
    let cancelled = false;

    async function resolveUser() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (
            userError &&
            userError.name !== "AuthSessionMissingError"
        ) {
          throw userError;
        }

        if (!user) {
          if (!cancelled) {
            setView("ready");
          }

          return;
        }

        if (!user.email || !isEduEmail(user.email)) {
          await supabase.auth.signOut();

          if (!cancelled) {
            setView("ready");
          }

          return;
        }

        const { data: profile, error: profileError } =
            await supabase
                .from("profiles")
                .select("onboarding_complete")
                .eq("id", user.id)
                .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (cancelled) {
          return;
        }

        setView("redirecting");
        router.replace(
            profile?.onboarding_complete
                ? "/dashboard"
                : "/onboarding",
        );
      } catch (error) {
        console.error("Unable to resolve login state:", error);

        if (!cancelled) {
          setView("ready");
        }
      }
    }

    void resolveUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (view !== "ready") {
    return (
        <main
            id="studygrouprr-login"
            className={styles.loadingPage}
            role="status"
            aria-live="polite"
        >
          <div className={styles.loadingCard}>
            <Image
                src="/navbar-logo.png"
                alt=""
                width={48}
                height={48}
                priority
                className={styles.loadingLogo}
            />

            <div className={styles.loadingCopy}>
              <strong>StudyGrouprr</strong>
              <span>
              {view === "redirecting"
                  ? "Opening your campus…"
                  : "Checking your account…"}
            </span>
            </div>

            <span className={styles.loadingBar} aria-hidden="true" />
          </div>
        </main>
    );
  }

  return (
      <main id="studygrouprr-login" className={styles.page}>
        <div className={styles.background} aria-hidden="true">
          <div className={styles.backgroundGrid} />
          <div className={styles.backgroundWash} />
        </div>

        <section
            className={styles.shell}
            aria-labelledby="login-heading"
        >
          <Link href="/" className={styles.backLink}>
            <ArrowLeft size={16} />
            Back to home
          </Link>

          <div className={styles.card}>
            <div className={styles.brand}>
              <Image
                  src="/navbar-logo.png"
                  alt=""
                  width={44}
                  height={44}
                  priority
                  className={styles.brandLogo}
              />

              <span className={styles.brandName}>
              <span>Study</span>
              <span>Grouprr</span>
            </span>
            </div>

            <header className={styles.heading}>
              <h1 id="login-heading">
                Sign in to find your study group.
              </h1>

              <p>
                Use your university Google account to find
                classmates, join study sessions, and meet on campus.
              </p>
            </header>

            <div className={styles.actionArea}>
              <LoginButton />

              <p className={styles.accountNote}>
                New to StudyGrouprr? Your account is created
                automatically after sign-in.
              </p>
            </div>

            <div className={styles.universityNote}>
            <span className={styles.noteIcon} aria-hidden="true">
              <GraduationCap size={19} />
            </span>

              <div>
                <strong>University accounts only</strong>
                <span>
                Sign in with the Google account connected to your
                .edu email.
              </span>
              </div>
            </div>

            <div className={styles.trustRow}>
            <span>
              <LockKeyhole size={15} />
              Secure Google sign-in
            </span>

              <span>
              <ShieldCheck size={15} />
              Private from advertisers
            </span>
            </div>

            <p className={styles.legal}>
              By continuing, you agree to the{" "}
              <Link href="/terms">Terms of Service</Link> and{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </div>

          <p className={styles.bottomCopy}>
            Find classmates. Meet on campus. Study together.
          </p>
        </section>
      </main>
  );
}
