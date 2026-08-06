"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
  Radio,
  Search,
} from "lucide-react";

import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import { supabase } from "@/lib/supabase";

import styles from "./dashboard.module.css";

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

function normalizeSessionRelation(
    relation: SessionMembership["study_sessions"],
): StudySession | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function deduplicateSessions(
    sessions: StudySession[],
): StudySession[] {
  const uniqueSessions = new Map<string, StudySession>();

  sessions.forEach((session) => {
    uniqueSessions.set(session.id, session);
  });

  return Array.from(uniqueSessions.values());
}

function formatDay(dateValue: string): string {
  return new Date(dateValue).toLocaleDateString([], {
    weekday: "short",
  });
}

function formatDateNumber(dateValue: string): string {
  return new Date(dateValue).toLocaleDateString([], {
    day: "numeric",
  });
}

function formatDateLabel(dateValue: string): string {
  const date = new Date(dateValue);
  const now = new Date();

  const startOfDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
  );

  const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
  );

  const dayDifference = Math.round(
      (startOfDate.getTime() - startOfToday.getTime()) /
      86_400_000,
  );

  if (dayDifference === 0) {
    return "Today";
  }

  if (dayDifference === 1) {
    return "Tomorrow";
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function formatTimeRange(session: StudySession): string {
  const start = new Date(session.start_time);
  const end = new Date(session.end_time);

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };

  return `${start.toLocaleTimeString(
      [],
      timeOptions,
  )} – ${end.toLocaleTimeString([], timeOptions)}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function getSessionStatus(
    session: StudySession,
    now: Date,
): {
  label: string;
  tone: "live" | "soon" | "standard";
} {
  const start = new Date(session.start_time);
  const end = new Date(session.end_time);
  const minutesUntilStart = Math.round(
      (start.getTime() - now.getTime()) / 60_000,
  );

  if (start <= now && end > now) {
    return {
      label: "Happening now",
      tone: "live",
    };
  }

  if (minutesUntilStart > 0 && minutesUntilStart <= 60) {
    return {
      label: `Starts in ${minutesUntilStart}m`,
      tone: "soon",
    };
  }

  return {
    label: formatDateLabel(session.start_time),
    tone: "standard",
  };
}

export default function DashboardPage() {
  const {
    profile,
    loading: profileLoading,
  } = useRequireOnboarding();

  const [createdSessions, setCreatedSessions] = useState<
      StudySession[]
  >([]);

  const [joinedSessions, setJoinedSessions] = useState<
      StudySession[]
  >([]);

  const [courses, setCourses] = useState<string[]>([]);

  const [dashboardLoading, setDashboardLoading] =
      useState(true);

  const [dashboardError, setDashboardError] = useState<
      string | null
  >(null);

  const [reloadKey, setReloadKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now());

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
        const [
          createdResult,
          joinedResult,
          coursesResult,
        ] = await Promise.all([
          supabase
              .from("study_sessions")
              .select("*")
              .eq("creator_id", profileId)
              .order("start_time", {
                ascending: true,
              }),

          supabase
              .from("session_members")
              .select(
                  "session_id, study_sessions(*)",
              )
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

        const created =
            (createdResult.data ?? []) as StudySession[];

        const memberships =
            (joinedResult.data ??
                []) as unknown as SessionMembership[];

        const joined = memberships
            .map((membership) =>
                normalizeSessionRelation(
                    membership.study_sessions,
                ),
            )
            .filter(
                (
                    session,
                ): session is StudySession =>
                    Boolean(
                        session &&
                        session.creator_id !== profileId,
                    ),
            );

        const courseCodes = Array.from(
            new Set(
                (coursesResult.data ?? [])
                    .map((course) =>
                        typeof course.course_code === "string"
                            ? course.course_code.trim()
                            : "",
                    )
                    .filter(Boolean),
            ),
        );

        if (cancelled) {
          return;
        }

        setCreatedSessions(created);
        setJoinedSessions(
            deduplicateSessions(joined),
        );
        setCourses(courseCodes);
      } catch (error) {
        console.error(
            "Unable to load dashboard:",
            error,
        );

        if (!cancelled) {
          setDashboardError(
              "Some dashboard information could not be loaded.",
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
  }, [profileId, reloadKey]);

  const now = useMemo(
      () => new Date(currentTime),
      [currentTime],
  );

  const myActiveSessions = useMemo(() => {
    return deduplicateSessions([
      ...createdSessions,
      ...joinedSessions,
    ])
        .filter(
            (session) =>
                new Date(session.end_time) > now,
        )
        .sort(
            (first, second) =>
                new Date(first.start_time).getTime() -
                new Date(second.start_time).getTime(),
        );
  }, [
    createdSessions,
    joinedSessions,
    now,
  ]);

  const liveSessions = useMemo(
      () =>
          myActiveSessions.filter((session) => {
            const start = new Date(session.start_time);
            const end = new Date(session.end_time);

            return start <= now && end > now;
          }),
      [myActiveSessions, now],
  );

  const upcomingSessions = useMemo(
      () =>
          myActiveSessions.filter(
              (session) =>
                  new Date(session.start_time) > now,
          ),
      [myActiveSessions, now],
  );

  const nextSession =
      liveSessions[0] ??
      upcomingSessions[0] ??
      null;

  const visibleSessions = myActiveSessions.slice(0, 3);

  const firstName =
      profile?.name?.trim().split(/\s+/)[0] ||
      "there";

  const profileComplete = Boolean(
      profile?.university &&
      profile?.major &&
      profile?.year,
  );

  if (
      profileLoading ||
      (profile && dashboardLoading)
  ) {
    return <DashboardLoading />;
  }

  if (!profile) {
    return (
        <main
            id="studygrouprr-dashboard"
            className={styles.loadingPage}
        >
          <div className={styles.loadingCard}>
            <strong>
              We could not find your profile.
            </strong>

            <Link href="/login">
              Return to sign in
            </Link>
          </div>
        </main>
    );
  }

  return (
      <main
          id="studygrouprr-dashboard"
          className={styles.page}
      >
        <div className={styles.shell}>
          {dashboardError && (
              <div
                  className={styles.errorBanner}
                  role="alert"
              >
                <span>{dashboardError}</span>

                <button
                    type="button"
                    onClick={() =>
                        setReloadKey(
                            (current) => current + 1,
                        )
                    }
                >
                  Try again
                </button>
              </div>
          )}

          <header className={styles.header}>
            <div className={styles.headerCopy}>
              <p>
                {getGreeting()}, {firstName}
              </p>

              <h1>Dashboard</h1>

              <span>
              {profile.university ||
                  "Your campus activity"}
            </span>
            </div>

            <div className={styles.actions}>
              <Link
                  href="/sessions"
                  className={styles.primaryAction}
              >
                <Search size={17} />
                Browse sessions
              </Link>

              <Link
                  href="/create-session"
                  className={styles.secondaryAction}
              >
                <Plus size={17} />
                Create session
              </Link>

              <Link
                  href="/live"
                  className={styles.tertiaryAction}
              >
                <Radio size={17} />
                Go live
              </Link>
            </div>
          </header>

          <section
              className={styles.summary}
              aria-label="Dashboard summary"
          >
            <SummaryItem
                icon={<Radio size={17} />}
                value={liveSessions.length}
                label="Live now"
            />

            <SummaryItem
                icon={<CalendarDays size={17} />}
                value={upcomingSessions.length}
                label="Coming up"
            />

            <SummaryItem
                icon={<BookOpen size={17} />}
                value={courses.length}
                label="My courses"
            />
          </section>

          <div className={styles.contentGrid}>
            <section className={styles.sessionsPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>My sessions</h2>

                  <p>
                    Sessions you joined or created.
                  </p>
                </div>

                <Link href="/sessions">
                  Browse campus
                  <ArrowRight size={15} />
                </Link>
              </div>

              {visibleSessions.length > 0 ? (
                  <div className={styles.sessionList}>
                    {visibleSessions.map((session) => (
                        <SessionRow
                            key={session.id}
                            session={session}
                            now={now}
                            role={
                              session.creator_id === profile.id
                                  ? "Hosting"
                                  : "Joined"
                            }
                        />
                    ))}

                    {myActiveSessions.length > 3 && (
                        <Link
                            href="/sessions"
                            className={styles.moreSessions}
                        >
                          View all{" "}
                          {myActiveSessions.length} sessions
                          <ArrowRight size={15} />
                        </Link>
                    )}
                  </div>
              ) : (
                  <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>
                  <CalendarDays size={23} />
                </span>

                    <div>
                      <h3>
                        Nothing on your schedule yet
                      </h3>

                      <p>
                        Browse campus sessions or create
                        one for your classmates.
                      </p>
                    </div>

                    <Link href="/sessions">
                      Find sessions
                      <ArrowRight size={15} />
                    </Link>
                  </div>
              )}
            </section>

            <aside className={styles.sidebar}>
              <section className={styles.nextCard}>
                <div className={styles.sideHeader}>
                  <div>
                    <p>Next up</p>
                    <h2>
                      {nextSession
                          ? "Your next session"
                          : "Nothing scheduled"}
                    </h2>
                  </div>

                  <Clock3 size={19} />
                </div>

                {nextSession ? (
                    <>
                  <span
                      className={
                        getSessionStatus(
                            nextSession,
                            now,
                        ).tone === "live"
                            ? styles.liveStatus
                            : styles.nextStatus
                      }
                  >
                    {
                      getSessionStatus(
                          nextSession,
                          now,
                      ).label
                    }
                  </span>

                      <Link
                          href={`/sessions/${nextSession.id}`}
                          className={styles.nextSession}
                      >
                    <span
                        className={styles.courseBadge}
                    >
                      {nextSession.course_code}
                    </span>

                        <strong>
                          {nextSession.title}
                        </strong>

                        <span>
                      <Clock3 size={14} />
                          {formatTimeRange(nextSession)}
                    </span>

                        <span>
                      <MapPin size={14} />
                          {nextSession.location_name}
                    </span>

                        <span
                            className={styles.openSession}
                        >
                      Open session
                      <ChevronRight size={16} />
                    </span>
                      </Link>
                    </>
                ) : (
                    <div className={styles.nextEmpty}>
                      <p>
                        Browse campus sessions or create
                        one for your course.
                      </p>

                      <Link href="/sessions">
                        Find a session
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                )}
              </section>

              <section className={styles.coursesCard}>
                <div className={styles.sideHeader}>
                  <div>
                    <p>Courses</p>
                    <h2>My courses</h2>
                  </div>

                  <BookOpen size={19} />
                </div>

                {courses.length > 0 ? (
                    <div className={styles.courseList}>
                      {courses.map((course) => (
                          <Link
                              key={course}
                              href={`/courses/${encodeURIComponent(
                                  course,
                              )}`}
                          >
                            {course}
                            <ChevronRight size={15} />
                          </Link>
                      ))}
                    </div>
                ) : (
                    <div className={styles.courseEmpty}>
                      <p>
                        Add courses to make session
                        discovery more relevant.
                      </p>

                      <Link href="/sessions">
                        Browse courses
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                )}
              </section>

              {!profileComplete && (
                  <section
                      className={styles.profileNotice}
                  >
                    <CheckCircle2 size={18} />

                    <div>
                      <strong>
                        Finish your profile
                      </strong>

                      <span>
                    Add your major and year so
                    classmates know who they are
                    meeting.
                  </span>
                    </div>

                    <Link
                        href="/profile"
                        aria-label="Finish profile"
                    >
                      <ChevronRight size={17} />
                    </Link>
                  </section>
              )}
            </aside>
          </div>
        </div>
      </main>
  );
}

function SummaryItem({
                       icon,
                       value,
                       label,
                     }: {
  icon: ReactNode;
  value: number;
  label: string;
}) {
  return (
      <div className={styles.summaryItem}>
      <span className={styles.summaryIcon}>
        {icon}
      </span>

        <div>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      </div>
  );
}

function SessionRow({
                      session,
                      now,
                      role,
                    }: {
  session: StudySession;
  now: Date;
  role: string;
}) {
  const status = getSessionStatus(
      session,
      now,
  );

  return (
      <Link
          href={`/sessions/${session.id}`}
          className={styles.sessionRow}
      >
        <div className={styles.dateBlock}>
          <span>{formatDay(session.start_time)}</span>
          <strong>
            {formatDateNumber(session.start_time)}
          </strong>
        </div>

        <div className={styles.sessionMain}>
          <div className={styles.sessionTopline}>
          <span className={styles.courseBadge}>
            {session.course_code}
          </span>

            <span
                className={[
                  styles.status,
                  status.tone === "live"
                      ? styles.statusLive
                      : "",
                  status.tone === "soon"
                      ? styles.statusSoon
                      : "",
                ]
                    .filter(Boolean)
                    .join(" ")}
            >
            {status.label}
          </span>
          </div>

          <h3>{session.title}</h3>

          <div className={styles.sessionMeta}>
          <span>
            <Clock3 size={13} />
            {formatTimeRange(session)}
          </span>

            <span>
            <MapPin size={13} />
              {session.location_name}
          </span>
          </div>
        </div>

        <div className={styles.sessionRole}>
          <span>{role}</span>
          <ChevronRight size={18} />
        </div>
      </Link>
  );
}

function DashboardLoading() {
  return (
      <main
          id="studygrouprr-dashboard"
          className={styles.loadingPage}
          role="status"
          aria-live="polite"
      >
        <div className={styles.loadingCard}>
          <strong>Loading your dashboard…</strong>

          <div
              className={styles.loadingLines}
              aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>
        </div>
      </main>
  );
}
