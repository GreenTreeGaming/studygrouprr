"use client";

import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import { useEffect } from "react";
import { useState } from "react";
import { gsap } from "gsap";
import { supabase } from "@/lib/supabase";
import EditableField from "@/components/profile/EditableField";
import EditableUniversity from "@/components/profile/EditableUniversity";
import EditableMajor from "@/components/profile/EditableMajor";
import EditableYear from "@/components/profile/EditableYear";
import { CheckCircle2, Circle, ChevronRight, GraduationCap, Mail, Calendar, Fingerprint } from "lucide-react";
import { X } from "lucide-react";

import {
  containsInappropriateContent,
} from "@/lib/contentModeration";
import AlertModal from "@/components/AlertModal";

export default function Dashboard() {
  const { profile, loading } = useRequireOnboarding();
  const [editingField, setEditingField] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    university: "",
    major: "",
    year: "",
  });

  const [courses, setCourses] = useState<string[]>([]);
  const [newCourse, setNewCourse] = useState("");

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

  useEffect(() => {
    if (!profile) return;

    loadCourses();
  }, [profile]);

  async function loadCourses() {
    const { data } = await supabase
        .from("user_courses")
        .select("course_code")
        .eq("user_id", profile?.id);

    setCourses(
        data?.map((c) => c.course_code) || []
    );
  }

  function normalizeCourseCode(input: string) {
    return input
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
  }

  async function addCourse() {
    const code = normalizeCourseCode(newCourse);

    if (!code) return;

    if (containsInappropriateContent(code)) {
      showAlert(
          "Invalid Course",
          "Please remove inappropriate language from the course code.",
          "warning"
      );
      return;
    }

    // Must be 2-12 chars
    if (code.length < 2 || code.length > 12) {
      showAlert(
          "Invalid Course Code",
          "Course codes must be between 2 and 12 characters.",
          "warning"
      );
      return;
    }

    // Only letters, numbers, and hyphens
    if (!/^[A-Z0-9-]+$/.test(code)) {
      showAlert(
          "Invalid Characters",
          "Course codes may only contain letters, numbers, and hyphens.",
          "warning"
      );
      return;
    }

    // Prevent duplicates
    if (
        courses.some(
            (course) =>
                normalizeCourseCode(course) === code
        )
    ) {
      showAlert(
          "Already Added",
          `${code} is already in your courses.`,
          "info"
      );
      return;
    }

    const { error } = await supabase
        .from("user_courses")
        .insert({
          user_id: profile?.id,
          course_code: code,
        });

    if (error) {
      if (error.code === "23505") {
        showAlert(
            "Already Added",
            `${code} is already in your courses.`,
            "info"
        );
        return;
      }

      showAlert(
          "Something Went Wrong",
          error.message,
          "error"
      );
      return;
    }

    setCourses((prev) => [...prev, code]);
    setNewCourse("");
    showAlert(
        "Course Added",
        `${code} was added to your courses.`,
        "success"
    );
  }

  async function removeCourse(
      courseCode: string
  ) {
    await supabase
        .from("user_courses")
        .delete()
        .eq("user_id", profile?.id)
        .eq("course_code", courseCode);

    setCourses((prev) =>
        prev.filter((c) => c !== courseCode)
    );

    showAlert(
        "Course Removed",
        `${courseCode} was removed from your courses.`,
        "success"
    );
  }

  useEffect(() => {
    if (!profile) return;
    setFormData({
      name: profile.name || "",
      university: profile.university || "",
      major: profile.major || "",
      year: profile.year || "",
    });
  }, [profile]);

  useEffect(() => {
    if (loading || !profile) return;
    const ctx = gsap.context(() => {
      gsap.from(".pf-hero-eyebrow, .pf-hero-name, .pf-hero-meta", {
        opacity: 0,
        y: -12,
        duration: 0.6,
        stagger: 0.07,
        ease: "power3.out",
      });
      gsap.from(".pf-card", {
        opacity: 0,
        y: 16,
        duration: 0.6,
        stagger: 0.08,
        delay: 0.15,
        ease: "power3.out",
      });
      gsap.from(".pf-info-row", {
        opacity: 0,
        x: -12,
        duration: 0.5,
        stagger: 0.05,
        delay: 0.3,
        ease: "power3.out",
      });
    });
    return () => ctx.revert();
  }, [loading, profile]);

  async function saveField(
      field: string,
      value: string
  ) {
    const cleanedValue = value.trim();

    if (!cleanedValue) {
      showAlert(
          "Invalid Value",
          "This field cannot be empty.",
          "warning"
      );
      return;
    }

    if (
        containsInappropriateContent(
            cleanedValue
        )
    ) {
      showAlert(
          "Inappropriate Content",
          "Please remove inappropriate language.",
          "warning"
      );
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showAlert(
          "Session Expired",
          "Please sign in again.",
          "error"
      );
      return;
    }

    const { error } = await supabase
        .from("profiles")
        .update({
          [field]: cleanedValue,
        })
        .eq("id", user.id);

    if (error) {
      showAlert(
          "Save Failed",
          error.message,
          "error"
      );
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: cleanedValue,
    }));

    setEditingField(null);

    const fieldName =
        field.charAt(0).toUpperCase() +
        field.slice(1);

    showAlert(
        "Profile Updated",
        `${fieldName} was updated successfully.`,
        "success"
    );
  }

  if (loading) {
    return (
      <>
        <style>{profileStyles}</style>
        <main className="pf-loading-screen">
          <div className="pf-loading-spinner" />
          <p className="pf-loading-text">Loading your profile…</p>
        </main>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <style>{profileStyles}</style>
        <main className="pf-loading-screen">
          <p className="pf-loading-text">No profile found.</p>
        </main>
      </>
    );
  }

  const profileChecks = [
    { label: "University added", complete: !!profile.university },
    { label: "Major added", complete: !!profile.major },
    { label: "Year added", complete: !!profile.year },
  ];
  const completedCount = profileChecks.filter((i) => i.complete).length;
  const completionPercentage = Math.round(
    (completedCount / profileChecks.length) * 100
  );

  const firstName = formData.name.split(" ")[0];

  return (
    <>
      <style>{profileStyles}</style>
      <main className="pf-root">
        {/* ── Hero Bar ── */}
        <header className="pf-hero-bar">
          <div className="pf-hero-inner">
            <div className="pf-hero-left">
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="pf-avatar"
              />
              <div>
                <p className="pf-hero-eyebrow">Your profile</p>
                <h1 className="pf-hero-name">{firstName}</h1>
                <p className="pf-hero-meta">
                  {formData.university && <span>{formData.university}</span>}
                  {formData.major && <span className="pf-dot-sep">·</span>}
                  {formData.major && <span>{formData.major}</span>}
                  {formData.year && <span className="pf-dot-sep">·</span>}
                  {formData.year && <span>{formData.year}</span>}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="pf-page-body">
          <div className="pf-two-col">
            {/* Main column */}
            <section className="pf-card pf-main">
              <div className="pf-card-header">
                <h2 className="pf-card-title">Account information</h2>
              </div>

              <div className="pf-info-list">
                <div className="pf-info-row">
                  <span className="pf-info-label">Name</span>
                  <EditableField
                    label="Name"
                    value={formData.name}
                    editing={editingField === "name"}
                    onEdit={() => setEditingField("name")}
                    onCancel={() => {
                      setFormData({ ...formData, name: profile.name });
                      setEditingField(null);
                    }}
                    onSave={() => saveField("name", formData.name)}
                    onChange={(value) =>
                      setFormData({ ...formData, name: value })
                    }
                  />
                </div>

                <div className="pf-info-row">
                  <span className="pf-info-label">Email</span>
                  <div className="pf-info-value-group">
                    <Mail size={14} className="pf-info-icon" />
                    <span className="pf-info-value">{profile.email}</span>
                    <span className="pf-badge pf-badge--muted">
                      Google account
                    </span>
                  </div>
                </div>

                <div
                  className={`pf-info-row ${
                    editingField === "university" ? "pf-info-row--active" : ""
                  }`}
                >
                  <span className="pf-info-label">University</span>
                  <EditableUniversity
                    value={formData.university}
                    editing={editingField === "university"}
                    onEdit={() => setEditingField("university")}
                    onCancel={() => {
                      setFormData({
                        ...formData,
                        university: profile.university,
                      });
                      setEditingField(null);
                    }}
                    onSave={(value) => {
                      setFormData({ ...formData, university: value });
                      saveField("university", value);
                    }}
                  />
                </div>

                <div
                  className={`pf-info-row ${
                    editingField === "major" ? "pf-info-row--active" : ""
                  }`}
                >
                  <span className="pf-info-label">Major</span>
                  <EditableMajor
                    value={formData.major}
                    editing={editingField === "major"}
                    onEdit={() => setEditingField("major")}
                    onCancel={() => {
                      setFormData({ ...formData, major: profile.major });
                      setEditingField(null);
                    }}
                    onSave={(value) => {
                      setFormData({ ...formData, major: value });
                      saveField("major", value);
                    }}
                  />
                </div>

                <div
                  className={`pf-info-row ${
                    editingField === "year" ? "pf-info-row--active" : ""
                  }`}
                >
                  <span className="pf-info-label">Year</span>
                  <EditableYear
                    value={formData.year}
                    editing={editingField === "year"}
                    onEdit={() => setEditingField("year")}
                    onCancel={() => {
                      setFormData({ ...formData, year: profile.year });
                      setEditingField(null);
                    }}
                    onSave={(value) => {
                      setFormData({ ...formData, year: value });
                      saveField("year", value);
                    }}
                  />
                </div>

                <div className="pf-info-row">
                  <span className="pf-info-label">Onboarding</span>
                  <div className="pf-info-value-group">
                    {profile.onboarding_complete ? (
                      <span className="pf-badge pf-badge--green">
                        <CheckCircle2 size={12} /> Completed
                      </span>
                    ) : (
                      <span className="pf-badge pf-badge--amber">
                        Incomplete
                      </span>
                    )}
                  </div>
                </div>

                <div className="pf-info-row">
                  <span className="pf-info-label">Member since</span>
                  <div className="pf-info-value-group">
                    <Calendar size={14} className="pf-info-icon" />
                    <span className="pf-info-value">
                      {new Date(profile.created_at).toLocaleDateString([], {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="pf-info-row pf-info-row--last">
                  <span className="pf-info-label">User ID</span>
                  <div className="pf-info-value-group">
                    <Fingerprint size={14} className="pf-info-icon" />
                    <span className="pf-info-value pf-info-value--mono">
                      {profile.id}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Right column */}
            <div className="pf-right-col">
              <section className="pf-card">
                <div className="pf-card-header">
                  <h2 className="pf-card-title">
                    My Courses
                  </h2>
                </div>

                <div className="pf-course-add">
                  <input
                      value={newCourse}
                      onChange={(e) => {
                        const value = e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9-]/g, "");

                        if (value.length <= 12) {
                          setNewCourse(value);
                        }
                      }}
                      placeholder="CS400"
                      className="pf-course-input"
                  />

                  <button
                      onClick={addCourse}
                      className="pf-course-btn"
                  >
                    Add
                  </button>
                </div>

                <div className="pf-course-list">
                  {courses.length === 0 ? (
                      <p className="pf-muted-note">
                        Add the courses you're taking this
                        semester.
                      </p>
                  ) : (
                      courses.map((course) => (
                          <div
                              key={course}
                              className="pf-course-chip"
                          >
                            <span>{course}</span>

                            <button
                                onClick={() => removeCourse(course)}
                                className="pf-course-remove"
                                aria-label={`Remove ${course}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                      ))
                  )}
                </div>
              </section>
              {/* Profile snapshot */}
              <section className="pf-card">
                <div className="pf-card-header">
                  <h2 className="pf-card-title">Snapshot</h2>
                </div>
                <ul className="pf-chip-list">
                  {formData.university && (
                    <li className="pf-chip">
                      <GraduationCap size={12} />
                      {formData.university}
                    </li>
                  )}
                  {formData.major && (
                    <li className="pf-chip pf-chip--green">
                      {formData.major}
                    </li>
                  )}
                  {formData.year && (
                    <li className="pf-chip pf-chip--violet">
                      {formData.year}
                    </li>
                  )}
                  {!formData.university && !formData.major && !formData.year && (
                    <p className="pf-muted-note">
                      Add your university, major, and year to complete your profile.
                    </p>
                  )}
                </ul>
              </section>

              {/* Profile Completion */}
              {completionPercentage < 100 && (
                <section className="pf-card pf-card--subtle">
                  <div className="pf-card-header">
                    <h2 className="pf-card-title">Complete your profile</h2>
                    <span className="pf-pct-badge">{completionPercentage}%</span>
                  </div>

                  <div className="pf-progress-track">
                    <div
                      className="pf-progress-fill"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>

                  <ul className="pf-profile-checks">
                    {profileChecks.map((item) => (
                      <li key={item.label} className="pf-profile-check-row">
                        {item.complete ? (
                          <CheckCircle2 size={16} className="pf-check-icon pf-check-icon--done" />
                        ) : (
                          <Circle size={16} className="pf-check-icon pf-check-icon--todo" />
                        )}
                        <span
                          className={
                            item.complete
                              ? "pf-check-label--done"
                              : "pf-check-label--todo"
                          }
                        >
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <p className="pf-hint-text">
                    Click any field above to fill in the missing details <ChevronRight size={14} />
                  </p>
                </section>
              )}
            </div>
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
   Scoped styles — StudyGrouprr design system
───────────────────────────────────────────── */
const profileStyles = `
  .pf-root * { box-sizing: border-box; }
  .pf-root {
    --indigo:      #1B1B3A;
    --violet:      #7C3AED;
    --violet-lt:   #EDE9FE;
    --violet-mid:  #A78BFA;
    --green:       #10B981;
    --green-lt:    #ECFDF5;
    --amber:       #F59E0B;
    --amber-lt:    #FEF3C7;
    --red:         #EF4444;
    --red-lt:      #FEF2F2;
    --sky:         #38BDF8;
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
  .pf-loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
    background: var(--bg);
  }
  .pf-loading-spinner {
    width: 36px; height: 36px;
    border: 3px solid var(--border);
    border-top-color: var(--violet);
    border-radius: 50%;
    animation: pf-spin 0.7s linear infinite;
  }
  .pf-loading-text { font-size: 14px; color: var(--muted); }
  @keyframes pf-spin { to { transform: rotate(360deg); } }

  /* ── Hero ── */
  .pf-hero-bar {
    background: var(--indigo);
    padding: 40px 24px 36px;
  }
  .pf-course-add {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.pf-course-input {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
}

.pf-course-input:focus {
  border-color: var(--violet-mid);
}

.pf-course-btn {
  background: var(--violet);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 0 16px;
  font-weight: 600;
  cursor: pointer;
}

.pf-course-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pf-course-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--violet-lt);
  color: var(--violet);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
}

.pf-course-remove {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 18px;
  height: 18px;

  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;

  padding: 0;
  flex-shrink: 0;
}

.pf-course-remove svg {
  display: block;
}
  .pf-hero-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .pf-hero-left {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .pf-avatar {
    width: 72px; height: 72px;
    border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.15);
    object-fit: cover;
    flex-shrink: 0;
  }
  .pf-hero-eyebrow {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--violet-mid);
    margin: 0 0 4px;
  }
  .pf-hero-name {
    font-size: 36px;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0 0 6px;
    line-height: 1.1;
  }
  .pf-hero-meta {
    font-size: 14px;
    color: rgba(255,255,255,0.5);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .pf-dot-sep { color: rgba(255,255,255,0.25); }

  /* ── Page body ── */
  .pf-page-body {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }

  /* ── Two column ── */
  .pf-two-col {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 20px;
    align-items: start;
  }
  .pf-right-col {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ── Cards ── */
  .pf-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 4px 24px rgba(27, 27, 58, 0.08);
  }
  .pf-card--subtle {
    background: var(--violet-lt);
    border-color: #C4B5FD;
  }
  .pf-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .pf-card-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
  }

  /* ── Info list ── */
  .pf-info-list {
    display: flex;
    flex-direction: column;
  }
  .pf-info-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 0;
    border-bottom: 1px solid var(--border);
    position: relative;
    z-index: 0;
  }
  .pf-info-row--last { border-bottom: none; }
  .pf-info-row--active { z-index: 30; }

  .pf-info-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .pf-info-value-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .pf-info-value {
    font-size: 14px;
    color: var(--text);
  }
  .pf-info-value--mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    color: var(--muted);
    word-break: break-all;
  }
  .pf-info-icon { color: var(--faint); flex-shrink: 0; }

  @media (min-width: 640px) {
    .pf-info-row {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  /* ── Badges ── */
  .pf-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 10px;
    border-radius: 100px;
  }
  .pf-badge--muted {
    background: var(--bg);
    color: var(--muted);
  }
  .pf-badge--green {
    background: var(--green-lt);
    color: var(--green);
    border: 1px solid #A7F3D0;
  }
  .pf-badge--amber {
    background: var(--amber-lt);
    color: #B45309;
  }

  /* ── Chips (snapshot) ── */
  .pf-chip-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .pf-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--violet-lt);
    color: var(--violet);
    font-size: 12px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 100px;
  }
  .pf-chip--green {
    background: var(--green-lt);
    color: var(--green);
  }
  .pf-chip--violet {
    background: var(--bg);
    color: var(--indigo);
    border: 1px solid var(--border);
  }
  .pf-muted-note {
    font-size: 14px;
    color: var(--muted);
    margin: 0;
  }

  /* ── Profile completion ── */
  .pf-pct-badge {
    font-size: 13px;
    font-weight: 700;
    color: var(--violet);
  }
  .pf-progress-track {
    height: 6px;
    background: var(--border);
    border-radius: 100px;
    overflow: hidden;
    margin-bottom: 16px;
  }
  .pf-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--violet), var(--violet-mid));
    border-radius: 100px;
    transition: width 0.5s ease;
  }
  .pf-profile-checks {
    list-style: none;
    margin: 0 0 16px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .pf-profile-check-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
  }
  .pf-check-icon--done { color: var(--green); }
  .pf-check-icon--todo { color: var(--violet-mid); }
  .pf-check-label--done { color: var(--text); }
  .pf-check-label--todo { color: var(--indigo); opacity: 0.6; }

  .pf-hint-text {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 500;
    color: var(--violet);
    margin: 0;
  }

  /* ── Responsive ── */
  @media (max-width: 860px) {
    .pf-two-col { grid-template-columns: 1fr; }
    .pf-right-col { order: -1; }
    .pf-hero-name { font-size: 28px; }
  }
  @media (max-width: 520px) {
    .pf-hero-bar { padding: 28px 16px; }
    .pf-page-body { padding: 20px 16px 48px; }
  }
`;