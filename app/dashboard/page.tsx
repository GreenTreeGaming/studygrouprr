"use client";

import Link from "next/link";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, Circle, Plus, Search, Clock, MapPin, BookOpen, ChevronRight, Zap, CalendarDays } from "lucide-react";

export default function DashboardPage() {
  const { profile, loading } = useRequireOnboarding();
  const [createdSessions, setCreatedSessions] = useState<any[]>([]);
  const [joinedSessions, setJoinedSessions] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [courses, setCourses] = useState<string[]>([]);

  async function loadCourses() {
    const { data } = await supabase
        .from("user_courses")
        .select("course_code")
        .eq("user_id", profile!.id)
        .order("course_code");

    setCourses(
        data?.map((c) => c.course_code) || []
    );
  }

  useEffect(() => {
    if (!profile) return;

    loadSessions();
    loadCourses();
  }, [profile]);

  async function loadSessions() {
    const { data: createdData } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("creator_id", profile!.id)
      .order("start_time", { ascending: true });

    setCreatedSessions(createdData || []);

    const { data: joinedData } = await supabase
      .from("session_members")
      .select(`session_id, study_sessions (*)`)
      .eq("user_id", profile!.id);

    const filteredJoinedSessions = (joinedData || []).filter(
      (membership: any) =>
        membership.study_sessions?.creator_id !== profile!.id
    );

    setJoinedSessions(filteredJoinedSessions);

    // LIVE SESSIONS I'M PARTICIPATING IN

    const currentTime = new Date();

    const createdLiveSessions = (createdData || []).filter(
      (session: any) =>
        new Date(session.start_time) <= currentTime &&
        new Date(session.end_time) > currentTime
    );

    const joinedLiveSessions = (filteredJoinedSessions || [])
      .map((membership: any) => membership.study_sessions)
      .filter(
        (session: any) =>
          session &&
          new Date(session.start_time) <= currentTime &&
          new Date(session.end_time) > currentTime
      );

    setLiveSessions([
      ...createdLiveSessions,
      ...joinedLiveSessions,
    ]);
  }

  if (loading) {
    return (
      <>
        <style>{dashboardStyles}</style>
        <main className="loading-screen">
          <div className="loading-spinner" />
          <p className="loading-text">Loading your dashboard…</p>
        </main>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <style>{dashboardStyles}</style>
        <main className="loading-screen">
          <p className="loading-text">No profile found.</p>
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
  const completionPercentage = Math.round((completedCount / profileChecks.length) * 100);

  const now = new Date();
  const upcomingSessions = createdSessions.filter(
    (s) => new Date(s.start_time) > now
  );
  const pastSessions = createdSessions
    .filter((s) => new Date(s.end_time) <= now)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  function getSessionUrgency(startTime: string): "live" | "soon" | "today" | "later" {
    const start = new Date(startTime);
    const diffMin = (start.getTime() - now.getTime()) / 60000;
    if (diffMin <= 0) return "live";
    if (diffMin <= 30) return "soon";
    if (diffMin <= 120) return "today";
    return "later";
  }

  function formatSessionTime(startTime: string): string {
    const start = new Date(startTime);
    const diffMin = (start.getTime() - now.getTime()) / 60000;
    if (diffMin <= 0) return "Happening now";
    if (diffMin < 60) return `In ${Math.round(diffMin)}m`;
    if (diffMin < 1440) return start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return start.toLocaleDateString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  const firstName = profile.name.split(" ")[0];
  const liveCount = liveSessions.length;

  return (
    <>
      <style>{dashboardStyles}</style>
      <main className="dashboard-root">

        {/* ── Hero Bar ── */}
        <header className="hero-bar">
          <div className="hero-inner">
            <div className="hero-left">
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="avatar"
              />
              <div>
                <p className="hero-eyebrow">Welcome back</p>
                <h1 className="hero-name">{firstName}</h1>
                <p className="hero-meta">
                  {profile.university && <span>{profile.university}</span>}
                  {profile.major && <span className="dot-sep">·</span>}
                  {profile.major && <span>{profile.major}</span>}
                  {profile.year && <span className="dot-sep">·</span>}
                  {profile.year && <span>{profile.year}</span>}
                </p>
              </div>
            </div>

            {liveCount > 0 && (
              <div className="live-badge">
                <span>{liveCount} session{liveCount > 1 ? "s" : ""} live now</span>
              </div>
            )}
          </div>
        </header>

        <div className="page-body">

          {/* ── Stat Row ── */}
          <div className="stat-row">
            <div className="stat-card">
              <BookOpen size={18} className="stat-icon" />
              <div>
                <p className="stat-value">{createdSessions.length}</p>
                <p className="stat-label">Created</p>
              </div>
            </div>
            <div className="stat-card">
              <Zap size={18} className="stat-icon" />
              <div>
                <p className="stat-value">{joinedSessions.length}</p>
                <p className="stat-label">Joined</p>
              </div>
            </div>
            <div className="stat-card stat-card--accent">
              <Clock size={18} className="stat-icon stat-icon--accent" />
              <div>
                <p className="stat-value stat-value--accent">{upcomingSessions.length}</p>
                <p className="stat-label">Upcoming</p>
              </div>
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div className="actions-row">
            <Link href="/create-session" className="action-primary">
              <Plus size={20} strokeWidth={2.5} />
              <span>Create Session</span>
            </Link>
            <Link href="/sessions" className="action-secondary">
              <Search size={20} strokeWidth={2} />
              <span>Browse Sessions</span>
            </Link>
          </div>

          <section className="card live-now-card">
            <div className="card-header">
              <h2 className="card-title">
                Live Sessions Right Now
              </h2>
            </div>

            {liveSessions.length === 0 ? (
              <p className="muted-note">
                No active study sessions at your university right now.
              </p>
            ) : (
              <ul className="session-list">
                {liveSessions.slice(0, 5).map((session) => (
                  <li key={session.id}>
                    <Link
                      href={`/sessions/${session.id}`}
                      className="session-row"
                    >
                      <div className="urgency-bar urgency-bar--live" />

                      <div className="session-info">
                        <p className="session-title">
                          {session.title}
                        </p>

                        <div className="session-meta-row">
                          <span className="tag">
                            {session.course_code}
                          </span>

                          <span className="session-loc">
                            <MapPin size={12} />
                            {session.location_name}
                          </span>
                        </div>
                      </div>

                      <div className="live-session-right">
                        <div className="session-time session-time--live">
                          Live
                        </div>

                        <div className="live-join-pill">
                          Join Now →
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card courses-card">
            <div className="card-header">
              <h2 className="card-title">
                My Courses
              </h2>

              <Link
                  href="/profile"
                  className="card-link"
              >
                Manage
                <ChevronRight size={14} />
              </Link>
            </div>

            {courses.length === 0 ? (
                <div className="courses-empty">
                  <BookOpen size={28} />

                  <div>
                    <p className="courses-empty-title">
                      No courses added
                    </p>

                    <p className="courses-empty-sub">
                      Add your semester courses from
                      your profile to personalize
                      StudyGrouprr.
                    </p>
                  </div>
                </div>
            ) : (
                <div className="courses-grid">
                  {courses.map((course) => (
                      <Link
                          key={course}
                          href={`/courses/${encodeURIComponent(course)}`}
                          className="course-pill"
                      >
                        {course}
                      </Link>
                  ))}
                </div>
            )}
          </section>

          {/* ── Two-column layout ── */}
          <div className="two-col">

            {/* Upcoming */}
            <section className="card">
              <div className="card-header">
                <h2 className="card-title">Upcoming</h2>
                {upcomingSessions.length > 0 && (
                  <Link href="/sessions" className="card-link">
                    See all <ChevronRight size={14} />
                  </Link>
                )}
              </div>

              {upcomingSessions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <CalendarDays size={36} strokeWidth={1.75} />
                  </div>
                  <p className="empty-heading">No upcoming sessions</p>
                  <p className="empty-sub">Create one and invite your classmates to join.</p>
                  <Link href="/create-session" className="empty-cta">
                    Create Session
                  </Link>
                </div>
              ) : (
                <ul className="session-list">
                  {upcomingSessions.slice(0, 5).map((session) => {
                    const urgency = getSessionUrgency(session.start_time);
                    return (
                      <li key={session.id}>
                        <Link href={`/sessions/${session.id}`} className="session-row">
                          <div className={`urgency-bar urgency-bar--${urgency}`} />
                          <div className="session-info">
                            <p className="session-title">{session.title}</p>
                            <div className="session-meta-row">
                              {session.course_code && (
                                <span className="tag">{session.course_code}</span>
                              )}
                              {session.location_name && (
                                <span className="session-loc">
                                  <MapPin size={12} />
                                  {session.location_name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={`session-time session-time--${urgency}`}>
                            {formatSessionTime(session.start_time)}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                  {upcomingSessions.length > 5 && (
                    <li className="overflow-note">
                      +{upcomingSessions.length - 5} more sessions
                    </li>
                  )}
                </ul>
              )}
            </section>

            {/* Right column: Past + Profile */}
            <div className="right-col">

              {/* Past Sessions */}
              <section className="card">
                <div className="card-header">
                  <h2 className="card-title">Past Sessions</h2>
                </div>

                {pastSessions.length === 0 ? (
                  <p className="muted-note">No sessions completed yet.</p>
                ) : (
                    <ul
                        className={`session-list session-list--past ${
                            pastSessions.length > 5 ? "session-list--scrollable" : ""
                        }`}
                    >
                      {pastSessions.map((session) => (
                      <li key={session.id}>
                        <Link href={`/sessions/${session.id}`} className="session-row session-row--past">
                          <div className="session-info">
                            <p className="session-title session-title--muted">{session.title}</p>
                            {session.course_code && (
                              <span className="tag tag--muted">{session.course_code}</span>
                            )}
                          </div>
                          <div className="past-date">
                            {new Date(session.start_time).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Profile Completion */}
              {completionPercentage < 100 && (
                <section className="card card--subtle">
                  <div className="card-header">
                    <h2 className="card-title">Complete your profile</h2>
                    <span className="pct-badge">{completionPercentage}%</span>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>

                  <ul className="profile-checks">
                    {profileChecks.map((item) => (
                      <li key={item.label} className="profile-check-row">
                        {item.complete ? (
                          <CheckCircle2 size={16} className="check-icon check-icon--done" />
                        ) : (
                          <Circle size={16} className="check-icon check-icon--todo" />
                        )}
                        <span className={item.complete ? "check-label--done" : "check-label--todo"}>
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/profile" className="profile-cta">
                    Finish setting up <ChevronRight size={14} />
                  </Link>
                </section>
              )}

            </div>
          </div>
        </div>
      </main>
    </>
  );
}

/* ─────────────────────────────────────────────
   Scoped styles — Space Grotesk + Inter via Google Fonts
───────────────────────────────────────────── */
const dashboardStyles = `

  /* ── Reset / tokens ── */
  .dashboard-root * { box-sizing: border-box; }
  .dashboard-root {
    --indigo:      #1B1B3A;
    --violet:      #7C3AED;
    --violet-lt:   #EDE9FE;
    --violet-mid:  #A78BFA;
    --amber:       #F59E0B;
    --amber-lt:    #FEF3C7;
    --green:       #10B981;
    --green-lt:    #D1FAE5;
    --red:         #EF4444;
    --red-lt:      #FEE2E2;
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
  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
  }
  .loading-spinner {
    width: 36px; height: 36px;
    border: 3px solid var(--border);
    border-top-color: var(--violet);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Hero ── */
  .hero-bar {
    background: var(--indigo);
    padding: 40px 24px 36px;
  }
  .hero-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .hero-left {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .avatar {
    width: 72px; height: 72px;
    border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.15);
    object-fit: cover;
    flex-shrink: 0;
  }
  .hero-eyebrow {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--violet-mid);
    margin: 0 0 4px;
  }
  .hero-name {
    font-size: 36px;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0 0 6px;
    line-height: 1.1;
  }
  .hero-meta {
    font-size: 14px;
    color: rgba(255,255,255,0.5);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .dot-sep { color: rgba(255,255,255,0.25); }

  /* Live badge */
  .live-badge {
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
  .live-pulse {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: #EF4444;
    position: relative;
    flex-shrink: 0;
  }
  
  .courses-card {
  margin-bottom: 20px;
}

.courses-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.course-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  padding: 10px 16px;

  background: var(--violet-lt);
  color: var(--violet);

  border-radius: 999px;

  font-size: 13px;
  font-weight: 700;
}

.session-list--scrollable {
  max-height: 360px; /* ~5 session rows */
  overflow-y: auto;
  padding-right: 4px;
}

/* nicer scrollbar */
.session-list--scrollable::-webkit-scrollbar {
  width: 6px;
}

.session-list--scrollable::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 999px;
}

.session-list--scrollable::-webkit-scrollbar-thumb:hover {
  background: var(--violet-mid);
}

.courses-empty {
  display: flex;
  align-items: center;
  gap: 14px;

  padding: 20px;

  border: 1px dashed var(--border);
  border-radius: 14px;

  color: var(--muted);
}

.courses-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 4px;
}

.courses-empty-sub {
  font-size: 13px;
  margin: 0;
}
  .live-pulse::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: #EF4444;
    opacity: 0.4;
    animation: pulse 1.4s ease-out infinite;
  }
  @keyframes pulse {
    0%   { transform: scale(1); opacity: 0.4; }
    70%  { transform: scale(2); opacity: 0; }
    100% { transform: scale(1); opacity: 0; }
  }

  /* ── Page body ── */
  .page-body {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }

  .live-now-card {
  margin-bottom: 20px;
  border-color: #FECACA;
  background: linear-gradient(
    180deg,
    #FFFFFF 0%,
    #FFF7F7 100%
  );
}

  /* ── Stat row ── */
  .stat-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .stat-card--accent {
    background: var(--violet-lt);
    border-color: #C4B5FD;
  }
  .stat-icon { color: var(--muted); }
  .stat-icon--accent { color: var(--violet); }
  .stat-value {
    font-size: 28px;
    font-weight: 700;
    line-height: 1;
    margin: 0 0 2px;
  }
  .stat-value--accent { color: var(--violet); }
  .stat-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0;
  }

  /* ── Action buttons ── */
  .actions-row {
    display: flex;
    gap: 12px;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }
  .action-primary {
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
  }
    .live-session-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.live-join-pill {
  color: #EF4444;
  font-size: 12px;
  font-weight: 700;
}
  .action-primary:hover { background: #6D28D9; transform: translateY(-1px); }
  .action-secondary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--surface);
    color: var(--text);
    font-size: 15px;
    font-weight: 600;
    padding: 12px 22px;
    border-radius: 12px;
    border: 1px solid var(--border);
    text-decoration: none;
    transition: border-color 0.15s, transform 0.1s;
  }
  .action-secondary:hover { border-color: var(--violet-mid); transform: translateY(-1px); }

  /* ── Two-column layout ── */
  .two-col {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 20px;
    align-items: start;
  }
  .right-col { display: flex; flex-direction: column; gap: 20px; }

  /* ── Cards ── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
  }
  .card--subtle {
    background: #FAFAFA;
  }
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .card-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
  }
  .card-link {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 13px;
    font-weight: 500;
    color: var(--violet);
    text-decoration: none;
  }
  .card-link:hover { text-decoration: underline; }

  /* ── Empty state ── */
  .empty-state {
    text-align: center;
    padding: 40px 24px;
    border: 2px dashed var(--border);
    border-radius: 16px;
  }
  .empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--violet-mid);
    margin-bottom: 12px;
  }
  .empty-heading {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 6px;
  }
  .empty-sub {
    font-size: 14px;
    color: var(--muted);
    margin: 0 0 20px;
  }
  .empty-cta {
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
  .empty-cta:hover { background: #6D28D9; }

  /* ── Session list ── */
  .session-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .session-row {
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
  .session-row:hover {
    border-color: var(--violet-mid);
    box-shadow: 0 2px 12px rgba(124,58,237,0.08);
  }
  .session-row--past { opacity: 0.75; }
  .session-row--past:hover { opacity: 1; }

  /* Urgency sidebar */
  .urgency-bar {
    width: 4px;
    min-height: 44px;
    border-radius: 4px;
    flex-shrink: 0;
    align-self: stretch;
  }
  .urgency-bar--live   { background: var(--red); }
  .urgency-bar--soon   { background: var(--amber); }
  .urgency-bar--today  { background: #38BDF8; }
  .urgency-bar--later  { background: var(--border); }

  .session-info { flex: 1; min-width: 0; }
  .session-title {
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .session-title--muted { color: var(--muted); }
  .session-meta-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .tag {
    background: var(--violet-lt);
    color: var(--violet);
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 100px;
  }
  .tag--muted {
    background: var(--bg);
    color: var(--muted);
  }
  .session-loc {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 12px;
    color: var(--faint);
  }

  /* Time stamp */
  .session-time {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
  }
  .session-time--live   { color: var(--red); }
  .session-time--soon   { color: var(--amber); }
  .session-time--today  { color: #0284C7; }
  .session-time--later  { color: var(--muted); font-weight: 400; }

  .mini-pulse {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--red);
    animation: pulse 1.4s ease-out infinite;
  }

  .past-date {
    font-size: 12px;
    color: var(--faint);
    flex-shrink: 0;
  }

  .overflow-note {
    text-align: center;
    font-size: 13px;
    color: var(--faint);
    padding: 8px 0 0;
  }
  .muted-note { font-size: 14px; color: var(--muted); }

  /* ── Profile completion ── */
  .pct-badge {
    font-size: 13px;
    font-weight: 700;
    color: var(--violet);
  }
  .progress-track {
    height: 6px;
    background: var(--border);
    border-radius: 100px;
    overflow: hidden;
    margin-bottom: 16px;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--violet), var(--violet-mid));
    border-radius: 100px;
    transition: width 0.5s ease;
  }
  .profile-checks {
    list-style: none;
    margin: 0 0 16px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .profile-check-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
  }
  .check-icon--done { color: var(--green); }
  .check-icon--todo { color: var(--border); }
  .check-label--done { color: var(--text); }
  .check-label--todo { color: var(--faint); }
  .profile-cta {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 600;
    color: var(--violet);
    text-decoration: none;
  }
  .profile-cta:hover { text-decoration: underline; }

  /* ── Responsive ── */
  @media (max-width: 860px) {
    .two-col {
      grid-template-columns: 1fr;
    }
    .right-col { order: -1; }
    .stat-row { grid-template-columns: repeat(3, 1fr); }
    .hero-name { font-size: 28px; }
  }
  @media (max-width: 520px) {
    .stat-row { grid-template-columns: 1fr 1fr; }
    .stat-card:last-child { grid-column: 1 / -1; }
    .hero-bar { padding: 28px 16px; }
    .page-body { padding: 20px 16px 48px; }
    .actions-row { flex-direction: column; }
    .action-primary, .action-secondary { justify-content: center; }
  }

  @media (prefers-reduced-motion: reduce) {
    .live-pulse::after, .mini-pulse { animation: none; }
    .action-primary:hover, .action-secondary:hover { transform: none; }
  }
`;