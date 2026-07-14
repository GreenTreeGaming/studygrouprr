"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { gsap } from "gsap";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Compass,
  GraduationCap,
  MapPin,
  Plus,
  Radio,
  Radar,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  UserPlus,
  X,
  Zap,
} from "lucide-react";

import AlertModal from "@/components/AlertModal";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import { supabase } from "@/lib/supabase";

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
  name: string;
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

type LiveStudent = Omit<LiveStudentRow, "profiles"> & {
  profiles: LiveProfile | null;
};

type Friendship = {
  requester_id: string;
  receiver_id: string;
  status: string;
};

type AlertType = "success" | "error" | "warning" | "info";

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

  if (now >= start && now <= end) {
    return {
      label: "Live now",
      urgency: "live",
    };
  }

  const differenceMinutes =
      (start.getTime() - now.getTime()) / 60_000;

  if (differenceMinutes > 0 && differenceMinutes <= 30) {
    return {
      label: "Starting soon",
      urgency: "soon",
    };
  }

  return {
    label: "Upcoming",
    urgency: "upcoming",
  };
}

function formatSessionTime(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const formattedTime = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (date.toDateString() === today.toDateString()) {
    return `Today · ${formattedTime}`;
  }

  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow · ${formattedTime}`;
  }

  return `${date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })} · ${formattedTime}`;
}

function formatSessionRange(session: Session): string {
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

function getRelativeStart(
    session: Session,
    now: Date,
): string {
  const start = new Date(session.start_time);

  if (
      now >= start &&
      now <= new Date(session.end_time)
  ) {
    return "Happening right now";
  }

  const differenceMinutes = Math.round(
      (start.getTime() - now.getTime()) / 60_000,
  );

  if (differenceMinutes <= 0) {
    return "Already started";
  }

  if (differenceMinutes < 60) {
    return `Starts in ${differenceMinutes}m`;
  }

  if (differenceMinutes < 24 * 60) {
    return `Starts in ${Math.round(
        differenceMinutes / 60,
    )}h`;
  }

  return formatSessionTime(session.start_time);
}

function getInitial(name: string | null | undefined): string {
  return name?.trim().charAt(0).toUpperCase() || "S";
}

export default function SessionsPage() {
  const {
    profile,
    loading: onboardingLoading,
  } = useRequireOnboarding();

  const pageRef = useRef<HTMLElement>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] =
      useState<string | null>(null);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [liveStudents, setLiveStudents] = useState<
      LiveStudent[]
  >([]);

  const [attendeeCounts, setAttendeeCounts] = useState<
      Record<string, number>
  >({});

  const [myCourses, setMyCourses] = useState<string[]>([]);
  const [buddyIds, setBuddyIds] = useState<Set<string>>(
      new Set(),
  );
  const [pendingBuddyIds, setPendingBuddyIds] = useState<
      Set<string>
  >(new Set());

  const [currentUserId, setCurrentUserId] = useState<
      string | null
  >(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
      useState<StatusFilter>("all");
  const [scopeFilter, setScopeFilter] =
      useState<ScopeFilter>("all");
  const [liveCourseFilter, setLiveCourseFilter] =
      useState("all");

  const [currentTime, setCurrentTime] = useState(() =>
      Date.now(),
  );

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] =
      useState<AlertConfig>({
        title: "",
        message: "",
        type: "info",
      });

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
    if (!profile) {
      return;
    }

    if (!profile.university) {
      setLoadError(
          "Add your university to your profile before browsing campus sessions.",
      );
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadCampusRadar() {
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

        if (!cancelled) {
          setCurrentUserId(user.id);
        }

        const nowIso = new Date().toISOString();
        const twoHoursAgo = new Date(
            Date.now() - 2 * 60 * 60 * 1000,
        ).toISOString();

        const [
          coursesResult,
          friendshipsResult,
          sessionsResult,
          membersResult,
          liveResult,
        ] = await Promise.all([
          supabase
              .from("user_courses")
              .select("course_code")
              .eq("user_id", profile.id)
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
              .from("session_members")
              .select("session_id"),

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
            membersResult.error ||
            liveResult.error;

        if (queryError) {
          throw queryError;
        }

        if (cancelled) {
          return;
        }

        const courseCodes = (
            coursesResult.data ?? []
        )
            .map((course) => course.course_code)
            .filter(
                (courseCode): courseCode is string =>
                    typeof courseCode === "string" &&
                    courseCode.trim().length > 0,
            );

        setMyCourses(
            Array.from(new Set(courseCodes)),
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

        setBuddyIds(acceptedIds);
        setPendingBuddyIds(pendingIds);

        const campusSessions = (
            (sessionsResult.data ??
                []) as unknown as SessionRow[]
        )
            .filter((session) => {
              const creatorProfile =
                  normalizeRelation(session.profiles);

              return (
                  creatorProfile?.university ===
                  profile.university
              );
            })
            .map(
                ({
                   profiles: _profiles,
                   ...session
                 }): Session => session,
            );

        setSessions(campusSessions);

        const counts: Record<string, number> = {};

        (membersResult.data ?? []).forEach(
            (member) => {
              counts[member.session_id] =
                  (counts[member.session_id] || 0) + 1;
            },
        );

        setAttendeeCounts(counts);

        const campusLiveStudents = (
            (liveResult.data ??
                []) as unknown as LiveStudentRow[]
        )
            .map((student): LiveStudent => {
              return {
                ...student,
                profiles: normalizeRelation(
                    student.profiles,
                ),
              };
            })
            .filter(
                (student) =>
                    student.profiles?.university ===
                    profile.university,
            );

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

    void loadCampusRadar();

    return () => {
      cancelled = true;
    };
  }, [profile]);

  const now = useMemo(
      () => new Date(currentTime),
      [currentTime],
  );

  const filteredSessions = useMemo(() => {
    const normalizedSearch = search
        .trim()
        .toLowerCase();

    return sessions.filter((session) => {
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
          session.description
              ?.toLowerCase()
              .includes(normalizedSearch);

      const matchesStatus =
          statusFilter === "all" ||
          status.urgency === statusFilter;

      const matchesScope =
          scopeFilter === "all" ||
          myCourses.includes(session.course_code);

      return (
          matchesSearch &&
          matchesStatus &&
          matchesScope
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

  const sessionsForMyCourses = useMemo(
      () =>
          filteredSessions
              .filter((session) =>
                  myCourses.includes(session.course_code),
              )
              .sort((first, second) => {
                const firstStatus = getSessionStatus(
                    first,
                    now,
                ).urgency;
                const secondStatus = getSessionStatus(
                    second,
                    now,
                ).urgency;

                const statusOrder: Record<
                    SessionStatus,
                    number
                > = {
                  live: 0,
                  soon: 1,
                  upcoming: 2,
                };

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
                    new Date(first.start_time).getTime() -
                    new Date(second.start_time).getTime()
                );
              }),
      [filteredSessions, myCourses, now],
  );

  const otherSessions = useMemo(
      () =>
          filteredSessions.filter(
              (session) =>
                  !myCourses.includes(session.course_code),
          ),
      [filteredSessions, myCourses],
  );

  const liveCourses = useMemo(
      () =>
          Array.from(
              new Set(
                  liveStudents
                      .map((student) => student.course_code)
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

  const closestSession =
      sessionsForMyCourses[0] ||
      filteredSessions[0] ||
      null;

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
    if (!currentUserId) {
      return;
    }

    if (receiverId === currentUserId) {
      return;
    }

    if (buddyIds.has(receiverId)) {
      showAlert(
          "Already Connected",
          "This student is already one of your study buddies.",
          "info",
      );
      return;
    }

    if (pendingBuddyIds.has(receiverId)) {
      showAlert(
          "Request Pending",
          "A study buddy request already exists between you and this student.",
          "info",
      );
      return;
    }

    const { data: existing, error: checkError } =
        await supabase
            .from("friendships")
            .select("id, status")
            .or(
                `and(requester_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${currentUserId})`,
            )
            .maybeSingle();

    if (checkError) {
      showAlert(
          "Unable to Check Connection",
          checkError.message,
          "error",
      );
      return;
    }

    if (existing) {
      setPendingBuddyIds((current) => {
        const next = new Set(current);
        next.add(receiverId);
        return next;
      });

      showAlert(
          "Already Connected",
          "You already have a pending or existing study buddy relationship.",
          "info",
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
      showAlert(
          "Something Went Wrong",
          error.message,
          "error",
      );
      return;
    }

    setPendingBuddyIds((current) => {
      const next = new Set(current);
      next.add(receiverId);
      return next;
    });

    showAlert(
        "Request Sent",
        "Your study buddy request is on its way.",
        "success",
    );
  }

  useEffect(() => {
    if (
        loading ||
        onboardingLoading ||
        !pageRef.current
    ) {
      return;
    }

    const prefersReducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const context = gsap.context(() => {
      gsap.from(".cr-reveal", {
        opacity: 0,
        y: 28,
        duration: 0.72,
        stagger: 0.08,
        ease: "power3.out",
      });

      gsap.from(".cr-signal-card", {
        opacity: 0,
        scale: 0.88,
        y: 18,
        duration: 0.6,
        stagger: 0.08,
        delay: 0.18,
        ease: "back.out(1.45)",
      });

      gsap.from(".cr-session-ticket", {
        opacity: 0,
        y: 25,
        rotate: -1,
        duration: 0.62,
        stagger: 0.055,
        delay: 0.25,
        ease: "power3.out",
      });
    }, pageRef);

    return () => {
      context.revert();
    };
  }, [
    filteredLiveStudents.length,
    filteredSessions.length,
    loading,
    onboardingLoading,
  ]);

  useEffect(() => {
    const page = pageRef.current;

    if (!page || loading) {
      return;
    }

    let animationFrameId = 0;

    const updateSignalTrail = () => {
      animationFrameId = 0;

      const bounds = page.getBoundingClientRect();
      const travelDistance =
          page.offsetHeight +
          window.innerHeight * 0.25;
      const distanceScrolled =
          window.innerHeight - bounds.top;

      const progress = Math.min(
          1,
          Math.max(
              0,
              distanceScrolled / travelDistance,
          ),
      );

      page.style.setProperty(
          "--cr-progress",
          progress.toFixed(4),
      );
    };

    const requestUpdate = () => {
      if (animationFrameId === 0) {
        animationFrameId =
            window.requestAnimationFrame(
                updateSignalTrail,
            );
      }
    };

    updateSignalTrail();

    window.addEventListener(
        "scroll",
        requestUpdate,
        {
          passive: true,
        },
    );
    window.addEventListener(
        "resize",
        requestUpdate,
    );

    return () => {
      window.removeEventListener(
          "scroll",
          requestUpdate,
      );
      window.removeEventListener(
          "resize",
          requestUpdate,
      );

      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(
            animationFrameId,
        );
      }
    };
  }, [
    filteredLiveStudents.length,
    filteredSessions.length,
    loading,
  ]);

  function renderBuddyControl(
      studentId: string,
  ): ReactNode {
    if (studentId === currentUserId) {
      return (
          <span className="cr-buddy-self">
          <Check size={14} />
          That’s you
        </span>
      );
    }

    if (buddyIds.has(studentId)) {
      return (
          <Link
              href="/buddies"
              className="cr-buddy-connected"
          >
            <Check size={14} />
            Study buddy
          </Link>
      );
    }

    if (pendingBuddyIds.has(studentId)) {
      return (
          <button
              type="button"
              className="cr-buddy-pending"
              disabled
          >
            <Clock size={14} />
            Request pending
          </button>
      );
    }

    return (
        <button
            type="button"
            className="cr-buddy-button"
            onClick={() =>
                void sendFriendRequest(studentId)
            }
        >
          <UserPlus size={14} />
          Add buddy
        </button>
    );
  }

  function renderSessionTicket(
      session: Session,
      index: number,
      courseMatch: boolean,
  ) {
    const status = getSessionStatus(
        session,
        now,
    );
    const attendeeCount =
        attendeeCounts[session.id] || 0;

    return (
        <article
            key={session.id}
            className={`cr-session-ticket cr-session-ticket--${status.urgency}`}
        >
          <div className="cr-ticket-corner">
            {String(index + 1).padStart(2, "0")}
          </div>

          <div className="cr-ticket-top">
            <div className="cr-ticket-badges">
            <span
                className={`cr-status-badge cr-status-badge--${status.urgency}`}
            >
              {status.urgency === "live" && (
                  <span className="cr-status-dot" />
              )}

              {status.label}
            </span>

              {courseMatch && (
                  <span className="cr-course-match">
                <Sparkles size={11} />
                Your course
              </span>
              )}
            </div>

            <Link
                href={`/courses/${encodeURIComponent(
                    session.course_code,
                )}`}
                className="cr-ticket-course"
            >
              {session.course_code}
            </Link>
          </div>

          <div className="cr-ticket-main">
            <h3>{session.title}</h3>

            <p className="cr-ticket-description">
              {session.description?.trim() ||
                  "No description yet — mystery study session energy."}
            </p>
          </div>

          <div className="cr-ticket-route">
            <div className="cr-route-node">
            <span className="cr-route-icon">
              <Clock size={15} />
            </span>

              <span>
              <small>When</small>
              <strong>
                {formatSessionTime(
                    session.start_time,
                )}
              </strong>
            </span>
            </div>

            <div
                className="cr-route-dashes"
                aria-hidden="true"
            />

            <div className="cr-route-node">
            <span className="cr-route-icon">
              <MapPin size={15} />
            </span>

              <span>
              <small>Where</small>
              <strong>
                {session.location_name}
              </strong>
            </span>
            </div>
          </div>

          <div className="cr-ticket-footer">
            <div className="cr-ticket-attendees">
              <div
                  className="cr-avatar-stack"
                  aria-hidden="true"
              >
                <span />
                <span />
                <span />
              </div>

              <span>
              {attendeeCount} joined
            </span>
            </div>

            <Link
                href={`/sessions/${session.id}`}
                className="cr-open-ticket"
            >
              Open meetup
              <ArrowRight size={15} />
            </Link>
          </div>
        </article>
    );
  }

  if (loading || onboardingLoading) {
    return (
        <>
          <style>{pageStyles}</style>

          <main className="cr-loading">
            <div
                className="cr-loading-radar"
                aria-hidden="true"
            >
              <span className="cr-loading-sweep" />
              <span className="cr-loading-ping cr-loading-ping--one" />
              <span className="cr-loading-ping cr-loading-ping--two" />

              <Radar size={28} />
            </div>

            <p>Scanning campus signals…</p>
          </main>
        </>
    );
  }

  if (!profile) {
    return (
        <>
          <style>{pageStyles}</style>

          <main className="cr-loading">
            <p>
              We could not find your StudyGrouprr
              profile.
            </p>

            <Link
                href="/login"
                className="cr-loading-link"
            >
              Return to login
            </Link>
          </main>
        </>
    );
  }

  return (
      <>
        <style>{pageStyles}</style>

        <main ref={pageRef} className="cr-root">
          <div
              className="cr-background-grid"
              aria-hidden="true"
          />

          <div className="cr-background-glow cr-background-glow--one" />
          <div className="cr-background-glow cr-background-glow--two" />

          <svg
              className="cr-signal-trail"
              viewBox="0 0 1200 2100"
              preserveAspectRatio="none"
              aria-hidden="true"
          >
            <path
                className="cr-signal-trail-shadow"
                d="M80 50C360 160 75 390 280 545C485 700 1050 585 1030 890C1010 1195 330 1050 415 1370C500 1690 1060 1550 1100 2050"
            />

            <path
                className="cr-signal-trail-path"
                pathLength="1"
                d="M80 50C360 160 75 390 280 545C485 700 1050 585 1030 890C1010 1195 330 1050 415 1370C500 1690 1060 1550 1100 2050"
            />
          </svg>

          <div className="cr-canvas">
            {loadError && (
                <div
                    className="cr-error-banner"
                    role="alert"
                >
                  <div>
                    <strong>
                      Radar interference
                    </strong>

                    <span>{loadError}</span>
                  </div>

                  <button
                      type="button"
                      onClick={() =>
                          window.location.reload()
                      }
                  >
                    Try again
                  </button>
                </div>
            )}

            <section className="cr-hero cr-reveal">
              <div
                  className="cr-hero-grid"
                  aria-hidden="true"
              />

              <div className="cr-hero-copy">
              <span className="cr-eyebrow">
                <Radio size={14} />
                Campus radar ·{" "}
                {profile.university}
              </span>

                <h1>
                  Campus is
                  <span>talking.</span>
                </h1>

                <p>
                  Find the table with your name on
                  it. Discover classmates studying
                  your courses, sessions starting
                  nearby, and students who are
                  already locked in.
                </p>

                <div className="cr-hero-actions">
                  <Link
                      href="/create-session"
                      className="cr-create-button"
                  >
                  <span>
                    <Plus
                        size={20}
                        strokeWidth={2.5}
                    />
                  </span>

                    Start a signal
                    <ArrowRight size={17} />
                  </Link>

                  <Link
                      href="/live"
                      className="cr-live-button"
                  >
                    <Radio size={17} />
                    Go live
                  </Link>
                </div>
              </div>

              <div
                  className="cr-radar-scene"
                  aria-label={`${liveStudents.length} students studying live`}
              >
                <div className="cr-radar-surface">
                  <div className="cr-radar-axis cr-radar-axis--horizontal" />
                  <div className="cr-radar-axis cr-radar-axis--vertical" />

                  <div className="cr-radar-ring cr-radar-ring--one" />
                  <div className="cr-radar-ring cr-radar-ring--two" />
                  <div className="cr-radar-ring cr-radar-ring--three" />

                  <div className="cr-radar-sweep" />

                  <div className="cr-radar-core">
                    <Radar size={25} />

                    <strong>
                      {liveStudents.length}
                    </strong>

                    <span>
                    live student
                      {liveStudents.length === 1
                          ? ""
                          : "s"}
                  </span>
                  </div>

                  <span className="cr-radar-blip cr-radar-blip--one">
                  <i />
                </span>

                  <span className="cr-radar-blip cr-radar-blip--two">
                  <i />
                </span>

                  <span className="cr-radar-blip cr-radar-blip--three">
                  <i />
                </span>

                  <span className="cr-radar-blip cr-radar-blip--four">
                  <i />
                </span>
                </div>

                <div className="cr-radar-note">
                  <span className="cr-note-pin" />

                  <strong>
                    {liveStudents.length > 0
                        ? "Signals detected"
                        : "Radar is quiet"}
                  </strong>

                  <p>
                    {liveStudents.length > 0
                        ? `${liveStudents.length} student${
                            liveStudents.length === 1
                                ? " is"
                                : "s are"
                        } studying around campus.`
                        : "Be the first person to light up campus."}
                  </p>
                </div>
              </div>

              <div className="cr-campus-readout">
                <div>
                <span className="cr-readout-icon cr-readout-icon--green">
                  <Radio size={17} />
                </span>

                  <span>
                  <strong>
                    {liveStudents.length}
                  </strong>
                  <small>
                    Students live
                  </small>
                </span>
                </div>

                <span className="cr-readout-divider" />

                <div>
                <span className="cr-readout-icon cr-readout-icon--red">
                  <Zap size={17} />
                </span>

                  <span>
                  <strong>
                    {liveSessionCount}
                  </strong>
                  <small>
                    Sessions live
                  </small>
                </span>
                </div>

                <span className="cr-readout-divider" />

                <div>
                <span className="cr-readout-icon cr-readout-icon--amber">
                  <Clock size={17} />
                </span>

                  <span>
                  <strong>
                    {soonSessionCount}
                  </strong>
                  <small>
                    Starting soon
                  </small>
                </span>
                </div>

                <span className="cr-readout-divider" />

                <div>
                <span className="cr-readout-icon cr-readout-icon--violet">
                  <BookOpen size={17} />
                </span>

                  <span>
                  <strong>
                    {sessions.length}
                  </strong>
                  <small>
                    Campus meetups
                  </small>
                </span>
                </div>
              </div>
            </section>

            <section className="cr-live-zone cr-reveal">
              <div className="cr-section-heading cr-section-heading--light">
                <div>
                <span className="cr-section-kicker">
                  <Radio size={14} />
                  Live transmissions
                </span>

                  <h2>
                    Already locked in.
                  </h2>

                  <p>
                    These students are studying
                    around campus right now.
                  </p>
                </div>

                {liveCourses.length > 0 && (
                    <div className="cr-live-filter">
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

                      <ChevronRight size={14} />
                    </div>
                )}
              </div>

              {filteredLiveStudents.length ===
              0 ? (
                  <div className="cr-live-empty">
                    <div className="cr-empty-radar">
                      <Radio size={32} />
                      <span />
                      <span />
                    </div>

                    <div>
                      <h3>
                        No live signals found.
                      </h3>

                      <p>
                        Try another course or become
                        the first active student on
                        campus.
                      </p>
                    </div>

                    <Link href="/live">
                      Go live
                      <ArrowRight size={16} />
                    </Link>
                  </div>
              ) : (
                  <div className="cr-live-deck">
                    {filteredLiveStudents
                        .slice(0, 8)
                        .map((student, index) => {
                          const studentProfile =
                              student.profiles;

                          return (
                              <article
                                  key={student.id}
                                  className={`cr-signal-card cr-signal-card--${
                                      (index % 4) + 1
                                  }`}
                              >
                                <div className="cr-signal-card-top">
                          <span className="cr-transmission-label">
                            <span />
                            LIVE
                          </span>

                                  <Link
                                      href={`/courses/${encodeURIComponent(
                                          student.course_code,
                                      )}`}
                                      className="cr-signal-course"
                                  >
                                    {student.course_code}
                                  </Link>
                                </div>

                                <div className="cr-student-identity">
                                  <div className="cr-student-avatar">
                                    {studentProfile?.avatar_url ? (
                                        <img
                                            src={
                                              studentProfile.avatar_url
                                            }
                                            alt=""
                                        />
                                    ) : (
                                        <span>
                                {getInitial(
                                    studentProfile?.name,
                                )}
                              </span>
                                    )}
                                  </div>

                                  <div>
                                    <h3>
                                      {studentProfile?.name ||
                                          "Campus student"}
                                    </h3>

                                    <p>
                                      {[
                                            studentProfile?.major,
                                            studentProfile?.year,
                                          ]
                                              .filter(Boolean)
                                              .join(" · ") ||
                                          profile.university}
                                    </p>
                                  </div>
                                </div>

                                <div className="cr-live-location">
                          <span>
                            <MapPin size={14} />
                          </span>

                                  <div>
                                    <small>
                                      Broadcasting from
                                    </small>

                                    <strong>
                                      {
                                        student.location_name
                                      }
                                    </strong>
                                  </div>
                                </div>

                                {student.description && (
                                    <div className="cr-signal-message">
                                      <small>
                                        Currently studying
                                      </small>

                                      <p>
                                        {
                                          student.description
                                        }
                                      </p>
                                    </div>
                                )}

                                {student.identification && (
                                    <div className="cr-find-me-note">
                                      <Compass size={14} />

                                      <span>
                              {
                                student.identification
                              }
                            </span>
                                    </div>
                                )}

                                <div className="cr-signal-card-footer">
                                  {renderBuddyControl(
                                      student.user_id,
                                  )}
                                </div>
                              </article>
                          );
                        })}
                  </div>
              )}

              {filteredLiveStudents.length > 8 && (
                  <div className="cr-live-overflow">
                    +{filteredLiveStudents.length - 8}{" "}
                    more campus signals
                  </div>
              )}
            </section>

            <section className="cr-discovery-zone">
              <aside className="cr-command-console cr-reveal">
                <div className="cr-console-top">
                <span>
                  <SlidersHorizontal size={15} />
                  Signal controls
                </span>

                  {hasActiveFilters && (
                      <button
                          type="button"
                          onClick={clearFilters}
                      >
                        <X size={13} />
                        Reset
                      </button>
                  )}
                </div>

                <label className="cr-search-control">
                  <Search size={18} />

                  <input
                      value={search}
                      onChange={(event) =>
                          setSearch(event.target.value)
                      }
                      placeholder="Course, title, or location…"
                  />

                  {search && (
                      <button
                          type="button"
                          onClick={() => setSearch("")}
                          aria-label="Clear search"
                      >
                        <X size={15} />
                      </button>
                  )}
                </label>

                <div className="cr-filter-group">
                <span className="cr-filter-label">
                  Signal type
                </span>

                  <div className="cr-filter-options">
                    {(
                        [
                          ["all", "Everything"],
                          ["live", "Live now"],
                          ["soon", "Starting soon"],
                          ["upcoming", "Upcoming"],
                        ] as const
                    ).map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            className={
                              statusFilter === value
                                  ? "cr-filter-chip cr-filter-chip--active"
                                  : "cr-filter-chip"
                            }
                            onClick={() =>
                                setStatusFilter(value)
                            }
                        >
                          {value === "live" && (
                              <span className="cr-filter-live-dot" />
                          )}

                          {label}
                        </button>
                    ))}
                  </div>
                </div>

                <div className="cr-filter-group">
                <span className="cr-filter-label">
                  Course match
                </span>

                  <div className="cr-scope-switch">
                    <button
                        type="button"
                        className={
                          scopeFilter === "all"
                              ? "cr-scope-active"
                              : ""
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
                              ? "cr-scope-active"
                              : ""
                        }
                        onClick={() =>
                            setScopeFilter("mine")
                        }
                    >
                      My courses
                    </button>
                  </div>
                </div>

                <div className="cr-console-result">
                <span>
                  Radar result
                </span>

                  <strong>
                    {filteredSessions.length}
                  </strong>

                  <small>
                    session
                    {filteredSessions.length === 1
                        ? ""
                        : "s"}{" "}
                    detected
                  </small>
                </div>

                <Link
                    href="/create-session"
                    className="cr-console-create"
                >
                  <Plus
                      size={17}
                      strokeWidth={2.5}
                  />
                  Create your own signal
                </Link>
              </aside>

              <div className="cr-session-results">
                {closestSession && (
                    <section className="cr-closest-signal cr-reveal">
                      <div className="cr-closest-radar">
                        <span />
                        <span />
                        <MapPin size={23} />
                      </div>

                      <div className="cr-closest-copy">
                    <span>
                      Strongest signal
                    </span>

                        <h2>
                          {closestSession.title}
                        </h2>

                        <div>
                      <span>
                        <BookOpen size={13} />
                        {
                          closestSession.course_code
                        }
                      </span>

                          <span>
                        <MapPin size={13} />
                            {
                              closestSession.location_name
                            }
                      </span>

                          <span>
                        <Clock size={13} />
                            {getRelativeStart(
                                closestSession,
                                now,
                            )}
                      </span>
                        </div>
                      </div>

                      <Link
                          href={`/sessions/${closestSession.id}`}
                      >
                        Check it out
                        <ArrowRight size={16} />
                      </Link>
                    </section>
                )}

                {filteredSessions.length === 0 ? (
                    <section className="cr-no-results cr-reveal">
                      <div className="cr-no-results-illustration">
                        <Search size={34} />

                        <span className="cr-search-orbit cr-search-orbit--one" />
                        <span className="cr-search-orbit cr-search-orbit--two" />
                      </div>

                      <h2>
                        That signal disappeared.
                      </h2>

                      <p>
                        No campus sessions match your
                        current search and filters.
                      </p>

                      <div>
                        <button
                            type="button"
                            onClick={clearFilters}
                        >
                          Clear filters
                        </button>

                        <Link href="/create-session">
                          Create it instead
                          <Plus size={15} />
                        </Link>
                      </div>
                    </section>
                ) : (
                    <>
                      {sessionsForMyCourses.length >
                          0 && (
                              <section className="cr-ticket-section cr-reveal">
                                <div className="cr-ticket-heading">
                                  <div>
                          <span className="cr-section-kicker">
                            <Sparkles size={14} />
                            Strong matches
                          </span>

                                    <h2>
                                      Sessions for your
                                      courses
                                    </h2>

                                    <p>
                                      Your classes are already
                                      gathering somewhere.
                                    </p>
                                  </div>

                                  <span className="cr-heading-count">
                          {
                            sessionsForMyCourses.length
                          }
                        </span>
                                </div>

                                <div className="cr-ticket-grid">
                                  {sessionsForMyCourses.map(
                                      (session, index) =>
                                          renderSessionTicket(
                                              session,
                                              index,
                                              true,
                                          ),
                                  )}
                                </div>
                              </section>
                          )}

                      {otherSessions.length > 0 && (
                          <section className="cr-ticket-section cr-reveal">
                            <div className="cr-ticket-heading">
                              <div>
                          <span className="cr-section-kicker">
                            <Compass size={14} />
                            Explore campus
                          </span>

                                <h2>
                                  Wander outside your
                                  syllabus
                                </h2>

                                <p>
                                  See what the rest of
                                  campus is studying.
                                </p>
                              </div>

                              <span className="cr-heading-count cr-heading-count--green">
                          {otherSessions.length}
                        </span>
                            </div>

                            <div className="cr-ticket-grid">
                              {otherSessions.map(
                                  (session, index) =>
                                      renderSessionTicket(
                                          session,
                                          index,
                                          false,
                                      ),
                              )}
                            </div>
                          </section>
                      )}
                    </>
                )}
              </div>
            </section>

            <section className="cr-closing-signal cr-reveal">
              <div className="cr-closing-orbits">
                <span />
                <span />
                <span />
              </div>

              <div>
              <span className="cr-section-kicker cr-section-kicker--light">
                <Users size={14} />
                Nothing fit?
              </span>

                <h2>
                  Build the study table you were
                  looking for.
                </h2>

                <p>
                  Pick a course, choose a campus
                  spot, and let your classmates find
                  you.
                </p>
              </div>

              <Link href="/create-session">
                Create a session
                <ArrowRight size={17} />
              </Link>
            </section>
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

const pageStyles = `
  .cr-root,
  .cr-root *,
  .cr-loading,
  .cr-loading * {
    box-sizing: border-box;
  }

  .cr-root,
  .cr-loading {
    --cr-indigo: #1B1B3A;
    --cr-indigo-soft: #292953;
    --cr-violet: #7C3AED;
    --cr-violet-dark: #5B21B6;
    --cr-violet-light: #EDE9FE;
    --cr-violet-faint: #F5F3FF;
    --cr-lilac: #C4B5FD;
    --cr-green: #10B981;
    --cr-green-dark: #047857;
    --cr-green-light: #D1FAE5;
    --cr-amber: #F59E0B;
    --cr-amber-dark: #B45309;
    --cr-amber-light: #FEF3C7;
    --cr-red: #EF4444;
    --cr-red-light: #FEE2E2;
    --cr-blue: #0EA5E9;
    --cr-blue-light: #E0F2FE;
    --cr-cream: #FFF9E8;
    --cr-background: #F5F4FB;
    --cr-surface: #FFFFFF;
    --cr-border: #E4E2F0;
    --cr-text: #1B1B3A;
    --cr-muted: #64748B;
    --cr-faint: #94A3B8;
  }

  .cr-root {
    --cr-progress: 0;

    position: relative;
    min-height: 100vh;
    overflow: hidden;
    isolation: isolate;
    padding: 20px 20px 100px;
    color: var(--cr-text);
    background:
      radial-gradient(
        circle at 50% -9%,
        rgba(124, 58, 237, 0.19),
        transparent 31rem
      ),
      var(--cr-background);
  }

  .cr-background-grid {
    position: absolute;
    inset: 0;
    z-index: -5;
    opacity: 0.28;
    pointer-events: none;
    background-image:
      radial-gradient(
        circle,
        rgba(27, 27, 58, 0.17) 1px,
        transparent 1px
      );
    background-size: 27px 27px;
    mask-image:
      linear-gradient(
        to bottom,
        transparent,
        black 7%,
        black 92%,
        transparent
      );
  }

  .cr-background-glow {
    position: absolute;
    z-index: -4;
    border-radius: 999px;
    pointer-events: none;
    filter: blur(5px);
  }

  .cr-background-glow--one {
    top: 680px;
    right: -210px;
    width: 430px;
    height: 430px;
    background: rgba(16, 185, 129, 0.1);
  }

  .cr-background-glow--two {
    top: 1480px;
    left: -270px;
    width: 520px;
    height: 520px;
    background: rgba(124, 58, 237, 0.1);
  }

  .cr-signal-trail {
    position: absolute;
    z-index: -2;
    top: 40px;
    left: 50%;
    width: min(1320px, 116vw);
    height: calc(100% - 80px);
    min-height: 2050px;
    overflow: visible;
    pointer-events: none;
    transform: translateX(-50%);
  }

  .cr-signal-trail-shadow,
  .cr-signal-trail-path {
    fill: none;
    vector-effect: non-scaling-stroke;
    stroke-linecap: round;
  }

  .cr-signal-trail-shadow {
    stroke: rgba(124, 58, 237, 0.07);
    stroke-width: 7;
  }

  .cr-signal-trail-path {
    stroke: rgba(124, 58, 237, 0.42);
    stroke-width: 2;
    stroke-dasharray: 1;
    stroke-dashoffset:
      calc(1 - var(--cr-progress));
  }

  .cr-canvas {
    position: relative;
    z-index: 1;
    width: min(1180px, 100%);
    margin: 0 auto;
  }

  .cr-error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 18px;
    padding: 15px 18px;
    color: #991B1B;
    background: var(--cr-red-light);
    border: 1px solid #FCA5A5;
    border-radius: 17px;
  }

  .cr-error-banner > div {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .cr-error-banner strong {
    font-size: 13px;
  }

  .cr-error-banner span {
    font-size: 11px;
  }

  .cr-error-banner button {
    flex-shrink: 0;
    padding: 9px 13px;
    color: white;
    background: var(--cr-red);
    border: 0;
    border-radius: 10px;
    font: inherit;
    font-size: 11px;
    font-weight: 750;
    cursor: pointer;
  }

  .cr-hero {
    position: relative;
    min-height: 520px;
    overflow: hidden;
    padding: 54px 50px 115px;
    color: white;
    background:
      radial-gradient(
        circle at 73% 43%,
        rgba(124, 58, 237, 0.45),
        transparent 28%
      ),
      linear-gradient(
        135deg,
        #18182F 0%,
        var(--cr-indigo) 45%,
        #292953 100%
      );
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 48px 48px 24px 48px;
    box-shadow:
      0 30px 80px rgba(27, 27, 58, 0.23),
      inset 0 1px rgba(255, 255, 255, 0.07);
  }

  .cr-hero-grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.14;
    background-image:
      linear-gradient(
        rgba(255, 255, 255, 0.14) 1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.14) 1px,
        transparent 1px
      );
    background-size: 37px 37px;
    mask-image:
      radial-gradient(
        circle at 70% 45%,
        black,
        transparent 68%
      );
  }

  .cr-hero-copy {
    position: relative;
    z-index: 3;
    width: min(55%, 570px);
  }

  .cr-eyebrow,
  .cr-section-kicker {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 12px;
    color: var(--cr-violet);
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .cr-eyebrow {
    color: var(--cr-lilac);
  }

  .cr-hero-copy h1 {
    margin: 0;
    font-size: clamp(53px, 7.2vw, 88px);
    font-weight: 850;
    letter-spacing: -0.075em;
    line-height: 0.88;
  }

  .cr-hero-copy h1 span {
    display: block;
    margin-top: 8px;
    color: var(--cr-lilac);
  }

  .cr-hero-copy > p {
    max-width: 520px;
    margin: 26px 0 0;
    color: rgba(255, 255, 255, 0.61);
    font-size: 14px;
    line-height: 1.75;
  }

  .cr-hero-actions {
    display: flex;
    align-items: center;
    gap: 11px;
    margin-top: 27px;
    flex-wrap: wrap;
  }

  .cr-create-button,
  .cr-live-button {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    min-height: 48px;
    padding: 9px 15px;
    border-radius: 14px;
    font-size: 12px;
    font-weight: 800;
    text-decoration: none;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      background 160ms ease;
  }

  .cr-create-button {
    color: var(--cr-text);
    background: white;
    box-shadow: 0 13px 30px rgba(0, 0, 0, 0.24);
  }

  .cr-create-button > span {
    display: grid;
    width: 31px;
    height: 31px;
    place-items: center;
    color: white;
    background: var(--cr-violet);
    border-radius: 10px;
  }

  .cr-create-button:hover {
    transform: translateY(-4px) rotate(-0.5deg);
    box-shadow: 0 20px 37px rgba(0, 0, 0, 0.3);
  }

  .cr-live-button {
    color: #6EE7B7;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(110, 231, 183, 0.25);
  }

  .cr-live-button:hover {
    background: rgba(16, 185, 129, 0.2);
    transform: translateY(-3px);
  }

  .cr-radar-scene {
    position: absolute;
    z-index: 2;
    top: 40px;
    right: 45px;
    width: 430px;
    height: 390px;
  }

  .cr-radar-surface {
    position: absolute;
    top: 0;
    right: 0;
    display: grid;
    width: 355px;
    height: 355px;
    overflow: hidden;
    place-items: center;
    background:
      radial-gradient(
        circle,
        rgba(124, 58, 237, 0.2),
        rgba(8, 8, 23, 0.35) 67%
      );
    border: 1px solid rgba(196, 181, 253, 0.23);
    border-radius: 999px;
    box-shadow:
      0 0 0 16px rgba(124, 58, 237, 0.035),
      0 25px 65px rgba(0, 0, 0, 0.24);
  }

  .cr-radar-ring {
    position: absolute;
    border: 1px solid rgba(196, 181, 253, 0.21);
    border-radius: 999px;
  }

  .cr-radar-ring--one {
    inset: 16%;
  }

  .cr-radar-ring--two {
    inset: 32%;
  }

  .cr-radar-ring--three {
    inset: 44%;
  }

  .cr-radar-axis {
    position: absolute;
    background: rgba(196, 181, 253, 0.12);
  }

  .cr-radar-axis--horizontal {
    right: 0;
    left: 0;
    height: 1px;
  }

  .cr-radar-axis--vertical {
    top: 0;
    bottom: 0;
    width: 1px;
  }

  .cr-radar-sweep {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 48%;
    height: 48%;
    transform-origin: top left;
    background:
      conic-gradient(
        from 269deg at 0 0,
        transparent 0deg,
        rgba(167, 139, 250, 0.08) 30deg,
        rgba(167, 139, 250, 0.42) 72deg,
        transparent 74deg
      );
    animation: cr-radar-spin 5s linear infinite;
  }

  .cr-radar-core {
    position: relative;
    z-index: 4;
    display: flex;
    width: 128px;
    height: 128px;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: white;
    background:
      radial-gradient(
        circle at 35% 28%,
        #A78BFA,
        var(--cr-violet) 55%,
        var(--cr-violet-dark)
      );
    border: 7px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    box-shadow:
      0 0 0 13px rgba(124, 58, 237, 0.08),
      0 18px 45px rgba(0, 0, 0, 0.35);
  }

  .cr-radar-core svg {
    margin-bottom: 3px;
    opacity: 0.78;
  }

  .cr-radar-core strong {
    font-size: 29px;
    letter-spacing: -0.07em;
    line-height: 1;
  }

  .cr-radar-core span {
    margin-top: 3px;
    color: rgba(255, 255, 255, 0.61);
    font-size: 8px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .cr-radar-blip {
    position: absolute;
    z-index: 5;
    display: grid;
    width: 17px;
    height: 17px;
    place-items: center;
    border: 2px solid rgba(255, 255, 255, 0.85);
    border-radius: 999px;
    background: var(--cr-green);
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.8);
  }

  .cr-radar-blip i {
    position: absolute;
    inset: -7px;
    border: 1px solid rgba(16, 185, 129, 0.65);
    border-radius: inherit;
    animation: cr-blip-pulse 1.9s ease-out infinite;
  }

  .cr-radar-blip--one {
    top: 20%;
    left: 29%;
  }

  .cr-radar-blip--two {
    top: 31%;
    right: 17%;
  }

  .cr-radar-blip--two i {
    animation-delay: 0.5s;
  }

  .cr-radar-blip--three {
    right: 29%;
    bottom: 17%;
  }

  .cr-radar-blip--three i {
    animation-delay: 1s;
  }

  .cr-radar-blip--four {
    bottom: 27%;
    left: 14%;
  }

  .cr-radar-blip--four i {
    animation-delay: 1.45s;
  }

  .cr-radar-note {
    position: absolute;
    z-index: 7;
    right: -3px;
    bottom: 0;
    width: 205px;
    padding: 17px;
    color: var(--cr-text);
    background: var(--cr-cream);
    border: 1px solid #FDE68A;
    border-radius: 7px 17px 17px 17px;
    box-shadow: 0 15px 32px rgba(0, 0, 0, 0.25);
    transform: rotate(2deg);
  }

  .cr-note-pin {
    position: absolute;
    top: -7px;
    left: 50%;
    width: 14px;
    height: 14px;
    border: 3px solid white;
    border-radius: 999px;
    background: var(--cr-amber);
    transform: translateX(-50%);
  }

  .cr-radar-note strong {
    display: block;
    font-size: 12px;
  }

  .cr-radar-note p {
    margin: 5px 0 0;
    color: #78520B;
    font-size: 9px;
    line-height: 1.5;
  }

  .cr-campus-readout {
    position: absolute;
    z-index: 8;
    right: 28px;
    bottom: 25px;
    left: 28px;
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
    align-items: center;
    min-height: 76px;
    padding: 13px 18px;
    color: var(--cr-text);
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(255, 255, 255, 0.78);
    border-radius: 18px;
    box-shadow: 0 15px 38px rgba(0, 0, 0, 0.23);
    backdrop-filter: blur(15px);
  }

  .cr-campus-readout > div {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .cr-campus-readout > div > span:last-child {
    display: flex;
    flex-direction: column;
  }

  .cr-campus-readout strong {
    font-size: 20px;
    letter-spacing: -0.04em;
    line-height: 1;
  }

  .cr-campus-readout small {
    margin-top: 4px;
    color: var(--cr-muted);
    font-size: 8px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .cr-readout-icon {
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border-radius: 11px;
  }

  .cr-readout-icon--green {
    color: var(--cr-green-dark);
    background: var(--cr-green-light);
  }

  .cr-readout-icon--red {
    color: var(--cr-red);
    background: var(--cr-red-light);
  }

  .cr-readout-icon--amber {
    color: var(--cr-amber-dark);
    background: var(--cr-amber-light);
  }

  .cr-readout-icon--violet {
    color: var(--cr-violet);
    background: var(--cr-violet-light);
  }

  .cr-readout-divider {
    width: 1px;
    height: 34px;
    background: var(--cr-border);
  }

  .cr-live-zone {
    position: relative;
    overflow: hidden;
    margin-top: 24px;
    padding: 31px;
    color: white;
    background:
      radial-gradient(
        circle at 85% 20%,
        rgba(16, 185, 129, 0.16),
        transparent 28%
      ),
      linear-gradient(
        145deg,
        #17172D,
        var(--cr-indigo-soft)
      );
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 24px 45px 24px 45px;
    box-shadow: 0 22px 55px rgba(27, 27, 58, 0.17);
  }

  .cr-live-zone::before {
    position: absolute;
    top: -130px;
    right: -100px;
    width: 340px;
    height: 340px;
    content: "";
    border: 1px dashed rgba(110, 231, 183, 0.12);
    border-radius: 999px;
  }

  .cr-section-heading {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 25px;
  }

  .cr-section-heading h2,
  .cr-ticket-heading h2,
  .cr-closest-copy h2,
  .cr-closing-signal h2 {
    margin: 0;
    font-size: clamp(24px, 3.3vw, 37px);
    letter-spacing: -0.052em;
    line-height: 1.04;
  }

  .cr-section-heading p,
  .cr-ticket-heading p {
    margin: 8px 0 0;
    color: var(--cr-muted);
    font-size: 12px;
    line-height: 1.6;
  }

  .cr-section-heading--light h2 {
    color: white;
  }

  .cr-section-heading--light p {
    color: rgba(255, 255, 255, 0.51);
  }

  .cr-section-heading--light .cr-section-kicker,
  .cr-section-kicker--light {
    color: var(--cr-lilac);
  }

  .cr-live-filter {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 7px;
    padding: 9px 11px;
    color: rgba(255, 255, 255, 0.72);
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 12px;
  }

  .cr-live-filter select {
    max-width: 150px;
    color: white;
    background: transparent;
    border: 0;
    outline: none;
    font: inherit;
    font-size: 10px;
    font-weight: 750;
    cursor: pointer;
  }

  .cr-live-filter select option {
    color: var(--cr-text);
    background: white;
  }

  .cr-live-deck {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 13px;
  }

  .cr-signal-card {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 330px;
    flex-direction: column;
    padding: 16px;
    color: var(--cr-text);
    background: rgba(255, 255, 255, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.75);
    border-radius: 17px;
    box-shadow: 0 16px 38px rgba(0, 0, 0, 0.25);
    transition:
      transform 170ms ease,
      box-shadow 170ms ease;
  }

  .cr-signal-card--1 {
    transform: rotate(-1.3deg);
  }

  .cr-signal-card--2 {
    background: var(--cr-cream);
    transform: rotate(1.2deg);
  }

  .cr-signal-card--3 {
    background: #F0FDFA;
    transform: rotate(-0.7deg);
  }

  .cr-signal-card--4 {
    background: var(--cr-violet-faint);
    transform: rotate(1.5deg);
  }

  .cr-signal-card:hover {
    z-index: 5;
    box-shadow: 0 25px 52px rgba(0, 0, 0, 0.34);
    transform: translateY(-7px) rotate(0deg);
  }

  .cr-signal-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 9px;
  }

  .cr-transmission-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--cr-red);
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.13em;
  }

  .cr-transmission-label > span {
    position: relative;
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--cr-red);
  }

  .cr-transmission-label > span::after {
    position: absolute;
    inset: -4px;
    content: "";
    border-radius: inherit;
    background: var(--cr-red);
    opacity: 0.28;
    animation: cr-status-pulse 1.5s ease-out infinite;
  }

  .cr-signal-course {
    padding: 4px 8px;
    color: var(--cr-violet);
    background: var(--cr-violet-light);
    border-radius: 999px;
    font-size: 8px;
    font-weight: 850;
    text-decoration: none;
  }

  .cr-student-identity {
    display: flex;
    align-items: center;
    gap: 11px;
    margin-top: 18px;
  }

  .cr-student-avatar {
    display: grid;
    width: 48px;
    height: 48px;
    overflow: hidden;
    flex-shrink: 0;
    place-items: center;
    color: white;
    background: var(--cr-violet);
    border: 3px solid white;
    border-radius: 15px;
    font-size: 16px;
    font-weight: 850;
    box-shadow: 0 6px 16px rgba(27, 27, 58, 0.14);
  }

  .cr-student-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cr-student-identity h3 {
    margin: 0;
    font-size: 13px;
    letter-spacing: -0.02em;
  }

  .cr-student-identity p {
    margin: 3px 0 0;
    color: var(--cr-muted);
    font-size: 8px;
  }

  .cr-live-location {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: 17px;
    padding: 11px;
    background: rgba(255, 255, 255, 0.73);
    border: 1px solid rgba(228, 226, 240, 0.78);
    border-radius: 12px;
  }

  .cr-live-location > span {
    display: grid;
    width: 31px;
    height: 31px;
    flex-shrink: 0;
    place-items: center;
    color: var(--cr-green-dark);
    background: var(--cr-green-light);
    border-radius: 10px;
  }

  .cr-live-location > div {
    min-width: 0;
  }

  .cr-live-location small,
  .cr-live-location strong {
    display: block;
  }

  .cr-live-location small {
    color: var(--cr-faint);
    font-size: 7px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .cr-live-location strong {
    overflow: hidden;
    margin-top: 2px;
    font-size: 9px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cr-signal-message {
    margin-top: 11px;
    padding: 10px 11px;
    background: rgba(124, 58, 237, 0.07);
    border-radius: 11px;
  }

  .cr-signal-message small {
    display: block;
    color: var(--cr-violet);
    font-size: 7px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .cr-signal-message p {
    display: -webkit-box;
    overflow: hidden;
    margin: 5px 0 0;
    color: var(--cr-muted);
    font-size: 9px;
    line-height: 1.5;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .cr-find-me-note {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    margin-top: 9px;
    padding: 9px 10px;
    color: #78520B;
    background: var(--cr-amber-light);
    border: 1px dashed #FCD34D;
    border-radius: 10px;
    font-size: 8px;
    line-height: 1.45;
  }

  .cr-find-me-note svg {
    flex-shrink: 0;
  }

  .cr-signal-card-footer {
    margin-top: auto;
    padding-top: 13px;
  }

  .cr-buddy-button,
  .cr-buddy-pending,
  .cr-buddy-connected,
  .cr-buddy-self {
    display: inline-flex;
    width: 100%;
    min-height: 36px;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 11px;
    border-radius: 10px;
    font-size: 9px;
    font-weight: 800;
  }

  .cr-buddy-button {
    color: white;
    background: var(--cr-violet);
    border: 0;
    cursor: pointer;
    transition:
      background 150ms ease,
      transform 150ms ease;
  }

  .cr-buddy-button:hover {
    background: var(--cr-violet-dark);
    transform: translateY(-2px);
  }

  .cr-buddy-connected {
    color: #166534;
    background: #DCFCE7;
    border: 1px solid #86EFAC;
    text-decoration: none;
  }

  .cr-buddy-pending {
    color: var(--cr-muted);
    background: var(--cr-background);
    border: 1px solid var(--cr-border);
  }

  .cr-buddy-self {
    color: var(--cr-violet);
    background: var(--cr-violet-light);
  }

  .cr-live-empty {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 18px;
    padding: 23px;
    background: rgba(255, 255, 255, 0.055);
    border: 1px dashed rgba(255, 255, 255, 0.16);
    border-radius: 18px;
  }

  .cr-empty-radar {
    position: relative;
    display: grid;
    width: 74px;
    height: 74px;
    place-items: center;
    color: var(--cr-lilac);
    border: 1px dashed rgba(196, 181, 253, 0.35);
    border-radius: 999px;
  }

  .cr-empty-radar span {
    position: absolute;
    border: 1px solid rgba(196, 181, 253, 0.17);
    border-radius: inherit;
  }

  .cr-empty-radar span:nth-child(2) {
    inset: 10px;
  }

  .cr-empty-radar span:nth-child(3) {
    inset: 20px;
  }

  .cr-live-empty h3 {
    margin: 0 0 5px;
    color: white;
    font-size: 16px;
  }

  .cr-live-empty p {
    margin: 0;
    color: rgba(255, 255, 255, 0.49);
    font-size: 10px;
  }

  .cr-live-empty > a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 13px;
    color: var(--cr-green-dark);
    background: var(--cr-green-light);
    border-radius: 11px;
    font-size: 10px;
    font-weight: 800;
    text-decoration: none;
  }

  .cr-live-overflow {
    position: relative;
    z-index: 2;
    margin-top: 17px;
    color: rgba(255, 255, 255, 0.48);
    font-size: 9px;
    font-weight: 800;
    text-align: center;
    text-transform: uppercase;
  }

  .cr-discovery-zone {
    display: grid;
    grid-template-columns: 285px minmax(0, 1fr);
    gap: 21px;
    margin-top: 24px;
    align-items: start;
  }

  .cr-command-console {
    position: sticky;
    top: 105px;
    overflow: hidden;
    padding: 21px;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid var(--cr-border);
    border-radius: 18px 18px 35px 18px;
    box-shadow: 0 18px 45px rgba(27, 27, 58, 0.1);
    backdrop-filter: blur(14px);
  }

  .cr-command-console::before {
    position: absolute;
    top: -60px;
    right: -65px;
    width: 145px;
    height: 145px;
    content: "";
    border: 1px dashed rgba(124, 58, 237, 0.13);
    border-radius: 999px;
  }

  .cr-console-top {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 17px;
  }

  .cr-console-top > span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--cr-text);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .cr-console-top > button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 7px;
    color: var(--cr-violet);
    background: var(--cr-violet-light);
    border: 0;
    border-radius: 8px;
    font: inherit;
    font-size: 8px;
    font-weight: 800;
    cursor: pointer;
  }

  .cr-search-control {
    position: relative;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 12px;
    background: var(--cr-background);
    border: 1px solid var(--cr-border);
    border-radius: 13px;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease;
  }

  .cr-search-control:focus-within {
    border-color: var(--cr-lilac);
    box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.08);
  }

  .cr-search-control > svg {
    flex-shrink: 0;
    color: var(--cr-violet);
  }

  .cr-search-control input {
    width: 100%;
    min-width: 0;
    color: var(--cr-text);
    background: transparent;
    border: 0;
    outline: none;
    font: inherit;
    font-size: 10px;
  }

  .cr-search-control input::placeholder {
    color: var(--cr-faint);
  }

  .cr-search-control button {
    display: grid;
    flex-shrink: 0;
    padding: 3px;
    place-items: center;
    color: var(--cr-muted);
    background: transparent;
    border: 0;
    cursor: pointer;
  }

  .cr-filter-group {
    margin-top: 19px;
  }

  .cr-filter-label {
    display: block;
    margin-bottom: 9px;
    color: var(--cr-muted);
    font-size: 8px;
    font-weight: 850;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .cr-filter-options {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
  }

  .cr-filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 7px 9px;
    color: var(--cr-muted);
    background: white;
    border: 1px solid var(--cr-border);
    border-radius: 999px;
    font: inherit;
    font-size: 8px;
    font-weight: 750;
    cursor: pointer;
    transition:
      color 150ms ease,
      background 150ms ease,
      border-color 150ms ease;
  }

  .cr-filter-chip:hover {
    color: var(--cr-violet);
    border-color: var(--cr-lilac);
  }

  .cr-filter-chip--active {
    color: white;
    background: var(--cr-violet);
    border-color: var(--cr-violet);
  }

  .cr-filter-live-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--cr-red);
  }

  .cr-filter-chip--active .cr-filter-live-dot {
    background: white;
  }

  .cr-scope-switch {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 4px;
    background: var(--cr-background);
    border: 1px solid var(--cr-border);
    border-radius: 11px;
  }

  .cr-scope-switch button {
    padding: 8px 7px;
    color: var(--cr-muted);
    background: transparent;
    border: 0;
    border-radius: 8px;
    font: inherit;
    font-size: 8px;
    font-weight: 800;
    cursor: pointer;
  }

  .cr-scope-switch .cr-scope-active {
    color: var(--cr-violet);
    background: white;
    box-shadow: 0 4px 10px rgba(27, 27, 58, 0.08);
  }

  .cr-console-result {
    display: grid;
    margin-top: 20px;
    padding: 16px;
    place-items: center;
    color: white;
    background:
      radial-gradient(
        circle at 30% 20%,
        rgba(167, 139, 250, 0.42),
        transparent 35%
      ),
      var(--cr-indigo);
    border-radius: 14px;
    text-align: center;
  }

  .cr-console-result > span {
    color: var(--cr-lilac);
    font-size: 7px;
    font-weight: 900;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .cr-console-result strong {
    margin: 4px 0;
    font-size: 35px;
    letter-spacing: -0.07em;
    line-height: 1;
  }

  .cr-console-result small {
    color: rgba(255, 255, 255, 0.49);
    font-size: 8px;
  }

  .cr-console-create {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin-top: 11px;
    padding: 11px;
    color: white;
    background: var(--cr-violet);
    border-radius: 11px;
    font-size: 9px;
    font-weight: 800;
    text-decoration: none;
    transition:
      background 150ms ease,
      transform 150ms ease;
  }

  .cr-console-create:hover {
    background: var(--cr-violet-dark);
    transform: translateY(-2px);
  }

  .cr-session-results {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 22px;
  }

  .cr-closest-signal {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 17px;
    overflow: hidden;
    padding: 19px;
    color: white;
    background:
      linear-gradient(
        135deg,
        var(--cr-violet),
        var(--cr-violet-dark)
      );
    border-radius: 16px 34px 16px 34px;
    box-shadow: 0 16px 38px rgba(91, 33, 182, 0.19);
  }

  .cr-closest-radar {
    position: relative;
    display: grid;
    width: 60px;
    height: 60px;
    flex-shrink: 0;
    place-items: center;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.24);
    border-radius: 999px;
  }

  .cr-closest-radar span {
    position: absolute;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: inherit;
  }

  .cr-closest-radar span:nth-child(1) {
    inset: 9px;
  }

  .cr-closest-radar span:nth-child(2) {
    inset: 18px;
  }

  .cr-closest-copy {
    min-width: 0;
  }

  .cr-closest-copy > span {
    color: #DDD6FE;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .cr-closest-copy h2 {
    overflow: hidden;
    margin-top: 5px;
    font-size: 21px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cr-closest-copy > div {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
    flex-wrap: wrap;
  }

  .cr-closest-copy > div span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: rgba(255, 255, 255, 0.58);
    font-size: 8px;
  }

  .cr-closest-signal > a {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    color: var(--cr-violet-dark);
    background: white;
    border-radius: 11px;
    font-size: 9px;
    font-weight: 850;
    text-decoration: none;
  }

  .cr-ticket-section {
    padding: 25px;
    background: rgba(255, 255, 255, 0.91);
    border: 1px solid var(--cr-border);
    border-radius: 35px 20px 35px 20px;
    box-shadow: 0 17px 44px rgba(27, 27, 58, 0.08);
    backdrop-filter: blur(12px);
  }

  .cr-ticket-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 21px;
  }

  .cr-ticket-heading h2 {
    font-size: 27px;
  }

  .cr-heading-count {
    display: grid;
    width: 43px;
    height: 43px;
    flex-shrink: 0;
    place-items: center;
    color: var(--cr-violet);
    background: var(--cr-violet-light);
    border-radius: 14px;
    font-size: 14px;
    font-weight: 850;
    transform: rotate(4deg);
  }

  .cr-heading-count--green {
    color: var(--cr-green-dark);
    background: var(--cr-green-light);
    transform: rotate(-4deg);
  }

  .cr-ticket-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 13px;
  }

  .cr-session-ticket {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 325px;
    overflow: hidden;
    flex-direction: column;
    padding: 18px;
    color: var(--cr-text);
    background: var(--cr-surface);
    border: 1px solid var(--cr-border);
    border-radius: 17px;
    box-shadow: 0 8px 22px rgba(27, 27, 58, 0.06);
    transition:
      transform 170ms ease,
      box-shadow 170ms ease,
      border-color 170ms ease;
  }

  .cr-session-ticket:nth-child(4n + 2) {
    background: var(--cr-cream);
    transform: rotate(0.45deg);
  }

  .cr-session-ticket:nth-child(4n + 3) {
    background: #F0FDFA;
    transform: rotate(-0.45deg);
  }

  .cr-session-ticket:nth-child(4n + 4) {
    background: var(--cr-violet-faint);
    transform: rotate(0.3deg);
  }

  .cr-session-ticket:hover {
    z-index: 3;
    border-color: var(--cr-lilac);
    box-shadow: 0 20px 40px rgba(27, 27, 58, 0.13);
    transform: translateY(-6px) rotate(0deg);
  }

  .cr-session-ticket--live {
    border-color: #FCA5A5;
    box-shadow:
      inset 0 4px 0 var(--cr-red),
      0 8px 22px rgba(27, 27, 58, 0.06);
  }

  .cr-session-ticket--soon {
    border-color: #FCD34D;
    box-shadow:
      inset 0 4px 0 var(--cr-amber),
      0 8px 22px rgba(27, 27, 58, 0.06);
  }

  .cr-ticket-corner {
    position: absolute;
    top: -13px;
    right: -8px;
    color: rgba(27, 27, 58, 0.07);
    font-size: 62px;
    font-weight: 900;
    letter-spacing: -0.1em;
    pointer-events: none;
  }

  .cr-ticket-top {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .cr-ticket-badges {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .cr-status-badge,
  .cr-course-match,
  .cr-ticket-course {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 8px;
    border-radius: 999px;
    font-size: 7px;
    font-weight: 900;
    letter-spacing: 0.04em;
  }

  .cr-status-badge--live {
    color: #B91C1C;
    background: var(--cr-red-light);
  }

  .cr-status-badge--soon {
    color: var(--cr-amber-dark);
    background: var(--cr-amber-light);
  }

  .cr-status-badge--upcoming {
    color: #0369A1;
    background: var(--cr-blue-light);
  }

  .cr-status-dot {
    position: relative;
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--cr-red);
  }

  .cr-course-match {
    color: var(--cr-violet);
    background: var(--cr-violet-light);
  }

  .cr-ticket-course {
    flex-shrink: 0;
    color: var(--cr-violet);
    background: white;
    border: 1px solid var(--cr-border);
    text-decoration: none;
  }

  .cr-ticket-main {
    position: relative;
    z-index: 2;
    margin-top: 18px;
  }

  .cr-ticket-main h3 {
    margin: 0;
    font-size: 19px;
    letter-spacing: -0.035em;
    line-height: 1.13;
  }

  .cr-ticket-description {
    display: -webkit-box;
    overflow: hidden;
    min-height: 48px;
    margin: 9px 0 0;
    color: var(--cr-muted);
    font-size: 10px;
    line-height: 1.6;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }

  .cr-ticket-route {
    display: grid;
    grid-template-columns: 1fr 30px 1fr;
    align-items: center;
    gap: 8px;
    margin-top: 19px;
    padding: 13px;
    background: rgba(255, 255, 255, 0.69);
    border: 1px solid rgba(228, 226, 240, 0.85);
    border-radius: 13px;
  }

  .cr-route-node {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
  }

  .cr-route-icon {
    display: grid;
    width: 31px;
    height: 31px;
    flex-shrink: 0;
    place-items: center;
    color: var(--cr-violet);
    background: var(--cr-violet-light);
    border-radius: 10px;
  }

  .cr-route-node > span:last-child {
    min-width: 0;
  }

  .cr-route-node small,
  .cr-route-node strong {
    display: block;
  }

  .cr-route-node small {
    color: var(--cr-faint);
    font-size: 7px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .cr-route-node strong {
    overflow: hidden;
    margin-top: 2px;
    font-size: 8px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cr-route-dashes {
    height: 1px;
    background:
      repeating-linear-gradient(
        to right,
        var(--cr-lilac) 0,
        var(--cr-lilac) 3px,
        transparent 3px,
        transparent 6px
      );
  }

  .cr-ticket-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 11px;
    margin-top: auto;
    padding-top: 16px;
  }

  .cr-ticket-attendees {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--cr-muted);
    font-size: 8px;
    font-weight: 750;
  }

  .cr-avatar-stack {
    display: flex;
    padding-left: 6px;
  }

  .cr-avatar-stack span {
    width: 20px;
    height: 20px;
    margin-left: -6px;
    border: 2px solid white;
    border-radius: 999px;
    background: var(--cr-lilac);
  }

  .cr-avatar-stack span:nth-child(2) {
    background: #86EFAC;
  }

  .cr-avatar-stack span:nth-child(3) {
    background: #FCD34D;
  }

  .cr-open-ticket {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 9px 11px;
    color: white;
    background: var(--cr-indigo);
    border-radius: 10px;
    font-size: 8px;
    font-weight: 850;
    text-decoration: none;
    transition:
      background 150ms ease,
      transform 150ms ease;
  }

  .cr-open-ticket:hover {
    background: var(--cr-violet);
    transform: translateX(2px);
  }

  .cr-no-results {
    display: flex;
    min-height: 370px;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding: 35px;
    background: rgba(255, 255, 255, 0.91);
    border: 2px dashed var(--cr-border);
    border-radius: 30px;
    text-align: center;
  }

  .cr-no-results-illustration {
    position: relative;
    display: grid;
    width: 100px;
    height: 100px;
    place-items: center;
    color: var(--cr-violet);
    background: var(--cr-violet-faint);
    border-radius: 999px;
  }

  .cr-search-orbit {
    position: absolute;
    border: 1px dashed var(--cr-lilac);
    border-radius: inherit;
  }

  .cr-search-orbit--one {
    inset: -11px;
  }

  .cr-search-orbit--two {
    inset: -25px;
    opacity: 0.45;
  }

  .cr-no-results h2 {
    margin: 34px 0 7px;
    font-size: 25px;
    letter-spacing: -0.045em;
  }

  .cr-no-results p {
    margin: 0;
    color: var(--cr-muted);
    font-size: 11px;
  }

  .cr-no-results > div:last-child {
    display: flex;
    gap: 9px;
    margin-top: 20px;
  }

  .cr-no-results button,
  .cr-no-results a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 9px 12px;
    border-radius: 10px;
    font: inherit;
    font-size: 9px;
    font-weight: 800;
    cursor: pointer;
  }

  .cr-no-results button {
    color: var(--cr-violet);
    background: var(--cr-violet-light);
    border: 0;
  }

  .cr-no-results a {
    color: white;
    background: var(--cr-violet);
    text-decoration: none;
  }

  .cr-closing-signal {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 25px;
    overflow: hidden;
    margin-top: 24px;
    padding: 38px;
    color: white;
    background:
      radial-gradient(
        circle at 80% 30%,
        rgba(16, 185, 129, 0.17),
        transparent 27%
      ),
      linear-gradient(
        135deg,
        var(--cr-indigo),
        #27275B
      );
    border-radius: 22px 48px 22px 48px;
    box-shadow: 0 22px 55px rgba(27, 27, 58, 0.18);
  }

  .cr-closing-signal > div:not(.cr-closing-orbits) {
    position: relative;
    z-index: 2;
    max-width: 680px;
  }

  .cr-closing-signal h2 {
    font-size: 31px;
  }

  .cr-closing-signal p {
    margin: 10px 0 0;
    color: rgba(255, 255, 255, 0.52);
    font-size: 11px;
    line-height: 1.6;
  }

  .cr-closing-signal > a {
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-self: center;
    align-items: center;
    gap: 7px;
    padding: 12px 15px;
    color: var(--cr-violet-dark);
    background: white;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 850;
    text-decoration: none;
    transition: transform 150ms ease;
  }

  .cr-closing-signal > a:hover {
    transform: translateY(-3px);
  }

  .cr-closing-orbits {
    position: absolute;
    top: -125px;
    right: -55px;
    width: 300px;
    height: 300px;
    border: 1px solid rgba(196, 181, 253, 0.13);
    border-radius: 999px;
  }

  .cr-closing-orbits span {
    position: absolute;
    border: 1px solid rgba(196, 181, 253, 0.1);
    border-radius: inherit;
  }

  .cr-closing-orbits span:nth-child(1) {
    inset: 32px;
  }

  .cr-closing-orbits span:nth-child(2) {
    inset: 70px;
  }

  .cr-closing-orbits span:nth-child(3) {
    inset: 112px;
    background: rgba(124, 58, 237, 0.15);
  }

  .cr-loading {
    display: flex;
    min-height: 75vh;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 18px;
    color: var(--cr-muted);
    background: var(--cr-background);
    font-size: 12px;
  }

  .cr-loading-radar {
    position: relative;
    display: grid;
    width: 84px;
    height: 84px;
    overflow: hidden;
    place-items: center;
    color: var(--cr-violet);
    background: var(--cr-violet-faint);
    border: 1px solid var(--cr-lilac);
    border-radius: 999px;
  }

  .cr-loading-radar::before,
  .cr-loading-radar::after {
    position: absolute;
    content: "";
    border: 1px solid rgba(124, 58, 237, 0.19);
    border-radius: inherit;
  }

  .cr-loading-radar::before {
    inset: 13px;
  }

  .cr-loading-radar::after {
    inset: 27px;
  }

  .cr-loading-sweep {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 50%;
    height: 50%;
    transform-origin: top left;
    background:
      conic-gradient(
        from 270deg at 0 0,
        rgba(124, 58, 237, 0.4),
        transparent 75deg
      );
    animation: cr-radar-spin 1.6s linear infinite;
  }

  .cr-loading-ping {
    position: absolute;
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--cr-green);
  }

  .cr-loading-ping--one {
    top: 20px;
    right: 22px;
  }

  .cr-loading-ping--two {
    bottom: 21px;
    left: 18px;
  }

  .cr-loading-link {
    color: var(--cr-violet);
    font-weight: 800;
    text-decoration: none;
  }

  .cr-root a:focus-visible,
  .cr-root button:focus-visible,
  .cr-root input:focus-visible,
  .cr-root select:focus-visible,
  .cr-loading a:focus-visible {
    outline: 3px solid rgba(124, 58, 237, 0.34);
    outline-offset: 3px;
  }

  @keyframes cr-radar-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes cr-blip-pulse {
    0% {
      opacity: 0.7;
      transform: scale(0.7);
    }

    100% {
      opacity: 0;
      transform: scale(2.2);
    }
  }

  @keyframes cr-status-pulse {
    0% {
      opacity: 0.35;
      transform: scale(1);
    }

    75%,
    100% {
      opacity: 0;
      transform: scale(2.3);
    }
  }

  @media (max-width: 1060px) {
    .cr-radar-scene {
      right: 25px;
      width: 380px;
    }

    .cr-radar-surface {
      width: 325px;
      height: 325px;
    }

    .cr-live-deck {
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .cr-hero {
      min-height: 690px;
    }

    .cr-hero-copy {
      width: 100%;
      max-width: calc(100% - 350px);
    }

    .cr-radar-scene {
      top: 220px;
      left: 50%;
      width: 430px;
      transform: translateX(-50%);
    }

    .cr-campus-readout {
      grid-template-columns: 1fr 1fr;
    }

    .cr-readout-divider {
      display: none;
    }

    .cr-campus-readout > div {
      justify-content: flex-start;
      padding: 6px 11px;
    }

    .cr-live-deck {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .cr-discovery-zone {
      grid-template-columns: 1fr;
    }

    .cr-command-console {
      position: relative;
      top: auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }

    .cr-console-top,
    .cr-search-control,
    .cr-console-result,
    .cr-console-create {
      grid-column: 1 / -1;
    }

    .cr-filter-group {
      margin-top: 0;
    }
  }

  @media (max-width: 680px) {
    .cr-root {
      padding: 10px 12px 70px;
    }

    .cr-hero {
      min-height: 790px;
      padding: 34px 24px 135px;
      border-radius: 31px 31px 18px 31px;
    }

    .cr-hero-copy {
      max-width: none;
    }

    .cr-hero-copy h1 {
      font-size: clamp(50px, 17vw, 72px);
    }

    .cr-hero-copy > p {
      font-size: 12px;
    }

    .cr-radar-scene {
      top: 330px;
      width: 340px;
      height: 340px;
    }

    .cr-radar-surface {
      left: 50%;
      width: 290px;
      height: 290px;
      transform: translateX(-50%);
    }

    .cr-radar-note {
      right: 12px;
      bottom: -15px;
      width: 185px;
    }

    .cr-campus-readout {
      right: 16px;
      bottom: 16px;
      left: 16px;
      padding: 9px;
    }

    .cr-campus-readout > div {
      padding: 6px;
    }

    .cr-campus-readout small {
      font-size: 7px;
    }

    .cr-readout-icon {
      width: 30px;
      height: 30px;
    }

    .cr-live-zone {
      padding: 23px 17px;
    }

    .cr-section-heading {
      flex-direction: column;
    }

    .cr-live-filter {
      width: 100%;
    }

    .cr-live-filter select {
      flex: 1;
      max-width: none;
    }

    .cr-live-deck {
      grid-template-columns: 1fr;
    }

    .cr-signal-card {
      min-height: 300px;
      transform: none;
    }

    .cr-live-empty {
      grid-template-columns: 1fr;
      text-align: center;
    }

    .cr-empty-radar,
    .cr-live-empty > a {
      margin: 0 auto;
    }

    .cr-command-console {
      display: flex;
      flex-direction: column;
    }

    .cr-ticket-section {
      padding: 22px 16px;
    }

    .cr-ticket-grid {
      grid-template-columns: 1fr;
    }

    .cr-session-ticket {
      min-height: 310px;
      transform: none;
    }

    .cr-closest-signal {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .cr-closest-signal > a {
      grid-column: 1 / -1;
      justify-content: center;
    }

    .cr-ticket-route {
      grid-template-columns: 1fr;
    }

    .cr-route-dashes {
      display: none;
    }

    .cr-closing-signal {
      grid-template-columns: 1fr;
      padding: 29px 23px;
    }

    .cr-closing-signal > a {
      justify-self: flex-start;
    }
  }

  @media (max-width: 430px) {
    .cr-hero {
      min-height: 820px;
    }

    .cr-radar-scene {
      top: 360px;
      width: 310px;
    }

    .cr-radar-surface {
      width: 260px;
      height: 260px;
    }

    .cr-radar-core {
      width: 105px;
      height: 105px;
    }

    .cr-radar-note {
      right: 0;
      bottom: 18px;
      width: 175px;
    }

    .cr-campus-readout strong {
      font-size: 17px;
    }

    .cr-ticket-footer {
      align-items: flex-start;
      flex-direction: column;
    }

    .cr-open-ticket {
      width: 100%;
      justify-content: center;
    }

    .cr-no-results > div:last-child {
      flex-direction: column;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cr-root *,
    .cr-loading * {
      scroll-behavior: auto !important;
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }

    .cr-signal-trail-path {
      stroke-dashoffset: 0;
    }
  }
  
    /* ─────────────────────────────────────────────
     READABILITY PASS
     Add this at the END of pageStyles so these
     values override the earlier tiny font sizes.
  ───────────────────────────────────────────── */

  /* General labels and supporting text */
  .cr-eyebrow,
  .cr-section-kicker {
    font-size: 12px;
    line-height: 1.4;
  }

  .cr-hero-copy > p {
    font-size: 16px;
    line-height: 1.75;
  }

  .cr-create-button,
  .cr-live-button {
    font-size: 14px;
  }

  /* Hero radar */
  .cr-radar-core span {
    font-size: 10px;
  }

  .cr-radar-note strong {
    font-size: 14px;
  }

  .cr-radar-note p {
    font-size: 12px;
    line-height: 1.55;
  }

  .cr-campus-readout strong {
    font-size: 24px;
  }

  .cr-campus-readout small {
    font-size: 10px;
    line-height: 1.35;
  }

  /* Section headings */
  .cr-section-heading p,
  .cr-ticket-heading p {
    font-size: 15px;
    line-height: 1.65;
  }

  .cr-live-filter {
    padding: 11px 14px;
  }

  .cr-live-filter select {
    font-size: 14px;
  }

  /* Live transmission cards */
  .cr-signal-card {
    min-height: 380px;
    padding: 19px;
  }

  .cr-transmission-label {
    font-size: 11px;
  }

  .cr-signal-course {
    padding: 6px 10px;
    font-size: 11px;
  }

  .cr-student-identity h3 {
    font-size: 17px;
    line-height: 1.3;
  }

  .cr-student-identity p {
    margin-top: 4px;
    font-size: 13px;
    line-height: 1.45;
  }

  .cr-live-location {
    padding: 13px;
  }

  .cr-live-location small {
    font-size: 10px;
  }

  .cr-live-location strong {
    margin-top: 3px;
    font-size: 13px;
    line-height: 1.35;
  }

  .cr-signal-message {
    padding: 12px 13px;
  }

  .cr-signal-message small {
    font-size: 10px;
  }

  .cr-signal-message p {
    font-size: 13px;
    line-height: 1.55;
  }

  .cr-find-me-note {
    padding: 11px 12px;
    font-size: 12px;
    line-height: 1.5;
  }

  .cr-buddy-button,
  .cr-buddy-pending,
  .cr-buddy-connected,
  .cr-buddy-self {
    min-height: 42px;
    padding: 10px 12px;
    font-size: 13px;
  }

  .cr-live-overflow {
    font-size: 12px;
  }

  /* Empty live section */
  .cr-live-empty h3 {
    font-size: 19px;
  }

  .cr-live-empty p {
    font-size: 14px;
    line-height: 1.55;
  }

  .cr-live-empty > a {
    padding: 11px 15px;
    font-size: 13px;
  }

  /* Signal controls */
  .cr-discovery-zone {
    grid-template-columns: 315px minmax(0, 1fr);
  }

  .cr-command-console {
    padding: 24px;
  }

  .cr-console-top > span {
    font-size: 13px;
  }

  .cr-console-top > button {
    padding: 7px 9px;
    font-size: 11px;
  }

  .cr-search-control {
    padding: 14px;
  }

  .cr-search-control input {
    font-size: 14px;
  }

  .cr-filter-label {
    margin-bottom: 10px;
    font-size: 11px;
  }

  .cr-filter-options {
    gap: 8px;
  }

  .cr-filter-chip {
    padding: 9px 12px;
    font-size: 12px;
  }

  .cr-scope-switch button {
    padding: 10px 8px;
    font-size: 12px;
  }

  .cr-console-result {
    padding: 19px;
  }

  .cr-console-result > span {
    font-size: 10px;
  }

  .cr-console-result strong {
    margin: 7px 0;
    font-size: 46px;
  }

  .cr-console-result small {
    font-size: 12px;
  }

  .cr-console-create {
    padding: 13px;
    font-size: 13px;
  }

  /* Strongest signal banner */
  .cr-closest-copy > span {
    font-size: 11px;
  }

  .cr-closest-copy h2 {
    font-size: 24px;
  }

  .cr-closest-copy > div span {
    font-size: 12px;
  }

  .cr-closest-signal > a {
    padding: 11px 14px;
    font-size: 12px;
  }

  /* Session section headings */
  .cr-ticket-heading h2 {
    font-size: 31px;
  }

  .cr-heading-count {
    font-size: 16px;
  }

  /* Session tickets */
  .cr-session-ticket {
    min-height: 360px;
    padding: 20px;
  }

  .cr-status-badge,
  .cr-course-match,
  .cr-ticket-course {
    padding: 6px 9px;
    font-size: 10px;
  }

  .cr-ticket-main h3 {
    font-size: 22px;
    line-height: 1.18;
  }

  .cr-ticket-description {
    min-height: 66px;
    font-size: 14px;
    line-height: 1.6;
  }

  .cr-ticket-route {
    padding: 14px;
  }

  .cr-route-node small {
    font-size: 10px;
  }

  .cr-route-node strong {
    margin-top: 3px;
    font-size: 12px;
    line-height: 1.35;
  }

  .cr-ticket-attendees {
    font-size: 12px;
  }

  .cr-open-ticket {
    padding: 10px 13px;
    font-size: 12px;
  }

  /* No-results state */
  .cr-no-results h2 {
    font-size: 31px;
  }

  .cr-no-results p {
    font-size: 15px;
    line-height: 1.6;
  }

  .cr-no-results button,
  .cr-no-results a {
    padding: 11px 14px;
    font-size: 13px;
  }

  /* Bottom callout */
  .cr-closing-signal h2 {
    font-size: clamp(31px, 4vw, 44px);
  }

  .cr-closing-signal p {
    font-size: 15px;
    line-height: 1.65;
  }

  .cr-closing-signal > a {
    padding: 13px 17px;
    font-size: 13px;
  }

  /* Loading state */
  .cr-loading {
    font-size: 14px;
  }

  /* Keep the larger typography comfortable on tablets */
  @media (max-width: 900px) {
    .cr-discovery-zone {
      grid-template-columns: 1fr;
    }

    .cr-section-heading p,
    .cr-ticket-heading p {
      font-size: 15px;
    }

    .cr-command-console {
      padding: 22px;
    }
  }

  /* Mobile readability */
  @media (max-width: 680px) {
    .cr-hero-copy > p {
      font-size: 15px;
    }

    .cr-campus-readout small {
      font-size: 9px;
    }

    .cr-signal-card {
      min-height: 350px;
    }

    .cr-ticket-heading h2 {
      font-size: 27px;
    }

    .cr-session-ticket {
      min-height: 345px;
    }

    .cr-ticket-description {
      min-height: auto;
    }

    .cr-closing-signal p {
      font-size: 14px;
    }
  }
`;