"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { gsap } from "gsap";

import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import { supabase } from "@/lib/supabase";

import { User } from "lucide-react";

import {
  containsInappropriateContent,
} from "@/lib/contentModeration";

import {
  BookOpen,
  MapPin,
  CalendarDays,
  FileText,
  GraduationCap,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import AlertModal from "@/components/AlertModal";

export default function EditSessionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { profile, loading } = useRequireOnboarding();
  const cardRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [identification, setIdentification] = useState("");

  const [deleteOpen, setDeleteOpen] =
      useState(false);

  const [alertOpen, setAlertOpen] = useState(false);

  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    type: "info" as
        | "success"
        | "error"
        | "warning"
        | "info",
  });

  function showAlert(
      title: string,
      message: string,
      type:
          | "success"
          | "error"
          | "warning"
          | "info" = "info"
  ) {
    setAlertConfig({
      title,
      message,
      type,
    });

    setAlertOpen(true);
  }

  function normalizeCourseCode(input: string) {
    return input
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
  }

  const COURSE_CODE_REGEX =
      /^[A-Z]{2,5}\d{3,4}$/;

  useEffect(() => {
    loadSession();
  }, [id]);

  useEffect(() => {
    if (pageLoading) return;
    const ctx = gsap.context(() => {
      gsap.from(".es-card", {
        opacity: 0,
        y: 16,
        duration: 0.6,
        stagger: 0.1,
        ease: "power3.out",
      });
      gsap.from(".es-item", {
        opacity: 0,
        y: 12,
        duration: 0.5,
        stagger: 0.05,
        delay: 0.1,
        ease: "power3.out",
      });
    });
    return () => ctx.revert();
  }, [pageLoading]);

  async function loadSession() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/");
      return;
    }

    const { data, error } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      router.push("/sessions");
      return;
    }

    if (data.creator_id !== user.id) {
      router.push(`/sessions/${id}`);
      return;
    }

    if (new Date(data.end_time) < new Date()) {
      router.push(`/sessions/${id}`);
      return;
    }

    const formatForInput = (dateString: string) => {
      const date = new Date(dateString);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    };

    setTitle(data.title);
    setCourseCode(
        normalizeCourseCode(
            data.course_code
        )
    );
    setLocation(data.location_name);
    setDescription(data.description || "");
    setIdentification(data.identification || "");
    setStartTime(formatForInput(data.start_time));
    setEndTime(formatForInput(data.end_time));

    setPageLoading(false);
  }

  const validationErrors: string[] = [];

  const normalizedCourseCode =
      normalizeCourseCode(courseCode);

  if (
      normalizedCourseCode &&
      !COURSE_CODE_REGEX.test(
          normalizedCourseCode
      )
  ) {
    validationErrors.push(
        "Enter a valid course code (e.g. CS400, MATH340, BIO101)."
    );
  }

  const combinedText = [
    title,
    location,
    identification,
    description,
  ].join(" ");

  const linkRegex =
    /(https?:\/\/|www\.)/i;

  const phoneRegex =
    /(\+?1)?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

  const socialRegex =
    /(instagram|snapchat|discord|telegram|tiktok|@)/i;

  if (phoneRegex.test(combinedText)) {
    validationErrors.push(
      "Phone numbers are not allowed."
    );
  }

  if (socialRegex.test(combinedText)) {
    validationErrors.push(
      "Social media handles are not allowed."
    );
  }

  if (linkRegex.test(combinedText)) {
    validationErrors.push(
      "Links are not allowed."
    );
  }

  if (
    containsInappropriateContent(combinedText)
  ) {
    validationErrors.push(
      "Please remove inappropriate language."
    );
  }

  if (
    location.trim() &&
    location.trim().length < 10
  ) {
    validationErrors.push(
      "Location should be more specific."
    );
  }

  if (
    identification.trim() &&
    identification.trim().length < 10
  ) {
    validationErrors.push(
      "Describe how students can find you."
    );
  }

  if (
    description.trim().length < 10
  ) {
    validationErrors.push(
      "Description should be at least 10 characters."
    );
  }

  if (
    startTime &&
    new Date(startTime) < new Date()
  ) {
    validationErrors.push(
      "Start time cannot be in the past."
    );
  }

  if (
    startTime &&
    endTime &&
    new Date(endTime) <= new Date(startTime)
  ) {
    validationErrors.push(
      "End time must be after start time."
    );
  }

  const durationHours =
    startTime && endTime
      ? (
        new Date(endTime).getTime() -
        new Date(startTime).getTime()
      ) /
      1000 /
      60 /
      60
      : 0;

  if (durationHours > 6) {
    validationErrors.push(
      "Sessions cannot exceed 6 hours."
    );
  }

  const canSave =
    title.trim() &&
    courseCode.trim() &&
    location.trim() &&
    identification.trim() &&
    description.trim() &&
    startTime &&
    endTime &&
    validationErrors.length === 0;

  async function saveSession() {
    if (validationErrors.length > 0) {
      return;
    }

    if (
      !title ||
      !courseCode ||
      !location ||
      !identification ||
      !startTime ||
      !endTime
    ) {
      showAlert(
          "Missing Information",
          "Please fill out all required fields.",
          "error"
      );
      return;
    }

    const normalizedCourseCode =
        normalizeCourseCode(courseCode);

    if (
        !COURSE_CODE_REGEX.test(
            normalizedCourseCode
        )
    ) {
      showAlert(
          "Invalid Course Code",
          "Enter a valid course code (e.g. CS400, MATH340, BIO101).",
          "error"
      );
      return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      showAlert(
          "Invalid Time Range",
          "End time must be after start time.",
          "error"
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("study_sessions")
      .update({
        title,
        course_code: normalizedCourseCode,
        location_name: location,
        description,
        identification,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      showAlert(
          "Unable to Save Session",
          error.message,
          "error"
      );
      return;
    }

    router.push(`/sessions/${id}`);
  }

  async function deleteSession() {
    const { error } = await supabase
        .from("study_sessions")
        .delete()
        .eq("id", id);

    if (error) {
      showAlert(
          "Unable to Delete Session",
          error.message,
          "error"
      );
      return;
    }

    router.push("/dashboard");
  }

  if (loading || pageLoading) {
    return (
      <>
        <style>{esStyles}</style>
        <main className="es-loading-screen">
          <div className="es-loading-spinner" />
          <p className="es-loading-text">Loading session…</p>
        </main>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <style>{esStyles}</style>
        <main className="es-loading-screen">
          <p className="es-loading-text">No profile found.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{esStyles}</style>
      <main className="es-root">
        {/* Hero */}
        <header className="es-hero-bar">
          <div className="es-hero-inner">
            <p className="es-hero-eyebrow">Edit session</p>
            <h1 className="es-hero-title">{title || "Edit study session"}</h1>
            <p className="es-hero-subtitle">Update your session details below.</p>
          </div>
        </header>

        <div className="es-page-body">
          <button onClick={() => router.push(`/sessions/${id}`)} className="es-back-btn">
            <ArrowLeft size={16} />
            Back to session
          </button>

          <div className="es-two-col">
            {/* Form */}
            <section ref={cardRef} className="es-card es-card--form">
              <div className="es-uni-banner es-item">
                <GraduationCap size={16} className="es-uni-icon" />
                <div>
                  <p className="es-uni-label">University</p>
                  <p className="es-uni-value">{profile.university}</p>
                </div>
              </div>

              <div className="es-field es-item">
                <label className="es-label">
                  <BookOpen size={14} className="es-label-icon" />
                  Session title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="es-input"
                />
              </div>

              <div className="es-field es-item">
                <label className="es-label">
                  <BookOpen size={14} className="es-label-icon" />
                  Course code
                </label>
                <input
                    value={courseCode}
                    onChange={(e) =>
                        setCourseCode(
                            e.target.value.toUpperCase()
                        )
                    }
                    className="es-input"
                />

                {courseCode.trim() &&
                    !COURSE_CODE_REGEX.test(
                        normalizeCourseCode(courseCode)
                    ) && (
                        <p className="es-warning">
                          Enter a valid course code like CS400,
                          MATH340, or BIO101.
                        </p>
                    )}
              </div>

              <div className="es-field es-item">
                <label className="es-label">
                  <MapPin size={14} className="es-label-icon" />
                  Location
                </label>

                <p className="es-hint">
                  Be as specific as possible — floor, room, table number all help.
                </p>

                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="es-input"
                />

                {location.trim().length > 0 &&
                  location.trim().length < 10 && (
                    <p className="es-warning">
                      Try being more specific. Include a room,
                      floor, table, or area.
                    </p>
                  )}

                {location.trim().length >= 10 && (
                  <p className="es-success">
                    Great! That location is specific enough.
                  </p>
                )}
              </div>

              <div className="es-field es-item">
                <label className="es-label">
                  <User size={14} className="es-label-icon" />
                  How to find you
                </label>

                <p className="es-hint">
                  Describe what you're wearing or where you're sitting.
                </p>

                <input
                  value={identification}
                  onChange={(e) =>
                    setIdentification(e.target.value)
                  }
                  className="es-input"
                  placeholder="Blue hoodie, sitting near windows"
                />

                {identification.trim().length > 0 &&
                  identification.trim().length < 10 && (
                    <p className="es-warning">
                      Students may have trouble finding you.
                    </p>
                  )}

                {identification.trim().length >= 10 && (
                  <p className="es-success">
                    Great! Other students should be able to find you.
                  </p>
                )}
              </div>

              <div className="es-field-row es-item">
                <div className="es-field">
                  <label className="es-label">
                    <CalendarDays size={14} className="es-label-icon" />
                    Start time
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="es-input"
                  />
                </div>

                <div className="es-field">
                  <label className="es-label">
                    <CalendarDays size={14} className="es-label-icon" />
                    End time
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="es-input"
                  />
                </div>
              </div>

              <div className="es-field es-item">
                <label className="es-label">
                  <FileText size={14} className="es-label-icon" />
                  Description
                </label>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="es-textarea"
                />
                <p className="es-character-count">
                  {description.length}/500 characters
                </p>
              </div>

              {combinedText.trim().length > 0 &&
                validationErrors.length > 0 && (
                  <div className="es-errors">
                    {validationErrors.map((error) => (
                      <div
                        key={error}
                        className="es-error"
                      >
                        {error}
                      </div>
                    ))}
                  </div>
                )}

              <button onClick={saveSession} disabled={saving || !canSave} className="es-submit es-item">
                {saving ? "Saving changes…" : "Save changes"}
              </button>

              <button
                  onClick={() => setDeleteOpen(true)}
                  className="es-delete es-item"
              >
                <Trash2 size={16} />
                Delete session
              </button>
            </section>

            {/* Preview */}
            <section className="es-card es-card--preview">
              <div className="es-card-header">
                <h2 className="es-card-title">Preview</h2>
              </div>

              <div className="es-preview-session">
                <div className="es-preview-top">
                  {courseCode && <span className="es-tag">{courseCode}</span>}
                </div>
                <h3 className="es-preview-title">{title || "Session title"}</h3>

                <div className="es-preview-meta">
                  <span className="es-preview-meta-item">
                    <MapPin size={14} />
                    {location || "Location"}
                  </span>
                  {identification && (
                    <span className="es-preview-meta-item">
                      <User size={14} />
                      {identification}
                    </span>
                  )}
                  <span className="es-preview-meta-item">
                    <CalendarDays size={14} />
                    {startTime
                      ? new Date(startTime).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                      : "Start time"}
                  </span>
                  <span className="es-preview-meta-item">
                    Ends{" "}
                    {endTime
                      ? new Date(endTime).toLocaleString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                      : "—"}
                  </span>
                </div>

                {description && (
                  <div className="es-preview-description">
                    <p>{description}</p>
                  </div>
                )}

                <div className="es-preview-creator">
                  <p className="es-preview-creator-name">Created by {profile.name}</p>
                  <p className="es-preview-creator-uni">{profile.university}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      {deleteOpen && (
          <div className="es-modal-backdrop">
            <div className="es-modal">
              <h3>Delete Session?</h3>

              <p>
                This will permanently delete this study
                session and remove all attendees.
              </p>

              <div className="es-modal-actions">
                <button
                    onClick={() => setDeleteOpen(false)}
                    className="es-modal-cancel"
                >
                  Cancel
                </button>

                <button
                    onClick={async () => {
                      setDeleteOpen(false);
                      await deleteSession();
                    }}
                    className="es-modal-delete"
                >
                  Delete Session
                </button>
              </div>
            </div>
          </div>
      )}
      <AlertModal
          open={alertOpen}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onClose={() => setAlertOpen(false)}
      />
    </>
  );
}

const esStyles = `
  .es-root * { box-sizing: border-box; }
  .es-root {
    --indigo:      #1B1B3A;
    --violet:      #7C3AED;
    --violet-lt:   #EDE9FE;
    --violet-mid:  #A78BFA;
    --green:       #10B981;
    --green-lt:    #ECFDF5;
    --red:         #EF4444;
    --red-lt:      #FEF2F2;
    --bg:          #F5F4FB;
    --surface:     #FFFFFF;
    --border:      #E4E2F0;
    --text:        #1B1B3A;
    --muted:       #64748B;
    --faint:       #94A3B8;
    background: var(--bg);
    min-height: 100vh;
    color: var(--text);
  }
  
  .es-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.es-modal {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}

.es-modal h3 {
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 700;
}

.es-modal p {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
}

.es-modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.es-modal-cancel {
  flex: 1;
  border: 1px solid var(--border);
  background: white;
  border-radius: 12px;
  padding: 12px;
  font-weight: 600;
  cursor: pointer;
}

.es-modal-delete {
  flex: 1;
  border: none;
  background: #EF4444;
  color: white;
  border-radius: 12px;
  padding: 12px;
  font-weight: 600;
  cursor: pointer;
}

  /* Loading */
  .es-loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
    background: var(--bg);
  }
  .es-loading-spinner {
    width: 36px; height: 36px;
    border: 3px solid var(--border);
    border-top-color: var(--violet);
    border-radius: 50%;
    animation: es-spin 0.7s linear infinite;
  }
  .es-loading-text { font-size: 14px; color: var(--muted); }
  @keyframes es-spin { to { transform: rotate(360deg); } }

  /* Hero */
  .es-hero-bar {
    background: var(--indigo);
    padding: 40px 24px 36px;
  }
  .es-hero-inner {
    max-width: 1100px;
    margin: 0 auto;
  }
  .es-hero-eyebrow {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--violet-mid);
    margin: 0 0 4px;
  }

  .es-errors {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.es-error {
  padding: 10px 12px;
  border-radius: 10px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: #DC2626;
  font-size: 13px;
  font-weight: 500;
}

.es-warning {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #D97706;
}

.es-success {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #10B981;
}

.es-character-count {
  margin-top: 6px;
  text-align: right;
  font-size: 12px;
  color: var(--muted);
}
  .es-hint {
  font-size: 12px;
  color: var(--muted);
  margin: 0 0 8px;
}
  .es-hero-title {
    font-size: 36px;
    font-weight: 700;
    color: #fff;
    margin: 0 0 6px;
    line-height: 1.1;
  }
  .es-hero-subtitle {
    font-size: 14px;
    color: rgba(255,255,255,0.5);
    margin: 0;
  }

  /* Page body */
  .es-page-body {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }
  .es-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    margin-bottom: 20px;
    transition: color 0.15s;
  }
  .es-back-btn:hover { color: var(--violet); }

  .es-two-col {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 20px;
    align-items: start;
  }

  /* Cards */
  .es-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 4px 24px rgba(27,27,58,0.08);
  }
  .es-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .es-card-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
  }

  /* University banner */
  .es-uni-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--violet-lt);
    border: 1px solid #C4B5FD;
    border-radius: 14px;
    padding: 12px 14px;
    margin-bottom: 20px;
  }
  .es-uni-icon { color: var(--violet); flex-shrink: 0; }
  .es-uni-label {
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--violet);
    margin: 0;
  }
  .es-uni-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    margin: 2px 0 0;
  }

  /* Fields */
  .es-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }
  .es-field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
  .es-field-row .es-field { margin-bottom: 0; }

  .es-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .es-label-icon { color: var(--violet-mid); }

  .es-input, .es-textarea {
    width: 100%;
    font-size: 14px;
    color: var(--text);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    font-family: inherit;
  }
  .es-input:focus, .es-textarea:focus {
    border-color: var(--violet-mid);
    box-shadow: 0 0 0 3px var(--violet-lt);
  }
  .es-textarea { resize: vertical; min-height: 100px; }

  /* Buttons */
  .es-submit {
    width: 100%;
    background: var(--violet);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    padding: 12px 22px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s, opacity 0.15s;
    margin-top: 4px;
  }
  .es-submit:hover:not(:disabled) { background: #6D28D9; transform: translateY(-1px); }
  .es-submit:disabled { opacity: 0.6; cursor: not-allowed; }

  .es-delete {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--red-lt);
    color: var(--red);
    border: 1px solid #FECACA;
    font-size: 14px;
    font-weight: 600;
    padding: 12px 22px;
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    margin-top: 10px;
  }
  .es-delete:hover { background: #FEE2E2; transform: translateY(-1px); }

  /* Preview */
  .es-preview-session {
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 18px;
  }
  .es-preview-top {
    margin-bottom: 8px;
  }
  .es-tag {
    background: var(--violet-lt);
    color: var(--violet);
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 100px;
  }
  .es-preview-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 10px;
  }
  .es-preview-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 13px;
    color: var(--muted);
    margin-bottom: 12px;
  }
  .es-preview-meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .es-preview-description {
    border-top: 1px solid var(--border);
    padding-top: 12px;
    margin-bottom: 12px;
  }
  .es-preview-description p {
    font-size: 14px;
    color: var(--text);
    line-height: 1.6;
    margin: 0;
    white-space: pre-wrap;
  }
  .es-preview-creator {
    background: var(--violet-lt);
    border-radius: 12px;
    padding: 12px 14px;
  }
  .es-preview-creator-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--violet);
    margin: 0;
  }
  .es-preview-creator-uni {
    font-size: 12px;
    color: var(--violet);
    opacity: 0.8;
    margin: 2px 0 0;
  }

  /* Responsive */
  @media (max-width: 860px) {
    .es-two-col { grid-template-columns: 1fr; }
    .es-card--preview { order: -1; }
    .es-hero-title { font-size: 28px; }
  }
  @media (max-width: 640px) {
    .es-field-row { grid-template-columns: 1fr; gap: 0; }
  }
  @media (max-width: 520px) {
    .es-hero-bar { padding: 28px 16px; }
    .es-page-body { padding: 20px 16px 48px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .es-submit:hover:not(:disabled), .es-delete:hover { transform: none; }
  }
`;