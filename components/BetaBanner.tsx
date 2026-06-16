"use client";

import { useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AlertModal from "@/components/AlertModal";
import {
  containsInappropriateContent,
} from "@/lib/contentModeration";

export default function BetaBanner() {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alertOpen, setAlertOpen] =
      useState(false);
  const [alertType, setAlertType] =
      useState<
          "success" |
          "error" |
          "warning" |
          "info"
      >("info");

  function showAlert(
      title: string,
      message: string,
      type:
          | "success"
          | "error"
          | "warning"
          | "info" = "info"
  ) {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertOpen(true);
  }

  const [alertTitle, setAlertTitle] =
      useState("");

  const [alertMessage, setAlertMessage] =
      useState("");

  const linkRegex =
      /(https?:\/\/|www\.)/i;

  const phoneRegex =
      /(\+?1)?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

  const socialRegex =
      /(instagram|snapchat|discord|telegram|tiktok|@)/i;

  async function submitFeedback() {
    if (!feedback.trim()) return;

    if (
        containsInappropriateContent(
            feedback
        )
    ) {
      showAlert(
          "Inappropriate Content",
          "Please remove inappropriate language before submitting feedback.",
          "warning"
      );
      return;
    }

    if (phoneRegex.test(feedback)) {
      showAlert(
          "Phone Numbers Not Allowed",
          "Please remove phone numbers from your feedback.",
          "warning"
      );
      return;
    }

    if (socialRegex.test(feedback)) {
      showAlert(
          "Social Handles Not Allowed",
          "Please remove social media usernames from your feedback.",
          "warning"
      );
      return;
    }

    if (linkRegex.test(feedback)) {
      showAlert(
          "Links Not Allowed",
          "Please remove links from your feedback.",
          "warning"
      );
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showAlert(
          "Sign In Required",
          "You must be signed in to submit feedback.",
          "warning"
      );
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      feedback: feedback.trim(),
    });

    setSubmitting(false);

    if (error) {
      showAlert(
          "Something Went Wrong",
          error.message,
          "error"
      );
      return;
    }

    setFeedback("");
    setOpen(false);
    showAlert(
        "Feedback Submitted",
        "Thanks for helping improve StudyGrouprr!",
        "success"
    );
  }

  return (
    <>
      {/* Beta Banner */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-center text-sm text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2">
          <span>
            StudyGrouprr is currently in beta. Your feedback helps us improve.
          </span>

          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/25"
          >
            <MessageSquare size={14} />
            Give Feedback
          </button>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Help improve StudyGrouprr
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Tell us what's confusing, broken, missing, or what features
                  you'd love to see.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={6}
              maxLength={1000}
              className="w-full resize-none rounded-2xl border border-slate-300 p-4 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              placeholder="Example: It would be helpful if sessions could be filtered by course code..."
            />

            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>
                Bugs, feature requests, and suggestions are all welcome.
              </span>

              <span>{feedback.length}/1000</span>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={submitFeedback}
                disabled={
                  submitting || feedback.trim().length < 5
                }
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={15} />
                {submitting ? "Submitting..." : "Submit Feedback"}
              </button>
            </div>
          </div>
        </div>
      )}
      <AlertModal
          open={alertOpen}
          title={alertTitle}
          message={alertMessage}
          type={alertType}
          onClose={() => setAlertOpen(false)}
      />
    </>
  );
}