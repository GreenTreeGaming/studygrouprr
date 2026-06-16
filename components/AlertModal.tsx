"use client";

import { useEffect } from "react";
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Info,
} from "lucide-react";

type AlertType =
    | "success"
    | "error"
    | "warning"
    | "info";

type AlertModalProps = {
    open: boolean;
    title: string;
    message: string;
    type?: AlertType;
    buttonText?: string;
    onClose: () => void;
};

export default function AlertModal({
                                       open,
                                       title,
                                       message,
                                       type = "info",
                                       buttonText = "Okay",
                                       onClose,
                                   }: AlertModalProps) {
    useEffect(() => {
        function handleKeyDown(
            e: KeyboardEvent
        ) {
            if (e.key === "Escape") {
                onClose();
            }
        }

        if (open) {
            window.addEventListener(
                "keydown",
                handleKeyDown
            );
        }

        return () =>
            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
    }, [open, onClose]);

    if (!open) return null;

    const styles = {
        success: {
            icon: (
                <CheckCircle2 size={28} />
            ),
            bg: "#ECFDF5",
            border: "#A7F3D0",
            color: "#059669",
            button: "#10B981",
            buttonHover: "#059669",
        },
        error: {
            icon: <XCircle size={28} />,
            bg: "#FEF2F2",
            border: "#FECACA",
            color: "#DC2626",
            button: "#EF4444",
            buttonHover: "#DC2626",
        },
        warning: {
            icon: (
                <AlertTriangle size={28} />
            ),
            bg: "#FFFBEB",
            border: "#FDE68A",
            color: "#D97706",
            button: "#F59E0B",
            buttonHover: "#D97706",
        },
        info: {
            icon: <Info size={28} />,
            bg: "#EEF2FF",
            border: "#C7D2FE",
            color: "#4F46E5",
            button: "#7C3AED",
            buttonHover: "#6D28D9",
        },
    };

    const current = styles[type];

    return (
        <div
            className="sg-overlay"
            onClick={onClose}
        >
            <div
                className="sg-modal"
                onClick={(e) =>
                    e.stopPropagation()
                }
            >
                <div
                    className="sg-icon-wrapper"
                    style={{
                        background: current.bg,
                        borderColor: current.border,
                        color: current.color,
                    }}
                >
                    {current.icon}
                </div>

                <h2 className="sg-title">
                    {title}
                </h2>

                <p className="sg-message">
                    {message}
                </p>

                <button
                    className="sg-button"
                    style={{
                        background: current.button,
                    }}
                    onClick={onClose}
                >
                    {buttonText}
                </button>
            </div>

            <style jsx>{`
                .sg-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(
                            0,
                            0,
                            0,
                            0.45
                    );
                    backdrop-filter: blur(6px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 20px;
                }

                .sg-modal {
                    width: 100%;
                    max-width: 430px;
                    background: white;
                    border-radius: 24px;
                    padding: 28px;
                    text-align: center;
                    box-shadow: 0 20px 50px
                    rgba(0, 0, 0, 0.18);
                    animation: sg-pop 0.2s ease;
                }

                @keyframes sg-pop {
                    from {
                        opacity: 0;
                        transform: scale(0.96);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                .sg-icon-wrapper {
                    width: 64px;
                    height: 64px;
                    margin: 0 auto 18px;
                    border-radius: 50%;
                    border: 1px solid;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .sg-title {
                    margin: 0 0 10px;
                    font-size: 24px;
                    font-weight: 700;
                    color: #1b1b3a;
                }

                .sg-message {
                    margin: 0;
                    line-height: 1.6;
                    color: #64748b;
                    font-size: 14px;
                }

                .sg-button {
                    width: 100%;
                    margin-top: 24px;
                    border: none;
                    border-radius: 14px;
                    color: white;
                    font-weight: 600;
                    font-size: 14px;
                    padding: 13px;
                    cursor: pointer;
                    transition: 0.15s;
                }

                .sg-button:hover {
                    filter: brightness(0.95);
                }
            `}</style>
        </div>
    );
}