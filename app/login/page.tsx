"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  BookOpen,
  Check,
  GraduationCap,
  Radio,
  ShieldCheck,
  Users,
} from "lucide-react";

import LoginButton from "@/components/LoginButton";
import { supabase } from "@/lib/supabase";
import { isEduEmail } from "@/lib/authRules";


type LoginView = "checking" | "ready" | "redirecting";

const benefits = [
  {
    icon: Radio,
    text: "See who is studying now",
  },
  {
    icon: BookOpen,
    text: "Join sessions for your courses",
  },
  {
    icon: Users,
    text: "Meet classmates on campus",
  },
] as const;

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

        if (userError) {
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

        const { data: profile, error: profileError } = await supabase
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
                : "/onboarding"
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
        <>
          <style>{loginStyles}</style>

          <main className="login-loading" role="status">
            <div className="login-loading-logo" aria-hidden="true">
              <BookOpen size={21} />
            </div>

            <div className="login-spinner" />

            <p>
              {view === "redirecting"
                  ? "Opening StudyGrouprr…"
                  : "Loading…"}
            </p>
          </main>
        </>
    );
  }

  return (
      <>
        <style>{loginStyles}</style>

        <main className="login-page">
          <div className="login-background" aria-hidden="true">
            <div className="login-glow login-glow--violet" />
            <div className="login-glow login-glow--green" />
            <div className="login-grid-pattern" />
          </div>

          <section
              className="login-shell"
              aria-labelledby="login-heading"
          >
            <div className="login-card">
              <div className="login-brand">
              <span className="login-brand-icon" aria-hidden="true">
                <BookOpen size={20} strokeWidth={2.4} />
              </span>

                <span>StudyGrouprr</span>
              </div>

              <div className="login-heading">
                <p className="login-eyebrow">Campus access</p>

                <h1 id="login-heading">Welcome to StudyGrouprr</h1>

                <p>
                  Sign in or create your account to find classmates
                  studying the same courses.
                </p>
              </div>

              <div className="login-benefits">
                {benefits.map((benefit) => {
                  const Icon = benefit.icon;

                  return (
                      <div
                          key={benefit.text}
                          className="login-benefit"
                      >
                    <span className="login-benefit-icon">
                      <Icon size={15} />
                    </span>

                        <span>{benefit.text}</span>
                      </div>
                  );
                })}
              </div>

              <div className="login-action-area">
                <div className="login-arrow-cluster" aria-hidden="true">
                  <div className="login-arrow login-arrow--left">
                    <span>start here</span>

                    <svg
                        viewBox="0 0 70 58"
                        role="presentation"
                        focusable="false"
                    >
                      <path
                          d="M7 9C22 10 34 16 41 26C46 33 49 39 51 50"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                      />
                      <path
                          d="M44 42L51 51L58 43"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="login-arrow login-arrow--center">
                    <span>one click away</span>

                    <svg
                        viewBox="0 0 42 60"
                        role="presentation"
                        focusable="false"
                    >
                      <path
                          d="M21 6C21 19 21 29 21 41"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                      />
                      <path
                          d="M14 33L21 42L28 33"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="login-arrow login-arrow--right">
                    <span>tap this</span>

                    <svg
                        viewBox="0 0 70 58"
                        role="presentation"
                        focusable="false"
                    >
                      <path
                          d="M63 9C48 10 36 16 29 26C24 33 21 39 19 50"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                      />
                      <path
                          d="M12 43L19 51L26 42"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>

                <LoginButton />

                <p className="login-account-note">
                  New here? Your account is created automatically.
                </p>
              </div>

              <div className="login-divider">
                <span />
                <p>Simple and private</p>
                <span />
              </div>

              <div className="login-trust-row">
                <div>
                  <Check size={14} />
                  Fast onboarding
                </div>

                <div>
                  <ShieldCheck size={14} />
                  Your data is not sold
                </div>
              </div>

              <p className="login-legal">
                By continuing, you agree to the{" "}
                <Link href="/terms">Terms of Service</Link> and{" "}
                <Link href="/privacy">Privacy Policy</Link>.
              </p>
            </div>

            <p className="login-bottom-copy">
              Find classmates. Study together.
            </p>
          </section>
        </main>
      </>
  );
}

const loginStyles = `
  .login-page,
  .login-loading {
    --login-indigo: #1b1b3a;
    --login-violet: #7c3aed;
    --login-violet-dark: #6d28d9;
    --login-violet-light: #f5f3ff;
    --login-green: #10b981;
    --login-green-light: #ecfdf5;
    --login-background: #f8f7fc;
    --login-surface: #ffffff;
    --login-border: #e7e5ef;
    --login-border-strong: #d9d6e7;
    --login-text: #1b1b3a;
    --login-muted: #64748b;
    --login-faint: #94a3b8;
  }

  .login-page *,
  .login-page *::before,
  .login-page *::after,
  .login-loading * {
    box-sizing: border-box;
  }

  .login-page {
    position: relative;
    display: grid;
    min-height: calc(100svh - 150px);
    overflow: hidden;
    place-items: center;
    padding: 64px 20px 80px;
    background: var(--login-background);
    color: var(--login-text);
  }

  .login-background {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .login-glow {
    position: absolute;
    border-radius: 999px;
    filter: blur(2px);
  }

  .login-glow--violet {
    top: -220px;
    left: 50%;
    width: 520px;
    height: 420px;
    transform: translateX(-50%);
    background: rgba(124, 58, 237, 0.09);
  }

  .login-glow--green {
    right: -180px;
    bottom: -200px;
    width: 400px;
    height: 400px;
    background: rgba(16, 185, 129, 0.055);
  }

  .login-grid-pattern {
    position: absolute;
    inset: 0;
    opacity: 0.28;
    background-image:
      linear-gradient(
        rgba(27, 27, 58, 0.025) 1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        rgba(27, 27, 58, 0.025) 1px,
        transparent 1px
      );
    background-size: 42px 42px;
    mask-image: linear-gradient(
      to bottom,
      transparent,
      black 25%,
      black 70%,
      transparent
    );
  }

  .login-shell {
    position: relative;
    z-index: 1;
    width: min(100%, 470px);
  }

  .login-top-note {
    display: flex;
    width: fit-content;
    margin: 0 auto 14px;
    align-items: center;
    gap: 7px;
    padding: 7px 11px;
    border: 1px solid #ddd6fe;
    border-radius: 999px;
    background: rgba(245, 243, 255, 0.9);
    color: var(--login-violet);
    font-size: 10px;
    font-weight: 750;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    animation: login-enter 420ms ease-out both;
  }

  .login-card {
    padding: 34px;
    border: 1px solid rgba(217, 214, 231, 0.95);
    border-radius: 25px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow:
      0 24px 70px rgba(27, 27, 58, 0.09),
      0 2px 8px rgba(27, 27, 58, 0.035);
    backdrop-filter: blur(18px);
    animation: login-enter 500ms 60ms ease-out both;
  }

  .login-brand {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: var(--login-indigo);
    font-size: 14px;
    font-weight: 750;
    letter-spacing: -0.02em;
  }

  .login-brand-icon {
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    border-radius: 11px;
    background: var(--login-indigo);
    color: white;
    box-shadow: 0 7px 18px rgba(27, 27, 58, 0.14);
  }

  .login-heading {
    margin-top: 27px;
  }

  .login-eyebrow {
    margin: 0 0 8px;
    color: var(--login-violet);
    font-size: 10px;
    font-weight: 750;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .login-heading h1 {
    margin: 0;
    color: var(--login-indigo);
    font-size: clamp(27px, 6vw, 34px);
    font-weight: 760;
    letter-spacing: -0.045em;
    line-height: 1.1;
  }

  .login-heading > p:last-child {
    margin: 12px 0 0;
    color: var(--login-muted);
    font-size: 13px;
    line-height: 1.7;
  }

  .login-benefits {
    display: grid;
    gap: 8px;
    margin-top: 25px;
  }

  .login-benefit {
    display: flex;
    min-height: 42px;
    align-items: center;
    gap: 10px;
    padding: 8px 11px;
    border: 1px solid #efedf4;
    border-radius: 12px;
    background: #fbfafd;
    color: var(--login-muted);
    font-size: 12px;
    font-weight: 570;
    transition:
      border-color 160ms ease,
      background 160ms ease,
      transform 160ms ease;
  }

  .login-benefit:hover {
    transform: translateY(-1px);
    border-color: #ddd6fe;
    background: white;
  }

  .login-benefit-icon {
    display: grid;
    width: 27px;
    height: 27px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 8px;
    background: var(--login-violet-light);
    color: var(--login-violet);
  }

  .login-benefit:nth-child(2) .login-benefit-icon {
    background: #eef2ff;
    color: #4f46e5;
  }

  .login-benefit:nth-child(3) .login-benefit-icon {
    background: var(--login-green-light);
    color: #059669;
  }

  /*
   * Login CTA section
   *
   * This larger margin creates intentional breathing room between
   * the three benefits and the animated arrow cluster.
   */
  .login-action-area {
    position: relative;
    margin-top: 112px;
  }

  /*
   * Three-arrow area
   */
  .login-arrow-cluster {
    position: absolute;
    right: 0;
    bottom: calc(100% + 10px);
    left: 0;
    height: 90px;
    pointer-events: none;
    user-select: none;
  }

  .login-arrow {
    position: absolute;
    display: flex;
    align-items: flex-start;
    color: var(--login-violet);
    will-change: transform;
  }

  .login-arrow span {
    display: inline-flex;
    min-height: 24px;
    align-items: center;
    justify-content: center;
    padding: 4px 9px;
    border: 1px solid rgba(196, 181, 253, 0.58);
    border-radius: 999px;
    background: rgba(245, 243, 255, 0.96);
    color: var(--login-violet);
    font-size: 9px;
    font-weight: 750;
    letter-spacing: 0.015em;
    line-height: 1;
    white-space: nowrap;
    box-shadow:
      0 5px 15px rgba(124, 58, 237, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  .login-arrow svg {
    flex: 0 0 auto;
    overflow: visible;
    filter: drop-shadow(
      0 2px 3px rgba(124, 58, 237, 0.08)
    );
  }

  .login-arrow path {
    stroke-dasharray: 145;
    stroke-dashoffset: 0;
    transform-origin: center;
    animation: login-arrow-draw 3.2s ease-in-out infinite;
  }

  /*
   * Left arrow funnels toward the left side of the Google button.
   */
  .login-arrow--left {
    top: 27px;
    left: 1px;
    gap: 2px;
    animation:
      login-arrow-left-float 2.7s ease-in-out infinite;
  }

  .login-arrow--left svg {
    width: 58px;
    height: 52px;
  }

  .login-arrow--left path {
    animation-delay: -0.3s;
  }

  /*
   * Center arrow points directly at the center of the Google button.
   */
  .login-arrow--center {
    top: 0;
    left: 50%;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    transform: translateX(-50%);
    animation:
      login-arrow-center-float 2.35s ease-in-out infinite;
  }

  .login-arrow--center svg {
    width: 34px;
    height: 50px;
  }

  .login-arrow--center path {
    animation-delay: -0.85s;
  }

  /*
   * Right arrow funnels toward the right side of the Google button.
   */
  .login-arrow--right {
    top: 27px;
    right: 1px;
    flex-direction: row-reverse;
    gap: 2px;
    animation:
      login-arrow-right-float 2.9s ease-in-out infinite;
  }

  .login-arrow--right svg {
    width: 58px;
    height: 52px;
  }

  .login-arrow--right path {
    animation-delay: -1.4s;
  }

  /*
   * A very subtle CTA glow makes the button feel alive without
   * turning the login page back into a hero section.
   */
  .login-action-area .google-login-button {
    animation: login-button-breathe 3s ease-in-out infinite;
  }

  .login-account-note {
    margin: 11px 0 0;
    color: var(--login-faint);
    font-size: 10px;
    text-align: center;
  }

  .login-divider {
    display: grid;
    margin: 25px 0 17px;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 10px;
  }

  .login-divider span {
    height: 1px;
    background: var(--login-border);
  }

  .login-divider p {
    margin: 0;
    color: var(--login-faint);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .login-trust-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 9px 16px;
  }

  .login-trust-row div {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--login-muted);
    font-size: 10px;
    font-weight: 570;
  }

  .login-trust-row svg {
    color: var(--login-green);
  }

  .login-legal {
    margin: 20px auto 0;
    color: var(--login-faint);
    font-size: 9px;
    line-height: 1.6;
    text-align: center;
  }

  .login-legal a {
    color: var(--login-muted);
    font-weight: 650;
    text-decoration: none;
  }

  .login-legal a:hover {
    color: var(--login-violet);
  }

  .login-legal a:focus-visible {
    outline: 3px solid rgba(124, 58, 237, 0.2);
    outline-offset: 2px;
    border-radius: 3px;
  }

  .login-bottom-copy {
    margin: 18px 0 0;
    color: var(--login-faint);
    font-size: 11px;
    text-align: center;
  }

  .login-loading {
    display: flex;
    min-height: calc(100svh - 150px);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 13px;
    background: var(--login-background);
  }

  .login-loading-logo {
    display: grid;
    width: 46px;
    height: 46px;
    place-items: center;
    border: 1px solid var(--login-border);
    border-radius: 14px;
    background: white;
    color: var(--login-violet);
    box-shadow: 0 10px 28px rgba(27, 27, 58, 0.07);
  }

  .login-spinner {
    width: 22px;
    height: 22px;
    border: 2px solid var(--login-border);
    border-top-color: var(--login-violet);
    border-radius: 50%;
    animation: login-spin 700ms linear infinite;
  }

  .login-loading p {
    margin: 0;
    color: var(--login-muted);
    font-size: 12px;
  }

  @keyframes login-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes login-enter {
    from {
      opacity: 0;
      transform: translateY(10px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /*
   * The arrow lines periodically draw themselves in,
   * pause, and softly reset.
   */
  @keyframes login-arrow-draw {
    0% {
      stroke-dashoffset: 145;
      opacity: 0.25;
    }

    20% {
      stroke-dashoffset: 0;
      opacity: 1;
    }

    72% {
      stroke-dashoffset: 0;
      opacity: 1;
    }

    88% {
      stroke-dashoffset: -12;
      opacity: 0.55;
    }

    100% {
      stroke-dashoffset: -22;
      opacity: 0.18;
    }
  }

  @keyframes login-arrow-left-float {
    0%,
    100% {
      transform: translateY(0) rotate(-2deg);
    }

    50% {
      transform: translateY(-7px) rotate(1deg);
    }
  }

  @keyframes login-arrow-center-float {
    0%,
    100% {
      transform:
        translateX(-50%)
        translateY(0)
        scale(1);
    }

    50% {
      transform:
        translateX(-50%)
        translateY(-8px)
        scale(1.025);
    }
  }

  @keyframes login-arrow-right-float {
    0%,
    100% {
      transform: translateY(0) rotate(2deg);
    }

    50% {
      transform: translateY(-7px) rotate(-1deg);
    }
  }

  @keyframes login-button-breathe {
    0%,
    100% {
      box-shadow:
        0 12px 28px rgba(124, 58, 237, 0.2),
        0 0 0 0 rgba(124, 58, 237, 0);
    }

    50% {
      box-shadow:
        0 16px 34px rgba(124, 58, 237, 0.25),
        0 0 0 5px rgba(124, 58, 237, 0.055);
    }
  }

  @media (max-width: 520px) {
    .login-page {
      align-items: start;
      padding: 40px 14px 56px;
    }

    .login-card {
      padding: 26px 20px;
      border-radius: 21px;
    }

    .login-heading {
      margin-top: 23px;
    }

    .login-heading h1 {
      font-size: 28px;
    }

    /*
     * Preserve the extra breathing room on mobile,
     * while slightly shrinking the arrows.
     */
    .login-action-area {
      margin-top: 104px;
    }

    .login-arrow-cluster {
      bottom: calc(100% + 8px);
      height: 86px;
    }

    .login-arrow span {
      min-height: 21px;
      padding: 4px 7px;
      font-size: 8px;
    }

    .login-arrow--left {
      top: 31px;
      left: -2px;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }

    .login-arrow--left svg {
      width: 43px;
      height: 42px;
    }

    .login-arrow--center {
      top: 0;
    }

    .login-arrow--center svg {
      width: 28px;
      height: 46px;
    }

    .login-arrow--right {
      top: 31px;
      right: -2px;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }

    .login-arrow--right svg {
      width: 43px;
      height: 42px;
    }

    .login-trust-row {
      gap: 8px 12px;
    }
  }

  @media (max-width: 380px) {
    .login-card {
      padding-right: 17px;
      padding-left: 17px;
    }

    .login-arrow span {
      padding: 4px 6px;
      font-size: 7.5px;
    }

    .login-arrow--left {
      left: -5px;
    }

    .login-arrow--right {
      right: -5px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .login-top-note,
    .login-card,
    .login-spinner,
    .login-arrow,
    .login-arrow path,
    .login-action-area .google-login-button {
      animation: none;
    }

    .login-benefit {
      transition: none;
    }

    .login-benefit:hover {
      transform: none;
    }
  }
`;