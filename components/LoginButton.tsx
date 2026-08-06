"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { supabase } from "@/lib/supabase";

import styles from "./LoginButton.module.css";

export default function LoginButton() {
  const [signingIn, setSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
      null,
  );

  async function signIn() {
    if (signingIn) {
      return;
    }

    setSigningIn(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Unable to start Google sign-in:", error);
      setErrorMessage(
          "Google sign-in could not be started. Please try again.",
      );
      setSigningIn(false);
    }
  }

  return (
      <div className={styles.wrap}>
        <button
            type="button"
            className={styles.button}
            onClick={() => void signIn()}
            disabled={signingIn}
            aria-busy={signingIn}
        >
        <span className={styles.googleIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" role="presentation">
            <path
                fill="#4285F4"
                d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
            />
            <path
                fill="#34A853"
                d="M12 22c2.7 0 4.98-.9 6.64-2.43l-3.24-2.54c-.9.6-2.05.96-3.4.96-2.61 0-4.83-1.76-5.62-4.13H3.03v2.62A10 10 0 0 0 12 22Z"
            />
            <path
                fill="#FBBC05"
                d="M6.38 13.86A6 6 0 0 1 6.07 12c0-.65.11-1.28.31-1.86V7.52H3.03A10 10 0 0 0 2 12c0 1.61.39 3.13 1.03 4.48l3.35-2.62Z"
            />
            <path
                fill="#EA4335"
                d="M12 6.01c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.97 3.01 14.7 2 12 2a10 10 0 0 0-8.97 5.52l3.35 2.62C7.17 7.77 9.39 6.01 12 6.01Z"
            />
          </svg>
        </span>

          <span className={styles.label}>
          {signingIn
              ? "Connecting to Google…"
              : "Continue with Google"}
        </span>

          <ArrowRight size={17} className={styles.arrow} />
        </button>

        {errorMessage && (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
        )}
      </div>
  );
}
