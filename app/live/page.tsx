"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import { BookOpen, MapPin, Radio, FileText, User, ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  containsInappropriateContent,
} from "@/lib/contentModeration";

import {
  normalizeCourseCode,
  isValidCourseCode,
} from "@/lib/courseValidation";
import AlertModal from "@/components/AlertModal";

type LiveStatus = {
  id: string;
  user_id: string;
  course_code: string;
  location_name: string;
  description: string | null;
  identification: string | null;
  created_at: string;
};

export default function LivePage() {
  const router = useRouter();
  const { profile, loading } = useRequireOnboarding();

  const [courseCode, setCourseCode] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [identification, setIdentification] = useState("");
  const [saving, setSaving] = useState(false);
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);
  const combinedText = [
    courseCode,
    location,
    description,
    identification,
  ].join(" ");

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

  const validationErrors: string[] = [];

  const linkRegex = /(https?:\/\/|www\.)/i;

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
    description.trim() &&
    description.trim().length < 10
  ) {
    validationErrors.push(
      "Description should be more detailed."
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

  const normalizedCourseCode =
      normalizeCourseCode(courseCode);

  if (
      normalizedCourseCode &&
      !isValidCourseCode(normalizedCourseCode)
  ) {
    validationErrors.push(
        "Enter a valid course code (e.g. CS400, MATH340, BIO101)."
    );
  }

  const canGoLive =
    courseCode.trim() &&
    location.trim() &&
    description.trim() &&
    identification.trim() &&
    validationErrors.length === 0;

  useEffect(() => {
    loadLiveStatus();
  }, []);

  async function loadLiveStatus() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/");
      return;
    }

    const { data } = await supabase
      .from("live_study_status")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setLiveStatus({
        ...data,
        course_code: normalizeCourseCode(
            data.course_code
        ),
      });
    }
  }

  async function goLive() {
    if (validationErrors.length > 0) {
      return;
    }
    if (!courseCode || !location || !description || !identification) {
      showAlert(
          "Missing Information",
          "Please fill out all fields before going live.",
          "warning"
      );
      return;
    }

    const normalizedCourseCode =
        normalizeCourseCode(courseCode);

    if (!isValidCourseCode(normalizedCourseCode)) {
      showAlert(
          "Invalid Course Code",
          "Enter a valid course code (e.g. CS400, MATH340, BIO101).",
          "warning"
      );
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("live_study_status").delete().eq("user_id", user.id);

    const { error } = await supabase.from("live_study_status").insert({
      user_id: user.id,
      course_code: normalizedCourseCode,
      location_name: location,
      description: description.trim(),
      identification: identification.trim(),
    });

    setSaving(false);

    if (error) {
      showAlert(
          "Unable to Go Live",
          error.message,
          "error"
      );
      return;
    }

    await loadLiveStatus();

    window.dispatchEvent(
      new Event("live-status-changed")
    );
  }

  async function endStudying() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from("live_study_status")
      .delete()
      .eq("user_id", user.id);

    setLiveStatus(null);

    window.dispatchEvent(
      new Event("live-status-changed")
    );
  }

  if (loading) {
    return (
      <>
        <style>{livePageStyles}</style>
        <main className="lv-loading-screen">
          <div className="lv-loading-spinner" />
          <p className="lv-loading-text">Loading…</p>
        </main>
      </>
    );
  }

  const firstName = profile?.name?.split(" ")[0] ?? "there";

  function getLiveDuration(createdAt: string) {
    const start = new Date(createdAt).getTime();
    const now = Date.now();

    const mins = Math.floor((now - start) / 60000);

    if (mins < 60) {
      return `${mins} min`;
    }

    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;

    return `${hours}h ${remaining}m`;
  }

  function getTimeRemaining(createdAt: string) {
    const start = new Date(createdAt).getTime();

    const expiresAt = start + 2 * 60 * 60 * 1000; // 2 hours
    const remainingMs = expiresAt - Date.now();

    if (remainingMs <= 0) {
      return "Expired";
    }

    const mins = Math.floor(remainingMs / 60000);

    if (mins < 60) {
      return `${mins} min`;
    }

    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;

    return `${hours}h ${remaining}m`;
  }

  return (
    <>
      <style>{livePageStyles}</style>
      <main className={`lv-root${liveStatus ? " lv-root--live" : ""}`}>

        {/* ── Hero Bar ── */}
        <header className={`lv-hero-bar${liveStatus ? " lv-hero-bar--live" : ""}`}>
          <div className="lv-hero-inner">
            <div className="lv-hero-left">
              {profile?.avatar_url && (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="lv-avatar"
                />
              )}
              <div>
                <p className="lv-hero-eyebrow">{liveStatus ? "You're live" : "Go Live"}</p>
                <h1 className="lv-hero-name">Live Study Status</h1>
                <p className="lv-hero-meta">
                  {liveStatus ? `Studying ${liveStatus.course_code} · ${liveStatus.location_name}` : "Let classmates find you right now"}
                </p>
              </div>
            </div>

            {liveStatus && (
              <div className="lv-live-badge lv-live-badge--green">
                You're live now
              </div>
            )}
          </div>
        </header>

        {/* ── Page Body ── */}
        <div className="lv-page-body">

          {/* Back link */}
          <button className="lv-back-btn" onClick={() => router.back()}>
            <ArrowLeft size={16} />
            Back
          </button>

          {liveStatus ? (
            /* ── Active Live State ── */
            <div className="lv-two-col">
              <section className="lv-card lv-card--live">
                <div className="lv-card-header">
                  <h2 className="lv-card-title">You're studying now</h2>
                  <span className="lv-status-pill lv-status-pill--green">
                    Live
                  </span>
                </div>

                <div className="lv-live-detail-list">
                  <div className="lv-live-detail-row">
                    <BookOpen size={16} className="lv-detail-icon" />
                    <div>
                      <p className="lv-detail-label">Course</p>
                      <p className="lv-detail-value">{liveStatus.course_code}</p>
                    </div>
                  </div>

                  <div className="lv-live-detail-row">
                    <MapPin size={16} className="lv-detail-icon" />
                    <div>
                      <p className="lv-detail-label">Location</p>
                      <p className="lv-detail-value">{liveStatus.location_name}</p>
                    </div>
                  </div>

                  {liveStatus.description && (
                    <div className="lv-live-detail-row">
                      <FileText size={16} className="lv-detail-icon" />
                      <div>
                        <p className="lv-detail-label">Studying</p>
                        <p className="lv-detail-value">{liveStatus.description}</p>
                      </div>
                    </div>
                  )}

                  {liveStatus.identification && (
                    <div className="lv-live-detail-row">
                      <User size={16} className="lv-detail-icon" />
                      <div>
                        <p className="lv-detail-label">How to find you</p>
                        <p className="lv-detail-value">{liveStatus.identification}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="lv-live-footer">
                  <div className="lv-live-meta">
                    <p className="lv-live-since">
                      Live for {getLiveDuration(liveStatus.created_at)}
                    </p>

                    <p className="lv-live-expiry">
                      Expires in {getTimeRemaining(liveStatus.created_at)}
                    </p>
                  </div>
                  <button className="lv-btn-end" onClick={endStudying}>
                    End session
                  </button>
                </div>
              </section>

              <div className="lv-right-col">
                <section className="lv-card lv-card--live-tip">
                  <CheckCircle2 size={18} className="lv-tip-icon lv-tip-icon--green" />
                  <h3 className="lv-tip-heading">You're discoverable</h3>
                  <p className="lv-tip-body">
                    Other students studying {liveStatus.course_code} can now see you in their session feed and join you.
                  </p>
                </section>
              </div>
            </div>

          ) : (
            /* ── Go Live Form ── */
            <div className="lv-two-col">
              <section className="lv-card">
                <div className="lv-card-header">
                  <h2 className="lv-card-title">Start a live session</h2>
                </div>

                <div className="lv-form">

                  <div className="lv-field">
                    <label className="lv-label">
                      <BookOpen size={16} className="lv-label-icon" />
                      Course code
                    </label>
                    <input
                        className="lv-input"
                        value={courseCode}
                        onChange={(e) =>
                            setCourseCode(
                                normalizeCourseCode(e.target.value)
                            )
                        }
                        placeholder="CS400"
                    />

                    {courseCode.trim() &&
                        !isValidCourseCode(
                            normalizeCourseCode(courseCode)
                        ) && (
                            <p className="lv-warning">
                              Enter a valid course code like CS400,
                              MATH340, or BIO101.
                            </p>
                        )}
                  </div>

                  <div className="lv-field">
                    <label className="lv-label">
                      <MapPin size={16} className="lv-label-icon" />
                      Location
                    </label>
                    <input
                      className="lv-input"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Memorial Library"
                    />
                    {location.trim().length > 0 &&
                      location.trim().length < 10 && (
                        <p className="lv-warning">
                          Try being more specific. Include a room,
                          floor, table, or area.
                        </p>
                      )}

                    {location.trim().length >= 10 && (
                      <p className="lv-success">
                        Great! That location is specific enough.
                      </p>
                    )}
                    <p className="lv-hint">Be specific — floor, section, booth number all help.</p>
                  </div>

                  <div className="lv-field">
                    <label className="lv-label">
                      <FileText size={16} className="lv-label-icon" />
                      What are you studying?
                    </label>
                    <textarea
                      className="lv-textarea"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      maxLength={300}
                      placeholder="Reviewing dynamic programming, working on HW6, preparing for midterm…"
                    />
                    <p className="lv-character-count">
                      {description.length}/300 characters
                    </p>
                  </div>

                  <div className="lv-field">
                    <label className="lv-label">
                      <User size={16} className="lv-label-icon" />
                      How can people find you?
                    </label>
                    <input
                      className="lv-input"
                      value={identification}
                      onChange={(e) => setIdentification(e.target.value)}
                      placeholder="Blue hoodie, window seat, black backpack"
                    />
                    {identification.trim().length > 0 &&
                      identification.trim().length < 10 && (
                        <p className="lv-warning">
                          Students may have trouble finding you.
                        </p>
                      )}

                    {identification.trim().length >= 10 && (
                      <p className="lv-success">
                        Great! Other students should be able to find you.
                      </p>
                    )}
                    <p className="lv-hint">Help classmates spot you in a crowded space.</p>
                  </div>

                  {combinedText.trim().length > 0 &&
  validationErrors.length > 0 && (
                    <div className="lv-errors">
                      {validationErrors.map((error) => (
                        <div
                          key={error}
                          className="lv-error"
                        >
                          {error}
                        </div>
                      ))}
                    </div>
                  )}
                  {canGoLive && (
                    <div className="lv-ready">
                      ✓ Your live status is ready.
                    </div>
                  )}

                  <button
                    className="lv-btn-primary"
                    onClick={goLive}
                    disabled={saving || !canGoLive}
                  >
                    <Radio size={18} />
                    {saving ? "Going live…" : "Go Live"}
                  </button>
                </div>
              </section>

              <div className="lv-right-col">
                <section className="lv-card lv-card--tip">
                  <Radio size={18} className="lv-tip-icon" />
                  <h3 className="lv-tip-heading">How it works</h3>
                  <p className="lv-tip-body">
                    Once you go live, other students browsing your course can see where you are and join you on the spot — no scheduling needed.
                  </p>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>
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

/* ─────────────────────────────────────────────
   Scoped styles — lv- prefix
───────────────────────────────────────────── */
const livePageStyles = `

  /* ── Tokens / reset ── */
  .lv-root * { box-sizing: border-box; }
  .lv-root {
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

  /* ── Loading ── */
  .lv-loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
  }
  .lv-loading-spinner {
    width: 36px; height: 36px;
    border: 3px solid var(--border);
    border-top-color: var(--violet);
    border-radius: 50%;
    animation: lv-spin 0.7s linear infinite;
  }
  @keyframes lv-spin { to { transform: rotate(360deg); } }
  .lv-loading-text { font-size: 14px; color: var(--muted); }

  /* ── Live root override ── */
  .lv-root--live {
    background: #F0FDF7;
  }

  /* ── Hero bar ── */
  .lv-hero-bar {
    background: var(--indigo);
    padding: 40px 24px 36px;
    transition: background 0.4s ease;
  }
  .lv-hero-bar--live {
    background: #065F46;
  }
  .lv-hero-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .lv-hero-left {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .lv-avatar {
    width: 72px; height: 72px;
    border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.15);
    object-fit: cover;
    flex-shrink: 0;
  }
    .lv-live-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lv-live-expiry {
  margin: 0;
  font-size: 13px;
  color: #059669;
  font-weight: 600;
}
  .lv-hero-eyebrow {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--violet-mid);
    margin: 0 0 4px;
  }
  .lv-hero-name {
    font-size: 36px;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0 0 6px;
    line-height: 1.1;
  }
  .lv-hero-meta {
    font-size: 14px;
    color: rgba(255,255,255,0.5);
    margin: 0;
  }

  /* Live badge in hero */
  .lv-live-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(239,68,68,0.15);
    border: 1px solid rgba(239,68,68,0.3);
    border-radius: 100px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    color: #FCA5A5;
  }
  .lv-live-badge--green {
    background: rgba(16,185,129,0.2);
    border-color: rgba(16,185,129,0.45);
    color: #6EE7B7;
  }
  .lv-live-dot {
    position: relative;
    width: 10px; height: 10px;
    flex-shrink: 0;
  }
  .lv-live-dot-inner {
    display: block;
    width: 10px; height: 10px;
    border-radius: 50%;
    background: var(--red);
  }
  .lv-live-dot-inner--green { background: var(--green); }
  .lv-live-dot::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: var(--red);
    opacity: 0.4;
    animation: lv-pulse 1.4s ease-out infinite;
  }
  .lv-live-badge--green .lv-live-dot::after { background: var(--green); }
  @keyframes lv-pulse {
    0%   { transform: scale(1); opacity: 0.4; }
    70%  { transform: scale(2); opacity: 0; }
    100% { transform: scale(1); opacity: 0; }
  }

  /* ── Page body ── */
  .lv-page-body {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }

  .lv-errors {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lv-error {
  padding: 10px 12px;
  border-radius: 10px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: #DC2626;
  font-size: 13px;
  font-weight: 500;
}

.lv-warning {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #D97706;
}

.lv-success {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #10B981;
}

.lv-character-count {
  margin-top: 6px;
  text-align: right;
  font-size: 12px;
  color: var(--muted);
}

.lv-ready {
  padding: 10px 12px;
  border-radius: 10px;
  background: #ECFDF5;
  border: 1px solid #A7F3D0;
  color: #059669;
  font-size: 13px;
  font-weight: 500;
}

  /* Back button */
  .lv-back-btn {
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
  .lv-back-btn:hover { color: var(--text); }

  /* ── Two-column layout ── */
  .lv-two-col {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 20px;
    align-items: start;
  }
  .lv-right-col {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ── Cards ── */
  .lv-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 4px 24px rgba(27,27,58,0.08);
  }
  .lv-card--tip {
    background: var(--violet-lt);
    border-color: #C4B5FD;
  }
  .lv-card--live {
    background: #F0FDF9;
    border-color: #6EE7B7;
    border-width: 1.5px;
  }
  .lv-card--live-tip {
    background: #DCFCE7;
    border-color: #86EFAC;
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 4px 24px rgba(27,27,58,0.08);
  }
  .lv-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .lv-card-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
  }

  /* Status pill */
  .lv-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: 100px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--red);
  }
  .lv-status-pill--green {
    background: rgba(16,185,129,0.1);
    border-color: rgba(16,185,129,0.35);
    color: #059669;
  }
  .lv-mini-pulse {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--red);
    animation: lv-pulse 1.4s ease-out infinite;
  }
  .lv-mini-pulse--green { background: var(--green); }

  /* ── Live detail rows ── */
  .lv-live-detail-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
  }
  .lv-live-detail-row {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 14px;
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    border-radius: 14px;
  }
  .lv-detail-icon {
    color: var(--green);
    flex-shrink: 0;
    margin-top: 2px;
  }
  .lv-detail-label {
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin: 0 0 4px;
  }
  .lv-detail-value {
    font-size: 15px;
    font-weight: 500;
    color: var(--text);
    margin: 0;
  }

  .lv-live-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }
  .lv-live-since {
    font-size: 13px;
    color: var(--faint);
    margin: 0;
  }

  /* ── Tip card ── */
  .lv-tip-icon {
    color: var(--violet);
    margin-bottom: 12px;
  }
  .lv-tip-icon--green { color: var(--green); }
  .lv-tip-heading {
    font-size: 15px;
    font-weight: 700;
    margin: 0 0 8px;
    color: var(--text);
  }
  .lv-tip-body {
    font-size: 14px;
    line-height: 1.5;
    color: var(--muted);
    margin: 0;
  }

  /* ── Form ── */
  .lv-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .lv-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .lv-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }
  .lv-label-icon { color: var(--violet); flex-shrink: 0; }
  .lv-input,
  .lv-textarea {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 14px;
    color: var(--text);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    font-family: inherit;
  }
  .lv-input::placeholder,
  .lv-textarea::placeholder { color: var(--faint); }
  .lv-input:focus,
  .lv-textarea:focus {
    border-color: var(--violet-mid);
    box-shadow: 0 0 0 3px rgba(124,58,237,0.08);
  }
  .lv-textarea { resize: vertical; }
  .lv-hint {
    font-size: 12px;
    color: var(--muted);
    margin: 0;
  }

  /* ── Buttons ── */
  .lv-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--violet);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    padding: 12px 22px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    width: 100%;
  }
  .lv-btn-primary:hover:not(:disabled) {
    background: #6D28D9;
    transform: translateY(-1px);
  }
  .lv-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  .lv-btn-end {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--red-lt);
    color: var(--red);
    font-size: 14px;
    font-weight: 600;
    padding: 10px 20px;
    border-radius: 10px;
    border: 1px solid rgba(239,68,68,0.25);
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .lv-btn-end:hover {
    background: #FEE2E2;
    transform: translateY(-1px);
  }

  /* ── Responsive ── */
  @media (max-width: 860px) {
    .lv-two-col {
      grid-template-columns: 1fr;
    }
    .lv-right-col { order: -1; }
    .lv-hero-name { font-size: 28px; }
  }
  @media (max-width: 520px) {
    .lv-hero-bar { padding: 28px 16px; }
    .lv-page-body { padding: 20px 16px 48px; }
    .lv-btn-primary { font-size: 14px; }
    .lv-live-footer { flex-direction: column; align-items: flex-start; }
  }

  @media (prefers-reduced-motion: reduce) {
    .lv-live-dot::after,
    .lv-mini-pulse,
    .lv-mini-pulse--green { animation: none; }
    .lv-btn-primary:hover,
    .lv-btn-end:hover { transform: none; }
  }
`;