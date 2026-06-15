"use client";

import { useState, useRef, useEffect } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import { supabase } from "@/lib/supabase";

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
  User,
} from "lucide-react";
import AlertModal from "@/components/AlertModal";

export default function CreateSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledCourse = searchParams.get("course");

  const { profile, loading } = useRequireOnboarding();

  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [identification, setIdentification] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [creating, setCreating] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);

  const [alertOpen, setAlertOpen] =
      useState(false);

  const [alertTitle, setAlertTitle] =
      useState("");

  const [alertMessage, setAlertMessage] =
      useState("");

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

  function normalizeCourseCode(input: string) {
    return input
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
  }

  const COURSE_CODE_REGEX =
      /^[A-Z]{2,6}-?\d{2,4}$/;

  useEffect(() => {
    const course = searchParams.get("course");
    if (course) setCourseCode(course.toUpperCase());
  }, [searchParams]);

  useEffect(() => {
    if (!titleTouched && courseCode.length >= 3) {
      setTitle(`${courseCode} Study Session`);
    }
  }, [courseCode, titleTouched]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (
        title ||
        courseCode ||
        location ||
        description ||
        identification
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener(
      "beforeunload",
      handler
    );

    return () =>
      window.removeEventListener(
        "beforeunload",
        handler
      );
  }, [
    title,
    courseCode,
    location,
    description,
    identification,
  ]);

  useEffect(() => {
    const start = new Date();
    const minutes = start.getMinutes();
    if (minutes < 30) {
      start.setMinutes(30);
    } else {
      start.setHours(start.getHours() + 1);
      start.setMinutes(0);
    }
    start.setSeconds(0);
    start.setMilliseconds(0);

    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    const formatForInput = (date: Date) =>
      new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

    setStartTime(formatForInput(start));
    setEndTime(formatForInput(end));
  }, []);


  const startDate = startTime ? new Date(startTime) : null;
  const endDate = endTime ? new Date(endTime) : null;

  const durationMinutes =
    startDate && endDate
      ? Math.round(
        (endDate.getTime() - startDate.getTime()) /
        1000 /
        60
      )
      : 0;

  const durationHours = durationMinutes / 60;

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  const durationText =
    durationMinutes > 0
      ? hours > 0
        ? `${hours}h ${minutes}m`
        : `${minutes}m`
      : "";

  const validationErrors: string[] = [];

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

  if (phoneRegex.test(combinedText)) {
    validationErrors.push(
      "Phone numbers are not allowed."
    );
  }
  const socialRegex =
    /(instagram|snapchat|discord|telegram|tiktok|@)/i;

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

  const normalizedCourseCode =
      normalizeCourseCode(courseCode);

  if (
      normalizedCourseCode &&
      !COURSE_CODE_REGEX.test(
          normalizedCourseCode
      )
  ) {
    validationErrors.push(
        "Enter a valid course code (e.g. CS400, MATH340, CHEM-103)."
    );
  }

  if (location.trim() && location.trim().length < 10) {
    validationErrors.push(
      "Location should be more specific."
    );
  }

  if (
    identification.trim() &&
    identification.trim().length < 5
  ) {
    validationErrors.push(
      "Describe how students can find you."
    );
  }

  if (description.trim().length < 10) {
    validationErrors.push(
      "Description should be at least 10 characters."
    );
  }

  if (
    startDate &&
    startDate < new Date()
  ) {
    validationErrors.push(
      "Start time cannot be in the past."
    );
  }

  if (
    startDate &&
    endDate &&
    endDate <= startDate
  ) {
    validationErrors.push(
      "End time must be after start time."
    );
  }

  if (
    startDate &&
    endDate &&
    durationHours > 6
  ) {
    validationErrors.push(
      "Sessions cannot exceed 6 hours."
    );
  }

  const canCreate =
    title.trim() &&
    courseCode.trim() &&
    location.trim() &&
    identification.trim() &&
    startTime &&
    endTime &&
    validationErrors.length === 0;



  async function createSession() {
    if (creating) return;
    const normalizedCourseCode =
        normalizeCourseCode(courseCode);

    if (
        !title ||
        !normalizedCourseCode ||
        !location ||
        !startTime ||
        !endTime
    ) {
      showAlert(
          "Missing Information",
          "Please fill out all required fields.",
          "warning"
      );
      return;
    }
    if (location.trim().length < 10) {
      showAlert(
          "Location Needed",
          "Please provide a more specific location.",
          "warning"
      );
      return;
    }
    if (identification.trim().length < 5) {
      showAlert(
          "Identification Needed",
          "Please describe how other students can find you.",
          "warning"
      );
      return;
    }

    const now = new Date();

    if (new Date(startTime) < now) {
      showAlert(
          "Invalid Start Time",
          "Start time cannot be in the past.",
          "warning"
      );
      return;
    }

    if (
        !COURSE_CODE_REGEX.test(
            normalizedCourseCode
        )
    ) {
      showAlert(
          "Invalid Course Code",
          "Enter a valid course code (e.g. CS400, MATH340, CHEM-103).",
          "warning"
      );
      return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      showAlert(
          "Invalid End Time",
          "End time must be after start time.",
          "warning"
      );
      return;
    }

    const durationHours =
      (new Date(endTime).getTime() -
        new Date(startTime).getTime()) /
      1000 /
      60 /
      60;

    if (durationHours > 6) {
      showAlert(
          "Session Too Long",
          "Sessions cannot be longer than 6 hours.",
          "warning"
      );
      return;
    }

    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        title,
        course_code: normalizedCourseCode,
        location_name: location,
        description,
        identification,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        creator_id: user.id,
      })
      .select()
      .single();

    setCreating(false);

    if (error) {
      showAlert(
          "Failed To Create Session",
          error.message,
          "error"
      );
      return;
    }

    await supabase.from("session_members").insert({
      session_id: data.id,
      user_id: user.id,
    });

    showAlert(
        "Session Created",
        "Your study session has been created successfully.",
        "success"
    );

    setTimeout(() => {
      router.push(`/sessions/${data.id}`);
    }, 1200);
  }

  function formatDateTime(dt: string) {
    if (!dt) return "";
    try {
      return new Date(dt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch { return dt; }
  }

  if (loading) {
    return (
      <>
        <style>{csStyles}</style>
        <main className="cs-root">
          <div className="cs-loading-screen">
            <div className="cs-loading-spinner" />
            <p className="cs-loading-text">Loading…</p>
          </div>
        </main>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <style>{csStyles}</style>
        <main className="cs-root">
          <div className="cs-loading-screen">
            <p className="cs-loading-text">No profile found.</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{csStyles}</style>
      <main className="cs-root">

        {/* ── Hero Bar ── */}
        <header className="cs-hero">
          <div className="cs-hero-inner">
            <div className="cs-hero-left">
              {profile.avatar_url && (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="cs-avatar"
                />
              )}
              <div>
                <p className="cs-eyebrow">New session</p>
                <h1 className="cs-hero-name">Create a session</h1>
                <p className="cs-hero-meta">
                  {profile.university && <span>{profile.university}</span>}
                  {profile.major && <><span className="cs-dot-sep">·</span><span>{profile.major}</span></>}
                  {profile.year && <><span className="cs-dot-sep">·</span><span>{profile.year}</span></>}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ── Page Body ── */}
        <div className="cs-body">

          <button type="button" onClick={() => router.back()} className="cs-back-btn">
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="cs-layout">

            {/* ── Main form card ── */}
            <section className="cs-card">

              {/* University (read-only) */}
              <div className="cs-field cs-field--first">
                <p className="cs-label">
                  <GraduationCap size={16} className="cs-label-icon" />
                  University
                </p>
                <p className="cs-university-value">{profile.university}</p>
                <p className="cs-visibility-note">
                  Only students at your university can see this session.
                </p>
              </div>

              <div className="cs-divider" />

              {/* Session Details */}
              <p className="cs-section-title">Session details</p>

              <div className="cs-field">
                <label className="cs-label" htmlFor="cs-title">
                  <BookOpen size={16} className="cs-label-icon" />
                  Title
                </label>
                <input
                  id="cs-title"
                  className="cs-input"
                  value={title}
                  onChange={(e) => {
                    setTitleTouched(true);
                    setTitle(e.target.value);
                  }}
                  placeholder="CS400 Midterm Review"
                  autoComplete="off"
                />
              </div>

              <div className="cs-field">
                <label className="cs-label" htmlFor="cs-course">
                  <BookOpen size={16} className="cs-label-icon" />
                  Course code
                </label>
                <input
                  id="cs-course"
                  className="cs-input"
                  value={courseCode}
                  onChange={(e) =>
                      setCourseCode(
                          e.target.value.toUpperCase()
                      )
                  }
                  placeholder="CS400"
                  disabled={!!prefilledCourse}
                  autoComplete="off"
                />
              </div>

              <div className="cs-divider" />

              {/* Meeting Information */}
              <p className="cs-section-title">Meeting information</p>

              <div className="cs-field">
                <label className="cs-label" htmlFor="cs-location">
                  <MapPin size={16} className="cs-label-icon" />
                  Location
                </label>

                <p className="cs-hint">
                  Be as specific as possible — floor, room, table number all help.
                </p>

                <input
                  id="cs-location"
                  className="cs-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Union South Study Room 3"
                  autoComplete="off"
                />

                {location.trim().length > 0 &&
                  location.trim().length < 10 && (
                    <p className="cs-warning">
                      Try being more specific. Include a room, floor,
                      table, or area.
                    </p>
                  )}
                {location.trim().length >= 10 && (
                  <p className="cs-success">
                    Great! That location is specific enough.
                  </p>
                )}
              </div>

              <div className="cs-field">
                <label className="cs-label" htmlFor="cs-identification">
                  <User size={16} className="cs-label-icon" />
                  How to find you
                </label>
                <p className="cs-hint">Describe what you're wearing or where you're sitting.</p>
                <input
                  id="cs-identification"
                  className="cs-input"
                  value={identification}
                  onChange={(e) => setIdentification(e.target.value)}
                  placeholder="Blue hoodie, sitting near the windows with a MacBook"
                  autoComplete="off"
                />

                {identification.trim().length > 0 &&
                  identification.trim().length < 10 && (
                    <p className="cs-warning">
                      Students may have trouble finding you.
                    </p>
                  )}


                {identification.trim().length >= 10 && (

                  <p className="cs-success">

                    Great! Other students should be able to find you.

                  </p>

                )}
              </div>

              <div className="cs-divider" />

              {/* Schedule */}
              <p className="cs-section-title">Schedule</p>

              <div className="cs-field">
                <label className="cs-label" htmlFor="cs-start">
                  <CalendarDays size={16} className="cs-label-icon" />
                  Start time
                </label>
                <input
                  id="cs-start"
                  type="datetime-local"
                  className="cs-input"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
              </div>

              <div className="cs-field">
                <label className="cs-label" htmlFor="cs-end">
                  <CalendarDays size={16} className="cs-label-icon" />
                  End time
                </label>
                <input
                  id="cs-end"
                  type="datetime-local"
                  className="cs-input"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </div>

              <div className="cs-divider" />

              {/* Description */}
              <p className="cs-section-title">Description</p>

              <div className="cs-field cs-field--last">
                <label className="cs-label" htmlFor="cs-description">
                  <FileText size={16} className="cs-label-icon" />
                  What will you be studying?
                </label>
                <textarea
                  id="cs-description"
                  className="cs-textarea"
                  value={description}
                  maxLength={500}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Reviewing dynamic programming problems, working through past exams…"
                />

                <p className="cs-character-count">
                  {description.length}/500 characters
                </p>
              </div>

              {combinedText.trim().length > 0 &&
  validationErrors.length > 0 && (
                <div className="cs-errors">
                  {validationErrors.map((error) => (
                    <div
                      key={error}
                      className="cs-error"
                    >
                      {error}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={createSession}
                disabled={creating || !canCreate}
                className="cs-btn-primary"
                type="button"
              >
                {creating ? "Creating session…" : "Create Session"}
              </button>

            </section>

            {/* ── Sidebar ── */}
            <aside className="cs-sidebar">

              {/* Preview Card */}
              <div className="cs-card cs-preview-card">
                <div className="cs-card-header">
                  <h2 className="cs-card-title">Preview</h2>
                </div>

                <div className="cs-preview-body">
                  <p className="cs-preview-title">{title || "Session title"}</p>

                  <div className="cs-preview-tags">
                    <span className="cs-tag">{courseCode || "Course code"}</span>
                  </div>

                  {startTime && endTime && (
                    <div className="cs-duration">
                      Duration: {durationText}
                    </div>
                  )}

                  <div className="cs-preview-meta-list">
                    <div className="cs-preview-meta-row">
                      <MapPin size={12} className="cs-preview-meta-icon" />
                      <span>
                        {location || "Location not added yet"}
                      </span>
                    </div>
                    <div className="cs-preview-meta-row">
                      <CalendarDays size={12} className="cs-preview-meta-icon" />
                      <span>{startTime ? formatDateTime(startTime) : "Start time"}</span>
                    </div>
                    <div className="cs-preview-meta-row">
                      <CalendarDays size={12} className="cs-preview-meta-icon" />
                      <span>{endTime ? formatDateTime(endTime) : "End time"}</span>
                    </div>
                    {identification && (
                      <div className="cs-preview-meta-row">
                        <User size={12} className="cs-preview-meta-icon" />
                        <span>{identification}</span>
                      </div>
                    )}
                  </div>

                  {description && (
                    <p className="cs-preview-description">{description}</p>
                  )}
                </div>
              </div>

              {/* Tips Card */}
              <div className="cs-card cs-tips-card">
                <div className="cs-card-header">
                  <h2 className="cs-card-title">Tips</h2>
                </div>
                <ul className="cs-tips-list">
                  <li className="cs-tip-row">Be specific about your location — floor, room, and table.</li>
                  <li className="cs-tip-row">Describe what you're wearing so classmates can find you.</li>
                  <li className="cs-tip-row">Mention the topics you'll be covering in the description.</li>
                  <li className="cs-tip-row">Only students at your university can see this session.</li>
                </ul>
              </div>

            </aside>
          </div>
        </div>
      </main>
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

/* ─────────────────────────────────────────────
   Scoped styles — cs- prefix
───────────────────────────────────────────── */
const csStyles = `

  /* ── Tokens / reset ── */
  .cs-root * { box-sizing: border-box; }
  .cs-root {
    --indigo:     #1B1B3A;
    --violet:     #7C3AED;
    --violet-lt:  #EDE9FE;
    --violet-mid: #A78BFA;
    --green:      #10B981;
    --bg:         #F5F4FB;
    --surface:    #FFFFFF;
    --border:     #E4E2F0;
    --text:       #1B1B3A;
    --muted:      #64748B;
    --faint:      #94A3B8;
    background: var(--bg);
    min-height: 100vh;
    color: var(--text);
  }

  /* ── Loading ── */
  .cs-loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
  }
  .cs-loading-spinner {
    width: 36px; height: 36px;
    border: 3px solid var(--border);
    border-top-color: var(--violet);
    border-radius: 50%;
    animation: cs-spin 0.7s linear infinite;
  }
  @keyframes cs-spin { to { transform: rotate(360deg); } }
  .cs-loading-text { font-size: 14px; color: var(--muted); margin: 0; }

  /* ── Hero bar ── */
  .cs-hero {
    background: var(--indigo);
    padding: 40px 24px 36px;
  }
  .cs-hero-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
    .cs-character-count {
  margin-top: 6px;
  text-align: right;
  font-size: 12px;
  color: var(--muted);
}
  .cs-errors {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cs-warning {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #D97706;
}

.cs-error {
  padding: 10px 12px;
  border-radius: 10px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: #DC2626;
  font-size: 13px;
  font-weight: 500;
}
  .cs-hero-left {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .cs-avatar {
    width: 72px; height: 72px;
    border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.15);
    object-fit: cover;
    flex-shrink: 0;
  }
  .cs-eyebrow {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--violet-mid);
    margin: 0 0 4px;
  }
    .cs-success {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #10B981;
}
  .cs-hero-name {
    font-size: 36px;
    font-weight: 700;
    color: #fff;
    margin: 0 0 6px;
    line-height: 1.1;
  }
  .cs-hero-meta {
    font-size: 14px;
    color: rgba(255,255,255,0.5);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .cs-dot-sep { color: rgba(255,255,255,0.25); }

  /* ── Page body ── */
  .cs-body {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }

  .cs-duration {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--violet-lt);
  color: var(--violet);
  font-size: 13px;
  font-weight: 600;
}

.cs-visibility-note {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
}

  /* ── Back button ── */
  .cs-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 500;
    color: var(--muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    margin-bottom: 24px;
    transition: color 0.15s;
  }
  .cs-back-btn:hover { color: var(--text); }

  /* ── Two-column layout ── */
  .cs-layout {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 20px;
    align-items: start;
  }
  .cs-sidebar {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ── Card base ── */
  .cs-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 4px 24px rgba(27,27,58,0.08);
  }
  .cs-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .cs-card-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
  }

  /* ── Form sections ── */
  .cs-section-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 20px;
  }
  .cs-divider {
    height: 1px;
    background: var(--border);
    margin: 24px 0;
  }
  .cs-field {
    margin-bottom: 20px;
  }
  .cs-field--first { margin-bottom: 0; }
  .cs-field--last  { margin-bottom: 0; }

  .cs-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 8px;
  }
  .cs-label-icon { color: var(--violet); flex-shrink: 0; }

  .cs-university-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--violet);
    margin: 0;
  }

  .cs-hint {
    font-size: 12px;
    color: var(--muted);
    margin: 0 0 8px;
  }

  .cs-input,
  .cs-textarea {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 14px;
    color: var(--text);
    outline: none;
    font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .cs-input::placeholder,
  .cs-textarea::placeholder { color: var(--faint); }
  .cs-input:focus,
  .cs-textarea:focus {
    border-color: var(--violet-mid);
    box-shadow: 0 0 0 3px rgba(124,58,237,0.08);
  }
  .cs-input:disabled {
    background: var(--border);
    color: var(--muted);
    cursor: not-allowed;
    opacity: 1;
  }
  .cs-textarea {
    resize: vertical;
  }

  /* ── Primary button ── */
  .cs-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    background: var(--violet);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    padding: 12px 22px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    margin-top: 24px;
    transition: background 0.15s, transform 0.1s;
  }
  .cs-btn-primary:hover:not(:disabled) {
    background: #6D28D9;
    transform: translateY(-1px);
  }
  .cs-btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* ── Preview card ── */
  .cs-preview-card { }
  .cs-preview-body { }
  .cs-preview-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 10px;
    word-break: break-word;
  }
  .cs-preview-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 14px;
  }
  .cs-tag {
    background: var(--violet-lt);
    color: var(--violet);
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 100px;
  }
  .cs-preview-meta-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .cs-preview-meta-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--muted);
  }
  .cs-preview-meta-icon { color: var(--faint); flex-shrink: 0; }
  .cs-preview-description {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
    font-size: 14px;
    color: var(--text);
    line-height: 1.5;
    white-space: pre-line;
  }

  /* ── Tips card ── */
  .cs-tips-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .cs-tip-row {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.5;
    padding-left: 18px;
    position: relative;
  }
  .cs-tip-row::before {
    content: '';
    position: absolute;
    left: 0;
    top: 7px;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--green);
  }

  /* ── Responsive ── */
  @media (max-width: 860px) {
    .cs-layout {
      grid-template-columns: 1fr;
    }
    .cs-sidebar { order: -1; }
    .cs-hero-name { font-size: 28px; }
  }
  @media (max-width: 520px) {
    .cs-hero { padding: 28px 16px; }
    .cs-body { padding: 20px 16px 48px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .cs-btn-primary:hover { transform: none; }
  }
`;