"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function InvalidEmailPage() {
    const router = useRouter();

    useEffect(() => {
        async function cleanup() {
            await supabase.auth.signOut();
        }

        cleanup();

        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    return (
        <>
            <style jsx>{`
                .ie-root {
                    min-height: 100vh;

                    background: #f5f4fb;

                    background-image:
                            radial-gradient(
                                    circle at 15% 20%,
                                    rgba(124, 58, 237, 0.08),
                                    transparent 35%
                            ),
                            radial-gradient(
                                    circle at 85% 80%,
                                    rgba(56, 189, 248, 0.06),
                                    transparent 40%
                            );

                    display: flex;
                    align-items: flex-start;
                    justify-content: center;

                    padding-top: 80px;
                    padding-inline: 20px;

                    overflow: hidden;
                }

                .ie-card {
                    width: 100%;
                    max-width: 500px;

                    background: rgba(255,255,255,0.9);
                    backdrop-filter: blur(12px);

                    border: 1px solid #e4e2f0;
                    border-radius: 28px;

                    padding: 36px;

                    text-align: center;

                    box-shadow:
                            0 20px 60px rgba(27,27,58,0.08),
                            0 8px 30px rgba(27,27,58,0.06);

                    animation: pop 0.25s ease;
                }

        @keyframes pop {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .ie-icon {
          width: 72px;
          height: 72px;

          margin: 0 auto 20px;

          border-radius: 50%;

          display: flex;
          align-items: center;
          justify-content: center;

          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #d97706;
        }

        .ie-title {
          font-size: 28px;
          font-weight: 700;
          color: #1b1b3a;
          margin: 0 0 12px;
        }

        .ie-message {
          color: #64748b;
          line-height: 1.7;
          font-size: 15px;
          margin: 0;
        }

        .ie-highlight {
          color: #7c3aed;
          font-weight: 600;
        }

        .ie-actions {
          margin-top: 28px;
        }

        .ie-button {
          width: 100%;

          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;

          border: none;
          border-radius: 14px;

          background: #7c3aed;
          color: white;

          padding: 14px;

          font-size: 15px;
          font-weight: 600;

          cursor: pointer;

          transition: 0.15s;
        }

        .ie-button:hover {
          background: #6d28d9;
        }

        .ie-note {
          margin-top: 16px;
          font-size: 13px;
          color: #94a3b8;
        }
      `}</style>

            <main className="ie-root">
                <div className="ie-card">
                    <div className="ie-icon">
                        <AlertTriangle size={32} />
                    </div>

                    <h1 className="ie-title">
                        University Email Required
                    </h1>

                    <p className="ie-message">
                        StudyGrouprr is currently only available to
                        students with a{" "}
                        <span className="ie-highlight">
              university (.edu) email address
            </span>
                        .
                        <br />
                        <br />
                        Please sign in using your school account to
                        access study sessions, live study groups, and
                        course communities.
                    </p>

                    <div className="ie-actions">
                        <button
                            onClick={() => router.push("/")}
                            className="ie-button"
                        >
                            <ArrowLeft size={18} />
                            Return Home
                        </button>
                    </div>

                    <p className="ie-note">
                        Your account has been signed out.
                    </p>
                </div>
            </main>
        </>
    );
}