"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";

import {
  Search,
  MapPin,
  Clock,
  Users,
  Radio,
  BookOpen,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import AlertModal from "@/components/AlertModal";

type Session = {
  id: string;
  title: string;
  course_code: string;
  location_name: string;
  description: string | null;
  start_time: string;
  end_time: string;
  creator_id: string;
  created_at: string;
};

export default function SessionsPage() {
  const { profile, loading: onboardingLoading } = useRequireOnboarding();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendeeCounts, setAttendeeCounts] = useState<Record<string, number>>({});
  const [liveStudents, setLiveStudents] = useState<any[]>([]);
  const [liveCourseFilter, setLiveCourseFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [myCourses, setMyCourses] = useState<string[]>([]);
  const [alertOpen, setAlertOpen] = useState(false);

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
    if (!profile?.university) return;
    loadSessions();
  }, [profile]);

  function formatSessionTime(dateString: string) {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (isToday) return `Today · ${time}`;
    if (isTomorrow) return `Tomorrow · ${time}`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" }) + ` · ${time}`;
  }

  const [buddyIds, setBuddyIds] = useState<Set<string>>(
    new Set()
  );

  async function loadSessions() {
    setLoading(true);

    const { data: coursesData } = await supabase
        .from("user_courses")
        .select("course_code")
        .eq("user_id", profile!.id);

    const courseCodes =
        coursesData?.map((c) => c.course_code) || [];

    setMyCourses(courseCodes);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: friendships } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "accepted")
      .or(
        `requester_id.eq.${user.id},receiver_id.eq.${user.id}`
      );

    const ids = new Set<string>();

    friendships?.forEach((friendship) => {
      if (friendship.requester_id === user.id) {
        ids.add(friendship.receiver_id);
      } else {
        ids.add(friendship.requester_id);
      }
    });

    setBuddyIds(ids);

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("study_sessions")
      .select(`*, profiles!study_sessions_creator_id_fkey (university)`)
      .gt("end_time", now)
      .order("start_time", { ascending: true });


    if (!error && data) {
      const universitySessions = data.filter(
        (session: any) => session.profiles?.university === profile?.university
      );
      setSessions(universitySessions);

      const { data: members } = await supabase.from("session_members").select("session_id");
      const counts: Record<string, number> = {};
      members?.forEach((member) => {
        counts[member.session_id] = (counts[member.session_id] || 0) + 1;
      });
      setAttendeeCounts(counts);

      const twoHoursAgo = new Date(
        Date.now() - 2 * 60 * 60 * 1000
      ).toISOString();

      const { data: liveData } = await supabase
          .from("live_study_status")
          .select(`
    *,
    profiles (
      id,
      name,
      avatar_url,
      university,
      major,
      year
    )
  `)
        .gte("created_at", twoHoursAgo)
        .order("created_at", { ascending: false });

      const universityLive = (liveData || []).filter(
        (student: any) => student.profiles?.university === profile?.university
      );
      setLiveStudents(universityLive);
    }

    setLoading(false);
  }

  function getStatus(session: Session): { label: string; urgency: "live" | "soon" | "upcoming" } {
    const now = new Date();
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    if (now >= start && now <= end) return { label: "Live Now", urgency: "live" };
    const diffMinutes = (start.getTime() - now.getTime()) / 60000;
    if (diffMinutes <= 30 && diffMinutes > 0) return { label: "Starting Soon", urgency: "soon" };
    return { label: "Upcoming", urgency: "upcoming" };
  }

  async function sendFriendRequest(receiverId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;
    if (user.id === receiverId) {
      return;
    }

    // Check if friendship already exists in either direction
    const { data: existing } = await supabase
      .from("friendships")
      .select("id")
      .or(
        `and(requester_id.eq.${user.id},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      showAlert(
          "Already Connected",
          "You already have a pending or existing study buddy relationship.",
          "info"
      );
      return;
    }

    const { error } = await supabase
      .from("friendships")
      .insert({
        requester_id: user.id,
        receiver_id: receiverId,
        status: "pending",
      });

    if (error) {
      showAlert(
          "Something Went Wrong",
          error.message,
          "error"
      );
      return;
    }

    showAlert(
        "Request Sent",
        "Your study buddy request has been sent.",
        "success"
    );
  }

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const matchesSearch =
        session.title.toLowerCase().includes(search.toLowerCase()) ||
        session.course_code.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (statusFilter === "all") return true;
      const { urgency } = getStatus(session);
      return urgency === statusFilter;
    });
  }, [sessions, search, statusFilter]);

  const sessionsForMyCourses = filteredSessions
      .filter((session) =>
          myCourses.includes(session.course_code)
      )
      .sort((a, b) => {
        const aLive = getStatus(a).urgency === "live";
        const bLive = getStatus(b).urgency === "live";

        if (aLive && !bLive) return -1;
        if (!aLive && bLive) return 1;

        return (
            new Date(a.start_time).getTime() -
            new Date(b.start_time).getTime()
        );
      });

  const otherSessions =
      filteredSessions.filter(
          (session) =>
              !myCourses.includes(session.course_code)
      );

  if (loading || onboardingLoading) {
    return (
      <>
        <style>{pageStyles}</style>
        <main className="sp-loading">
          <div className="sp-spinner" />
          <p className="sp-loading-text">Loading sessions…</p>
        </main>
      </>
    );
  }

  const liveCourses = [...new Set(liveStudents.map((s) => s.course_code))].sort();
  const filteredLiveStudents =
    liveCourseFilter === "all"
      ? liveStudents
      : liveStudents.filter((s) => s.course_code === liveCourseFilter);

  const liveCount = filteredSessions.filter((s) => getStatus(s).urgency === "live").length;

  return (
    <>
      <style>{pageStyles}</style>
      <main className="sp-root">

        {/* ── Hero Bar ── */}
        <header className="sp-hero">
          <div className="sp-hero-inner">
            <div>
              <p className="sp-eyebrow">Study Sessions</p>
              <h1 className="sp-hero-title">Browse Sessions</h1>
              <p className="sp-hero-sub">
                Find students already studying your classes at{" "}
                <strong>{profile?.university}</strong>
              </p>
            </div>

            {liveCount > 0 && (
              <div className="sp-live-badge">
                {liveCount} session{liveCount > 1 ? "s" : ""} live now
              </div>
            )}
          </div>
        </header>

        <div className="sp-body">

          {/* ── Search + Filter ── */}
          <div className="sp-search-bar">
            <div className="sp-search-input-wrap">
              <Search size={17} className="sp-search-icon" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by course code or title…"
                className="sp-search-input"
              />
            </div>

            <div className="sp-filter-wrap">
              <SlidersHorizontal size={15} className="sp-filter-icon" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="sp-select"
              >
                <option value="all">All Sessions</option>
                <option value="live">Live Now</option>
                <option value="soon">Starting Soon</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </div>
          </div>

          {/* ── Live Right Now ── */}
          <section className="sp-card sp-live-section">
            <div className="sp-card-header">
              <div className="sp-live-heading">
                <h2 className="sp-card-title">Studying Right Now</h2>
                {liveStudents.length > 0 && (
                  <span className="sp-count-pill">{filteredLiveStudents.length}</span>
                )}
              </div>

              {liveCourses.length > 0 && (
                <select
                  value={liveCourseFilter}
                  onChange={(e) => setLiveCourseFilter(e.target.value)}
                  className="sp-select sp-select--sm"
                >
                  <option value="all">All Courses</option>
                  {liveCourses.map((course) => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              )}
            </div>

            {filteredLiveStudents.length === 0 ? (
              <div className="sp-live-empty">
                <Radio size={36} className="sp-live-empty-icon" />
                <p className="sp-live-empty-text">Nobody is studying live right now.</p>
                <p className="sp-live-empty-sub">Check back soon or start a session yourself.</p>
              </div>
            ) : (
              <div className="sp-live-grid">
                {filteredLiveStudents.slice(0, 6).map((student) => (
                  <div key={student.id} className="sp-live-card">
                    <div className="sp-live-card-top">
                      <div className="sp-live-avatar-wrap">
                        <img
                            src={student.profiles?.avatar_url}
                            alt={student.profiles?.name}
                            className="sp-live-avatar"
                        />
                        <span className="sp-live-avatar-dot" />
                      </div>

                      <div className="sp-live-card-info">
                        <p className="sp-live-name">
                          {student.profiles?.name}
                        </p>

                        <Link
                            href={`/courses/${student.course_code}`}
                            className="sp-live-course"
                        >
                          {student.course_code}
                        </Link>

                        <p className="sp-live-major">
                          {student.profiles?.major}
                          {student.profiles?.year
                              ? ` • ${student.profiles.year}`
                              : ""}
                        </p>
                      </div>
                    </div>

                    <div className="sp-live-loc">
                      <MapPin size={12} />
                      <span>{student.location_name}</span>
                    </div>

                    {student.description && (
                        <div className="sp-live-section-box">
                          <p className="sp-live-label">
                            Studying
                          </p>

                          <p className="sp-live-text">
                            {student.description}
                          </p>
                        </div>
                    )}

                    {student.identification && (
                        <div className="sp-live-section-box">
                          <p className="sp-live-label">
                            How to find me
                          </p>

                          <p className="sp-live-text">
                            {student.identification}
                          </p>
                        </div>
                    )}
                    {buddyIds.has(student.user_id) ? (
                      <Link
                        href="/buddies"
                        className="sp-buddy-added"
                      >
                        ✓ Study Buddy
                      </Link>
                    ) : (
                      <button
                        className="sp-buddy-btn"
                        onClick={() =>
                          sendFriendRequest(student.user_id)
                        }
                      >
                        Add Study Buddy
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Session Grid ── */}
          <div className="sp-results-header">
            <h2 className="sp-results-title">
              {filteredSessions.length === 0
                ? "No sessions found"
                : `${filteredSessions.length} session${filteredSessions.length !== 1 ? "s" : ""}`}
            </h2>
            {search && (
              <button className="sp-clear-btn" onClick={() => setSearch("")}>
                Clear search
              </button>
            )}
          </div>

          {filteredSessions.length === 0 ? (
            <div className="sp-card sp-empty-state">
              <Search size={40} className="sp-empty-icon" />
              <p className="sp-empty-heading">No sessions found</p>
              <p className="sp-empty-sub">
                {search ? `No results for "${search}".` : "Be the first to create one."}
              </p>
              <Link href="/create-session" className="sp-empty-cta">
                Create Session
              </Link>
            </div>
          ) : (
              <>
                {sessionsForMyCourses.length > 0 && (
                    <>
                      <div className="sp-results-header">
                        <h2 className="sp-results-title">
                          Sessions For Your Courses ({sessionsForMyCourses.length})
                        </h2>
                      </div>

                      <div className="sp-session-grid">
                        {sessionsForMyCourses.map((session) => {
                          const { label, urgency } = getStatus(session);

                          return (
                              <div
                                  key={session.id}
                                  className="sp-session-card"
                              >
                                <div
                                    className={`sp-session-stripe sp-session-stripe--${urgency}`}
                                />

                                <div className="sp-session-body">
                                  <div className="sp-session-top">
                                    <div className="sp-session-badges">
                    <span
                        className={`sp-status-badge sp-status-badge--${urgency}`}
                    >
                      {label}
                    </span>

                                      <span className="sp-match-badge">
                      Your Course
                    </span>

                                      <Link
                                          href={`/courses/${session.course_code}`}
                                          className="sp-course-tag"
                                      >
                                        {session.course_code}
                                      </Link>
                                    </div>

                                    <Link
                                        href={`/sessions/${session.id}`}
                                        className="sp-view-link"
                                    >
                                      View <ChevronRight size={14} />
                                    </Link>
                                  </div>

                                  <h3 className="sp-session-title">
                                    {session.title}
                                  </h3>

                                  {session.description && (
                                      <p className="sp-session-desc">
                                        {session.description}
                                      </p>
                                  )}

                                  <div className="sp-session-meta">
                  <span className="sp-meta-item">
                    <MapPin size={13} />
                    {session.location_name}
                  </span>

                                    <span className="sp-meta-item">
                    <Clock size={13} />
                                      {formatSessionTime(
                                          session.start_time
                                      )}
                  </span>

                                    <span className="sp-meta-item">
                    <Users size={13} />
                                      {attendeeCounts[session.id] || 0} joined
                  </span>
                                  </div>
                                </div>
                              </div>
                          );
                        })}
                      </div>
                    </>
                )}

                {otherSessions.length > 0 && (
                    <>
                      <div className="sp-results-header">
                        <h2 className="sp-results-title">
                          Other Sessions ({otherSessions.length})
                        </h2>
                      </div>

                      <div className="sp-session-grid">
                        {otherSessions.map((session) => {
                          const { label, urgency } = getStatus(session);

                          return (
                              <div
                                  key={session.id}
                                  className="sp-session-card"
                              >
                                <div
                                    className={`sp-session-stripe sp-session-stripe--${urgency}`}
                                />

                                <div className="sp-session-body">
                                  <div className="sp-session-top">
                                    <div className="sp-session-badges">
                    <span
                        className={`sp-status-badge sp-status-badge--${urgency}`}
                    >
                      {label}
                    </span>

                                      <Link
                                          href={`/courses/${session.course_code}`}
                                          className="sp-course-tag"
                                      >
                                        {session.course_code}
                                      </Link>
                                    </div>

                                    <Link
                                        href={`/sessions/${session.id}`}
                                        className="sp-view-link"
                                    >
                                      View <ChevronRight size={14} />
                                    </Link>
                                  </div>

                                  <h3 className="sp-session-title">
                                    {session.title}
                                  </h3>

                                  {session.description && (
                                      <p className="sp-session-desc">
                                        {session.description}
                                      </p>
                                  )}

                                  <div className="sp-session-meta">
                  <span className="sp-meta-item">
                    <MapPin size={13} />
                    {session.location_name}
                  </span>

                                    <span className="sp-meta-item">
                    <Clock size={13} />
                                      {formatSessionTime(
                                          session.start_time
                                      )}
                  </span>

                                    <span className="sp-meta-item">
                    <Users size={13} />
                                      {attendeeCounts[session.id] || 0} joined
                  </span>
                                  </div>
                                </div>
                              </div>
                          );
                        })}
                      </div>
                    </>
                )}
              </>
          )}
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

const pageStyles = `
  .sp-root * { box-sizing: border-box; }
  .sp-root {
    --indigo:     #1B1B3A;
    --violet:     #7C3AED;
    --violet-lt:  #EDE9FE;
    --violet-mid: #A78BFA;
    --green:      #10B981;
    --green-lt:   #ECFDF5;
    --green-bd:   #A7F3D0;
    --amber:      #F59E0B;
    --amber-lt:   #FEF3C7;
    --red:        #EF4444;
    --red-lt:     #FEF2F2;
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

  /* ── Loading ── */
  .sp-loading {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    min-height: 100vh; gap: 16px;
  }
  .sp-spinner {
    width: 36px; height: 36px;
    border: 3px solid var(--border);
    border-top-color: var(--violet);
    border-radius: 50%;
    animation: sp-spin 0.7s linear infinite;
  }
  @keyframes sp-spin { to { transform: rotate(360deg); } }
  .sp-loading-text { color: var(--muted); font-size: 14px; }

  /* ── Hero ── */
  .sp-hero {
    background: var(--indigo);
    padding: 40px 24px 36px;
  }
  .sp-hero-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .sp-eyebrow {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--violet-mid);
    margin: 0 0 6px;
  }
  .sp-hero-title {
    font-size: 36px;
    font-weight: 700;
    color: #fff;
    margin: 0 0 8px;
    line-height: 1.1;
  }
  .sp-hero-sub {
    font-size: 14px;
    color: rgba(255,255,255,0.5);
    margin: 0;
  }
  .sp-hero-sub strong { color: rgba(255,255,255,0.75); font-weight: 500; }

  /* Live badge */
  .sp-live-badge {
    display: flex; align-items: center; gap: 8px;
    background: rgba(239,68,68,0.15);
    border: 1px solid rgba(239,68,68,0.3);
    border-radius: 100px;
    padding: 8px 16px;
    font-size: 13px; font-weight: 600;
    color: #FCA5A5;
    flex-shrink: 0;
  }

  /* ── Page body ── */
  .sp-body {
    max-width: 1100px;
    margin: 0 auto;
    padding: 28px 24px 64px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ── Search bar ── */
  .sp-search-bar {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .sp-search-input-wrap {
    position: relative;
    flex: 1;
    min-width: 220px;
  }
    .sp-buddy-btn {
  width: 100%;
  margin-top: 12px;

  border: none;
  border-radius: 10px;

  padding: 10px 12px;

  background: var(--violet);
  color: white;

  font-size: 13px;
  font-weight: 600;

  cursor: pointer;

  transition: background 0.15s ease;
}

.sp-buddy-added {
  width: 100%;

  margin-top: 12px;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 10px 12px;

  border-radius: 10px;

  text-decoration: none;

  background: #DCFCE7;
  color: #166534;

  font-size: 13px;
  font-weight: 600;

  border: 1px solid #86EFAC;
}

.sp-buddy-btn:hover {
  background: #6D28D9;
}
  .sp-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--faint);
    pointer-events: none;
  }
  .sp-search-input {
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 11px 14px 11px 42px;
    font-size: 14px;
    color: var(--text);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .sp-search-input::placeholder { color: var(--faint); }
  .sp-search-input:focus {
    border-color: var(--violet-mid);
    box-shadow: 0 0 0 3px rgba(124,58,237,0.08);
  }

  .sp-filter-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .sp-filter-icon {
    position: absolute;
    left: 13px;
    color: var(--faint);
    pointer-events: none;
  }
  .sp-select {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 11px 14px 11px 36px;
    font-size: 14px;
    color: var(--text);
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s;
    appearance: none;
    -webkit-appearance: none;
  }
  
  .sp-live-major {
  margin: 6px 0 0;

  font-size: 12px;

  color: var(--muted);
}

.sp-live-section-box {
  margin-top: 10px;

  padding: 10px;

  border-radius: 10px;

  background: rgba(255,255,255,0.65);

  border: 1px solid rgba(255,255,255,0.9);
}

.sp-live-label {
  margin: 0 0 4px;

  font-size: 11px;

  font-weight: 700;

  text-transform: uppercase;

  letter-spacing: 0.05em;

  color: #059669;
}

.sp-live-text {
  margin: 0;

  font-size: 13px;

  line-height: 1.45;

  color: var(--text);
}

  /* ── Cards ── */
  .sp-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
  }
  .sp-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    gap: 12px;
    flex-wrap: wrap;
  }
  .sp-card-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
  }

  /* ── Live section ── */
  .sp-live-section { /* inherits .sp-card */ }
  .sp-live-heading {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .sp-count-pill {
    background: var(--green-lt);
    color: var(--green);
    border: 1px solid var(--green-bd);
    font-size: 12px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 100px;
  }

  /* Live dots */
  .sp-live-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--red);
    position: relative;
    flex-shrink: 0;
    display: inline-block;
  }
  .sp-live-dot::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: var(--red);
    opacity: 0.35;
    animation: sp-pulse 1.4s ease-out infinite;
  }
  .sp-live-dot--lg { width: 10px; height: 10px; }
  @keyframes sp-pulse {
    0%   { transform: scale(1); opacity: 0.35; }
    70%  { transform: scale(2.2); opacity: 0; }
    100% { transform: scale(1); opacity: 0; }
  }

  .sp-live-empty {
    text-align: center;
    padding: 32px 16px;
    border: 2px dashed var(--border);
    border-radius: 14px;
  }
  .sp-live-empty-icon {
  display: block;
  margin: 0 auto 10px;
  color: var(--green);
}

.sp-match-badge {
  background: #DCFCE7;
  color: #166534;

  border: 1px solid #86EFAC;

  font-size: 11px;
  font-weight: 700;

  padding: 3px 10px;

  border-radius: 999px;

  text-transform: uppercase;
  letter-spacing: 0.04em;
}
  .sp-live-empty-text { font-size: 15px; font-weight: 600; margin: 0 0 4px; }
  .sp-live-empty-sub  { font-size: 13px; color: var(--muted); margin: 0; }

  /* Live student cards */
  .sp-live-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
  }
  .sp-live-card {
    background: var(--green-lt);
    border: 1px solid var(--green-bd);
    border-radius: 16px;
    padding: 16px;
  }
  .sp-live-card-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  .sp-live-avatar-wrap {
    position: relative;
    flex-shrink: 0;
  }
  .sp-live-avatar {
    width: 44px; height: 44px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #fff;
  }
  .sp-live-avatar-dot {
    position: absolute;
    bottom: 1px; right: 1px;
    width: 10px; height: 10px;
    border-radius: 50%;
    background: var(--green);
    border: 2px solid var(--green-lt);
  }
  .sp-live-card-info { min-width: 0; }
  .sp-live-name {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sp-live-course {
    font-size: 12px;
    font-weight: 600;
    color: var(--violet);
    text-decoration: none;
    background: var(--violet-lt);
    padding: 2px 8px;
    border-radius: 100px;
    display: inline-block;
  }
  .sp-live-course:hover { text-decoration: underline; }
  .sp-live-loc {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 10px;
  }

  /* Details/summary */
  .sp-live-details { margin-top: 4px; }
  .sp-live-summary {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    cursor: pointer;
    padding: 6px 10px;
    border-radius: 8px;
    background: rgba(255,255,255,0.6);
    list-style: none;
    transition: background 0.15s, color 0.15s;
  }
  .sp-live-summary::-webkit-details-marker { display: none; }
  .sp-live-summary:hover { background: #fff; color: var(--text); }
  .sp-live-desc {
    font-size: 13px;
    color: var(--muted);
    margin: 8px 0 0;
    white-space: pre-wrap;
    line-height: 1.5;
  }

  /* ── Results header ── */
  .sp-results-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2px;
  }
  .sp-results-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--muted);
    margin: 0;
  }
  .sp-clear-btn {
    background: none;
    border: none;
    font-size: 13px;
    font-weight: 500;
    color: var(--violet);
    cursor: pointer;
    padding: 0;
  }
  .sp-clear-btn:hover { text-decoration: underline; }

  /* ── Empty state ── */
  .sp-empty-state {
    text-align: center;
    padding: 48px 24px;
  }
  .sp-empty-icon {
  display: block;
  margin: 0 auto 12px;
  color: var(--violet);
}
  .sp-empty-heading { font-size: 18px; font-weight: 700; margin: 0 0 6px; }
  .sp-empty-sub { font-size: 14px; color: var(--muted); margin: 0 0 24px; }
  .sp-empty-cta {
    display: inline-flex;
    background: var(--violet);
    color: #fff;
    font-size: 14px; font-weight: 600;
    padding: 10px 22px;
    border-radius: 10px;
    text-decoration: none;
    transition: background 0.15s, transform 0.1s;
  }
  .sp-empty-cta:hover { background: #6D28D9; transform: translateY(-1px); }

  /* ── Session grid ── */
  .sp-session-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(480px, 1fr));
    gap: 12px;
  }

  .sp-session-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    display: flex;
    overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .sp-session-card:hover {
    border-color: var(--violet-mid);
    box-shadow: 0 2px 16px rgba(124,58,237,0.08);
  }

  /* Left urgency stripe */
  .sp-session-stripe {
    width: 4px;
    flex-shrink: 0;
  }
  .sp-session-stripe--live     { background: var(--red); }
  .sp-session-stripe--soon     { background: var(--amber); }
  .sp-session-stripe--upcoming { background: var(--border); }

  .sp-session-body { padding: 16px 18px; flex: 1; min-width: 0; }

  .sp-session-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
  }
  .sp-session-badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

  /* Status badge */
  .sp-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px; font-weight: 700;
    padding: 3px 10px;
    border-radius: 100px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .sp-status-badge--live     { background: var(--red-lt);   color: var(--red);   }
  .sp-status-badge--soon     { background: var(--amber-lt); color: var(--amber); }
  .sp-status-badge--upcoming { background: var(--violet-lt); color: var(--violet); }

  .sp-mini-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--red);
    animation: sp-pulse 1.4s ease-out infinite;
    display: inline-block;
  }

  .sp-course-tag {
    font-size: 12px; font-weight: 600;
    color: var(--muted);
    background: var(--bg);
    padding: 3px 10px;
    border-radius: 100px;
    text-decoration: none;
    transition: color 0.15s, background 0.15s;
  }
  .sp-course-tag:hover { color: var(--violet); background: var(--violet-lt); }

  .sp-view-link {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 13px; font-weight: 600;
    color: var(--violet);
    text-decoration: none;
    flex-shrink: 0;
    margin-left: auto;
  }
  .sp-view-link:hover { text-decoration: underline; }

  .sp-session-title {
    font-size: 16px; font-weight: 700;
    margin: 0 0 6px;
    line-height: 1.3;
  }
  .sp-session-desc {
    font-size: 13px;
    color: var(--muted);
    margin: 0 0 10px;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .sp-session-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .sp-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--faint);
  }

  /* ── Responsive ── */
  @media (max-width: 860px) {
    .sp-session-grid { grid-template-columns: 1fr; }
    .sp-hero-title { font-size: 28px; }
  }
  @media (max-width: 520px) {
    .sp-hero { padding: 28px 16px; }
    .sp-body { padding: 20px 16px 48px; }
    .sp-search-bar { flex-direction: column; }
    .sp-filter-wrap { width: 100%; }
    .sp-select { width: 100%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .sp-live-dot::after, .sp-mini-dot { animation: none; }
    .sp-empty-cta:hover { transform: none; }
  }
`;