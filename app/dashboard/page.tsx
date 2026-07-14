"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  GraduationCap,
  MapPin,
  Plus,
  Radio,
  Search,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import { supabase } from "@/lib/supabase";

type StudySession = {
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

type SessionMembership = {
  session_id: string;
  study_sessions: StudySession | StudySession[] | null;
};

type SessionTone = "live" | "soon" | "today" | "later";

function normalizeSessionRelation(
    relation: SessionMembership["study_sessions"],
): StudySession | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function deduplicateSessions(sessions: StudySession[]): StudySession[] {
  const uniqueSessions = new Map<string, StudySession>();

  sessions.forEach((session) => {
    uniqueSessions.set(session.id, session);
  });

  return Array.from(uniqueSessions.values());
}

function formatClockTime(dateValue: string): string {
  return new Date(dateValue).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(dateValue: string): string {
  return new Date(dateValue).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function formatDayLabel(dateValue: string): string {
  return new Date(dateValue)
      .toLocaleDateString([], {
        weekday: "short",
      })
      .toUpperCase();
}

function formatSessionRange(session: StudySession): string {
  const start = new Date(session.start_time);
  const end = new Date(session.end_time);

  return `${start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })} – ${end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function getRelativeTime(startTime: string, now: Date): string {
  const start = new Date(startTime);
  const differenceMinutes = Math.round(
      (start.getTime() - now.getTime()) / 60_000,
  );

  if (differenceMinutes <= 0) {
    return "Happening now";
  }

  if (differenceMinutes < 60) {
    return `In ${differenceMinutes}m`;
  }

  if (differenceMinutes < 24 * 60) {
    return `Today at ${formatClockTime(startTime)}`;
  }

  if (differenceMinutes < 48 * 60) {
    return `Tomorrow at ${formatClockTime(startTime)}`;
  }

  return `${formatShortDate(startTime)} at ${formatClockTime(startTime)}`;
}

function getSessionTone(startTime: string, now: Date): SessionTone {
  const differenceMinutes =
      (new Date(startTime).getTime() - now.getTime()) / 60_000;

  if (differenceMinutes <= 0) {
    return "live";
  }

  if (differenceMinutes <= 30) {
    return "soon";
  }

  if (differenceMinutes <= 12 * 60) {
    return "today";
  }

  return "later";
}

function getGreeting(): string {
  const currentHour = new Date().getHours();

  if (currentHour < 12) {
    return "Good morning";
  }

  if (currentHour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

export default function DashboardPage() {
  const { profile, loading: profileLoading } = useRequireOnboarding();

  const rootRef = useRef<HTMLElement>(null);

  const [createdSessions, setCreatedSessions] = useState<StudySession[]>([]);
  const [joinedSessions, setJoinedSessions] = useState<StudySession[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const profileId = profile?.id;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!profileId) {
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setDashboardLoading(true);
      setDashboardError(null);

      try {
        const [createdResult, joinedResult, coursesResult] = await Promise.all([
          supabase
              .from("study_sessions")
              .select("*")
              .eq("creator_id", profileId)
              .order("start_time", { ascending: true }),

          supabase
              .from("session_members")
              .select("session_id, study_sessions(*)")
              .eq("user_id", profileId),

          supabase
              .from("user_courses")
              .select("course_code")
              .eq("user_id", profileId)
              .order("course_code"),
        ]);

        if (createdResult.error) {
          throw createdResult.error;
        }

        if (joinedResult.error) {
          throw joinedResult.error;
        }

        if (coursesResult.error) {
          throw coursesResult.error;
        }

        if (cancelled) {
          return;
        }

        const created = (createdResult.data ?? []) as StudySession[];
        const memberships = (joinedResult.data ??
            []) as unknown as SessionMembership[];

        const joined = memberships
            .map((membership) =>
                normalizeSessionRelation(membership.study_sessions),
            )
            .filter(
                (session): session is StudySession =>
                    Boolean(session && session.creator_id !== profileId),
            );

        const courseCodes = (coursesResult.data ?? [])
            .map((course) => course.course_code)
            .filter(
                (courseCode): courseCode is string =>
                    typeof courseCode === "string" && courseCode.trim().length > 0,
            );

        setCreatedSessions(created);
        setJoinedSessions(deduplicateSessions(joined));
        setCourses(Array.from(new Set(courseCodes)));
      } catch (error) {
        console.error("Unable to load dashboard:", error);

        if (!cancelled) {
          setDashboardError(
              "Some dashboard information could not be loaded. Refresh the page to try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setDashboardLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const now = useMemo(() => new Date(currentTime), [currentTime]);

  const allRelevantSessions = useMemo(
      () => deduplicateSessions([...createdSessions, ...joinedSessions]),
      [createdSessions, joinedSessions],
  );

  const liveSessions = useMemo(
      () =>
          allRelevantSessions
              .filter((session) => {
                const startTime = new Date(session.start_time);
                const endTime = new Date(session.end_time);

                return startTime <= now && endTime > now;
              })
              .sort(
                  (first, second) =>
                      new Date(first.end_time).getTime() -
                      new Date(second.end_time).getTime(),
              ),
      [allRelevantSessions, now],
  );

  const upcomingSessions = useMemo(
      () =>
          allRelevantSessions
              .filter((session) => new Date(session.start_time) > now)
              .sort(
                  (first, second) =>
                      new Date(first.start_time).getTime() -
                      new Date(second.start_time).getTime(),
              ),
      [allRelevantSessions, now],
  );

  const pastSessions = useMemo(
      () =>
          allRelevantSessions
              .filter((session) => new Date(session.end_time) <= now)
              .sort(
                  (first, second) =>
                      new Date(second.start_time).getTime() -
                      new Date(first.start_time).getTime(),
              ),
      [allRelevantSessions, now],
  );

  const nextSession = upcomingSessions[0] ?? null;

  const profileChecks = useMemo(
      () => [
        {
          label: "University added",
          complete: Boolean(profile?.university),
        },
        {
          label: "Major added",
          complete: Boolean(profile?.major),
        },
        {
          label: "Year added",
          complete: Boolean(profile?.year),
        },
      ],
      [profile?.major, profile?.university, profile?.year],
  );

  const completedProfileChecks = profileChecks.filter(
      (item) => item.complete,
  ).length;

  const profileCompletion = Math.round(
      (completedProfileChecks / profileChecks.length) * 100,
  );

  useEffect(() => {
    if (
        profileLoading ||
        dashboardLoading ||
        !profileId ||
        !rootRef.current
    ) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const context = gsap.context(() => {
      gsap.from(".dash-reveal", {
        opacity: 0,
        y: 28,
        duration: 0.72,
        stagger: 0.08,
        ease: "power3.out",
      });

      gsap.from(".orbit-session", {
        opacity: 0,
        scale: 0.86,
        duration: 0.55,
        stagger: 0.1,
        delay: 0.25,
        ease: "back.out(1.5)",
      });
    }, rootRef);

    return () => {
      context.revert();
    };
  }, [dashboardLoading, profileId, profileLoading]);

  useEffect(() => {
    const root = rootRef.current;

    if (!root || dashboardLoading) {
      return;
    }

    let animationFrameId = 0;

    const updateProgress = () => {
      animationFrameId = 0;

      const rootBounds = root.getBoundingClientRect();
      const travelDistance = root.offsetHeight + window.innerHeight * 0.35;
      const distanceScrolled = window.innerHeight - rootBounds.top;

      const progress = Math.min(
          1,
          Math.max(0, distanceScrolled / travelDistance),
      );

      root.style.setProperty("--dash-progress", progress.toFixed(4));
    };

    const requestUpdate = () => {
      if (animationFrameId === 0) {
        animationFrameId = window.requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);

      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [
    courses.length,
    createdSessions.length,
    dashboardLoading,
    joinedSessions.length,
  ]);

  if (profileLoading || (profile && dashboardLoading)) {
    return (
        <>
          <style>{dashboardStyles}</style>

          <main className="sg-loading">
            <div className="sg-loading-orbit" aria-hidden="true">
              <div className="sg-loading-core" />
              <div className="sg-loading-dot" />
            </div>

            <p>Building your study launchpad…</p>
          </main>
        </>
    );
  }

  if (!profile) {
    return (
        <>
          <style>{dashboardStyles}</style>

          <main className="sg-loading">
            <p>We could not find your StudyGrouprr profile.</p>
            <Link href="/login" className="sg-loading-link">
              Return to login
            </Link>
          </main>
        </>
    );
  }

  const firstName =
      profile.name?.trim().split(/\s+/)[0] || "study legend";

  const profileInitial =
      profile.name?.trim().charAt(0).toUpperCase() || "S";

  return (
      <>
        <style>{dashboardStyles}</style>

        <main ref={rootRef} className="sg-dashboard">
          <div className="sg-background-grid" aria-hidden="true" />

          <div className="sg-background-blob sg-background-blob--one" />
          <div className="sg-background-blob sg-background-blob--two" />

          <svg
              className="sg-journey-line"
              viewBox="0 0 1200 2200"
              preserveAspectRatio="none"
              aria-hidden="true"
          >
            <path
                className="sg-journey-shadow"
                d="M105 25C420 180 60 390 325 570C590 750 1060 570 1010 890C960 1210 380 1045 475 1390C570 1735 1110 1570 1035 2175"
            />

            <path
                className="sg-journey-path"
                pathLength="1"
                d="M105 25C420 180 60 390 325 570C590 750 1060 570 1010 890C960 1210 380 1045 475 1390C570 1735 1110 1570 1035 2175"
            />
          </svg>

          <div className="sg-dashboard-canvas">
            {dashboardError && (
                <div className="sg-error-banner" role="alert">
                  <span>{dashboardError}</span>

                  <button
                      type="button"
                      onClick={() => window.location.reload()}
                  >
                    Refresh
                  </button>
                </div>
            )}

            <section className="sg-welcome-stage dash-reveal">
              <div className="sg-stage-grid" aria-hidden="true" />
              <div className="sg-stage-glow sg-stage-glow--one" />
              <div className="sg-stage-glow sg-stage-glow--two" />

              <div className="sg-welcome-copy">
                <div className="sg-eyebrow">
                  <Sparkles size={15} />
                  <span>{getGreeting()}</span>
                </div>

                <h1>
                  Hey, {firstName}.
                  <span>Where are we locking in?</span>
                </h1>

                <p className="sg-welcome-description">
                  Your campus study launchpad is ready. Start something,
                  find your people, or jump back into the action.
                </p>
              </div>

              <Link href="/profile" className="sg-profile-ticket">
                <div className="sg-ticket-pin" aria-hidden="true" />

                <div className="sg-profile-avatar">
                  {profile.avatar_url ? (
                      <img
                          src={profile.avatar_url}
                          alt=""
                      />
                  ) : (
                      <span>{profileInitial}</span>
                  )}
                </div>

                <div className="sg-profile-ticket-copy">
                  <span className="sg-ticket-label">Your campus ID</span>
                  <strong>{profile.name}</strong>

                  <span className="sg-ticket-meta">
                  {profile.university || "Add your university"}
                </span>

                  {(profile.major || profile.year) && (
                      <span className="sg-ticket-submeta">
                    {[profile.major, profile.year]
                        .filter(Boolean)
                        .join(" · ")}
                  </span>
                  )}
                </div>

                <ChevronRight size={18} className="sg-ticket-arrow" />
              </Link>

              <svg
                  className="sg-hand-arrow"
                  viewBox="0 0 210 110"
                  aria-hidden="true"
              >
                <path d="M8 22C70 1 137 15 169 69" />
                <path d="M142 61L171 72L179 43" />
              </svg>

              <div className="sg-action-cluster">
                <Link
                    href="/create-session"
                    className="sg-action sg-action--primary"
                >
                <span className="sg-action-icon">
                  <Plus size={23} strokeWidth={2.6} />
                </span>

                  <span>
                  <small>Make it happen</small>
                  <strong>Create a session</strong>
                </span>

                  <ArrowRight size={20} className="sg-action-arrow" />
                </Link>

                <Link
                    href="/sessions"
                    className="sg-action sg-action--browse"
                >
                <span className="sg-action-icon">
                  <Search size={21} />
                </span>

                  <span>
                  <small>See what’s around</small>
                  <strong>Explore sessions</strong>
                </span>

                  <ArrowRight size={19} className="sg-action-arrow" />
                </Link>

                <Link
                    href="/live"
                    className="sg-action sg-action--live"
                >
                <span className="sg-action-icon">
                  <Radio size={21} />
                </span>

                  <span>
                  <small>Studying right now?</small>
                  <strong>Go live</strong>
                </span>

                  <span className="sg-live-action-dot" />
                </Link>
              </div>
            </section>

            <div className="sg-impact-ribbon dash-reveal">
              <div className="sg-impact-cell">
              <span className="sg-impact-icon sg-impact-icon--violet">
                <Zap size={17} />
              </span>

                <span>
                <strong>{createdSessions.length}</strong>
                <small>Hosted</small>
              </span>
              </div>

              <div className="sg-impact-divider" />

              <div className="sg-impact-cell">
              <span className="sg-impact-icon sg-impact-icon--green">
                <Users size={17} />
              </span>

                <span>
                <strong>{joinedSessions.length}</strong>
                <small>Joined</small>
              </span>
              </div>

              <div className="sg-impact-divider" />

              <div className="sg-impact-cell">
              <span className="sg-impact-icon sg-impact-icon--amber">
                <BookOpen size={17} />
              </span>

                <span>
                <strong>{courses.length}</strong>
                <small>Courses</small>
              </span>
              </div>

              <div className="sg-impact-divider" />

              <div className="sg-impact-cell">
              <span className="sg-impact-icon sg-impact-icon--blue">
                <CheckCircle2 size={17} />
              </span>

                <span>
                <strong>{pastSessions.length}</strong>
                <small>Completed</small>
              </span>
              </div>
            </div>

            <section className="sg-pulse-layout">
              <article className="sg-pulse-panel dash-reveal">
                <div className="sg-section-heading sg-section-heading--light">
                  <div>
                  <span className="sg-section-kicker">
                    <Radio size={14} />
                    Your live orbit
                  </span>

                    <h2>
                      {liveSessions.length > 0
                          ? "You’re in the middle of it."
                          : "Quiet right now. Suspicious."}
                    </h2>

                    <p>
                      {liveSessions.length > 0
                          ? "These are your sessions happening right now."
                          : "Go live or create a session to wake up your orbit."}
                    </p>
                  </div>

                  <Link href="/sessions" className="sg-light-link">
                    All sessions
                    <ArrowRight size={16} />
                  </Link>
                </div>

                <div
                    className={`sg-orbit-stage ${
                        liveSessions.length === 0
                            ? "sg-orbit-stage--empty"
                            : ""
                    }`}
                >
                  <div className="sg-orbit-ring sg-orbit-ring--outer" />
                  <div className="sg-orbit-ring sg-orbit-ring--inner" />

                  <div className="sg-pulse-core">
                  <span className="sg-core-radar">
                    <Radio size={25} />
                  </span>

                    <strong>{liveSessions.length}</strong>

                    <span>
                    live session
                      {liveSessions.length === 1 ? "" : "s"}
                  </span>

                    <Link href="/live">
                      {liveSessions.length > 0
                          ? "Update status"
                          : "Start the pulse"}
                      <ArrowRight size={14} />
                    </Link>
                  </div>

                  {liveSessions.length > 0 ? (
                      <>
                        {liveSessions.slice(0, 4).map((session, index) => (
                            <Link
                                key={session.id}
                                href={`/sessions/${session.id}`}
                                className={`orbit-session orbit-session--${
                                    index + 1
                                }`}
                            >
                        <span className="sg-orbit-live-label">
                          <span />
                          LIVE
                        </span>

                              <strong>{session.title}</strong>

                              <span className="sg-orbit-course">
                          {session.course_code}
                        </span>

                              <span className="sg-orbit-location">
                          <MapPin size={12} />
                                {session.location_name}
                        </span>
                            </Link>
                        ))}

                        {liveSessions.length > 4 && (
                            <Link
                                href="/sessions"
                                className="sg-orbit-overflow"
                            >
                              +{liveSessions.length - 4}
                            </Link>
                        )}
                      </>
                  ) : (
                      <>
                        <div className="sg-ghost-node sg-ghost-node--one">
                          <BookOpen size={17} />
                          Your next course
                        </div>

                        <div className="sg-ghost-node sg-ghost-node--two">
                          <Users size={17} />
                          Your next group
                        </div>

                        <div className="sg-ghost-node sg-ghost-node--three">
                          <MapPin size={17} />
                          Your next spot
                        </div>
                      </>
                  )}
                </div>
              </article>

              <aside className="sg-next-mission dash-reveal">
                <div className="sg-mission-tape" aria-hidden="true" />

                <div className="sg-mission-heading">
                  <span>Next mission</span>
                  <Compass size={22} />
                </div>

                {nextSession ? (
                    <>
                      <div className="sg-mission-date">
                        <span>{formatDayLabel(nextSession.start_time)}</span>
                        <strong>
                          {new Date(nextSession.start_time).getDate()}
                        </strong>
                        <small>
                          {new Date(nextSession.start_time).toLocaleDateString(
                              [],
                              {
                                month: "short",
                              },
                          )}
                        </small>
                      </div>

                      <div className="sg-mission-copy">
                    <span className="sg-mission-course">
                      {nextSession.course_code}
                    </span>

                        <h2>{nextSession.title}</h2>

                        <p>
                          <Clock size={15} />
                          {getRelativeTime(nextSession.start_time, now)}
                        </p>

                        <p>
                          <MapPin size={15} />
                          {nextSession.location_name}
                        </p>
                      </div>

                      <div className="sg-mission-bottom">
                    <span>
                      {nextSession.creator_id === profile.id
                          ? "You’re hosting"
                          : "You joined"}
                    </span>

                        <Link href={`/sessions/${nextSession.id}`}>
                          Open mission
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </>
                ) : (
                    <div className="sg-mission-empty">
                      <div className="sg-mission-empty-icon">
                        <CalendarDays size={30} />
                      </div>

                      <h2>Your calendar is wide open.</h2>

                      <p>
                        Start the session your classmates are waiting for.
                      </p>

                      <Link href="/create-session">
                        Create the first one
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                )}
              </aside>
            </section>

            <section className="sg-course-runway dash-reveal">
              <div className="sg-course-intro">
              <span className="sg-section-kicker">
                <GraduationCap size={15} />
                Your semester
              </span>

                <h2>Course runway</h2>

                <p>
                  Jump straight into the communities that matter to you.
                </p>

                <svg
                    className="sg-course-arrow"
                    viewBox="0 0 180 65"
                    aria-hidden="true"
                >
                  <path d="M4 48C48 5 106 7 157 37" />
                  <path d="M137 19L160 39L132 48" />
                </svg>
              </div>

              {courses.length > 0 ? (
                  <div className="sg-course-deck">
                    {courses.map((course, index) => (
                        <Link
                            key={course}
                            href={`/courses/${encodeURIComponent(course)}`}
                            className="sg-course-card"
                        >
                    <span className="sg-course-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                          <span className="sg-course-card-icon">
                      <BookOpen size={20} />
                    </span>

                          <strong>{course}</strong>

                          <span className="sg-course-open">
                      Open course
                      <ArrowRight size={14} />
                    </span>
                        </Link>
                    ))}
                  </div>
              ) : (
                  <Link href="/profile" className="sg-course-empty">
                <span className="sg-course-empty-icon">
                  <Plus size={23} />
                </span>

                    <span>
                  <strong>Add your courses</strong>
                  <small>
                    Personalize your sessions and course communities.
                  </small>
                </span>

                    <ArrowRight size={18} />
                  </Link>
              )}
            </section>

            <section className="sg-lower-layout">
              <article className="sg-route-board dash-reveal">
                <div className="sg-section-heading">
                  <div>
                  <span className="sg-section-kicker">
                    <Zap size={14} />
                    Your study route
                  </span>

                    <h2>What’s coming up</h2>

                    <p>
                      Every stop between now and your next academic
                      comeback.
                    </p>
                  </div>

                  <Link href="/sessions" className="sg-text-link">
                    Browse more
                    <ArrowRight size={16} />
                  </Link>
                </div>

                {upcomingSessions.length > 0 ? (
                    <div className="sg-route-list">
                      {upcomingSessions.slice(0, 6).map((session, index) => {
                        const tone = getSessionTone(
                            session.start_time,
                            now,
                        );

                        return (
                            <Link
                                key={session.id}
                                href={`/sessions/${session.id}`}
                                className="sg-route-stop"
                            >
                              <div className="sg-route-date">
                                <span>{formatDayLabel(session.start_time)}</span>
                                <strong>
                                  {new Date(session.start_time).getDate()}
                                </strong>
                              </div>

                              <div className="sg-route-track">
                          <span
                              className={`sg-route-dot sg-route-dot--${tone}`}
                          />

                                {index < upcomingSessions.slice(0, 6).length - 1 && (
                                    <span className="sg-route-connector" />
                                )}
                              </div>

                              <div className="sg-route-content">
                                <div className="sg-route-topline">
                            <span className="sg-route-course">
                              {session.course_code}
                            </span>

                                  <span
                                      className={`sg-route-relative sg-route-relative--${tone}`}
                                  >
                              {getRelativeTime(
                                  session.start_time,
                                  now,
                              )}
                            </span>
                                </div>

                                <h3>{session.title}</h3>

                                <div className="sg-route-meta">
                            <span>
                              <Clock size={13} />
                              {formatSessionRange(session)}
                            </span>

                                  <span>
                              <MapPin size={13} />
                                    {session.location_name}
                            </span>
                                </div>
                              </div>

                              <div className="sg-route-role">
                          <span>
                            {session.creator_id === profile.id
                                ? "Hosting"
                                : "Joined"}
                          </span>

                                <ChevronRight size={18} />
                              </div>
                            </Link>
                        );
                      })}

                      {upcomingSessions.length > 6 && (
                          <Link href="/sessions" className="sg-route-more">
                            +{upcomingSessions.length - 6} more sessions on
                            your route
                            <ArrowRight size={15} />
                          </Link>
                      )}
                    </div>
                ) : (
                    <div className="sg-route-empty">
                      <div className="sg-route-empty-orbit">
                        <CalendarDays size={32} />
                      </div>

                      <div>
                        <h3>No upcoming stops yet.</h3>

                        <p>
                          Create a session and give your week somewhere to
                          go.
                        </p>
                      </div>

                      <Link href="/create-session">
                        Create session
                        <Plus size={16} />
                      </Link>
                    </div>
                )}
              </article>

              <aside className="sg-side-stack">
                <section className="sg-activity-card dash-reveal">
                  <div className="sg-activity-orbit" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>

                  <span className="sg-section-kicker sg-section-kicker--light">
                  <Sparkles size={14} />
                  Your impact
                </span>

                  <h2>
                    You’ve been part of{" "}
                    <strong>{allRelevantSessions.length}</strong> study
                    moments.
                  </h2>

                  <p>
                    Every session is one less student trying to figure it
                    all out alone.
                  </p>

                  <div className="sg-activity-mini-grid">
                    <div>
                      <strong>{createdSessions.length}</strong>
                      <span>Started by you</span>
                    </div>

                    <div>
                      <strong>{joinedSessions.length}</strong>
                      <span>You showed up</span>
                    </div>
                  </div>
                </section>

                <section
                    className={`sg-profile-note dash-reveal ${
                        profileCompletion === 100
                            ? "sg-profile-note--complete"
                            : ""
                    }`}
                >
                  <div className="sg-note-tape" aria-hidden="true" />

                  <div className="sg-profile-note-top">
                  <span>
                    {profileCompletion === 100
                        ? "Profile dialed in"
                        : "Tiny side quest"}
                  </span>

                    <strong>{profileCompletion}%</strong>
                  </div>

                  <div
                      className="sg-profile-progress"
                      aria-label={`Profile ${profileCompletion}% complete`}
                  >
                  <span
                      style={{
                        width: `${profileCompletion}%`,
                      }}
                  />
                  </div>

                  <div className="sg-profile-checks">
                    {profileChecks.map((item) => (
                        <div key={item.label}>
                          <CheckCircle2
                              size={15}
                              className={
                                item.complete
                                    ? "sg-check-complete"
                                    : "sg-check-incomplete"
                              }
                          />

                          <span>{item.label}</span>
                        </div>
                    ))}
                  </div>

                  <Link href="/profile">
                    {profileCompletion === 100
                        ? "View profile"
                        : "Finish profile"}
                    <ArrowRight size={15} />
                  </Link>
                </section>

                <section className="sg-memory-stack dash-reveal">
                  <div className="sg-memory-heading">
                    <div>
                    <span className="sg-section-kicker">
                      <Clock size={14} />
                      Recent memories
                    </span>

                      <h2>Past sessions</h2>
                    </div>

                    <span className="sg-memory-count">
                    {pastSessions.length}
                  </span>
                  </div>

                  {pastSessions.length > 0 ? (
                      <div className="sg-memory-list">
                        {pastSessions.slice(0, 3).map((session, index) => (
                            <Link
                                key={session.id}
                                href={`/sessions/${session.id}`}
                                className={`sg-memory-card sg-memory-card--${
                                    index + 1
                                }`}
                            >
                        <span className="sg-memory-date">
                          {formatShortDate(session.start_time)}
                        </span>

                              <strong>{session.title}</strong>

                              <span>{session.course_code}</span>

                              <ChevronRight size={17} />
                            </Link>
                        ))}
                      </div>
                  ) : (
                      <div className="sg-memory-empty">
                        <Clock size={23} />
                        <span>
                      Your completed sessions will collect here.
                    </span>
                      </div>
                  )}
                </section>
              </aside>
            </section>
          </div>
        </main>
      </>
  );
}

const dashboardStyles = `
  .sg-dashboard,
  .sg-dashboard *,
  .sg-loading,
  .sg-loading * {
    box-sizing: border-box;
  }

  .sg-dashboard,
  .sg-loading {
    --sg-indigo: #1B1B3A;
    --sg-indigo-soft: #292953;
    --sg-violet: #7C3AED;
    --sg-violet-dark: #5B21B6;
    --sg-violet-light: #EDE9FE;
    --sg-violet-faint: #F5F3FF;
    --sg-lilac: #C4B5FD;
    --sg-green: #10B981;
    --sg-green-light: #D1FAE5;
    --sg-amber: #F59E0B;
    --sg-amber-light: #FEF3C7;
    --sg-red: #EF4444;
    --sg-red-light: #FEE2E2;
    --sg-blue: #0EA5E9;
    --sg-blue-light: #E0F2FE;
    --sg-cream: #FFF9E8;
    --sg-background: #F5F4FB;
    --sg-surface: #FFFFFF;
    --sg-border: #E4E2F0;
    --sg-text: #1B1B3A;
    --sg-muted: #64748B;
    --sg-faint: #94A3B8;
  }

  .sg-dashboard {
    --dash-progress: 0;

    position: relative;
    min-height: 100vh;
    overflow: hidden;
    isolation: isolate;
    color: var(--sg-text);
    background:
      radial-gradient(
        circle at 50% -10%,
        rgba(167, 139, 250, 0.2),
        transparent 29rem
      ),
      var(--sg-background);
    padding: 20px 20px 100px;
  }

  .sg-background-grid {
    position: absolute;
    inset: 0;
    z-index: -5;
    opacity: 0.34;
    pointer-events: none;
    background-image:
      radial-gradient(
        circle,
        rgba(27, 27, 58, 0.16) 1px,
        transparent 1px
      );
    background-size: 26px 26px;
    mask-image:
      linear-gradient(
        to bottom,
        transparent,
        black 8%,
        black 90%,
        transparent
      );
  }

  .sg-background-blob {
    position: absolute;
    z-index: -4;
    border-radius: 999px;
    filter: blur(4px);
    pointer-events: none;
  }

  .sg-background-blob--one {
    width: 360px;
    height: 360px;
    top: 540px;
    right: -180px;
    background: rgba(16, 185, 129, 0.1);
  }

  .sg-background-blob--two {
    width: 460px;
    height: 460px;
    top: 1420px;
    left: -260px;
    background: rgba(124, 58, 237, 0.11);
  }

  .sg-journey-line {
    position: absolute;
    z-index: -2;
    top: 40px;
    left: 50%;
    width: min(1320px, 115vw);
    height: calc(100% - 80px);
    min-height: 2100px;
    transform: translateX(-50%);
    overflow: visible;
    pointer-events: none;
  }

  .sg-journey-shadow,
  .sg-journey-path {
    fill: none;
    vector-effect: non-scaling-stroke;
    stroke-linecap: round;
  }

  .sg-journey-shadow {
    stroke: rgba(124, 58, 237, 0.08);
    stroke-width: 6;
  }

  .sg-journey-path {
    stroke: rgba(124, 58, 237, 0.43);
    stroke-width: 2;
    stroke-dasharray: 1;
    stroke-dashoffset: calc(1 - var(--dash-progress));
  }

  .sg-dashboard-canvas {
    position: relative;
    z-index: 1;
    width: min(1180px, 100%);
    margin: 0 auto;
  }

  .sg-error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 18px;
    padding: 14px 18px;
    color: #991B1B;
    background: var(--sg-red-light);
    border: 1px solid #FCA5A5;
    border-radius: 16px;
    font-size: 13px;
    font-weight: 600;
  }

  .sg-error-banner button {
    flex-shrink: 0;
    border: 0;
    border-radius: 10px;
    padding: 8px 13px;
    color: white;
    background: var(--sg-red);
    font: inherit;
    cursor: pointer;
  }

  .sg-welcome-stage {
    position: relative;
    min-height: 430px;
    overflow: hidden;
    padding: 48px 48px 30px;
    color: white;
    background:
      linear-gradient(
        135deg,
        var(--sg-indigo) 0%,
        #24244F 58%,
        #312E81 100%
      );
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 42px 42px 22px 42px;
    box-shadow:
      0 30px 80px rgba(27, 27, 58, 0.22),
      inset 0 1px rgba(255, 255, 255, 0.08);
  }

  .sg-stage-grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.13;
    background-image:
      linear-gradient(
        rgba(255, 255, 255, 0.16) 1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.16) 1px,
        transparent 1px
      );
    background-size: 34px 34px;
    mask-image:
      radial-gradient(
        circle at 70% 40%,
        black,
        transparent 70%
      );
  }

  .sg-stage-glow {
    position: absolute;
    border-radius: 999px;
    pointer-events: none;
  }

  .sg-stage-glow--one {
    top: -160px;
    right: -70px;
    width: 420px;
    height: 420px;
    background: rgba(124, 58, 237, 0.37);
    filter: blur(12px);
  }

  .sg-stage-glow--two {
    bottom: -240px;
    left: 18%;
    width: 520px;
    height: 420px;
    background: rgba(14, 165, 233, 0.13);
    filter: blur(18px);
  }

  .sg-welcome-copy {
    position: relative;
    z-index: 2;
    width: min(650px, 64%);
  }

  .sg-eyebrow,
  .sg-section-kicker {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 12px;
    color: var(--sg-violet);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .sg-eyebrow {
    color: #DDD6FE;
  }

  .sg-welcome-copy h1 {
    max-width: 650px;
    margin: 0;
    font-size: clamp(42px, 6vw, 76px);
    font-weight: 850;
    letter-spacing: -0.065em;
    line-height: 0.95;
  }

  .sg-welcome-copy h1 span {
    display: block;
    margin-top: 9px;
    color: var(--sg-lilac);
  }

  .sg-welcome-description {
    max-width: 550px;
    margin: 24px 0 0;
    color: rgba(255, 255, 255, 0.66);
    font-size: 15px;
    line-height: 1.7;
  }

  .sg-profile-ticket {
    position: absolute;
    z-index: 3;
    top: 42px;
    right: 42px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 13px;
    width: 300px;
    padding: 17px;
    color: var(--sg-text);
    background:
      linear-gradient(
        145deg,
        rgba(255, 255, 255, 0.98),
        rgba(245, 243, 255, 0.96)
      );
    border: 1px solid rgba(255, 255, 255, 0.75);
    border-radius: 18px 18px 18px 6px;
    box-shadow: 0 18px 45px rgba(5, 5, 20, 0.28);
    text-decoration: none;
    transform: rotate(2.3deg);
    transition:
      transform 180ms ease,
      box-shadow 180ms ease;
  }

  .sg-profile-ticket:hover {
    transform: rotate(0deg) translateY(-4px);
    box-shadow: 0 24px 55px rgba(5, 5, 20, 0.34);
  }

  .sg-ticket-pin {
    position: absolute;
    top: -7px;
    left: 50%;
    width: 14px;
    height: 14px;
    border: 3px solid white;
    border-radius: 999px;
    background: var(--sg-violet);
    box-shadow: 0 3px 8px rgba(27, 27, 58, 0.3);
  }

  .sg-profile-avatar {
    display: grid;
    width: 48px;
    height: 48px;
    overflow: hidden;
    place-items: center;
    color: white;
    background: var(--sg-violet);
    border: 3px solid white;
    border-radius: 15px;
    font-size: 18px;
    font-weight: 800;
    box-shadow: 0 5px 14px rgba(27, 27, 58, 0.15);
  }

  .sg-profile-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .sg-profile-ticket-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .sg-ticket-label {
    color: var(--sg-violet);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .sg-profile-ticket-copy strong {
    overflow: hidden;
    margin-top: 2px;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sg-ticket-meta,
  .sg-ticket-submeta {
    overflow: hidden;
    color: var(--sg-muted);
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sg-ticket-submeta {
    margin-top: 2px;
    color: var(--sg-faint);
  }

  .sg-ticket-arrow {
    color: var(--sg-violet);
  }

  .sg-hand-arrow {
    position: absolute;
    z-index: 2;
    top: 124px;
    right: 275px;
    width: 150px;
    transform: rotate(-8deg);
  }

  .sg-hand-arrow path,
  .sg-course-arrow path {
    fill: none;
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .sg-hand-arrow {
    color: rgba(196, 181, 253, 0.7);
  }

  .sg-action-cluster {
    position: absolute;
    z-index: 3;
    right: 28px;
    bottom: 26px;
    left: 28px;
    display: grid;
    grid-template-columns: 1.25fr 1fr 0.82fr;
    gap: 12px;
  }

  .sg-action {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    min-height: 78px;
    padding: 15px 17px;
    color: var(--sg-text);
    background: white;
    border: 1px solid rgba(255, 255, 255, 0.72);
    border-radius: 18px;
    text-decoration: none;
    box-shadow: 0 13px 30px rgba(5, 5, 20, 0.2);
    transition:
      transform 160ms ease,
      box-shadow 160ms ease;
  }

  .sg-action:hover {
    transform: translateY(-5px) rotate(-0.5deg);
    box-shadow: 0 20px 38px rgba(5, 5, 20, 0.28);
  }

  .sg-action--primary {
    color: white;
    background:
      linear-gradient(
        135deg,
        var(--sg-violet),
        var(--sg-violet-dark)
      );
  }

  .sg-action--browse {
    background: var(--sg-cream);
    transform: rotate(-0.6deg);
  }

  .sg-action--browse:hover {
    transform: translateY(-5px) rotate(0deg);
  }

  .sg-action--live {
    background: var(--sg-green-light);
    transform: rotate(0.8deg);
  }

  .sg-action--live:hover {
    transform: translateY(-5px) rotate(0deg);
  }

  .sg-action-icon {
    display: grid;
    width: 45px;
    height: 45px;
    place-items: center;
    color: var(--sg-violet);
    background: var(--sg-violet-light);
    border-radius: 14px;
  }

  .sg-action--primary .sg-action-icon {
    color: white;
    background: rgba(255, 255, 255, 0.15);
  }

  .sg-action--live .sg-action-icon {
    color: #047857;
    background: rgba(255, 255, 255, 0.64);
  }

  .sg-action small,
  .sg-action strong {
    display: block;
  }

  .sg-action small {
    margin-bottom: 2px;
    color: var(--sg-muted);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .sg-action--primary small {
    color: rgba(255, 255, 255, 0.61);
  }

  .sg-action strong {
    font-size: 14px;
    letter-spacing: -0.02em;
  }

  .sg-action-arrow {
    transition: transform 160ms ease;
  }

  .sg-action:hover .sg-action-arrow {
    transform: translateX(4px);
  }

  .sg-live-action-dot {
    position: relative;
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: var(--sg-green);
  }

  .sg-live-action-dot::after {
    position: absolute;
    inset: -4px;
    content: "";
    border-radius: inherit;
    background: var(--sg-green);
    opacity: 0.3;
    animation: sg-pulse 1.5s ease-out infinite;
  }

  .sg-impact-ribbon {
    position: relative;
    z-index: 4;
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
    align-items: center;
    width: min(860px, calc(100% - 48px));
    min-height: 86px;
    margin: -8px auto 28px;
    padding: 14px 22px;
    background: rgba(255, 255, 255, 0.93);
    border: 1px solid var(--sg-border);
    border-radius: 20px;
    box-shadow: 0 15px 40px rgba(27, 27, 58, 0.1);
    backdrop-filter: blur(14px);
    transform: rotate(-0.45deg);
  }

  .sg-impact-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 11px;
    padding: 5px 10px;
  }

  .sg-impact-cell > span:last-child {
    display: flex;
    flex-direction: column;
  }

  .sg-impact-cell strong {
    font-size: 22px;
    letter-spacing: -0.04em;
    line-height: 1;
  }

  .sg-impact-cell small {
    margin-top: 4px;
    color: var(--sg-muted);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .sg-impact-icon {
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border-radius: 11px;
  }

  .sg-impact-icon--violet {
    color: var(--sg-violet);
    background: var(--sg-violet-light);
  }

  .sg-impact-icon--green {
    color: #047857;
    background: var(--sg-green-light);
  }

  .sg-impact-icon--amber {
    color: #B45309;
    background: var(--sg-amber-light);
  }

  .sg-impact-icon--blue {
    color: #0369A1;
    background: var(--sg-blue-light);
  }

  .sg-impact-divider {
    width: 1px;
    height: 36px;
    background: var(--sg-border);
  }

  .sg-pulse-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(290px, 0.7fr);
    gap: 20px;
    margin-bottom: 24px;
  }

  .sg-pulse-panel {
    position: relative;
    min-width: 0;
    overflow: hidden;
    padding: 30px;
    color: white;
    background:
      radial-gradient(
        circle at 52% 58%,
        rgba(124, 58, 237, 0.42),
        transparent 33%
      ),
      linear-gradient(
        145deg,
        #181830,
        var(--sg-indigo-soft)
      );
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px 46px 24px 46px;
    box-shadow: 0 22px 55px rgba(27, 27, 58, 0.17);
  }

  .sg-section-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 25px;
  }

  .sg-section-heading h2,
  .sg-course-intro h2,
  .sg-memory-heading h2 {
    margin: 0;
    font-size: clamp(23px, 3vw, 34px);
    letter-spacing: -0.045em;
    line-height: 1.05;
  }

  .sg-section-heading p,
  .sg-course-intro p {
    max-width: 500px;
    margin: 8px 0 0;
    color: var(--sg-muted);
    font-size: 13px;
    line-height: 1.6;
  }

  .sg-section-heading--light h2 {
    color: white;
  }

  .sg-section-heading--light p {
    color: rgba(255, 255, 255, 0.55);
  }

  .sg-section-heading--light .sg-section-kicker,
  .sg-section-kicker--light {
    color: var(--sg-lilac);
  }

  .sg-light-link,
  .sg-text-link {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 6px;
    padding: 9px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 750;
    text-decoration: none;
    transition:
      background 150ms ease,
      transform 150ms ease;
  }

  .sg-light-link {
    color: white;
    background: rgba(255, 255, 255, 0.09);
  }

  .sg-light-link:hover {
    background: rgba(255, 255, 255, 0.16);
    transform: translateX(2px);
  }

  .sg-text-link {
    color: var(--sg-violet);
    background: var(--sg-violet-faint);
  }

  .sg-text-link:hover {
    background: var(--sg-violet-light);
    transform: translateX(2px);
  }

  .sg-orbit-stage {
    position: relative;
    min-height: 425px;
    overflow: hidden;
  }

  .sg-orbit-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    border: 1px dashed rgba(196, 181, 253, 0.26);
    border-radius: 999px;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .sg-orbit-ring--outer {
    width: 88%;
    height: 80%;
    animation: sg-orbit-rotate 34s linear infinite;
  }

  .sg-orbit-ring--inner {
    width: 57%;
    height: 56%;
    border-style: solid;
    border-color: rgba(196, 181, 253, 0.15);
    animation: sg-orbit-rotate-reverse 24s linear infinite;
  }

  .sg-pulse-core {
    position: absolute;
    z-index: 3;
    top: 50%;
    left: 50%;
    display: flex;
    width: 175px;
    height: 175px;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: white;
    background:
      radial-gradient(
        circle at 35% 30%,
        #A78BFA,
        var(--sg-violet) 52%,
        #5B21B6
      );
    border: 7px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    box-shadow:
      0 0 0 13px rgba(124, 58, 237, 0.09),
      0 22px 55px rgba(0, 0, 0, 0.32);
    transform: translate(-50%, -50%);
  }

  .sg-pulse-core::before,
  .sg-pulse-core::after {
    position: absolute;
    content: "";
    border: 1px solid rgba(196, 181, 253, 0.34);
    border-radius: 999px;
    animation: sg-core-ripple 2.8s ease-out infinite;
  }

  .sg-pulse-core::before {
    inset: -22px;
  }

  .sg-pulse-core::after {
    inset: -43px;
    animation-delay: 1.1s;
  }

  .sg-core-radar {
    margin-bottom: 3px;
    opacity: 0.8;
  }

  .sg-pulse-core > strong {
    font-size: 39px;
    letter-spacing: -0.07em;
    line-height: 1;
  }

  .sg-pulse-core > span:not(.sg-core-radar) {
    margin-top: 4px;
    color: rgba(255, 255, 255, 0.66);
    font-size: 10px;
    font-weight: 750;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .sg-pulse-core > a {
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 12px;
    padding: 7px 10px;
    color: var(--sg-violet-dark);
    background: white;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 850;
    text-decoration: none;
    text-transform: uppercase;
  }

  .orbit-session {
    position: absolute;
    z-index: 4;
    display: flex;
    width: 190px;
    min-height: 112px;
    flex-direction: column;
    padding: 14px;
    color: var(--sg-text);
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.75);
    border-radius: 16px;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.28);
    text-decoration: none;
    backdrop-filter: blur(10px);
    transition:
      transform 160ms ease,
      box-shadow 160ms ease;
  }

  .orbit-session:hover {
    z-index: 6;
    box-shadow: 0 23px 50px rgba(0, 0, 0, 0.36);
  }

  .orbit-session--1 {
    top: 14px;
    left: 2px;
    transform: rotate(-2.5deg);
  }

  .orbit-session--1:hover {
    transform: rotate(0deg) translateY(-5px);
  }

  .orbit-session--2 {
    top: 20px;
    right: 2px;
    transform: rotate(2.2deg);
  }

  .orbit-session--2:hover {
    transform: rotate(0deg) translateY(-5px);
  }

  .orbit-session--3 {
    bottom: 14px;
    left: 18px;
    transform: rotate(1.8deg);
  }

  .orbit-session--3:hover {
    transform: rotate(0deg) translateY(-5px);
  }

  .orbit-session--4 {
    right: 20px;
    bottom: 5px;
    transform: rotate(-1.7deg);
  }

  .orbit-session--4:hover {
    transform: rotate(0deg) translateY(-5px);
  }

  .sg-orbit-live-label {
    display: inline-flex;
    width: fit-content;
    align-items: center;
    gap: 5px;
    margin-bottom: 7px;
    color: var(--sg-red);
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.11em;
  }

  .sg-orbit-live-label > span {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--sg-red);
    box-shadow: 0 0 0 4px var(--sg-red-light);
  }

  .orbit-session strong {
    overflow: hidden;
    font-size: 12px;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sg-orbit-course {
    width: fit-content;
    margin-top: 7px;
    padding: 3px 7px;
    color: var(--sg-violet);
    background: var(--sg-violet-light);
    border-radius: 999px;
    font-size: 8px;
    font-weight: 850;
  }

  .sg-orbit-location {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 4px;
    overflow: hidden;
    margin-top: auto;
    padding-top: 9px;
    color: var(--sg-muted);
    font-size: 9px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sg-orbit-overflow {
    position: absolute;
    z-index: 8;
    right: 4px;
    bottom: 42%;
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    color: white;
    background: var(--sg-violet);
    border: 3px solid var(--sg-indigo);
    border-radius: 999px;
    font-size: 10px;
    font-weight: 850;
    text-decoration: none;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
  }

  .sg-ghost-node {
    position: absolute;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 11px 14px;
    color: rgba(255, 255, 255, 0.46);
    background: rgba(255, 255, 255, 0.045);
    border: 1px dashed rgba(255, 255, 255, 0.16);
    border-radius: 13px;
    font-size: 10px;
    font-weight: 700;
  }

  .sg-ghost-node--one {
    top: 38px;
    left: 7%;
    transform: rotate(-4deg);
  }

  .sg-ghost-node--two {
    top: 52px;
    right: 6%;
    transform: rotate(3deg);
  }

  .sg-ghost-node--three {
    right: 11%;
    bottom: 35px;
    transform: rotate(-2deg);
  }

  .sg-next-mission {
    position: relative;
    display: flex;
    min-height: 100%;
    overflow: hidden;
    flex-direction: column;
    padding: 29px;
    background:
      linear-gradient(
        145deg,
        #FFF9E8,
        #FEF3C7
      );
    border: 1px solid #FDE68A;
    border-radius: 42px 20px 42px 20px;
    box-shadow: 0 18px 45px rgba(120, 82, 8, 0.12);
    transform: rotate(0.45deg);
  }

  .sg-mission-tape,
  .sg-note-tape {
    position: absolute;
    top: -9px;
    left: 50%;
    width: 84px;
    height: 25px;
    background: rgba(255, 255, 255, 0.57);
    border: 1px solid rgba(180, 131, 8, 0.1);
    transform: translateX(-50%) rotate(-2deg);
  }

  .sg-mission-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #92400E;
  }

  .sg-mission-heading span {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .sg-mission-date {
    display: grid;
    width: 92px;
    margin: 29px 0 22px;
    padding: 11px;
    place-items: center;
    color: white;
    background: var(--sg-indigo);
    border-radius: 16px 16px 16px 5px;
    box-shadow: 7px 8px 0 rgba(124, 58, 237, 0.18);
    transform: rotate(-3deg);
  }

  .sg-mission-date span {
    color: var(--sg-lilac);
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.14em;
  }

  .sg-mission-date strong {
    margin: 2px 0;
    font-size: 35px;
    letter-spacing: -0.07em;
    line-height: 1;
  }

  .sg-mission-date small {
    color: rgba(255, 255, 255, 0.62);
    font-size: 10px;
  }

  .sg-mission-course {
    display: inline-flex;
    padding: 5px 9px;
    color: #92400E;
    background: rgba(245, 158, 11, 0.17);
    border-radius: 999px;
    font-size: 9px;
    font-weight: 850;
  }

  .sg-mission-copy h2,
  .sg-mission-empty h2 {
    margin: 13px 0 17px;
    font-size: clamp(24px, 3vw, 34px);
    letter-spacing: -0.055em;
    line-height: 1.05;
  }

  .sg-mission-copy p {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 9px 0;
    color: #78520B;
    font-size: 12px;
    font-weight: 650;
  }

  .sg-mission-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 13px;
    margin-top: auto;
    padding-top: 24px;
  }

  .sg-mission-bottom > span {
    color: #92400E;
    font-size: 9px;
    font-weight: 850;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .sg-mission-bottom a,
  .sg-mission-empty a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 13px;
    color: white;
    background: var(--sg-indigo);
    border-radius: 12px;
    font-size: 11px;
    font-weight: 750;
    text-decoration: none;
    transition: transform 150ms ease;
  }

  .sg-mission-bottom a:hover,
  .sg-mission-empty a:hover {
    transform: translateY(-2px);
  }

  .sg-mission-empty {
    display: flex;
    flex: 1;
    align-items: flex-start;
    justify-content: center;
    flex-direction: column;
  }

  .sg-mission-empty-icon {
    display: grid;
    width: 62px;
    height: 62px;
    margin-bottom: 8px;
    place-items: center;
    color: #92400E;
    background: rgba(245, 158, 11, 0.15);
    border: 2px dashed rgba(146, 64, 14, 0.24);
    border-radius: 999px;
  }

  .sg-mission-empty p {
    margin: 0 0 23px;
    color: #78520B;
    font-size: 13px;
    line-height: 1.6;
  }

  .sg-course-runway {
    position: relative;
    display: grid;
    grid-template-columns: 230px minmax(0, 1fr);
    gap: 28px;
    overflow: hidden;
    margin-bottom: 24px;
    padding: 29px;
    background: rgba(255, 255, 255, 0.91);
    border: 1px solid var(--sg-border);
    border-radius: 22px 22px 44px 22px;
    box-shadow: 0 16px 44px rgba(27, 27, 58, 0.08);
    backdrop-filter: blur(12px);
  }

  .sg-course-intro {
    position: relative;
    padding: 7px 0 35px;
  }

  .sg-course-intro h2 {
    font-size: 28px;
  }

  .sg-course-arrow {
    position: absolute;
    bottom: -2px;
    left: 22px;
    width: 130px;
    color: var(--sg-violet);
    opacity: 0.45;
  }

  .sg-course-deck {
    display: grid;
    grid-template-columns: repeat(3, minmax(145px, 1fr));
    gap: 12px;
  }

  .sg-course-card {
    position: relative;
    display: flex;
    min-height: 148px;
    overflow: hidden;
    flex-direction: column;
    padding: 17px;
    color: var(--sg-text);
    background: var(--sg-violet-faint);
    border: 1px solid #DDD6FE;
    border-radius: 17px;
    text-decoration: none;
    transition:
      transform 170ms ease,
      box-shadow 170ms ease,
      background 170ms ease;
  }

  .sg-course-card:nth-child(3n + 2) {
    background: var(--sg-blue-light);
    border-color: #BAE6FD;
    transform: rotate(0.7deg);
  }

  .sg-course-card:nth-child(3n + 3) {
    background: var(--sg-green-light);
    border-color: #A7F3D0;
    transform: rotate(-0.7deg);
  }

  .sg-course-card:hover {
    z-index: 2;
    background: white;
    box-shadow: 0 16px 32px rgba(27, 27, 58, 0.13);
    transform: translateY(-6px) rotate(0deg);
  }

  .sg-course-number {
    position: absolute;
    top: 10px;
    right: 12px;
    color: rgba(27, 27, 58, 0.13);
    font-size: 28px;
    font-weight: 900;
    letter-spacing: -0.08em;
  }

  .sg-course-card-icon {
    display: grid;
    width: 42px;
    height: 42px;
    margin-bottom: 17px;
    place-items: center;
    color: var(--sg-violet);
    background: white;
    border-radius: 13px;
    box-shadow: 0 6px 15px rgba(27, 27, 58, 0.08);
  }

  .sg-course-card strong {
    font-size: 16px;
    letter-spacing: -0.025em;
  }

  .sg-course-open {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: auto;
    padding-top: 15px;
    color: var(--sg-muted);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .sg-course-empty {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 15px;
    min-height: 122px;
    padding: 19px;
    color: var(--sg-text);
    background: var(--sg-violet-faint);
    border: 2px dashed #C4B5FD;
    border-radius: 18px;
    text-decoration: none;
  }

  .sg-course-empty-icon {
    display: grid;
    width: 48px;
    height: 48px;
    place-items: center;
    color: white;
    background: var(--sg-violet);
    border-radius: 15px;
  }

  .sg-course-empty strong,
  .sg-course-empty small {
    display: block;
  }

  .sg-course-empty small {
    margin-top: 5px;
    color: var(--sg-muted);
    font-size: 11px;
  }

  .sg-lower-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.65fr);
    gap: 20px;
    align-items: start;
  }

  .sg-route-board {
    padding: 30px;
    background: rgba(255, 255, 255, 0.93);
    border: 1px solid var(--sg-border);
    border-radius: 38px 22px 38px 22px;
    box-shadow: 0 20px 50px rgba(27, 27, 58, 0.09);
    backdrop-filter: blur(12px);
  }

  .sg-route-list {
    display: flex;
    flex-direction: column;
  }

  .sg-route-stop {
    display: grid;
    grid-template-columns: 64px 28px minmax(0, 1fr) auto;
    gap: 10px;
    min-width: 0;
    padding: 13px 10px;
    color: var(--sg-text);
    border-radius: 16px;
    text-decoration: none;
    transition:
      background 150ms ease,
      transform 150ms ease;
  }

  .sg-route-stop:hover {
    background: var(--sg-violet-faint);
    transform: translateX(4px);
  }

  .sg-route-date {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    min-height: 62px;
    background: var(--sg-background);
    border: 1px solid var(--sg-border);
    border-radius: 13px;
  }

  .sg-route-date span {
    color: var(--sg-violet);
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.1em;
  }

  .sg-route-date strong {
    margin-top: 2px;
    font-size: 22px;
    letter-spacing: -0.06em;
  }

  .sg-route-track {
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  .sg-route-dot {
    position: relative;
    z-index: 2;
    width: 13px;
    height: 13px;
    margin-top: 24px;
    border: 3px solid white;
    border-radius: 999px;
    box-shadow: 0 0 0 2px var(--sg-border);
  }

  .sg-route-dot--live {
    background: var(--sg-red);
    box-shadow: 0 0 0 2px #FCA5A5;
  }

  .sg-route-dot--soon {
    background: var(--sg-amber);
    box-shadow: 0 0 0 2px #FCD34D;
  }

  .sg-route-dot--today {
    background: var(--sg-blue);
    box-shadow: 0 0 0 2px #7DD3FC;
  }

  .sg-route-dot--later {
    background: var(--sg-violet);
    box-shadow: 0 0 0 2px var(--sg-lilac);
  }

  .sg-route-connector {
    position: absolute;
    top: 35px;
    bottom: -49px;
    width: 2px;
    background:
      repeating-linear-gradient(
        to bottom,
        var(--sg-border) 0,
        var(--sg-border) 4px,
        transparent 4px,
        transparent 8px
      );
  }

  .sg-route-content {
    min-width: 0;
    padding: 5px 0;
  }

  .sg-route-topline {
    display: flex;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
  }

  .sg-route-course {
    padding: 4px 8px;
    color: var(--sg-violet);
    background: var(--sg-violet-light);
    border-radius: 999px;
    font-size: 8px;
    font-weight: 850;
  }

  .sg-route-relative {
    font-size: 9px;
    font-weight: 800;
  }

  .sg-route-relative--live {
    color: var(--sg-red);
  }

  .sg-route-relative--soon {
    color: #B45309;
  }

  .sg-route-relative--today {
    color: #0369A1;
  }

  .sg-route-relative--later {
    color: var(--sg-muted);
  }

  .sg-route-content h3 {
    overflow: hidden;
    margin: 8px 0;
    font-size: 14px;
    letter-spacing: -0.02em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sg-route-meta {
    display: flex;
    align-items: center;
    gap: 14px;
    color: var(--sg-muted);
    font-size: 9px;
    flex-wrap: wrap;
  }

  .sg-route-meta span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .sg-route-role {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--sg-faint);
  }

  .sg-route-role span {
    padding: 5px 8px;
    color: var(--sg-muted);
    background: var(--sg-background);
    border-radius: 999px;
    font-size: 8px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .sg-route-more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 12px;
    padding: 13px;
    color: var(--sg-violet);
    background: var(--sg-violet-faint);
    border-radius: 13px;
    font-size: 10px;
    font-weight: 750;
    text-decoration: none;
  }

  .sg-route-empty {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 18px;
    min-height: 150px;
    padding: 22px;
    background: var(--sg-violet-faint);
    border: 2px dashed #C4B5FD;
    border-radius: 20px;
  }

  .sg-route-empty-orbit {
    display: grid;
    width: 65px;
    height: 65px;
    place-items: center;
    color: var(--sg-violet);
    border: 2px dashed var(--sg-lilac);
    border-radius: 999px;
  }

  .sg-route-empty h3 {
    margin: 0 0 5px;
    font-size: 17px;
  }

  .sg-route-empty p {
    margin: 0;
    color: var(--sg-muted);
    font-size: 11px;
  }

  .sg-route-empty a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 13px;
    color: white;
    background: var(--sg-violet);
    border-radius: 12px;
    font-size: 10px;
    font-weight: 750;
    text-decoration: none;
  }

  .sg-side-stack {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 20px;
  }

  .sg-activity-card {
    position: relative;
    overflow: hidden;
    min-height: 255px;
    padding: 27px;
    color: white;
    background:
      linear-gradient(
        145deg,
        var(--sg-violet),
        #4C1D95
      );
    border-radius: 21px 42px 21px 42px;
    box-shadow: 0 20px 45px rgba(91, 33, 182, 0.22);
  }

  .sg-activity-orbit {
    position: absolute;
    top: -70px;
    right: -60px;
    width: 210px;
    height: 210px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
  }

  .sg-activity-orbit::before,
  .sg-activity-orbit::after {
    position: absolute;
    content: "";
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: inherit;
  }

  .sg-activity-orbit::before {
    inset: 25px;
  }

  .sg-activity-orbit::after {
    inset: 52px;
  }

  .sg-activity-orbit span {
    position: absolute;
    width: 9px;
    height: 9px;
    border: 2px solid var(--sg-violet);
    border-radius: 999px;
    background: white;
  }

  .sg-activity-orbit span:nth-child(1) {
    top: 37px;
    left: 30px;
  }

  .sg-activity-orbit span:nth-child(2) {
    right: 25px;
    bottom: 55px;
  }

  .sg-activity-orbit span:nth-child(3) {
    bottom: 17px;
    left: 65px;
  }

  .sg-activity-card h2 {
    position: relative;
    max-width: 300px;
    margin: 8px 0 13px;
    font-size: 26px;
    letter-spacing: -0.05em;
    line-height: 1.08;
  }

  .sg-activity-card h2 strong {
    color: #FDE68A;
  }

  .sg-activity-card > p {
    position: relative;
    margin: 0;
    color: rgba(255, 255, 255, 0.61);
    font-size: 11px;
    line-height: 1.65;
  }

  .sg-activity-mini-grid {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
    margin-top: 22px;
  }

  .sg-activity-mini-grid > div {
    display: flex;
    flex-direction: column;
    padding: 12px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 13px;
  }

  .sg-activity-mini-grid strong {
    font-size: 20px;
  }

  .sg-activity-mini-grid span {
    margin-top: 3px;
    color: rgba(255, 255, 255, 0.54);
    font-size: 8px;
    font-weight: 750;
    text-transform: uppercase;
  }

  .sg-profile-note {
    position: relative;
    padding: 24px;
    background: #FFF7D6;
    border: 1px solid #FDE68A;
    border-radius: 15px 15px 15px 35px;
    box-shadow: 0 13px 30px rgba(120, 82, 8, 0.1);
    transform: rotate(-0.65deg);
  }

  .sg-profile-note--complete {
    background: #ECFDF5;
    border-color: #A7F3D0;
  }

  .sg-note-tape {
    width: 72px;
    border-color: rgba(120, 82, 8, 0.08);
  }

  .sg-profile-note-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    color: #78350F;
  }

  .sg-profile-note--complete .sg-profile-note-top {
    color: #065F46;
  }

  .sg-profile-note-top span {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .sg-profile-note-top strong {
    font-size: 17px;
  }

  .sg-profile-progress {
    height: 7px;
    overflow: hidden;
    margin: 15px 0;
    background: rgba(120, 53, 15, 0.1);
    border-radius: 999px;
  }

  .sg-profile-progress span {
    display: block;
    height: 100%;
    background:
      linear-gradient(
        90deg,
        var(--sg-amber),
        #F97316
      );
    border-radius: inherit;
    transition: width 400ms ease;
  }

  .sg-profile-note--complete .sg-profile-progress span {
    background:
      linear-gradient(
        90deg,
        var(--sg-green),
        #34D399
      );
  }

  .sg-profile-checks {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .sg-profile-checks > div {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #78520B;
    font-size: 10px;
    font-weight: 650;
  }

  .sg-profile-note--complete .sg-profile-checks > div {
    color: #047857;
  }

  .sg-check-complete {
    color: var(--sg-green);
  }

  .sg-check-incomplete {
    color: rgba(120, 82, 11, 0.23);
  }

  .sg-profile-note > a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 17px;
    color: #92400E;
    font-size: 10px;
    font-weight: 850;
    text-decoration: none;
  }

  .sg-profile-note--complete > a {
    color: #047857;
  }

  .sg-memory-stack {
    padding: 24px;
    background: rgba(255, 255, 255, 0.93);
    border: 1px solid var(--sg-border);
    border-radius: 32px 17px 32px 17px;
    box-shadow: 0 16px 40px rgba(27, 27, 58, 0.08);
  }

  .sg-memory-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 17px;
  }

  .sg-memory-heading h2 {
    font-size: 21px;
  }

  .sg-memory-count {
    display: grid;
    width: 35px;
    height: 35px;
    place-items: center;
    color: var(--sg-violet);
    background: var(--sg-violet-light);
    border-radius: 12px;
    font-size: 12px;
    font-weight: 850;
  }

  .sg-memory-list {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .sg-memory-card {
    position: relative;
    display: grid;
    grid-template-columns: 45px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 12px;
    color: var(--sg-text);
    background: var(--sg-background);
    border: 1px solid var(--sg-border);
    border-radius: 13px;
    text-decoration: none;
    transition:
      transform 150ms ease,
      background 150ms ease;
  }

  .sg-memory-card:hover {
    z-index: 2;
    background: white;
    transform: translateX(4px) rotate(0deg);
  }

  .sg-memory-card--1 {
    transform: rotate(-0.5deg);
  }

  .sg-memory-card--2 {
    transform: rotate(0.7deg);
  }

  .sg-memory-card--3 {
    transform: rotate(-0.3deg);
  }

  .sg-memory-date {
    grid-row: 1 / 3;
    color: var(--sg-violet);
    font-size: 9px;
    font-weight: 850;
  }

  .sg-memory-card strong {
    overflow: hidden;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sg-memory-card > span:not(.sg-memory-date) {
    grid-column: 2;
    color: var(--sg-muted);
    font-size: 8px;
    font-weight: 750;
  }

  .sg-memory-card svg {
    grid-column: 3;
    grid-row: 1 / 3;
    color: var(--sg-faint);
  }

  .sg-memory-empty {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 17px;
    color: var(--sg-muted);
    background: var(--sg-background);
    border: 1px dashed var(--sg-border);
    border-radius: 14px;
    font-size: 10px;
    line-height: 1.5;
  }

  .sg-loading {
    display: flex;
    min-height: 70vh;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 18px;
    color: var(--sg-muted);
    background: var(--sg-background);
    font-size: 13px;
  }

  .sg-loading-orbit {
    position: relative;
    display: grid;
    width: 70px;
    height: 70px;
    place-items: center;
    border: 1px dashed var(--sg-lilac);
    border-radius: 999px;
    animation: sg-orbit-rotate 1.7s linear infinite;
  }

  .sg-loading-core {
    width: 26px;
    height: 26px;
    border-radius: 999px;
    background: var(--sg-violet);
    box-shadow: 0 0 0 8px var(--sg-violet-light);
  }

  .sg-loading-dot {
    position: absolute;
    top: -4px;
    left: calc(50% - 5px);
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: var(--sg-amber);
  }

  .sg-loading-link {
    color: var(--sg-violet);
    font-weight: 750;
    text-decoration: none;
  }

  .sg-dashboard a:focus-visible,
  .sg-dashboard button:focus-visible,
  .sg-loading a:focus-visible {
    outline: 3px solid rgba(124, 58, 237, 0.35);
    outline-offset: 3px;
  }

  @keyframes sg-pulse {
    0% {
      opacity: 0.35;
      transform: scale(1);
    }

    75%,
    100% {
      opacity: 0;
      transform: scale(2.4);
    }
  }

  @keyframes sg-core-ripple {
    0% {
      opacity: 0;
      transform: scale(0.85);
    }

    25% {
      opacity: 0.55;
    }

    100% {
      opacity: 0;
      transform: scale(1.15);
    }
  }

  @keyframes sg-orbit-rotate {
    to {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }

  @keyframes sg-orbit-rotate-reverse {
    to {
      transform: translate(-50%, -50%) rotate(-360deg);
    }
  }

  .sg-loading-orbit {
    animation-name: sg-loading-rotate;
  }

  @keyframes sg-loading-rotate {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1020px) {
    .sg-welcome-copy {
      width: 60%;
    }

    .sg-profile-ticket {
      width: 270px;
    }

    .sg-hand-arrow {
      display: none;
    }

    .sg-course-runway {
      grid-template-columns: 190px minmax(0, 1fr);
    }

    .sg-course-deck {
      grid-template-columns: repeat(2, minmax(145px, 1fr));
    }

    .sg-lower-layout {
      grid-template-columns: minmax(0, 1fr) 300px;
    }

    .orbit-session {
      width: 170px;
    }
  }

  @media (max-width: 860px) {
    .sg-welcome-stage {
      min-height: 590px;
    }

    .sg-welcome-copy {
      width: 100%;
      max-width: calc(100% - 290px);
    }

    .sg-action-cluster {
      grid-template-columns: 1fr 1fr;
    }

    .sg-action--primary {
      grid-column: 1 / -1;
    }

    .sg-pulse-layout,
    .sg-lower-layout {
      grid-template-columns: 1fr;
    }

    .sg-next-mission {
      min-height: 390px;
      transform: none;
    }

    .sg-course-runway {
      grid-template-columns: 1fr;
    }

    .sg-course-intro {
      padding-bottom: 0;
    }

    .sg-course-arrow {
      display: none;
    }

    .sg-side-stack {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .sg-memory-stack {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 680px) {
    .sg-dashboard {
      padding: 10px 12px 70px;
    }

    .sg-welcome-stage {
      min-height: 720px;
      padding: 31px 23px;
      border-radius: 30px 30px 17px 30px;
    }

    .sg-welcome-copy {
      max-width: none;
    }

    .sg-welcome-copy h1 {
      font-size: clamp(39px, 13vw, 60px);
    }

    .sg-welcome-description {
      font-size: 13px;
    }

    .sg-profile-ticket {
      top: 305px;
      right: 23px;
      left: 23px;
      width: auto;
      transform: rotate(-1deg);
    }

    .sg-action-cluster {
      right: 17px;
      bottom: 18px;
      left: 17px;
      grid-template-columns: 1fr;
      gap: 9px;
    }

    .sg-action--primary {
      grid-column: auto;
    }

    .sg-action {
      min-height: 67px;
      padding: 12px 14px;
    }

    .sg-action-icon {
      width: 39px;
      height: 39px;
    }

    .sg-impact-ribbon {
      grid-template-columns: 1fr 1fr;
      width: calc(100% - 24px);
      padding: 10px;
      transform: none;
    }

    .sg-impact-cell {
      justify-content: flex-start;
      padding: 11px;
    }

    .sg-impact-divider {
      display: none;
    }

    .sg-pulse-panel,
    .sg-route-board {
      padding: 22px 17px;
    }

    .sg-section-heading {
      flex-direction: column;
      margin-bottom: 20px;
    }

    .sg-orbit-stage {
      display: grid;
      min-height: auto;
      grid-template-columns: 1fr;
      gap: 10px;
      overflow: visible;
      padding-top: 8px;
    }

    .sg-orbit-ring {
      display: none;
    }

    .sg-pulse-core {
      position: relative;
      top: auto;
      left: auto;
      width: 150px;
      height: 150px;
      margin: 15px auto 25px;
      transform: none;
    }

    .orbit-session,
    .sg-ghost-node {
      position: relative;
      inset: auto;
      width: auto;
      min-height: auto;
      transform: none;
    }

    .sg-ghost-node {
      justify-content: center;
    }

    .sg-orbit-overflow {
      position: relative;
      right: auto;
      bottom: auto;
      margin: 0 auto;
    }

    .sg-course-runway {
      padding: 22px 17px;
    }

    .sg-course-deck {
      grid-template-columns: 1fr 1fr;
    }

    .sg-course-card {
      min-height: 135px;
    }

    .sg-route-stop {
      grid-template-columns: 50px 19px minmax(0, 1fr);
      padding: 10px 3px;
    }

    .sg-route-role {
      grid-column: 3;
      justify-content: flex-end;
      padding-bottom: 4px;
    }

    .sg-route-role span {
      display: none;
    }

    .sg-route-date {
      min-height: 54px;
    }

    .sg-route-content h3 {
      white-space: normal;
    }

    .sg-route-meta {
      flex-direction: column;
      align-items: flex-start;
      gap: 5px;
    }

    .sg-route-empty {
      grid-template-columns: 1fr;
      text-align: center;
    }

    .sg-route-empty-orbit,
    .sg-route-empty a {
      margin: 0 auto;
    }

    .sg-side-stack {
      display: flex;
    }
  }

  @media (max-width: 430px) {
    .sg-welcome-stage {
      min-height: 745px;
    }

    .sg-profile-ticket {
      top: 325px;
    }

    .sg-course-deck {
      grid-template-columns: 1fr;
    }

    .sg-course-card {
      min-height: 125px;
    }

    .sg-impact-cell strong {
      font-size: 19px;
    }

    .sg-impact-icon {
      width: 31px;
      height: 31px;
    }

    .sg-mission-bottom {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sg-dashboard *,
    .sg-loading * {
      scroll-behavior: auto !important;
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }

    .sg-journey-path {
      stroke-dashoffset: 0;
    }
  }
`;