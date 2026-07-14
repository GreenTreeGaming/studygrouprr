"use client";

import { useState } from "react";

import { ArrowRight } from "lucide-react";

import { supabase } from "@/lib/supabase";

export default function LoginButton() {
  const [signingIn, setSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
      null
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
          "Google sign-in could not be started. Please try again."
      );

      setSigningIn(false);
    }
  }

  return (
      <div className="google-login-wrap">
        <style>{buttonStyles}</style>

        <button
            type="button"
            className="google-login-button"
            onClick={() => void signIn()}
            disabled={signingIn}
        >
        <span className="google-login-icon" aria-hidden="true">
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

          <span>
          {signingIn
              ? "Connecting to Google…"
              : "Continue with Google"}
        </span>

          <ArrowRight
              size={17}
              className="google-login-arrow"
          />
        </button>

        {errorMessage && (
            <p className="google-login-error" role="alert">
              {errorMessage}
            </p>
        )}
      </div>
  );
}

const buttonStyles = `
  .google-login-wrap {
    width: 100%;
  }

  .google-login-button {
    display: grid;
    width: 100%;
    min-height: 54px;
    grid-template-columns: 28px 1fr 20px;
    align-items: center;
    gap: 10px;
    padding: 0 17px;
    border: 1px solid #7c3aed;
    border-radius: 14px;
    background: #7c3aed;
    color: white;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    box-shadow: 0 12px 28px rgba(124, 58, 237, 0.2);
    transition:
      background 150ms ease,
      transform 150ms ease,
      box-shadow 150ms ease;
  }

  .google-login-button:hover:not(:disabled) {
    transform: translateY(-1px);
    background: #6d28d9;
    box-shadow: 0 16px 34px rgba(124, 58, 237, 0.24);
  }

  .google-login-button:disabled {
    cursor: wait;
    opacity: 0.72;
  }

  .google-login-icon {
    display: grid;
    width: 28px;
    height: 28px;
    place-items: center;
    border-radius: 9px;
    background: white;
  }

  .google-login-icon svg {
    width: 17px;
    height: 17px;
  }

  .google-login-arrow {
    transition: transform 150ms ease;
  }

  .google-login-button:hover:not(:disabled)
    .google-login-arrow {
    transform: translateX(3px);
  }

  .google-login-button:focus-visible {
    outline: 3px solid rgba(124, 58, 237, 0.24);
    outline-offset: 3px;
  }

  .google-login-error {
    margin: 10px 0 0;
    color: #dc2626;
    font-size: 11px;
    line-height: 1.5;
    text-align: center;
  }

  @media (prefers-reduced-motion: reduce) {
    .google-login-button,
    .google-login-arrow {
      transition: none;
    }

    .google-login-button:hover:not(:disabled) {
      transform: none;
    }
  }
`;