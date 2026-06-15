"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import {
  Users,
  CalendarDays,
  ArrowLeft,
  MapPin,
  Plus, Check,
    BookOpen,
} from "lucide-react";

import {
  normalizeCourseCode,
  isValidCourseCode,
} from "@/lib/courseValidation";
import AlertModal from "@/components/AlertModal";

type Session = {
  id: string;
  title: string;
  course_code: string;
  location_name: string;
  start_time: string;
  end_time: string;
  creator_id: string;
};

type LiveStudent = {
  id: string;
  user_id: string;
  course_code: string;
  location_name: string;
  description: string | null;
  identification: string | null;
  created_at: string;

  profiles: {
    name: string | null;
    avatar_url: string | null;
    major: string | null;
    year: string | null;
  } | null;
};

export default function CoursePage() {
  const { loading: onboardingLoading } = useRequireOnboarding();
  const params = useParams();
  const router = useRouter();

  const courseCode =
      normalizeCourseCode(
          params.courseCode as string
      );

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [isMyCourse, setIsMyCourse] = useState(false);
  const [savingCourse, setSavingCourse] = useState(false);

  const [alertOpen, setAlertOpen] = useState(false);

  const [liveStudents, setLiveStudents] =
      useState<LiveStudent[]>([]);

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

  useEffect(() => {
    loadCourse();
  }, [courseCode]);

  async function loadCourse() {
    if (!isValidCourseCode(courseCode)) {
      router.push("/sessions");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: existing } = await supabase
          .from("user_courses")
          .select("course_code")
          .eq("user_id", user.id)
          .eq("course_code", courseCode)
          .maybeSingle();

      setIsMyCourse(!!existing);
    }

    const { data: sessionData } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("course_code", courseCode)
      .order("start_time", { ascending: true });

    const activeSessions = (sessionData || []).filter(
      (session) => new Date(session.end_time) > new Date()
    );

    setSessions(activeSessions);

    const students = new Set<string>();

// Session creators
    activeSessions.forEach((session) => {
      students.add(session.creator_id);
    });

// Session attendees
    if (activeSessions.length > 0) {
      const sessionIds = activeSessions.map((s) => s.id);

      const { data: members } = await supabase
          .from("session_members")
          .select("user_id")
          .in("session_id", sessionIds);

      members?.forEach((member) => {
        students.add(member.user_id);
      });
    }

// Live students in this course
    const twoHoursAgo = new Date(
        Date.now() - 2 * 60 * 60 * 1000
    ).toISOString();

    const { data: liveStudentsData } =
        await supabase
            .from("live_study_status")
            .select(`
      *,
      profiles (
        name,
        avatar_url,
        major,
        year
      )
    `)
            .eq("course_code", courseCode)
            .gte("created_at", twoHoursAgo);

    liveStudentsData?.forEach((student) => {
      students.add(student.user_id);
    });

    setLiveStudents(liveStudentsData || []);

    setStudentCount(students.size);

    setLoading(false);
  }

  async function addToMyCourses() {
    if (!isValidCourseCode(courseCode)) {
      showAlert(
          "Invalid Course",
          "This course code is not valid.",
          "error"
      );
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setSavingCourse(true);

    const { error } = await supabase
        .from("user_courses")
        .upsert(
            {
              user_id: user.id,
              course_code: courseCode,
            },
            {
              onConflict: "user_id,course_code",
            }
        );

    if (error) {
      showAlert(
          "Unable to Add Course",
          error.message,
          "error"
      );
    } else {
      setIsMyCourse(true);

      showAlert(
          "Course Added",
          `${courseCode} has been added to My Courses.`,
          "success"
      );
    }

    setSavingCourse(false);
  }

  function getSessionUrgency(startTime: string): "live" | "soon" | "today" | "later" {
    const now = new Date();
    const start = new Date(startTime);
    const diffMin = (start.getTime() - now.getTime()) / 60000;
    if (diffMin <= 0) return "live";
    if (diffMin <= 30) return "soon";
    if (diffMin <= 120) return "today";
    return "later";
  }

  function formatSessionTime(startTime: string): string {
    const now = new Date();
    const start = new Date(startTime);
    const diffMin = (start.getTime() - now.getTime()) / 60000;
    if (diffMin <= 0) return "Happening now";
    if (diffMin < 60) return `In ${Math.round(diffMin)}m`;
    if (diffMin < 1440) return start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return start.toLocaleDateString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  if (loading || onboardingLoading) {
    return (
      <>
        <style>{coursePageStyles}</style>
        <main className="cp-root">
          <div className="cp-loading-screen">
            <div className="cp-loading-spinner" />
            <p className="cp-loading-text">Loading course…</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{coursePageStyles}</style>
      <main className="cp-root">

        {/* ── Hero Bar ── */}
        <header className="cp-hero">
          <div className="cp-hero-inner">
            <div className="cp-hero-left">
              <div>
                <p className="cp-eyebrow">Course community</p>
                <h1 className="cp-hero-name">{courseCode}</h1>
                <p className="cp-hero-meta">
                  <span>
                    <CalendarDays size={13} className="cp-meta-icon" />
                    {sessions.length} upcoming session{sessions.length !== 1 ? "s" : ""}
                  </span>
                  <span className="cp-dot-sep">·</span>
                  <span>
                    <Users size={13} className="cp-meta-icon" />
                    {studentCount} student{studentCount !== 1 ? "s" : ""} studying
                  </span>
                </p>
              </div>
            </div>

            <div className="cp-hero-actions">
              {!isMyCourse ? (
                  <button
                      onClick={addToMyCourses}
                      disabled={savingCourse}
                      className="cp-btn-secondary"
                  >
                    <Plus size={18} />
                    {savingCourse
                        ? "Adding..."
                        : "Add To My Courses"}
                  </button>
              ) : (
                  <div className="cp-course-added">
                    <Check size={18} style={{ marginRight: 6 }} />
                    In My Courses
                  </div>
              )}

              <Link
                  href={`/create-session?course=${courseCode}`}
                  className="cp-btn-primary"
              >
                <Plus size={18} strokeWidth={2.5} />
                Start a session
              </Link>
            </div>
          </div>
        </header>

        {/* ── Page Body ── */}
        <div className="cp-body">

          <button className="cp-back-btn" onClick={() => router.push("/sessions")}>
            <ArrowLeft size={16} />
            Back to sessions
          </button>

          <div className="cp-layout">

            {/* ── Sessions list ── */}
            <section className="cp-card">
              <div className="cp-card-header">
                <h2 className="cp-card-title">Upcoming sessions</h2>
              </div>

              {sessions.length === 0 ? (
                <div className="cp-empty-state">
                  <div className="cp-empty-icon">
                    <BookOpen size={36} strokeWidth={1.8} />
                  </div>
                  <p className="cp-empty-heading">No sessions yet</p>
                  <p className="cp-empty-sub">Be the first to start a {courseCode} study session.</p>
                  <Link href={`/create-session?course=${courseCode}`} className="cp-empty-cta">
                    Create Session
                  </Link>
                </div>
              ) : (
                <ul className="cp-session-list">
                  {sessions.map((session) => {
                    const urgency = getSessionUrgency(session.start_time);
                    return (
                      <li key={session.id}>
                        <Link href={`/sessions/${session.id}`} className="cp-session-row">
                          <div className={`cp-urgency-bar cp-urgency-bar--${urgency}`} />
                          <div className="cp-session-info">
                            <p className="cp-session-title">{session.title}</p>
                            <div className="cp-session-meta-row">
                              <span className="cp-tag">{session.course_code}</span>
                              {session.location_name && (
                                <span className="cp-session-loc">
                                  <MapPin size={12} />
                                  {session.location_name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={`cp-session-time cp-session-time--${urgency}`}>
                            {formatSessionTime(session.start_time)}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>



            {/* ── Right col: stats ── */}
            <div className="cp-right-col">
              <div className="cp-stat-row">
                <div className="cp-stat-card">
                  <CalendarDays size={18} className="cp-stat-icon" />
                  <div>
                    <p className="cp-stat-value">{sessions.length}</p>
                    <p className="cp-stat-label">Sessions</p>
                  </div>
                </div>
                <div className="cp-stat-card cp-stat-card--accent">
                  <Users size={18} className="cp-stat-icon cp-stat-icon--accent" />
                  <div>
                    <p className="cp-stat-value cp-stat-value--accent">{studentCount}</p>
                    <p className="cp-stat-label">Students</p>
                  </div>
                </div>
              </div>

              <section className="cp-card">

                <div className="cp-card-header">

                  <h2 className="cp-card-title">

                    Live Right Now

                  </h2>

                </div>

                {liveStudents.length === 0 ? (

                    <p className="cp-live-empty">

                      Nobody is studying live right now.

                    </p>

                ) : (

                    <div className="cp-live-list">

                      {liveStudents.map((student) => (
                          <div
                              key={student.id}
                              className="cp-live-card"
                          >
                            <div className="cp-live-header">
                              <span className="cp-live-dot" />
                              <span className="cp-live-badge">
        Live
      </span>
                            </div>

                            <div className="cp-live-user">
                              <img
                                  src={
                                      student.profiles?.avatar_url ||
                                      "/default-avatar.png"
                                  }
                                  alt=""
                                  className="cp-live-avatar"
                              />

                              <div>
                                <p className="cp-live-name">
                                  {student.profiles?.name || "Student"}
                                </p>

                                <p className="cp-live-major">
                                  {student.profiles?.major}
                                  {student.profiles?.year
                                      ? ` • ${student.profiles.year}`
                                      : ""}
                                </p>
                              </div>
                            </div>

                            <p className="cp-live-location">
                              <MapPin size={14} />
                              {student.location_name}
                            </p>

                            {student.description && (
                                <p className="cp-live-description">
                                  {student.description}
                                </p>
                            )}

                            {student.identification && (
                                <p className="cp-live-identification">
                                  {student.identification}
                                </p>
                            )}
                          </div>
                      ))}

                    </div>

                )}

              </section>

              <section className="cp-card cp-cta-card">
                <p className="cp-cta-heading">Start a {courseCode} session</p>
                <p className="cp-cta-body">
                  Create a session and let classmates find you in real time.
                </p>
                <Link
                  href={`/create-session?course=${courseCode}`}
                  className="cp-btn-cta"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  Create Session
                </Link>
              </section>
            </div>

          </div>
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
   Scoped styles — cp- prefix
───────────────────────────────────────────── */
const coursePageStyles = `

  /* ── Tokens / reset ── */
  .cp-root * { box-sizing: border-box; }
  .cp-root {
    --indigo:     #1B1B3A;
    --violet:     #7C3AED;
    --violet-lt:  #EDE9FE;
    --violet-mid: #A78BFA;
    --green:      #10B981;
    --amber:      #F59E0B;
    --red:        #EF4444;
    --sky:        #38BDF8;
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
  
  .cp-live-user {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.cp-live-avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  object-fit: cover;
}

.cp-live-name {
  margin: 0;
  font-weight: 700;
  font-size: 14px;
}

.cp-live-major {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

  /* ── Loading ── */
  .cp-loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
  }
  .cp-hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.cp-btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  background: rgba(255,255,255,0.1);

  border: 1px solid rgba(255,255,255,0.2);

  color: white;

  font-size: 15px;
  font-weight: 600;

  padding: 12px 22px;

  border-radius: 12px;

  cursor: pointer;

  transition: all 0.15s ease;
}

.cp-live-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cp-live-card {
  border: 1px solid #BBF7D0;
  background: #F0FDF4;
  border-radius: 14px;
  padding: 14px;
}

.cp-live-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.cp-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #10B981;
}

.cp-live-badge {
  color: #059669;
  font-size: 12px;
  font-weight: 700;
}

.cp-live-location {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}

.cp-live-description {
  margin: 0 0 6px;
  font-size: 14px;
}

.cp-live-identification {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}

.cp-live-empty {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}

.cp-live-card {
  padding: 12px;
}

.cp-live-location {
  margin: 0 0 6px;
}

.cp-live-identification {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.cp-btn-secondary:hover {
  background: rgba(255,255,255,0.18);
}
.cp-course-added {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  padding: 12px 22px;

  border-radius: 12px;

  background: rgba(16,185,129,0.15);

  border: 1px solid rgba(16,185,129,0.3);

  color: #A7F3D0;

  font-size: 15px;
  font-weight: 600;
}
  .cp-loading-spinner {
    width: 36px; height: 36px;
    border: 3px solid var(--border);
    border-top-color: var(--violet);
    border-radius: 50%;
    animation: cp-spin 0.7s linear infinite;
  }
  @keyframes cp-spin { to { transform: rotate(360deg); } }
  .cp-loading-text { font-size: 14px; color: var(--muted); margin: 0; }

  /* ── Hero bar ── */
  .cp-hero {
    background: var(--indigo);
    padding: 40px 24px 36px;
  }
  .cp-hero-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .cp-hero-left {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .cp-eyebrow {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--violet-mid);
    margin: 0 0 4px;
  }
  .cp-hero-name {
    font-size: 36px;
    font-weight: 700;
    color: #fff;
    margin: 0 0 6px;
    line-height: 1.1;
  }
  .cp-hero-meta {
    font-size: 14px;
    color: rgba(255,255,255,0.5);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .cp-hero-meta span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .cp-dot-sep { color: rgba(255,255,255,0.25); }
  .cp-meta-icon { opacity: 0.7; flex-shrink: 0; }

  /* Primary button in hero */
  .cp-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--violet);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    padding: 12px 22px;
    border-radius: 12px;
    text-decoration: none;
    transition: background 0.15s, transform 0.1s;
    flex-shrink: 0;
  }
  .cp-btn-primary:hover { background: #6D28D9; transform: translateY(-1px); }

  /* ── Page body ── */
  .cp-body {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }

  /* ── Back button ── */
  .cp-back-btn {
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
  .cp-back-btn:hover { color: var(--text); }

  /* ── Two-column layout ── */
  .cp-layout {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 20px;
    align-items: start;
  }
  .cp-right-col {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ── Card ── */
  .cp-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 4px 24px rgba(27,27,58,0.08);
  }
  .cp-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .cp-card-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
  }

  /* ── Stats row ── */
  .cp-stat-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .cp-stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: 0 4px 24px rgba(27,27,58,0.08);
  }
  .cp-stat-card--accent {
    background: var(--violet-lt);
    border-color: #C4B5FD;
  }
  .cp-stat-icon { color: var(--muted); }
  .cp-stat-icon--accent { color: var(--violet); }
  .cp-stat-value {
    font-size: 28px;
    font-weight: 700;
    line-height: 1;
    margin: 0 0 2px;
  }
  .cp-stat-value--accent { color: var(--violet); }
  .cp-stat-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0;
  }

  /* ── CTA card ── */
  .cp-cta-card { }
  .cp-cta-eyebrow {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--violet-mid);
    margin: 0 0 6px;
  }
  .cp-cta-heading {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 8px;
  }
  .cp-cta-body {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.5;
    margin: 0 0 16px;
  }
  .cp-btn-cta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--violet);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    padding: 10px 20px;
    border-radius: 10px;
    text-decoration: none;
    transition: background 0.15s, transform 0.1s;
  }
  .cp-btn-cta:hover { background: #6D28D9; transform: translateY(-1px); }

  /* ── Empty state ── */
  .cp-empty-state {
    text-align: center;
    padding: 40px 24px;
    border: 2px dashed var(--border);
    border-radius: 16px;
  }
  .cp-empty-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
  color: var(--violet);
}
  .cp-empty-heading { font-size: 16px; font-weight: 600; margin: 0 0 6px; }
  .cp-empty-sub { font-size: 14px; color: var(--muted); margin: 0 0 20px; }
  .cp-empty-cta {
    display: inline-flex;
    background: var(--violet);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    padding: 10px 20px;
    border-radius: 10px;
    text-decoration: none;
    transition: background 0.15s;
  }
  .cp-empty-cta:hover { background: #6D28D9; }

  /* ── Session list ── */
  .cp-session-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .cp-session-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--border);
    border-radius: 14px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .cp-session-row:hover {
    border-color: var(--violet-mid);
    box-shadow: 0 2px 12px rgba(124,58,237,0.08);
  }

  /* Urgency bar */
  .cp-urgency-bar {
    width: 4px;
    min-height: 44px;
    border-radius: 4px;
    flex-shrink: 0;
    align-self: stretch;
  }
  .cp-urgency-bar--live  { background: var(--red); }
  .cp-urgency-bar--soon  { background: var(--amber); }
  .cp-urgency-bar--today { background: var(--sky); }
  .cp-urgency-bar--later { background: var(--border); }

  .cp-session-info { flex: 1; min-width: 0; }
  .cp-session-title {
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cp-session-meta-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .cp-tag {
    background: var(--violet-lt);
    color: var(--violet);
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 100px;
  }
  .cp-session-loc {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 12px;
    color: var(--faint);
  }

  /* Time */
  .cp-session-time {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
  }
  .cp-session-time--live  { color: var(--red); }
  .cp-session-time--soon  { color: var(--amber); }
  .cp-session-time--today { color: #0284C7; }
  .cp-session-time--later { color: var(--muted); font-weight: 400; }

  .cp-mini-pulse {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--red);
    animation: cp-pulse 1.4s ease-out infinite;
  }
  @keyframes cp-pulse {
    0%   { transform: scale(1); opacity: 0.4; }
    70%  { transform: scale(2); opacity: 0; }
    100% { transform: scale(1); opacity: 0; }
  }

  /* ── Responsive ── */
  @media (max-width: 860px) {
    .cp-layout { grid-template-columns: 1fr; }
    .cp-right-col { order: -1; }
    .cp-hero-name { font-size: 28px; }
    .cp-hero-inner { flex-direction: column; align-items: flex-start; }
    .cp-btn-primary { width: 100%; justify-content: center; }
  }
  @media (max-width: 520px) {
    .cp-hero { padding: 28px 16px; }
    .cp-body { padding: 20px 16px 48px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .cp-mini-pulse { animation: none; }
    .cp-btn-primary:hover,
    .cp-btn-cta:hover { transform: none; }
  }
`;