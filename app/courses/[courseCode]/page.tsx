"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  GraduationCap,
  MapPin,
  Plus,
  Radio,
  SearchX,
  UserPlus,
  Users,
} from "lucide-react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import AlertModal from "@/components/AlertModal";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import {
  isValidCourseCode,
  normalizeCourseCode,
} from "@/lib/courseValidation";
import { supabase } from "@/lib/supabase";

import styles from "./course.module.css";

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

type SessionState =
    | "live"
    | "soon"
    | "upcoming";

type Session = {
  id: string;
  title: string;
  course_code: string;
  location_name: string;
  start_time: string;
  end_time: string;
  creator_id: string;
};

type LiveStudentProfile = {
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
      | LiveStudentProfile
      | LiveStudentProfile[]
      | null;
};

type LiveStudent = Omit<
    LiveStudentRow,
    "profiles"
> & {
  profile: LiveStudentProfile | null;
};

type Friendship = {
  requester_id: string;
  receiver_id: string;
  status: string;
};

const LIVE_DURATION_MS =
    2 * 60 * 60 * 1000;

function normalizeRelation<T>(
    relation: T | T[] | null,
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function getInitial(
    name: string | null | undefined,
): string {
  return (
      name?.trim().charAt(0).toUpperCase() ||
      "S"
  );
}

function SafeAvatar({
                      src,
                      name,
                    }: {
  src: string | null | undefined;
  name: string | null | undefined;
}) {
  const [imageFailed, setImageFailed] =
      useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const canRenderImage =
      typeof src === "string" &&
      src.trim().length > 0 &&
      !imageFailed;

  if (!canRenderImage) {
    return (
        <span aria-hidden="true">
        {getInitial(name)}
      </span>
    );
  }

  return (
      <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
      />
  );
}

function getSessionState(
    session: Session,
    now: Date,
): SessionState {
  const start = new Date(
      session.start_time,
  );

  const end = new Date(
      session.end_time,
  );

  if (start <= now && end > now) {
    return "live";
  }

  const minutesUntilStart =
      (start.getTime() -
          now.getTime()) /
      60_000;

  if (
      minutesUntilStart > 0 &&
      minutesUntilStart <= 30
  ) {
    return "soon";
  }

  return "upcoming";
}

function getSessionStateLabel(
    state: SessionState,
): string {
  switch (state) {
    case "live":
      return "Happening now";
    case "soon":
      return "Starting soon";
    default:
      return "Upcoming";
  }
}

function formatSessionDate(
    value: string,
): string {
  const date = new Date(value);
  const now = new Date();

  const dateStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
  );

  const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
  );

  const difference = Math.round(
      (dateStart.getTime() -
          todayStart.getTime()) /
      86_400_000,
  );

  if (difference === 0) {
    return "Today";
  }

  if (difference === 1) {
    return "Tomorrow";
  }

  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatSessionTimeRange(
    session: Session,
): string {
  const options:
      Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };

  return `${new Date(
      session.start_time,
  ).toLocaleTimeString(
      [],
      options,
  )} – ${new Date(
      session.end_time,
  ).toLocaleTimeString([], options)}`;
}

function getRelativeStart(
    session: Session,
    now: Date,
): string {
  const start = new Date(
      session.start_time,
  );

  const end = new Date(
      session.end_time,
  );

  if (start <= now && end > now) {
    const remainingMinutes =
        Math.max(
            1,
            Math.ceil(
                (end.getTime() -
                    now.getTime()) /
                60_000,
            ),
        );

    return remainingMinutes < 60
        ? `${remainingMinutes}m remaining`
        : `${Math.floor(
            remainingMinutes / 60,
        )}h remaining`;
  }

  const minutesUntilStart =
      Math.max(
          1,
          Math.ceil(
              (start.getTime() -
                  now.getTime()) /
              60_000,
          ),
      );

  if (minutesUntilStart < 60) {
    return `Starts in ${minutesUntilStart}m`;
  }

  if (minutesUntilStart < 24 * 60) {
    const hours = Math.floor(
        minutesUntilStart / 60,
    );

    const minutes =
        minutesUntilStart % 60;

    return minutes
        ? `Starts in ${hours}h ${minutes}m`
        : `Starts in ${hours}h`;
  }

  return formatSessionDate(
      session.start_time,
  );
}

function formatLiveDuration(
    createdAt: string,
    currentTime: number,
): string {
  const elapsedMinutes = Math.max(
      0,
      Math.floor(
          (currentTime -
              new Date(
                  createdAt,
              ).getTime()) /
          60_000,
      ),
  );

  if (elapsedMinutes < 1) {
    return "Just went live";
  }

  if (elapsedMinutes < 60) {
    return `Live for ${elapsedMinutes}m`;
  }

  const hours = Math.floor(
      elapsedMinutes / 60,
  );

  const minutes =
      elapsedMinutes % 60;

  return minutes
      ? `Live for ${hours}h ${minutes}m`
      : `Live for ${hours}h`;
}

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();

  const {
    profile,
    loading: onboardingLoading,
  } = useRequireOnboarding();

  const rawCourseCode =
      Array.isArray(
          params.courseCode,
      )
          ? params.courseCode[0]
          : String(
              params.courseCode || "",
          );

  const courseCode =
      normalizeCourseCode(
          decodeURIComponent(
              rawCourseCode,
          ),
      );

  const [loading, setLoading] =
      useState(true);

  const [loadError, setLoadError] =
      useState<string | null>(null);

  const [sessions, setSessions] =
      useState<Session[]>([]);

  const [
    attendeeCounts,
    setAttendeeCounts,
  ] = useState<Record<string, number>>(
      {},
  );

  const [studentCount, setStudentCount] =
      useState(0);

  const [isMyCourse, setIsMyCourse] =
      useState(false);

  const [savingCourse, setSavingCourse] =
      useState(false);

  const [liveStudents, setLiveStudents] =
      useState<LiveStudent[]>([]);

  const [
    acceptedBuddyIds,
    setAcceptedBuddyIds,
  ] = useState<Set<string>>(
      new Set(),
  );

  const [
    pendingBuddyIds,
    setPendingBuddyIds,
  ] = useState<Set<string>>(
      new Set(),
  );

  const [
    buddyBusyIds,
    setBuddyBusyIds,
  ] = useState<Set<string>>(
      new Set(),
  );

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

  const university =
      profile?.university;

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
    const intervalId =
        window.setInterval(() => {
          setCurrentTime(Date.now());
        }, 60_000);

    return () => {
      window.clearInterval(
          intervalId,
      );
    };
  }, []);

  const loadCourse =
      useCallback(async () => {
        if (
            !isValidCourseCode(
                courseCode,
            )
        ) {
          router.replace(
              "/sessions",
          );
          return;
        }

        if (!university) {
          return;
        }

        setLoading(true);
        setLoadError(null);

        try {
          const {
            data: { user },
            error: userError,
          } =
              await supabase.auth.getUser();

          if (userError) {
            throw userError;
          }

          if (!user) {
            router.replace(
                "/login",
            );
            return;
          }

          const nowIso =
              new Date().toISOString();

          const twoHoursAgoIso =
              new Date(
                  Date.now() -
                  LIVE_DURATION_MS,
              ).toISOString();

          const [
            courseResult,
            sessionsResult,
            liveResult,
            friendshipsResult,
          ] = await Promise.all([
            supabase
                .from("user_courses")
                .select("course_code")
                .eq("user_id", user.id)
                .eq(
                    "course_code",
                    courseCode,
                )
                .maybeSingle(),

            supabase
                .from("study_sessions")
                .select(`
              id,
              title,
              course_code,
              location_name,
              start_time,
              end_time,
              creator_id,
              profiles!study_sessions_creator_id_fkey!inner (
                university
              )
            `)
                .eq(
                    "course_code",
                    courseCode,
                )
                .eq(
                    "profiles.university",
                    university,
                )
                .gt(
                    "end_time",
                    nowIso,
                )
                .order(
                    "start_time",
                    {
                      ascending: true,
                    },
                ),

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
              profiles!inner (
                id,
                name,
                avatar_url,
                university,
                major,
                year
              )
            `)
                .eq(
                    "course_code",
                    courseCode,
                )
                .eq(
                    "profiles.university",
                    university,
                )
                .gte(
                    "created_at",
                    twoHoursAgoIso,
                )
                .order(
                    "created_at",
                    {
                      ascending: false,
                    },
                ),

            supabase
                .from("friendships")
                .select(
                    "requester_id, receiver_id, status",
                )
                .or(
                    `requester_id.eq.${user.id},receiver_id.eq.${user.id}`,
                ),
          ]);

          const firstError =
              courseResult.error ||
              sessionsResult.error ||
              liveResult.error ||
              friendshipsResult.error;

          if (firstError) {
            throw firstError;
          }

          const activeSessions =
              (sessionsResult.data ??
                  []) as Session[];

          const formattedLiveStudents =
              (
                  (liveResult.data ??
                      []) as unknown as LiveStudentRow[]
              ).map((student) => ({
                id: student.id,
                user_id:
                student.user_id,
                course_code:
                student.course_code,
                location_name:
                student.location_name,
                description:
                student.description,
                identification:
                student.identification,
                created_at:
                student.created_at,
                profile:
                    normalizeRelation(
                        student.profiles,
                    ),
              }));

          const studentIds =
              new Set<string>();

          const attendanceSets =
              new Map<
                  string,
                  Set<string>
              >();

          activeSessions.forEach(
              (session) => {
                studentIds.add(
                    session.creator_id,
                );

                attendanceSets.set(
                    session.id,
                    new Set([
                      session.creator_id,
                    ]),
                );
              },
          );

          const sessionIds =
              activeSessions.map(
                  (session) =>
                      session.id,
              );

          if (
              sessionIds.length > 0
          ) {
            const {
              data: members,
              error: membersError,
            } = await supabase
                .from("session_members")
                .select(
                    "session_id, user_id",
                )
                .in(
                    "session_id",
                    sessionIds,
                );

            if (membersError) {
              throw membersError;
            }

            (
                members ?? []
            ).forEach((member) => {
              studentIds.add(
                  member.user_id,
              );

              const memberSet =
                  attendanceSets.get(
                      member.session_id,
                  ) ??
                  new Set<string>();

              memberSet.add(
                  member.user_id,
              );

              attendanceSets.set(
                  member.session_id,
                  memberSet,
              );
            });
          }

          formattedLiveStudents.forEach(
              (student) => {
                studentIds.add(
                    student.user_id,
                );
              },
          );

          const nextCounts:
              Record<string, number> = {};

          attendanceSets.forEach(
              (memberIds, sessionId) => {
                nextCounts[sessionId] =
                    memberIds.size;
              },
          );

          const acceptedIds =
              new Set<string>();

          const pendingIds =
              new Set<string>();

          (
              (friendshipsResult.data ??
                  []) as Friendship[]
          ).forEach(
              (friendship) => {
                const otherUserId =
                    friendship.requester_id ===
                    user.id
                        ? friendship.receiver_id
                        : friendship.requester_id;

                if (
                    friendship.status ===
                    "accepted"
                ) {
                  acceptedIds.add(
                      otherUserId,
                  );
                } else {
                  pendingIds.add(
                      otherUserId,
                  );
                }
              },
          );

          setIsMyCourse(
              Boolean(
                  courseResult.data,
              ),
          );

          setSessions(
              activeSessions,
          );

          setAttendeeCounts(
              nextCounts,
          );

          setLiveStudents(
              formattedLiveStudents,
          );

          setStudentCount(
              studentIds.size,
          );

          setAcceptedBuddyIds(
              acceptedIds,
          );

          setPendingBuddyIds(
              pendingIds,
          );
        } catch (error) {
          console.error(
              "Unable to load course:",
              error,
          );

          setLoadError(
              error instanceof Error
                  ? error.message
                  : "This course could not be loaded.",
          );

          setSessions([]);
          setLiveStudents([]);
          setAttendeeCounts({});
          setStudentCount(0);
        } finally {
          setLoading(false);
        }
      }, [
        courseCode,
        router,
        university,
      ]);

  useEffect(() => {
    if (!university) {
      return;
    }

    void loadCourse();
  }, [
    loadCourse,
    university,
  ]);

  const activeLiveStudents =
      useMemo(
          () =>
              liveStudents.filter(
                  (student) =>
                      currentTime -
                      new Date(
                          student.created_at,
                      ).getTime() <
                      LIVE_DURATION_MS,
              ),
          [
            currentTime,
            liveStudents,
          ],
      );

  const now = useMemo(
      () => new Date(currentTime),
      [currentTime],
  );

  async function addToMyCourses() {
    if (
        savingCourse ||
        isMyCourse
    ) {
      return;
    }

    if (
        !isValidCourseCode(
            courseCode,
        )
    ) {
      showAlert(
          "Invalid course",
          "This course code is not valid.",
          "error",
      );
      return;
    }

    setSavingCourse(true);

    try {
      const {
        data: { user },
        error: userError,
      } =
          await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
            "You must be signed in to add this course.",
        );
      }

      const { error } =
          await supabase
              .from("user_courses")
              .upsert(
                  {
                    user_id: user.id,
                    course_code:
                    courseCode,
                  },
                  {
                    onConflict:
                        "user_id,course_code",
                  },
              );

      if (error) {
        throw error;
      }

      setIsMyCourse(true);

      showAlert(
          "Course added",
          `${courseCode} was added to My Courses.`,
          "success",
      );
    } catch (error) {
      showAlert(
          "Unable to add course",
          error instanceof Error
              ? error.message
              : "This course could not be added.",
          "error",
      );
    } finally {
      setSavingCourse(false);
    }
  }

  async function sendBuddyRequest(
      receiverId: string,
  ) {
    if (
        !receiverId ||
        receiverId ===
        profile?.id ||
        buddyBusyIds.has(
            receiverId,
        )
    ) {
      return;
    }

    if (
        acceptedBuddyIds.has(
            receiverId,
        )
    ) {
      showAlert(
          "Already connected",
          "This student is already one of your study buddies.",
          "info",
      );
      return;
    }

    if (
        pendingBuddyIds.has(
            receiverId,
        )
    ) {
      showAlert(
          "Request pending",
          "A study-buddy request already exists.",
          "info",
      );
      return;
    }

    setBuddyBusyIds(
        (current) => {
          const next =
              new Set(current);

          next.add(receiverId);

          return next;
        },
    );

    try {
      const {
        data: { user },
        error: userError,
      } =
          await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
            "You must be signed in to add a study buddy.",
        );
      }

      const {
        data: existing,
        error: checkError,
      } = await supabase
          .from("friendships")
          .select("id, status")
          .or(
              `and(requester_id.eq.${user.id},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${user.id})`,
          )
          .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existing) {
        if (
            existing.status ===
            "accepted"
        ) {
          setAcceptedBuddyIds(
              (current) => {
                const next =
                    new Set(current);

                next.add(
                    receiverId,
                );

                return next;
              },
          );
        } else {
          setPendingBuddyIds(
              (current) => {
                const next =
                    new Set(current);

                next.add(
                    receiverId,
                );

                return next;
              },
          );
        }

        showAlert(
            "Connection already exists",
            existing.status ===
            "accepted"
                ? "This student is already one of your study buddies."
                : "A study-buddy request is already pending.",
            "info",
        );

        return;
      }

      const { error } =
          await supabase
              .from("friendships")
              .insert({
                requester_id:
                user.id,
                receiver_id:
                receiverId,
                status: "pending",
              });

      if (error) {
        throw error;
      }

      setPendingBuddyIds(
          (current) => {
            const next =
                new Set(current);

            next.add(receiverId);

            return next;
          },
      );

      window.dispatchEvent(
          new Event(
              "buddy-requests-changed",
          ),
      );

      showAlert(
          "Request sent",
          "Your study-buddy request was sent.",
          "success",
      );
    } catch (error) {
      showAlert(
          "Unable to send request",
          error instanceof Error
              ? error.message
              : "Your request could not be sent.",
          "error",
      );
    } finally {
      setBuddyBusyIds(
          (current) => {
            const next =
                new Set(current);

            next.delete(
                receiverId,
            );

            return next;
          },
      );
    }
  }

  function renderBuddyAction(
      studentId: string,
  ): ReactNode {
    if (
        studentId === profile?.id
    ) {
      return (
          <span
              className={styles.buddyState}
          >
          <Check size={14} />
          You
        </span>
      );
    }

    if (
        acceptedBuddyIds.has(
            studentId,
        )
    ) {
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

    if (
        pendingBuddyIds.has(
            studentId,
        )
    ) {
      return (
          <span
              className={styles.buddyState}
          >
          <Clock3 size={14} />
          Pending
        </span>
      );
    }

    return (
        <button
            type="button"
            className={styles.addBuddyButton}
            disabled={buddyBusyIds.has(
                studentId,
            )}
            onClick={() =>
                void sendBuddyRequest(
                    studentId,
                )
            }
        >
          <UserPlus size={14} />

          {buddyBusyIds.has(
              studentId,
          )
              ? "Sending…"
              : "Add buddy"}
        </button>
    );
  }

  if (
      onboardingLoading ||
      (profile && loading)
  ) {
    return <CourseLoading />;
  }

  if (!profile) {
    return (
        <main
            id="studygrouprr-course"
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

  if (
      !isValidCourseCode(
          courseCode,
      )
  ) {
    return (
        <main
            id="studygrouprr-course"
            className={styles.loadingPage}
        >
          <div className={styles.notFoundCard}>
          <span
              className={styles.notFoundIcon}
          >
            <SearchX size={28} />
          </span>

            <h1>Course unavailable</h1>

            <p>
              This course code is not valid.
            </p>

            <Link href="/sessions">
              Browse sessions
              <ArrowRight size={16} />
            </Link>
          </div>
        </main>
    );
  }

  return (
      <>
        <main
            id="studygrouprr-course"
            className={styles.page}
        >
          <div className={styles.shell}>
            <div className={styles.topBar}>
              <Link href="/sessions">
                <ArrowLeft size={16} />
                Back to sessions
              </Link>

              <Link href="/dashboard">
                Dashboard
                <ArrowRight size={15} />
              </Link>
            </div>

            {loadError && (
                <div
                    className={styles.errorBanner}
                    role="alert"
                >
                  <div>
                    <strong>
                      Course activity could not be refreshed
                    </strong>

                    <span>{loadError}</span>
                  </div>

                  <button
                      type="button"
                      onClick={() =>
                          void loadCourse()
                      }
                  >
                    Try again
                  </button>
                </div>
            )}

            <header className={styles.header}>
              <div className={styles.headerCopy}>
                <p>
                  {profile.university}
                </p>

                <h1>{courseCode}</h1>

                <span>
                Sessions and students currently
                studying this course.
              </span>
              </div>

              <div className={styles.headerActions}>
                {isMyCourse ? (
                    <span
                        className={styles.courseAdded}
                    >
                  <Check size={16} />
                  In My Courses
                </span>
                ) : (
                    <button
                        type="button"
                        className={styles.secondaryAction}
                        disabled={savingCourse}
                        onClick={() =>
                            void addToMyCourses()
                        }
                    >
                      <Plus size={16} />

                      {savingCourse
                          ? "Adding…"
                          : "Add to My Courses"}
                    </button>
                )}

                <Link
                    href={`/create-session?course=${encodeURIComponent(
                        courseCode,
                    )}`}
                    className={styles.primaryAction}
                >
                  <Plus size={17} />
                  Create session
                </Link>
              </div>
            </header>

            <section
                className={styles.summary}
                aria-label="Course activity summary"
            >
              <SummaryItem
                  icon={
                    <CalendarDays size={17} />
                  }
                  value={sessions.length}
                  label="Upcoming sessions"
              />

              <SummaryItem
                  icon={<Users size={17} />}
                  value={studentCount}
                  label="Students involved"
              />

              <SummaryItem
                  icon={<Radio size={17} />}
                  value={
                    activeLiveStudents.length
                  }
                  label="Studying live"
              />
            </section>

            <div className={styles.contentGrid}>
              <section className={styles.sessionsPanel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2>Course sessions</h2>

                    <p>
                      Upcoming meetups at your
                      university.
                    </p>
                  </div>

                  <Link
                      href={`/create-session?course=${encodeURIComponent(
                          courseCode,
                      )}`}
                  >
                    Create one
                    <ArrowRight size={15} />
                  </Link>
                </div>

                {sessions.length > 0 ? (
                    <div className={styles.sessionList}>
                      {sessions.map((session) => (
                          <SessionRow
                              key={session.id}
                              session={session}
                              state={getSessionState(
                                  session,
                                  now,
                              )}
                              relativeTime={getRelativeStart(
                                  session,
                                  now,
                              )}
                              attendeeCount={
                                  attendeeCounts[
                                      session.id
                                      ] ?? 1
                              }
                          />
                      ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                  <span
                      className={styles.emptyIcon}
                  >
                    <CalendarDays size={24} />
                  </span>

                      <div>
                        <h3>
                          No upcoming sessions
                        </h3>

                        <p>
                          Be the first student to
                          organize a {courseCode}
                          meetup.
                        </p>
                      </div>

                      <Link
                          href={`/create-session?course=${encodeURIComponent(
                              courseCode,
                          )}`}
                      >
                        Create session
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                )}
              </section>

              <aside className={styles.sidebar}>
                <section className={styles.liveCard}>
                  <div className={styles.sideHeader}>
                    <div>
                      <p>Live now</p>

                      <h2>
                        Studying {courseCode}
                      </h2>
                    </div>

                    <span>
                    {activeLiveStudents.length}
                  </span>
                  </div>

                  {activeLiveStudents.length >
                  0 ? (
                      <div className={styles.liveList}>
                        {activeLiveStudents.map(
                            (student) => (
                                <LiveStudentCard
                                    key={student.id}
                                    student={student}
                                    currentTime={
                                      currentTime
                                    }
                                    buddyAction={renderBuddyAction(
                                        student.user_id,
                                    )}
                                />
                            ),
                        )}
                      </div>
                  ) : (
                      <div
                          className={styles.liveEmpty}
                      >
                        <Radio size={21} />

                        <div>
                          <strong>
                            Nobody is live right now
                          </strong>

                          <span>
                        Go live to let classmates
                        know where you are studying.
                      </span>
                        </div>

                        <Link href="/live">
                          Go live
                          <ArrowRight size={15} />
                        </Link>
                      </div>
                  )}
                </section>

                <section className={styles.courseCard}>
                  <div className={styles.courseCardIcon}>
                    <BookOpen size={20} />
                  </div>

                  <div>
                    <p>Course actions</p>

                    <h2>{courseCode}</h2>

                    <span>
                    Create a scheduled meetup or
                    share that you are studying
                    right now.
                  </span>
                  </div>

                  <div
                      className={styles.courseActions}
                  >
                    <Link
                        href={`/create-session?course=${encodeURIComponent(
                            courseCode,
                        )}`}
                    >
                      <CalendarDays size={16} />
                      Create session
                    </Link>

                    <Link href="/live">
                      <Radio size={16} />
                      Go live
                    </Link>
                  </div>
                </section>

                {isMyCourse && (
                    <section
                        className={styles.savedCourseNote}
                    >
                      <Check size={17} />

                      <div>
                        <strong>
                          Saved to My Courses
                        </strong>

                        <span>
                      StudyGrouprr can prioritize
                      this course in session and
                      buddy recommendations.
                    </span>
                      </div>

                      <Link href="/profile">
                        Manage
                        <ChevronRight size={15} />
                      </Link>
                    </section>
                )}
              </aside>
            </div>
          </div>
        </main>

        <AlertModal
            open={alertOpen}
            title={alertConfig.title}
            message={alertConfig.message}
            type={alertConfig.type}
            onClose={() =>
                setAlertOpen(false)
            }
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

function SessionRow({
                      session,
                      state,
                      relativeTime,
                      attendeeCount,
                    }: {
  session: Session;
  state: SessionState;
  relativeTime: string;
  attendeeCount: number;
}) {
  return (
      <Link
          href={`/sessions/${session.id}`}
          className={styles.sessionRow}
      >
        <div className={styles.dateBlock}>
        <span>
          {new Date(
              session.start_time,
          ).toLocaleDateString([], {
            weekday: "short",
          })}
        </span>

          <strong>
            {new Date(
                session.start_time,
            ).toLocaleDateString([], {
              day: "numeric",
            })}
          </strong>
        </div>

        <div className={styles.sessionMain}>
          <div className={styles.sessionTopline}>
          <span
              className={[
                styles.sessionStatus,
                state === "live"
                    ? styles.sessionStatusLive
                    : "",
                state === "soon"
                    ? styles.sessionStatusSoon
                    : "",
              ]
                  .filter(Boolean)
                  .join(" ")}
          >
            {state === "live" && (
                <Radio size={12} />
            )}

            {getSessionStateLabel(
                state,
            )}
          </span>

            <span>
            {relativeTime}
          </span>
          </div>

          <h3>{session.title}</h3>

          <div className={styles.sessionMeta}>
          <span>
            <Clock3 size={13} />
            {formatSessionTimeRange(
                session,
            )}
          </span>

            <span>
            <MapPin size={13} />
              {session.location_name}
          </span>

            <span>
            <Users size={13} />
              {attendeeCount}{" "}
              {attendeeCount === 1
                  ? "student"
                  : "students"}
          </span>
          </div>
        </div>

        <ChevronRight size={18} />
      </Link>
  );
}

function LiveStudentCard({
                           student,
                           currentTime,
                           buddyAction,
                         }: {
  student: LiveStudent;
  currentTime: number;
  buddyAction: ReactNode;
}) {
  return (
      <article
          className={styles.liveStudent}
      >
        <div
            className={styles.liveStudentTop}
        >
          <div className={styles.avatar}>
            <SafeAvatar
                src={
                  student.profile?.avatar_url
                }
                name={
                  student.profile?.name
                }
            />
          </div>

          <div
              className={styles.liveIdentity}
          >
            <div>
              <strong>
                {student.profile?.name ||
                    "Campus student"}
              </strong>

              <span
                  className={styles.liveBadge}
              >
              <Radio size={11} />
              Live
            </span>
            </div>

            <span>
            {[
                  student.profile?.major,
                  student.profile?.year,
                ]
                    .filter(Boolean)
                    .join(" · ") ||
                "Student at your university"}
          </span>
          </div>

          <span className={styles.liveDuration}>
          {formatLiveDuration(
              student.created_at,
              currentTime,
          )}
        </span>
        </div>

        <div className={styles.liveLocation}>
          <MapPin size={14} />

          <span>
          {student.location_name}
        </span>
        </div>

        {student.description?.trim() && (
            <p className={styles.liveDescription}>
              {student.description}
            </p>
        )}

        {student.identification?.trim() && (
            <div
                className={styles.identification}
            >
              <GraduationCap size={14} />

              <span>
            Find them:{" "}
                {student.identification}
          </span>
            </div>
        )}

        <div className={styles.liveAction}>
          {buddyAction}
        </div>
      </article>
  );
}

function CourseLoading() {
  return (
      <main
          id="studygrouprr-course"
          className={styles.loadingPage}
          role="status"
          aria-live="polite"
      >
        <div className={styles.loadingCard}>
          <strong>
            Loading course activity…
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
