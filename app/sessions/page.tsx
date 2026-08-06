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
  Check,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
  Radio,
  Search,
  SlidersHorizontal,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import AlertModal from "@/components/AlertModal";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import { supabase } from "@/lib/supabase";

import styles from "./sessions.module.css";

type SessionStatus = "live" | "soon" | "upcoming";
type StatusFilter = "all" | SessionStatus;
type ScopeFilter = "all" | "mine";

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

type UniversityProfile = {
  university: string | null;
};

type SessionRow = Session & {
  profiles:
      | UniversityProfile
      | UniversityProfile[]
      | null;
};

type LiveProfile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  university: string | null;
  major: string | null;
  year: string | null;
};

type LiveStudentRow = {
  id: string;
  user_id: string;
  course_code: string;
  location_name: string;
  description: string | null;
  identification: string | null;
  created_at: string;
  profiles:
      | LiveProfile
      | LiveProfile[]
      | null;
};

type LiveStudent = Omit<
    LiveStudentRow,
    "profiles"
> & {
  profiles: LiveProfile | null;
};

type Friendship = {
  requester_id: string;
  receiver_id: string;
  status: string;
};

type AlertType =
    | "success"
    | "error"
    | "warning"
    | "info";

type AlertConfig = {
  title: string;
  message: string;
  type: AlertType;
};

type SessionStatusData = {
  label: string;
  urgency: SessionStatus;
};

function normalizeRelation<T>(
    relation: T | T[] | null,
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function getSessionStatus(
    session: Session,
    now: Date,
): SessionStatusData {
  const start = new Date(session.start_time);
  const end = new Date(session.end_time);

  if (now >= start && now < end) {
    return {
      label: "Happening now",
      urgency: "live",
    };
  }

  const differenceMinutes = Math.round(
      (start.getTime() - now.getTime()) / 60_000,
  );

  if (
      differenceMinutes > 0 &&
      differenceMinutes <= 30
  ) {
    return {
      label: `Starts in ${differenceMinutes}m`,
      urgency: "soon",
    };
  }

  return {
    label: formatDateTime(session.start_time),
    urgency: "upcoming",
  };
}

function formatDateTime(dateValue: string): string {
  const date = new Date(dateValue);
  const today = new Date();

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (date.toDateString() === today.toDateString()) {
    return `Today at ${time}`;
  }

  if (
      date.toDateString() === tomorrow.toDateString()
  ) {
    return `Tomorrow at ${time}`;
  }

  return `${date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })} at ${time}`;
}

function formatTimeRange(session: Session): string {
  const start = new Date(session.start_time);
  const end = new Date(session.end_time);

  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };

  return `${start.toLocaleTimeString(
      [],
      options,
  )} – ${end.toLocaleTimeString([], options)}`;
}

function formatDay(dateValue: string): string {
  return new Date(dateValue).toLocaleDateString([], {
    weekday: "short",
  });
}

function formatDayNumber(
    dateValue: string,
): string {
  return new Date(dateValue).toLocaleDateString([], {
    day: "numeric",
  });
}

function getInitial(
    name: string | null | undefined,
): string {
  return (
      name?.trim().charAt(0).toUpperCase() || "S"
  );
}

export default function SessionsPage() {
  const {
    profile,
    loading: onboardingLoading,
  } = useRequireOnboarding();

  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [loadError, setLoadError] = useState<
      string | null
  >(null);

  const [sessions, setSessions] = useState<
      Session[]
  >([]);

  const [liveStudents, setLiveStudents] =
      useState<LiveStudent[]>([]);

  const [attendeeCounts, setAttendeeCounts] =
      useState<Record<string, number>>({});

  const [myCourses, setMyCourses] = useState<
      string[]
  >([]);

  const [buddyIds, setBuddyIds] = useState<
      Set<string>
  >(new Set());

  const [
    pendingBuddyIds,
    setPendingBuddyIds,
  ] = useState<Set<string>>(new Set());

  const [
    requestingBuddyId,
    setRequestingBuddyId,
  ] = useState<string | null>(null);

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
      useState<StatusFilter>("all");

  const [scopeFilter, setScopeFilter] =
      useState<ScopeFilter>("all");

  const [
    liveCourseFilter,
    setLiveCourseFilter,
  ] = useState("all");

  const [currentTime, setCurrentTime] =
      useState(Date.now());

  const [alertOpen, setAlertOpen] =
      useState(false);

  const [alertConfig, setAlertConfig] =
      useState<AlertConfig>({
        title: "",
        message: "",
        type: "info",
      });

  const profileId = profile?.id;
  const university = profile?.university;

  function showAlert(
      title: string,
      message: string,
      type: AlertType = "info",
  ) {
    setAlertConfig({
      title,
      message,
      type,
    });

    setAlertOpen(true);
  }

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

    if (!university) {
      setLoadError(
          "Add your university to your profile before browsing campus sessions.",
      );
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadSessionsPage() {
      setLoading(true);
      setLoadError(null);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error(
              "You must be signed in to browse sessions.",
          );
        }

        const nowIso = new Date().toISOString();

        const twoHoursAgo = new Date(
            Date.now() - 2 * 60 * 60 * 1000,
        ).toISOString();

        const [
          coursesResult,
          friendshipsResult,
          sessionsResult,
          liveResult,
        ] = await Promise.all([
          supabase
              .from("user_courses")
              .select("course_code")
              .eq("user_id", profileId)
              .order("course_code"),

          supabase
              .from("friendships")
              .select(
                  "requester_id, receiver_id, status",
              )
              .or(
                  `requester_id.eq.${user.id},receiver_id.eq.${user.id}`,
              ),

          supabase
              .from("study_sessions")
              .select(
                  "*, profiles!study_sessions_creator_id_fkey(university)",
              )
              .gt("end_time", nowIso)
              .order("start_time", {
                ascending: true,
              }),

          supabase
              .from("live_study_status")
              .select(`
              id,
              user_id,
              course_code,
              location_name,
              description,
              identification,
              created_at,
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
              .order("created_at", {
                ascending: false,
              }),
        ]);

        const queryError =
            coursesResult.error ||
            friendshipsResult.error ||
            sessionsResult.error ||
            liveResult.error;

        if (queryError) {
          throw queryError;
        }

        const courseCodes = Array.from(
            new Set(
                (coursesResult.data ?? [])
                    .map((course) =>
                        typeof course.course_code ===
                        "string"
                            ? course.course_code.trim()
                            : "",
                    )
                    .filter(Boolean),
            ),
        );

        const acceptedIds = new Set<string>();
        const pendingIds = new Set<string>();

        (
            (friendshipsResult.data ??
                []) as Friendship[]
        ).forEach((friendship) => {
          const otherUserId =
              friendship.requester_id === user.id
                  ? friendship.receiver_id
                  : friendship.requester_id;

          if (friendship.status === "accepted") {
            acceptedIds.add(otherUserId);
          } else {
            pendingIds.add(otherUserId);
          }
        });

        const campusSessions = (
            (sessionsResult.data ??
                []) as unknown as SessionRow[]
        )
            .filter((session) => {
              const creatorProfile =
                  normalizeRelation(session.profiles);

              return (
                  creatorProfile?.university ===
                  university
              );
            })
            .map(
                ({
                   profiles: _profiles,
                   ...session
                 }): Session => session,
            );

        let counts: Record<string, number> = {};

        if (campusSessions.length > 0) {
          const membersResult = await supabase
              .from("session_members")
              .select("session_id")
              .in(
                  "session_id",
                  campusSessions.map(
                      (session) => session.id,
                  ),
              );

          if (membersResult.error) {
            throw membersResult.error;
          }

          counts = (
              membersResult.data ?? []
          ).reduce<Record<string, number>>(
              (result, member) => {
                result[member.session_id] =
                    (result[member.session_id] ||
                        0) + 1;

                return result;
              },
              {},
          );
        }

        const campusLiveStudents = (
            (liveResult.data ??
                []) as unknown as LiveStudentRow[]
        )
            .map(
                (student): LiveStudent => ({
                  ...student,
                  profiles: normalizeRelation(
                      student.profiles,
                  ),
                }),
            )
            .filter(
                (student) =>
                    student.profiles?.university ===
                    university,
            );

        if (cancelled) {
          return;
        }

        setCurrentUserId(user.id);
        setMyCourses(courseCodes);
        setBuddyIds(acceptedIds);
        setPendingBuddyIds(pendingIds);
        setSessions(campusSessions);
        setAttendeeCounts(counts);
        setLiveStudents(campusLiveStudents);
      } catch (error) {
        console.error(
            "Unable to load campus sessions:",
            error,
        );

        if (!cancelled) {
          setLoadError(
              error instanceof Error
                  ? error.message
                  : "Campus activity could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSessionsPage();

    return () => {
      cancelled = true;
    };
  }, [
    profileId,
    reloadKey,
    university,
  ]);

  const now = useMemo(
      () => new Date(currentTime),
      [currentTime],
  );

  const filteredSessions = useMemo(() => {
    const normalizedSearch = search
        .trim()
        .toLowerCase();

    const statusOrder: Record<
        SessionStatus,
        number
    > = {
      live: 0,
      soon: 1,
      upcoming: 2,
    };

    return sessions
        .filter((session) => {
          const status = getSessionStatus(
              session,
              now,
          );

          const matchesSearch =
              normalizedSearch.length === 0 ||
              session.title
                  .toLowerCase()
                  .includes(normalizedSearch) ||
              session.course_code
                  .toLowerCase()
                  .includes(normalizedSearch) ||
              session.location_name
                  .toLowerCase()
                  .includes(normalizedSearch) ||
              Boolean(
                  session.description
                      ?.toLowerCase()
                      .includes(normalizedSearch),
              );

          const matchesStatus =
              statusFilter === "all" ||
              status.urgency === statusFilter;

          const matchesScope =
              scopeFilter === "all" ||
              myCourses.includes(
                  session.course_code,
              );

          return (
              matchesSearch &&
              matchesStatus &&
              matchesScope
          );
        })
        .sort((first, second) => {
          const firstCourseMatch =
              myCourses.includes(
                  first.course_code,
              );

          const secondCourseMatch =
              myCourses.includes(
                  second.course_code,
              );

          if (
              scopeFilter === "all" &&
              firstCourseMatch !== secondCourseMatch
          ) {
            return firstCourseMatch ? -1 : 1;
          }

          const firstStatus = getSessionStatus(
              first,
              now,
          ).urgency;

          const secondStatus = getSessionStatus(
              second,
              now,
          ).urgency;

          if (
              statusOrder[firstStatus] !==
              statusOrder[secondStatus]
          ) {
            return (
                statusOrder[firstStatus] -
                statusOrder[secondStatus]
            );
          }

          return (
              new Date(
                  first.start_time,
              ).getTime() -
              new Date(
                  second.start_time,
              ).getTime()
          );
        });
  }, [
    myCourses,
    now,
    scopeFilter,
    search,
    sessions,
    statusFilter,
  ]);

  const liveCourses = useMemo(
      () =>
          Array.from(
              new Set(
                  liveStudents
                      .map(
                          (student) =>
                              student.course_code,
                      )
                      .filter(Boolean),
              ),
          ).sort(),
      [liveStudents],
  );

  const filteredLiveStudents = useMemo(
      () =>
          liveCourseFilter === "all"
              ? liveStudents
              : liveStudents.filter(
                  (student) =>
                      student.course_code ===
                      liveCourseFilter,
              ),
      [liveCourseFilter, liveStudents],
  );

  const liveSessionCount = useMemo(
      () =>
          sessions.filter(
              (session) =>
                  getSessionStatus(session, now)
                      .urgency === "live",
          ).length,
      [now, sessions],
  );

  const soonSessionCount = useMemo(
      () =>
          sessions.filter(
              (session) =>
                  getSessionStatus(session, now)
                      .urgency === "soon",
          ).length,
      [now, sessions],
  );

  const hasActiveFilters =
      search.trim().length > 0 ||
      statusFilter !== "all" ||
      scopeFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setScopeFilter("all");
  }

  async function sendFriendRequest(
      receiverId: string,
  ) {
    if (
        !currentUserId ||
        receiverId === currentUserId ||
        requestingBuddyId
    ) {
      return;
    }

    if (buddyIds.has(receiverId)) {
      showAlert(
          "Already connected",
          "This student is already one of your study buddies.",
      );
      return;
    }

    if (pendingBuddyIds.has(receiverId)) {
      showAlert(
          "Request pending",
          "A study buddy request already exists between you and this student.",
      );
      return;
    }

    setRequestingBuddyId(receiverId);

    try {
      const {
        data: existing,
        error: checkError,
      } = await supabase
          .from("friendships")
          .select("id, status")
          .or(
              `and(requester_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${currentUserId})`,
          )
          .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existing) {
        if (existing.status === "accepted") {
          setBuddyIds((current) => {
            const next = new Set(current);
            next.add(receiverId);
            return next;
          });
        } else {
          setPendingBuddyIds((current) => {
            const next = new Set(current);
            next.add(receiverId);
            return next;
          });
        }

        showAlert(
            "Connection already exists",
            existing.status === "accepted"
                ? "This student is already one of your study buddies."
                : "A study buddy request is already pending.",
        );

        return;
      }

      const { error } = await supabase
          .from("friendships")
          .insert({
            requester_id: currentUserId,
            receiver_id: receiverId,
            status: "pending",
          });

      if (error) {
        throw error;
      }

      setPendingBuddyIds((current) => {
        const next = new Set(current);
        next.add(receiverId);
        return next;
      });

      window.dispatchEvent(
          new Event("buddy-requests-changed"),
      );

      showAlert(
          "Request sent",
          "Your study buddy request is on its way.",
          "success",
      );
    } catch (error) {
      console.error(
          "Unable to send buddy request:",
          error,
      );

      showAlert(
          "Unable to send request",
          error instanceof Error
              ? error.message
              : "Please try again.",
          "error",
      );
    } finally {
      setRequestingBuddyId(null);
    }
  }

  function renderBuddyControl(
      studentId: string,
  ): ReactNode {
    if (studentId === currentUserId) {
      return (
          <span className={styles.buddyState}>
          <Check size={14} />
          You
        </span>
      );
    }

    if (buddyIds.has(studentId)) {
      return (
          <Link
              href="/buddies"
              className={styles.buddyState}
          >
            <Check size={14} />
            Buddy
          </Link>
      );
    }

    if (pendingBuddyIds.has(studentId)) {
      return (
          <span className={styles.buddyState}>
          <Clock3 size={14} />
          Pending
        </span>
      );
    }

    return (
        <button
            type="button"
            className={styles.addBuddyButton}
            disabled={
                requestingBuddyId === studentId
            }
            onClick={() =>
                void sendFriendRequest(studentId)
            }
        >
          <UserPlus size={14} />
          {requestingBuddyId === studentId
              ? "Sending…"
              : "Add buddy"}
        </button>
    );
  }

  if (loading || onboardingLoading) {
    return <SessionsLoading />;
  }

  if (!profile) {
    return (
        <main
            id="studygrouprr-sessions"
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
      <>
        <main
            id="studygrouprr-sessions"
            className={styles.page}
        >
          <div className={styles.shell}>
            {loadError && (
                <div
                    className={styles.errorBanner}
                    role="alert"
                >
                  <div>
                    <strong>
                      Sessions could not be loaded
                    </strong>
                    <span>{loadError}</span>
                  </div>

                  {university ? (
                      <button
                          type="button"
                          onClick={() =>
                              setReloadKey(
                                  (current) =>
                                      current + 1,
                              )
                          }
                      >
                        Try again
                      </button>
                  ) : (
                      <Link href="/profile">
                        Update profile
                      </Link>
                  )}
                </div>
            )}

            <header className={styles.header}>
              <div className={styles.headerCopy}>
                <p>
                  {university ||
                      "University required"}
                </p>

                <h1>Sessions</h1>

                <span>
                Find classmates studying now or
                join an upcoming meetup.
              </span>
              </div>

              <div className={styles.headerActions}>
                <Link
                    href="/create-session"
                    className={styles.primaryAction}
                >
                  <Plus size={17} />
                  Create session
                </Link>

                <Link
                    href="/live"
                    className={styles.secondaryAction}
                >
                  <Radio size={17} />
                  Go live
                </Link>
              </div>
            </header>

            <section
                className={styles.summary}
                aria-label="Campus session summary"
            >
              <SummaryItem
                  icon={<Radio size={17} />}
                  value={liveStudents.length}
                  label="Students live"
              />

              <SummaryItem
                  icon={<BookOpen size={17} />}
                  value={liveSessionCount}
                  label="Sessions live"
              />

              <SummaryItem
                  icon={<Clock3 size={17} />}
                  value={soonSessionCount}
                  label="Starting soon"
              />
            </section>

            <section
                className={styles.filterBar}
                aria-label="Session filters"
            >
              <div className={styles.searchControl}>
                <Search size={17} />

                <input
                    value={search}
                    onChange={(event) =>
                        setSearch(
                            event.target.value,
                        )
                    }
                    placeholder="Search course, title, or location"
                    aria-label="Search sessions"
                />

                {search && (
                    <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => setSearch("")}
                    >
                      <X size={15} />
                    </button>
                )}
              </div>

              <label className={styles.selectControl}>
                <SlidersHorizontal size={16} />

                <select
                    value={statusFilter}
                    onChange={(event) =>
                        setStatusFilter(
                            event.target
                                .value as StatusFilter,
                        )
                    }
                    aria-label="Filter sessions by status"
                >
                  <option value="all">
                    All times
                  </option>
                  <option value="live">
                    Happening now
                  </option>
                  <option value="soon">
                    Starting soon
                  </option>
                  <option value="upcoming">
                    Upcoming
                  </option>
                </select>
              </label>

              <div
                  className={styles.scopeControl}
                  aria-label="Course scope"
              >
                <button
                    type="button"
                    className={
                      scopeFilter === "all"
                          ? styles.scopeActive
                          : undefined
                    }
                    onClick={() =>
                        setScopeFilter("all")
                    }
                >
                  All campus
                </button>

                <button
                    type="button"
                    className={
                      scopeFilter === "mine"
                          ? styles.scopeActive
                          : undefined
                    }
                    onClick={() =>
                        setScopeFilter("mine")
                    }
                >
                  My courses
                </button>
              </div>

              {hasActiveFilters && (
                  <button
                      type="button"
                      className={styles.clearFilters}
                      onClick={clearFilters}
                  >
                    Reset
                  </button>
              )}
            </section>

            <div className={styles.contentGrid}>
              <section className={styles.sessionsPanel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2>Available sessions</h2>

                    <p>
                      Sorted by your courses and
                      start time.
                    </p>
                  </div>

                  <span>
                  {filteredSessions.length}{" "}
                    {filteredSessions.length === 1
                        ? "session"
                        : "sessions"}
                </span>
                </div>

                {filteredSessions.length > 0 ? (
                    <div className={styles.sessionList}>
                      {filteredSessions.map(
                          (session) => (
                              <SessionListItem
                                  key={session.id}
                                  session={session}
                                  now={now}
                                  attendeeCount={
                                      attendeeCounts[
                                          session.id
                                          ] || 0
                                  }
                                  courseMatch={myCourses.includes(
                                      session.course_code,
                                  )}
                              />
                          ),
                      )}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                  <span
                      className={styles.emptyIcon}
                  >
                    <Search size={23} />
                  </span>

                      <div>
                        <h3>
                          No sessions match these
                          filters
                        </h3>

                        <p>
                          Reset the filters or create
                          the study session you need.
                        </p>
                      </div>

                      <div
                          className={styles.emptyActions}
                      >
                        <button
                            type="button"
                            onClick={clearFilters}
                        >
                          Clear filters
                        </button>

                        <Link href="/create-session">
                          Create session
                          <ArrowRight size={15} />
                        </Link>
                      </div>
                    </div>
                )}
              </section>

              <aside className={styles.livePanel}>
                <div className={styles.liveHeader}>
                  <div>
                    <p>Live now</p>
                    <h2>Students studying</h2>
                  </div>

                  <span>
                  {filteredLiveStudents.length}
                </span>
                </div>

                {liveCourses.length > 0 && (
                    <label
                        className={styles.liveCourseFilter}
                    >
                      <BookOpen size={15} />

                      <select
                          value={liveCourseFilter}
                          onChange={(event) =>
                              setLiveCourseFilter(
                                  event.target.value,
                              )
                          }
                          aria-label="Filter live students by course"
                      >
                        <option value="all">
                          All courses
                        </option>

                        {liveCourses.map((course) => (
                            <option
                                key={course}
                                value={course}
                            >
                              {course}
                            </option>
                        ))}
                      </select>
                    </label>
                )}

                {filteredLiveStudents.length > 0 ? (
                    <div className={styles.liveList}>
                      {filteredLiveStudents
                          .slice(0, 6)
                          .map((student) => (
                              <LiveStudentCard
                                  key={student.id}
                                  student={student}
                                  buddyControl={renderBuddyControl(
                                      student.user_id,
                                  )}
                              />
                          ))}
                    </div>
                ) : (
                    <div className={styles.liveEmpty}>
                      <Radio size={23} />

                      <strong>
                        Nobody is live for this filter
                      </strong>

                      <p>
                        Go live when you start studying
                        so classmates can find you.
                      </p>

                      <Link href="/live">
                        Go live
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                )}

                {filteredLiveStudents.length > 6 && (
                    <div className={styles.liveMore}>
                      +
                      {filteredLiveStudents.length -
                          6}{" "}
                      more students active
                    </div>
                )}

                <Link
                    href="/live"
                    className={styles.liveFooterLink}
                >
                  Manage live status
                  <ChevronRight size={16} />
                </Link>
              </aside>
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

function SessionListItem({
                           session,
                           now,
                           attendeeCount,
                           courseMatch,
                         }: {
  session: Session;
  now: Date;
  attendeeCount: number;
  courseMatch: boolean;
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
            {formatDayNumber(
                session.start_time,
            )}
          </strong>
        </div>

        <div className={styles.sessionMain}>
          <div className={styles.sessionTopline}>
          <span className={styles.courseBadge}>
            {session.course_code}
          </span>

            {courseMatch && (
                <span
                    className={styles.courseMatch}
                >
              Your course
            </span>
            )}

            <span
                className={[
                  styles.status,
                  status.urgency === "live"
                      ? styles.statusLive
                      : "",
                  status.urgency === "soon"
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

          {session.description?.trim() && (
              <p className={styles.description}>
                {session.description}
              </p>
          )}

          <div className={styles.sessionMeta}>
          <span>
            <Clock3 size={13} />
            {formatTimeRange(session)}
          </span>

            <span>
            <MapPin size={13} />
              {session.location_name}
          </span>

            <span>
            <Users size={13} />
              {attendeeCount} joined
          </span>
          </div>
        </div>

        <span className={styles.openSession}>
        Open
        <ChevronRight size={17} />
      </span>
      </Link>
  );
}

function LiveStudentCard({
                           student,
                           buddyControl,
                         }: {
  student: LiveStudent;
  buddyControl: ReactNode;
}) {
  const studentProfile = student.profiles;

  return (
      <article className={styles.liveStudent}>
        <div className={styles.liveStudentTop}>
          <div className={styles.avatar}>
            {studentProfile?.avatar_url ? (
                <img
                    src={studentProfile.avatar_url}
                    alt=""
                    referrerPolicy="no-referrer"
                />
            ) : (
                <span>
              {getInitial(
                  studentProfile?.name,
              )}
            </span>
            )}
          </div>

          <div className={styles.studentIdentity}>
            <strong>
              {studentProfile?.name ||
                  "Campus student"}
            </strong>

            <span>
            {[
              studentProfile?.major,
              studentProfile?.year,
            ]
                .filter(Boolean)
                .join(" · ") || "Student"}
          </span>
          </div>

          <Link
              href={`/courses/${encodeURIComponent(
                  student.course_code,
              )}`}
              className={styles.liveCourse}
          >
            {student.course_code}
          </Link>
        </div>

        <div className={styles.liveLocation}>
          <MapPin size={14} />

          <span>{student.location_name}</span>
        </div>

        {student.description?.trim() && (
            <p className={styles.liveDescription}>
              {student.description}
            </p>
        )}

        {student.identification?.trim() && (
            <p className={styles.identification}>
              Find me: {student.identification}
            </p>
        )}

        <div className={styles.liveStudentFooter}>
          {buddyControl}
        </div>
      </article>
  );
}

function SessionsLoading() {
  return (
      <main
          id="studygrouprr-sessions"
          className={styles.loadingPage}
          role="status"
          aria-live="polite"
      >
        <div className={styles.loadingCard}>
          <strong>
            Loading campus sessions…
          </strong>

          <div
              className={styles.loadingRows}
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
